import { BrowserWindow } from "electron";

import { buildDevtoolsBackendScriptTag } from "../../devtools-standalone/inject-backend";
import { buildDevtoolsProfilerTapScriptTag } from "../../devtools-standalone/inject-profiler-tap";
import { buildRecorderBundleScriptTag } from "../../recorder/inject-script";

let targetWindow: BrowserWindow | null = null;

export function getTargetWindow(): BrowserWindow | null {
  return targetWindow;
}

export function clearTargetWindow(): void {
  targetWindow = null;
}

async function getHtmlText(
  wc: Electron.WebContents,
  requestId: string,
): Promise<string> {
  const { body, base64Encoded } = (await wc.debugger.sendCommand("Fetch.getResponseBody", {
    requestId,
  })) as { body: string; base64Encoded: boolean };
  return base64Encoded ? Buffer.from(body, "base64").toString("utf8") : body;
}

function injectIntoHtml(html: string, scriptTags: string): string {
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}${scriptTags}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (m) => `${m}<head>${scriptTags}</head>`);
  }
  return `${scriptTags}${html}`;
}

export async function openTargetUrl(
  rawUrl: string,
  host: string,
  port: number,
): Promise<void> {
  if (targetWindow && !targetWindow.isDestroyed()) {
    targetWindow.close();
    targetWindow = null;
  }

  targetWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    title: `Inspecting: ${rawUrl}`,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      webSecurity: false,
    },
  });

  const wc = targetWindow.webContents;

  // Forward target page console + load errors to main stdout so we can debug.
  wc.on("console-message", (_evt, level, message, line, sourceId) => {
    console.log(`[target/${level}] ${message} (${sourceId}:${line})`);
  });
  wc.on("did-fail-load", (_evt, errorCode, errorDescription, validatedURL) => {
    console.error(`[target/load-fail] ${validatedURL} → ${errorCode} ${errorDescription}`);
  });

  // --- CDP document interception: inject script tags into HTML responses ---
  try {
    const profilerTapTag = buildDevtoolsProfilerTapScriptTag(host, port);
    const backendTag = buildDevtoolsBackendScriptTag(host, port);
    const recorderTag = buildRecorderBundleScriptTag();
    const scriptTags = [profilerTapTag, backendTag, recorderTag].filter(Boolean).join("");
    if (recorderTag == null) {
      console.warn(
        "[devtools-parity-app] recorder tag is null — recorder bundle will not be injected.",
      );
    } else {
      console.log("[devtools-parity-app] injecting recorder tag:", recorderTag);
    }

    if (!wc.debugger.isAttached()) {
      wc.debugger.attach("1.3");
    }

    wc.debugger.on("detach", (_event, reason) => {
      console.warn("[devtools-parity-app] CDP detached:", reason);
    });

    wc.debugger.on("message", async (_event, method, params) => {
      if (method !== "Fetch.requestPaused") return;
      const { requestId, resourceType, responseStatusCode } = params as {
        requestId: string;
        resourceType: string;
        responseStatusCode?: number;
      };

      if (resourceType !== "Document" || responseStatusCode == null) {
        await wc.debugger.sendCommand("Fetch.continueRequest", { requestId });
        return;
      }

      try {
        // Only modify the main HTML document; let everything else flow through.
        const html = await getHtmlText(wc, requestId);
        const modified = injectIntoHtml(html, scriptTags);

        const responseHeaders = (
          params as { responseHeaders?: Array<{ name: string; value: string }> }
        ).responseHeaders;
        const filteredHeaders = (responseHeaders || []).filter(
          (h) =>
            h.name.toLowerCase() !== "content-length" &&
            h.name.toLowerCase() !== "content-encoding" &&
            h.name.toLowerCase() !== "content-security-policy" &&
            h.name.toLowerCase() !== "content-security-policy-report-only",
        );

        await wc.debugger.sendCommand("Fetch.fulfillRequest", {
          requestId,
          responseCode: responseStatusCode,
          responseHeaders: filteredHeaders,
          body: Buffer.from(modified, "utf8").toString("base64"),
        });
      } catch (err) {
        console.error("[devtools-parity-app] Fetch handler error:", err);
        try {
          await wc.debugger.sendCommand("Fetch.continueRequest", { requestId });
        } catch {
          /* ignore */
        }
      }
    });

    await wc.debugger.sendCommand("Fetch.enable", {
      patterns: [
        {
          urlPattern: "*",
          resourceType: "Document",
          requestStage: "Response",
        },
      ],
    });
  } catch (err) {
    console.error("[devtools-parity-app] Failed to set up CDP:", err);
  }

  targetWindow.on("closed", () => {
    targetWindow = null;
  });

  await targetWindow.loadURL(rawUrl);
}

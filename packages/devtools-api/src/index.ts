/**
 * Source attribution:
 * - Ported from https://github.com/facebook/react/blob/main/packages/react-devtools-shared/src/hook.js
 * - Includes helper logic adapted from:
 *   https://github.com/facebook/react/blob/main/packages/react-devtools-shared/src/constants.js
 *   https://github.com/facebook/react/blob/main/packages/react-devtools-shared/src/backend/utils/formatConsoleArguments.js
 *   https://github.com/facebook/react/blob/main/packages/react-devtools-shared/src/backend/utils/formatWithStyles.js
 *
 * Original React DevTools shared sources are licensed under the MIT license.
 */
type ComponentFilter = unknown;

export {
  onCommitFiber,
  type ChangeDescription,
  type CommittedFiberChange,
  type Fiber,
  type FiberRoot,
} from "./onCommitFiber.js";

export type Handler = (data: unknown) => void;
export type RendererID = number;
export type OnCommitFiberRoot = (
  rendererID: RendererID,
  root: unknown,
  priorityLevel?: number,
  ...args: unknown[]
) => unknown;
export type ReactBuildType = "deadcode" | "development" | "outdated" | "production" | "unminified";

export interface DevToolsHookSettings {
  appendComponentStack: boolean;
  breakOnConsoleErrors: boolean;
  disableSecondConsoleLogDimmingInStrictMode: boolean;
  hideConsoleLogsInStrictMode: boolean;
  showInlineWarningsAndErrors: boolean;
}

export interface ProfilingSettings {
  recordChangeDescriptions: boolean;
  recordTimeline: boolean;
}

export interface ReactRenderer {
  ComponentTree?: unknown;
  Mount?: {
    _renderNewRootComponent?: (...args: unknown[]) => unknown;
  };
  bundleType?: number;
  currentDispatcherRef?: unknown;
  findFiberByHostInstance?: unknown;
  getCurrentComponentInfo?: (...args: unknown[]) => unknown;
  reconcilerVersion?: string;
  version?: string;
  [key: string]: unknown;
}

export interface ComponentStackMatch {
  componentStack: string;
  enableOwnerStacks: boolean;
}

export interface RendererInterface {
  getComponentStack?: (error: Error) => ComponentStackMatch | null;
  handleCommitFiberRoot?: (root: unknown, priorityLevel?: number) => void;
  handleCommitFiberUnmount?: (fiber: unknown) => void;
  handlePostCommitFiberRoot?: (root: unknown) => void;
  onErrorOrWarning?: (type: "error" | "warn", args: unknown[]) => void;
}

export interface DevToolsBackend {
  [key: string]: unknown;
}

export interface DevToolsHook {
  backends: Map<string, DevToolsBackend>;
  checkDCE: (fn: Function) => void;
  emit: (event: string, data?: unknown) => void;
  getFiberRoots: (rendererID: RendererID) => Set<unknown>;
  getInternalModuleRanges: () => Array<[string, string]>;
  hasUnsupportedRendererAttached: boolean;
  inject: (renderer: ReactRenderer) => number;
  listeners: Record<string, Handler[]>;
  off: (event: string, fn: Handler) => void;
  on: (event: string, fn: Handler) => void;
  onCommitFiberRoot: OnCommitFiberRoot;
  onCommitFiberUnmount: (rendererID: RendererID, fiber: unknown) => void;
  onPostCommitFiberRoot: (rendererID: RendererID, root: unknown) => void;
  registerInternalModuleStart: (error: Error) => void;
  registerInternalModuleStop: (error: Error) => void;
  rendererInterfaces: Map<RendererID, RendererInterface>;
  renderers: Map<RendererID, ReactRenderer>;
  setStrictMode: (rendererID: RendererID, isStrictMode: boolean) => void;
  settings?: DevToolsHookSettings;
  sub: (event: string, fn: Handler) => () => void;
  supportsFiber: true;
  supportsFlight: true;
}

export type AttachRenderer = (
  hook: DevToolsHook,
  id: RendererID,
  renderer: ReactRenderer,
  target: unknown,
  shouldStartProfilingNow: boolean,
  profilingSettings: ProfilingSettings,
  componentFiltersOrComponentFiltersPromise: ComponentFilter[] | Promise<ComponentFilter[]>,
) => RendererInterface | null | undefined;

const FIREFOX_CONSOLE_DIMMING_COLOR = "color: rgba(124, 124, 124, 0.75)";
const ANSI_STYLE_DIMMING_TEMPLATE = "\x1b[2;38;2;124;124;124m%s\x1b[0m";
const ANSI_STYLE_DIMMING_TEMPLATE_WITH_COMPONENT_STACK = "\x1b[2;38;2;124;124;124m%s %o\x1b[0m";

const PREFIX_REGEX = /\s{4}(in|at)\s{1}/;
const ROW_COLUMN_NUMBER_REGEX = /:\d+:\d+(\n|$)/;
const frameDiffs = / \(<anonymous>\)$|@unknown:0:0$|\(|\)|\[|\]/gm;

const defaultProfilingSettings: ProfilingSettings = {
  recordChangeDescriptions: false,
  recordTimeline: false,
};

const userAgent =
  typeof globalThis.navigator === "object" && typeof globalThis.navigator.userAgent === "string"
    ? globalThis.navigator.userAgent
    : "";
const isChrome = /\bChrome\//.test(userAgent) && !/\bEdg\//.test(userAgent);
const isEdge = /\bEdg\//.test(userAgent);
const isFirefox = /\bFirefox\//.test(userAgent);
const isNative =
  typeof globalThis.navigator === "object" && globalThis.navigator.product === "ReactNative";

let attachRendererImpl: AttachRenderer = () => undefined;

export function setAttachRenderer(attachRenderer: AttachRenderer): void {
  attachRendererImpl = attachRenderer;
}

function isStringComponentStack(text: string): boolean {
  return PREFIX_REGEX.test(text) || ROW_COLUMN_NUMBER_REGEX.test(text);
}

function areStackTracesEqual(a: string, b: string): boolean {
  return a.replace(frameDiffs, "") === b.replace(frameDiffs, "");
}

function formatConsoleArguments(
  maybeMessage: unknown,
  ...inputArgs: readonly unknown[]
): unknown[] {
  if (inputArgs.length === 0 || typeof maybeMessage !== "string") {
    return [maybeMessage, ...inputArgs];
  }

  const args = inputArgs.slice();
  let template = "";
  let argumentsPointer = 0;

  for (let index = 0; index < maybeMessage.length; index += 1) {
    const currentChar = maybeMessage[index];
    if (currentChar !== "%") {
      template += currentChar;
      continue;
    }

    const nextChar = maybeMessage[index + 1];
    index += 1;

    switch (nextChar) {
      case "c":
      case "O":
      case "o":
        argumentsPointer += 1;
        template += `%${nextChar}`;
        break;
      case "d":
      case "i": {
        const [arg] = args.splice(argumentsPointer, 1);
        template += Number.parseInt(String(arg), 10).toString();
        break;
      }
      case "f": {
        const [arg] = args.splice(argumentsPointer, 1);
        template += Number.parseFloat(String(arg)).toString();
        break;
      }
      case "s": {
        const [arg] = args.splice(argumentsPointer, 1);
        template += String(arg);
        break;
      }
      default:
        template += `%${nextChar}`;
    }
  }

  return [template, ...args];
}

function formatConsoleArgumentsFromArgs(args: readonly unknown[]): unknown[] {
  if (args.length === 0) {
    return [];
  }

  const [firstArg, ...restArgs] = args;
  return formatConsoleArguments(firstArg, ...restArgs);
}

function formatWithStyles(
  inputArgs: readonly unknown[] | undefined | null,
  style?: string,
): unknown[] {
  if (
    inputArgs == null ||
    inputArgs.length === 0 ||
    (typeof inputArgs[0] === "string" && inputArgs[0].match(/([^%]|^)(%c)/g) != null) ||
    style === undefined
  ) {
    return [...(inputArgs ?? [])];
  }

  const formatSpecifiers = /([^%]|^)((%%)*)(%([oOdisf]))/g;
  if (typeof inputArgs[0] === "string" && inputArgs[0].match(formatSpecifiers) != null) {
    return [`%c${inputArgs[0]}`, style, ...inputArgs.slice(1)];
  }

  const firstArg = inputArgs.reduce((format, element, index) => {
    const prefix = index > 0 ? `${format} ` : format;
    switch (typeof element) {
      case "boolean":
      case "string":
      case "symbol":
        return `${prefix}%s`;
      case "number":
        return `${prefix}${Number.isInteger(element) ? "%i" : "%f"}`;
      default:
        return `${prefix}%o`;
    }
  }, "%c");

  return [firstArg, style, ...inputArgs];
}

type ConsoleMethodName = "error" | "group" | "groupCollapsed" | "info" | "log" | "trace" | "warn";

const targetConsole = console as Console & Record<ConsoleMethodName, (...args: unknown[]) => void>;

function getConsoleMethod(method: ConsoleMethodName): (...args: unknown[]) => void {
  const candidate = targetConsole[method];
  if (typeof candidate === "function") {
    return candidate.bind(targetConsole);
  }
  return () => {};
}

function setConsoleMethod(method: ConsoleMethodName, value: (...args: unknown[]) => void): void {
  targetConsole[method] = value;
}

function detectReactBuildType(renderer: ReactRenderer): ReactBuildType {
  try {
    if (typeof renderer.version === "string") {
      if (typeof renderer.bundleType === "number" && renderer.bundleType > 0) {
        return "development";
      }
      return "production";
    }

    const mount = renderer.Mount;
    const renderNewRootComponent = mount?._renderNewRootComponent;
    if (typeof renderNewRootComponent === "function") {
      const renderRootCode = Function.prototype.toString.call(renderNewRootComponent);

      if (!renderRootCode.startsWith("function")) {
        return "production";
      }
      if (renderRootCode.includes("storedMeasure")) {
        return "development";
      }
      if (renderRootCode.includes("should be a pure function")) {
        if (
          renderRootCode.includes("NODE_ENV") ||
          renderRootCode.includes("development") ||
          renderRootCode.includes("true")
        ) {
          return "development";
        }
        if (renderRootCode.includes("nextElement") || renderRootCode.includes("nextComponent")) {
          return "unminified";
        }
        return "development";
      }
      if (renderRootCode.includes("nextElement") || renderRootCode.includes("nextComponent")) {
        return "unminified";
      }
      return "outdated";
    }
  } catch {
    return "production";
  }

  return "production";
}

// Ported from react-devtools-shared/src/hook.js.
// The original backend-specific renderer attachment is exposed here as a
// pluggable callback so the hook installer can stay self-contained.
export function installHook(
  target: unknown,
  componentFiltersOrComponentFiltersPromise: ComponentFilter[] | Promise<ComponentFilter[]> = [],
  maybeSettingsOrSettingsPromise?: DevToolsHookSettings | Promise<DevToolsHookSettings>,
  shouldStartProfilingNow = false,
  profilingSettings: ProfilingSettings = defaultProfilingSettings,
): DevToolsHook | null {
  if (target == null || (typeof target !== "object" && typeof target !== "function")) {
    return null;
  }

  const targetObject = target as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(targetObject, "__REACT_DEVTOOLS_GLOBAL_HOOK__")) {
    return null;
  }

  let hasDetectedBadDCE = false;
  const isProfiling = shouldStartProfilingNow;
  let uidCounter = 0;
  let isRunningDuringStrictModeInvocation = false;

  const fiberRoots: Record<number, Set<unknown>> = {};
  const rendererInterfaces = new Map<RendererID, RendererInterface>();
  const listeners: Record<string, Handler[]> = {};
  const renderers = new Map<RendererID, ReactRenderer>();
  const backends = new Map<string, DevToolsBackend>();
  const openModuleRangesStack: string[] = [];
  const moduleRanges: Array<[string, string]> = [];
  const unpatchConsoleCallbacks: Array<() => void> = [];

  function sub(event: string, fn: Handler): () => void {
    on(event, fn);
    return () => off(event, fn);
  }

  function on(event: string, fn: Handler): void {
    if (listeners[event] == null) {
      listeners[event] = [];
    }
    listeners[event].push(fn);
  }

  function off(event: string, fn: Handler): void {
    const eventListeners = listeners[event];
    if (eventListeners == null) {
      return;
    }

    const index = eventListeners.indexOf(fn);
    if (index !== -1) {
      eventListeners.splice(index, 1);
    }
    if (eventListeners.length === 0) {
      delete listeners[event];
    }
  }

  function emit(event: string, data?: unknown): void {
    const eventListeners = listeners[event];
    if (eventListeners == null) {
      return;
    }

    eventListeners.slice().forEach((listener) => {
      listener(data);
    });
  }

  function getFiberRoots(rendererID: RendererID): Set<unknown> {
    if (fiberRoots[rendererID] == null) {
      fiberRoots[rendererID] = new Set();
    }
    return fiberRoots[rendererID];
  }

  function checkDCE(fn: Function): void {
    try {
      const code = Function.prototype.toString.call(fn);
      if (code.includes("^_^")) {
        hasDetectedBadDCE = true;
        setTimeout(() => {
          throw new Error(
            "React is running in production mode, but dead code elimination has not been applied. " +
              "Read how to correctly configure React for production: " +
              "https://react.dev/link/perf-use-production-build",
          );
        });
      }
    } catch {}
  }

  function inject(renderer: ReactRenderer): number {
    const id = ++uidCounter;
    renderers.set(id, renderer);

    const reactBuildType = hasDetectedBadDCE ? "deadcode" : detectReactBuildType(renderer);

    hook.emit("renderer", {
      id,
      reactBuildType,
      renderer,
    });

    const rendererInterface =
      attachRendererImpl(
        hook,
        id,
        renderer,
        targetObject,
        isProfiling,
        profilingSettings,
        componentFiltersOrComponentFiltersPromise,
      ) ?? null;

    if (rendererInterface != null) {
      hook.rendererInterfaces.set(id, rendererInterface);
      hook.emit("renderer-attached", { id, rendererInterface });
    } else {
      hook.hasUnsupportedRendererAttached = true;
      hook.emit("unsupported-renderer-version");
    }

    return id;
  }

  function onCommitFiberUnmount(rendererID: RendererID, fiber: unknown): void {
    rendererInterfaces.get(rendererID)?.handleCommitFiberUnmount?.(fiber);
  }

  function onCommitFiberRoot(
    rendererID: RendererID,
    root: unknown,
    priorityLevel?: number,
    ..._args: unknown[]
  ): void {
    const mountedRoots = hook.getFiberRoots(rendererID);
    const rootLike = root as {
      current?: {
        memoizedState?: {
          element?: unknown;
        } | null;
      };
    };
    const current = rootLike.current;
    const isKnownRoot = mountedRoots.has(root);
    const isUnmounting = current?.memoizedState == null || current.memoizedState.element == null;

    if (!isKnownRoot && !isUnmounting) {
      mountedRoots.add(root);
    } else if (isKnownRoot && isUnmounting) {
      mountedRoots.delete(root);
    }

    rendererInterfaces.get(rendererID)?.handleCommitFiberRoot?.(root, priorityLevel);
  }

  function onPostCommitFiberRoot(rendererID: RendererID, root: unknown): void {
    rendererInterfaces.get(rendererID)?.handlePostCommitFiberRoot?.(root);
  }

  function patchConsoleForStrictMode(): void {
    if (hook.settings == null || unpatchConsoleCallbacks.length > 0) {
      return;
    }

    const methods: ConsoleMethodName[] = ["group", "groupCollapsed", "info", "log"];

    methods.forEach((method) => {
      const originalMethod = getConsoleMethod(method);
      const overrideMethod = (...args: unknown[]) => {
        const settings = hook.settings;
        if (settings == null) {
          originalMethod(...args);
          return;
        }

        if (settings.hideConsoleLogsInStrictMode) {
          return;
        }

        if (settings.disableSecondConsoleLogDimmingInStrictMode) {
          originalMethod(...args);
          return;
        }

        if (isFirefox) {
          originalMethod(...formatWithStyles(args, FIREFOX_CONSOLE_DIMMING_COLOR));
        } else {
          originalMethod(ANSI_STYLE_DIMMING_TEMPLATE, ...formatConsoleArgumentsFromArgs(args));
        }
      };

      setConsoleMethod(method, overrideMethod);
      unpatchConsoleCallbacks.push(() => {
        setConsoleMethod(method, originalMethod);
      });
    });
  }

  function unpatchConsoleForStrictMode(): void {
    unpatchConsoleCallbacks.forEach((callback) => {
      callback();
    });
    unpatchConsoleCallbacks.length = 0;
  }

  function setStrictMode(_rendererID: RendererID, isStrictMode: boolean): void {
    isRunningDuringStrictModeInvocation = isStrictMode;
    if (isStrictMode) {
      patchConsoleForStrictMode();
    } else {
      unpatchConsoleForStrictMode();
    }
  }

  function getTopStackFrameString(error: Error): string | null {
    const frames = error.stack?.split("\n") ?? [];
    return frames.length > 1 ? frames[1] : null;
  }

  function getInternalModuleRanges(): Array<[string, string]> {
    return moduleRanges;
  }

  function registerInternalModuleStart(error: Error): void {
    const startStackFrame = getTopStackFrameString(error);
    if (startStackFrame != null) {
      openModuleRangesStack.push(startStackFrame);
    }
  }

  function registerInternalModuleStop(error: Error): void {
    const startStackFrame = openModuleRangesStack.pop();
    const stopStackFrame = getTopStackFrameString(error);
    if (startStackFrame != null && stopStackFrame != null) {
      moduleRanges.push([startStackFrame, stopStackFrame]);
    }
  }

  function patchConsoleForErrorsAndWarnings(): void {
    if (hook.settings == null) {
      return;
    }

    const methods: Array<"error" | "trace" | "warn"> = ["error", "trace", "warn"];

    methods.forEach((method) => {
      const originalMethod = getConsoleMethod(method);
      const overrideMethod = (...args: unknown[]) => {
        const settings = hook.settings;
        if (settings == null) {
          originalMethod(...args);
          return;
        }

        if (isRunningDuringStrictModeInvocation && settings.hideConsoleLogsInStrictMode) {
          return;
        }

        let injectedComponentStackAsFakeError = false;
        let alreadyHasComponentStack = false;
        if (settings.appendComponentStack) {
          const lastArg = args[args.length - 1];
          alreadyHasComponentStack = typeof lastArg === "string" && isStringComponentStack(lastArg);
        }

        const shouldShowInlineWarningsAndErrors =
          settings.showInlineWarningsAndErrors && (method === "error" || method === "warn");

        for (const rendererInterface of hook.rendererInterfaces.values()) {
          const { getComponentStack, onErrorOrWarning } = rendererInterface;

          try {
            if (shouldShowInlineWarningsAndErrors && onErrorOrWarning != null) {
              onErrorOrWarning(method, args.slice());
            }
          } catch (error) {
            setTimeout(() => {
              throw error;
            }, 0);
          }

          try {
            if (settings.appendComponentStack && getComponentStack != null) {
              const topFrame = Error("react-stack-top-frame");
              const match = getComponentStack(topFrame);
              if (match == null) {
                continue;
              }

              const { componentStack, enableOwnerStacks } = match;
              if (componentStack !== "") {
                const fakeError = new Error("");
                fakeError.name =
                  isChrome || isEdge
                    ? enableOwnerStacks
                      ? "Error Stack"
                      : "Error Component Stack"
                    : enableOwnerStacks
                      ? "Stack"
                      : "Component Stack";
                fakeError.stack =
                  isChrome || isEdge || isNative
                    ? `${enableOwnerStacks ? "Error Stack:" : "Error Component Stack:"}${componentStack}`
                    : componentStack;

                if (alreadyHasComponentStack) {
                  const lastArg = args[args.length - 1];
                  if (typeof lastArg === "string" && areStackTracesEqual(lastArg, componentStack)) {
                    const firstArg = args[0];
                    if (
                      args.length > 1 &&
                      typeof firstArg === "string" &&
                      firstArg.endsWith("%s")
                    ) {
                      args[0] = firstArg.slice(0, -2);
                    }
                    args[args.length - 1] = fakeError;
                    injectedComponentStackAsFakeError = true;
                  }
                } else {
                  args.push(fakeError);
                  injectedComponentStackAsFakeError = true;
                }
              }

              break;
            }
          } catch (error) {
            setTimeout(() => {
              throw error;
            }, 0);
          }
        }

        if (settings.breakOnConsoleErrors) {
          // oxlint-disable-next-line no-debugger -- this setting intentionally pauses execution here.
          debugger;
        }

        if (
          isRunningDuringStrictModeInvocation &&
          !settings.disableSecondConsoleLogDimmingInStrictMode
        ) {
          if (isFirefox) {
            let argsWithStyles = formatWithStyles(args, FIREFOX_CONSOLE_DIMMING_COLOR);
            if (injectedComponentStackAsFakeError) {
              argsWithStyles = [`${String(argsWithStyles[0])} %o`, ...argsWithStyles.slice(1)];
            }
            originalMethod(...argsWithStyles);
          } else {
            originalMethod(
              injectedComponentStackAsFakeError
                ? ANSI_STYLE_DIMMING_TEMPLATE_WITH_COMPONENT_STACK
                : ANSI_STYLE_DIMMING_TEMPLATE,
              ...formatConsoleArgumentsFromArgs(args),
            );
          }
          return;
        }

        originalMethod(...args);
      };

      setConsoleMethod(method, overrideMethod);
    });
  }

  const hook: DevToolsHook = {
    backends,
    checkDCE,
    emit,
    getFiberRoots,
    getInternalModuleRanges,
    hasUnsupportedRendererAttached: false,
    inject,
    listeners,
    off,
    on,
    onCommitFiberRoot,
    onCommitFiberUnmount,
    onPostCommitFiberRoot,
    registerInternalModuleStart,
    registerInternalModuleStop,
    rendererInterfaces,
    renderers,
    setStrictMode,
    sub,
    supportsFiber: true,
    supportsFlight: true,
  };

  if (maybeSettingsOrSettingsPromise == null) {
    hook.settings = {
      appendComponentStack: true,
      breakOnConsoleErrors: false,
      disableSecondConsoleLogDimmingInStrictMode: false,
      hideConsoleLogsInStrictMode: false,
      showInlineWarningsAndErrors: true,
    };
    patchConsoleForErrorsAndWarnings();
  } else {
    Promise.resolve(maybeSettingsOrSettingsPromise)
      .then((settings) => {
        hook.settings = settings;
        hook.emit("settingsInitialized", settings);
        patchConsoleForErrorsAndWarnings();
      })
      .catch(() => {
        targetConsole.error(
          "React DevTools failed to get Console Patching settings. Console won't be patched and some console features will not work.",
        );
      });
  }

  Object.defineProperty(targetObject, "__REACT_DEVTOOLS_GLOBAL_HOOK__", {
    configurable: true,
    enumerable: false,
    get() {
      return hook;
    },
  });

  return hook;
}

/** @jsxImportSource preact */
import { clsx } from "clsx";
import { createContext, type ComponentChildren } from "preact";
import { useContext } from "preact/hooks";

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

const ACTIVE_STYLES = {
  accent:
    "bg-gradient-to-b from-sky-300/25 to-sky-500/10 text-sky-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.4),0_0_22px_-4px_rgba(56,189,248,0.55)] focus-visible:ring-recorder-accent/40",
  neutral:
    "bg-gradient-to-b from-white/14 to-white/[0.04] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)] focus-visible:ring-white/30",
} as const;

function useTabsContext() {
  const context = useContext(TabsContext);
  if (context === null) throw new Error("Tabs parts must be rendered inside Tabs.Root");
  return context;
}

function Root({
  value,
  onValueChange,
  children,
}: TabsContextValue & { children: ComponentChildren }) {
  return <TabsContext.Provider value={{ value, onValueChange }}>{children}</TabsContext.Provider>;
}

function List({ children, testId }: { children: ComponentChildren; testId?: string }) {
  return (
    <div
      data-testid={testId}
      className="inline-flex items-center rounded-full border border-white/10 bg-black/45 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_6px_20px_-8px_rgba(0,0,0,0.6)]"
    >
      {children}
    </div>
  );
}

function Tab({
  children,
  value,
  testId,
  tone = "neutral",
}: {
  children: ComponentChildren;
  value: string;
  testId?: string;
  tone?: "neutral" | "accent";
}) {
  const { value: activeValue, onValueChange } = useTabsContext();
  const isActive = activeValue === value;

  return (
    <button
      type="button"
      data-testid={testId}
      onClick={() => {
        if (!isActive) onValueChange(value);
      }}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
        "text-[0.68rem] font-semibold uppercase tracking-[0.18em] transition-[color,background-color,box-shadow] duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
        isActive ? ACTIVE_STYLES[tone] : "text-white/40 hover:text-white/75",
      )}
    >
      {children}
    </button>
  );
}

function Panel({ children, value }: { children: ComponentChildren; value: string }) {
  const { value: activeValue } = useTabsContext();
  const isActive = activeValue === value;

  return isActive ? <div>{children}</div> : null;
}

export const Tabs = { Root, List, Tab, Panel };

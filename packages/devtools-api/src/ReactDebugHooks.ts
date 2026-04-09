/**
 * Source attribution:
 * - Ported and adapted from:
 *   https://github.com/facebook/react/blob/main/packages/react-debug-tools/src/ReactDebugHooks.js
 *
 * Original React sources are licensed under the MIT license.
 */
import type { Fiber } from "./onCommitFiber.js";

const FunctionComponent = 0;
const ContextProvider = 10;
const ForwardRef = 11;
const SimpleMemoComponent = 15;

const REACT_CONTEXT_TYPE = Symbol.for("react.context");
const REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel");

type ParsedStackFrame = {
  columnNumber?: number;
  fileName?: string;
  functionName?: string;
  lineNumber?: number;
  source: string;
};

type CurrentDispatcherRef = {
  H?: unknown;
};

type Thenable<T> = {
  _debugInfo?: unknown;
  reason?: unknown;
  status?: "fulfilled" | "rejected" | string;
  then: (...args: unknown[]) => unknown;
  value?: T;
};

type ReactContext<T> = {
  $$typeof?: symbol;
  _context?: ReactContext<T>;
  _currentValue: T;
  displayName?: string | null;
};

type HookState = {
  memoizedState: unknown;
  next: HookState | null;
};

type ContextDependency = {
  memoizedValue?: unknown;
  next: ContextDependency | null;
};

type ThenableState =
  | Array<Thenable<unknown>>
  | {
      thenables?: Array<Thenable<unknown>>;
    };

type FiberDependencies = {
  _debugThenableState?: ThenableState | null;
  firstContext: ContextDependency | null;
};

type FiberWithDebug = Fiber & {
  dependencies?: FiberDependencies | null;
  dependencies_new?: {
    firstContext: ContextDependency | null;
  } | null;
  dependencies_old?: {
    firstContext: ContextDependency | null;
  } | null;
  elementType?: unknown;
  memoizedProps: Record<string, unknown>;
  memoizedState: HookState | null;
  return?: FiberWithDebug | null;
  type: unknown;
  updateQueue?: {
    memoCache?: {
      data: Array<Array<unknown> | undefined>;
      index: number;
    };
  } | null;
};

type DispatcherLike = {
  readContext: <T>(context: ReactContext<T>) => T;
  use?: <T>(usable: unknown) => T;
  useActionState?: <S, P>(
    action: (state: Awaited<S>, payload: P) => S,
    initialState: Awaited<S>,
    permalink?: string,
  ) => [Awaited<S>, (payload: P) => void, boolean];
  useCacheRefresh?: () => void;
  useCallback: <T>(callback: T, inputs?: Array<unknown> | null) => T;
  useContext: <T>(context: ReactContext<T>) => T;
  useDebugValue: (value: unknown, formatterFn?: ((value: unknown) => unknown) | null) => void;
  useDeferredValue: <T>(value: T, initialValue?: T) => T;
  useEffect: (create: () => (() => void) | void, deps?: Array<unknown> | null) => void;
  useEffectEvent?: <F extends (...args: any[]) => unknown>(callback: F) => F;
  useFormState?: <S, P>(
    action: (state: Awaited<S>, payload: P) => S,
    initialState: Awaited<S>,
    permalink?: string,
  ) => [Awaited<S>, (payload: P) => void, boolean];
  useHostTransitionStatus?: () => unknown;
  useId: () => string;
  useImperativeHandle: <T>(
    ref: { current: T | null } | ((instance: T | null) => unknown) | null | undefined,
    create: () => T,
    inputs?: Array<unknown> | null,
  ) => void;
  useInsertionEffect?: (create: () => unknown, deps?: Array<unknown> | null) => void;
  useLayoutEffect: (create: () => (() => void) | void, deps?: Array<unknown> | null) => void;
  useMemo: <T>(create: () => T, inputs?: Array<unknown> | null) => T;
  useMemoCache?: (size: number) => Array<unknown>;
  useOptimistic?: <S, A>(
    passthrough: S,
    reducer?: ((state: S, action: A) => S) | null,
  ) => [S, (action: A) => void];
  useReducer: <S, I, A>(
    reducer: (state: S, action: A) => S,
    initialArg: I,
    init?: (initialArg: I) => S,
  ) => [S, (action: A) => void];
  useRef: <T>(initialValue: T) => { current: T };
  useState: <S>(initialState: S | (() => S)) => [S, (action: S | ((state: S) => S)) => void];
  useSyncExternalStore?: <T>(
    subscribe: (callback: () => void) => () => void,
    getSnapshot: () => T,
    getServerSnapshot?: () => T,
  ) => T;
  useTransition?: () => [boolean, (callback: () => void, options?: unknown) => void];
};

type HookLogEntry = {
  debugInfo: unknown;
  dispatcherHookName: string;
  displayName: string | null;
  hookIndex: number | null;
  primitive: string;
  stackError: Error;
  value: unknown;
};

export type HookSource = {
  lineNumber: number | null;
  columnNumber: number | null;
  fileName: string | null;
  functionName: string | null;
};

export type HooksNode = {
  id: number | null;
  isStateEditable: boolean;
  name: string;
  value: unknown;
  subHooks: Array<HooksNode>;
  debugInfo: unknown;
  hookSource: HookSource | null;
  hookIndex: number | null;
};

export type HooksTree = Array<HooksNode>;

let hookLog: Array<HookLogEntry> = [];
let primitiveStackCache: null | Map<string, Array<ParsedStackFrame>> = null;
let currentFiber: FiberWithDebug | null = null;
let currentHook: HookState | null = null;
let currentContextDependency: ContextDependency | null = null;
let currentThenableIndex = 0;
let currentThenableState: Array<Thenable<unknown>> | null = null;
let currentHookIndex = 0;
let mostLikelyAncestorIndex = 0;

function parseErrorStack(error: Error): Array<ParsedStackFrame> {
  const stack = typeof error.stack === "string" ? error.stack : "";
  if (stack === "") {
    return [];
  }

  const frames: Array<ParsedStackFrame> = [];
  const lines = stack.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed === "Error") {
      continue;
    }

    const chromeMatch =
      /^\s*at (?:(.*?) \()?(.+?):(\d+):(\d+)\)?$/.exec(trimmed) ??
      /^\s*at (.+?):(\d+):(\d+)$/.exec(trimmed);

    if (chromeMatch != null) {
      const [, maybeFunctionName, fileName, lineNumber, columnNumber] = chromeMatch;
      frames.push({
        columnNumber: Number(columnNumber),
        fileName,
        functionName: maybeFunctionName || undefined,
        lineNumber: Number(lineNumber),
        source: `${fileName}:${lineNumber}:${columnNumber}`,
      });
      continue;
    }

    const firefoxMatch = /^(.*?)@(.+?):(\d+):(\d+)$/.exec(trimmed);
    if (firefoxMatch != null) {
      const [, maybeFunctionName, fileName, lineNumber, columnNumber] = firefoxMatch;
      frames.push({
        columnNumber: Number(columnNumber),
        fileName,
        functionName: maybeFunctionName || undefined,
        lineNumber: Number(lineNumber),
        source: `${fileName}:${lineNumber}:${columnNumber}`,
      });
    }
  }

  return frames;
}

function getCurrentHookIndex(): number | null {
  return currentFiber == null ? null : currentHookIndex;
}

function advanceCurrentHookIndex(width: number): void {
  if (currentFiber != null) {
    currentHookIndex += width;
  }
}

function nextHook(): HookState | null {
  const hook = currentHook;
  if (hook !== null) {
    currentHook = hook.next;
  }
  return hook;
}

function pushHookLog({
  debugInfo = null,
  displayName = null,
  dispatcherHookName,
  hookIndex,
  primitive,
  value,
}: {
  debugInfo?: unknown;
  displayName?: string | null;
  dispatcherHookName: string;
  hookIndex: number | null;
  primitive: string;
  value: unknown;
}): void {
  hookLog.push({
    debugInfo,
    displayName,
    dispatcherHookName,
    hookIndex,
    primitive,
    stackError: new Error(),
    value,
  });
}

function defineThenable<T extends object>(target: T): T & { then: () => void } {
  // oxlint-disable-next-line unicorn/no-thenable -- React Debug Hooks warms primitive stacks with synthetic thenables.
  Object.defineProperty(target, "then", {
    configurable: true,
    enumerable: false,
    value() {},
  });

  return target as T & { then: () => void };
}

function getPrimitiveStackCache(): Map<string, Array<ParsedStackFrame>> {
  if (primitiveStackCache !== null) {
    return primitiveStackCache;
  }

  const cache = new Map<string, Array<ParsedStackFrame>>();
  let readHookLog: Array<HookLogEntry> = [];

  try {
    Dispatcher.useContext({ _currentValue: null });
    Dispatcher.useState(null);
    Dispatcher.useReducer((state: unknown) => state, null);
    Dispatcher.useRef(null);
    Dispatcher.useCacheRefresh?.();
    Dispatcher.useLayoutEffect(() => {});
    Dispatcher.useInsertionEffect?.(() => {});
    Dispatcher.useEffect(() => {});
    Dispatcher.useImperativeHandle(undefined, () => null);
    Dispatcher.useDebugValue(null);
    Dispatcher.useCallback(() => {}, []);
    Dispatcher.useTransition?.();
    Dispatcher.useSyncExternalStore?.(
      () => () => {},
      () => null,
      () => null,
    );
    Dispatcher.useDeferredValue(null);
    Dispatcher.useMemo(() => null, []);
    Dispatcher.useOptimistic?.(null, (state: unknown) => state);
    Dispatcher.useFormState?.((state: unknown) => state, null);
    Dispatcher.useActionState?.((state: unknown) => state, null);
    Dispatcher.useHostTransitionStatus?.();
    Dispatcher.useMemoCache?.(0);
    Dispatcher.use?.({
      $$typeof: REACT_CONTEXT_TYPE,
      _currentValue: null,
    });
    Dispatcher.use?.(
      defineThenable({
        status: "fulfilled",
        value: null,
      }),
    );
    try {
      Dispatcher.use?.(defineThenable({}));
    } catch {}
    Dispatcher.useId();
    Dispatcher.useEffectEvent?.(() => {});
  } finally {
    readHookLog = hookLog;
    hookLog = [];
  }

  for (const hook of readHookLog) {
    cache.set(hook.primitive, parseErrorStack(hook.stackError));
  }

  primitiveStackCache = cache;
  return cache;
}

function readContext<T>(context: ReactContext<T>): T {
  if (currentFiber === null) {
    return context._currentValue;
  }

  if (currentContextDependency === null) {
    throw new Error(
      "Context reads do not line up with context dependencies. This is a bug in React Debug Tools.",
    );
  }

  if ("memoizedValue" in currentContextDependency) {
    const value = currentContextDependency.memoizedValue as T;
    currentContextDependency = currentContextDependency.next;
    return value;
  }

  return context._currentValue;
}

const SuspenseException = new Error(
  "Suspense Exception: This is not a real error. It is used internally by hook inspection.",
);

function use<T>(usable: unknown): T {
  if (usable !== null && typeof usable === "object") {
    if ("then" in usable && typeof usable.then === "function") {
      const thenable =
        currentThenableState !== null && currentThenableIndex < currentThenableState.length
          ? currentThenableState[currentThenableIndex++]
          : (usable as Thenable<T>);

      switch (thenable.status) {
        case "fulfilled":
          pushHookLog({
            dispatcherHookName: "Use",
            hookIndex: null,
            primitive: "Promise",
            value: thenable.value as T,
            debugInfo: thenable._debugInfo ?? null,
          });
          return thenable.value as T;
        case "rejected":
          throw thenable.reason;
        default:
          pushHookLog({
            dispatcherHookName: "Use",
            hookIndex: null,
            primitive: "Unresolved",
            value: thenable,
            debugInfo: thenable._debugInfo ?? null,
          });
          throw SuspenseException;
      }
    }

    if ((usable as ReactContext<T>).$$typeof === REACT_CONTEXT_TYPE) {
      const context = usable as ReactContext<T>;
      const value = readContext(context);
      pushHookLog({
        dispatcherHookName: "Use",
        displayName: context.displayName || "Context",
        hookIndex: null,
        primitive: "Context (use)",
        value,
      });
      return value;
    }
  }

  throw new Error(`An unsupported type was passed to use(): ${String(usable)}`);
}

function useContext<T>(context: ReactContext<T>): T {
  const value = readContext(context);
  pushHookLog({
    dispatcherHookName: "Context",
    displayName: context.displayName || null,
    hookIndex: null,
    primitive: "Context",
    value,
  });
  return value;
}

function useState<S>(initialState: (() => S) | S): [S, (action: S | ((state: S) => S)) => void] {
  const hookIndex = getCurrentHookIndex();
  const hook = nextHook();
  advanceCurrentHookIndex(1);

  const state =
    hook !== null
      ? (hook.memoizedState as S)
      : typeof initialState === "function"
        ? (initialState as () => S)()
        : initialState;

  pushHookLog({
    dispatcherHookName: "State",
    hookIndex,
    primitive: "State",
    value: state,
  });

  return [state, () => {}];
}

function useReducer<S, I, A>(
  reducer: (state: S, action: A) => S,
  initialArg: I,
  init?: (initialArg: I) => S,
): [S, (action: A) => void] {
  const hookIndex = getCurrentHookIndex();
  const hook = nextHook();
  advanceCurrentHookIndex(1);

  const state =
    hook !== null
      ? (hook.memoizedState as S)
      : init !== undefined
        ? init(initialArg)
        : (initialArg as unknown as S);

  pushHookLog({
    dispatcherHookName: "Reducer",
    hookIndex,
    primitive: "Reducer",
    value: state,
  });

  return [state, () => {}];
}

function useRef<T>(initialValue: T): { current: T } {
  const hookIndex = getCurrentHookIndex();
  const hook = nextHook();
  advanceCurrentHookIndex(1);

  const ref = hook !== null ? (hook.memoizedState as { current: T }) : { current: initialValue };

  pushHookLog({
    dispatcherHookName: "Ref",
    hookIndex,
    primitive: "Ref",
    value: ref.current,
  });

  return ref;
}

function useCacheRefresh(): () => void {
  const hookIndex = getCurrentHookIndex();
  const hook = nextHook();
  advanceCurrentHookIndex(1);

  pushHookLog({
    dispatcherHookName: "CacheRefresh",
    hookIndex,
    primitive: "CacheRefresh",
    value: hook !== null ? hook.memoizedState : () => {},
  });

  return () => {};
}

function useLayoutEffect(create: () => (() => void) | void): void {
  const hookIndex = getCurrentHookIndex();
  nextHook();
  advanceCurrentHookIndex(1);

  pushHookLog({
    dispatcherHookName: "LayoutEffect",
    hookIndex,
    primitive: "LayoutEffect",
    value: create,
  });
}

function useInsertionEffect(create: () => unknown): void {
  const hookIndex = getCurrentHookIndex();
  nextHook();
  advanceCurrentHookIndex(1);

  pushHookLog({
    dispatcherHookName: "InsertionEffect",
    hookIndex,
    primitive: "InsertionEffect",
    value: create,
  });
}

function useEffect(create: () => (() => void) | void): void {
  const hookIndex = getCurrentHookIndex();
  nextHook();
  advanceCurrentHookIndex(1);

  pushHookLog({
    dispatcherHookName: "Effect",
    hookIndex,
    primitive: "Effect",
    value: create,
  });
}

function useImperativeHandle<T>(
  ref: { current: T | null } | ((instance: T | null) => unknown) | null | undefined,
  create: () => T,
): void {
  const hookIndex = getCurrentHookIndex();
  nextHook();
  advanceCurrentHookIndex(1);

  pushHookLog({
    dispatcherHookName: "ImperativeHandle",
    hookIndex,
    primitive: "ImperativeHandle",
    value: ref !== null && typeof ref === "object" ? ref.current : undefined,
  });

  void create;
}

function useDebugValue(value: unknown, formatterFn?: ((value: unknown) => unknown) | null): void {
  pushHookLog({
    dispatcherHookName: "DebugValue",
    hookIndex: null,
    primitive: "DebugValue",
    value: typeof formatterFn === "function" ? formatterFn(value) : value,
  });
}

function useCallback<T>(callback: T): T {
  const hookIndex = getCurrentHookIndex();
  const hook = nextHook();
  advanceCurrentHookIndex(1);

  const value =
    hook !== null && Array.isArray(hook.memoizedState) ? hook.memoizedState[0] : callback;

  pushHookLog({
    dispatcherHookName: "Callback",
    hookIndex,
    primitive: "Callback",
    value,
  });

  return callback;
}

function useMemo<T>(create: () => T): T {
  const hookIndex = getCurrentHookIndex();
  const hook = nextHook();
  advanceCurrentHookIndex(1);

  const value =
    hook !== null && Array.isArray(hook.memoizedState) ? (hook.memoizedState[0] as T) : create();

  pushHookLog({
    dispatcherHookName: "Memo",
    hookIndex,
    primitive: "Memo",
    value,
  });

  return value;
}

function useSyncExternalStore<T>(
  subscribe: (callback: () => void) => () => void,
  getSnapshot: () => T,
): T {
  const hookIndex = getCurrentHookIndex();
  nextHook();
  nextHook();
  advanceCurrentHookIndex(1);

  const value = getSnapshot();
  pushHookLog({
    dispatcherHookName: "SyncExternalStore",
    hookIndex,
    primitive: "SyncExternalStore",
    value,
  });

  void subscribe;
  return value;
}

function useTransition(): [boolean, (callback: () => void, options?: unknown) => void] {
  const hookIndex = getCurrentHookIndex();
  const stateHook = nextHook();
  nextHook();
  advanceCurrentHookIndex(2);

  const isPending = stateHook !== null ? (stateHook.memoizedState as boolean) : false;
  pushHookLog({
    dispatcherHookName: "Transition",
    hookIndex,
    primitive: "Transition",
    value: isPending,
  });

  return [isPending, () => {}];
}

function useDeferredValue<T>(value: T): T {
  const hookIndex = getCurrentHookIndex();
  const hook = nextHook();
  advanceCurrentHookIndex(1);

  const previousValue = hook !== null ? (hook.memoizedState as T) : value;
  pushHookLog({
    dispatcherHookName: "DeferredValue",
    hookIndex,
    primitive: "DeferredValue",
    value: previousValue,
  });

  return previousValue;
}

function useId(): string {
  const hookIndex = getCurrentHookIndex();
  const hook = nextHook();
  advanceCurrentHookIndex(1);

  const id = hook !== null ? String(hook.memoizedState ?? "") : "";
  pushHookLog({
    dispatcherHookName: "Id",
    hookIndex,
    primitive: "Id",
    value: id,
  });

  return id;
}

function useMemoCache(size: number): Array<unknown> {
  const fiber = currentFiber;
  if (fiber == null) {
    return [];
  }

  const memoCache = fiber.updateQueue?.memoCache;
  if (memoCache == null) {
    return [];
  }

  let data = memoCache.data[memoCache.index];
  if (data === undefined) {
    data = Array.from({ length: size });
    for (let index = 0; index < size; index += 1) {
      data[index] = REACT_MEMO_CACHE_SENTINEL;
    }
    memoCache.data[memoCache.index] = data;
  }

  memoCache.index += 1;
  return data;
}

function useOptimistic<S, A>(
  passthrough: S,
  reducer?: ((state: S, action: A) => S) | null,
): [S, (action: A) => void] {
  const hookIndex = getCurrentHookIndex();
  const hook = nextHook();
  advanceCurrentHookIndex(1);

  const value = hook !== null ? (hook.memoizedState as S) : passthrough;
  pushHookLog({
    dispatcherHookName: "Optimistic",
    hookIndex,
    primitive: "Optimistic",
    value,
  });

  void reducer;
  return [value, () => {}];
}

function readActionStateValue<S>(
  hook: HookState | null,
  initialState: Awaited<S>,
): {
  debugInfo: unknown;
  error: unknown;
  value: unknown;
} {
  let value: unknown = initialState;
  let debugInfo: unknown = null;
  let error: unknown = null;

  if (hook !== null) {
    const actionResult = hook.memoizedState;
    if (
      typeof actionResult === "object" &&
      actionResult !== null &&
      "then" in actionResult &&
      typeof actionResult.then === "function"
    ) {
      const thenable = actionResult as Thenable<Awaited<S>>;
      switch (thenable.status) {
        case "fulfilled":
          value = thenable.value;
          debugInfo = thenable._debugInfo ?? null;
          break;
        case "rejected":
          error = thenable.reason;
          break;
        default:
          value = thenable;
          debugInfo = thenable._debugInfo ?? null;
          error = SuspenseException;
      }
    } else {
      value = actionResult;
    }
  }

  return {
    debugInfo,
    error,
    value,
  };
}

function useFormState<S, P>(
  action: (state: Awaited<S>, payload: P) => S,
  initialState: Awaited<S>,
): [Awaited<S>, (payload: P) => void, boolean] {
  const hookIndex = getCurrentHookIndex();
  const hook = nextHook();
  nextHook();
  nextHook();
  advanceCurrentHookIndex(3);

  const result = readActionStateValue(hook, initialState);
  pushHookLog({
    dispatcherHookName: "FormState",
    hookIndex,
    primitive: "FormState",
    value: result.value,
    debugInfo: result.debugInfo,
  });

  if (result.error !== null) {
    throw result.error;
  }

  void action;
  return [result.value as Awaited<S>, () => {}, false];
}

function useActionState<S, P>(
  action: (state: Awaited<S>, payload: P) => S,
  initialState: Awaited<S>,
): [Awaited<S>, (payload: P) => void, boolean] {
  const hookIndex = getCurrentHookIndex();
  const hook = nextHook();
  nextHook();
  nextHook();
  advanceCurrentHookIndex(3);

  const result = readActionStateValue(hook, initialState);
  pushHookLog({
    dispatcherHookName: "ActionState",
    hookIndex,
    primitive: "ActionState",
    value: result.value,
    debugInfo: result.debugInfo,
  });

  if (result.error !== null) {
    throw result.error;
  }

  void action;
  return [result.value as Awaited<S>, () => {}, false];
}

function useHostTransitionStatus(): unknown {
  const status = readContext({
    _currentValue: null,
  });

  pushHookLog({
    dispatcherHookName: "HostTransitionStatus",
    hookIndex: null,
    primitive: "HostTransitionStatus",
    value: status,
  });

  return status;
}

function useEffectEvent<F extends (...args: any[]) => unknown>(callback: F): F {
  const hookIndex = getCurrentHookIndex();
  nextHook();
  advanceCurrentHookIndex(1);

  pushHookLog({
    dispatcherHookName: "EffectEvent",
    hookIndex,
    primitive: "EffectEvent",
    value: callback,
  });

  return callback;
}

const Dispatcher: DispatcherLike = {
  readContext,
  use,
  useActionState,
  useCacheRefresh,
  useCallback,
  useContext,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useFormState,
  useHostTransitionStatus,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useMemoCache,
  useOptimistic,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
};

const DispatcherProxy =
  typeof Proxy === "undefined"
    ? Dispatcher
    : new Proxy(Dispatcher, {
        get(target, prop: string | symbol) {
          if (typeof prop === "string" && Object.prototype.hasOwnProperty.call(target, prop)) {
            return target[prop as keyof DispatcherLike];
          }

          const error = new Error(`Missing method in Dispatcher: ${String(prop)}`);
          error.name = "ReactDebugToolsUnsupportedHookError";
          throw error;
        },
      });

function findSharedIndex(
  hookStack: ParsedStackFrame[],
  rootStack: ParsedStackFrame[],
  rootIndex: number,
): number {
  const source = rootStack[rootIndex]?.source;
  if (source == null) {
    return -1;
  }

  hookSearch: for (let hookIndex = 0; hookIndex < hookStack.length; hookIndex += 1) {
    if (hookStack[hookIndex]?.source !== source) {
      continue;
    }

    for (
      let rootCursor = rootIndex + 1, hookCursor = hookIndex + 1;
      rootCursor < rootStack.length && hookCursor < hookStack.length;
      rootCursor += 1, hookCursor += 1
    ) {
      if (hookStack[hookCursor]?.source !== rootStack[rootCursor]?.source) {
        continue hookSearch;
      }
    }

    return hookIndex;
  }

  return -1;
}

function findCommonAncestorIndex(
  rootStack: ParsedStackFrame[],
  hookStack: ParsedStackFrame[],
): number {
  let rootIndex = findSharedIndex(hookStack, rootStack, mostLikelyAncestorIndex);
  if (rootIndex !== -1) {
    return rootIndex;
  }

  for (let index = 0; index < rootStack.length && index < 5; index += 1) {
    rootIndex = findSharedIndex(hookStack, rootStack, index);
    if (rootIndex !== -1) {
      mostLikelyAncestorIndex = index;
      return rootIndex;
    }
  }

  return -1;
}

function parseHookName(functionName: string | undefined): string {
  if (functionName == null || functionName === "") {
    return "";
  }

  let startIndex = functionName.lastIndexOf("[as ");
  if (startIndex !== -1) {
    return parseHookName(functionName.slice(startIndex + "[as ".length, -1));
  }

  startIndex = functionName.lastIndexOf(".");
  startIndex = startIndex === -1 ? 0 : startIndex + 1;

  if (functionName.slice(startIndex).startsWith("unstable_")) {
    startIndex += "unstable_".length;
  }

  if (functionName.slice(startIndex).startsWith("experimental_")) {
    startIndex += "experimental_".length;
  }

  if (functionName.slice(startIndex, startIndex + 3) === "use") {
    if (functionName.length - startIndex === 3) {
      return "Use";
    }
    startIndex += 3;
  }

  return functionName.slice(startIndex);
}

function isReactWrapper(functionName: string | undefined, wrapperName: string): boolean {
  const hookName = parseHookName(functionName);
  if (wrapperName === "HostTransitionStatus") {
    return hookName === wrapperName || hookName === "FormStatus";
  }

  return hookName === wrapperName;
}

function findPrimitiveIndex(hookStack: ParsedStackFrame[], hook: HookLogEntry): number {
  const primitiveStack = getPrimitiveStackCache().get(hook.primitive);
  if (primitiveStack == null) {
    return -1;
  }

  for (let index = 0; index < primitiveStack.length && index < hookStack.length; index += 1) {
    if (primitiveStack[index]?.source !== hookStack[index]?.source) {
      if (
        index < hookStack.length - 1 &&
        isReactWrapper(hookStack[index]?.functionName, hook.dispatcherHookName)
      ) {
        index += 1;
      }
      if (
        index < hookStack.length - 1 &&
        isReactWrapper(hookStack[index]?.functionName, hook.dispatcherHookName)
      ) {
        index += 1;
      }

      return index;
    }
  }

  return -1;
}

function parseTrimmedStack(
  rootStack: ParsedStackFrame[],
  hook: HookLogEntry,
): [ParsedStackFrame | null, Array<ParsedStackFrame> | null] {
  const hookStack = parseErrorStack(hook.stackError);
  const rootIndex = findCommonAncestorIndex(rootStack, hookStack);
  const primitiveIndex = findPrimitiveIndex(hookStack, hook);

  if (rootIndex === -1 || primitiveIndex === -1 || rootIndex - primitiveIndex < 2) {
    if (primitiveIndex === -1) {
      return [null, null];
    }

    return [hookStack[primitiveIndex - 1] ?? null, null];
  }

  return [hookStack[primitiveIndex - 1] ?? null, hookStack.slice(primitiveIndex, rootIndex - 1)];
}

function buildTree(rootStack: ParsedStackFrame[], readHookLog: Array<HookLogEntry>): HooksTree {
  const rootChildren: Array<HooksNode> = [];
  let prevStack: Array<ParsedStackFrame> | null = null;
  let levelChildren = rootChildren;
  const stackOfChildren: Array<Array<HooksNode>> = [];

  for (const hook of readHookLog) {
    const [primitiveFrame, stack] = parseTrimmedStack(rootStack, hook);
    let displayName = hook.displayName;

    if (displayName === null && primitiveFrame !== null) {
      displayName =
        parseHookName(primitiveFrame.functionName) || parseHookName(hook.dispatcherHookName);
    }

    if (stack !== null) {
      let commonSteps = 0;
      if (prevStack !== null) {
        while (commonSteps < stack.length && commonSteps < prevStack.length) {
          const stackSource = stack[stack.length - commonSteps - 1]?.source;
          const prevSource = prevStack[prevStack.length - commonSteps - 1]?.source;
          if (stackSource !== prevSource) {
            break;
          }
          commonSteps += 1;
        }

        for (let index = prevStack.length - 1; index > commonSteps; index -= 1) {
          levelChildren = stackOfChildren.pop() ?? rootChildren;
        }
      }

      for (let index = stack.length - commonSteps - 1; index >= 1; index -= 1) {
        const children: Array<HooksNode> = [];
        const stackFrame = stack[index];
        const customHookNode: HooksNode = {
          debugInfo: null,
          hookIndex: null,
          hookSource: {
            columnNumber: stackFrame?.columnNumber ?? null,
            fileName: stackFrame?.fileName ?? null,
            functionName: stackFrame?.functionName ?? null,
            lineNumber: stackFrame?.lineNumber ?? null,
          },
          id: null,
          isStateEditable: false,
          name: parseHookName(stack[index - 1]?.functionName),
          subHooks: children,
          value: undefined,
        };

        levelChildren.push(customHookNode);
        stackOfChildren.push(levelChildren);
        levelChildren = children;
      }

      prevStack = stack;
    }

    const isStateEditable = hook.primitive === "Reducer" || hook.primitive === "State";
    const hookNode: HooksNode = {
      debugInfo: hook.debugInfo,
      hookIndex: hook.hookIndex,
      hookSource: null,
      id: hook.hookIndex,
      isStateEditable,
      name: displayName || hook.primitive,
      subHooks: [],
      value: hook.value,
    };

    if (stack !== null && stack.length >= 1) {
      const stackFrame = stack[0];
      hookNode.hookSource = {
        columnNumber: stackFrame?.columnNumber ?? null,
        fileName: stackFrame?.fileName ?? null,
        functionName: stackFrame?.functionName ?? null,
        lineNumber: stackFrame?.lineNumber ?? null,
      };
    }

    levelChildren.push(hookNode);
  }

  processDebugValues(rootChildren, null);
  return rootChildren;
}

function processDebugValues(hooksTree: HooksTree, parentHooksNode: HooksNode | null): void {
  const debugValueNodes: Array<HooksNode> = [];

  for (let index = 0; index < hooksTree.length; index += 1) {
    const hookNode = hooksTree[index];
    if (hookNode.name === "DebugValue" && hookNode.subHooks.length === 0) {
      hooksTree.splice(index, 1);
      index -= 1;
      debugValueNodes.push(hookNode);
    } else {
      processDebugValues(hookNode.subHooks, hookNode);
    }
  }

  if (parentHooksNode == null) {
    return;
  }

  if (debugValueNodes.length === 1) {
    parentHooksNode.value = debugValueNodes[0]?.value;
    return;
  }

  if (debugValueNodes.length > 1) {
    parentHooksNode.value = debugValueNodes.map(({ value }) => value);
  }
}

function handleRenderFunctionError(error: unknown): never | void {
  if (error === SuspenseException) {
    return;
  }

  if (error instanceof Error && error.name === "ReactDebugToolsUnsupportedHookError") {
    throw error;
  }

  const wrappedError = new Error("Error rendering inspected component");
  wrappedError.name = "ReactDebugToolsRenderError";
  throw wrappedError;
}

function inspectHooks<Props>(
  renderFunction: (props: Props) => unknown,
  props: Props,
  currentDispatcher: CurrentDispatcherRef,
): HooksTree {
  const previousDispatcher = currentDispatcher.H;
  currentDispatcher.H = DispatcherProxy as unknown;

  let ancestorStackError: Error | undefined;
  let readHookLog: Array<HookLogEntry> = [];

  try {
    ancestorStackError = new Error();
    renderFunction(props);
  } catch (error) {
    handleRenderFunctionError(error);
  } finally {
    readHookLog = hookLog;
    hookLog = [];
    currentDispatcher.H = previousDispatcher;
  }

  return buildTree(
    ancestorStackError != null ? parseErrorStack(ancestorStackError) : [],
    readHookLog,
  );
}

function setupContexts(
  contextMap: Map<ReactContext<unknown>, unknown>,
  fiber: FiberWithDebug,
): void {
  let current: FiberWithDebug | null | undefined = fiber;
  while (current != null) {
    if (current.tag === ContextProvider) {
      let context = current.type as ReactContext<unknown>;
      if (context._context !== undefined) {
        context = context._context;
      }

      if (!contextMap.has(context)) {
        contextMap.set(context, context._currentValue);
        context._currentValue = current.memoizedProps.value;
      }
    }

    current = current.return;
  }
}

function restoreContexts(contextMap: Map<ReactContext<unknown>, unknown>): void {
  contextMap.forEach((value, context) => {
    context._currentValue = value;
  });
}

function inspectHooksOfForwardRef<Props, Ref>(
  renderFunction: (props: Props, ref: Ref) => unknown,
  props: Props,
  ref: Ref,
  currentDispatcher: CurrentDispatcherRef,
): HooksTree {
  const previousDispatcher = currentDispatcher.H;
  currentDispatcher.H = DispatcherProxy as unknown;

  let ancestorStackError: Error | undefined;
  let readHookLog: Array<HookLogEntry> = [];

  try {
    ancestorStackError = new Error();
    renderFunction(props, ref);
  } catch (error) {
    handleRenderFunctionError(error);
  } finally {
    readHookLog = hookLog;
    hookLog = [];
    currentDispatcher.H = previousDispatcher;
  }

  return buildTree(
    ancestorStackError != null ? parseErrorStack(ancestorStackError) : [],
    readHookLog,
  );
}

function resolveDefaultProps<ComponentProps extends Record<string, unknown>>(
  component: { defaultProps?: Partial<ComponentProps> } | null | undefined,
  baseProps: ComponentProps,
): ComponentProps {
  if (component?.defaultProps == null) {
    return baseProps;
  }

  const props = Object.assign({}, baseProps);
  for (const propName in component.defaultProps) {
    if (props[propName] === undefined) {
      props[propName] = component.defaultProps[propName] as ComponentProps[typeof propName];
    }
  }

  return props;
}

function isCurrentDispatcherRef(value: unknown): value is CurrentDispatcherRef {
  return value != null && (typeof value === "object" || typeof value === "function");
}

export function inspectHooksOfFiber(fiber: Fiber, currentDispatcherRef: unknown): HooksTree {
  if (!isCurrentDispatcherRef(currentDispatcherRef)) {
    throw new Error("React currentDispatcherRef is required to inspect hooks.");
  }

  const debugFiber = fiber as FiberWithDebug;
  if (
    debugFiber.tag !== FunctionComponent &&
    debugFiber.tag !== SimpleMemoComponent &&
    debugFiber.tag !== ForwardRef
  ) {
    throw new Error("Unknown Fiber. Needs to be a function component to inspect hooks.");
  }

  getPrimitiveStackCache();

  currentHook = debugFiber.memoizedState;
  currentFiber = debugFiber;
  currentHookIndex = 0;

  const thenableState = debugFiber.dependencies?._debugThenableState;
  const usedThenables =
    thenableState != null &&
    typeof thenableState === "object" &&
    "thenables" in thenableState &&
    Array.isArray(thenableState.thenables)
      ? thenableState.thenables
      : thenableState;

  currentThenableState = Array.isArray(usedThenables) ? usedThenables : null;
  currentThenableIndex = 0;

  if (Object.prototype.hasOwnProperty.call(debugFiber, "dependencies")) {
    const dependencies = debugFiber.dependencies;
    currentContextDependency = dependencies != null ? dependencies.firstContext : null;
  } else if (Object.prototype.hasOwnProperty.call(debugFiber, "dependencies_old")) {
    currentContextDependency = debugFiber.dependencies_old?.firstContext ?? null;
  } else if (Object.prototype.hasOwnProperty.call(debugFiber, "dependencies_new")) {
    currentContextDependency = debugFiber.dependencies_new?.firstContext ?? null;
  } else {
    currentContextDependency = null;
  }

  const type = debugFiber.type as {
    defaultProps?: Record<string, unknown>;
    render?: (props: Record<string, unknown>, ref: unknown) => unknown;
  };
  let props = debugFiber.memoizedProps;

  if (type !== debugFiber.elementType) {
    props = resolveDefaultProps(type, props);
  }

  const contextMap = new Map<ReactContext<unknown>, unknown>();

  try {
    if (
      currentContextDependency !== null &&
      !Object.prototype.hasOwnProperty.call(currentContextDependency, "memoizedValue")
    ) {
      setupContexts(contextMap, debugFiber);
    }

    if (debugFiber.tag === ForwardRef && typeof type.render === "function") {
      return inspectHooksOfForwardRef(type.render, props, debugFiber.ref, currentDispatcherRef);
    }

    if (typeof type !== "function") {
      throw new Error("Unknown Fiber type. Expected a function component render function.");
    }

    return inspectHooks(type, props, currentDispatcherRef);
  } finally {
    currentFiber = null;
    currentHook = null;
    currentContextDependency = null;
    currentThenableState = null;
    currentThenableIndex = 0;
    currentHookIndex = 0;

    restoreContexts(contextMap);
  }
}

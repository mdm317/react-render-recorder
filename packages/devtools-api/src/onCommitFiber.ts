// Keep these values in sync with react-reconciler/src/ReactFiberFlags.js and
// react-reconciler/src/ReactWorkTags.js.
const PerformedWork = 0b0000000000000000000000000000001
const FunctionComponent = 0
const ClassComponent = 1
const IndeterminateComponent = 2
const ContextConsumer = 9
const ForwardRef = 11
const MemoComponent = 14
const SimpleMemoComponent = 15
const IncompleteFunctionComponent = 28

const REACT_ACTIVITY_TYPE = Symbol.for('react.activity')
const REACT_CLIENT_REFERENCE = Symbol.for('react.client.reference')
const REACT_CONTEXT_TYPE = Symbol.for('react.context')
const REACT_CONSUMER_TYPE = Symbol.for('react.consumer')
const REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref')
const REACT_FRAGMENT_TYPE = Symbol.for('react.fragment')
const REACT_LAZY_TYPE = Symbol.for('react.lazy')
const REACT_MEMO_TYPE = Symbol.for('react.memo')
const REACT_PORTAL_TYPE = Symbol.for('react.portal')
const REACT_PROFILER_TYPE = Symbol.for('react.profiler')
const REACT_STRICT_MODE_TYPE = Symbol.for('react.strict_mode')
const REACT_SUSPENSE_LIST_TYPE = Symbol.for('react.suspense_list')
const REACT_SUSPENSE_TYPE = Symbol.for('react.suspense')
const REACT_TRACING_MARKER_TYPE = Symbol.for('react.tracing_marker')
const REACT_VIEW_TRANSITION_TYPE = Symbol.for('react.view_transition')

type NamedType = {
  displayName?: string | null
  name?: string | null
}

type ComplexComponentType = NamedType & {
  $$typeof?: symbol
  _context?: NamedType
  _init?: (payload: unknown) => unknown
  _payload?: unknown
  render?: NamedType
  type?: unknown
}

function is(valueA: unknown, valueB: unknown): boolean {
  return (
    (valueA === valueB &&
      (valueA !== 0 || 1 / (valueA as number) === 1 / (valueB as number))) ||
    (valueA !== valueA && valueB !== valueB)
  )
}

function getWrappedName(
  outerType: NamedType,
  innerType: NamedType | null | undefined,
  wrapperName: string,
): string {
  if (outerType.displayName) {
    return outerType.displayName
  }

  const functionName = innerType?.displayName || innerType?.name || ''
  return functionName !== '' ? `${wrapperName}(${functionName})` : wrapperName
}

function getContextName(type: NamedType | null | undefined): string {
  return type?.displayName || 'Context'
}

function getComponentNameFromType(type: unknown): string | null {
  if (type == null) {
    return null
  }

  if (typeof type === 'function') {
    const componentType = type as NamedType & {$$typeof?: symbol}
    if (componentType.$$typeof === REACT_CLIENT_REFERENCE) {
      return null
    }

    return componentType.displayName || componentType.name || null
  }

  if (typeof type === 'string') {
    return type
  }

  switch (type) {
    case REACT_ACTIVITY_TYPE:
      return 'Activity'
    case REACT_FRAGMENT_TYPE:
      return 'Fragment'
    case REACT_PROFILER_TYPE:
      return 'Profiler'
    case REACT_STRICT_MODE_TYPE:
      return 'StrictMode'
    case REACT_SUSPENSE_TYPE:
      return 'Suspense'
    case REACT_SUSPENSE_LIST_TYPE:
      return 'SuspenseList'
    case REACT_TRACING_MARKER_TYPE:
      return 'TracingMarker'
    case REACT_VIEW_TRANSITION_TYPE:
      return 'ViewTransition'
  }

  if (typeof type !== 'object') {
    return null
  }

  const componentType = type as ComplexComponentType

  switch (componentType.$$typeof) {
    case REACT_PORTAL_TYPE:
      return 'Portal'
    case REACT_CONTEXT_TYPE:
      return getContextName(componentType)
    case REACT_CONSUMER_TYPE:
      return `${getContextName(componentType._context)}.Consumer`
    case REACT_FORWARD_REF_TYPE:
      return getWrappedName(componentType, componentType.render, 'ForwardRef')
    case REACT_MEMO_TYPE:
      return (
        componentType.displayName ||
        getComponentNameFromType(componentType.type) ||
        'Memo'
      )
    case REACT_LAZY_TYPE:
      try {
        const init = componentType._init
        return typeof init === 'function'
          ? getComponentNameFromType(init(componentType._payload))
          : null
      } catch {
        return null
      }
    default:
      return null
  }
}

type ContextDependency = {
  context: unknown
  memoizedValue: unknown
  next: ContextDependency | null
}

type HookQueue = {
  getSnapshot?: unknown
  pending?: unknown
  value?: unknown
}

type HookState = {
  memoizedState: unknown
  next: HookState | null
  queue?: HookQueue
}

type FiberDependencies = {
  firstContext: ContextDependency | null
} | null

export type Fiber = {
  alternate: Fiber | null
  child: Fiber | null
  dependencies?: FiberDependencies
  effectTag?: number
  flags?: number
  memoizedProps: any
  memoizedState: any
  ref: unknown
  sibling: Fiber | null
  tag: number
  type: unknown
}

export type FiberRoot = {
  current: Fiber | null
}

export type ChangeDescription = {
  context: Array<string> | boolean | null
  didHooksChange: boolean
  hooks?: Array<ChangedHook> | null
  isFirstMount: boolean
  props: Array<string> | null
  state: Array<string> | null
}

export type ChangedHook = {
  hookIndex: number
  prev: unknown
  next: unknown
}

export type CommittedFiberChange = {
  changeDescription: ChangeDescription
  displayName: string | null
  fiber: Fiber
  prevFiber: Fiber | null
}

function getFiberFlags(fiber: Fiber): number {
  return fiber.flags ?? fiber.effectTag ?? 0
}

function getDisplayNameForFiber(fiber: Fiber): string | null {
  return getComponentNameFromType(fiber.type)
}

function getContextChanged(
  prevFiber: Fiber,
  nextFiber: Fiber,
): boolean {
  let prevContext =
    prevFiber.dependencies != null ? prevFiber.dependencies.firstContext : null
  let nextContext =
    nextFiber.dependencies != null ? nextFiber.dependencies.firstContext : null

  while (prevContext !== null && nextContext !== null) {
    if (prevContext.context !== nextContext.context) {
      return false
    }

    if (!is(prevContext.memoizedValue, nextContext.memoizedValue)) {
      return true
    }

    prevContext = prevContext.next
    nextContext = nextContext.next
  }

  return false
}

function isUseSyncExternalStoreHook(hookObject: HookState): boolean {
  const queue = hookObject.queue
  if (queue == null) {
    return false
  }

  return (
    Object.prototype.hasOwnProperty.call(queue, 'value') &&
    Object.prototype.hasOwnProperty.call(queue, 'getSnapshot') &&
    typeof queue.getSnapshot === 'function'
  )
}

function isHookThatCanScheduleUpdate(hookObject: HookState): boolean {
  const queue = hookObject.queue
  if (queue == null) {
    return false
  }

  if (Object.prototype.hasOwnProperty.call(queue, 'pending')) {
    return true
  }

  return isUseSyncExternalStoreHook(hookObject)
}

function didStatefulHookChange(prev: HookState, next: HookState): boolean {
  if (isHookThatCanScheduleUpdate(prev)) {
    return prev.memoizedState !== next.memoizedState
  }

  return false
}

function getChangedHooks(
  prev: HookState | null,
  next: HookState | null,
): Array<ChangedHook> | null {
  if (prev == null || next == null) {
    return null
  }

  const changedHooks = []
  let currentIndex = 0
  let prevHook: HookState | null = prev
  let nextHook: HookState | null = next

  while (prevHook !== null && nextHook !== null) {
    if (didStatefulHookChange(prevHook, nextHook)) {
      changedHooks.push({
        hookIndex: currentIndex,
        prev: prevHook.memoizedState,
        next: nextHook.memoizedState,
      })
    }

    if (isUseSyncExternalStoreHook(nextHook)) {
      nextHook = nextHook.next
      prevHook = prevHook.next
    }

    nextHook = nextHook !== null ? nextHook.next : null
    prevHook = prevHook !== null ? prevHook.next : null
    currentIndex++
  }

  return changedHooks
}

function getChangedKeys(prev: any, next: any): Array<string> | null {
  if (prev == null || next == null) {
    return null
  }

  const changedKeys = []
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)])

  for (const key of keys) {
    if (prev[key] !== next[key]) {
      changedKeys.push(key)
    }
  }

  return changedKeys
}

function didFiberRender(
  prevFiber: Fiber,
  nextFiber: Fiber,
): boolean {
  switch (nextFiber.tag) {
    case ClassComponent:
    case FunctionComponent:
    case ContextConsumer:
    case MemoComponent:
    case SimpleMemoComponent:
    case ForwardRef:
      return (getFiberFlags(nextFiber) & PerformedWork) === PerformedWork
    default:
      return (
        prevFiber.memoizedProps !== nextFiber.memoizedProps ||
        prevFiber.memoizedState !== nextFiber.memoizedState ||
        prevFiber.ref !== nextFiber.ref
      )
  }
}

function getChangeDescription(
  prevFiber: Fiber | null,
  nextFiber: Fiber,
): ChangeDescription | null {
  switch (nextFiber.tag) {
    case ClassComponent:
      if (prevFiber === null) {
        return {
          context: null,
          didHooksChange: false,
          isFirstMount: true,
          props: null,
          state: null,
        }
      }

      return {
        context: getContextChanged(prevFiber, nextFiber),
        didHooksChange: false,
        isFirstMount: false,
        props: getChangedKeys(prevFiber.memoizedProps, nextFiber.memoizedProps),
        state: getChangedKeys(prevFiber.memoizedState, nextFiber.memoizedState),
      }
    case IncompleteFunctionComponent:
    case FunctionComponent:
    case IndeterminateComponent:
    case ForwardRef:
    case MemoComponent:
    case SimpleMemoComponent:
      if (prevFiber === null) {
        return {
          context: null,
          didHooksChange: false,
          isFirstMount: true,
          props: null,
          state: null,
        }
      }

      const hooks = getChangedHooks(
        prevFiber.memoizedState as HookState | null,
        nextFiber.memoizedState as HookState | null,
      )

      return {
        context: getContextChanged(prevFiber, nextFiber),
        didHooksChange: hooks !== null && hooks.length > 0,
        hooks,
        isFirstMount: false,
        props: getChangedKeys(prevFiber.memoizedProps, nextFiber.memoizedProps),
        state: null,
      }
    default:
      return null
  }
}

function collectFiberChanges(
  fiber: Fiber | null,
  changes: Array<CommittedFiberChange>,
): void {
  if (fiber === null) {
    return
  }

  const prevFiber = fiber.alternate
  if (prevFiber === null || didFiberRender(prevFiber, fiber)) {
    const changeDescription = getChangeDescription(prevFiber, fiber)
    if (changeDescription !== null) {
      changes.push({
        changeDescription,
        displayName: getDisplayNameForFiber(fiber),
        fiber,
        prevFiber,
      })
    }
  }

  collectFiberChanges(fiber.child, changes)
  collectFiberChanges(fiber.sibling, changes)
}

export function onCommitFiber(root: FiberRoot): Array<CommittedFiberChange> {
  if (root.current == null || root.current.child == null) {
    return []
  }

  const changes: Array<CommittedFiberChange> = []
  collectFiberChanges(root.current, changes)
  return changes
}

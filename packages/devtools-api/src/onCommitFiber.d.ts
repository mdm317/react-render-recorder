type ContextDependency = {
  context: unknown;
  memoizedValue: unknown;
  next: ContextDependency | null;
};
type FiberDependencies = {
  firstContext: ContextDependency | null;
} | null;
export type Fiber = {
  alternate: Fiber | null;
  child: Fiber | null;
  dependencies?: FiberDependencies;
  effectTag?: number;
  flags?: number;
  memoizedProps: any;
  memoizedState: any;
  ref: unknown;
  sibling: Fiber | null;
  tag: number;
  type: unknown;
};
export type FiberRoot = {
  current: Fiber | null;
};
export type ChangeDescription = {
  context: Array<string> | boolean | null;
  didHooksChange: boolean;
  hooks?: Array<ChangedHook> | null;
  isFirstMount: boolean;
  props: Array<string> | null;
  state: Array<string> | null;
};
export type ChangedHook = {
  hookIndex: number;
  prev: unknown;
  next: unknown;
};
export type CommittedFiberChange = {
  changeDescription: ChangeDescription;
  displayName: string | null;
  fiber: Fiber;
  prevFiber: Fiber | null;
};
export declare function onCommitFiber(root: FiberRoot): Array<CommittedFiberChange>;

import { useReducer } from "react";
import type { Dispatch } from "react";

import { compareApi, getRankedProfilerSummary } from "../lib/compare-api";
import type {
  CompareStatus,
  ControlResult,
  FiberChangesResult,
  RankedProfilerSummaryResult,
} from "../lib/compare-types";

export type CompareStore = {
  fetchComparison: () => Promise<void>;
  error: string | null;
  profilerRankedSummary: RankedProfilerSummaryResult | null;
  status: CompareStatus;
  recorderFiberChanges: FiberChangesResult | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
};

type CompareStoreState = {
  error: string | null;
  profilerRankedSummary: RankedProfilerSummaryResult | null;
  status: CompareStatus;
  recorderFiberChanges: FiberChangesResult | null;
};

const COMPARISON_REQUESTED = "comparison/requested";
const COMPARISON_SUCCEEDED = "comparison/succeeded";
const COMPARISON_FAILED = "comparison/failed";
const RECORDING_START_REQUESTED = "recording/startRequested";
const RECORDING_START_SUCCEEDED = "recording/startSucceeded";
const RECORDING_STOP_REQUESTED = "recording/stopRequested";
const RECORDING_STOP_SUCCEEDED = "recording/stopSucceeded";
const RECORDING_CONTROL_FAILED = "recording/controlFailed";

type CompareStoreAction =
  | { type: typeof COMPARISON_REQUESTED }
  | {
      type: typeof COMPARISON_SUCCEEDED;
      profilerRankedSummary: RankedProfilerSummaryResult;
      recorderFiberChanges: FiberChangesResult;
    }
  | { error: string; type: typeof COMPARISON_FAILED }
  | { type: typeof RECORDING_START_REQUESTED }
  | { type: typeof RECORDING_START_SUCCEEDED }
  | { type: typeof RECORDING_STOP_REQUESTED }
  | { type: typeof RECORDING_STOP_SUCCEEDED }
  | { error: string; type: typeof RECORDING_CONTROL_FAILED };

export const initialCompareStoreState: CompareStoreState = {
  recorderFiberChanges: null,
  profilerRankedSummary: null,
  error: null,
  status: "idle",
};

export function compareStoreReducer(
  state: CompareStoreState,
  action: CompareStoreAction,
): CompareStoreState {
  switch (action.type) {
    case COMPARISON_REQUESTED:
      return {
        ...state,
        status: "fetching",
        error: null,
      };
    case COMPARISON_SUCCEEDED:
      return {
        ...state,
        status: "idle",
        recorderFiberChanges: action.recorderFiberChanges,
        profilerRankedSummary: action.profilerRankedSummary,
      };
    case COMPARISON_FAILED:
      return {
        ...state,
        status: "idle",
        error: action.error,
        recorderFiberChanges: null,
        profilerRankedSummary: null,
      };
    case RECORDING_START_REQUESTED:
      return {
        ...state,
        error: null,
        status: "startingRecording",
      };
    case RECORDING_START_SUCCEEDED:
      return {
        ...state,
        status: "recording",
      };
    case RECORDING_STOP_REQUESTED:
      return {
        ...state,
        error: null,
        status: "stoppingRecording",
      };
    case RECORDING_STOP_SUCCEEDED:
      return {
        ...state,
        status: "idle",
      };
    case RECORDING_CONTROL_FAILED:
      return {
        ...state,
        error: action.error,
        status: "idle",
      };
    default:
      return state;
  }
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function getControlError(...results: ControlResult[]): string | null {
  for (const result of results) {
    if (!result.ok) {
      return result.error ?? "Unknown control error";
    }
  }
  return null;
}

function useCompareState() {
  return useReducer(compareStoreReducer, initialCompareStoreState);
}

function useCompareActions(dispatch: Dispatch<CompareStoreAction>) {
  async function fetchComparison() {
    dispatch({ type: COMPARISON_REQUESTED });

    try {
      const [recorderFiberChanges, profilerRankedSummary] = await Promise.all([
        compareApi.fetchRecorderFiberChanges(),
        getRankedProfilerSummary(),
      ]);
      dispatch({
        type: COMPARISON_SUCCEEDED,
        recorderFiberChanges,
        profilerRankedSummary,
      });
    } catch (err) {
      dispatch({ type: COMPARISON_FAILED, error: getErrorMessage(err) });
    }
  }

  async function startRecording() {
    dispatch({ type: RECORDING_START_REQUESTED });

    try {
      const [recorderResult, profilerResult] = await Promise.all([
        compareApi.recorderStart(),
        compareApi.profilerStart(),
      ]);
      const controlError = getControlError(recorderResult, profilerResult);
      if (controlError) {
        dispatch({ type: RECORDING_CONTROL_FAILED, error: controlError });
        return;
      }
      dispatch({
        type: RECORDING_START_SUCCEEDED,
      });
    } catch (err) {
      dispatch({ type: RECORDING_CONTROL_FAILED, error: getErrorMessage(err) });
    }
  }

  async function stopRecording() {
    dispatch({ type: RECORDING_STOP_REQUESTED });

    try {
      const [recorderResult, profilerResult] = await Promise.all([
        compareApi.recorderEnd(),
        compareApi.profilerStop(),
      ]);
      const controlError = getControlError(recorderResult, profilerResult);
      if (controlError) {
        dispatch({ type: RECORDING_CONTROL_FAILED, error: controlError });
        return;
      }
      dispatch({
        type: RECORDING_STOP_SUCCEEDED,
      });
    } catch (err) {
      dispatch({ type: RECORDING_CONTROL_FAILED, error: getErrorMessage(err) });
      return;
    }

    await fetchComparison();
  }

  return {
    fetchComparison,
    startRecording,
    stopRecording,
  };
}

export function useCompareStore(): CompareStore {
  const [state, dispatch] = useCompareState();
  const actions = useCompareActions(dispatch);

  return {
    ...state,
    ...actions,
  };
}

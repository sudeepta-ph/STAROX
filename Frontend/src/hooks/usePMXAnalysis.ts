/**
 * usePMXAnalysis — React hook for the full PMX analysis lifecycle.
 *
 * Responsibilities (Requirement 17):
 *   1. Start an analysis via POST /pmx/analyze and store the analysis_id.
 *   2. Poll GET /pmx/status/{analysis_id} every 1.5 s while running.
 *   3. Fetch full results via GET /pmx/result/{analysis_id} when status = "complete".
 *   4. Stop polling on "complete" or "failed".
 *   5. Enforce progress monotonicity — the exposed `progress` value never decreases.
 *
 * Usage:
 *   const { start, reset, state } = usePMXAnalysis();
 *   await start({ url, file_ids: [...], integrations: [] });
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  startAnalysis,
  getStatus,
  getResult,
  PmxApiError,
} from "../lib/pmxApi";
import type {
  AnalyzeRequest,
  AnalysisStatus,
  Decision,
  ExecutionPlan,
  ArtifactLinks,
  UIData,
} from "../types/pmx";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Polling interval in milliseconds (Requirement 17 AC 2, Requirement 19 AC 6). */
const POLL_INTERVAL_MS = 1_500;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Terminal statuses — polling stops when either is reached. */
type TerminalStatus = "complete" | "failed";

/** All possible lifecycle phases exposed to consumers. */
export type PMXPhase =
  | "idle"
  | "starting"
  | "polling"
  | "fetching_results"
  | "complete"
  | "failed";

export interface PMXAnalysisState {
  /** Current lifecycle phase. */
  phase: PMXPhase;

  /** UUID assigned by the backend, available after `start()` resolves. */
  analysisId: string | null;

  /**
   * Raw status string from the backend, e.g. "running:url_crawler".
   * Null until the first successful poll.
   */
  status: AnalysisStatus | null;

  /**
   * Human-readable label derived from `current_node`.
   * Null until the first successful poll.
   */
  currentNode: string | null;

  /**
   * Progress percentage in [0, 100].
   * Guaranteed to be non-decreasing across successive polls
   * (Requirement 17 AC 6, Requirement 19).
   */
  progress: number;

  /** Full decision list — populated when phase = "complete". */
  decisions: Decision[];

  /** Execution plan — populated when phase = "complete". */
  execution: ExecutionPlan | null;

  /** Artifact download links — populated when phase = "complete". */
  artifacts: ArtifactLinks | null;

  /** Crawled UI data — populated when phase = "complete". */
  uiData: UIData | null;

  /** Error message — populated when phase = "failed". */
  error: string | null;
}

export interface UsePMXAnalysisReturn {
  /** Current analysis state. */
  state: PMXAnalysisState;

  /**
   * Start a new analysis run.
   * Resolves once the backend has accepted the request (status = "queued").
   * Polling begins automatically.
   *
   * @throws `PmxApiError` when the backend rejects the request (400 / 401 / 422).
   */
  start: (params: AnalyzeRequest) => Promise<void>;

  /**
   * Reset all state back to idle.
   * Stops any in-flight polling and clears results.
   */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Initial state factory
// ---------------------------------------------------------------------------

function makeInitialState(): PMXAnalysisState {
  return {
    phase: "idle",
    analysisId: null,
    status: null,
    currentNode: null,
    progress: 0,
    decisions: [],
    execution: null,
    artifacts: null,
    uiData: null,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive a human-readable step label from the raw `current_node` string.
 * e.g. "url_crawler" → "URL Crawler"
 */
function formatNodeLabel(node: string): string {
  const labels: Record<string, string> = {
    direct_data: "Processing Files",
    integration_data: "Fetching Integrations",
    url_crawler: "Crawling URL",
    context: "Building Context",
    decision: "Generating Decisions",
    execution: "Planning Execution",
    artifact: "Generating Reports",
  };
  return labels[node] ?? node.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Return true when the status string represents a terminal state. */
function isTerminal(status: string): status is TerminalStatus {
  return status === "complete" || status === "failed";
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

export function usePMXAnalysis(): UsePMXAnalysisReturn {
  const [state, setState] = useState<PMXAnalysisState>(makeInitialState);

  /**
   * Ref holding the current interval ID so we can clear it from any closure
   * without capturing stale state.
   */
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Ref tracking the highest progress value seen so far.
   * Used to enforce monotonicity — we never expose a lower value than this.
   */
  const maxProgressRef = useRef<number>(0);

  /**
   * Ref tracking whether the component is still mounted.
   * Prevents state updates after unmount.
   */
  const mountedRef = useRef<boolean>(true);

  // ---------------------------------------------------------------------------
  // Cleanup on unmount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Internal: stop polling
  // ---------------------------------------------------------------------------

  const stopPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Internal: fetch full results after pipeline completes
  // ---------------------------------------------------------------------------

  const fetchResults = useCallback(async (analysisId: string) => {
    if (!mountedRef.current) return;

    setState((prev) => ({ ...prev, phase: "fetching_results" }));

    try {
      const result = await getResult(analysisId);

      if (!mountedRef.current) return;

      setState((prev) => ({
        ...prev,
        phase: "complete",
        progress: 100,
        decisions: result.decisions,
        execution: result.execution,
        artifacts: result.artifacts,
        uiData: result.ui_data,
        error: null,
      }));
    } catch (err) {
      if (!mountedRef.current) return;

      const message =
        err instanceof PmxApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to fetch results";

      setState((prev) => ({
        ...prev,
        phase: "failed",
        error: message,
      }));
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Internal: single poll tick
  // ---------------------------------------------------------------------------

  const pollOnce = useCallback(
    async (analysisId: string) => {
      try {
        const statusResp = await getStatus(analysisId);

        if (!mountedRef.current) return;

        // Enforce progress monotonicity (Requirement 17 AC 6).
        const rawProgress = Math.max(0, Math.min(100, statusResp.progress));
        const monotonicProgress = Math.max(rawProgress, maxProgressRef.current);
        maxProgressRef.current = monotonicProgress;

        const rawStatus = statusResp.status;

        if (isTerminal(rawStatus)) {
          stopPolling();

          if (rawStatus === "complete") {
            setState((prev) => ({
              ...prev,
              status: rawStatus,
              currentNode: statusResp.current_node
                ? formatNodeLabel(statusResp.current_node)
                : prev.currentNode,
              progress: 100,
            }));
            maxProgressRef.current = 100;
            // Fetch full results now that the pipeline is done.
            await fetchResults(analysisId);
          } else {
            // "failed"
            setState((prev) => ({
              ...prev,
              phase: "failed",
              status: rawStatus,
              currentNode: statusResp.current_node
                ? formatNodeLabel(statusResp.current_node)
                : prev.currentNode,
              progress: monotonicProgress,
              error: statusResp.error ?? "Analysis failed",
            }));
          }
        } else {
          // Still running — update progress and node label.
          setState((prev) => ({
            ...prev,
            phase: "polling",
            status: rawStatus,
            currentNode: statusResp.current_node
              ? formatNodeLabel(statusResp.current_node)
              : prev.currentNode,
            progress: monotonicProgress,
          }));
        }
      } catch (err) {
        if (!mountedRef.current) return;

        // On a transient network error we keep polling; on a hard 4xx we stop.
        if (err instanceof PmxApiError && err.status >= 400 && err.status < 500) {
          stopPolling();
          setState((prev) => ({
            ...prev,
            phase: "failed",
            error: err.message,
          }));
        }
        // For network errors (status 0) or 5xx we silently retry on the next tick.
      }
    },
    [stopPolling, fetchResults],
  );

  // ---------------------------------------------------------------------------
  // Internal: start polling loop
  // ---------------------------------------------------------------------------

  const startPolling = useCallback(
    (analysisId: string) => {
      // Clear any existing interval before starting a new one.
      stopPolling();

      // Kick off an immediate first poll so the UI updates without waiting 1.5 s.
      pollOnce(analysisId);

      intervalRef.current = setInterval(() => {
        pollOnce(analysisId);
      }, POLL_INTERVAL_MS);
    },
    [stopPolling, pollOnce],
  );

  // ---------------------------------------------------------------------------
  // Public: start
  // ---------------------------------------------------------------------------

  const start = useCallback(
    async (params: AnalyzeRequest) => {
      // Reset monotonic progress tracker for the new run.
      maxProgressRef.current = 0;

      setState({
        ...makeInitialState(),
        phase: "starting",
      });

      const response = await startAnalysis(params);
      // ^ Throws PmxApiError on 4xx/5xx — let the caller handle it.

      if (!mountedRef.current) return;

      setState((prev) => ({
        ...prev,
        phase: "polling",
        analysisId: response.analysis_id,
        status: response.status,
        progress: 0,
      }));

      startPolling(response.analysis_id);
    },
    [startPolling],
  );

  // ---------------------------------------------------------------------------
  // Public: reset
  // ---------------------------------------------------------------------------

  const reset = useCallback(() => {
    stopPolling();
    maxProgressRef.current = 0;
    if (mountedRef.current) {
      setState(makeInitialState());
    }
  }, [stopPolling]);

  // ---------------------------------------------------------------------------

  return { state, start, reset };
}

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, NetworkError } from "./api";
import { errorKey } from "../i18n/content";
import type { StringKey } from "../i18n/strings";

export type AsyncStatus = "idle" | "busy" | "done" | "failed";

export interface AsyncAction<Args extends unknown[]> {
  run: (...args: Args) => Promise<boolean>;
  status: AsyncStatus;
  busy: boolean;
  /** Translatable key for whatever went wrong, or null. */
  errorKey: StringKey | null;
  reset: () => void;
}

/**
 * Wraps an asynchronous action so a button can show busy, success and a
 * recoverable error without every view reinventing three pieces of state.
 *
 * Resolves `true` on success and `false` on failure rather than rethrowing, so
 * callers can decide what to do next ("navigate away only if it saved") without
 * a try/catch around every handler.
 */
export function useAsyncAction<Args extends unknown[]>(
  action: (...args: Args) => Promise<unknown>,
  { successMs = 1800 }: { successMs?: number } = {},
): AsyncAction<Args> {
  const [status, setStatus] = useState<AsyncStatus>("idle");
  const [failure, setFailure] = useState<StringKey | null>(null);
  const mounted = useRef(true);
  const latest = useRef(action);
  latest.current = action;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (status !== "done") return;
    const timer = window.setTimeout(() => {
      if (mounted.current) setStatus("idle");
    }, successMs);
    return () => window.clearTimeout(timer);
  }, [status, successMs]);

  const run = useCallback(async (...args: Args): Promise<boolean> => {
    setStatus("busy");
    setFailure(null);
    try {
      await latest.current(...args);
      if (mounted.current) setStatus("done");
      return true;
    } catch (error) {
      if (mounted.current) {
        setStatus("failed");
        setFailure(
          error instanceof NetworkError
            ? "error.NETWORK"
            : errorKey(error instanceof ApiError ? error.code : undefined),
        );
      }
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setFailure(null);
  }, []);

  return { run, status, busy: status === "busy", errorKey: failure, reset };
}

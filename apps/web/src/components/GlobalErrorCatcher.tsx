"use client";

import { useEffect } from "react";

import { showError } from "@/lib/toast";

/**
 * Safety net for errors nobody caught: unhandled promise rejections (e.g. a
 * fire-and-forget api call) and uncaught runtime errors outside React's render
 * (render errors are handled by error.tsx). Shows a toast instead of failing
 * silently or crashing the page.
 */
export default function GlobalErrorCatcher(): null {
  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent): void => {
      showError(e.reason);
      e.preventDefault();
    };
    const onError = (e: ErrorEvent): void => {
      // Ignore resource-load errors (no `error` object) — only real exceptions.
      if (e.error) showError(e.error);
    };
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}

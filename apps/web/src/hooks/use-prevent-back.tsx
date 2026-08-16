"use client";

import { useCallback, useEffect } from "react";

export function usePreventBack(shouldPrevent = true, onBackAttempt?: () => void) {
  const handlePopState = useCallback(() => {
    if (shouldPrevent) {
      window.history.pushState(null, "", window.location.href);
      onBackAttempt?.();
    }
  }, [shouldPrevent, onBackAttempt]);

  useEffect(() => {
    if (shouldPrevent) {
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", handlePopState);
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [handlePopState, shouldPrevent]);
}

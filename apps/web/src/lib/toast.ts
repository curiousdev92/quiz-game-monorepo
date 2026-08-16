"use client";

import toast from "react-hot-toast";

import { ApiError } from "./api";

const GENERIC_ERROR = "مشکلی پیش آمد. دوباره تلاش کنید.";

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message || GENERIC_ERROR;
  return GENERIC_ERROR;
}

/** Show a client error as a toast. Same message twice → one toast (id = message). */
export function showError(err: unknown): void {
  const msg = errorMessage(err);
  toast.error(msg, { id: msg });
}

export function showSuccess(msg: string): void {
  toast.success(msg);
}

import { isAxiosError } from "axios";
import { clsx, type ClassValue } from "clsx";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";
import { ApiResponse } from "./axios";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function handleErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as Partial<ApiResponse<unknown>> | undefined;
    if (typeof data?.message === "string") {
      return data.message;
    }

    return fallback;
  }

  // Native Error
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

/**
 * Handle error by extracting message and optionally showing toast
 */
export function handleErrorToast(
  error: unknown,
  options: { fallbackMessage?: string; silent?: boolean } = {}
): void {
  const { fallbackMessage = "Something went wrong", silent = false } = options;
  const message = handleErrorMessage(error, fallbackMessage);

  if (!silent) {
    toast.error(message);
  }
}

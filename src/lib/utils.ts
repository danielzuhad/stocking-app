import { isAxiosError } from "axios";
import { clsx, type ClassValue } from "clsx";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";
import { ApiResponse, HttpError } from "./axios";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function handleErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof HttpError) {
    return error.message || fallback;
  }

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

export function enumToValueLabel<T extends readonly string[]>(values: T) {
  return values.map((val) => ({
    value: val,
    label: val.charAt(0).toUpperCase() + val.slice(1),
  }));
}

export function getValidEnumValue<T extends readonly string[]>(
  value: string | null,
  enumObj: { enumValues: T }
): T[number] | null {
  return (enumObj.enumValues as readonly string[]).includes(value ?? "")
    ? (value as T[number])
    : null;
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

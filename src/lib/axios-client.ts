// lib/api.ts
"use server";

import type { AxiosRequestHeaders } from "axios";
import axiosInstance, { ApiResponse, HttpError } from "./axios";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiResult<T> = {
  data: T;
  message: string;
  status: number;
};

export type ApiOptions<TParams = unknown, TBody = unknown> = {
  method?: HttpMethod; // default: "GET"
  params?: TParams; // query string
  body?: TBody; // request body (POST/PUT/PATCH)
  headers?: AxiosRequestHeaders; // override / tambahan headers
};

const unwrapResponse = <T>(raw: ApiResponse<T>, httpStatus: number): ApiResult<T> => {
  if (!raw.success) {
    throw new HttpError(httpStatus, raw.message ?? "Request failed", raw);
  }

  return {
    data: (raw.data ?? null) as T,
    message: raw.message ?? "",
    status: httpStatus,
  };
};

/**
 * Satu pintu untuk semua HTTP method.
 * Contoh:
 *   api<Company[]>("/master/companies", { method: "GET", params: {...} })
 *   api<Company>("/master/companies", { method: "POST", body: {...} })
 */
export async function api<TResponse, TParams = Record<string, unknown>, TBody = unknown>(
  url: string,
  options: ApiOptions<TParams, TBody> = {}
): Promise<ApiResult<TResponse>> {
  const { method = "GET", params, body, headers } = options;

  const response = await axiosInstance.request<ApiResponse<TResponse>>({
    url,
    method,
    params,
    data: body,
    headers,
  });

  return unwrapResponse<TResponse>(response.data, response.status);
}

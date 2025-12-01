import axios, { AxiosError } from "axios";
import { signOut } from "next-auth/react";
import { env } from "./env";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  status?: number;
}

export class HttpError extends Error {
  status: number;
  body?: ApiResponse<unknown>;

  constructor(status: number, message: string, body?: ApiResponse<unknown>) {
    super(message || "Request failed");
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

// Prefer URL dari env, fallback ke localhost
const API_URL =
  env?.data?.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const axiosInstance = axios.create({
  baseURL: `${API_URL.replace(/\/$/, "")}/api`,
  withCredentials: true,
});

// Default headers bisa di-set di sini
// contoh:
// axiosInstance.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    // Auto sign out kalau 401 di browser
    if (error.response?.status === 401 && typeof window !== "undefined") {
      await signOut({ callbackUrl: "/login" });
    }

    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || error.message || "Unknown error";
      return Promise.reject(new HttpError(status, message, data));
    }

    return Promise.reject(new HttpError(0, error.message || "Network error, please try again."));
  }
);

export default axiosInstance;

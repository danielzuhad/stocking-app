// lib/axiosInstance.ts
import axios from "axios";
import { signOut } from "next-auth/react";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

const axiosInstance = axios.create({
  baseURL: "/api",
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // token expired or unauthorized
      await signOut({ callbackUrl: "/login" });
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

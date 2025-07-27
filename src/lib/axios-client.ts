import axiosInstance, { ApiResponse } from "./axios";

export const apiGet = async <T>(url: string, params?: unknown): Promise<ApiResponse<T>> => {
  const response = await axiosInstance.get<ApiResponse<T>>(url, { params });
  return response.data;
};

export const apiPost = async <T>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
  const response = await axiosInstance.post<ApiResponse<T>>(url, data);
  return response.data;
};

export const apiPatch = async <T>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
  const response = await axiosInstance.patch<ApiResponse<T>>(url, data);
  return response.data;
};

export const apiDelete = async <T>(url: string, params?: unknown): Promise<ApiResponse<T>> => {
  const response = await axiosInstance.delete<ApiResponse<T>>(url, { params });
  return response.data;
};

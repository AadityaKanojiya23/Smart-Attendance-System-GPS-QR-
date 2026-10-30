import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";

let baseUrl = process.env.EXPO_PUBLIC_API_URL || "https://smart-attendance-api-5ap4.onrender.com";

export function getBaseUrl(): string {
  return baseUrl;
}

export function setBaseUrl(url: string) {
  if (!url) return;
  baseUrl = url.replace(/\/$/, "");
  try {
    AsyncStorage.setItem("@custom_api_url", baseUrl).catch(() => { });
  } catch { }
}

export async function loadSavedBaseUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem("@custom_api_url");
    if (saved && !saved.includes("192.168.") && !saved.includes("localhost") && !saved.includes("127.0.0.1")) {
      baseUrl = saved.replace(/\/$/, "");
    } else {
      baseUrl = "https://smart-attendance-api-5ap4.onrender.com";
      await AsyncStorage.setItem("@custom_api_url", baseUrl);
    }
  } catch { }
  return baseUrl;
}

export function getApiUrl(path: string): string {
  return `${baseUrl}/api${path}`;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30,
    },
  },
});

export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = getApiUrl(path);
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errorMsg = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) errorMsg = data.error;
    } catch { }
    throw new Error(errorMsg);
  }

  return res.json();
}

export async function defaultFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    let errorMsg = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) errorMsg = data.error;
    } catch { }
    throw new Error(errorMsg);
  }
  return res.json();
}

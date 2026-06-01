export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const apiFetch = (path: string, options: any = {}) => {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
};

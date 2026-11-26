const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "/SMPL-app/smplDB"
).replace(
  /\/+$/,
  "",
);

export function apiUrl(path) {
  return `${API_BASE_URL}/${String(path).replace(/^\/+/, "")}`;
}

export function apiFetch(path, options = {}) {
  return fetch(apiUrl(path), {
    ...options,
    credentials: options.credentials || "include",
  });
}

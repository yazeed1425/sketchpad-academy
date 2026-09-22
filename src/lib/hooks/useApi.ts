export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new ApiError(body.error ?? "Request failed", res.status);
  return body as T;
}

export async function apiPost<T>(url: string, data?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });
  const body = await res.json();
  if (!res.ok) throw new ApiError(body.error ?? "Request failed", res.status);
  return body as T;
}

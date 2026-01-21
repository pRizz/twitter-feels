import type { APIResponse } from "@playwright/test";

export async function readJsonSafely(response: APIResponse): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function hasSensitiveData(body: unknown): boolean {
  if (!body || typeof body !== "object") {
    return false;
  }

  const bodyStr = JSON.stringify(body).toLowerCase();
  const sensitivePatterns = [
    "password",
    "secretaccesskey",
    "token",
    "apikey",
    "api_key",
    "credentials",
  ];

  return sensitivePatterns.some((pattern) => {
    if (!bodyStr.includes(pattern) || bodyStr.includes("csrf")) {
      return false;
    }
    return bodyStr.includes(`"${pattern}":`);
  });
}

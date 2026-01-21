import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

const publicEndpoints = [
  { name: "Health", path: "/api/health" },
  { name: "Dashboard (default)", path: "/api/dashboard" },
  { name: "Dashboard (weekly)", path: "/api/dashboard?timeBucket=weekly&modelId=combined" },
  { name: "Dashboard (monthly)", path: "/api/dashboard?timeBucket=monthly&modelId=combined" },
  { name: "Dashboard (all_time)", path: "/api/dashboard?timeBucket=all_time&modelId=combined" },
  { name: "Models", path: "/api/models" },
  { name: "Users list", path: "/api/users" },
  { name: "User detail (id=4)", path: "/api/users/4" },
  { name: "User tweets (id=4)", path: "/api/users/4/tweets" },
  { name: "User trends (id=4)", path: "/api/users/4/trends?timeBucket=daily" },
  { name: "Tweet detail (id=52)", path: "/api/tweets/52" },
  { name: "Leaderboards", path: "/api/leaderboards" },
  { name: "Aggregations", path: "/api/aggregations" },
  { name: "CSRF Token", path: "/api/csrf-token" },
];

const adminEndpoints = [
  { name: "Admin Me", path: "/api/admin/me" },
  { name: "Admin Crawler Status", path: "/api/admin/crawler/status" },
  { name: "Admin Users", path: "/api/admin/users" },
  { name: "Admin Settings", path: "/api/admin/settings" },
  { name: "Admin Models", path: "/api/admin/models" },
  { name: "Admin Theme", path: "/api/admin/theme" },
  { name: "Admin Errors", path: "/api/admin/errors" },
];

const THRESHOLD_MS = 500;

function getAdminCredentials() {
  const { ADMIN_USERNAME: adminUsername, ADMIN_PASSWORD: adminPassword } = process.env;
  if (!adminUsername || !adminPassword) {
    throw new Error("Set ADMIN_USERNAME and ADMIN_PASSWORD to run admin login tests.");
  }
  return { adminUsername, adminPassword };
}

async function measureEndpoint(
  request: APIRequestContext,
  endpoint: { name: string; path: string },
  maybeCookie?: string,
) {
  const start = Date.now();
  const response = await request.get(endpoint.path, {
    headers: maybeCookie ? { Cookie: maybeCookie } : undefined,
  });
  const duration = Date.now() - start;
  const text = await response.text();
  return {
    duration,
    status: response.status(),
    ok: response.ok(),
    size: text.length,
  };
}

async function login(request: APIRequestContext) {
  const csrfResponse = await request.get("/api/csrf-token");
  const csrfData = (await csrfResponse.json()) as { csrfToken?: string };
  const csrfToken = csrfData.csrfToken ?? "";
  const csrfCookie = csrfResponse.headers()["set-cookie"] ?? "";

  const { adminUsername, adminPassword } = getAdminCredentials();
  const loginResponse = await request.post("/api/admin/login", {
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
      Cookie: csrfCookie,
    },
    data: { username: adminUsername, password: adminPassword },
  });

  if (!loginResponse.ok()) {
    return null;
  }
  return loginResponse.headers()["set-cookie"] ?? null;
}

test("Feature #235: API responses are efficient (<500ms)", async ({ request }) => {
  for (const endpoint of publicEndpoints) {
    const result = await measureEndpoint(request, endpoint);
    expect(result.ok, `${endpoint.name} status`).toBe(true);
    expect(
      result.duration,
      `${endpoint.name} took ${result.duration}ms`,
    ).toBeLessThan(THRESHOLD_MS);
  }

  const sessionCookie = await login(request);
  if (!sessionCookie) {
    throw new Error("Admin login failed; cannot run admin performance checks.");
  }

  for (const endpoint of adminEndpoints) {
    const result = await measureEndpoint(request, endpoint, sessionCookie);
    expect(result.ok, `${endpoint.name} status`).toBe(true);
    expect(
      result.duration,
      `${endpoint.name} took ${result.duration}ms`,
    ).toBeLessThan(THRESHOLD_MS);
  }
});

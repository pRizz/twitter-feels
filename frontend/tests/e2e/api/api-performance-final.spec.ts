import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

const endpoints = [
  { name: "Health Check", path: "/api/health" },
  { name: "Dashboard (default)", path: "/api/dashboard" },
  { name: "Dashboard (weekly)", path: "/api/dashboard?timeBucket=weekly&modelId=combined" },
  { name: "Dashboard (monthly)", path: "/api/dashboard?timeBucket=monthly&modelId=combined" },
  { name: "Dashboard (yearly)", path: "/api/dashboard?timeBucket=yearly&modelId=combined" },
  { name: "Dashboard (all_time)", path: "/api/dashboard?timeBucket=all_time&modelId=combined" },
  { name: "Models List", path: "/api/models" },
  { name: "Users List", path: "/api/users" },
  { name: "User Detail (id=4)", path: "/api/users/4" },
  { name: "User Tweets (id=4)", path: "/api/users/4/tweets" },
  { name: "User Tweets (page 2)", path: "/api/users/4/tweets?page=2" },
  { name: "User Trends (daily)", path: "/api/users/4/trends?timeBucket=daily" },
  { name: "User Trends (weekly)", path: "/api/users/4/trends?timeBucket=weekly" },
  { name: "User Trends (monthly)", path: "/api/users/4/trends?timeBucket=monthly" },
  { name: "Tweet Detail (id=52)", path: "/api/tweets/52" },
  { name: "Leaderboards", path: "/api/leaderboards" },
  { name: "Aggregations", path: "/api/aggregations" },
  { name: "CSRF Token", path: "/api/csrf-token" },
];

const THRESHOLD_MS = 500;
const NUM_RUNS = 3;

async function measureEndpoint(
  request: APIRequestContext,
  endpoint: { name: string; path: string },
) {
  const durations: number[] = [];
  for (let i = 0; i < NUM_RUNS; i += 1) {
    const start = Date.now();
    const response = await request.get(endpoint.path);
    const duration = Date.now() - start;
    if (!response.ok()) {
      return { ok: false, error: `HTTP ${response.status()}` };
    }
    await response.text();
    durations.push(duration);
  }

  const avgDuration = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  return {
    ok: true,
    avgDuration,
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),
  };
}

test("Feature #235: API responses remain under 500ms (multi-run)", async ({
  request,
}) => {
  for (const endpoint of endpoints) {
    const result = await measureEndpoint(request, endpoint);
    expect(result.ok, `${endpoint.name} should respond ok`).toBe(true);
    if (result.ok) {
      expect(
        result.maxDuration,
        `${endpoint.name} max ${result.maxDuration}ms`,
      ).toBeLessThan(THRESHOLD_MS);
    }
  }
});

import { expect, test } from "@playwright/test";

test("Dashboard API returns gauges data", async ({ request }) => {
  const response = await request.get(
    "/api/dashboard?timeBucket=weekly&modelId=combined",
  );
  expect(response.ok()).toBe(true);
  const data = (await response.json()) as { gauges?: unknown[] };

  expect(Array.isArray(data.gauges)).toBe(true);
  expect(data.gauges?.length).toBeGreaterThan(0);
});

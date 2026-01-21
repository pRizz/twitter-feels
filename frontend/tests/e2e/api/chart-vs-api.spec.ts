import { expect, test } from "@playwright/test";

test("Feature #221: Chart data aligns with API trends", async ({ request }) => {
  const userId = 4;
  const response = await request.get(
    `/api/users/${userId}/trends?timeBucket=daily`,
  );
  expect(response.ok()).toBe(true);
  const data = (await response.json()) as {
    dataPoints?: Array<{ timestamp: string; emotions: Record<string, number> }>;
    emotions?: string[];
  };

  expect(Array.isArray(data.dataPoints)).toBe(true);
  expect(data.dataPoints?.length).toBeGreaterThan(0);
  expect(data.emotions?.length).toBeGreaterThan(0);

  const points = data.dataPoints ?? [];

  let inOrder = true;
  for (let i = 1; i < points.length; i += 1) {
    if (points[i].timestamp < points[i - 1].timestamp) {
      inOrder = false;
      break;
    }
  }
  expect(inOrder).toBe(true);

  for (const point of points) {
    for (const value of Object.values(point.emotions)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  }
});

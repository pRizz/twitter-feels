import { expect, test } from "@playwright/test";

const periods = ["all_time", "yearly", "monthly", "weekly"] as const;

test("All-time filter matches expected behavior", async ({ request }) => {
  for (const timeBucket of periods) {
    const response = await request.get(`/api/dashboard?timeBucket=${timeBucket}`);
    expect(response.ok()).toBe(true);
    const data = (await response.json()) as {
      timeBucket?: string;
      timeCutoff?: string | null;
      filteredAnalysisCount?: number;
      stats?: { totalAnalyses?: number };
    };

    expect(data.timeBucket).toBe(timeBucket);
  }

  const allTimeResponse = await request.get("/api/dashboard?timeBucket=all_time");
  expect(allTimeResponse.ok()).toBe(true);
  const allTimeData = (await allTimeResponse.json()) as {
    timeCutoff?: string | null;
    filteredAnalysisCount?: number;
    stats?: { totalAnalyses?: number };
  };

  expect(allTimeData.timeCutoff).toBeNull();
  expect(allTimeData.filteredAnalysisCount).toBe(allTimeData.stats?.totalAnalyses);
});

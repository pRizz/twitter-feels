import { expect, test } from "@playwright/test";

const emotions = [
  "happy",
  "sad",
  "angry",
  "fearful",
  "hatred",
  "thankful",
  "excited",
  "hopeful",
  "frustrated",
  "sarcastic",
  "inspirational",
  "anxious",
];

test("Feature #81: User detail shows real emotion averages", async ({ request }) => {
  const userId = 46;
  const response = await request.get(`/api/users/${userId}`);
  expect(response.ok()).toBe(true);

  const data = (await response.json()) as {
    emotionAverages?: Record<string, number>;
    analysisCount?: number;
    tweetCount?: number;
  };

  expect(data.emotionAverages).toBeTruthy();

  for (const emotion of emotions) {
    const value = data.emotionAverages?.[emotion];
    expect(typeof value).toBe("number");
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  }

  expect(data.analysisCount).toBeGreaterThan(0);
  expect(data.tweetCount).toBeGreaterThan(0);
});

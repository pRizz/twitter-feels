import { expect, test } from "@playwright/test";

type Tweet = {
  id: number;
  tweetTimestamp: string;
  combinedEmotions?: Record<string, number>;
};

test("Feature #221: Time series data matches manual averages", async ({
  request,
}) => {
  const userId = 4;
  const trendsResponse = await request.get(
    `/api/users/${userId}/trends?timeBucket=daily`,
  );
  expect(trendsResponse.ok()).toBe(true);
  const trendsData = (await trendsResponse.json()) as {
    dataPoints: Array<{ timestamp: string; emotions: Record<string, number> }>;
  };

  const tweetsResponse = await request.get(
    `/api/users/${userId}/tweets?limit=200`,
  );
  expect(tweetsResponse.ok()).toBe(true);
  const tweetsData = (await tweetsResponse.json()) as {
    tweets: Tweet[];
  };

  const byDate: Record<string, Tweet[]> = {};
  for (const tweet of tweetsData.tweets) {
    const date = tweet.tweetTimestamp.split("T")[0];
    if (!byDate[date]) {
      byDate[date] = [];
    }
    byDate[date].push(tweet);
  }

  const manualAverages: Record<string, Record<string, number>> = {};
  for (const [date, tweets] of Object.entries(byDate)) {
    const emotionSums: Record<string, number> = {};
    const emotionCounts: Record<string, number> = {};

    for (const tweet of tweets) {
      if (!tweet.combinedEmotions) {
        continue;
      }
      for (const [emotion, value] of Object.entries(tweet.combinedEmotions)) {
        if (typeof value !== "number") {
          continue;
        }
        emotionSums[emotion] = (emotionSums[emotion] || 0) + value;
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      }
    }

    manualAverages[date] = {};
    for (const emotion of Object.keys(emotionSums)) {
      manualAverages[date][emotion] = Math.round(
        emotionSums[emotion] / emotionCounts[emotion],
      );
    }
  }

  const emotionsToCheck = [
    "happy",
    "excited",
    "thankful",
    "inspirational",
  ];

  for (const apiPoint of trendsData.dataPoints) {
    const manual = manualAverages[apiPoint.timestamp];
    if (!manual) {
      continue;
    }

    for (const emotion of emotionsToCheck) {
      const apiValue = apiPoint.emotions[emotion];
      const manualValue = manual[emotion];
      const samples = byDate[apiPoint.timestamp]?.filter(
        (tweet) => typeof tweet.combinedEmotions?.[emotion] === "number",
      ).length;
      if (
        apiValue === undefined ||
        manualValue === undefined ||
        !samples ||
        samples < 2
      ) {
        continue;
      }
      expect(
        apiValue,
        `${apiPoint.timestamp} ${emotion} mismatch`,
      ).toBe(manualValue);
    }
  }
});

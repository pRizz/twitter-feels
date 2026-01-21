import { expect, test } from "@playwright/test";

import { hasSensitiveData, readJsonSafely } from "./utils";

const adminEndpoints = [
  { method: "GET", path: "/api/admin/settings" },
  { method: "GET", path: "/api/admin/crawler/status" },
  { method: "GET", path: "/api/admin/users" },
  { method: "GET", path: "/api/admin/models" },
  { method: "GET", path: "/api/admin/errors" },
  { method: "GET", path: "/api/admin/errors/stats" },
  { method: "GET", path: "/api/admin/theme" },
  { method: "GET", path: "/api/admin/backup/status" },
  { method: "GET", path: "/api/admin/backup/list" },
  { method: "GET", path: "/api/admin/config/export" },
  { method: "GET", path: "/api/admin/models/download/progress/1" },
];

const publicEndpoints = [
  { method: "GET", path: "/api/dashboard" },
  { method: "GET", path: "/api/users" },
  { method: "GET", path: "/api/models" },
  { method: "GET", path: "/api/leaderboards" },
];

test.describe("Feature #15: Admin endpoints require authentication", () => {
  test("admin endpoints reject unauthenticated requests", async ({ request }) => {
    for (const endpoint of adminEndpoints) {
      const response = await request.fetch(endpoint.path, {
        method: endpoint.method,
      });
      expect(
        response.status(),
        `${endpoint.method} ${endpoint.path} should return 401`,
      ).toBe(401);

      const body = await readJsonSafely(response);
      expect(
        hasSensitiveData(body),
        `${endpoint.method} ${endpoint.path} should not leak sensitive data`,
      ).toBe(false);
    }
  });

  test("public endpoints allow unauthenticated requests", async ({ request }) => {
    for (const endpoint of publicEndpoints) {
      const response = await request.fetch(endpoint.path, {
        method: endpoint.method,
      });
      expect(
        response.status(),
        `${endpoint.method} ${endpoint.path} should return 200`,
      ).toBe(200);
    }
  });
});

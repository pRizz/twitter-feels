## Playwright E2E Tests

These tests exercise API verification workflows that used to live in root-level
`verify-*` scripts. They run against a live backend.

### Prerequisites
- The Playwright config spins up the backend and seeds a deterministic test DB.
- Backend default API base URL: `http://localhost:3001` (override with `API_BASE_URL`)
- Seeded test database path: `backend/data/playwright_seed.db` (override with `TEST_DATABASE_URL`)
- For admin checks, set `ADMIN_USERNAME` and `ADMIN_PASSWORD`

### Run
```bash
cd frontend
npm run test:e2e
```

Optional UI runner:
```bash
npm run test:e2e:ui
```

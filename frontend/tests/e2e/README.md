## Playwright E2E Tests

These tests exercise API verification workflows that used to live in root-level
`verify-*` scripts. They run against a live backend.

### Prerequisites
- Backend running on `http://localhost:3001` (or set `API_BASE_URL`)
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

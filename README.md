# Twitter Feels

A public sentiment analysis dashboard that tracks and visualizes the emotional tone of top Twitter/X influencers. It combines a sleek React frontend with a Rust-based crawler that uses configurable LLMs to analyze tweets and surface emotion scores through engaging visualizations.

## Features

- **Public Dashboard**: Real-time sentiment gauges, leaderboards, and user grids
- **User Detail Views**: Deep-dive into individual influencer sentiment trends
- **Tweet Analysis**: Emotion breakdown for each analyzed tweet
- **Admin Dashboard**: Manage tracked users, configure crawler, and customize themes
- **LLM Integration**: Support for multiple LLM models via Hugging Face
- **Configurable Emotions & Gauges**: All labels, colors, and mappings are customizable

## Technology Stack

### Frontend
- React with TypeScript
- Vite for build tooling
- shadcn/ui with Tailwind CSS
- React Query for server state

### Backend
- Node.js with Express (API server)
- SQLite database
- Session-based authentication

### Crawler
- Rust for performance and reliability
- Configurable scheduling
- Local LLM inference with Hugging Face Hub integration

### Deployment
- Docker and Docker Compose
- Configurable persistence volumes
- Optional S3 backup

## Prerequisites

- **Node.js 18+** - For frontend and backend
- **Rust toolchain** - For the crawler (`rustup`)
- **Docker** (optional) - For containerized deployment
- **Twitter/X API credentials** - For fetching tweets
- **Hugging Face token** (optional) - For model downloads

## Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd twitter-feels

# Run the setup script
./init.sh

# Or run setup and dev separately
./init.sh setup
./init.sh dev
```

## Project Structure

```
twitter-feels/
├── frontend/           # React + TypeScript frontend
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── pages/      # Page components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── lib/        # Utilities and API client
│   │   └── types/      # TypeScript types
│   └── public/         # Static assets
├── backend/            # Node.js API server
│   ├── src/
│   │   ├── routes/     # API route handlers
│   │   ├── services/   # Business logic
│   │   ├── db/         # Database layer
│   │   └── middleware/ # Express middleware
│   └── data/           # SQLite database
├── crawler/            # Rust crawler application
│   └── src/
│       ├── twitter/    # Twitter API integration
│       ├── llm/        # LLM inference
│       └── scheduler/  # Crawl scheduling
├── shared/             # Shared configuration schemas
├── docker/             # Docker-related files
├── init.sh             # Development setup script
└── docker-compose.yml  # Container orchestration
```

## Configuration

### Environment Variables

Create `.env` files in each service directory. See `.env.example` files for templates.

**Backend (`backend/.env`):**
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=./data/twitter_feels.db
SESSION_SECRET=your-secret-here
TWITTER_BEARER_TOKEN=your-twitter-token
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:3001
```

**Crawler (`crawler/.env`):**
```env
DATABASE_URL=../backend/data/twitter_feels.db
TWITTER_BEARER_TOKEN=your-twitter-token
CRAWL_INTERVAL_HOURS=1
```

### Admin Credentials

Admin credentials are stored in the SQLite database (`backend/data/twitter_feels.db`). By default, the schema seeds a development user of `admin` / `admin` using a placeholder hash format (`hashed_<password>`). The `init.sh` script creates `backend/.env` (or copies from `backend/.env.example`) but does not enforce or validate admin credentials.

To update the default admin password in development:

```bash
sqlite3 backend/data/twitter_feels.db \
  "UPDATE admin_users SET password_hash = 'hashed_NEW_PASSWORD' WHERE username = 'admin';"
```

You can also let the init script generate a long, cryptographically secure password and store it locally:

```bash
./init.sh admin-password
```

This generates a password (using `openssl rand -base64 48` or `python3`'s `secrets`), writes it to `backend/.admin_password` with `0600` permissions, and updates the database hash. If the file already exists, it is reused and nothing is regenerated.

To revoke the stored password and invalidate it in the database:

```bash
./init.sh revoke-admin-password
```

To rotate the password in one step (revoke + generate):

```bash
./init.sh rotate-admin-password
```

Local test utilities that log in as admin (for example `verify-api-performance.js` or the scripts under `.playwright-mcp/`) read plaintext credentials from environment variables at runtime. Set these to match the database:

```bash
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=your-plaintext-password
node verify-api-performance.js
```
Use a dedicated local admin password for these scripts and keep it out of version control.

### Default Emotions

The system tracks 12 emotions by default:
- Happy, Sad, Angry, Fearful
- Hatred, Thankful, Excited, Hopeful
- Frustrated, Sarcastic, Inspirational, Anxious

All emotions can be customized, added, or disabled via the admin dashboard.

### Default Gauges

- **Anger Gauge**: Chill <-> Angry
- **Inspiration Gauge**: Doomer <-> Kurzweilian
- **Gratitude Gauge**: Entitled <-> Thankful
- **Mood Gauge**: Gloomy <-> Joyful
- **Intensity Gauge**: Zen <-> Heated
- **Playfulness Gauge**: Serious <-> Comedian

## Development

```bash
# Start development servers
./init.sh dev

# Access points:
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
# Admin:    http://localhost:5173/admin
```

## Playwright Tests

API-focused Playwright tests live under `frontend/tests/e2e/api`. The Playwright
config starts the backend and frontend dev servers automatically (via `webServer`),
seeds a deterministic test database, and uses:
- `API_BASE_URL` for API tests (default `http://localhost:3001`)
- `UI_BASE_URL` for UI tests (default `http://localhost:5173`)
- `TEST_DATABASE_URL` for the seeded backend DB (default `./data/playwright_seed.db` in `backend/`)

```bash
# Run Playwright tests from the repo root
just test-e2e

# Or from the frontend package
cd frontend
npm run test:e2e
```

Admin-only checks require credentials:
```bash
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=your-plaintext-password
```

## Production Deployment

### Docker Compose

```bash
# Build and run
docker compose up --build -d

# View logs
docker compose logs -f
```

Docker runs the SQLite database from a host bind mount at `./backend/data` (mapped to `/app/data` in the backend and crawler containers). This keeps `twitter_feels.db` accessible on the host for snapshots and backups.

### Manual Build

```bash
# Build all components
./init.sh build
```

## API Endpoints

### Public API
- `GET /api/dashboard` - Main dashboard data
- `GET /api/users` - List tracked users
- `GET /api/users/:id` - User detail
- `GET /api/users/:id/tweets` - User's tweets
- `GET /api/tweets/:id` - Tweet detail
- `GET /api/models` - Available LLM models
- `GET /api/leaderboards` - Emotion leaderboards

### Admin API (authenticated)
- `POST /api/admin/login` - Admin login
- `GET /api/admin/crawler/status` - Crawler status
- `POST /api/admin/crawler/trigger` - Start crawler
- `GET/POST/DELETE /api/admin/users` - Manage tracked users
- `GET/PUT /api/admin/settings` - Application settings
- `GET/POST/PUT /api/admin/models` - LLM model management
- `PUT /api/admin/theme` - Theme customization

## License

MIT

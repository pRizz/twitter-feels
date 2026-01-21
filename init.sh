#!/usr/bin/env bash
set -euo pipefail

# Twitter Feels - Development Environment Setup Script
# This script sets up and runs the development environment

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

command_exists() {
    command -v "$1" &> /dev/null
}

is_running_in_docker() {
    if [ -f "/.dockerenv" ]; then
        return 0
    fi

    if [ -f "/proc/1/cgroup" ] && grep -qE "(docker|containerd|kubepods)" /proc/1/cgroup; then
        return 0
    fi

    return 1
}

maybe_warn_docker_best_practice() {
    if is_running_in_docker; then
        return 0
    fi

    log_warn "Not running inside a container. For best isolation, use Docker:"
    log_warn "  docker compose up --build"
    log_warn "Dockerfiles are in ./docker and docker-compose.yml at repo root."
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        return 1
    fi
    return 0
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    local missing=0

    # Check Node.js
    if check_command node; then
        local node_version
        node_version=$(node --version | sed 's/v//')
        local major_version
        major_version=$(echo "$node_version" | cut -d. -f1)
        if [ "$major_version" -lt 18 ]; then
            log_error "Node.js version 18+ required. Found: v$node_version"
            missing=1
        else
            log_success "Node.js v$node_version found"
        fi
    else
        missing=1
    fi

    # Check npm
    if check_command npm; then
        log_success "npm $(npm --version) found"
    else
        missing=1
    fi

    # Check pnpm (preferred) or fallback info
    if check_command pnpm; then
        log_success "pnpm $(pnpm --version) found"
        export PKG_MANAGER="pnpm"
    else
        log_warn "pnpm not found, will use npm instead"
        export PKG_MANAGER="npm"
    fi

    # Check Rust (for crawler)
    if check_command cargo; then
        log_success "Rust $(cargo --version | cut -d' ' -f2) found"
    else
        log_warn "Rust not installed. The crawler won't be available."
        log_warn "Install via: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    fi

    # Check Docker (optional, for deployment)
    if check_command docker; then
        log_success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',') found"
    else
        log_warn "Docker not installed. Container deployment won't be available."
    fi

    if [ $missing -eq 1 ]; then
        log_error "Missing required prerequisites. Please install them and try again."
        exit 1
    fi

    log_success "All required prerequisites satisfied!"
}

setup_frontend() {
    log_info "Setting up frontend..."

    if [ ! -d "frontend" ]; then
        log_error "Frontend directory not found. Please run project setup first."
        return 1
    fi

    cd frontend

    if [ ! -d "node_modules" ]; then
        log_info "Installing frontend dependencies..."
        $PKG_MANAGER install
    else
        log_info "Frontend dependencies already installed"
    fi

    cd "$SCRIPT_DIR"
    log_success "Frontend setup complete"
}

setup_backend() {
    log_info "Setting up backend API server..."

    if [ ! -d "backend" ]; then
        log_error "Backend directory not found. Please run project setup first."
        return 1
    fi

    cd backend

    if [ ! -d "node_modules" ]; then
        log_info "Installing backend dependencies..."
        $PKG_MANAGER install
    else
        log_info "Backend dependencies already installed"
    fi

    # Initialize database if not exists
    if [ ! -f "data/twitter_feels.db" ]; then
        log_info "Initializing SQLite database..."
        mkdir -p data
        $PKG_MANAGER run db:init 2>/dev/null || log_warn "Database initialization script not found (will be created on first run)"
    fi

    cd "$SCRIPT_DIR"
    log_success "Backend setup complete"
}

setup_crawler() {
    log_info "Setting up Rust crawler..."

    if [ ! -d "crawler" ]; then
        log_error "Crawler directory not found. Please run project setup first."
        return 1
    fi

    if ! command -v cargo &> /dev/null; then
        log_warn "Rust not installed, skipping crawler setup"
        return 0
    fi

    cd crawler

    log_info "Building crawler in release mode..."
    cargo build --release 2>/dev/null || {
        log_warn "Crawler build failed. You may need to build it manually."
        cd "$SCRIPT_DIR"
        return 0
    }

    cd "$SCRIPT_DIR"
    log_success "Crawler setup complete"
}

create_env_files() {
    log_info "Setting up environment files..."

    # Backend .env
    if [ -d "backend" ] && [ ! -f "backend/.env" ]; then
        if [ -f "backend/.env.example" ]; then
            cp backend/.env.example backend/.env
            log_success "Created backend/.env from example"
        else
            cat > backend/.env << 'EOF'
# Twitter Feels Backend Configuration
NODE_ENV=development
PORT=3001
DATABASE_URL=./data/twitter_feels.db

# Session Configuration
SESSION_SECRET=change-this-to-a-secure-random-string
SESSION_TIMEOUT_HOURS=24

# Admin Configuration (change these!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=

# Twitter API (required for crawler)
TWITTER_BEARER_TOKEN=

# Hugging Face (optional)
HUGGINGFACE_TOKEN=

# S3 Backup (optional)
S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
EOF
            log_success "Created backend/.env with defaults"
            log_warn "Please update backend/.env with your credentials"
        fi
    fi

    # Frontend .env
    if [ -d "frontend" ] && [ ! -f "frontend/.env" ]; then
        if [ -f "frontend/.env.example" ]; then
            cp frontend/.env.example frontend/.env
            log_success "Created frontend/.env from example"
        else
            cat > frontend/.env << 'EOF'
# Twitter Feels Frontend Configuration
VITE_API_URL=http://localhost:3001
EOF
            log_success "Created frontend/.env with defaults"
        fi
    fi

    # Crawler .env
    if [ -d "crawler" ] && [ ! -f "crawler/.env" ]; then
        if [ -f "crawler/.env.example" ]; then
            cp crawler/.env.example crawler/.env
            log_success "Created crawler/.env from example"
        else
            cat > crawler/.env << 'EOF'
# Twitter Feels Crawler Configuration
DATABASE_URL=../backend/data/twitter_feels.db
TWITTER_BEARER_TOKEN=

# Crawl Settings
CRAWL_INTERVAL_HOURS=1
HISTORY_DEPTH_DAYS=90
RATE_LIMIT_PER_15MIN=450

# LLM Settings
DEFAULT_MODEL=meta-llama/Llama-3.2-3B-Instruct
HUGGINGFACE_TOKEN=
EOF
            log_success "Created crawler/.env with defaults"
            log_warn "Please update crawler/.env with your credentials"
        fi
    fi
}

generate_admin_password() {
    if command_exists openssl; then
        openssl rand -base64 48 | tr -d '\n'
        return 0
    fi

    if command_exists python3; then
        python3 - << 'PY'
import secrets
print(secrets.token_urlsafe(48))
PY
        return 0
    fi

    return 1
}

update_admin_password_hash() {
    local password="$1"
    local db_path="backend/data/twitter_feels.db"

    if [ ! -f "$db_path" ]; then
        log_warn "Admin database not found at $db_path. Skipping password update."
        return 0
    fi

    if ! command_exists sqlite3; then
        log_warn "sqlite3 not installed. Update admin password manually in $db_path."
        return 0
    fi

    sqlite3 "$db_path" "UPDATE admin_users SET password_hash = 'hashed_${password}' WHERE username = 'admin';" || \
        log_warn "Failed to update admin password hash in $db_path"
}

ensure_admin_password() {
    local password_file="backend/.admin_password"

    if [ ! -d "backend" ]; then
        return 0
    fi

    if [ -f "$password_file" ]; then
        log_info "Admin password already exists at $password_file"
        return 0
    fi

    local password
    password=$(generate_admin_password) || {
        log_error "Unable to generate admin password (requires openssl or python3)."
        return 1
    }

    umask 077
    printf "%s" "$password" > "$password_file"
    chmod 600 "$password_file" 2>/dev/null || true

    log_success "Generated admin password and stored in $password_file"
    log_info "Generated using openssl rand -base64 48 (or python3 secrets)."
    log_info "Admin username: admin"
    log_info "Admin password: $password"

    update_admin_password_hash "$password"
}

show_admin_password() {
    local password_file="backend/.admin_password"

    if [ ! -f "$password_file" ]; then
        log_warn "No stored admin password found. Run './init.sh admin-password' to generate one."
        return 0
    fi

    log_info "Admin password (stored in $password_file):"
    cat "$password_file"
    echo ""
}

revoke_admin_password() {
    local password_file="backend/.admin_password"

    if [ -f "$password_file" ]; then
        rm -f "$password_file"
        log_success "Removed stored admin password at $password_file"
    else
        log_warn "No stored admin password found to revoke."
    fi

    local revoke_token
    revoke_token=$(generate_admin_password) || revoke_token="revoked_$(date +%s)"

    if [ -f "backend/data/twitter_feels.db" ] && command_exists sqlite3; then
        sqlite3 "backend/data/twitter_feels.db" \
            "UPDATE admin_users SET password_hash = 'hashed_${revoke_token}' WHERE username = 'admin';" || \
            log_warn "Failed to revoke admin password in database."
        log_success "Admin password revoked in database."
    else
        log_warn "Could not revoke password in database (missing sqlite3 or DB)."
    fi

    log_info "Run './init.sh admin-password' to generate a new admin password."
}

rotate_admin_password() {
    revoke_admin_password
    ensure_admin_password
    show_admin_password
}

run_dev() {
    log_info "Starting development servers..."
    maybe_warn_docker_best_practice

    # Check if tmux is available for split terminal
    if command -v tmux &> /dev/null && [ -z "${TMUX:-}" ]; then
        log_info "Using tmux for multiple processes..."
        tmux new-session -d -s twitter-feels
        tmux send-keys -t twitter-feels "cd '$SCRIPT_DIR/backend' && $PKG_MANAGER run dev" C-m
        tmux split-window -h -t twitter-feels
        tmux send-keys -t twitter-feels "cd '$SCRIPT_DIR/frontend' && $PKG_MANAGER run dev" C-m
        tmux attach-session -t twitter-feels
    else
        # Fallback: run backend in background
        log_info "Starting backend server..."
        cd backend
        $PKG_MANAGER run dev &
        BACKEND_PID=$!
        cd "$SCRIPT_DIR"

        log_info "Starting frontend server..."
        cd frontend
        $PKG_MANAGER run dev

        # Cleanup on exit
        kill $BACKEND_PID 2>/dev/null || true
    fi
}

print_help() {
    echo "Twitter Feels - Development Environment Setup"
    echo ""
    echo "Usage: ./init.sh [command]"
    echo ""
    echo "Commands:"
    echo "  setup     Install dependencies and initialize environment"
    echo "  dev       Start development servers (frontend + backend)"
    echo "  build     Build all components for production"
    echo "  docker    Build and run with Docker Compose"
    echo "  admin-password        Show or generate the admin password"
    echo "  revoke-admin-password Revoke the current admin password"
    echo "  rotate-admin-password Revoke and generate a new admin password"
    echo "  help      Show this help message"
    echo ""
    echo "If no command is provided, 'setup' followed by 'dev' will run."
    echo ""
    echo "Access points after starting:"
    echo "  Frontend:  http://localhost:5173"
    echo "  Backend:   http://localhost:3001"
    echo "  Admin:     http://localhost:5173/admin"
}

build_production() {
    log_info "Building for production..."

    # Build frontend
    cd frontend
    $PKG_MANAGER run build
    cd "$SCRIPT_DIR"

    # Build backend (if TypeScript)
    cd backend
    if [ -f "tsconfig.json" ]; then
        $PKG_MANAGER run build
    fi
    cd "$SCRIPT_DIR"

    # Build crawler
    if command -v cargo &> /dev/null && [ -d "crawler" ]; then
        cd crawler
        cargo build --release
        cd "$SCRIPT_DIR"
    fi

    log_success "Production build complete!"
}

run_docker() {
    log_info "Starting with Docker Compose..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    if [ ! -f "docker-compose.yml" ]; then
        log_error "docker-compose.yml not found"
        exit 1
    fi

    docker compose up --build
}

main() {
    local command="${1:-}"

    case "$command" in
        setup)
            check_prerequisites
            create_env_files
            setup_frontend
            setup_backend
            ensure_admin_password
            setup_crawler
            maybe_warn_docker_best_practice
            log_success "Setup complete! Run './init.sh dev' to start development servers."
            ;;
        dev)
            maybe_warn_docker_best_practice
            run_dev
            ;;
        build)
            check_prerequisites
            build_production
            ;;
        docker)
            run_docker
            ;;
        help|--help|-h)
            print_help
            ;;
        "")
            # Default: setup then dev
            check_prerequisites
            create_env_files
            setup_frontend
            setup_backend
            ensure_admin_password
            setup_crawler
            echo ""
            log_success "Setup complete!"
            echo ""
            maybe_warn_docker_best_practice
            run_dev
            ;;
        admin-password)
            ensure_admin_password
            show_admin_password
            ;;
        revoke-admin-password)
            revoke_admin_password
            ;;
        rotate-admin-password)
            rotate_admin_password
            ;;
        *)
            log_error "Unknown command: $command"
            print_help
            exit 1
            ;;
    esac
}

main "$@"

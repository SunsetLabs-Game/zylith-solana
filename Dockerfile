# =============================================================================
# Sunset ASP — Fly.io Dockerfile
# Multi-stage build: Rust compilation → Python 3.10 runtime with Node.js
# Build context: repo root (needed because the worker imports preserved legacy helpers)
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build the Rust binary
# ---------------------------------------------------------------------------
FROM rust:1.93-bookworm AS builder

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /build/asp

# Copy everything and build
COPY asp/Cargo.toml asp/Cargo.lock ./
COPY asp/src ./src

RUN cargo build --release

# ---------------------------------------------------------------------------
# Stage 2: Runtime (Python 3.10 base — required by garaga)
# ---------------------------------------------------------------------------
FROM python:3.10-slim-bookworm AS runtime

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    unzip \
    libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 LTS (needed by worker for snarkjs/circomlibjs)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Bun (used for package management)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Install garaga CLI
RUN pip install --no-cache-dir garaga

WORKDIR /app

# Copy the Rust binary
COPY --from=builder /build/asp/target/release/zylith-asp /usr/local/bin/zylith-asp

# Copy the worker and its dependencies
COPY asp/worker ./asp/worker
RUN cd asp/worker && bun install --frozen-lockfile

# Copy circuits dependencies and libraries needed by the worker
COPY circuits/package.json circuits/bun.loc[k] ./circuits/
RUN cd circuits && bun install --frozen-lockfile

COPY circuits/scripts ./circuits/scripts
COPY circuits/buil[d] ./circuits/build

# Create data directory for SQLite persistent volume
RUN mkdir -p /data

EXPOSE 8080

CMD ["zylith-asp"]

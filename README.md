<div align="center">

# AgentRail-protocol

**The non-custodial spending-control layer for AI agents on Stellar.**

[![CI](https://github.com/AgentRail-Labs/AgentRail-protocol/actions/workflows/ci.yml/badge.svg)](https://github.com/AgentRail-Labs/AgentRail-protocol/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

## Project Overview

AgentRail-protocol lets you safely put an AI agent in charge of funds. It provides a non-custodial vault with private spending rules, ensuring that agents can autonomously spend and disburse funds within strict, on-chain enforced limits.

This project solves the problem of securely delegating financial agency to AI without giving up custody or privacy. It is built on the **Stellar** network using **Soroban smart contracts** to handle treasury management and cryptographic policy verification. The off-chain infrastructure consists of a **Node.js/TypeScript** backend with **NestJS**, robust job queues powered by **Redis** and **BullMQ**, and a relational database managed by **PostgreSQL** and **Prisma**. The user-facing applications are built with **React**, **Vite**, and **Tailwind CSS**.

## Table of Contents

- [Key Features](#key-features)
- [Built With / Technology Stack](#built-with--technology-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [Testing](#testing)
- [API](#api)
- [Smart Contracts](#smart-contracts)
- [Database / Data Storage](#database--data-storage)
- [Background Services / Workers](#background-services--workers)
- [Deployment](#deployment)
- [CI/CD](#cicd)
- [Contributing](#contributing)
- [License](#license)

## Key Features

- **Non-Custodial Vaults:** Deposit funds into Soroban contracts where the platform never holds custody.
- **On-Chain Policy Verification:** Hard limits (allowlists, caps, budgets) enforced on-chain before any funds move.
- **Agent Integration:** SDK and MCP (Model Context Protocol) server for seamless integration with AI agents.
- **Event Indexing:** Dedicated service to reliably ingest and index Stellar network events.
- **Service Directory:** On-chain registry for services to list pricing and capabilities.

## Built With / Technology Stack

### Blockchain & Smart Contracts
- **Stellar Network**
- **Soroban (Rust)** for smart contracts

### Backend & Async Processing
- **TypeScript / Node.js**
- **NestJS** for the primary REST API
- **BullMQ & Redis** for background job queues (execution, proofs, settlement)
- **Socket.IO** for real-time frontend updates

### Database & Storage
- **PostgreSQL** as the primary relational database
- **Prisma ORM** for schema management and typed queries

### Frontend
- **React 19**
- **Vite**
- **Tailwind CSS**
- **Zustand** for state management
- **TanStack Query** for data fetching

## Architecture

The system operates across three main layers:

1. **Smart Contracts (On-Chain):** The `agent-vault` holds funds non-custodially, while `policy-verifier` enforces spending bounds cryptographically.
2. **Backend API & Workers:** The NestJS API serves client requests and orchestrates tasks. The indexer reads from the Stellar ledger, and BullMQ workers execute off-chain task steps and submit settlements back to the chain.
3. **Client Applications:** The React web frontend and the MCP server allow users and AI agents to interact with the protocol, fund vaults, and trigger payments.

## Project Structure

```text
agentrail-protocol/
├── apps/
│   └── web/                   # React 19 + Vite frontend application
├── circuits/                  # Zero-knowledge proof circuits
├── contracts/
│   ├── agent-vault/           # Soroban contract: non-custodial treasury
│   ├── policy-verifier/       # Soroban contract: spending limits
│   └── registry/              # Soroban contract: service registration
├── packages/
│   ├── agent-sdk/             # Agent tools and integrations
│   ├── common/                # Shared types and utilities
│   ├── dashboard/             # Lightweight frontend dashboard
│   ├── db/                    # Prisma schema, migrations, and generated client
│   └── mcp/                   # Model Context Protocol server
└── services/
    ├── api/                   # NestJS backend API
    ├── indexer/               # Stellar event ingestion worker
    ├── reference-provider/    # Reference service implementation
    └── workers/               # BullMQ background workers
```

## Prerequisites

- **Node.js** 20+ (see `.nvmrc`)
- **Docker** and **Docker Compose** (for running PostgreSQL and Redis locally)
- **Rust** (with `wasm32-unknown-unknown` target for compiling Soroban contracts)

## Installation

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/AgentRail-Labs/AgentRail-protocol.git
   cd AgentRail-protocol
   npm install
   ```

2. Set up the environment variables:
   ```bash
   cp .env.example .env
   ```

3. Start the local database and cache:
   ```bash
   npm run db:up
   ```

4. Generate the Prisma client and push the schema:
   ```bash
   npm run db:generate
   npm run db:push
   ```

## Environment Variables

The project uses a `.env` file at the root. Important verified variables include:

- `DATABASE_URL`: Connection string for PostgreSQL.
- `REDIS_URL`: Connection string for Redis.
- `ANTHROPIC_API_KEY`: API key for Anthropic LLMs (used by orchestrators).
- `STELLAR_NETWORK`: Target Stellar network (e.g., `stellar:testnet`).
- `STELLAR_RPC_URL`: Soroban RPC endpoint.
- `API_PORT`: Port for the NestJS API (default: 4100).
- `JWT_SECRET`: Secret used for signing authentication tokens.

## Running the Project

The monorepo uses npm workspaces. You can run individual services in separate terminals:

**Start the API:**
```bash
npm run dev -w @agentrail-protocol/api
```

**Start the Workers:**
```bash
npm run dev -w @agentrail-protocol/workers
```

**Start the Indexer:**
```bash
npm run dev -w @agentrail-protocol/indexer
```

**Start the Web Frontend:**
```bash
npm run dev -w @agentrail-protocol/web
```

## Testing

The project uses `vitest` for TypeScript packages and `cargo test` for Rust smart contracts.

To run the TypeScript test suite across the monorepo:
```bash
npm test
```

To run contract tests (e.g., for `agent-vault`):
```bash
cd contracts/agent-vault
cargo test
```

## API

The backend REST API is built with NestJS. The API handles:
- **Authentication:** Wallet-based SEP-10 style authentication issuing JWTs.
- **Policies & Vaults:** Managing spending limits and querying vault balances.
- **Tasks:** Submitting and tracking agent tasks and multi-step workflows.
- **Admin:** System monitoring, user roles, and protocol configuration.

## Smart Contracts

The Soroban (Rust) smart contracts live in the `contracts/` directory:

- **CleverVault (`agent-vault`):** Manages non-custodial deposits, per-task budget locking, and proof-gated releases.
- **PolicyVerifier (`policy-verifier`):** Validates that spending bounds conform to the committed policy.
- **Registry (`registry`):** On-chain directory for service providers.

Contracts can be formatted and linted using standard cargo tooling:
```bash
cargo fmt --check
cargo clippy --all-targets -- -D warnings
```

## Database / Data Storage

The project uses **PostgreSQL** via **Prisma**. Key schemas include:

- **Users, Wallets, & Sessions:** Identity management and authentication.
- **Tasks & TaskSteps:** State machines for executing agent workloads.
- **Payments & Settlements:** Ledger of transactions and reconciliation statuses.
- **Policies & Proofs:** Private spending rules.
- **Services:** Marketplace registry mirrored from the blockchain.
- **ChainEvents & IndexerState:** Event ingestion cursors.

## Background Services / Workers

- **Workers (`services/workers`):** A BullMQ-powered service responsible for async execution, zero-knowledge proof generation, and triggering exactly-once on-chain settlements.
- **Indexer (`services/indexer`):** Continuously polls the Soroban RPC for relevant smart contract events and updates the PostgreSQL database.

## Deployment

The repository includes a `docker-compose.yml` to spin up local infrastructure (Postgres and Redis). Production builds can be created using the provided scripts:

```bash
npm run build
```

Database migrations should be managed via Prisma during deployments.

## CI/CD

Continuous Integration is managed via GitHub Actions (`.github/workflows/ci.yml`). On pushes and pull requests to `main`, the CI pipeline verifies:
- TypeScript type checking (`npm run typecheck`)
- ESLint (`npm run lint`)
- Prettier formatting (`npm run format:check`)
- Vite and TypeScript builds (`npm run build`)
- Vitest test suites (`npm test`)
- Rust contract formatting, Clippy analysis, and tests for Soroban contracts.

## Contributing

Contributions require passing all checks. Please ensure the following scripts pass locally before submitting a Pull Request:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
```

For smart contract modifications, ensure `cargo fmt --check`, `cargo clippy`, and `cargo test` pass in the respective contract directory.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

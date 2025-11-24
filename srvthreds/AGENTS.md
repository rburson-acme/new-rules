# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Core Architecture & Concepts

- **Event-Driven Workflows**: The system is built on "Threds"—stateful workflow instances that process events through a state machine defined by "Patterns".
- **`run-profiles` are Essential**: The `run-profiles/` directory contains different configurations for `dev`, `test`, etc. You MUST use the `bootstrap` script to set up the correct environment before running or testing.
- **Microservices via Agents**: The system is composed of a core `Engine` and multiple `Agents` (microservices) that communicate via message queues (Rascal/RabbitMQ). In development, they can run as a single process.
- **Global `ConfigManager`**: All configurations (`engine`, `rascal`, `sessions`, etc.) are loaded and accessed through the singleton `ConfigManager` class found in `src/ts/config/ConfigManager.ts`.

## Essential Commands

- **Bootstrap Environment**: `npm run bootstrap -- -p <profile_name>` (e.g., `test`, `dev`). This is CRITICAL before starting servers. It sets up databases and loads configuration based on the specified profile in `run-profiles/`.
- **Run Full Dev Server**: `npm run start-dev`. This runs the full system with hot-reloading.
- **Run Tests Sequentially**: `npm test`. This runs all Vitest integration tests. **CRITICAL**: Tests are stateful and MUST run sequentially (`--no-file-parallelism` is set in the script). Do not run tests in parallel.

## Development Patterns

- **Logger Injection**: The application's logger is globally injected via side effects in `src/ts/init.ts`. Do not try to initialize it elsewhere.
- **Test with Connection Managers**: All integration tests MUST use the sophisticated connection managers in `src/test/testUtils.ts` (e.g., `EngineConnectionManager`, `ServerConnectionManager`). These handle the complex setup and teardown of the engine, agents, and message queues.
- **Stateful Testing**: Tests are not isolated. They are written as a sequence, where state from one test (e.g., a created `thredId`) is passed to the next. Use the async helpers in `testUtils.ts` to manage async flows.
- **"Participants" not "Users"**: Refer to end-users of the system as "participants" as a standard convention.
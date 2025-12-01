# AGENTS.md

This file provides guidance for coding agents

## Essential Commands

### Development
```bash
npm run start-dev          # Hot-reload development server with tsx (runs all agents/services in one process)
npm run start-dev-debug    # Development server with debugging on port 9229
npm run start-engine-dev   # Hot-reload engine only (no agents)
npm run check              # TypeScript type checking without compilation
npm run format             # Format code with Prettier
npm run check-all          # build, format, and test files prior to commiting
```

### Building
```bash
npm run build              # Full production build (clean → transpile → copy assets)
npm run build-lib          # Build the thredlib dependency (in ../thredlib)
npm run clean              # Remove dist-server directory (for production config)
npm run transpile          # Compile TypeScript to JavaScript (for production config)
```

### Testing
```bash
npm test                   # Run all tests with Vitest (no parallelism, bail on first failure)
npm run test-changed       # Run only tests for changed files
npm run bootstrap          # Set up test data and configurations
```

### Agents (Microservices)
```bash
npm run start-session-agent          # Start session agent independently
npm run start-persistence-agent      # Start persistence agent independently
npm run start-robot-agent            # Start robot agent independently
npm run start-session-agent-dev      # Start session agent in dev mode with tsx
npm run start-persistence-agent-dev  # Start persistence agent in dev mode with tsx
```

- **Bootstrap Environment**: `npm run bootstrap -- -p <profile_name>` (e.g., `test`, `dev`). This is CRITICAL before starting servers. It sets up databases and loads configuration based on the specified profile in `run-profiles/`.
- **Run Full Dev Server**: `npm run start-dev`. This runs the full system with hot-reloading.
- **Run Tests Sequentially**: `npm test`. This runs all Vitest integration tests. **CRITICAL**: Tests are stateful and MUST run sequentially (`--no-file-parallelism` is set in the script). Do not run tests in parallel.


## Architecture Overview

### Core Concepts

**SrvThreds** is an event-driven workflow automation system built around the concept of "Threds" - stateful workflow instances that process events through pattern-defined state machines.

**Event Flow**: Events → Engine → Pattern Matching → Thred Creation/Update → State Transitions → Message Generation → Participant Notification

**Event-Driven Workflows**: The system is built on "Threds"—stateful workflow instances that process events through a state machine defined by "Patterns".
**`run-profiles` are Essential**: The `run-profiles/` directory contains different configurations for `dev`, `test`, etc. You MUST use the `bootstrap` script to set up the correct environment before running or testing.
**Microservices via Agents**: The system is composed of a core `Engine` and multiple `Agents` (microservices) that communicate via message queues (Rascal/RabbitMQ). In development, they can run as a single process.
**Global `ConfigManager`**: All configurations (`engine`, `rascal`, `sessions`, etc.) are loaded and accessed through the singleton `ConfigManager` class found in `src/ts/config/ConfigManager.ts`.


### Key Architectural Components

#### 1. Engine (src/ts/engine/)
- **Engine.ts**: Main event processing loop, pulls from inbound queue
- **Threds.ts**: Orchestrates multiple Thred instances, handles per-thredId locking
- **Pattern.ts**: Workflow templates that define reaction sequences
- **Thred.ts**: Individual state machine instances created from patterns
- **ThredMonitor.ts**: Timer-based monitoring for automatic state transitions
- **Reaction.ts**: Individual workflow states with conditions and transitions
- **Server.ts**: Entry point that binds Engine to message queues

#### 2. ThredLib (../thredlib/)
External dependency - shared framework library providing:
- **core/**: Event system, message handling, system events (Event, Events, EventBuilder)
- **model/**: Data models for patterns, reactions, interactions, permissions
- **persistence/**: Data persistence interfaces and records
- **expression/**: JSONata-based expression evaluation system
- **io/**: EventManager for pub/sub, SocketIO connections
- **machine/**: Generic state machine framework
- **lib/**: Utilities (Logger, Timers, Parallel, Series)

Note: Changes to thredlib require running `npm run build-lib` before they take effect in srvthreds.

#### 3. Agent System (src/ts/agent/)
Microservices architecture:
- **AgentService.ts**: Agent service manager that orchestrates agents
- **agent.ts**: Standalone agent entry point for production deployment
- **SessionAgent** (src/ts/agent/session/): Manages user sessions and participant interactions
- **PersistenceAgent** (src/ts/agent/persistence/): Handles data persistence operations
- **RobotAgent** (src/ts/agent/robot/): External agent for automated interactions
- Agents communicate via message queues (RabbitMQ/Rascal)

#### 4. Configuration System
- **Patterns** (run-profiles/*/patterns/ or src/test/config/patterns/): Workflow definitions in JSON
- **Sessions** (run-profiles/*/sessions/): Participant group definitions
- **Agent configs** (deploy-containers/local/configs/agents/): Service definitions and routing
- **Runtime configs** (run-profiles/[dev|test|ef-detection]/): Environment-specific settings
- **Rascal config**: Message queue routing topology (rascal_config.json)
- **Resolver config**: Address resolution for participants (resolver_config.json)

#### 5. Storage & Queue Systems
- **storage/** (src/ts/storage/): Storage abstraction layer (StorageFactory, LocalStorage)
- **queue/** (src/ts/queue/): Queue abstraction (EventQ, MessageQ, RemoteQService)
- **pubsub/** (src/ts/pubsub/): Pub/sub implementation (Redis-based)
- **persistence/** (src/ts/persistence/): MongoDB persistence layer (controllers, transactions)

### Data Flow Architecture

1. **Event Ingestion**: Events enter through HTTP/WebSocket endpoints or message queues
2. **Engine Processing**: Engine pulls events and routes to Threds orchestrator
3. **Pattern Matching**: Unbound events (no thredId) matched against patterns to create new Threds
4. **State Processing**: Threds process events through reaction state machines
5. **Locking**: Per-thredId locks ensure only one event processes for a thredId at a time
6. **Message Generation**: Successful reactions generate messages for participants
7. **Persistence**: All events, state changes, and messages are persisted
8. **Notification**: Participants receive messages via configured channels

### Storage Architecture

- **MongoDB**: Primary persistence for patterns, threds, events, users (via SystemController)
- **Redis**: Caching, distributed locking (Redlock), session storage, pub/sub
- **Message Queues**: RabbitMQ via Rascal for inter-service communication
- **Storage Abstraction**: Pluggable storage backends via StorageFactory

### Testing Architecture

- **Philosophy**: Tests are stateful, integration tests and must be run sequentially (no parallelism)
- **Connection Managers**: Sophisticated test utilities for different component testing
- **Test Utils** (src/test/testUtils.ts): Event builders, async utilities, cleanup helpers
- **Pattern-based Testing**: Tests use real workflow patterns to validate end-to-end scenarios
- **Config**: Test configurations in src/test/config/
- **Vitest Config**: Sequential execution enforced in vitest.config.ts

## Development Patterns

### Adding New Patterns
1. Create pattern JSON in run-profiles or test config directories
2. JSON Patterns must adhere to the JSON schema at ../thredlib/src/schemas/patternModel.json
3. Add pattern-specific tests in src/test/patterns/
4. Pattern structure: name, reactions (array of state definitions with conditions, transitions, transforms, publishes)

### Creating New Agents
1. Extend base Agent implementation (see SessionAgent or PersistenceAgent)
2. Implement required adapters (e.g., PersistenceAdapter)
3. Add agent configuration JSON in deploy-containers/local/configs/agents/
4. Update resolver configuration to include new agent addresses
5. Add npm script for starting the agent

### Working with Events
- Use `EventBuilder` from thredlib for creating well-formed events
- Use `Events` from thredlib for accessing values contained in events
- All events must have `id`, `type`, `source.id`, and proper timestamps
- Events with `thredId` go to existing Threds; without `thredId` trigger pattern matching
- Event types use dot notation (e.g., 'inbound.event0', 'system.admin.create_pattern')

### State Management
- Threds maintain state through current reaction (reactionIdx in ThredStore)
- State transitions happen via Transition objects in reaction definitions
- Transitions can be: named (go to specific reaction), 'next' (sequential), 'terminate', or 'no-transition'
- ThredContext maintains runtime state and variables accessible via JSONata expressions

### Working with ThredLib
- ThredLib is a sibling directory (../thredlib) and must be built separately
- After making changes to thredlib: `npm run build-lib` or `cd ../thredlib && npm run build-all`
- ThredLib exports are imported from '../thredlib/index.js'
- Schema generation: `npm run generate-schemas` (runs in thredlib directory)

## Key Files to Understand

- [src/ts/index.ts](src/ts/index.ts): Main service entry point (EngineServiceManager)
- [src/ts/dev-server.ts](src/ts/dev-server.ts): Development server that runs all agents in one process
- [src/ts/engine/Engine.ts](src/ts/engine/Engine.ts): Core event processing logic
- [src/ts/engine/Threds.ts](src/ts/engine/Threds.ts): Multi-thred orchestration and per-thredId locking
- [src/ts/engine/Thred.ts](src/ts/engine/Thred.ts): State machine that applies transitions
- [src/ts/engine/Pattern.ts](src/ts/engine/Pattern.ts): Pattern definition and reaction sequencing
- [src/ts/engine/Reaction.ts](src/ts/engine/Reaction.ts): Individual state with condition/transition/transform/publish
- [src/ts/agent/agent.ts](src/ts/agent/agent.ts): Standalone agent entry point
- [src/test/testUtils.ts](src/test/testUtils.ts): Essential testing utilities and connection managers

## Configuration Notes

- **Development**: dev-server.ts runs all agents in one process for easier development
- **Production**: Agents run as separate services started via agent.ts with different config-name/node-id
- **Message Queue**: rascal_config.json defines routing topology (publications, subscriptions, bindings)
- **Patterns**: Support declarative JSON format adhering to PatternModel schema
- **Sessions**: Define participant groups and address resolution in sessions_model.json
- **Run Profiles**: Different environments (dev, test, ef-detection) have separate config directories

## Development Best Practices

- Always check for possible code optimizations
- Always write the most concise code possible
- When making changes affecting thredlib, rebuild it before testing
- Tests must pass sequentially - never run with parallelism
- Use Logger from thredlib for all logging (Logger.info, Logger.debug, Logger.error)
- 
- **Test with Connection Managers**: All integration tests MUST use the sophisticated connection managers in `src/test/testUtils.ts` (e.g., `EngineConnectionManager`, `ServerConnectionManager`). These handle the complex setup and teardown of the engine, agents, and message queues.
- **Stateful Testing**: Tests are not isolated. They are written as a sequence, where state from one test (e.g., a created `thredId`) is passed to the next. Use the async helpers in `testUtils.ts` to manage async flows.
- **"Participants" not "Users"**: Refer to end-users of the system as "participants" as a standard convention.

## System Terminology

- **Participants**: Users of this system (not "users")
- **Thred**: A stateful workflow instance (not "thread")
- **Reaction**: A state in a workflow state machine
- **Pattern**: A workflow template that defines reaction sequences
- **Bound Event**: Event with a thredId (goes to existing Thred)
- **Unbound Event**: Event without thredId (triggers pattern matching)

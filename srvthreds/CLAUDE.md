# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
```bash
npm run start-dev          # Hot-reload development server with tsx
npm run start-dev-debug    # Development server with debugging on port 9229
npm run check              # TypeScript type checking without compilation
npm run format             # Format code with Prettier
npm run check-all          # build, format, and test files prior to commiting
```

### Building
```bash
npm run build              # Full production build (clean → transpile → copy assets)
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
npm run start-session-agent     # Start session agent independently
npm run start-persistence-agent # Start persistence agent independently
```

## Architecture Overview

### Core Concepts

**SrvThreds** is an event-driven workflow automation system built around the concept of "Threds" - stateful workflow instances that process events through pattern-defined state machines.

**Event Flow**: Events → Engine → Pattern Matching → Thred Creation/Update → State Transitions → Message Generation → Participant Notification

### Key Architectural Components

#### 1. Engine (src/ts/engine/)
- **Engine.ts**: Main event processing loop, pulls from inbound queue
- **Threds.ts**: Orchestrates multiple Thred instances, handles per-thredId locking
- **Pattern.ts**: Workflow templates that define reaction sequences
- **Thred.ts**: Individual state machine instances created from patterns
- **ThredMonitor.ts**: Timer-based monitoring for automatic state transitions
- **Reaction.ts**: Individual workflow states with conditions and transitions

#### 2. ThredLib (src/ts/thredlib/)
Shared framework library providing:
- **core/**: Event system, message handling, system events
- **model/**: Data models for patterns, reactions, interactions, permissions
- **persistence/**: Data persistence interfaces and records
- **expression/**: JSONata-based expression evaluation system
- **io/**: EventManager for pub/sub, SocketIO connections
- **machine/**: Generic state machine framework

#### 3. Agent System (src/ts/agent/)
Microservices architecture:
- **Agent.ts**: Base agent framework with configurable adapters
- **SessionAgent**: Manages user sessions and participant interactions
- **PersistenceAgent**: Handles data persistence operations
- Agents communicate via message queues (RabbitMQ/Rascal)

#### 4. Configuration System
- **Patterns** (src/ts/config/patterns/): Workflow definitions in JSON/TypeScript
- **Sessions** (src/ts/config/sessions/): Participant group definitions
- **Agent configs**: Service definitions and routing configurations
- **Runtime configs** (run-config/): Environment-specific settings

### Data Flow Architecture

1. **Event Ingestion**: Events enter through HTTP/WebSocket endpoints or message queues
2. **Engine Processing**: Engine pulls events and routes to Threds orchestrator
3. **Pattern Matching**: Unbound events matched against patterns to create new Threds
4. **State Processing**: Threds process events through reaction state machines
5. **Message Generation**: Successful reactions generate messages for participants
6. **Persistence**: All events, state changes, and messages are persisted
7. **Notification**: Participants receive messages via configured channels

### Storage Architecture

- **MongoDB**: Primary persistence for patterns, threds, events, users
- **Redis**: Caching, distributed locking (Redlock), session storage
- **Message Queues**: RabbitMQ via Rascal for inter-service communication
- **Storage Abstraction**: Pluggable storage backends via StorageFactory

### Testing Architecture

- **Testing Approach and Philosphy** Tests are stateful, integration tests and must be run sequentially
- **Connection Managers**: Sophisticated test utilities for different component testing
- **Test Utils** (src/test/testUtils.ts): Event builders, async utilities, cleanup helpers
- **Pattern-based Testing**: Tests use real workflow patterns to validate end-to-end scenarios
- **Mock Data**: Structured event and pattern fixtures in src/test/mocks/

## Development Patterns

### Adding New Patterns
1. Create pattern JSON in `src/ts/config/patterns/`
2. JSON Patterns should adhere to the JSON schema at `src/ts/thredlib/schmeas/patternModel.json`
3. Add pattern-specific tests in `src/test/patterns/`

### Creating New Agents
1. Extend base `Agent` class in `src/ts/agent/`
2. Implement required adapters (PersistenceAdapter, etc.)
3. Add agent configuration JSON in `src/ts/config/`
4. Update resolver configuration to include new agent addresses

### Working with Events
- Use `EventBuilder` from thredlib for creating well-formed events
- Use `Events` from thredlib for accessing values contained in events
- All events must have `id`, `type`, `source`, and proper timestamps
- Events with `thredId` go to existing Threds; without `thredId` trigger pattern matching

### State Management
- Threds maintain state through `reactions` array and `reactionIdx`
- State transitions happen via `Transition` objects in reaction definitions

## Key Files to Understand

- `src/index.ts`: Main service entry point, demonstrates full system setup
- `src/ts/engine/Engine.ts`: Core event processing logic
- `src/ts/engine/Threds.ts`: Multi-thred orchestration and locking
- `src/ts/thredlib/core/Event.ts`: Event data structure definitions
- `src/test/testUtils.ts`: Essential testing utilities and patterns

## Configuration Notes

- Main service runs all agents in one process for development/testing
- Production deployment separates agents into independent services
- Message queue configuration in `rascal_config.json` defines routing topology
- Pattern configurations support both declarative JSON and programmatic TypeScript definitions (for testing only)

## Development Best Practices

- Always check for possible code optimizations
- Always write the most concise code possible

## System Terminology

- Users of this system should be referred to as 'participants'

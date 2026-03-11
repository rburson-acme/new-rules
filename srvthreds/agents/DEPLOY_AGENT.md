# DEPLOY_AGENT.md

Instructions for deploying and running srvthreds services. Follow the steps for the required scenario exactly.

---

## CRITICAL Rules

- **Always run bootstrap before starting any service or running tests.** The server will fail to start if configs are not in MongoDB.
- **Never run tests in parallel.** Use only `npm test`. Tests are stateful and will fail out of order.
- **Rebuild thredlib before testing if it was changed:** `npm run build-lib`

---

## Scenario 1: First-Time Setup

```bash
# 1. Start infrastructure
cd srvthreds/
docker-compose up -d

# 2. Wait for MongoDB replica set to initialize (first run only)
sleep 10

# 3. Install dependencies
npm install

# 4. Bootstrap the target profile (dev or test)
npm run bootstrap -- -p dev
```

---

## Scenario 2: Development (All Services in One Process)

```bash
npm run bootstrap -- -p dev
npm run start-dev
```

- Starts Engine + Session Agent + Persistence Agent + Robot Agent in one process
- Listens on port 3001 (Engine/web) and port 3000 (Session Agent HTTP/WebSocket)
- Hot-reloads on file changes

**Debug mode (port 9229):**
```bash
npm run start-dev-debug
```

**Engine only (no agents):**
```bash
npm run start-engine-dev
```

---

## Scenario 3: Production (Separate Processes)

CRITICAL: Production scripts (`npm run start`, `start-session-agent`, `start-persistence-agent`, `start-robot-agent`) require a compiled build in `dist-server/`. Run `npm run build` first if `dist-server/` does not exist. If no build is available, use the `-dev` variants from Scenario 2 instead.

Run each command in a separate terminal or process. All require bootstrap to have been run first.

```bash
npm run build                      # Required if dist-server/ does not exist
npm run start                      # Engine (port 3001)
npm run start-session-agent        # Session Agent (port 3000)
npm run start-persistence-agent    # Persistence Agent
npm run start-robot-agent          # Robot Agent (remote, JWT-authenticated)
# Optional:
npm run start-pattern-agent-dev    # Pattern Agent (requires AI_PROVIDER_API_KEY)
```

**Individual agent dev mode (hot-reload):**
```bash
npm run start-session-agent-dev
npm run start-persistence-agent-dev
npm run start-pattern-agent-dev
```

---

## Scenario 4: Running Tests

```bash
npm run bootstrap -- -p test
npm test                           # All tests, sequential, bail on first failure
npm run test-changed               # Only tests for changed files
```

---

## Scenario 5: Production Build

```bash
npm run build-lib                  # Build thredlib (if changed)
npm run build                      # Clean → transpile → copy assets → dist-server/
npm run check                      # Type-check only, no output
npm run check-all                  # Format + check + test (run before committing)
```

---

## Scenario 6: Local Docker Deployment (mirrors production)

```bash
npm run deploy-local-databases      # Start DB containers
npm run deploy-local-services       # Start service containers
npm run deploy-local-up-all         # Start everything

npm run deploy-local-down-services  # Stop services
npm run deploy-local-down-databases # Stop databases
```

---

## Bootstrap Details

Bootstrap reads all files in `run-profiles/<profile>/run-config/` and upserts them into MongoDB, then loads patterns from `run-profiles/<profile>/patterns/`.

Available profiles: `dev`, `test`, `ef-detection`

Re-run bootstrap whenever config files or patterns change:
```bash
npm run bootstrap -- -p <profile>
```

---

## Environment Variables

File: `srvthreds/.env` (loaded automatically via `dotenv/config`)

| Variable | Required By | Notes |
|---|---|---|
| `JWT_SECRET` | Session Agent, all Remote Agents | Random hex string |
| `JWT_EXPIRE_TIME` | Session Agent | e.g. `1h` |
| `REFRESH_TOKEN_SECRET` | Session Agent | Random hex string |
| `REFRESH_TOKEN_EXPIRE_TIME` | Session Agent | e.g. `7d` |
| `AUTH_TOKEN` | Remote Agents (prod) | JWT this agent uses to connect to Session Service |
| `AUTHORIZED_TOKENS` | Remote Agents (prod) | Comma-separated allowed tokens |
| `ROBOT_AGENT_AUTH_TOKEN` | Robot Agent (dev) | JWT for robot agent |
| `ROBOT_AGENT_AUTHORIZED_TOKENS` | Robot Agent (dev) | Leave blank in dev |
| `AI_PROVIDER_API_KEY` | Pattern Agent | Anthropic API key (`sk-ant-api03-...`) |
| `RABBITMQ_HOST` | All services | Defaults to `localhost` |
| `MONGO_HOST` | Persistence Agent | Defaults to `localhost` |
| `LOG_LEVEL` | All services | `debug` in dev, `info` in prod |

CRITICAL: Never commit real tokens or API keys.

---

## Config File Locations

All config files are in `run-profiles/<profile>/run-config/`. Key files:

| File | Purpose |
|---|---|
| `rascal_config.json` | RabbitMQ topology (exchanges, queues, bindings, subscriptions) |
| `resolver_config.json` | Agent address/nodeId/configName mapping |
| `sessions_model.json` | Participant group definitions |
| `engine.json` | Engine configuration |
| `session_agent.json` | Session Agent config (port 3000, subscriptions) |
| `persistence_agent.json` | Persistence Agent config (MongoDB host, dbname `nr`) |
| `robot_agent.json` | Robot Agent config (remote, JWT auth tokens from env) |
| `pattern_agent.json` | Pattern Agent config (AI provider, model, schema paths) |

---

## Port Reference

| Port | Service |
|---|---|
| 3000 | Session Agent (HTTP/WebSocket) |
| 3001 | Engine / Dev Server |
| 5672 | RabbitMQ AMQP |
| 6379 | Redis |
| 9229 | Node.js debugger (debug mode only) |
| 15672 | RabbitMQ Management UI (`guest/guest`) |
| 27017 | MongoDB |

---

## Troubleshooting

**Server fails to start / config not found**
→ Run `npm run bootstrap -- -p <profile>` first.

**RabbitMQ connection refused**
→ Run `docker-compose up -d`. Check `RABBITMQ_HOST` in `.env`.

**MongoDB connection error**
→ MongoDB requires replica set mode. Handled by `docker-compose.yml`. Check `MONGO_HOST` in `.env`.

**Tests fail with state errors**
→ Never use parallel test runners. Run `npm run bootstrap -- -p test` to reset, then `npm test`.

**Pattern Agent not responding**
→ Set `AI_PROVIDER_API_KEY` in `.env`. In dev mode, the Pattern Agent is commented out in `src/ts/dev-server.ts` by default — uncomment the PatternAgent block to enable it.

**Robot Agent auth failures**
→ Set `ROBOT_AGENT_AUTH_TOKEN` in `.env`. Token must be a valid JWT with `participantId: "org.wt.robot"`.

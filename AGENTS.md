# Monorepo: new-rules

This is the root of the **new-rules** monorepo. It contains three projects that together form an event-driven workflow automation platform.
The core projects are srvthreds, thredlib, and the thredclient
Additionally devops and demo-env are supplmentary projects the handle deployment and demonstrate functionality

## Projects

### `thredlib/` — Shared Library
The core shared TypeScript library consumed by both the server and client. Contains:
- Core domain types, models, and interfaces (Events, Threds, Patterns, Conditions, Consequents)
- JSON schemas for validation
- Utility classes (Logger, Timer, etc.)

The `thredclient` project links to this library via `npm link`. When making changes here, rebuild with `npm run build` from the `thredlib/` directory (or `npm run build-lib` from `srvthreds/`).  The `srvthreds` project symlinks the library's src directory directly into the srvhthreds source tree, allowing all the source to be built together.  This approach was not possible with `thredclient` because of react-native's lack of support for esm

### `srvthreds/` — Server
The backend engine and microservices. An event-driven workflow automation system built around **Threds** — stateful workflow instances that process events through pattern-defined state machines.

- **Engine**: Matches incoming events to Patterns, creates/updates Thred instances, drives state transitions, and generates outbound messages.
- **Agents (Microservices)**: Session, Persistence, and Robot agents communicate via RabbitMQ (Rascal). In development they can run as a single process.
- **Patterns**: JSON-defined state machines in `run-profiles/` that drive Thred behavior.
- See [srvthreds/AGENTS.md](srvthreds/AGENTS.md) for full command reference and architecture details.

### `thredclient/` — Mobile Client
A React Native / Expo mobile application (Android + iOS) that connects to `srvthreds`.
- Uses `thredlib` for shared types.
- Integrates Android Health Connect for biometric data.
- Uses `expo-router` for navigation.

### `demo-env/` — Web Demo Client
A Next.js web application that demonstrates the platform. Connects to `srvthreds` and uses `thredlib` via `npm link`.

### `devops/` — DevOps Toolkit
Infrastructure and deployment tooling for Azure/Kubernetes.
- Terraform modules for Azure resources.
- Minikube-based local environment that mirrors AKS production deployments.
- Unified CLI for local and cloud deployments.
- GitHub Actions CI/CD workflows.

## Key Relationships

```
thredlib  ──(npm link)──►  srvthreds
thredlib  ──(npm link)──►  thredclient
thredlib  ──(npm link)──►  demo-env
devops    ──(deploys)───►  srvthreds
```

## Important Instructions
- If there is any uncertainty about how to perform a task, ask the user.
- Request further clarification if there is ambiguity in a request.
- Changes to `thredlib` require a rebuild before dependent projects pick them up.
- `srvthreds` tests are stateful and must run sequentially — do not parallelize them.
- Always run `npm run bootstrap -- -p <profile>` before starting or testing `srvthreds`.

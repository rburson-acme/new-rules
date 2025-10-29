# RabbitMQ Message Routing Troubleshooting

## Common Issue: "Message was returned" Error

### Symptoms

Engine logs show:
```
Server.tell(): Message evtXXX to participantX via session-agent
pub_message Message was returned: <uuid> on session-agent
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
Engine.tell(): Error sending message to participants with nodeId session-agent
```

### Root Cause

**RabbitMQ routing key mismatch** - The engine is publishing messages with a routing key that doesn't match any queue bindings.

**Three components must align**:
1. **Agent nodeId** (`-i` parameter) - What the agent identifies as
2. **RabbitMQ binding** (rascal_config.json) - What routing keys go to which queues
3. **Resolver config** (resolver_config.json) - How engine maps participants to agents

### The Problem in Detail

**Kubernetes Session Agent** was starting with:
```bash
node /app/dist-server/agent/agent.js -c session_agent -i session-agent -d
#                                                         ^^^^^^^^^^^^^^
#                                                         Wrong nodeId!
```

**RabbitMQ Binding** expects:
```json
// rascal_config.json line 60
"message-exchange[org.wt.session1] -> session1-message-queue"
#                ^^^^^^^^^^^^^^^^
#                Expected routing key
```

**Resolver Config** maps to:
```json
// resolver_config.json
{
  "nodeType": "org.wt.session",
  "nodeId": "org.wt.session1",  // ← Must match!
  "configName": "session_agent"
}
```

**Result**: Engine publishes to `session-agent` but no queue is bound to that routing key, so RabbitMQ returns the message as undeliverable.

## The Fix

### Step 1: Update Kubernetes Manifest

Edit [srvthreds-session-agent.yaml](../kubernetes/base/srvthreds-session-agent.yaml):

```yaml
command: ["node", "/app/srvthreds/dist-server/agent/agent.js",
          "-c", "session_agent",
          "-i", "org.wt.session1",  # ← Must match resolver_config.json
          "-d"]
```

### Step 2: Apply Changes

```bash
# Option A: Apply full config
kubectl apply -k infrastructure/kubernetes/overlays/minikube/

# Option B: Direct patch (if already deployed)
kubectl patch deployment srvthreds-session-agent -n srvthreds \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/command/5", "value": "org.wt.session1"}]'

# Force pod restart
kubectl delete pod -n srvthreds -l app.kubernetes.io/name=srvthreds-session-agent
```

### Step 3: Verify Fix

```bash
# Check actual running command
kubectl exec -n srvthreds deployment/srvthreds-session-agent -- ps aux | grep agent

# Should show:
# node /app/srvthreds/dist-server/agent/agent.js -c session_agent -i org.wt.session1 -d
#                                                                     ^^^^^^^^^^^^^^^^
#                                                                     Correct!

# Check engine logs - should NOT see "Message was returned"
kubectl logs -f -n srvthreds deployment/srvthreds-engine
```

## Why This Happens

### Local vs Minikube Configuration Differences

**Local Docker Compose** (works correctly):
```yaml
# docker-compose-services.yml
command: ["-c", "session_agent", "-i", "org.wt.session1", "-d"]
```

**Minikube** (was wrong):
```yaml
# Was using generic "session-agent" instead of specific "org.wt.session1"
command: [..., "-i", "session-agent", ...]  # ✗ Wrong
```

The Kubernetes manifest was created with a generic name that didn't match the RabbitMQ/resolver configuration.

## Understanding the Architecture

### Message Flow

```
Engine determines target participant
    ↓
Resolver maps participant → nodeId (org.wt.session1)
    ↓
Engine publishes to RabbitMQ message-exchange
  with routing key: org.wt.session1
    ↓
RabbitMQ routes via binding:
  message-exchange[org.wt.session1] → session1-message-queue
    ↓
Session Agent subscribes to session1-message-queue
  (identified by nodeId: org.wt.session1)
    ↓
Session Agent receives message and sends to WebSocket client
```

### When nodeId Doesn't Match

```
Engine publishes with routing key: session-agent  ✗
    ↓
RabbitMQ checks bindings... no match for "session-agent"
    ↓
RabbitMQ returns message to publisher (mandatory=true)
    ↓
Engine logs: "Message was returned"
    ↓
Participants never receive messages
```

## Configuration Files Reference

### 1. Resolver Config

[run-profiles/ef-detection/run-config/resolver_config.json](../../run-profiles/ef-detection/run-config/resolver_config.json):

```json
{
  "agents": [
    {
      "name": "Session Server",
      "nodeType": "org.wt.session",
      "nodeId": "org.wt.session1",      // ← This is the routing key
      "configName": "session_agent"
    }
  ]
}
```

### 2. RabbitMQ Config

[run-profiles/ef-detection/run-config/rascal_config.json](../../run-profiles/ef-detection/run-config/rascal_config.json):

```json
{
  "bindings": [
    // Format: "exchange[routing-key] -> queue"
    "message-exchange[org.wt.session1] -> session1-message-queue"
    //                ^^^^^^^^^^^^^^^^     ^^^^^^^^^^^^^^^^^^^^^^^
    //                Must match nodeId    Agent subscribes to this
  ],
  "subscriptions": {
    "sub_session1_message": {
      "queue": "session1-message-queue"  // Agent config references this
    }
  }
}
```

### 3. Agent Config

[run-profiles/ef-detection/run-config/session_agent.json](../../run-profiles/ef-detection/run-config/session_agent.json):

```json
{
  "nodeType": "org.wt.session",
  "subscriptionNames": ["sub_session1_message"]  // References rascal subscription
}
```

### 4. Agent Startup Command

Must use matching nodeId:
```bash
node agent.js -c session_agent -i org.wt.session1 -d
#                                  ^^^^^^^^^^^^^^^^
#                                  Must match resolver nodeId
```

## How to Prevent This

### 1. Use Consistent Naming

Keep all configurations in sync:
- Resolver config `nodeId`
- RabbitMQ binding routing key
- Agent startup `-i` parameter

### 2. Document the Relationship

Add comments in configs:
```yaml
# Kubernetes manifest
command: [..., "-i", "org.wt.session1", ...]
# IMPORTANT: Must match nodeId in resolver_config.json
```

### 3. Validate Before Deployment

```bash
# Check resolver config
cat run-profiles/ef-detection/run-config/resolver_config.json | grep nodeId

# Check rascal bindings
cat run-profiles/ef-detection/run-config/rascal_config.json | grep "message-exchange"

# Check Kubernetes command
kubectl get deployment srvthreds-session-agent -n srvthreds -o json | jq '.spec.template.spec.containers[0].command'

# All should show: org.wt.session1
```

### 4. Centralize Agent Config

Use the agent config files:
```json
// infrastructure/deployment/configs/agents/session-agent.config.json
{
  "command": {
    "args": [..., "-i", "org.wt.session1", ...],
    "_comment": "nodeId must match resolver_config.json"
  }
}
```

## Debugging Commands

### Check RabbitMQ Bindings

```bash
# Access RabbitMQ management UI
kubectl port-forward -n srvthreds svc/rabbitmq 15672:15672

# Open: http://localhost:15672
# Login: guest/guest
# Go to: Exchanges → message-exchange → Bindings
# Verify: org.wt.session1 → session1-message-queue exists
```

### Check Agent Subscriptions

```bash
# Check session agent logs
kubectl logs -n srvthreds deployment/srvthreds-session-agent | grep -i "subscribe\|queue"

# Should show: Subscribed to session1-message-queue
```

### Monitor Message Flow

```bash
# Terminal 1: Watch engine logs
kubectl logs -f -n srvthreds deployment/srvthreds-engine

# Terminal 2: Watch session agent logs
kubectl logs -f -n srvthreds deployment/srvthreds-session-agent

# Terminal 3: Send test event
# (connect via WebSocket and send event)

# Should see:
# Engine: "Server.tell(): Message X to participantY via session-agent"
# Session Agent: Receives and delivers message
# NO "Message was returned" errors
```

## Summary

**Quick Fix Checklist**:
1. ✓ Verify resolver_config.json has correct nodeId
2. ✓ Verify rascal_config.json binding matches nodeId
3. ✓ Update Kubernetes manifest with correct `-i` parameter
4. ✓ Apply changes: `kubectl apply -k infrastructure/kubernetes/overlays/minikube/`
5. ✓ Restart pod: `kubectl delete pod -n srvthreds -l app.kubernetes.io/name=srvthreds-session-agent`
6. ✓ Verify: `kubectl exec ... -- ps aux | grep agent`
7. ✓ Test: Send events and check engine logs for no "returned" errors

**The Golden Rule**: Agent `nodeId` (-i) = Resolver `nodeId` = RabbitMQ routing key

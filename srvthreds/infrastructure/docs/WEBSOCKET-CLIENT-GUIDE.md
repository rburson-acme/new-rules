# WebSocket Client Connection Guide

## Overview

SrvThreds uses **Socket.IO** for WebSocket connections on the Session Agent. External applications can connect to send Events and receive Messages in real-time.

## Connection Architecture

### Local Deployment
```
External App → localhost:3000 (Session Agent)
              ↓
          WebSocket (Socket.IO)
              ↓
       SrvThreds Engine (via RabbitMQ)
```

### Minikube Deployment
```
External App → localhost:3000 (Port Forward)
              ↓
          kubectl port-forward
              ↓
       session-agent Service (ClusterIP)
              ↓
       Session Agent Pod :3000
              ↓
          WebSocket (Socket.IO)
              ↓
       SrvThreds Engine (via RabbitMQ)
```

## Setting Up Access

### Local Deployment

Session Agent is directly accessible:
```bash
# Session agent already exposed on host
# Direct connection: http://localhost:3000
```

### Minikube Deployment

Need to port-forward to access from outside cluster:

```bash
# Forward port 3000 from session-agent service
kubectl port-forward -n srvthreds svc/session-agent 3000:3000

# Or use a different local port to avoid conflicts
kubectl port-forward -n srvthreds svc/session-agent 3001:3000
```

**Keep this running** - port-forward must stay active for external connections.

## WebSocket Protocol Details

### Server Implementation

From [SocketService.ts](../../src/ts/agent/session/SocketService.ts):

**Technology**: Socket.IO v4+
**Port**: 3000 (configurable via agent config)
**Path**: Default Socket.IO path (`/socket.io/`)
**Namespace**: Default (`/`)

**Authentication** (Currently Disabled):
```typescript
// Line 61-76: Authentication is commented out
// Token is read from socket.handshake.auth.token
// But currently just uses token as participantId without validation
```

**Events**:
- **Inbound** (Client → Server): `'message'` event with Event payload
- **Outbound** (Server → Client): Default `'message'` event with Message/Event payload
- **Lifecycle**: `'connect'`, `'disconnect'`

## Client Connection Examples

### JavaScript/Node.js (socket.io-client)

```javascript
import { io } from 'socket.io-client';

// Connect to session agent
const socket = io('http://localhost:3000', {
  auth: {
    token: 'participant-123'  // Your participant ID
  }
});

// Handle connection
socket.on('connect', () => {
  console.log('Connected to SrvThreds!', socket.id);

  // Send an event
  const event = {
    id: `evt_${Date.now()}`,
    type: 'user.action',
    source: { id: 'participant-123' },
    timestamp: new Date().toISOString(),
    data: {
      action: 'button.clicked',
      buttonId: 'submit'
    }
  };

  socket.emit('message', event);
});

// Receive messages/events from engine
socket.on('message', (messageOrEvent) => {
  console.log('Received from server:', messageOrEvent);

  // Message format:
  // {
  //   event: { ...eventData },
  //   to: [{ participantId: 'participant-123', ... }]
  // }
});

// Handle disconnection
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

// Handle errors
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

### Python (python-socketio)

```python
import socketio
import time

# Create a Socket.IO client
sio = socketio.Client()

@sio.event
def connect():
    print('Connected to SrvThreds!')

    # Send an event
    event = {
        'id': f'evt_{int(time.time() * 1000)}',
        'type': 'user.action',
        'source': {'id': 'participant-123'},
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z'),
        'data': {
            'action': 'button.clicked',
            'buttonId': 'submit'
        }
    }
    sio.emit('message', event)

@sio.event
def message(data):
    print('Received from server:', data)

@sio.event
def disconnect():
    print('Disconnected from server')

@sio.event
def connect_error(data):
    print('Connection failed:', data)

# Connect with authentication
sio.connect('http://localhost:3000',
            auth={'token': 'participant-123'})

# Wait for events
sio.wait()
```

### Browser JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <title>SrvThreds WebSocket Client</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
  <h1>SrvThreds WebSocket Test</h1>
  <button id="sendBtn">Send Event</button>
  <div id="output"></div>

  <script>
    const participantId = 'participant-' + Date.now();
    const output = document.getElementById('output');

    // Connect to session agent
    const socket = io('http://localhost:3000', {
      auth: {
        token: participantId
      }
    });

    socket.on('connect', () => {
      output.innerHTML += `<p>✓ Connected as ${participantId}</p>`;
      console.log('Socket ID:', socket.id);
    });

    socket.on('message', (data) => {
      output.innerHTML += `<p>← Received: ${JSON.stringify(data, null, 2)}</p>`;
    });

    socket.on('disconnect', (reason) => {
      output.innerHTML += `<p>✗ Disconnected: ${reason}</p>`;
    });

    // Send event on button click
    document.getElementById('sendBtn').addEventListener('click', () => {
      const event = {
        id: `evt_${Date.now()}`,
        type: 'user.action',
        source: { id: participantId },
        timestamp: new Date().toISOString(),
        data: {
          action: 'button.clicked',
          buttonId: 'submit'
        }
      };

      socket.emit('message', event);
      output.innerHTML += `<p>→ Sent: ${JSON.stringify(event, null, 2)}</p>`;
    });
  </script>
</body>
</html>
```

### React Example

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Event {
  id: string;
  type: string;
  source: { id: string };
  timestamp: string;
  data: any;
}

function SrvThreadsClient() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const participantId = `participant-${Date.now()}`;

  useEffect(() => {
    // Connect to session agent
    const newSocket = io('http://localhost:3000', {
      auth: {
        token: participantId
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected!', newSocket.id);
      setConnected(true);
    });

    newSocket.on('message', (data) => {
      console.log('Received:', data);
      setMessages(prev => [...prev, { type: 'received', data }]);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const sendEvent = () => {
    if (!socket) return;

    const event: Event = {
      id: `evt_${Date.now()}`,
      type: 'user.action',
      source: { id: participantId },
      timestamp: new Date().toISOString(),
      data: {
        action: 'button.clicked',
        buttonId: 'submit'
      }
    };

    socket.emit('message', event);
    setMessages(prev => [...prev, { type: 'sent', data: event }]);
  };

  return (
    <div>
      <h1>SrvThreads WebSocket Client</h1>
      <p>Status: {connected ? '✓ Connected' : '✗ Disconnected'}</p>
      <p>Participant: {participantId}</p>
      <button onClick={sendEvent} disabled={!connected}>
        Send Event
      </button>

      <div>
        <h2>Messages</h2>
        {messages.map((msg, i) => (
          <div key={i}>
            <strong>{msg.type}:</strong>
            <pre>{JSON.stringify(msg.data, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SrvThreadsClient;
```

## Event Structure

### Sending Events (Client → Server)

Events must follow this structure:

```typescript
interface Event {
  id: string;              // Unique event ID (e.g., "evt_1234567890")
  type: string;            // Event type (e.g., "user.action", "system.started")
  source: {
    id: string;            // Participant ID (should match auth token)
  };
  timestamp: string;       // ISO 8601 timestamp
  data?: any;              // Event-specific data
  thredId?: string;        // Optional: Target specific thred
  patternId?: string;      // Optional: Trigger specific pattern
}
```

**Example**:
```javascript
{
  id: "evt_1730156789123",
  type: "user.action",
  source: { id: "participant-123" },
  timestamp: "2025-10-28T22:45:00.000Z",
  data: {
    action: "form.submitted",
    formData: {
      name: "John Doe",
      email: "john@example.com"
    }
  }
}
```

### Receiving Messages (Server → Client)

Messages from the engine include the event and routing info:

```typescript
interface Message {
  event: Event;            // The triggering event
  to: Array<{
    participantId: string; // Who should receive this
    sessionId?: string;
    nodeId?: string;
  }>;
  data?: any;             // Message-specific data from reaction
}
```

**Example**:
```javascript
{
  event: {
    id: "evt_1730156789123",
    type: "user.action",
    source: { id: "participant-123" },
    // ... full event
  },
  to: [
    {
      participantId: "participant-123",
      sessionId: "participant-123_1730156789000",
      nodeId: "org.wt.session1"
    }
  ],
  data: {
    message: "Form submitted successfully!",
    confirmationId: "conf-789"
  }
}
```

## Connection URL Formats

### Local Deployment
```
http://localhost:3000
ws://localhost:3000
```

### Minikube with Port Forward
```bash
# Standard port forward
kubectl port-forward -n srvthreds svc/session-agent 3000:3000

# Connect to:
http://localhost:3000
ws://localhost:3000
```

```bash
# Alternative port
kubectl port-forward -n srvthreds svc/session-agent 3001:3000

# Connect to:
http://localhost:3001
ws://localhost:3001
```

### Production (Future - with Ingress)
```
https://api.yourdomain.com
wss://api.yourdomain.com
```

## Advanced Features

### Proxy Mode

Clients can request to proxy all messages by setting a header:

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'participant-123'
  },
  extraHeaders: {
    'x-proxy-message': 'true'
  }
});
```

When enabled, the client receives ALL messages for their participant, not just messages addressed to their specific session.

### Multiple Connections

A single participant can have multiple WebSocket connections:

```javascript
// Connection 1 (web browser)
const socket1 = io('http://localhost:3000', {
  auth: { token: 'participant-123' }
});

// Connection 2 (mobile app)
const socket2 = io('http://localhost:3000', {
  auth: { token: 'participant-123' }
});

// Both receive messages addressed to participant-123
```

Each connection gets a unique `sessionId` and `channelId`.

## Testing

### Quick Test with curl (HTTP endpoint)

Session agent also exposes HTTP endpoints:

```bash
# Check health
curl http://localhost:3000/health

# Send event via HTTP POST (if enabled)
curl -X POST http://localhost:3000/event \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_test",
    "type": "user.action",
    "source": {"id": "participant-test"},
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
  }'
```

### Test WebSocket with wscat

```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c "ws://localhost:3000/socket.io/?EIO=4&transport=websocket"

# You'll see Socket.IO protocol messages
# Send: 42["message",{"id":"evt_test","type":"test",...}]
```

### Verify Port Forward is Working

```bash
# Check if port-forward is running
ps aux | grep "kubectl port-forward"

# Test connectivity
curl http://localhost:3000
# Should respond (even if error, means connection works)

# Check service in cluster
kubectl get svc session-agent -n srvthreds
kubectl describe svc session-agent -n srvthreds
```

## Troubleshooting

### "Connection refused" or "Cannot connect"

**Local Deployment**:
```bash
# Check if session agent is running
docker ps | grep session-agent

# Check logs
docker logs srvthreds-session-agent

# Restart if needed
npm run deploymentCli local d_a_s
npm run deploymentCli local s_a_s
```

**Minikube**:
```bash
# Check if port-forward is running
ps aux | grep "kubectl port-forward"

# Start port-forward
kubectl port-forward -n srvthreds svc/session-agent 3000:3000

# Check pod status
kubectl get pods -n srvthreds | grep session-agent

# Check pod logs
kubectl logs -f -n srvthreds deployment/srvthreds-session-agent
```

### "Authentication error"

Currently authentication is **disabled** (lines 63-76 in SocketService.ts are commented out).

The `token` is simply used as the `participantId`. No validation occurs.

To enable authentication in the future, uncomment the validation code.

### Port already in use

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port for port-forward
kubectl port-forward -n srvthreds svc/session-agent 3001:3000
# Connect to: http://localhost:3001
```

### Not receiving messages

**Check**:
1. Event format is correct (has id, type, source, timestamp)
2. ParticipantId in auth token matches event source.id
3. Pattern is configured to send messages to your participant
4. Engine is running and processing events

```bash
# Check engine logs
docker logs -f srvthreds-engine
# or
kubectl logs -f -n srvthreds deployment/srvthreds-engine
```

## Security Considerations

### Current State (Development)

- ✗ No authentication validation
- ✗ No authorization checks
- ✗ No rate limiting
- ✗ No input validation
- ✓ Participant ID spoofing possible (TODO: RLS-141)

### Production Recommendations

1. **Enable authentication** - Uncomment validation in SocketService.ts
2. **Use JWT tokens** - Validate with BasicAuth.validateAccessToken()
3. **Add rate limiting** - Prevent abuse
4. **Validate event sources** - Ensure source.id matches authenticated participant
5. **Use HTTPS/WSS** - Encrypt transport layer
6. **Implement CORS** - Restrict allowed origins

## Summary

**Connection Steps**:
1. Start session agent (local or minikube)
2. Port-forward if using Minikube
3. Connect with Socket.IO client to `http://localhost:3000`
4. Authenticate with participant ID as token
5. Emit `'message'` events to send to engine
6. Listen for `'message'` events to receive from engine

**Key Points**:
- Uses Socket.IO v4 (not raw WebSockets)
- Default namespace and path
- Authentication currently disabled
- Messages are bidirectional
- Multiple connections per participant allowed

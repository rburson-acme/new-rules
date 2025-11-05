# Check if session agent process is running
ps aux | grep "session_agent"
# Test Socket.IO endpoint with running local session agent
curl --include --no-buffer \
--header "Connection: Upgrade" \
--header "Upgrade: websocket" \
--header "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
--header "Sec-WebSocket-Version: 13" \
"ws://localhost:3000/socket.io/?EIO=4&transport=websocket"

curl -v http://localhost:3000/socket.io/

curl --include --no-buffer \
--header "Connection: Upgrade" \
--header "Upgrade: websocket" \
--header "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
--header "Sec-WebSocket-Version: 13" \
"ws://localhost:3000/socket.io/?EIO=4&transport=websocket"

# Pull container logs
docker logs srvthreds-session-agent --tail 10
# Check recent session agent logs
docker logs srvthreds-session-agent --since 30s

docker exec srvthreds-engine env | grep MONGO

docker exec srvthreds-session-agent env | grep -E "(MONGO|REDIS)"

docker exec srvthreds-session-agent ls -la /app/dist-server/persistence/mongodb/

grep -n "# - MONGO_HOST" /Users/aresha/Repos/new-rules/srvthreds/infrastructure/local/compose/docker-compose-services.yml

docker ps --filter "name=mongo" && docker exec mongo-repl-1 mongosh --eval "db.runCommand('ping')"

docker network ls

docker inspect mongo-repl-1 | grep NetworkMode

docker exec srvthreds-session-agent node -e "
  const { MongoClient } = require('mongodb'); 
  MongoClient.connect('mongodb://mongo-repl-1:27017')
    .then(() => console.log('MongoDB Connected'))
    .catch(e => console.log('MongoDB Error:', e.message))"


docker exec srvthreds-session-agent redis-cli -h redis -p 6379 ping

docker exec srvthreds-session-agent node -e "
  const redis = require('redis'); 
  const client = redis.createClient({ host: 'redis', port: 6379 }); 
  client.ping()
    .then(() => console.log('Redis Connected'))
    .catch(e => console.log('Redis Error:', e.message));"

docker exec srvthreds-session-agent nc -zv redis 6379

docker run --rm --network srvthreds-storage-net redis:latest redis-cli -h redis -p 6379 ping

docker exec srvthreds-session-agent timeout 5 bash -c '</dev/tcp/redis/6379' && echo "Redis port is open" || echo "Cannot connect to Redis"

docker exec srvthreds-session-agent curl -v telnet://redis:6379

docker ps --filter "name=mongo" --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"

docker exec srvthreds-session-agent node -e "
const redis = require('redis');
redis.createClient({ socket: { host: 'redis', port: 6379 }})
  .connect()
  .then(client => client.ping())
  .then(result => console.log('Redis Connected:', result))
  .catch(e => console.log('Redis Error:', e.message));
"

docker exec srvthreds-session-agent node -e "
const redis = require('redis');
redis.createClient({ socket: { host: 'redis', port: 6379 }})
  .connect()
  .then(client => client.ping())
  .then(result => console.log('Redis Connected:', result))
  .catch(e => console.log('Redis Error:', e.message));
"

docker exec srvthreds-session-agent node -e "
const redis = require('redis');
(async () => {
  const client = redis.createClient({ socket: { host: 'redis', port: 6379 }});
  try {
    await client.connect();
    console.log('Redis Connected:', await client.ping());
  } catch (e) {
    console.log('Redis Error:', e.message);
  } finally {
    await client.quit();
  }
})();
"

docker exec srvthreds-session-agent node -e "
const { MongoClient } = require('mongodb');
(async () => {
  try {
    console.log('Testing with explicit IP...');
    const client = new MongoClient('mongodb://172.18.0.3:27017', {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      directConnection: true
    });
    await client.connect();
    console.log('MongoDB Connected via IP');
    await client.close();
  } catch (e) {
    console.log('MongoDB Error via IP:', e.message);
  }
})();
"

ps aux | grep -E "node|docker" | grep -v grep | head -10

lsof -i :3000 -n -P


docker logs --tail 50 srvthreds-session-agent

docker exec srvthreds-session-agent wget -qO- http://localhost:3000/socket.io/ 2>&1 || echo "Failed"

docker exec srvthreds-session-agent netstat -tuln 2>/dev/null || docker exec srvthreds-session-agent ss -tuln

docker inspect srvthreds-session-agent | grep -A 10 -i "cmd\|entrypoint"
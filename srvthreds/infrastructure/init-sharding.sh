#!/bin/bash

echo "Waiting for MongoDB services to start..."
sleep 20 # Give services time to start

echo "Initializing Config Server Replica Set..."
docker exec mongo-config1 mongosh --eval "rs.initiate({ _id: \"rs-config\", configsvr: true, members: [ { _id: 0, host: \"mongo-config1:27019\" }, { _id: 1, host: \"mongo-config2:27019\" }, { _id: 2, host: \"mongo-config3:27019\" } ]})"

echo "Initializing Shard 1 Replica Set..."
docker exec mongo-shard1-1 mongosh --eval "rs.initiate({ _id: \"rs-shard1\", members: [ { _id: 0, host: \"mongo-shard1-1:27018\" }, { _id: 1, host: \"mongo-shard1-2:27018\" } ]})"

echo "Initializing Shard 2 Replica Set..."
docker exec mongo-shard2-1 mongosh --eval "rs.initiate({ _id: \"rs-shard2\", members: [ { _id: 0, host: \"mongo-shard2-1:27018\" }, { _id: 1, host: \"mongo-shard2-2:27018\" } ]})"

echo "Adding Shards to Mongos Router..."
docker exec mongos mongosh --eval "sh.addShard(\"rs-shard1/mongo-shard1-1:27018,mongo-shard1-2:27018\")"
docker exec mongos mongosh --eval "sh.addShard(\"rs-shard2/mongo-shard2-1:27018,mongo-shard2-2:27018\")"

echo "Sharded cluster setup complete!"
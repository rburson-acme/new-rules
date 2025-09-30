#!/bin/bash
# Wait for all nodes to be ready.
# We'll use a simple loop as an alternative to the healthcheck to be explicit
# that we're waiting for the database to be reachable by the script.
sleep 5

# Initiate the replica set with all three members
# mongosh "mongodb://mongo-repl-1:27017" --eval "
#   rs.initiate({
#     _id: 'rs0',
#     members: [
#       { _id: 0, host: 'mongo-repl-1:27017' },
#       { _id: 1, host: 'mongo-repl-2:27017' },
#       { _id: 2, host: 'mongo-repl-3:27017' }
#     ]
#   });
# "
# mongosh "mongodb://localhost:27017" --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'localhost:27017' }] })"

docker exec mongo-repl-1 mongosh "mongodb://localhost:27017" --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'localhost:27017' }] })"

# mongosh "mongodb://localhost:27017" --eval "
#   rs.initiate({
#     _id: 'rs0',
#     members: [
#       { _id: 0, host: 'localhost:27017' }
#     ]
#   });
# "

# # Wait for the replica set to elect a primary
# echo "Waiting for replica set to elect a primary..."
# until mongosh "mongodb://localhost:27017/?replicaSet=rs0" --eval "rs.status().ok == 1 && rs.status().members.filter(m => m.stateStr == 'PRIMARY').length == 1" | grep "true"; do
#   sleep 1
# done
# echo "Replica set primary elected."
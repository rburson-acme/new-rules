#!/bin/bash
set -e

echo "🔍 MongoDB Debug Script"
echo "======================"

# Check if running in Docker Compose or Kubernetes
if docker-compose ps mongo > /dev/null 2>&1; then
    echo "📦 Detected Docker Compose environment"
    MONGO_CONTAINER="mongo"
    MONGO_CMD="docker-compose exec $MONGO_CONTAINER"
elif kubectl get pod -l app.kubernetes.io/name=mongo -n srvthreds > /dev/null 2>&1; then
    echo "☸️  Detected Kubernetes environment"
    MONGO_POD=$(kubectl get pod -l app.kubernetes.io/name=mongo -n srvthreds -o jsonpath='{.items[0].metadata.name}')
    MONGO_CMD="kubectl exec -it $MONGO_POD -n srvthreds --"
else
    echo "❌ No MongoDB container found. Make sure MongoDB is running."
    exit 1
fi

echo ""
echo "🧪 Testing MongoDB Connection..."

# Test basic connection
echo "1. Basic MongoDB connection test:"
$MONGO_CMD mongosh --eval "db.adminCommand('ping')" || echo "❌ Basic connection failed"

echo ""
echo "2. Replica set status:"
$MONGO_CMD mongosh --eval "rs.status()" 2>/dev/null || echo "❌ Not configured as replica set or not initialized"

echo ""
echo "3. Replica set configuration:"
$MONGO_CMD mongosh --eval "rs.conf()" 2>/dev/null || echo "❌ No replica set configuration found"

echo ""
echo "4. Database list:"
$MONGO_CMD mongosh --eval "show dbs"

echo ""
echo "5. Current connections:"
$MONGO_CMD mongosh --eval "db.serverStatus().connections"

echo ""
echo "6. Check if replica set needs initialization:"
INIT_CHECK=$($MONGO_CMD mongosh --eval "
try {
    var status = rs.status();
    print('Replica set already initialized');
} catch(e) {
    if (e.message.includes('no replset config') || e.message.includes('NotYetInitialized')) {
        print('Replica set NOT initialized - needs setup');
    } else {
        print('Error: ' + e.message);
    }
}
" 2>/dev/null)
echo "$INIT_CHECK"

echo ""
echo "7. Manual replica set initialization (if needed):"
echo "If replica set is not initialized, run:"
echo "$MONGO_CMD mongosh --eval \"rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'localhost:27017'}]})\""

echo ""
echo "8. Test connection with replica set parameter:"
if [[ "$MONGO_CMD" == *"docker-compose"* ]]; then
    echo "Testing from bootstrap container..."
    docker-compose exec srvthreds-bootstrap node -e "
const { MongoClient } = require('mongodb');
async function test() {
    try {
        const client = new MongoClient('mongodb://mongo:27017/?replicaSet=rs0');
        await client.connect();
        console.log('✅ Replica set connection successful');
        await client.close();
    } catch (e) {
        console.log('❌ Replica set connection failed:', e.message);
    }
}
test();" 2>/dev/null || echo "❌ Bootstrap container test failed"
else
    echo "Kubernetes MongoDB test would need to be run from within the cluster"
fi

echo ""
echo "🏁 Debug complete. Check the output above for any issues."
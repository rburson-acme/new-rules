#!/bin/bash
# Quick diagnostic script for SrvThreds environment
# Usage: ./infrastructure/scripts/diagnose.sh [local|minikube|all]

MODE="${1:-all}"

echo "🔍 SrvThreds Environment Diagnostics"
echo "===================================="
echo ""

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_status() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $1"
  else
    echo -e "${RED}✗${NC} $1"
  fi
}

# Docker Status
if [ "$MODE" == "all" ] || [ "$MODE" == "local" ] || [ "$MODE" == "minikube" ]; then
  echo "=== Docker Status ==="
  if docker info &>/dev/null; then
    echo -e "${GREEN}✓${NC} Docker daemon is running"
  else
    echo -e "${RED}✗${NC} Docker daemon is NOT running"
    echo "   Please start Docker Desktop"
    exit 1
  fi
  echo ""
fi

# Local Environment
if [ "$MODE" == "all" ] || [ "$MODE" == "local" ]; then
  echo "=== Local Docker Environment ==="

  # Check containers
  MONGO_STATUS=$(docker inspect mongo-repl-1 --format='{{.State.Status}}' 2>/dev/null || echo "not found")
  REDIS_STATUS=$(docker inspect redis --format='{{.State.Status}}' 2>/dev/null || echo "not found")
  RABBITMQ_STATUS=$(docker inspect rabbitmq --format='{{.State.Status}}' 2>/dev/null || echo "not found")

  if [ "$MONGO_STATUS" == "running" ]; then
    echo -e "${GREEN}✓${NC} MongoDB: $MONGO_STATUS"

    # Check replica set
    RS_OK=$(docker exec mongo-repl-1 mongosh --quiet --eval "rs.status().ok" 2>/dev/null || echo "0")
    if [ "$RS_OK" == "1" ]; then
      echo -e "${GREEN}  ✓${NC} Replica set initialized"
    else
      echo -e "${RED}  ✗${NC} Replica set NOT initialized"
    fi
  else
    echo -e "${RED}✗${NC} MongoDB: $MONGO_STATUS"
  fi

  if [ "$REDIS_STATUS" == "running" ]; then
    echo -e "${GREEN}✓${NC} Redis: $REDIS_STATUS"

    # Test connection
    if docker exec redis redis-cli ping &>/dev/null; then
      echo -e "${GREEN}  ✓${NC} Redis responding"
    else
      echo -e "${RED}  ✗${NC} Redis not responding"
    fi
  else
    echo -e "${RED}✗${NC} Redis: $REDIS_STATUS"
  fi

  if [ "$RABBITMQ_STATUS" == "running" ]; then
    echo -e "${GREEN}✓${NC} RabbitMQ: $RABBITMQ_STATUS"
  else
    echo -e "${RED}✗${NC} RabbitMQ: $RABBITMQ_STATUS"
  fi

  # Check ports
  echo ""
  echo "Port Status:"
  if lsof -Pi :27017 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}  ✓${NC} MongoDB port 27017 listening"
  else
    echo -e "${RED}  ✗${NC} MongoDB port 27017 NOT listening"
  fi

  if lsof -Pi :6380 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}  ✓${NC} Redis port 6380 listening"
  else
    echo -e "${RED}  ✗${NC} Redis port 6380 NOT listening"
  fi

  if lsof -Pi :5672 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}  ✓${NC} RabbitMQ port 5672 listening"
  else
    echo -e "${RED}  ✗${NC} RabbitMQ port 5672 NOT listening"
  fi

  echo ""
fi

# Minikube Environment
if [ "$MODE" == "all" ] || [ "$MODE" == "minikube" ]; then
  echo "=== Minikube Environment ==="

  # Check Minikube container
  MINIKUBE_STATUS=$(docker inspect minikube --format='{{.State.Status}}' 2>/dev/null || echo "not found")

  if [ "$MINIKUBE_STATUS" == "running" ]; then
    echo -e "${GREEN}✓${NC} Minikube container: $MINIKUBE_STATUS"

    # Check Minikube status
    if minikube status &>/dev/null; then
      echo -e "${GREEN}  ✓${NC} Minikube cluster running"

      # Check kubectl context
      CURRENT_CONTEXT=$(kubectl config current-context 2>/dev/null || echo "none")
      if [ "$CURRENT_CONTEXT" == "minikube" ]; then
        echo -e "${GREEN}  ✓${NC} kubectl context: $CURRENT_CONTEXT"
      else
        echo -e "${YELLOW}  ⚠${NC} kubectl context: $CURRENT_CONTEXT (expected: minikube)"
      fi

      # Check API connectivity
      if kubectl cluster-info &>/dev/null; then
        echo -e "${GREEN}  ✓${NC} Kubernetes API accessible"

        # Check pods
        echo ""
        echo "  Pods in srvthreds namespace:"
        kubectl get pods -n srvthreds 2>/dev/null | tail -n +2 | while read line; do
          POD_NAME=$(echo $line | awk '{print $1}')
          POD_STATUS=$(echo $line | awk '{print $3}')

          if [ "$POD_STATUS" == "Running" ]; then
            echo -e "${GREEN}    ✓${NC} $POD_NAME: $POD_STATUS"
          else
            echo -e "${RED}    ✗${NC} $POD_NAME: $POD_STATUS"
          fi
        done
      else
        echo -e "${RED}  ✗${NC} Cannot connect to Kubernetes API"
      fi
    else
      echo -e "${RED}  ✗${NC} Minikube cluster NOT running"
    fi
  else
    echo -e "${RED}✗${NC} Minikube container: $MINIKUBE_STATUS"
  fi

  echo ""
fi

# Network Connectivity
echo "=== Network Connectivity ==="
nc -zv localhost 27017 &>/dev/null && echo -e "${GREEN}✓${NC} MongoDB (27017) reachable" || echo -e "${RED}✗${NC} MongoDB (27017) NOT reachable"
nc -zv localhost 6380 &>/dev/null && echo -e "${GREEN}✓${NC} Redis (6380) reachable" || echo -e "${RED}✗${NC} Redis (6380) NOT reachable"
nc -zv localhost 5672 &>/dev/null && echo -e "${GREEN}✓${NC} RabbitMQ (5672) reachable" || echo -e "${RED}✗${NC} RabbitMQ (5672) NOT reachable"

echo ""
echo "=== Restart Policies ==="
if docker inspect mongo-repl-1 &>/dev/null; then
  docker inspect mongo-repl-1 redis rabbitmq 2>/dev/null | grep -A1 "RestartPolicy" | grep Name | awk -F'"' '{printf "  %-20s restart=%s\n", "mongo-repl-1:", $4}'
  docker inspect redis 2>/dev/null | grep -A1 "RestartPolicy" | grep Name | awk -F'"' '{printf "  %-20s restart=%s\n", "redis:", $4}'
  docker inspect rabbitmq 2>/dev/null | grep -A1 "RestartPolicy" | grep Name | awk -F'"' '{printf "  %-20s restart=%s\n", "rabbitmq:", $4}'
fi

if docker inspect minikube &>/dev/null; then
  docker inspect minikube 2>/dev/null | grep -A1 "RestartPolicy" | grep Name | awk -F'"' '{printf "  %-20s restart=%s\n", "minikube:", $4}'
fi

echo ""
echo "=== Summary ==="
echo "Run these commands for more details:"
echo "  docker ps -a                        # All containers"
echo "  docker logs <container> --tail=50   # Container logs"
echo "  kubectl get pods -n srvthreds       # Minikube pods"
echo "  kubectl logs -n srvthreds <pod>     # Pod logs"
echo ""
echo "See infrastructure/docs/TROUBLESHOOTING.md for detailed help"

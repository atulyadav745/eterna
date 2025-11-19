#!/bin/bash

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Order Execution Engine Test ===${NC}\n"

# Check if server is running
echo -e "${YELLOW}Checking server health...${NC}"
curl -s http://localhost:3000/health | jq .
echo -e "\n"

# Submit test order
echo -e "${YELLOW}Submitting test order...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "orderType": "MARKET",
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amountIn": 1.5
  }')

echo "$RESPONSE" | jq .
ORDER_ID=$(echo "$RESPONSE" | jq -r '.orderId')

echo -e "\n${GREEN}Order submitted successfully!${NC}"
echo -e "Order ID: ${GREEN}$ORDER_ID${NC}\n"

# Wait for processing
echo -e "${YELLOW}Waiting for order to process...${NC}"
sleep 4

# Check server logs for the order
echo -e "\n${YELLOW}Order processing details:${NC}"
tail -100 /tmp/eterna.log | grep -A 2 "$ORDER_ID" | grep -E "routing|building|submitted|confirmed|failed|txHash" | tail -10

echo -e "\n${GREEN}Test completed!${NC}"
echo -e "Check /tmp/eterna.log for full logs"

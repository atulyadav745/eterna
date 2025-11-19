# Eterna Order Execution Engine - API Testing Guide

## Postman Collection

Import `postman_collection.json` into Postman or Insomnia to test all API endpoints.

### Environment Variables

- `base_url`: `http://localhost:3000` (for local testing)
- `order_id`: Replace with actual order ID from order submission response

## Testing Flow

### 1. Health Check
```bash
GET /health
```
**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-19T12:00:00.000Z",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

### 2. Submit Market Order
```bash
POST /api/orders/execute
Content-Type: application/json

{
  "orderType": "MARKET",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 1.5
}
```

**Expected Response:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Order received and queued for execution"
}
```

### 3. Get Order Status
```bash
GET /api/orders/{{orderId}}
```

**Expected Response (Completed Order):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "orderType": "MARKET",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 1.5,
  "status": "confirmed",
  "selectedDex": "METEORA",
  "raydiumQuote": {
    "dex": "RAYDIUM",
    "price": 25.88,
    "fee": 0.003,
    "effectivePrice": 25.96,
    "liquidity": 1801127.39,
    "priceImpact": 0.0017,
    "timestamp": "2025-11-19T12:00:00.000Z"
  },
  "meteoraQuote": {
    "dex": "METEORA",
    "price": 25.69,
    "fee": 0.002,
    "effectivePrice": 25.74,
    "liquidity": 1100420.27,
    "priceImpact": 0.0018,
    "timestamp": "2025-11-19T12:00:00.000Z"
  },
  "routingDecision": {
    "reason": "METEORA offers better price by 0.82%",
    "selectedDex": "METEORA",
    "meteoraPrice": 25.74,
    "raydiumPrice": 25.96,
    "priceDifference": 0.22,
    "priceDifferencePercent": 0.82
  },
  "executedPrice": 25.82,
  "amountOut": 0.0581,
  "txHash": "hC1HnEta...NBh2DM6f",
  "retryCount": 0,
  "createdAt": "2025-11-19T12:00:00.000Z",
  "updatedAt": "2025-11-19T12:00:05.000Z",
  "completedAt": "2025-11-19T12:00:05.000Z"
}
```

## WebSocket Testing

### Using websocat (CLI tool)
```bash
# Install websocat
cargo install websocat

# Connect to WebSocket
websocat "ws://localhost:3000/ws?orderId=YOUR_ORDER_ID"
```

### Using JavaScript (Browser Console)
```javascript
const orderId = 'YOUR_ORDER_ID';
const ws = new WebSocket(`ws://localhost:3000/ws?orderId=${orderId}`);

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Status Update:', message);
};

ws.onopen = () => console.log('Connected to WebSocket');
ws.onerror = (error) => console.error('WebSocket Error:', error);
```

### Expected WebSocket Messages
```json
// 1. Pending
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Order queued for processing",
  "timestamp": "2025-11-19T12:00:00.000Z"
}

// 2. Routing
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "routing",
  "message": "Comparing DEX prices",
  "timestamp": "2025-11-19T12:00:01.000Z"
}

// 3. Building
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "building",
  "message": "Building transaction",
  "data": {
    "selectedDex": "METEORA",
    "routingDecision": {
      "reason": "METEORA offers better price by 0.82%",
      "priceDifference": 0.22
    }
  },
  "timestamp": "2025-11-19T12:00:02.000Z"
}

// 4. Submitted
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "submitted",
  "message": "Transaction submitted to blockchain",
  "data": {
    "txHash": "hC1HnEta...NBh2DM6f"
  },
  "timestamp": "2025-11-19T12:00:03.000Z"
}

// 5. Confirmed
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "confirmed",
  "message": "Order executed successfully",
  "data": {
    "txHash": "hC1HnEta...NBh2DM6f",
    "executedPrice": 25.82,
    "amountOut": 0.0581
  },
  "timestamp": "2025-11-19T12:00:05.000Z"
}
```

## Concurrent Order Testing

Test the queue system by submitting multiple orders simultaneously:

```bash
# Using bash
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/orders/execute \
    -H "Content-Type: application/json" \
    -d "{\"orderType\":\"MARKET\",\"tokenIn\":\"SOL\",\"tokenOut\":\"USDC\",\"amountIn\":$i}" &
done
wait
```

## Error Scenarios

### Missing Required Fields
```bash
POST /api/orders/execute
{
  "orderType": "MARKET",
  "tokenIn": "SOL"
}
```
**Response:** 400 Bad Request
```json
{
  "error": "Missing required fields: orderType, tokenIn, tokenOut, amountIn"
}
```

### Invalid Amount
```bash
POST /api/orders/execute
{
  "orderType": "MARKET",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 0
}
```
**Response:** 400 Bad Request
```json
{
  "error": "amountIn must be greater than 0"
}
```

### Unsupported Order Type
```bash
POST /api/orders/execute
{
  "orderType": "LIMIT",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 1.0
}
```
**Response:** 400 Bad Request
```json
{
  "error": "Only MARKET orders are currently supported"
}
```

### Non-Existent Order
```bash
GET /api/orders/00000000-0000-0000-0000-000000000000
```
**Response:** 404 Not Found
```json
{
  "error": "Order not found"
}
```

## Performance Metrics

- **Order Processing Time**: 3-5 seconds (mock DEX simulation)
- **Concurrent Orders**: Up to 10 simultaneous
- **Rate Limit**: 100 orders/minute
- **WebSocket Latency**: Real-time (<100ms)

## Notes

- All prices are simulated with realistic variance (2-5% difference between DEXs)
- Transaction hashes are mock 88-character base58 strings
- The system automatically selects the DEX with the better effective price (price + fees)

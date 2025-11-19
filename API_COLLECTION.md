# Postman/Insomnia Collection for Order Execution Engine

## Base URL
```
http://localhost:3000
```

## WebSocket URL
```
ws://localhost:3000/ws?orderId=<ORDER_ID>
```

---

## 1. Health Check

**GET** `/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-19T10:30:00.000Z",
  "queue": {
    "waiting": 0,
    "active": 2,
    "completed": 15,
    "failed": 1
  }
}
```

---

## 2. Submit Market Order (SOL -> USDC)

**POST** `/api/orders/execute`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "orderType": "MARKET",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 1.5
}
```

**Response (201):**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Order received and queued for execution"
}
```

---

## 3. Get Order Status

**GET** `/api/orders/:orderId`

**Example:**
```
GET /api/orders/550e8400-e29b-41d4-a716-446655440000
```

**Response (200):**
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
    "price": 25.6234,
    "fee": 0.003,
    "effectivePrice": 25.7002,
    "liquidity": 3500000,
    "priceImpact": 0.0035,
    "timestamp": "2025-11-19T10:30:01.000Z"
  },
  "meteoraQuote": {
    "dex": "METEORA",
    "price": 25.4890,
    "fee": 0.002,
    "effectivePrice": 25.5400,
    "liquidity": 2800000,
    "priceImpact": 0.0028,
    "timestamp": "2025-11-19T10:30:01.100Z"
  },
  "routingDecision": {
    "selectedDex": "METEORA",
    "reason": "METEORA offers better price by 0.62%",
    "raydiumPrice": 25.7002,
    "meteoraPrice": 25.5400,
    "priceDifference": 0.1602,
    "priceDifferencePercent": 0.62
  },
  "executedPrice": 25.5145,
  "amountOut": 38.2718,
  "txHash": "5vK3mG7HdK8h9NpqRsT4VwX2uJ6fL1yB9cE4hM8nP3sQ7tW2xZ5aK9mN1oR6uY8bC3",
  "retryCount": 0,
  "createdAt": "2025-11-19T10:30:00.000Z",
  "updatedAt": "2025-11-19T10:30:05.500Z",
  "completedAt": "2025-11-19T10:30:05.500Z"
}
```

---

## 4. WebSocket Connection for Real-time Updates

**Connect:**
```
ws://localhost:3000/ws?orderId=550e8400-e29b-41d4-a716-446655440000
```

**Messages Received:**

1. **Connected:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Connected to order status stream",
  "timestamp": "2025-11-19T10:30:00.000Z"
}
```

2. **Routing:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "routing",
  "message": "Selected METEORA for best price",
  "data": {
    "selectedDex": "METEORA",
    "routingDecision": {
      "selectedDex": "METEORA",
      "reason": "METEORA offers better price by 0.62%",
      "raydiumPrice": 25.7002,
      "meteoraPrice": 25.5400,
      "priceDifference": 0.1602,
      "priceDifferencePercent": 0.62
    }
  },
  "timestamp": "2025-11-19T10:30:01.200Z"
}
```

3. **Building:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "building",
  "message": "Creating transaction",
  "timestamp": "2025-11-19T10:30:01.300Z"
}
```

4. **Submitted:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "submitted",
  "message": "Transaction sent to network",
  "data": {
    "txHash": "5vK3mG7HdK8h9NpqRsT4VwX2uJ6fL1yB9cE4hM8nP3sQ7tW2xZ5aK9mN1oR6uY8bC3"
  },
  "timestamp": "2025-11-19T10:30:04.100Z"
}
```

5. **Confirmed:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "confirmed",
  "message": "Transaction successful",
  "data": {
    "txHash": "5vK3mG7HdK8h9NpqRsT4VwX2uJ6fL1yB9cE4hM8nP3sQ7tW2xZ5aK9mN1oR6uY8bC3",
    "executedPrice": 25.5145,
    "amountOut": 38.2718
  },
  "timestamp": "2025-11-19T10:30:05.500Z"
}
```

---

## 5. Multiple Token Pairs Examples

### RAY -> USDC
```json
{
  "orderType": "MARKET",
  "tokenIn": "RAY",
  "tokenOut": "USDC",
  "amountIn": 100
}
```

### USDC -> USDT
```json
{
  "orderType": "MARKET",
  "tokenIn": "USDC",
  "tokenOut": "USDT",
  "amountIn": 1000
}
```

### MNGO -> USDC
```json
{
  "orderType": "MARKET",
  "tokenIn": "MNGO",
  "tokenOut": "USDC",
  "amountIn": 5000
}
```

---

## Error Responses

### 400 - Bad Request (Missing Fields)
```json
{
  "error": "Missing required fields: orderType, tokenIn, tokenOut, amountIn"
}
```

### 400 - Invalid Order Type
```json
{
  "error": "Only MARKET orders are currently supported"
}
```

### 404 - Order Not Found
```json
{
  "error": "Order not found"
}
```

### 500 - Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Database connection failed"
}
```

---

## Testing Multiple Concurrent Orders

Submit 3-5 orders simultaneously to test queue processing:

```bash
# Terminal 1
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{"orderType":"MARKET","tokenIn":"SOL","tokenOut":"USDC","amountIn":1.0}'

# Terminal 2
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{"orderType":"MARKET","tokenIn":"SOL","tokenOut":"USDC","amountIn":2.0}'

# Terminal 3
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{"orderType":"MARKET","tokenIn":"RAY","tokenOut":"USDC","amountIn":100}'
```

Watch the logs to see DEX routing decisions and queue processing!

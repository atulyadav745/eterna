# Order Execution Engine

Backend service for processing cryptocurrency orders with DEX routing (Raydium vs Meteora) and real-time WebSocket updates.

## 🎯 Order Type Selection

**Chosen Order Type: MARKET ORDERS**

### Why Market Orders?
- **Immediate execution**: Best for demonstrating DEX routing logic without complex conditions
- **Simpler implementation**: Focus on core architecture (routing, queue, WebSocket) rather than price monitoring
- **Real-world relevance**: Most common order type in trading systems

### Extension Path for Other Order Types
1. **Limit Orders**: Add a price monitoring service that continuously checks current market prices against target prices. When condition is met, trigger the same execution flow as market orders.
2. **Sniper Orders**: Implement token launch detection using Solana program logs or Raydium/Meteora pool creation events. Execute immediately upon detection using the same routing engine.

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/orders/execute
       ↓
┌─────────────────┐
│  Fastify API    │ ← Returns orderId
└────────┬────────┘
         │ Upgrade to WebSocket
         ↓
┌─────────────────┐
│  WebSocket Hub  │ ← Real-time status updates
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   BullMQ Queue  │ ← Order processing queue
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Order Worker   │
└────────┬────────┘
         │
         ├─→ DEX Router (Raydium vs Meteora)
         ├─→ Transaction Builder
         └─→ Database (PostgreSQL + Redis)
```

## 🚀 Features

- ✅ Market order execution with immediate processing
- ✅ DEX routing comparing Raydium and Meteora prices
- ✅ Real-time WebSocket status updates (pending → routing → building → submitted → confirmed)
- ✅ Queue management with 10 concurrent orders, 100/minute rate limit
- ✅ Exponential backoff retry (3 attempts)
- ✅ PostgreSQL for order history, Redis for active orders
- ✅ Mock DEX implementation (configurable for real Solana devnet)

## 📋 Prerequisites

- Node.js 18+ and npm
- Docker & Docker Compose (for Redis and PostgreSQL)
- (Optional) Solana CLI for devnet testing

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd eterna
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work for local development)
```

### 3. Start Database Services

```bash
npm run docker:up
```

This starts Redis and PostgreSQL in Docker containers.

### 4. Run the Application

**Development mode with hot reload:**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

## 🚀 Quick Start

The server starts on `http://localhost:3000`

## 🌐 Deployment

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for step-by-step Render.com deployment instructions.

**Quick Deploy**:
1. Push to GitHub
2. Connect to Render Blueprint
3. Deploy automatically with `render.yaml`

Full guide: [DEPLOYMENT.md](DEPLOYMENT.md)

## 📡 API Documentation

### Submit Order

**Endpoint:** `POST /api/orders/execute`

**Request Body:**
```json
{
  "orderType": "MARKET",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 1.0,
  "slippage": 0.01
}
```

**Response:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Order received and queued"
}
```

### WebSocket Updates

After submitting an order, upgrade the connection to WebSocket to receive real-time updates:

**WebSocket URL:** `ws://localhost:3000/ws?orderId={orderId}`

**Message Format:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "routing",
  "message": "Comparing DEX prices",
  "data": {
    "selectedDex": "METEORA",
    "routingDecision": {
      "raydiumPrice": 0.0251,
      "meteoraPrice": 0.0245,
      "priceDifference": 0.0006,
      "reason": "Meteora offers better price"
    }
  },
  "timestamp": "2025-11-19T10:30:00Z"
}
```

**Status Flow:**
1. `pending` - Order received and queued
2. `routing` - Comparing DEX prices
3. `building` - Creating transaction
4. `submitted` - Transaction sent to network
5. `confirmed` - Transaction successful (includes txHash)
6. `failed` - Error occurred (includes error message)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🐳 Docker Commands

```bash
# Start services
npm run docker:up

# Stop services
npm run docker:down

# View logs
npm run docker:logs
```

## 🔧 Configuration

Key environment variables in `.env`:

- `USE_MOCK_DEX=true` - Use mock implementation (set to `false` for real Solana devnet)
- `QUEUE_CONCURRENCY=10` - Max concurrent orders
- `QUEUE_MAX_RATE=100` - Orders per minute limit
- `MAX_RETRY_ATTEMPTS=3` - Retry attempts for failed orders

## 📊 Design Decisions

1. **FastifyJS**: High-performance web framework with built-in WebSocket support
2. **BullMQ**: Reliable job queue with rate limiting and retry mechanisms
3. **PostgreSQL**: Persistent order history with ACID guarantees
4. **Redis**: Fast active order storage and queue backend
5. **Mock-first approach**: Allows testing full system without blockchain complexity

## 🚢 Deployment

Coming soon - deployment to free hosting platform with public URL.

## 📹 Video Demo

Coming soon - YouTube video demonstrating concurrent orders, WebSocket updates, and DEX routing.

## 📦 Deliverables Status

- [x] Project setup and architecture
- [x] Complete implementation (DEX router, order processing, queue, WebSocket)
- [x] Unit & integration tests (36 tests passing, ≥10 required ✅)
- [x] Postman/Insomnia collection (`postman_collection.json` + API Testing Guide)
- [ ] Deployment to free hosting
- [ ] Video demonstration

## 📝 License

ISC

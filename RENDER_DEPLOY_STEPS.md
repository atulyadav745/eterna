# Render Deployment Steps - Quick Guide

## ⚠️ CRITICAL: Complete These Steps in Order

### Step 1: Create PostgreSQL Database FIRST
1. Go to Render Dashboard → Click **"New +"** → Select **"PostgreSQL"**
2. Settings:
   - **Name**: `eterna-postgres`
   - **Database**: `eterna_orders`
   - **Region**: Oregon (US West)
   - **Plan**: Free
3. Click **"Create Database"**
4. **WAIT** for database to be ready (~2 minutes)
5. **COPY** the **"Internal Database URL"** (looks like `postgresql://user:pass@host/database`)

### Step 2: Deploy Blueprint
1. Go to Render Dashboard → Click **"New +"** → Select **"Blueprint"**
2. Connect your GitHub repo: `atulyadav745/eterna`
3. Branch: `main`
4. **IMPORTANT**: When prompted for `DATABASE_URL`:
   - Paste the Internal Database URL you copied in Step 1
   - Click **"Deploy Blueprint"**

### Step 3: Initialize Database Schema
Once deployed, you need to run the SQL schema:

**Option A: Via Render Shell**
```bash
# In Render Dashboard, go to eterna-postgres → Shell tab
# Paste the contents of init.sql
```

**Option B: Via psql**
```bash
# From your local machine
psql "YOUR_INTERNAL_DATABASE_URL" < init.sql
```

### Step 4: Verify Deployment
1. Check `eterna-api` logs for:
   - ✅ "Database connected successfully"
   - ✅ "Redis connected successfully"  
   - ✅ "Server started"
2. Test health endpoint:
   ```bash
   curl https://eterna-api-XXXXX.onrender.com/health
   ```

## 🔧 What the Blueprint Creates

- ✅ **eterna-api** (Web Service) - Your Node.js API
- ✅ **eterna-redis** (Redis) - Queue backend
- ⚠️ **PostgreSQL must be created manually BEFORE blueprint**

## 📋 Environment Variables Set Automatically

The blueprint configures:
- `NODE_ENV=production`
- `PORT=3000`
- `HOST=0.0.0.0`
- `USE_MOCK_DEX=true`
- `REDIS_HOST` → from eterna-redis
- `REDIS_PORT` → from eterna-redis
- `REDIS_PASSWORD` → from eterna-redis
- `DATABASE_URL` → **YOU MUST PROVIDE THIS**

## ❌ Common Issues

### Issue: "DATABASE_URL environment variable is not set"
**Solution**: You forgot to enter DATABASE_URL during blueprint deployment
- Go to `eterna-api` → Environment → Add `DATABASE_URL`
- Redeploy

### Issue: "Database health check failed"
**Solution**: Database schema not initialized
- Run `init.sql` on your PostgreSQL database

### Issue: "Redis connection refused"
**Solution**: Blueprint didn't create Redis properly
- Manually create Redis: Dashboard → New → Redis
- Name: `eterna-redis`, Plan: Free, Region: Oregon
- Update environment variables in `eterna-api`

## 🎯 Quick Test After Deployment

```bash
# Replace with your actual Render URL
export API_URL="https://eterna-api-XXXXX.onrender.com"

# Health check
curl $API_URL/health

# Create an order
curl -X POST $API_URL/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "orderType": "MARKET",
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amountIn": 1.5
  }'
```

## 📞 If Deployment Still Fails

Check logs in this order:
1. `eterna-api` → Logs (check for specific errors)
2. `eterna-postgres` → Ensure it's "Live"
3. `eterna-redis` → Ensure it's "Live"

Most common cause: Missing `DATABASE_URL` or schema not initialized.

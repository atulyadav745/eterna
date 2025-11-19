# Deployment Guide - Render.com

## 🚀 Quick Deploy to Render

### Prerequisites
- GitHub account
- Render account (free): https://render.com

---

## Step-by-Step Deployment Instructions

### 1️⃣ Push Code to GitHub

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit - Order Execution Engine"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/eterna.git
git branch -M main
git push -u origin main
```

---

### 2️⃣ Create Render Account
1. Go to https://render.com
2. Sign up with GitHub (recommended)
3. Authorize Render to access your repositories

---

### 3️⃣ Deploy Using Blueprint (Automatic)

**Option A: One-Click Deploy with render.yaml**

1. Go to Render Dashboard: https://dashboard.render.com
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml` and create:
   - Web Service (Node.js app)
   - PostgreSQL database
   - Redis instance
5. Click "Apply" and wait for deployment (5-10 minutes)

**Option B: Manual Setup** (if blueprint doesn't work)

Follow steps 4-6 below.

---

### 4️⃣ Create PostgreSQL Database (Manual)

1. Dashboard → "New" → "PostgreSQL"
2. Settings:
   - **Name**: `eterna-postgres`
   - **Database**: `eterna_orders`
   - **Plan**: Free
   - **Region**: Oregon (US West)
3. Click "Create Database"
4. Wait for database to be ready (~2 minutes)
5. **IMPORTANT**: Copy the "Internal Database URL" (starts with `postgresql://`)

---

### 5️⃣ Create Redis Instance (Manual)

1. Dashboard → "New" → "Redis"
2. Settings:
   - **Name**: `eterna-redis`
   - **Plan**: Free
   - **Region**: Oregon (US West)
3. Click "Create Redis"
4. Wait for Redis to be ready (~1 minute)
5. **IMPORTANT**: Copy the "Internal Redis URL"

---

### 6️⃣ Create Web Service (Manual)

1. Dashboard → "New" → "Web Service"
2. Connect your GitHub repository
3. Settings:
   - **Name**: `eterna-api`
   - **Region**: Oregon (US West)
   - **Branch**: `main`
   - **Root Directory**: (leave empty)
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. Click "Advanced" and add environment variables:

```
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
USE_MOCK_DEX=true
QUEUE_CONCURRENCY=10
QUEUE_MAX_RATE=100
MAX_RETRY_ATTEMPTS=3
LOG_LEVEL=info

# Copy from your PostgreSQL database "Internal Database URL"
DATABASE_URL=postgresql://...

# Parse Redis URL and set:
REDIS_HOST=<redis-host-from-internal-url>
REDIS_PORT=<redis-port-from-internal-url>
```

5. Click "Create Web Service"

---

### 7️⃣ Run Database Migration

**After the web service is deployed:**

1. Go to your web service → "Shell" tab
2. Run the following commands:

```bash
# Navigate to app directory
cd /opt/render/project/src

# Run database initialization
psql $DATABASE_URL -f init.sql

# Verify tables were created
psql $DATABASE_URL -c "\dt"
```

You should see:
- `orders` table
- `order_history` table

---

### 8️⃣ Verify Deployment

Your app will be available at: `https://eterna-api.onrender.com`

**Test the health endpoint:**
```bash
curl https://eterna-api.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-19T...",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

**Submit a test order:**
```bash
curl -X POST https://eterna-api.onrender.com/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "orderType": "MARKET",
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amountIn": 1.0
  }'
```

---

## 🔧 Troubleshooting

### Issue: Database connection fails
**Solution**: 
- Check DATABASE_URL is set correctly
- Verify database is in "Available" state
- Check if database is in the same region as web service

### Issue: Redis connection fails
**Solution**:
- Verify REDIS_HOST and REDIS_PORT are correct
- Check Redis is in "Available" state
- Ensure no REDIS_PASSWORD is set (free tier doesn't use passwords)

### Issue: Build fails
**Solution**:
- Check build logs in Render dashboard
- Verify all dependencies are in package.json
- Ensure TypeScript compiles locally: `npm run build`

### Issue: App crashes on start
**Solution**:
- Check logs: Dashboard → Your Service → "Logs" tab
- Verify all environment variables are set
- Check if database migration was run

---

## 📊 Monitoring

### View Logs
1. Dashboard → Your Web Service
2. Click "Logs" tab
3. Filter by time or search for specific events

### Check Metrics
1. Dashboard → Your Web Service
2. Click "Metrics" tab
3. View:
   - CPU usage
   - Memory usage
   - Request count
   - Response times

---

## 🔄 Update Deployment

When you push changes to GitHub:
1. Render automatically detects the push
2. Builds the new version
3. Deploys with zero downtime

To disable auto-deploy:
1. Service Settings → "Auto-Deploy"
2. Toggle off

---

## 💰 Free Tier Limits

- **Web Service**: 750 hours/month (sleeps after 15 min of inactivity)
- **PostgreSQL**: 90 days free, then $7/month
- **Redis**: 90 days free, then $7/month
- **Bandwidth**: 100 GB/month

**Note**: Free services spin down after 15 minutes of inactivity and take ~30 seconds to wake up on first request.

---

## 🎯 Post-Deployment Checklist

- [ ] Health endpoint returns 200 OK
- [ ] Database tables created (orders, order_history)
- [ ] Redis connection working
- [ ] Can submit orders via API
- [ ] WebSocket connections work
- [ ] Check logs for any errors
- [ ] Update README with public URL
- [ ] Test with Postman collection

---

## 📝 Important URLs

After deployment, save these URLs:

```
Web Service: https://eterna-api.onrender.com
Health Check: https://eterna-api.onrender.com/health
API Endpoint: https://eterna-api.onrender.com/api/orders/execute
WebSocket: wss://eterna-api.onrender.com/ws?orderId=<ORDER_ID>
```

---

## 🔐 Security Notes

1. Never commit `.env` file to GitHub
2. Use Render's environment variables for secrets
3. Database and Redis are on internal network (secure by default)
4. HTTPS is automatically enabled

---

## Need Help?

- Render Docs: https://render.com/docs
- Render Community: https://community.render.com
- Project Issues: Create an issue on GitHub

---

**Ready to deploy? Follow the steps above and let me know if you encounter any issues!**

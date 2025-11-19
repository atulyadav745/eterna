# 🚀 Deployment Checklist

## Before You Start

### ✅ Prerequisites Completed
- [ ] All code is working locally
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Server runs: `npm start`
- [ ] Health endpoint works: `curl http://localhost:3000/health`

---

## 📦 Step 1: Prepare Repository

### Initialize Git (if not done)
```bash
git init
git add .
git commit -m "Initial commit - Order Execution Engine"
```

### Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `eterna` (or your choice)
3. Keep it **Public** (required for Render free tier)
4. Don't initialize with README (you already have one)
5. Click "Create repository"

### Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/eterna.git
git branch -M main
git push -u origin main
```

**✅ Verify**: Visit your GitHub repo URL and confirm files are there

---

## 🎯 Step 2: Deploy on Render

### Create Render Account
1. Go to https://render.com
2. Click "Get Started" or "Sign Up"
3. **Sign up with GitHub** (recommended)
4. Authorize Render to access your repositories

**✅ Verify**: You should see Render Dashboard

---

## 🚀 Step 3: Deploy Using Blueprint (Automatic)

### Option A: Blueprint Deploy (Easiest - Do This!)

1. **Open Render Dashboard**: https://dashboard.render.com

2. **Click "New +" button** (top right) → Select **"Blueprint"**

3. **Connect Repository**:
   - Search for your repository: `YOUR_USERNAME/eterna`
   - Click "Connect"

4. **Configure Blueprint**:
   - Render will auto-detect `render.yaml`
   - You'll see 3 services listed:
     - ✅ eterna-api (Web Service)
     - ✅ eterna-postgres (PostgreSQL)
     - ✅ eterna-redis (Redis)
   
5. **Click "Apply"**

6. **Wait for Deployment** (5-10 minutes):
   - PostgreSQL: ~2 minutes
   - Redis: ~1 minute
   - Web Service: ~5 minutes (includes build)

7. **Watch Progress**:
   - You'll see each service being created
   - Check logs for any errors

**✅ Verify**: All 3 services show "Live" status

---

## 🗄️ Step 4: Initialize Database

### After Web Service is Live:

1. **Go to your PostgreSQL database**:
   - Dashboard → Services → `eterna-postgres`

2. **Click "Connect" → "External Connection"**

3. **Copy the PSQL Command** (looks like):
   ```
   PGPASSWORD=xxx psql -h xxx.oregon-postgres.render.com -U eterna_orders_user eterna_orders
   ```

4. **Run locally** (if you have psql installed):
   ```bash
   # Run the copied command, then:
   \i /path/to/eterna/init.sql
   
   # Verify tables created:
   \dt
   ```

### OR Use Render Shell (Easier):

1. **Go to Web Service**: Dashboard → `eterna-api`
2. **Click "Shell" tab**
3. **Run these commands**:
   ```bash
   cd /opt/render/project/src
   
   # Run database initialization
   cat init.sql | psql $DATABASE_URL
   
   # Verify tables
   psql $DATABASE_URL -c "\dt"
   ```

**✅ Verify**: You should see `orders` and `order_history` tables

---

## ✅ Step 5: Verify Deployment

### Get Your Public URL
Your app will be at: `https://eterna-api-xxxx.onrender.com`
(Find it in Dashboard → eterna-api → top of page)

### Test 1: Health Check
```bash
curl https://YOUR-APP-URL.onrender.com/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

### Test 2: Submit Order
```bash
curl -X POST https://YOUR-APP-URL.onrender.com/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "orderType": "MARKET",
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amountIn": 1.0
  }'
```

**Expected Response**:
```json
{
  "orderId": "xxx-xxx-xxx",
  "status": "pending",
  "message": "Order received and queued for execution"
}
```

### Test 3: Get Order Status
```bash
curl https://YOUR-APP-URL.onrender.com/api/orders/YOUR_ORDER_ID
```

### Test 4: WebSocket (Browser Console)
```javascript
const ws = new WebSocket('wss://YOUR-APP-URL.onrender.com/ws?orderId=YOUR_ORDER_ID');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

**✅ Verify**: All tests pass

---

## 📝 Step 6: Update Documentation

### Update README.md
Add your public URL:
```markdown
## 🌐 Live Demo

**API Endpoint**: https://your-app.onrender.com
**Health Check**: https://your-app.onrender.com/health
**WebSocket**: wss://your-app.onrender.com/ws?orderId=<ORDER_ID>
```

### Commit and Push
```bash
git add README.md
git commit -m "Add deployment URL"
git push origin main
```

---

## 🎥 Step 7: Record Video Demo

Now you're ready for Phase 5! See video recording instructions.

---

## ⚠️ Troubleshooting

### Issue: Build fails
**Check**: 
- Dashboard → eterna-api → Logs tab
- Look for TypeScript or dependency errors

**Fix**:
```bash
# Test locally first
npm install
npm run build
```

### Issue: Database connection fails
**Check**:
- Is DATABASE_URL set in environment variables?
- Is PostgreSQL service "Live"?

**Fix**:
- Dashboard → eterna-api → Environment
- Verify DATABASE_URL is set
- Try reconnecting the database

### Issue: Redis connection fails
**Check**:
- Are REDIS_HOST and REDIS_PORT set?
- Is Redis service "Live"?

**Fix**:
- Dashboard → eterna-api → Environment
- Verify Redis variables are correct

### Issue: App crashes on startup
**Check Logs**:
- Dashboard → eterna-api → Logs
- Look for connection errors

**Common Fixes**:
- Re-run database migration
- Check all environment variables
- Restart the web service

---

## 🎉 Success Checklist

- [ ] GitHub repository is public and pushed
- [ ] Render account created and connected
- [ ] All 3 services deployed (Web, PostgreSQL, Redis)
- [ ] Database initialized with init.sql
- [ ] Health endpoint returns 200 OK
- [ ] Can submit test order successfully
- [ ] Order completes and shows routing decision
- [ ] WebSocket connection works
- [ ] README updated with public URL
- [ ] Ready for video recording!

---

## 📞 Need Help?

**If you get stuck:**

1. **Check Render Logs**: Dashboard → Your Service → Logs
2. **Ask Me**: I'm here to help debug any issues
3. **Render Docs**: https://render.com/docs
4. **Render Community**: https://community.render.com

---

**Ready? Start with Step 1! 🚀**

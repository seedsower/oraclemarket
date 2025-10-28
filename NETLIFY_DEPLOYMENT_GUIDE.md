# OracleMarket V2 - Netlify Deployment Guide

Complete guide to deploy your dApp to Netlify with Neon database.

---

## 📋 Prerequisites

- Netlify account (free tier works)
- Neon database account (free tier works)
- GitHub repository (optional but recommended)
- Domain name (optional)

---

## Step 1: Set Up Neon Database

### 1.1 Create Neon Project

1. **Go to**: https://neon.tech
2. **Sign up** or log in
3. **Create a new project**:
   - Project name: `oraclemarket`
   - Region: Choose closest to your users
   - PostgreSQL version: Latest (16)

4. **Copy the connection string**:
   - Click on "Connection Details"
   - Copy the connection string (should look like):
     ```
     postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```

### 1.2 Migrate Database Schema

On your local machine:

```bash
# Set the Neon connection string
export DATABASE_URL="postgresql://user:password@ep-xxxxx.neon.tech/neondb?sslmode=require"

# Run migration
npm run db:migrate

# Or manually:
npx drizzle-kit push
```

You should see:
```
✅ Database schema created successfully!
```

---

## Step 2: Prepare for Deployment

### 2.1 Update Environment Variables

Your `.env.production` should have:

```bash
# Neon Database
DATABASE_URL=postgresql://user:password@ep-xxxxx.neon.tech/neondb?sslmode=require

# Blockchain
BASE_SEPOLIA_RPC=https://sepolia.base.org

# Contract Addresses (Base Sepolia)
ORACLE_TOKEN_ADDRESS=0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836
MARKET_FACTORY_ADDRESS=0x05F36C4B28Ed7bA63465d8A1e3A42919106E3d40
HYBRID_AMM_ADDRESS=0xBb2e5a0CDd8c81fFF755Af3745455Afd50A48055
STAKING_ADDRESS=0x58eD0a8B6F6972d052A405a6B398cDF480B2EA7D
ORDERBOOK_ADDRESS=0x99aA3F52042586bA4E57D72aCc575057F4853A09
TREASURY_ADDRESS=0xa8E97D3A2d64af4037A504835d7EB1788C945e77
GOVERNANCE_ADDRESS=0xb8fE03037Bdf44497589D75DB3B4ed11C9458AAE

# Node
NODE_ENV=production
```

### 2.2 Test Build Locally

```bash
# Clean build
rm -rf client/dist .netlify

# Build project
npm run build

# Verify build output
ls -la client/dist
```

Should see: `index.html`, `assets/`, etc.

---

## Step 3: Deploy to Netlify

### Option A: Deploy via Netlify CLI (Recommended)

#### 3.1 Install Netlify CLI

```bash
npm install -g netlify-cli
```

#### 3.2 Login to Netlify

```bash
netlify login
```

This will open a browser for authentication.

#### 3.3 Initialize Site

```bash
netlify init
```

Choose:
- **Create & configure a new site**
- **Team**: Your team
- **Site name**: oraclemarket (or your preferred name)
- **Build command**: `npm run build`
- **Deploy directory**: `client/dist`
- **Netlify functions folder**: `netlify/functions`

#### 3.4 Set Environment Variables

```bash
# Set DATABASE_URL
netlify env:set DATABASE_URL "postgresql://user:password@ep-xxxxx.neon.tech/neondb?sslmode=require"

# Set other variables
netlify env:set BASE_SEPOLIA_RPC "https://sepolia.base.org"
netlify env:set ORACLE_TOKEN_ADDRESS "0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836"
netlify env:set MARKET_FACTORY_ADDRESS "0x05F36C4B28Ed7bA63465d8A1e3A42919106E3d40"
netlify env:set HYBRID_AMM_ADDRESS "0xBb2e5a0CDd8c81fFF755Af3745455Afd50A48055"
netlify env:set STAKING_ADDRESS "0x58eD0a8B6F6972d052A405a6B398cDF480B2EA7D"
netlify env:set ORDERBOOK_ADDRESS "0x99aA3F52042586bA4E57D72aCc575057F4853A09"
netlify env:set TREASURY_ADDRESS "0xa8E97D3A2d64af4037A504835d7EB1788C945e77"
netlify env:set GOVERNANCE_ADDRESS "0xb8fE03037Bdf44497589D75DB3B4ed11C9458AAE"
netlify env:set NODE_ENV "production"
```

#### 3.5 Deploy

```bash
# Deploy to production
netlify deploy --prod
```

Or use the npm script:
```bash
npm run deploy
```

### Option B: Deploy via Netlify Dashboard

#### 3.1 Push to GitHub

```bash
git add .
git commit -m "Prepare for Netlify deployment"
git push origin main
```

#### 3.2 Connect Repository to Netlify

1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** and authorize
4. Select your repository
5. Configure build settings:
   - **Base directory**: (leave empty)
   - **Build command**: `npm run build`
   - **Publish directory**: `client/dist`
   - **Functions directory**: `netlify/functions`

#### 3.3 Add Environment Variables

In Netlify dashboard:
1. Go to **Site settings** → **Environment variables**
2. Click **"Add a variable"**
3. Add all variables from `.env.production.example`:
   - `DATABASE_URL`
   - `BASE_SEPOLIA_RPC`
   - `ORACLE_TOKEN_ADDRESS`
   - `MARKET_FACTORY_ADDRESS`
   - `HYBRID_AMM_ADDRESS`
   - `STAKING_ADDRESS`
   - `ORDERBOOK_ADDRESS`
   - `TREASURY_ADDRESS`
   - `GOVERNANCE_ADDRESS`
   - `NODE_ENV` = `production`

#### 3.4 Deploy

Click **"Deploy site"** - Netlify will automatically build and deploy.

---

## Step 4: Configure Domain (Optional)

### 4.1 Add Custom Domain

In Netlify dashboard:
1. Go to **Domain management**
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `oraclemarket.com`)
4. Follow DNS configuration instructions

### 4.2 Enable HTTPS

Netlify provides free SSL certificates automatically:
1. Go to **Domain management** → **HTTPS**
2. Click **"Verify DNS configuration"**
3. Click **"Provision certificate"**

Wait a few minutes for the certificate to be issued.

---

## Step 5: Verify Deployment

### 5.1 Check Build Logs

In Netlify dashboard:
1. Go to **Deploys**
2. Click on the latest deploy
3. Check for any errors in the build log

### 5.2 Test Your Site

Visit your Netlify URL (e.g., `https://oraclemarket.netlify.app`)

Test these features:
- ✅ Homepage loads
- ✅ Connect wallet works
- ✅ Markets page shows data
- ✅ Can create a market
- ✅ Trading works
- ✅ Staking works
- ✅ API endpoints respond (`/api/markets`)

### 5.3 Check API Functions

```bash
# Test API endpoint
curl https://your-site.netlify.app/api/markets
```

Should return JSON with markets data.

---

## Step 6: Set Up Continuous Deployment

### 6.1 Enable Auto-Deploy

With GitHub integration:
1. Every push to `main` branch triggers a deploy
2. Pull requests create preview deploys
3. Netlify automatically builds and deploys

### 6.2 Deploy Previews

- Each PR gets a unique preview URL
- Test changes before merging
- Automatic cleanup after merge

---

## Troubleshooting

### Issue: Build Fails

**Check**:
1. Build logs in Netlify dashboard
2. Make sure all dependencies are in `package.json`
3. Test build locally: `npm run build`

**Common fixes**:
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: API Functions Not Working

**Check**:
1. Function logs in Netlify dashboard
2. Environment variables are set correctly
3. DATABASE_URL is accessible from Netlify

**Test function locally**:
```bash
netlify dev
```

### Issue: Database Connection Fails

**Check**:
1. DATABASE_URL is correct and has `?sslmode=require`
2. Neon database is active (not paused)
3. IP allowlist in Neon (if configured)

**Fix**:
- Go to Neon dashboard
- Check connection pooling settings
- Verify database is not in sleep mode

### Issue: Environment Variables Not Loading

**Check**:
1. All variables are set in Netlify dashboard
2. Variable names match exactly (case-sensitive)
3. No extra spaces in values

**Redeploy**:
```bash
netlify deploy --prod --clear-cache
```

### Issue: CORS Errors

**Fix**: Update `netlify/functions/api.ts`:
```typescript
res.header("Access-Control-Allow-Origin", "https://yourdomain.com");
```

---

## Performance Optimization

### 1. Enable Caching

Already configured in `netlify.toml`:
```toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 2. Database Connection Pooling

Neon automatically provides connection pooling. Use the pooled connection string:
```
postgresql://user:password@ep-xxxxx.pooler.neon.tech/neondb?sslmode=require
```

### 3. Netlify Edge Functions (Advanced)

For even faster response times, consider migrating critical API endpoints to Netlify Edge Functions.

---

## Monitoring & Maintenance

### 1. Monitor Logs

In Netlify dashboard:
- **Functions** → View function logs
- **Deploys** → Check build times and status

### 2. Database Monitoring

In Neon dashboard:
- Check connection count
- Monitor storage usage
- Review query performance

### 3. Analytics

Enable Netlify Analytics:
1. Go to **Analytics** in Netlify dashboard
2. Enable analytics ($9/month)
3. View page views, bandwidth, and performance

---

## Costs

### Free Tier Limits

**Netlify**:
- 100GB bandwidth/month
- 300 build minutes/month
- 125k function invocations/month

**Neon**:
- 512 MB storage
- 1 project
- Always-available compute (10 hours/month with auto-pause)

### Upgrade When Needed

**Netlify Pro** ($19/month):
- 400GB bandwidth
- 3,000 build minutes
- 2M function invocations

**Neon Pro** ($20/month):
- 10 GB storage
- Unlimited projects
- Always-available compute

---

## Next Steps After Deployment

1. ✅ **Test all features** on production
2. ✅ **Set up monitoring** and alerts
3. ✅ **Configure custom domain**
4. ✅ **Enable HTTPS**
5. ✅ **Set up backups** for Neon database
6. ✅ **Document API endpoints**
7. ✅ **Create user guides**
8. ✅ **Launch marketing campaign**

---

## Support

- **Netlify Docs**: https://docs.netlify.com
- **Neon Docs**: https://neon.tech/docs
- **Netlify Community**: https://answers.netlify.com
- **Neon Discord**: https://neon.tech/discord

---

## Deployment Checklist

- [ ] Neon database created and migrated
- [ ] Environment variables set in Netlify
- [ ] Build succeeds locally
- [ ] Site deployed to Netlify
- [ ] API functions working
- [ ] Wallet connection works
- [ ] Markets display correctly
- [ ] Trading functionality works
- [ ] Staking functionality works
- [ ] Custom domain configured (optional)
- [ ] HTTPS enabled
- [ ] Monitoring set up
- [ ] Backup strategy in place

---

## 🎉 Congratulations!

Your OracleMarket V2 dApp is now live on Netlify with Neon database!

**Your site**: `https://your-site.netlify.app`

Share your dApp and start trading! 🚀

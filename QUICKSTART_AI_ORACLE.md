# 🤖 AI Oracle Quick Start

## What is it?

An **automated system** that uses Claude AI to resolve prediction markets intelligently - no manual intervention needed.

## How it works

1. **Monitors markets** every 5 minutes
2. **Finds expired markets** (past closing time)
3. **AI analyzes the question** and determines outcome
4. **Resolves on-chain** automatically
5. **Settles positions** for traders

## 🚀 Get Started (3 steps)

### Step 1: Get API Key
1. Go to https://console.anthropic.com
2. Sign up / Sign in
3. Create an API key
4. Copy it

### Step 2: Add to .env
```bash
# Add this line to your .env file
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Step 3: Restart Server
```bash
npm run dev
```

**That's it!** AI Oracle is now active and will resolve markets automatically every 5 minutes.

## 📊 Check Status

```bash
# Check if AI Oracle is enabled
curl http://localhost:5000/api/oracle/status | jq

# View eligible markets
curl http://localhost:5000/api/oracle/status | jq '.markets'
```

## 🎯 Manually Resolve a Market

```bash
curl -X POST http://localhost:5000/api/oracle/resolve/MARKET_ID | jq
```

Replace `MARKET_ID` with the actual market ID from the status endpoint.

## 📝 How AI Makes Decisions

The AI analyzes:
- ✅ Market question and description
- ✅ Closing time and current date
- ✅ Category and context
- ✅ Publicly verifiable information

Returns:
- **YES** (0) - Event happened
- **NO** (1) - Event didn't happen
- **INVALID** (2) - Question unclear

## 💰 Costs

- **API Cost:** ~$0.006-0.01 per resolution
- **Gas Cost:** ~$0.00001 per resolution (Base Sepolia)

Very affordable for automated resolution!

## 🔍 View Logs

Watch the AI Oracle in action:
```bash
# Logs show:
🤖 AI Oracle resolving market: "Will ETH reach $4k..."
🔒 Closing market on-chain...
✅ Market closed
🧠 Consulting AI oracle...
🎯 AI Decision: NO (95% confidence)
⚡ Resolving on-chain...
✅ Market resolved: NO
```

## 🎮 Currently Eligible Markets

**4 markets** are ready for resolution:
1. "will eth reach 4k by the end of today"
2. "economy in usa bust before end of year or"
3. "will you get there today"
4. "will chain id be mareket 4"

Add your API key to resolve them automatically!

## ⚙️ Configuration

### Change Check Interval

Edit `server/index.ts`:
```typescript
aiOracle.startAutoResolution(300000);  // 5 minutes (default)
aiOracle.startAutoResolution(60000);   // 1 minute (faster)
aiOracle.startAutoResolution(600000);  // 10 minutes (slower)
```

## 🚨 Current Status

```
✅ System Implemented
✅ On-Chain Integration
✅ API Endpoints
⚠️  Needs ANTHROPIC_API_KEY
```

**Add your API key to activate!**

## 📚 Full Documentation

- **[AI_ORACLE_GUIDE.md](AI_ORACLE_GUIDE.md)** - Complete guide
- **[AI_ORACLE_IMPLEMENTATION_SUMMARY.md](AI_ORACLE_IMPLEMENTATION_SUMMARY.md)** - Technical details

## 💡 Tips

1. **Start slow** - Test with a few markets first
2. **Monitor logs** - Watch AI decisions for accuracy
3. **Review resolutions** - Check if outcomes are correct
4. **Adjust interval** - Change based on your needs

---

**Ready?** Add your `ANTHROPIC_API_KEY` and let the AI Oracle handle market resolution automatically! 🎉

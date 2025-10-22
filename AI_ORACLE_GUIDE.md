# AI Oracle Automated Market Resolution System

## Overview

The AI Oracle system provides automated, intelligent resolution of prediction markets using Claude (Anthropic) as the decision-making engine. This system monitors markets that have passed their closing time, researches outcomes, and executes on-chain resolutions automatically.

## Architecture

### Components

1. **AIOracle Service** (`server/aiOracle.ts`)
   - Core service that handles market resolution logic
   - Integrates with Claude AI for decision-making
   - Manages on-chain transactions for market resolution
   - Syncs resolution results with the database

2. **Market Monitoring**
   - Automatically checks for expired markets every 5 minutes
   - Identifies markets that have passed their closing time
   - Queues markets for AI resolution

3. **AI Decision Engine**
   - Uses Claude 3.5 Sonnet for intelligent market analysis
   - Researches market outcomes based on question and context
   - Provides confidence scores and detailed reasoning
   - Returns YES, NO, or INVALID outcomes

4. **On-Chain Execution**
   - Closes markets to stop trading
   - Resolves markets with AI-determined outcomes
   - Updates smart contract state
   - Triggers position settlement

## Setup

### 1. Environment Variables

Add to your `.env` file:

```bash
# Required for database
DATABASE_URL=postgresql://postgres:rush2323@localhost:5432/oracle_market

# Required for on-chain transactions
PRIVATE_KEY=your_private_key_here

# Required for AI Oracle functionality
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 2. Get an Anthropic API Key

1. Sign up at [https://console.anthropic.com](https://console.anthropic.com)
2. Navigate to API Keys section
3. Create a new API key
4. Add it to your `.env` file

### 3. Install Dependencies

```bash
npm install @anthropic-ai/sdk
```

## How It Works

### Automated Resolution Flow

```
┌─────────────────────────────────────────┐
│  1. Market Monitoring (Every 5 minutes) │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  2. Identify Expired Markets            │
│     (closing_time < current_time)       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  3. Close Market On-Chain               │
│     (Stop trading)                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  4. AI Analysis with Claude             │
│     • Read market question              │
│     • Consider description & context    │
│     • Research outcome                  │
│     • Determine YES/NO/INVALID          │
│     • Provide confidence & reasoning    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  5. Execute On-Chain Resolution         │
│     • Call resolveMarket()              │
│     • Set outcome (0=YES, 1=NO, 2=INV) │
│     • Trigger position settlement       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  6. Update Database                     │
│     • Mark market as resolved           │
│     • Store outcome & resolution time   │
│     • Update market status              │
└─────────────────────────────────────────┘
```

### AI Decision Process

The AI Oracle uses a structured prompt to analyze each market:

**Input to Claude:**
- Market question
- Description and context
- Category and timeframe
- Current date for verification

**Claude's Analysis:**
- Determines if the event occurred
- Evaluates based on publicly verifiable information
- Considers the exact wording of the question
- Assesses whether resolution is possible

**Output Structure:**
```json
{
  "outcome": "yes" | "no" | "invalid",
  "confidence": 85,
  "reasoning": "Detailed explanation of the decision...",
  "sources": ["source1", "source2", ...]
}
```

## API Endpoints

### Get Oracle Status
```bash
GET /api/oracle/status
```

Returns:
```json
{
  "enabled": true,
  "hasAPIKey": true,
  "hasWallet": true,
  "eligibleMarkets": 3,
  "markets": [
    {
      "id": "market-id",
      "chainId": 12,
      "question": "Will ETH reach $4k by end of today?",
      "closingTime": "2025-10-12T19:03:00Z"
    }
  ]
}
```

### Manually Resolve Market
```bash
POST /api/oracle/resolve/:marketId
```

Triggers immediate AI oracle resolution for a specific market.

Returns:
```json
{
  "message": "Market resolution initiated",
  "market": {
    "id": "market-id",
    "status": "resolved",
    "resolvedOutcome": 0,
    "resolutionTime": "2025-10-12T23:45:00Z"
  }
}
```

## Market Resolution Outcomes

### Outcome Mapping

| Outcome | Value | Description |
|---------|-------|-------------|
| YES     | 0     | The event described in the question occurred |
| NO      | 1     | The event did NOT occur OR deadline passed |
| INVALID | 2     | Question is ambiguous or unverifiable |

### When Each Outcome is Used

**YES Resolution:**
- The event clearly occurred as described
- Outcome is publicly verifiable
- Evidence supports affirmative resolution

**NO Resolution:**
- The event definitively did not occur
- Deadline passed without event occurring
- Evidence shows negative outcome

**INVALID Resolution:**
- Question is ambiguous or poorly worded
- Outcome cannot be verified objectively
- Market contains errors preventing resolution
- Multiple interpretations of the question exist

## Configuration

### Resolution Check Interval

Default: Every 5 minutes (300000ms)

Modify in `server/index.ts`:
```typescript
aiOracle.startAutoResolution(300000); // 5 minutes
```

Options:
- 60000 = 1 minute
- 300000 = 5 minutes (recommended)
- 600000 = 10 minutes
- 1800000 = 30 minutes

### AI Model Settings

The system uses Claude 3.5 Sonnet with these parameters:

```typescript
{
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 2000,
  temperature: 0.3  // Low temperature for consistent decisions
}
```

## Testing

### Check Oracle Status

```bash
curl http://localhost:5000/api/oracle/status | jq
```

### Manually Resolve a Market

```bash
curl -X POST http://localhost:5000/api/oracle/resolve/MARKET_ID | jq
```

### View Eligible Markets

Query markets past their closing time:

```sql
SELECT id, question, status, closing_time, chain_id
FROM markets
WHERE status = 'active'
  AND closing_time < NOW()
ORDER BY closing_time ASC;
```

## Monitoring & Logs

The AI Oracle provides detailed console logs:

```
🤖 AI Oracle resolving market: "Will ETH reach $4k by end of today?"
   Market ID: abc-123 | Chain ID: 17
🔒 Closing market on-chain...
✅ Market closed on-chain. Tx: 0x...
🧠 Consulting AI oracle for decision...
🎯 AI Decision: NO
   Confidence: 95%
   Reasoning: ETH closed at $3,245 on the specified date...
⚡ Resolving market on-chain with outcome: no (1)...
✅ Market resolved on-chain. Tx: 0x...
✅ Market abc-123 resolved: NO
```

## Security Considerations

### Private Key Security
- Never commit PRIVATE_KEY to version control
- Use environment variables or secure key management
- Consider using a dedicated oracle wallet with limited funds

### AI Oracle Accuracy
- The AI makes best-effort decisions based on available information
- For high-value markets, consider adding a dispute period
- Monitor resolution decisions for accuracy
- Implement human oversight for critical markets

### Rate Limiting
- Built-in 2-second delay between consecutive resolutions
- Anthropic API has rate limits - monitor usage
- Consider implementing exponential backoff for failures

## Costs

### API Costs
- Claude 3.5 Sonnet: ~$3 per million input tokens, ~$15 per million output tokens
- Average resolution: ~500 input tokens + ~300 output tokens
- Estimated cost per resolution: $0.006 - $0.01

### Gas Costs
- Close market: ~50,000 gas
- Resolve market: ~70,000 gas
- At 0.01 gwei Base Sepolia: ~$0.00001 per resolution

## Troubleshooting

### AI Oracle Not Starting

Check logs for:
```
⚠️ AI Oracle running without ANTHROPIC_API_KEY - AI resolution disabled
```

Solution: Add ANTHROPIC_API_KEY to `.env`

### On-Chain Resolution Failing

Check logs for:
```
⚠️ No PRIVATE_KEY found - on-chain resolution disabled
```

Solution: Add PRIVATE_KEY to `.env`

### Markets Not Being Resolved

1. Check if markets have `chainId` set
2. Verify `closing_time` has passed
3. Check market status is `active` or `closed`
4. Review server logs for errors

## Future Enhancements

- [ ] Add dispute mechanism for incorrect resolutions
- [ ] Implement confidence threshold for automatic resolution
- [ ] Add web search capability for real-time data
- [ ] Create admin dashboard for oracle oversight
- [ ] Add multi-source verification for critical markets
- [ ] Implement resolution appeal process
- [ ] Add detailed resolution history tracking

## Support

For issues or questions:
1. Check server logs for error messages
2. Verify all environment variables are set
3. Test API endpoints manually
4. Review market eligibility criteria

---

**Note:** The AI Oracle is designed to work autonomously but should be monitored, especially in the early stages. Always review resolutions for accuracy and adjust the system as needed.

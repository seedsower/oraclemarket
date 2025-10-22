import { Address } from "viem";

export const BASE_SEPOLIA_CHAIN_ID = 84532;

export const CONTRACTS = {
  OracleToken: "0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836" as Address,
  MarketFactory: "0x05F36C4B28Ed7bA63465d8A1e3A42919106E3d40" as Address,
  HybridAMM: "0xBb2e5a0CDd8c81fFF755Af3745455Afd50A48055" as Address,
  Staking: "0x58eD0a8B6F6972d052A405a6B398cDF480B2EA7D" as Address,
  OrderBook: "0x99aA3F52042586bA4E57D72aCc575057F4853A09" as Address,
  Treasury: "0xa8E97D3A2d64af4037A504835d7EB1788C945e77" as Address,
  Governance: "0xb8fE03037Bdf44497589D75DB3B4ed11C9458AAE" as Address,
  MockUSDC: "0x3fcF28B436f16d08dc1e64E90c93833edd1ba0A1" as Address,
} as const;

export const OracleTokenABI = [
  {
    inputs: [
      { name: "account", type: "address" },
    ],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const MockUSDCABI = OracleTokenABI;

export const MarketFactoryABI = [
  {
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "title", type: "string", indexed: false },
      { name: "category", type: "string", indexed: false },
      { name: "endTime", type: "uint256", indexed: false },
      { name: "initialLiquidity", type: "uint256", indexed: false },
    ],
    name: "MarketCreated",
    type: "event",
  },
  {
    inputs: [
      { name: "title", type: "string" },
      { name: "description", type: "string" },
      { name: "category", type: "string" },
      { name: "endTime", type: "uint256" },
      { name: "initialLiquidity", type: "uint256" },
    ],
    name: "createMarket",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "marketId", type: "uint256" }],
    name: "getMarket",
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "creator", type: "address" },
          { name: "title", type: "string" },
          { name: "description", type: "string" },
          { name: "category", type: "string" },
          { name: "createdAt", type: "uint256" },
          { name: "endTime", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "totalVolume", type: "uint256" },
          { name: "liquidity", type: "uint256" },
          { name: "resolvedOutcome", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "marketCounter",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllMarketIds",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "creator", type: "address" }],
    name: "getCreatorMarkets",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "marketId", type: "uint256" }],
    name: "closeMarket",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome", type: "uint256" },
    ],
    name: "resolveMarket",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "MARKET_CREATION_FEE",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MIN_INITIAL_LIQUIDITY",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isInitialized",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "oracleToken",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "hybridAMM",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const HybridAMMABI = [
  {
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "buyer", type: "address", indexed: true },
      { name: "outcome", type: "uint256", indexed: false },
      { name: "shares", type: "uint256", indexed: false },
      { name: "cost", type: "uint256", indexed: false },
    ],
    name: "SharesPurchased",
    type: "event",
  },
  {
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "seller", type: "address", indexed: true },
      { name: "outcome", type: "uint256", indexed: false },
      { name: "shares", type: "uint256", indexed: false },
      { name: "payout", type: "uint256", indexed: false },
    ],
    name: "SharesSold",
    type: "event",
  },
  {
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    name: "buy",
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome", type: "uint256" },
      { name: "shares", type: "uint256" },
    ],
    name: "sell",
    outputs: [{ name: "payout", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    name: "getBuyPrice",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome", type: "uint256" },
      { name: "shares", type: "uint256" },
    ],
    name: "getSellPrice",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome", type: "uint256" },
    ],
    name: "getPrice",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const StakingABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claimRewards",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "getStakedAmount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "getPendingRewards",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "getUserTier",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const GovernanceABI = [
  {
    inputs: [
      { name: "title", type: "string" },
      { name: "description", type: "string" },
    ],
    name: "createProposal",
    outputs: [{ name: "proposalId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "bool" },
    ],
    name: "vote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "proposalId", type: "uint256" }],
    name: "getProposal",
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "title", type: "string" },
          { name: "description", type: "string" },
          { name: "proposer", type: "address" },
          { name: "forVotes", type: "uint256" },
          { name: "againstVotes", type: "uint256" },
          { name: "status", type: "uint8" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getProposalCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const OrderBookABI = [
  {
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "isBuy", type: "bool" },
    ],
    name: "placeOrder",
    outputs: [{ name: "orderId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "orderId", type: "uint256" }],
    name: "cancelOrder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome", type: "uint256" },
    ],
    name: "getOrderBook",
    outputs: [
      { name: "buyOrders", type: "uint256[]" },
      { name: "sellOrders", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

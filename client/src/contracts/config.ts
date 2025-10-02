import { Address } from "viem";

export const BASE_SEPOLIA_CHAIN_ID = 84532;

export const CONTRACTS = {
  OracleToken: "0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836" as Address,
  MarketFactory: "0xEB5546fc9d78188a1d905F9fa54957a42f43ed8c" as Address,
  HybridAMM: "0xB9d59Eb5F16Cf8660fc8855cF64Dfb1c2dB76E7F" as Address,
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
      { name: "question", type: "string" },
      { name: "description", type: "string" },
      { name: "outcomes", type: "string[]" },
      { name: "closingTime", type: "uint256" },
      { name: "resolutionSource", type: "string" },
    ],
    name: "createMarket",
    outputs: [{ name: "marketId", type: "uint256" }],
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
          { name: "question", type: "string" },
          { name: "description", type: "string" },
          { name: "creator", type: "address" },
          { name: "outcomes", type: "string[]" },
          { name: "closingTime", type: "uint256" },
          { name: "status", type: "uint8" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getMarketCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "markets",
    outputs: [
      { name: "id", type: "uint256" },
      { name: "question", type: "string" },
      { name: "description", type: "string" },
      { name: "creator", type: "address" },
      { name: "closingTime", type: "uint256" },
      { name: "status", type: "uint8" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const HybridAMMABI = [
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

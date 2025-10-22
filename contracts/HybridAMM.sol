// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title HybridAMM
 * @notice Automated Market Maker for prediction markets using LMSR algorithm
 * @dev Manages liquidity pools and pricing for binary outcome markets
 */
contract HybridAMM is Ownable, ReentrancyGuard {
    IERC20 public oracleToken;
    address public marketFactory;

    // LMSR parameter (liquidity sensitivity)
    uint256 public constant LIQUIDITY_PARAM = 100;

    // Fee: 2% = 200 basis points
    uint256 public constant FEE_BASIS_POINTS = 200;
    uint256 public constant BASIS_POINTS = 10000;

    struct Pool {
        uint256 marketId;
        uint256 yesShares;
        uint256 noShares;
        uint256 liquidity;
        bool exists;
    }

    mapping(uint256 => Pool) public pools;
    mapping(uint256 => mapping(address => uint256)) public yesBalances;
    mapping(uint256 => mapping(address => uint256)) public noBalances;

    event PoolCreated(uint256 indexed marketId, uint256 initialLiquidity);
    event SharesPurchased(
        uint256 indexed marketId,
        address indexed buyer,
        uint256 outcome,
        uint256 shares,
        uint256 cost
    );
    event SharesSold(
        uint256 indexed marketId,
        address indexed seller,
        uint256 outcome,
        uint256 shares,
        uint256 payout
    );

    constructor(address _oracleToken) Ownable(msg.sender) {
        require(_oracleToken != address(0), "Invalid token");
        oracleToken = IERC20(_oracleToken);
    }

    /**
     * @notice Set the MarketFactory address (only callable by owner)
     */
    function setMarketFactory(address _marketFactory) external onlyOwner {
        require(_marketFactory != address(0), "Invalid factory");
        marketFactory = _marketFactory;
    }

    /**
     * @notice Create a new AMM pool for a market
     * @param marketId The market ID
     * @param initialLiquidity Initial liquidity in ORACLE tokens
     */
    function createMarketPool(uint256 marketId, uint256 initialLiquidity) external {
        require(msg.sender == marketFactory, "Only factory");
        require(!pools[marketId].exists, "Pool exists");
        require(initialLiquidity > 0, "Need liquidity");

        // Initialize pool with equal shares
        uint256 initialShares = initialLiquidity / 2;

        pools[marketId] = Pool({
            marketId: marketId,
            yesShares: initialShares,
            noShares: initialShares,
            liquidity: initialLiquidity,
            exists: true
        });

        emit PoolCreated(marketId, initialLiquidity);
    }

    /**
     * @notice Buy shares of a specific outcome
     * @param marketId The market ID
     * @param outcome 0 for No, 1 for Yes
     * @param amount Amount of ORACLE tokens to spend
     * @return shares Number of shares received
     */
    function buy(
        uint256 marketId,
        uint256 outcome,
        uint256 amount
    ) external nonReentrant returns (uint256 shares) {
        require(pools[marketId].exists, "Pool not found");
        require(outcome <= 1, "Invalid outcome");
        require(amount > 0, "Amount required");

        Pool storage pool = pools[marketId];

        // Calculate shares based on constant product formula
        // For simplicity: shares = amount / currentPrice
        uint256 price = getPrice(marketId, outcome);
        require(price > 0, "Invalid price");

        shares = (amount * 1e18) / price;

        // Apply fee
        uint256 fee = (amount * FEE_BASIS_POINTS) / BASIS_POINTS;
        uint256 amountAfterFee = amount - fee;

        // Transfer tokens from buyer
        require(
            oracleToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        // Update pool
        if (outcome == 1) {
            pool.yesShares += shares;
            yesBalances[marketId][msg.sender] += shares;
        } else {
            pool.noShares += shares;
            noBalances[marketId][msg.sender] += shares;
        }

        pool.liquidity += amountAfterFee;

        emit SharesPurchased(marketId, msg.sender, outcome, shares, amount);
    }

    /**
     * @notice Sell shares of a specific outcome
     * @param marketId The market ID
     * @param outcome 0 for No, 1 for Yes
     * @param shares Number of shares to sell
     * @return payout Amount of ORACLE tokens received
     */
    function sell(
        uint256 marketId,
        uint256 outcome,
        uint256 shares
    ) external nonReentrant returns (uint256 payout) {
        require(pools[marketId].exists, "Pool not found");
        require(outcome <= 1, "Invalid outcome");
        require(shares > 0, "Shares required");

        Pool storage pool = pools[marketId];

        // Check user has enough shares
        if (outcome == 1) {
            require(yesBalances[marketId][msg.sender] >= shares, "Insufficient yes shares");
        } else {
            require(noBalances[marketId][msg.sender] >= shares, "Insufficient no shares");
        }

        // Calculate payout
        uint256 price = getPrice(marketId, outcome);
        payout = (shares * price) / 1e18;

        // Apply fee
        uint256 fee = (payout * FEE_BASIS_POINTS) / BASIS_POINTS;
        payout = payout - fee;

        require(payout <= pool.liquidity, "Insufficient liquidity");

        // Update pool
        if (outcome == 1) {
            pool.yesShares -= shares;
            yesBalances[marketId][msg.sender] -= shares;
        } else {
            pool.noShares -= shares;
            noBalances[marketId][msg.sender] -= shares;
        }

        pool.liquidity -= payout;

        // Transfer payout to seller
        require(oracleToken.transfer(msg.sender, payout), "Transfer failed");

        emit SharesSold(marketId, msg.sender, outcome, shares, payout);
    }

    /**
     * @notice Get current price for an outcome
     * @param marketId The market ID
     * @param outcome 0 for No, 1 for Yes
     * @return price Current price in ORACLE tokens (18 decimals)
     */
    function getPrice(uint256 marketId, uint256 outcome) public view returns (uint256) {
        require(pools[marketId].exists, "Pool not found");
        require(outcome <= 1, "Invalid outcome");

        Pool memory pool = pools[marketId];

        if (pool.yesShares == 0 || pool.noShares == 0) {
            return 0.5e18; // Default 50% probability
        }

        // Simple constant product pricing: p = noShares / (yesShares + noShares)
        uint256 totalShares = pool.yesShares + pool.noShares;

        if (outcome == 1) {
            // Yes price
            return (pool.noShares * 1e18) / totalShares;
        } else {
            // No price
            return (pool.yesShares * 1e18) / totalShares;
        }
    }

    /**
     * @notice Get estimated cost to buy a specific amount of shares
     * @param marketId The market ID
     * @param outcome 0 for No, 1 for Yes
     * @param shares Desired number of shares
     * @return cost Estimated cost in ORACLE tokens
     */
    function getBuyPrice(
        uint256 marketId,
        uint256 outcome,
        uint256 shares
    ) external view returns (uint256) {
        uint256 price = getPrice(marketId, outcome);
        uint256 cost = (shares * price) / 1e18;

        // Add fee
        uint256 fee = (cost * FEE_BASIS_POINTS) / BASIS_POINTS;
        return cost + fee;
    }

    /**
     * @notice Get estimated payout for selling specific shares
     * @param marketId The market ID
     * @param outcome 0 for No, 1 for Yes
     * @param shares Number of shares to sell
     * @return payout Estimated payout in ORACLE tokens
     */
    function getSellPrice(
        uint256 marketId,
        uint256 outcome,
        uint256 shares
    ) external view returns (uint256) {
        uint256 price = getPrice(marketId, outcome);
        uint256 payout = (shares * price) / 1e18;

        // Subtract fee
        uint256 fee = (payout * FEE_BASIS_POINTS) / BASIS_POINTS;
        return payout - fee;
    }

    /**
     * @notice Get user's share balance for a market
     * @param marketId The market ID
     * @param user User address
     * @return yesShares User's yes shares
     * @return noShares User's no shares
     */
    function getUserShares(uint256 marketId, address user)
        external
        view
        returns (uint256 yesShares, uint256 noShares)
    {
        return (yesBalances[marketId][user], noBalances[marketId][user]);
    }

    /**
     * @notice Check if pool exists for a market
     * @param marketId The market ID
     * @return exists True if pool exists
     */
    function poolExists(uint256 marketId) external view returns (bool) {
        return pools[marketId].exists;
    }
}

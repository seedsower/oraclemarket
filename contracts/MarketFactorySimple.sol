// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IOracleToken is IERC20 {
    function burn(uint256 amount) external;
}

/**
 * @title MarketFactorySimple
 * @notice Simplified factory for creating prediction markets without HybridAMM dependency
 * @dev This version doesn't create AMM pools - trading happens through external systems
 */
contract MarketFactorySimple is Ownable, ReentrancyGuard, Pausable {
    IOracleToken public oracleToken;
    address public oracleResolver;

    uint256 public constant MARKET_CREATION_FEE = 10 * 10**18; // 10 ORACLE tokens
    uint256 public marketCounter;

    bool private initialized;

    enum MarketStatus { ACTIVE, CLOSED, RESOLVED, INVALID }

    struct Market {
        uint256 id;
        address creator;
        string title;
        string description;
        string category;
        uint256 createdAt;
        uint256 endTime;
        MarketStatus status;
        uint256 totalVolume;
        uint256 liquidity;
        uint256 resolvedOutcome;
    }

    mapping(uint256 => Market) public markets;
    mapping(address => uint256[]) public creatorMarkets;
    uint256[] public allMarketIds;

    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        string title,
        string category,
        uint256 endTime,
        uint256 initialLiquidity
    );
    event MarketClosed(uint256 indexed marketId);
    event MarketResolved(uint256 indexed marketId, uint256 outcome);
    event MarketInvalidated(uint256 indexed marketId, string reason);
    event Initialized(address oracleToken, address oracleResolver);

    constructor() Ownable(msg.sender) {
        // Empty constructor - use initialize() after deployment
    }

    /**
     * @notice Initialize the contract with required addresses
     * @dev Can only be called once by owner
     * @param _oracleToken Address of the ORACLE token contract
     * @param _oracleResolver Address of the oracle resolver contract
     */
    function initialize(
        address _oracleToken,
        address _oracleResolver
    ) external onlyOwner {
        require(!initialized, "Already initialized");
        require(_oracleToken != address(0), "Invalid oracle token");
        require(_oracleResolver != address(0), "Invalid oracle resolver");

        oracleToken = IOracleToken(_oracleToken);
        oracleResolver = _oracleResolver;
        initialized = true;

        emit Initialized(_oracleToken, _oracleResolver);
    }

    /**
     * @notice Create a new prediction market
     * @dev Requires approval of MARKET_CREATION_FEE ORACLE tokens
     * @param title The market question/title
     * @param description Additional market details
     * @param category Market category (Politics, Sports, Crypto, etc.)
     * @param endTime Unix timestamp when trading ends
     * @param initialLiquidity Amount for initial liquidity (accepted but not used in simple version)
     * @return marketId The ID of the newly created market
     */
    function createMarket(
        string memory title,
        string memory description,
        string memory category,
        uint256 endTime,
        uint256 initialLiquidity
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(initialized, "Not initialized");
        require(bytes(title).length > 0, "Title required");
        require(bytes(category).length > 0, "Category required");
        require(endTime > block.timestamp, "Invalid end time");

        // Transfer creation fee to contract and burn it
        require(
            oracleToken.transferFrom(msg.sender, address(this), MARKET_CREATION_FEE),
            "Fee transfer failed"
        );
        oracleToken.burn(MARKET_CREATION_FEE);

        // Note: In this simple version, initialLiquidity is accepted but not used
        // Markets can still function without AMM pools

        uint256 marketId = marketCounter++;

        Market storage market = markets[marketId];
        market.id = marketId;
        market.creator = msg.sender;
        market.title = title;
        market.description = description;
        market.category = category;
        market.createdAt = block.timestamp;
        market.endTime = endTime;
        market.status = MarketStatus.ACTIVE;
        market.liquidity = initialLiquidity; // Store for reference

        creatorMarkets[msg.sender].push(marketId);
        allMarketIds.push(marketId);

        emit MarketCreated(marketId, msg.sender, title, category, endTime, initialLiquidity);

        return marketId;
    }

    /**
     * @notice Close a market (automatically or manually by owner)
     * @param marketId The ID of the market to close
     */
    function closeMarket(uint256 marketId) external {
        Market storage market = markets[marketId];
        require(market.creator != address(0), "Market not found");
        require(market.status == MarketStatus.ACTIVE, "Not active");
        require(
            block.timestamp >= market.endTime || msg.sender == owner(),
            "Not closing time"
        );

        market.status = MarketStatus.CLOSED;
        emit MarketClosed(marketId);
    }

    /**
     * @notice Resolve a market with the winning outcome
     * @param marketId The ID of the market to resolve
     * @param outcome The winning outcome (0 for No, 1 for Yes in binary markets)
     */
    function resolveMarket(uint256 marketId, uint256 outcome) external {
        require(msg.sender == owner() || msg.sender == oracleResolver, "Not authorized");
        Market storage market = markets[marketId];
        require(market.creator != address(0), "Market not found");
        require(market.status == MarketStatus.CLOSED, "Not closed");
        require(outcome <= 1, "Invalid outcome"); // Binary markets: 0 or 1

        market.status = MarketStatus.RESOLVED;
        market.resolvedOutcome = outcome;

        emit MarketResolved(marketId, outcome);
    }

    /**
     * @notice Invalidate a market (refunds all participants)
     * @param marketId The ID of the market to invalidate
     * @param reason Human-readable reason for invalidation
     */
    function invalidateMarket(uint256 marketId, string memory reason) external onlyOwner {
        Market storage market = markets[marketId];
        require(market.creator != address(0), "Market not found");
        require(market.status != MarketStatus.INVALID, "Already invalid");

        market.status = MarketStatus.INVALID;
        emit MarketInvalidated(marketId, reason);
    }

    /**
     * @notice Get market details
     * @param marketId The ID of the market
     * @return Market struct with all market data
     */
    function getMarket(uint256 marketId) external view returns (Market memory) {
        require(markets[marketId].creator != address(0), "Market not found");
        return markets[marketId];
    }

    /**
     * @notice Get all market IDs created by a specific address
     * @param creator The address of the market creator
     * @return Array of market IDs
     */
    function getCreatorMarkets(address creator) external view returns (uint256[] memory) {
        return creatorMarkets[creator];
    }

    /**
     * @notice Get all market IDs in the system
     * @return Array of all market IDs
     */
    function getAllMarketIds() external view returns (uint256[] memory) {
        return allMarketIds;
    }

    /**
     * @notice Update the oracle resolver address
     * @param newResolver New oracle resolver address
     */
    function setOracleResolver(address newResolver) external onlyOwner {
        require(newResolver != address(0), "Invalid resolver");
        oracleResolver = newResolver;
    }

    /**
     * @notice Pause market creation in emergency
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause market creation
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Check if contract is initialized
     */
    function isInitialized() external view returns (bool) {
        return initialized;
    }
}

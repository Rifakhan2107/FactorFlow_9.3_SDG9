// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CarbonCreditNFT
 * @dev ERC-721 NFT representing verified carbon credits. Each token has metadata
 * (project details, tCO2e volume, verification proof) and can be listed, bought, and retired.
 */
contract CarbonCreditNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId;

    /// @dev Minter role - only this address can mint new carbon credit NFTs
    address public minter;

    /// @dev tokenId => listing price in wei (0 = not listed)
    mapping(uint256 => uint256) public listingPrice;

    /// @dev tokenId => retired (true = used for offset, non-transferable)
    mapping(uint256 => bool) public retired;

    /// @dev tokenId => project ID (off-chain reference)
    mapping(uint256 => string) public projectIdOf;

    /// @dev tokenId => volume in tCO2e (stored on-chain for filters)
    mapping(uint256 => uint256) public volumeTCO2eOf;

    /// @dev tokenId => verification proof hash
    mapping(uint256 => bytes32) public verificationProofOf;

    event Listed(uint256 indexed tokenId, address indexed seller, uint256 priceWei);
    event Unlisted(uint256 indexed tokenId, address indexed seller);
    event Sold(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 priceWei);
    event Retired(uint256 indexed tokenId, address indexed retirer);

    error NotMinter();
    error NotListed();
    error InsufficientPayment();
    error NotTokenOwner();
    error AlreadyRetired();
    error TokenRetired();

    modifier onlyMinter() {
        if (msg.sender != minter && msg.sender != owner()) revert NotMinter();
        _;
    }

    constructor(address _minter) ERC721("CarbonCreditNFT", "CCNFT") Ownable(msg.sender) {
        minter = _minter;
    }

    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }

    /**
     * @dev Mint a new carbon credit NFT. Only callable by minter (platform/seller).
     * @param to Initial owner (seller)
     * @param tokenURI Metadata URI (project details, images, verification)
     * @param projectId Off-chain project ID
     * @param volumeTCO2e Volume in tonnes CO2e
     * @param verificationProofHash Hash of verification proof
     */
    function mint(
        address to,
        string calldata tokenURI,
        string calldata projectId,
        uint256 volumeTCO2e,
        bytes32 verificationProofHash
    ) external onlyMinter returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        projectIdOf[tokenId] = projectId;
        volumeTCO2eOf[tokenId] = volumeTCO2e;
        verificationProofOf[tokenId] = verificationProofHash;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        return tokenId;
    }

    /**
     * @dev List token for sale. Only owner can list.
     */
    function list(uint256 tokenId, uint256 priceWei) external {
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (retired[tokenId]) revert TokenRetired();
        listingPrice[tokenId] = priceWei;
        emit Listed(tokenId, msg.sender, priceWei);
    }

    /**
     * @dev Remove listing.
     */
    function unlist(uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        listingPrice[tokenId] = 0;
        emit Unlisted(tokenId, msg.sender);
    }

    /**
     * @dev Buy listed NFT. Sends ETH to seller and transfers NFT to buyer.
     */
    function buy(uint256 tokenId) external payable nonReentrant {
        uint256 price = listingPrice[tokenId];
        if (price == 0) revert NotListed();
        if (msg.value < price) revert InsufficientPayment();
        if (retired[tokenId]) revert TokenRetired();

        address seller = ownerOf(tokenId);
        listingPrice[tokenId] = 0;

        _transfer(seller, msg.sender, tokenId);
        (bool sent,) = payable(seller).call{value: price}("");
        require(sent, "Transfer failed");

        emit Sold(tokenId, msg.sender, seller, price);

        // Refund excess if any
        if (msg.value > price) {
            (bool refunded,) = payable(msg.sender).call{value: msg.value - price}("");
            require(refunded, "Refund failed");
        }
    }

    /**
     * @dev Retire token (mark as used for offset). Only current owner can retire. Retired tokens cannot be transferred.
     */
    function retire(uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (retired[tokenId]) revert AlreadyRetired();
        retired[tokenId] = true;
        emit Retired(tokenId, msg.sender);
    }

    /// @dev Get listing price for a token (0 if not listed).
    function getListingPrice(uint256 tokenId) external view returns (uint256) {
        return listingPrice[tokenId];
    }

    /// @dev Check if token is listed.
    function isListed(uint256 tokenId) external view returns (bool) {
        return listingPrice[tokenId] > 0;
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721URIStorage)
        returns (address)
    {
        if (retired[tokenId]) revert TokenRetired();
        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

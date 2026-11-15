// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @notice Minimal ERC-721 for physical-card ownership. Chain state stays
/// deliberately thin: token ownership + a version pointer per token. All
/// product workflow (history, statuses, versions metadata) lives off-chain.
contract CollectibleCard is ERC721 {
    address public issuer;
    uint256 public nextTokenId;

    mapping(uint256 => uint256) public currentVersion;

    modifier onlyIssuer() {
        require(msg.sender == issuer, "Not issuer");
        _;
    }

    constructor() ERC721("CollectibleCard", "CARD") {
        issuer = msg.sender;
        nextTokenId = 1;
    }

    /// @notice Mint the next card to the issuer. Claiming is a later
    /// issuer-executed transfer, which is what keeps the collector's side
    /// of the claim gasless.
    function mintToIssuer(uint256 version) external onlyIssuer returns (uint256) {
        uint256 tokenId = nextTokenId;
        nextTokenId += 1;
        _mint(issuer, tokenId);
        currentVersion[tokenId] = version;
        return tokenId;
    }

    /// @notice Issuer-executed transfer from issuer to collector.
    function claimTo(address user, uint256 tokenId) external onlyIssuer {
        require(ownerOf(tokenId) == issuer, "Already claimed");
        _transfer(issuer, user, tokenId);
    }

    /// @notice Bump the on-chain version pointer, used for lost/replacement flows.
    function setCurrentVersion(uint256 tokenId, uint256 version) external onlyIssuer {
        ownerOf(tokenId); // reverts if the token was never minted
        currentVersion[tokenId] = version;
    }
}

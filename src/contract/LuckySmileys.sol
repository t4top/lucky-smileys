// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.7;

/**
  _   _ _____ _____   _____     _            _
  | \ | |  ___|_   _| |_   _|_ _| | ___ _ __ | |_ ___
  |  \| | |_    | |     | |/ _` | |/ _ \ '_ \| __/ __|
  | |\  |  _|   | |     | | (_| | |  __/ | | | |_\__ \
  |_| \_|_|     |_|     |_|\__,_|_|\___|_| |_|\__|___/

  _               _            ____            _ _
  | |   _   _  ___| | ___   _  / ___| _ __ ___ (_) | ___ _   _ ___
  | |  | | | |/ __| |/ / | | | \___ \| '_ ` _ \| | |/ _ \ | | / __|
  | |__| |_| | (__|   <| |_| |  ___) | | | | | | | |  __/ |_| \__ \
  |_____\__,_|\___|_|\_\\__, | |____/|_| |_| |_|_|_|\___|\__, |___/
                      |___/                            |___/

**/

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@aztemi/solidity-utils/contracts/RandomIDsGenerator.sol";

/**
 * @title Lucky Smileys NFT Collection
 * @author t4top@aztemi
 * @dev Lucky Smileys is a collection of 1000 handcrafted NFT smileys on Rinkeby Ethereum testnet. They were made for NFT Talents Assignment.
 */

contract LuckySmileys is ERC1155, Pausable, Ownable, RandomIDsGenerator {

  uint256 public constant NFT_MAX_SUPPLY = 1000;
  uint256 public constant NFT_MINT_FEE = 0.02 ether;
  uint256 public constant MAX_PER_WALLET = 2;
  string baseURI;
  uint256[] mintedNFTs;
  mapping(address => uint256) mintedNFTsOwners;

  // Log event emitted after a successful mint
  event NftMinted(
    address indexed _to,
    address indexed _by,
    uint256[] indexed _tokenIds
  );

  constructor(string memory _baseURI) ERC1155("") RandomIDsGenerator(NFT_MAX_SUPPLY) {
    setBaseURI(_baseURI);
  }

  function mint(address toAddress, uint256 amount) external payable {
    require(_remainingSupply() >= amount, "LuckySmileys: Remaining NFTs not enough to meet requested amount.");
    require( tx.origin == msg.sender, "LuckySmileys: Minting through a contract not allowed.");

    // mint limit and fee not applicable to the owner
    if (msg.sender != owner()) {
      require(toAddress != address(0), "LuckySmileys: Mint address cannot be null.");
      require(mintedNFTsOwners[toAddress] + amount <= MAX_PER_WALLET, "LuckySmileys: Only 2 mints allowed per wallet.");
      require(msg.value >= (NFT_MINT_FEE * amount), "LuckySmileys: Fund not enough.");
    }

    mintedNFTsOwners[toAddress] += amount;

    uint256[] memory tokenIds = new uint256[](amount);

    for (uint256 i = 0; i < amount; i++) {
      tokenIds[i] = _nextID();
      mintedNFTs.push(tokenIds[i]);
      _mint(toAddress, tokenIds[i], 1, "");
    }

    emit NftMinted(toAddress, msg.sender, tokenIds);
  }

  function withdraw() external payable onlyOwner {
    require(payable(msg.sender).send(address(this).balance));
  }

  function uri(uint256 tokenId) public view override returns (string memory) {
    return string(abi.encodePacked(baseURI, Strings.toString(tokenId), ".json"));
  }

  function setBaseURI(string memory _baseURI) public onlyOwner {
    baseURI = _baseURI;
  }

  // No of NFTs available for minting
  function remainingSupply() external view returns (uint256) {
    return _remainingSupply();
  }

  // No of NFTs already minted
  function mintedSupply() external view returns (uint256) {
    return NFT_MAX_SUPPLY - _remainingSupply();
  }

  function showAllMintedTokenIDs() public view onlyOwner returns (uint256[] memory) {
    return mintedNFTs;
  }

  function pause() public onlyOwner {
    _pause();
  }

  function unpause() public onlyOwner {
    _unpause();
  }

  function _beforeTokenTransfer(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
    internal
    whenNotPaused
    override
  {
    super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
  }
}

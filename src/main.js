import "./style.css";
import { ethers } from "ethers";
import contractABI from "./contract/LuckySmileys_abi.json";
import { CONTRACT_ADDRESS, RPC_ENDPOINT, RINKEBY_CHAINID, NFT_MAX_SUPPLY, MINT_FEE } from "./constant.js";

let isConnected = false;
let isRinkeby = false;
let nftContract = null;
let ethProvider = null;
let ethAccount = null;
let ethBalance = 0;
let numberOfNFTsLeft = NFT_MAX_SUPPLY;

function $(id) {
  return document.getElementById(id);
}

// UI updates
function updateView() {
  const isRemaining = numberOfNFTsLeft > 0;

  $("notrinkebydiv").hidden = !(isRemaining && isConnected && !isRinkeby);
  $("connectdiv").hidden = !(isRemaining && !isConnected);
  $("mintdiv").hidden = !(isRemaining && isConnected && isRinkeby);

  $("loadingDiv").hidden = true;
  $("controldiv").hidden = false;
}

// show error message
function showError(msg) {
  const errorDiv = $("errordiv");
  errorDiv.innerText = msg;
  $("successdiv").hidden = true;
  $("popupdiv").hidden = errorDiv.hidden = false;
}

// show success message
function showSuccess(msg) {
  const successDiv = $("successdiv");
  successDiv.innerText = msg;
  $("errordiv").hidden = true;
  $("popupdiv").hidden = successDiv.hidden = false;
}

// close message popup
function closePopup() {
  return ($("popupdiv").hidden = true);
}

// web3 chain changed events handler
function handleChainChanged() {
  return window.location.reload();
}

// web3 connection changed events handler
function handleAccountsChanged(accounts) {
  if (accounts && accounts.length) {
    ethAccount = accounts[0];
    isConnected = true;

    ethProvider
      .getBalance(ethAccount)
      .then(_balance => {
        ethBalance = ethers.utils.formatEther(_balance);
        $("balancediv").innerText = `
          Balance: ${(Math.round(ethBalance * 10000) / 10000).toFixed(4)} ETH.
          Wallet: ${ethAccount.slice(0, 8)}...${ethAccount.slice(-4)}.
          `;
      })
      .catch(err => console.error(err));
  } else {
    ethAccount = null;
    isConnected = false;
  }
  updateView();
}

async function getRemainingNFTsCount() {
  if (isConnected && !isRinkeby) return;

  // retrieve no of NFTs left from the contract
  numberOfNFTsLeft = await nftContract.remainingSupply();

  $("nftsLeft").innerText =
    numberOfNFTsLeft > 0
      ? `${numberOfNFTsLeft} out of ${NFT_MAX_SUPPLY} NFTs remaining`
      : "Minting closed. All NFTs already minted.";
}

// connect to Metamask
function handleConnect() {
  if (typeof window.ethereum !== "undefined") {
    const { ethereum } = window;

    ethereum
      .request({ method: "eth_requestAccounts" })
      .then(handleAccountsChanged)
      .catch(err => {
        if (err.code === 4001) {
          // EIP-1193 userRejectedRequest error: the user rejected the connection request
          return showError("Please connect to MetaMask");
        } else {
          return console.error(err);
        }
      });

    ethProvider = new ethers.providers.Web3Provider(ethereum);
  } else {
    return showError("Please install MetaMask");
  }
}

// mint NFT
async function handleMint() {
  const mintAmount = $("amount").value || 1;
  const mintFee = MINT_FEE * mintAmount;
  if (mintAmount < 1 || mintAmount > 2)
    return showError("Mint amount should either be 1 or 2. Max of 2 NFTs alllowed per wallet.");

  if (ethBalance <= mintFee)
    return showError(`Insufficient balance. 1 NFT is ${MINT_FEE} ETH + gas. Get free ETH from Rinkeby Faucet.`);

  if (ethAccount && ethProvider) {
    const mintBtn = $("mintbtn");
    mintBtn.innerText = "Minting...";
    mintBtn.disabled = true;

    const signer = ethProvider.getSigner(ethAccount);
    nftContract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

    const txn = await nftContract.mint(ethAccount, mintAmount, { value: ethers.utils.parseEther(mintFee.toString()) });

    txn
      .wait()
      .then(resp => {
        console.log("logs:", resp.logs);
        showSuccess(`Transaction confirmed. tx: ${resp.transactionHash}`);
      })
      .catch(err => console.error(err))
      .finally(() => {
        mintBtn.innerText = "Mint";
        mintBtn.disabled = false;
      });

    await getRemainingNFTsCount();
  }
}

async function init() {
  // button listeners
  $("connectbtn").addEventListener("click", handleConnect);
  $("mintbtn").addEventListener("click", handleMint);
  $("okbtn").addEventListener("click", closePopup);

  // metamask wallet initialization
  if (typeof window.ethereum !== "undefined") {
    const { ethereum } = window;

    ethereum.on("chainChanged", handleChainChanged);
    ethereum.on("accountsChanged", handleAccountsChanged);

    const chainId = await ethereum.request({ method: "eth_chainId" });
    isRinkeby = chainId === RINKEBY_CHAINID;

    ethProvider = new ethers.providers.Web3Provider(ethereum);

    if (!ethAccount) {
      ethereum
        .request({ method: "eth_accounts" })
        .then(handleAccountsChanged)
        .catch(err => console.error(err));
    }
  } else {
    ethProvider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINT);
  }

  nftContract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, ethProvider);
  await getRemainingNFTsCount();

  updateView();
}

init();

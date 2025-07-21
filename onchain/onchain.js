const { ethers } = require("ethers");
const axios = require("axios");
const { ABI } = require("./ABI");

const EXPOLER = "https://bscscan.com/tx";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
  "function deposit() payable returns ()",
  "function withdraw(uint256 wad) returns ()",
];

class Onchain {
  constructor({ wallet, provider }) {
    this.wallet = wallet;
    this.provider = provider;
  }

  async checkBalance({ address: tokenAddress, provider, wallet }) {
    try {
      if (tokenAddress) {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
        const balance = await tokenContract.balanceOf(wallet.address);
        const decimals = 18;
        return parseFloat(ethers.formatUnits(balance, decimals)).toFixed(4);
      } else {
        const balance = await provider.getBalance(wallet.address);
        return parseFloat(ethers.formatEther(balance)).toFixed(4);
      }
    } catch (error) {
      console.log(`[${wallet.address}] Failed to check balance: ${error.message}`);
      return "0";
    }
  }

  async checkin(bnbPrice) {
    if (!bnbPrice || bnbPrice == 0) {
      return {
        success: false,
        message: "Can't get BNB price",
      };
    }
    try {
      const wallet = this.wallet;
      const provider = this.provider;
      const contract = new ethers.Contract("0x0Fa0f96f676f55Afd15B9AF26e711b2aCccb89E0", ABI, wallet);
      const checkInAmount = await contract.getCheckInAmount(); // trả về BigNumber

      const balance = await provider.getBalance(wallet.address);
      const balanceInEther = ethers.formatEther(balance);

      if (parseFloat(balanceInEther) < 0.00005) {
        return {
          tx: null,
          success: false,
          stop: true,
          message: "Insufficient BNB for checkin, min: 0.00005 BNB",
        };
      }

      const pendingNonce = await provider.getTransactionCount(wallet.address, "pending");
      const latestNonce = await provider.getTransactionCount(wallet.address, "latest");

      if (pendingNonce > latestNonce) {
        return {
          tx: null,
          success: false,
          stop: false,
          message: "There are pending transactions. Please wait for them to be completed.",
        };
      }

      const tx = await contract.checkIn({ value: checkInAmount });

      // const params = {
      //   to: "0x0Fa0f96f676f55Afd15B9AF26e711b2aCccb89E0",
      //   data: "0x183ff085",
      //   gasPrice: ethers.parseUnits("0.1", "gwei"),
      //   gasLimit: 67026,
      //   chainId: 56,
      //   nonce: latestNonce,
      //   value: ethers.parseUnits(valueInBNB.toFixed(18), "ether"),
      // };
      // const tx = await wallet.sendTransaction(params);
      await tx.wait(3);

      return {
        tx: tx.hash,
        success: true,
        message: `Send BNB checkin success! Transaction hash: ${EXPOLER}/${tx.hash}`,
      };
    } catch (error) {
      if (error.code === "NONCE_EXPIRED" || error.message.includes("TX_REPLAY_ATTACK")) {
        return {
          tx: null,
          success: false,
          stop: true,
          message: "Nonce conflict detected. Please retry the transaction.",
        };
      }
      return {
        tx: null,
        success: false,
        stop: true,
        message: `Error send bnb checkin: ${error.message}`,
      };
    }
  }
}

module.exports = Onchain;

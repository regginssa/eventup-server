// const {
//   getAssociatedTokenAddress,
//   createTransferInstruction,
//   TOKEN_PROGRAM_ID,
// } = require("@solana/spl-token");
// const {
//   Connection,
//   Keypair,
//   PublicKey,
//   Transaction,
// } = require("@solana/web3.js");
// require("dotenv").config();
const { ethers } = require("ethers");
const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} = require("@solana/web3.js");
const {
  getOrCreateAssociatedTokenAccount,
  transfer: splTransfer,
} = require("@solana/spl-token");
const config = require("../config/web3");
const { convertCurrency } = require("../utils/currency");

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
];

const ethProvider = new ethers.JsonRpcProvider(config.ETH_RPC);
const ethWallet = new ethers.Wallet(config.ETH_PRIVATE_KEY, ethProvider);
const solConnection = new Connection(config.SOL_RPC, "confirmed");
const solWallet = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(config.SOL_PRIVATE_KEY)),
);

function toSmallestUnit(amount, decimals) {
  return BigInt(Math.floor(amount * 10 ** decimals));
}

const fetchNativeTokensPrices = async () => {
  try {
    const [ethRes, solRes] = await Promise.all([
      fetch("https://api.coinpaprika.com/v1/tickers/eth-ethereum?quotes=EUR"),
      fetch("https://api.coinpaprika.com/v1/tickers/sol-solana?quotes=EUR"),
    ]);

    const eth = await ethRes.json();
    const sol = await solRes.json();

    return {
      eth: eth.quotes.EUR.price,
      sol: sol.quotes.EUR.price,
    };
  } catch (e) {
    return { eth: 0, sol: 0 };
  }
};

const fetchTokenPrices = async () => {
  try {
    const BABYU_TOKEN_ADDRESS = process.env.BABYU_TOKEN_ADDRESS;
    const CHRLE_TOKEN_ADDRESS = process.env.CHRLE_TOKEN_ADDRESS;

    // Fetch both in parallel
    const [babRes, chrleRes] = await Promise.all([
      fetch(
        `https://api-v3.raydium.io/mint/price?mints=${BABYU_TOKEN_ADDRESS}`,
      ),
      fetch(
        `https://launch-mint-v1.raydium.io/get/by/mints?ids=${CHRLE_TOKEN_ADDRESS}`,
      ),
    ]);

    const babyuJson = await babRes.json();
    const chrleJson = await chrleRes.json();

    // --- USD prices ---
    const babyuUSD = Number(babyuJson?.data?.[BABYU_TOKEN_ADDRESS] ?? 0);

    const chrleRow = chrleJson?.data?.rows?.[0];
    let chrleUSD = 0;

    if (chrleRow && chrleRow.marketCap && chrleRow.supply) {
      chrleUSD = Number(chrleRow.marketCap) / Number(chrleRow.supply);
    }

    // --- Convert to EUR (parallel again for speed) ---
    const [babEur, chrleEur] = await Promise.all([
      convertCurrency(babyuUSD || 0, "USD"),
      convertCurrency(chrleUSD || 0, "USD"),
    ]);

    return {
      babyu: babEur || 0,
      chrle: chrleEur || 0,
    };
  } catch (err) {
    console.error("Failed to fetch token prices:", err);
    return {
      chrle: 0,
      babyu: 0,
    };
  }
};

async function refundETH(to, amount, decimals) {
  const value = toSmallestUnit(amount, decimals);

  const tx = await ethWallet.sendTransaction({
    to,
    value,
  });

  await tx.wait();
  return tx.hash;
}

async function refundERC20(to, amount, tokenConfig) {
  const contract = new ethers.Contract(
    tokenConfig.address,
    ERC20_ABI,
    ethWallet,
  );

  const value = toSmallestUnit(amount, tokenConfig.decimals);

  const tx = await contract.transfer(to, value);
  await tx.wait();

  return tx.hash;
}

async function refundSOL(to, amount, decimals) {
  const lamports = Number(toSmallestUnit(amount, decimals));

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: solWallet.publicKey,
      toPubkey: new PublicKey(to),
      lamports,
    }),
  );

  const sig = await sendAndConfirmTransaction(solConnection, tx, [solWallet]);
  return sig;
}

async function refundSPL(to, amount, tokenConfig) {
  const mint = new PublicKey(tokenConfig.mint);
  const toPubkey = new PublicKey(to);

  const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
    solConnection,
    solWallet,
    mint,
    solWallet.publicKey,
  );

  const toTokenAccount = await getOrCreateAssociatedTokenAccount(
    solConnection,
    solWallet,
    mint,
    toPubkey,
  );

  const value = Number(toSmallestUnit(amount, tokenConfig.decimals));

  const sig = await splTransfer(
    solConnection,
    solWallet,
    fromTokenAccount.address,
    toTokenAccount.address,
    solWallet,
    value,
  );

  return sig;
}

const refund = async ({ chain, token, amount, to }) => {
  const tokenConfig = config.TOKENS[token];

  if (!tokenConfig || !to || to === "") {
    return null;
  }

  // ETHEREUM
  if (chain === "ETH") {
    if (tokenConfig.type === "native") {
      return await refundETH(to, amount, tokenConfig.decimals);
    }

    if (tokenConfig.type === "erc20") {
      return await refundERC20(to, amount, tokenConfig);
    }
  }

  if (chain === "SOL") {
    if (tokenConfig.type === "native") {
      return await refundSOL(to, amount, tokenConfig.decimals);
    }

    if (tokenConfig.type === "spl") {
      return await refundSPL(to, amount, tokenConfig);
    }
  }

  return null;
};

module.exports = { fetchNativeTokensPrices, fetchTokenPrices, refund };

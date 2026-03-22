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

// const connection = new Connection(process.env.SOLANA_RPC_URL, "confirmed");

// const appWallet = Keypair.fromSecretKey(
//   Uint8Array.from(JSON.parse(process.env.APP_WALLET_PRIVATE)),
// );

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
      convertCurrency(babyuUSD || 0, "USD", "EUR"),
      convertCurrency(chrleUSD || 0, "USD", "EUR"),
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

// const transferToken = async (userWallet, token, amount) => {
//   try {
//     const mint =
//       token === "chrle"
//         ? process.env.CHRLE_TOKEN_ADDRESS
//         : process.env.BABYU_TOKEN_ADDRESS;

//     const mintKey = new PublicKey(mint);
//     const toWallet = new PublicKey(userWallet);

//     const fromTokenAccount = await getAssociatedTokenAddress(
//       mintKey,
//       appWallet.publicKey,
//     );

//     const toTokenAccount = await getAssociatedTokenAddress(mintKey, toWallet);

//     const tx = new Transaction().add(
//       createTransferInstruction(
//         fromTokenAccount,
//         toTokenAccount,
//         appWallet.publicKey,
//         amount,
//         [],
//         TOKEN_PROGRAM_ID,
//       ),
//     );

//     tx.feePayer = appWallet.publicKey;

//     const latestBlockhash = await connection.getLatestBlockhash();
//     tx.recentBlockhash = latestBlockhash.blockhash;

//     const signedTx = await appWallet.signTransaction(tx);
//     const signature = await connection.sendRawTransaction(signedTx.serialize());

//     await connection.confirmTransaction(signature, "confirmed");

//     return signature;
//   } catch (error) {
//     console.error("[transfer token error]: ", error);
//     return null;
//   }
// };

module.exports = { fetchNativeTokensPrices, fetchTokenPrices };

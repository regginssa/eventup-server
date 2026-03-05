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
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,solana&vs_currencies=usd",
    );
    const data = await res.json();

    console.log("ETH:", data.ethereum.usd);
    console.log("SOL:", data.solana.usd);
    return {
      eth: data.ethereum.usd,
      sol: data.solana.usd,
    };
  } catch (error) {
    console.error("[fetch native tokens prices error]: ", error);
    return {
      eth: 0,
      sol: 0,
    };
  }
};

const fetchTokenPrices = async () => {
  try {
    //
    // 1) Fetch BABYU price from Raydium swap API
    //
    const BABYU_TOKEN_ADDRESS = process.env.BABYU_TOKEN_ADDRESS;
    const CHRLE_TOKEN_ADDRESS = process.env.CHRLE_TOKEN_ADDRESS;
    const babyuURL = `https://api-v3.raydium.io/mint/price?mints=${BABYU_TOKEN_ADDRESS}`;
    const babyuRes = await fetch(babyuURL);
    const babyuJson = await babyuRes.json();

    const babyuPrice = Number(babyuJson?.data?.[BABYU_TOKEN_ADDRESS] ?? 0);

    //
    // 2) Fetch CHRLE marketcap + supply from Launchpad
    //
    const chrleURL = `https://launch-mint-v1.raydium.io/get/by/mints?ids=${CHRLE_TOKEN_ADDRESS}`;
    const chrleRes = await fetch(chrleURL);
    const chrleJson = await chrleRes.json();

    const chrleRow = chrleJson?.data?.rows?.[0];

    let chrlePrice = 0;

    if (chrleRow && chrleRow.marketCap && chrleRow.supply) {
      const marketCap = Number(chrleRow.marketCap);
      const supply = Number(chrleRow.supply);
      chrlePrice = marketCap / supply; // USD price
    }

    return {
      chrle: chrlePrice,
      babyu: babyuPrice,
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

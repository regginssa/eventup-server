module.exports = {
  ETH_RPC: process.env.ETH_RPC,
  SOL_RPC: process.env.SOL_RPC,

  ETH_PRIVATE_KEY: process.env.ETH_PRIVATE_KEY,
  SOL_PRIVATE_KEY: process.env.SOL_PRIVATE_KEY,

  TOKENS: {
    eth: { type: "native", decimals: 18 },

    "usdt-eth": {
      type: "erc20",
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      decimals: 6,
    },

    "usdc-eth": {
      type: "erc20",
      address: "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      decimals: 6,
    },

    sol: { type: "native", decimals: 9 },

    "usdc-sol": {
      type: "spl",
      mint: "Es9vMFrzaCER...",
      decimals: 6,
    },

    "usdt-sol": {
      type: "spl",
      mint: "Es9vMFrzaCER...",
      decimals: 6,
    },

    // custom tokens
    chrle: {
      type: "spl",
      mint: process.env.CHRLE_TOKEN_ADDRESS,
      decimals: 9,
    },

    babyu: {
      type: "spl",
      mint: process.env.BABYU_TOKEN_ADDRESS,
      decimals: 9,
    },
  },
};

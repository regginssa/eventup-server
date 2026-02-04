const User = require("../../models/User");
const Transaction = require("../../models/Transaction");
const web3Services = require("../../services/web3");

const getTokenPricesAndFee = async (req, res) => {
  try {
    const prices = await web3Services.fetchTokenPrices();
    const TICKET_SELL_FEE = Number(process.env.TICKET_SELL_FEE);
    res
      .status(200)
      .json({ ok: true, data: { ...prices, fee: TICKET_SELL_FEE } });
  } catch (error) {
    console.error("[get token prices error]: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const createSellTicketPayout = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token, walletAddress, ticketAmount, ticketCurrency, metadata } =
      req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    const tokenPrices = await web3Services.fetchTokenPrices();

    if (!tokenPrices[token] || tokenPrices[token] === 0) {
      return res
        .status(400)
        .json({ ok: false, message: "Unable to fetch token price" });
    }

    const tokensToSend = ticketAmount / tokenPrices[token];
    const amountInSmallestUnits = Math.floor(tokensToSend * 10 ** 6);

    const signature = await web3Services.transferToken({
      userWallet: walletAddress,
      token,
      amount: amountInSmallestUnits,
    });

    if (!signature) {
      return res.status(500).json({ ok: false, message: "Transaction failed" });
    }

    const tx = await Transaction.create({
      type: "sell",
      amount: tokensToSend,
      currency: ticketCurrency,
      metadata,
      paymentMethod: "crypto",
      service: "ticket",
      status: "completed",
      txId: signature,
      userId,
      payoutToken: token,
    });

    res.status(200).json({ ok: true, data: tx });
  } catch (error) {
    console.error("[create token transfer for sell ticket error]: ", error);
  }
};

module.exports = { getTokenPricesAndFee, createSellTicketPayout };

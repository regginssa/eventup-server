const service = require("../../services/iap");
const Transaction = require("../../models/Transaction");
const User = require("../../models/User");
const df = require("../../utils/date");

const verify = async (req, res) => {
  try {
    const {
      userId,
      type,
      ticketId,
      subscriptionId,
      currency,
      amount,
      productId,
      transactionId,
      receiptData,
    } = req.body;

    if (!userId || !productId || !receiptData) {
      return res.status(400).json({ ok: false, message: "Missing fields" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    const data = await service.verifyReceipt(receiptData);

    if (data?.status !== 0) {
      return res
        .status(400)
        .json({ ok: false, message: `Apple status ${data?.status}` });
    }

    // Validate bundle
    const bundleOk = data?.receipt?.bundle_id === process.env.APP_BUNDLE_ID;

    if (!bundleOk) {
      return res.status(400).json({ ok: false, message: "Bundle mismatch" });
    }

    // Find product in receipt
    const inApps = [
      ...(Array.isArray(data?.receipt?.in_app) ? data.receipt.in_app : []),
      ...(Array.isArray(data?.latest_receipt_info)
        ? data.latest_receipt_info
        : []),
    ];

    const match = inApps.find(
      (t) =>
        t.product_id === productId &&
        (!transactionId || t.transaction_id === transactionId),
    );

    if (!match) {
      return res
        .status(400)
        .json({ ok: false, message: "Product not found in receipt" });
    }

    // Prevent duplicate transactions
    const already = await Transaction.findOne({
      txId: match.transaction_id,
    });

    if (already) {
      if (already.status === "completed") {
        return res.status(200).json({
          ok: true,
          message: "Already processed",
          data: already,
        });
      }

      // If it exists but not completed, update it
      already.status = "completed";
      already.metadata = {
        ...already.metadata,
        productId: match.product_id,
        purchaseDate: match.purchase_date,
      };

      await already.save();

      return res.status(200).json({
        ok: true,
        data: already,
      });
    }

    let transaction = null;

    if (type === "ticket") {
      transaction = await Transaction.create({
        userId,
        txId: match.transaction_id,
        type: "buy",
        paymentMethod: "credit",
        amount,
        amountReceived: amount,
        currency,
        service: "ticket",
        status: "completed",
        metadata: {
          productId: match.product_id,
          purchaseDate: match.purchase_date,
          originalTransactionId: match.original_transaction_id,
          receipt: receiptData,
          ticketId,
        },
      });

      user.tickets = [...user.tickets, ticketId];
      await user.save();
    } else if (type === "subscription") {
      transaction = await Transaction.create({
        userId,
        txId: match.transaction_id,
        type: "buy",
        paymentMethod: "credit",
        amount,
        amountReceived: amount,
        currency,
        service: "subscription",
        status: "completed",
        metadata: {
          productId: match.product_id,
          purchaseDate: match.purchase_date,
          originalTransactionId: match.original_transaction_id,
          receipt: receiptData,
          subscriptionId,
        },
      });

      user.subscription.id = subscriptionId;
      user.subscription.startedAt = df.toISOString(new Date());
      await user.save();
    }

    return res.status(200).json({
      ok: true,
      data: transaction,
    });
  } catch (error) {
    console.error("verify iap error:", error);

    res.status(500).json({
      ok: false,
      message: "Something went wrong",
    });
  }
};

module.exports = { verify };

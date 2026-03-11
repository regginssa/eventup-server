const service = require("../../services/iap");
const Transaction = require("../../models/Transaction");

const verify = async (req, res) => {
  try {
    const { userId, productId, transactionId, receiptData } = req.body;

    if (!userId || !productId || !receiptData) {
      return res.status(400).json({ ok: false, message: "Missing fields" });
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
    const inApps = Array.isArray(data?.receipt?.in_app)
      ? data.receipt.in_app
      : [];

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
        message: "Transaction updated",
        data: already,
      });
    }

    // Create transaction record
    const transaction = await Transaction.create({
      userId,
      txId: match.transaction_id,
      type: "buy",
      paymentMethod: "credit",
      amount: 0, // Apple IAP doesn't expose price here
      amountReceived: 0,
      currency: "USD", // you may pass this from client if needed
      service: "subscription",
      status: "completed",
      metadata: {
        productId: match.product_id,
        purchaseDate: match.purchase_date,
        originalTransactionId: match.original_transaction_id,
        receipt: receiptData,
      },
    });

    return res.status(200).json({
      ok: true,
      message: "Purchased successfully",
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

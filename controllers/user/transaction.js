const Transaction = require("../../models/Transaction");

const create = async (req, res) => {
  try {
    const newTransaction = await Transaction.create(req.body);
    res.status(200).json({ ok: true, data: newTransaction });
  } catch (error) {
    console.error("[create new transaction error]: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { create };

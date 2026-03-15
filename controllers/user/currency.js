const { convertCurrency } = require("../../utils/currency");

const convert = async (req, res) => {
  try {
    const { from, to, amount } = req.query;

    const result = await convertCurrency(from, to, amount);
    res.json({ ok: true, data: result });
  } catch (error) {
    console.error("[currency convert error]: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { convert };

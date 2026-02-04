const Subscription = require("../../models/Subscription");

const getAll = async (req, res) => {
  try {
    const subscriptions = await Subscription.find().lean();
    res.status(200).json({ ok: true, data: subscriptions });
  } catch (error) {
    console.error("[get all subscription error]: ", error);
    res.status(500).json({ ok: false, message: "Something went wrong" });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await Subscription.findById(id);
    res.status(200).json({ ok: true, data: subscription });
  } catch (error) {
    console.error("[get subscription by id error]: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { getAll, getById };

const Review = require("../../models/Review");

const getByTo = async (req, res) => {
  try {
    const { id } = req.params;

    const reviews = await Review.find({ to: id })
      .populate("from to event")
      .lean();

    res.status(200).json({ ok: true, data: reviews });
  } catch (error) {
    console.error("[get all reviews error]: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = {
  getByTo,
};

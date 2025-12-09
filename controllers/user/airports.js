const { findNearestAirports } = require("../../utils/airports");

const getNearestAirports = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    const airports = findNearestAirports(latitude, longitude);

    res.status(200).json({ ok: true, data: airports });
  } catch (error) {
    console.error("get nearest airports error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { getNearestAirports };

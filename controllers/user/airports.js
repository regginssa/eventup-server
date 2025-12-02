const User = require("../../models/User");
const { findNearestAirports } = require("../../utils/airports");

const updateUserNearestAirports = async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Missing coordinates" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    const airports = findNearestAirports(latitude, longitude);

    user.nearest_airports = airports;
    await user.save();

    res.status(200).json({ ok: true, data: user });
  } catch (error) {
    console.error("updateUserNearestAirports error: ", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
};

module.exports = { updateUserNearestAirports };

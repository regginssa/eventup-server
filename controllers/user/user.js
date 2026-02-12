const User = require("../../models/User");

const get = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("-password")
      .populate("tickets");

    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    res.status(200).json({ ok: true, data: user });
  } catch (error) {
    console.error("user get user error: ", error);
    res.status(500).json({ ok: false, message: "Something went wrong" });
  }
};

const update = async (req, res) => {
  try {
    const updates = req.body;
    const { id } = req.params;

    const user = await User.findById(id)
      .select("-password")
      .populate("tickets");

    if (!user) {
      return res
        .status(404)
        .json({ ok: false, message: "Something went wrong" });
    }

    user.set(updates);
    await user.save();

    res.status(200).json({ ok: true, data: user });
  } catch (error) {
    console.error("user update user error: ", error);
    res.status(500).json({ ok: false, message: "Something went wrong" });
  }
};

module.exports = { get, update };

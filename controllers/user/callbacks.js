const User = require("../../models/User");

const diditCallback = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ ok: false, message: "Missing data" });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ ok: false, message: "User not found" });
  }

  const deepLink = `${process.env.APP_NAME}://didit?status=${user.kyc.status}&sessionId=${user.kyc.sessionId}`;
  console.log("didit callback redirect link: ", deepLink);

  res.redirect(deepLink);
};

module.exports = { diditCallback };

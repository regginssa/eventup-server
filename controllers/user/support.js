const mailServices = require("../../services/mail");

const sendMessageToSupport = async (req, res) => {
  try {
    const result = await mailServices.sendMessageToSupport(req.body);

    if (!result) {
      return res.status(400).json({ ok: false, message: "Invalid data" });
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { sendMessageToSupport };

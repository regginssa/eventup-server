const { createSession } = require("../../services/didit");
const User = require("../../models/User");
const crypto = require("crypto");

const diditWebhook = async (req, res) => {
  try {
    const WEBHOOK_SECRET_KEY = process.env.DIDIT_WEBHOOK_SECRET_KEY;

    const signature = req.get("X-Signature");
    const timestamp = req.get("X-Timestamp");

    if (!signature || !timestamp || !req.rawBody || !WEBHOOK_SECRET_KEY) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const incomingTime = parseInt(timestamp, 10);
    if (Math.abs(currentTime - incomingTime) > 300) {
      return res.status(401).json({ message: "Request timestamp is stale." });
    }

    const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET_KEY);
    const expectedSignature = hmac.update(req.rawBody).digest("hex");

    const expectedSignatureBuffer = Buffer.from(expectedSignature, "utf8");
    const providedSignatureBuffer = Buffer.from(signature, "utf8");

    if (
      expectedSignatureBuffer.length !== providedSignatureBuffer.length ||
      !crypto.timingSafeEqual(expectedSignatureBuffer, providedSignatureBuffer)
    ) {
      return res.status(401).json({
        message: `Invalid signature. Computed (${expectedSignature}), Provided (${signature})`,
      });
    }

    const jsonBody = JSON.parse(req.rawBody);
    const { status, vendor_data } = jsonBody;

    const user = await User.findById(vendor_data);

    if (user) {
      if (
        status === "Approved" ||
        status === "Declined" ||
        status === "Expired" ||
        status === "Abandoned"
      ) {
      }

      user.kyc.status = status;
      user.idVerified = status === "Approved";

      await user.save();
    }

    return res.json({ message: "Webhook event dispatched" });
  } catch (error) {
    console.error("didit webhook error: ", error);
    res.status(401).json({ message: "Unauthorized" });
  }
};

const startVerification = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await createSession(id);

    const {
      session_id,
      session_number,
      session_token,
      vendor_data,
      status,
      url,
    } = session;

    const data = {
      sessionId: session_id,
      sessionNumber: session_number ?? 0,
      sessionToken: session_token ?? null,
      vendorData: vendor_data,
      status,
      url,
    };

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    if (user) {
      user.kyc = data;
      await user.save();
    }

    res.status(200).json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Something went wrong" });
  }
};

module.exports = { diditWebhook, startVerification };

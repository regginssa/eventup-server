const Message = require("../../models/Message");
const Conversation = require("../../models/Conversation");

const getConversationMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      conversation: req.params.conversationId,
    })
      .populate("sender")
      .lean();

    res.status(200).json({ ok: true, data: messages });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

const markSeen = async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user.id;

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        status: "sent",
      },
      { status: "seen" },
    );

    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { [`unread.${userId}`]: 0 },
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[mark seen error]: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { getConversationMessages, markSeen };

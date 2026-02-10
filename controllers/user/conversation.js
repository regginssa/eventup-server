const Conversation = require("../../models/Conversation");
const Message = require("../../models/Message");

const getUserConversations = async (req, res) => {
  try {
    const userId = req.params.userId;

    const conversations = await Conversation.find({
      participants: userId,
      hiddenFor: { $ne: userId },
    })
      .populate("participants", "name avatar status")
      .populate("creator")
      .populate("event")
      .populate("lastMessage")

      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({ ok: true, data: conversations });
  } catch (err) {
    console.error("[get user conversations error]: ", err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

const create = async (req, res) => {
  try {
    const newConv = await Conversation.create(req.body);

    const populated = await Conversation.findById(newConv._id)
      .populate("participants", "name avatar status")
      .populate("creator")
      .populate("event")
      .populate("lastMessage");

    res.status(200).json({ ok: true, data: populated });
  } catch (err) {
    console.error("[create a conversation error]: ", err);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const removeForMe = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: conversationId } = req.params;
    await Conversation.findByIdAndUpdate(conversationId, {
      $addToSet: { hiddenFor: userId },
    });
    res.status(200).json({ ok: true, data: true });
  } catch (error) {
    console.error("[remove one conversation error]: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const removeForAll = async (req, res) => {
  try {
    const { id } = req.params;

    await Conversation.findByIdAndDelete(id);

    await Message.deleteMany({ conversation: id });

    res.status(200).json({ ok: true, data: true });
  } catch (err) {
    console.error("[remove conversations for all error]: ", err);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = { getUserConversations, create, removeForMe, removeForAll };

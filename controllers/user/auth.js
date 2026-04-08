const User = require("../../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mailServices = require("../../services/mail");
const Event = require("../../models/Event");
const Conversation = require("../../models/Conversation");
const Message = require("../../models/Message");

const googleRegister = async (req, res) => {
  try {
    const { firstName, lastName, email, googleId, avatar } = req.body;

    const user = await User.findOne({ email });

    if (user) {
      return res.json({ ok: false, message: "User already exists" });
    }

    const password = await bcrypt.hash(googleId, 10);
    const newUser = await User.create({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email,
      signOption: "google",
      googleId: googleId,
      password,
      avatar,
      emailVerified: true,
    });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1y",
    });

    res.status(200).json({
      ok: true,
      data: { token: `Bearer ${token}`, user: newUser },
    });
  } catch (error) {
    console.error("user google register error: ", error);
    res.status(500).json({ ok: false, message: "Something went wrong" });
  }
};

const appleRegister = async (req, res) => {
  try {
    const { firstName, lastName, email, appleId } = req.body;

    const user = await User.findOne({ appleId });

    if (user) {
      return res.json({ ok: false, message: "User already exists" });
    }

    const password = await bcrypt.hash(appleId, 10);
    const newUser = await User.create({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email,
      signOption: "apple",
      appleId,
      password,
      emailVerified: true,
    });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1y",
    });

    res.status(200).json({
      ok: true,
      data: { token: `Bearer ${token}`, user: newUser },
    });
  } catch (error) {
    console.error("apple register error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const emailRegister = async (req, res) => {
  try {
    const { firstName, lastName, name, email, password } = req.body;

    const user = await User.findOne({ email });

    if (user) {
      return res
        .status(400)
        .json({ ok: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      firstName,
      lastName,
      name,
      email,
      signOption: "email",
      password: hashedPassword,
    });

    const otp = await mailServices.sendOTP(newUser.email);
    if (!otp) {
      await User.findByIdAndDelete(newUser._id);
      return res
        .status(500)
        .json({ ok: false, message: "Internal server error" });
    }

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1y",
    });

    res.status(200).json({
      ok: true,
      data: { token: `Bearer ${token}`, user: newUser },
    });
  } catch (error) {
    console.error("user email register error: ", error);
    res.status(500).json({ ok: false, message: "Something went wrong" });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.json({ ok: false, message: "User not found" });
    }

    user.emailVerified = true;
    await user.save();

    const populated = await User.findById(user._id)
      .select("-password")
      .populate("tickets");

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1y",
    });

    res.status(200).json({
      ok: true,
      data: { token: `Bearer ${token}`, user: populated },
    });
  } catch (error) {
    console.error("user google login error: ", error);
    res.status(500).json({ ok: false, message: "Something went wrong" });
  }
};

const appleLogin = async (req, res) => {
  try {
    const { appleId } = req.body;

    const user = await User.findOne({ appleId });

    if (!user || !user?.appleId) {
      return res.json({ ok: false, message: "User not found" });
    }

    user.emailVerified = true;
    await user.save();

    const populated = await User.findById(user._id)
      .select("-password")
      .populate("tickets");

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1y",
    });

    res.status(200).json({
      ok: true,
      data: { token: `Bearer ${token}`, user: populated },
    });
  } catch (error) {
    console.error("apple login error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const emailLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.json({ ok: false, message: "User not found" });
    }

    if (user.signOption !== "email") {
      return res.json({
        ok: false,
        message: `You signed in with ${user.signOption}`,
      });
    }

    const matches = await bcrypt.compare(password, user.password);

    if (!matches) {
      return res.status(401).json({ ok: false, message: "Incorrect password" });
    }

    if (!user.emailVerified) {
      const result = await mailServices.sendOTP(user.email);

      if (!result) {
        return res
          .status(500)
          .json({ ok: false, message: "Send verification code failed" });
      }

      return res.status(200).json({ ok: true, data: user });
    }

    const populated = await User.findById(user._id)
      .select("-password")
      .populate("tickets");

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1y",
    });

    res.status(200).json({
      ok: true,
      data: { token: `Bearer ${token}`, user: populated },
    });
  } catch (error) {
    console.error("user email login error: ", error);
    res.status(500).json({ ok: false, message: "Something went wrong" });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { code, email } = req.body;
    let user = await User.findOne({ email });
    if (!user?.otp?.code) {
      return res.json({
        ok: false,
        message: "No verification code, please resend verification code",
      });
    }
    const now = new Date();
    if (now > user.otp.expiresAt) {
      user.otp = { code: null, expiresAt: null };
      await user.save();
      return res.json({
        ok: false,
        message: "Your verification code is expired.",
      });
    }
    if (user.otp.code !== code) {
      return res.json({
        ok: false,
        message: "Your verification code is incorrect.",
      });
    }
    user.otp = { code: null, expiresAt: null };
    user.emailVerified = true;
    await user.save();

    const populated = await User.findById(user._id)
      .select("-password")
      .populate("tickets");

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1y",
    });

    res.status(200).json({
      ok: true,
      data: { token: `Bearer ${token}`, user: populated },
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.query;

    const result = await mailServices.sendOTP(email);
    if (!result) {
      return res
        .status(400)
        .json({ ok: false, message: "Resend verification code failed" });
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ ok: false, message: "User not found" });
    }

    const result = await mailServices.sendOTP(email);
    if (!result) {
      return res.json({ ok: false, message: "Send verification code failed" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1y",
    });

    res.json({
      ok: true,
      data: `Bearer ${token}`,
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.json({ ok: false, message: "User not found" });
    }

    const { newPassword } = req.body;
    const pass = await bcrypt.hash(newPassword, 10);
    user.password = pass;
    await user.save();

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({ ok: false, message: "Unauthorized" });
    }

    const user = await User.findById(userId)
      .select("-password")
      .populate("tickets");

    res.status(200).json({ ok: true, data: user });
  } catch (error) {
    console.error("[get me error]: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.json({ ok: false, message: "User not found" });
    }

    const { newPassword, currentPassword } = req.body;

    const matches = await bcrypt.compare(currentPassword, user.password);

    if (!matches) {
      return res.json({ ok: false, message: "Incorrect password" });
    }

    const pass = await bcrypt.hash(newPassword, 10);
    user.password = pass;
    await user.save();

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const updateMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    user.set(req.body);
    await user.save();

    const populated = await User.findById(userId)
      .select("-password")
      .populate("tickets");

    res.status(200).json({ ok: true, data: populated });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const removeMe = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1️⃣ Check if user still hosts events
    const events = await Event.find({ hoster: userId });

    if (events.length > 0) {
      return res.json({
        ok: false,
        message:
          "Your some events are still opening. Please contact support team via contact us form and explain why you are removing your account",
      });
    }

    // 2️⃣ Find all conversations where user participates
    const conversations = await Conversation.find({
      participants: userId,
    });

    const dmConversationIds = [];
    const groupConversationIds = [];

    conversations.forEach((c) => {
      if (c.type === "dm") {
        dmConversationIds.push(c._id);
      } else if (c.type === "group") {
        groupConversationIds.push(c._id);
      }
    });

    // 3️⃣ Delete messages for DM conversations
    if (dmConversationIds.length > 0) {
      await Message.deleteMany({
        conversation: { $in: dmConversationIds },
      });

      // 4️⃣ Delete DM conversations
      await Conversation.deleteMany({
        _id: { $in: dmConversationIds },
      });
    }

    // 5️⃣ Remove user from group conversations
    if (groupConversationIds.length > 0) {
      await Conversation.updateMany(
        { _id: { $in: groupConversationIds } },
        {
          $pull: { participants: userId },
          $unset: { [`unread.${userId}`]: "" },
        },
      );
    }

    // 6️⃣ Finally delete user
    await User.findByIdAndDelete(userId);

    return res.json({
      ok: true,
      message: "Account removed successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  googleRegister,
  appleRegister,
  emailRegister,
  googleLogin,
  appleLogin,
  emailLogin,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  getMe,
  changePassword,
  updateMe,
  removeMe,
};

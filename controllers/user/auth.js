const User = require("../../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mailServices = require("../../services/mail");

const googleRegister = async (req, res) => {
  try {
    const { firstName, lastName, email, googleId, avatar } = req.body;

    const user = await User.findOne({ email });

    if (user) {
      return res
        .status(400)
        .json({ ok: false, message: "User already exists" });
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

    console.log(
      "[new user register with apple body data]: ",
      firstName,
      lastName,
      email,
      appleId,
    );

    const user = await User.findOne({ email });

    if (user) {
      return res
        .status(400)
        .json({ ok: false, message: "User already exists" });
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
      return res.status(404).json({ ok: false, message: "User not found" });
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
    console.error("user google login error: ", error);
    res.status(500).json({ ok: false, message: "Something went wrong" });
  }
};

const appleLogin = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ ok: false, message: "User not found" });
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
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const emailLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email,
      signOption: "email",
    });

    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
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

    res.json({ ok: true, data: populated });
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

const changePassword = async (req, res) => {
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
  changePassword,
  getMe,
};

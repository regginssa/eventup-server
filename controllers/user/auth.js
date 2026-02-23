const User = require("../../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const googleLogin = async (req, res) => {
  try {
    const { email, googleId } = req.body;

    const user = await User.findOne({
      email,
      signOption: "google",
      googleId,
    });

    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    const populated = await User.findById(user._id)
      .select("-password")
      .populate("tickets");

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "3d",
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

const googleRegister = async (req, res) => {
  try {
    const { name, email, googleId, avatar } = req.body;

    const user = await User.findOne({ email });

    if (user) {
      return res
        .status(400)
        .json({ ok: false, message: "User already exists" });
    }

    const password = await bcrypt.hash(googleId, 10);
    const newUser = await User.create({
      name,
      email,
      signOption: "google",
      googleId,
      password,
      avatar,
    });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "3d",
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

    const populated = await User.findById(user._id)
      .select("-password")
      .populate("tickets");

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "3d",
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

const emailRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const user = await User.findOne({ email });

    if (user) {
      return res
        .status(400)
        .json({ ok: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      signOption: "email",
      password: hashedPassword,
    });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "3d",
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
  googleLogin,
  googleRegister,
  emailLogin,
  emailRegister,
  getMe,
};

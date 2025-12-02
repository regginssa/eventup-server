const User = require("../../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const googleLogin = async (req, res) => {
  try {
    const { email, google_id } = req.body;

    const user = await User.findOne({
      email,
      sign_option: "google",
      google_id,
    });

    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "3d",
    });

    res.status(200).json({
      ok: true,
      data: { token: `Bearer ${token}`, user },
    });
  } catch (error) {
    console.error("user google login error: ", error);
    res.status(500).json({ ok: false, message: "Something went wrong" });
  }
};

const googleRegister = async (req, res) => {
  try {
    const { name, email, google_id, avatar } = req.body;

    const user = await User.findOne({ email });

    if (user) {
      return res
        .status(400)
        .json({ ok: false, message: "User already exists" });
    }

    const password = await bcrypt.hash(google_id, 10);
    const newUser = await User.create({
      name,
      email,
      sign_option: "google",
      google_id,
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
      sign_option: "email",
    });

    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    const matches = await bcrypt.compare(password, user.password);

    if (!matches) {
      return res.status(401).json({ ok: false, message: "Incorrect password" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "3d",
    });

    res.status(200).json({
      ok: true,
      data: { token: `Bearer ${token}`, user },
    });
  } catch (error) {
    console.error("user google login error: ", error);
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
      sign_option: "email",
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

module.exports = { googleLogin, googleRegister, emailLogin, emailRegister };

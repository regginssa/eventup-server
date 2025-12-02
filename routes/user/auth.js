const express = require("express");
const router = express.Router();
const {
  googleLogin,
  googleRegister,
  emailLogin,
  emailRegister,
} = require("../../controllers/user/auth");

router.post("/login-google", googleLogin);
router.post("/register-google", googleRegister);
router.post("/login-email", emailLogin);
router.post("/register-email", emailRegister);

module.exports = router;

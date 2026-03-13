const express = require("express");
const router = express.Router();
const passport = require("passport");
const controllers = require("../../controllers/user/auth");

const requireAuth = passport.authenticate("jwt", { session: false });

router.post("/register/google", controllers.googleRegister);
router.post("/register/apple", controllers.appleRegister);
router.post("/register/email", controllers.emailRegister);

router.post("/login/google", controllers.googleLogin);
router.post("/login/apple", controllers.appleLogin);
router.post("/login/email", controllers.emailLogin);

router.post("/verify/otp", controllers.verifyOtp);
router.get("/verify/otp/resend", controllers.resendOtp);
router.post("/forgot-password", controllers.forgotPassword);

router.get("/me", requireAuth, controllers.getMe);
router.patch("/change-password", requireAuth, controllers.changePassword);

module.exports = router;

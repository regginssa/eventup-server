const express = require("express");
const router = express.Router();
const passport = require("passport");
const controllers = require("../../controllers/user/auth");

const requireAuth = passport.authenticate("jwt", { session: false });

router.post("/login-google", controllers.googleLogin);
router.post("/register-google", controllers.googleRegister);
router.post("/login-email", controllers.emailLogin);
router.post("/register-email", controllers.emailRegister);
router.get("/me", requireAuth, controllers.getMe);

module.exports = router;

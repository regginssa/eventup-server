const express = require("express");
const router = express.Router();
const passport = require("passport");

// Public routes
router.use("/auth", require("./auth"));
router.use("/user", require("./user"));
router.use("/callbacks", require("./callbacks"));
router.use("/didit", require("./didit"));
router.use("/events", require("./event"));
router.use("/reviews", require("./review"));
router.use("/ticket", require("./ticket"));
router.use("/subscription", require("./subscription"));
router.use("/tx", require("./transaction"));
router.use("/upload", require("./upload"));

// Protected routes
const requireAuth = passport.authenticate("jwt", { session: false });

router.use("/booking", requireAuth, require("./booking"));
router.use("/stripe", requireAuth, require("./stripe"));
router.use("/web3", requireAuth, require("./web3"));
router.use("/conversations", requireAuth, require("./conversation"));
router.use("/messages", requireAuth, require("./message"));

module.exports = router;

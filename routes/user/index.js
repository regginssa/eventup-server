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
router.use("/cryptocheckout", require("./cryptocheckout"));

// Protected routes
const requireAuth = passport.authenticate("jwt", { session: false });

router.use("/flight", requireAuth, require("./flight"));
router.use("/hotel", requireAuth, require("./hotel"));
router.use("/transfer", requireAuth, require("./transfer"));
router.use("/booking", requireAuth, require("./booking"));
router.use("/stripe", requireAuth, require("./stripe"));
router.use("/web3", requireAuth, require("./web3"));
router.use("/conversations", requireAuth, require("./conversation"));
router.use("/messages", requireAuth, require("./message"));
router.use("/notifications", requireAuth, require("./notification"));
router.use("/support", requireAuth, require("./support"));

module.exports = router;

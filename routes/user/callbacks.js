const express = require("express");
const router = express.Router();
const { diditCallback } = require("../../controllers/user/callbacks");

router.get("/didit", diditCallback);

module.exports = router;

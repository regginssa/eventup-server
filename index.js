const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");
const passport = require("passport");
const connectDB = require("./config/db");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();
require("./config/passport")(passport);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});

// User routes
const userAuthRoutes = require("./routes/user/auth");
const userUserRoutes = require("./routes/user/user");
const userCallbacksRoutes = require("./routes/user/callbacks");
const userDiditRoutes = require("./routes/user/didit");
const userEventRoutes = require("./routes/user/event");
const userAirportsRoutes = require("./routes/user/airports");
const userBookingRoutes = require("./routes/user/booking");
const userStripeRoutes = require("./routes/user/stripe");

app.use(cors());
app.use(passport.initialize());

// Special middleware for Didit webhook (raw body needed)
app.use(
  "/api/didit/webhook",
  bodyParser.json({
    verify: (req, res, buf, encoding) => {
      if (buf && buf.length) {
        req.rawBody = buf.toString(encoding || "utf8");
      }
    },
  }),
  userDiditRoutes
);

// Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api/auth", userAuthRoutes);
app.use("/api/user", userUserRoutes);
app.use("/api/callbacks", userCallbacksRoutes);
app.use("/api/didit", userDiditRoutes);
app.use("/api/events", userEventRoutes);
app.use(
  "/api/airports",
  passport.authenticate("jwt", { session: false }),
  userAirportsRoutes
);
app.use(
  "/api/booking",
  passport.authenticate("jwt", { session: false }),
  userBookingRoutes
);
app.use(
  "/api/stripe",
  passport.authenticate("jwt", { session: false }),
  userStripeRoutes
);

// File upload
const upload = multer({ dest: "uploads/" });
const { uploadToCloudinary } = require("./services/cloudinary");
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ ok: false, message: "File not found" });

    const fileLink = await uploadToCloudinary(req.file);

    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Error deleting temp file:", err);
    });

    res.status(200).json({ ok: true, data: fileLink });
  } catch (error) {
    console.error("upload error: ", error);
    res.status(500).json({ ok: false, message: "Upload failed" });
  }
});

// Connect DB
connectDB();

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});

// const cron = require("node-cron");
// const { runGlobalHarvest } = require("./services/tm-harvester");

// cron.schedule("*/2 * * * *", async () => {
//   await runGlobalHarvest({ pageSize: 200 });
// });

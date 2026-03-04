const express = require("express");
const http = require("http");
const { initSocket } = require("./socket");
const bodyParser = require("body-parser");
const cors = require("cors");
const passport = require("passport");
const connectDB = require("./config/db");
const crypto = require("crypto");
require("dotenv").config();
require("./config/passport")(passport);

const app = express();
const server = http.createServer(app);

// Initialize socket.io
initSocket(server);

// User routes

app.use(cors());
app.use(passport.initialize());

// Special middleware for Didit webhook (raw body)
const userDiditRoutes = require("./routes/user/didit");
app.use(
  "/api/v1/didit/webhook",
  bodyParser.json({
    verify: (req, res, buf, encoding) => {
      if (buf && buf.length) {
        req.rawBody = buf.toString(encoding || "utf8");
      }
    },
  }),
  userDiditRoutes,
);

// Special middleware for Stripe webhook (raw body)
const userStripeController = require("./controllers/user/stripe");
app.use(
  "/api/v1/stripe/webhook",
  bodyParser.raw({ type: "application/json" }),
  userStripeController.webhook,
);
app.use("/api/v1/duffel/webhook", async (req, res) => {
  const signature = req.headers["x-duffel-signature"];

  // 3. Get the raw body (as a string)
  const body = JSON.stringify(req.body);

  // 4. Create the HMAC SHA256 hash
  const hmac = crypto.createHmac("sha256", process.env.DUFFEL_WEBHOOK_SECRET);
  const digest = hmac.update(body).digest("hex");

  // 5. Compare signatures
  if (signature === digest) {
    // Now handle the booking status
    const { type, object } = req.body.data;

    // 2. Act on the status
    switch (type) {
      case "order.created":
        // The booking is finally done!
        // Update your DB: findUserByOrderId(object.id) -> setStatus('Paid')
        // await sendConfirmationEmail(object.id, object.booking_reference);
        console.log(`Order ${object.id} confirmed via Webhook.`);
        break;

      case "order.creation_failed":
        // Something went wrong in the background
        // await notifyUserOfFailure(object.id);
        console.log(`Order ${object.id} failed in background.`);
        break;
    }

    res.status(200).send("OK");
  } else {
    console.error("❌ Security Alert: Invalid Signature!");
    res.status(401).send("Unauthorized");
  }
});

// Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// App user routes
const userRoutes = require("./routes/user");
app.use("/api/v1", userRoutes);

// Connect DB
connectDB();

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`Server is running on ${PORT}`);
});

// require("./services/ticketmaster");
// const {fetchAllEventsFromTM} = require("./services/ticketmaster");
// fetchAllEventsFromTM();

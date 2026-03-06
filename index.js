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

const { search } = require("./services/dhotel");

search(51.5071, -0.1416, "2026-04-04", "2026-04-07", "gold");

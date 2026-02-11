const express = require("express");
const http = require("http");
const { initSocket } = require("./socket");
const bodyParser = require("body-parser");
const cors = require("cors");
const passport = require("passport");
const connectDB = require("./config/db");
const fs = require("fs");
require("dotenv").config();
require("./config/passport")(passport);

const app = express();
const server = http.createServer(app);

// Initialize socket.io
initSocket(server);

// User routes
const userAuthRoutes = require("./routes/user/auth");
const userUserRoutes = require("./routes/user/user");
const userCallbacksRoutes = require("./routes/user/callbacks");
const userDiditRoutes = require("./routes/user/didit");
const userEventRoutes = require("./routes/user/event");
const userReviewRoutes = require("./routes/user/review");
const userBookingRoutes = require("./routes/user/booking");
const userStripeRoutes = require("./routes/user/stripe");
const userTicketRoutes = require("./routes/user/ticket");
const userTransactionRoutes = require("./routes/user/transaction");
const userWeb3Routes = require("./routes/user/web3");
const userSubscriptionRoutes = require("./routes/user/subscription");
const userConversationRoutes = require("./routes/user/conversation");
const userMessageRoutes = require("./routes/user/message");
const userUploadRoutes = require("./routes/user/upload");

app.use(cors());
app.use(passport.initialize());

// Special middleware for Didit webhook (raw body)
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

app.use("/api/v1/auth", userAuthRoutes);
app.use("/api/v1/user", userUserRoutes);
app.use("/api/v1/callbacks", userCallbacksRoutes);
app.use("/api/v1/didit", userDiditRoutes);
app.use("/api/v1/events", userEventRoutes);
app.use("/api/v1/reviews", userReviewRoutes);
app.use("/api/v1/ticket", userTicketRoutes);
app.use("/api/v1/subscription", userSubscriptionRoutes);
app.use("/api/v1/tx", userTransactionRoutes);
app.use("/api/v1/upload", userUploadRoutes);

app.use(
  "/api/v1/booking",
  passport.authenticate("jwt", { session: false }),
  userBookingRoutes,
);
app.use(
  "/api/v1/stripe",
  passport.authenticate("jwt", { session: false }),
  userStripeRoutes,
);
app.use(
  "/api/v1/web3",
  passport.authenticate("jwt", { session: false }),
  userWeb3Routes,
);
app.use(
  "/api/v1/conversations",
  passport.authenticate("jwt", { session: false }),
  userConversationRoutes,
);
app.use(
  "/api/v1/messages",
  passport.authenticate("jwt", { session: false }),
  userMessageRoutes,
);

// Connect DB
connectDB();

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`Server is running on ${PORT}`);
});

// require("./services/ticketmaster");

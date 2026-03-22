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
const { diditWebhook } = require("./controllers/user/didit");
app.post(
  "/api/v1/didit/webhook",
  bodyParser.json({
    verify: (req, res, buf, encoding) => {
      if (buf && buf.length) {
        req.rawBody = buf.toString(encoding || "utf8");
      }
    },
  }),
  async (req, res) => {
    try {
      console.log("didit webhook is being called.");
      await diditWebhook(req, res);
    } catch (error) {
      console.error("didit webhook error: ", error);
      res.status(500).json({ ok: false, message: "Something went wrong" });
    }
  },
);

// Special middleware for Stripe webhook (raw body)
const userStripeController = require("./controllers/user/stripe");
app.use(
  "/api/v1/stripe/webhook",
  bodyParser.raw({ type: "application/json" }),
  userStripeController.webhook,
);
const userFlightController = require("./controllers/user/flight");
app.post(
  "/api/v1/flight/webhook",
  bodyParser.raw({ type: "application/json" }),
  userFlightController.webhook,
);
const userAirwallexController = require("./controllers/user/airwallex");
app.use(
  "/api/v1/airwallex/webhook",
  bodyParser.raw({ type: "application/json" }),
  userAirwallexController.webhook,
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

// const {
//   getAirportGatewayId,
//   getAllRoutesByGatewayId,
//   createQuote,
//   createBooking,
//   amendBooking,
//   cancelBooking,
// } = require("./services/transfer");

// const testTransfer = async () => {
//   // const gatewayId = await getAirportGatewayId();
//   // console.log("Barcelona airport gateway id: ", gatewayId);
//   // const routeId = await getAllRoutesByGatewayId(gatewayId);
//   // console.log("Route id: ", routeId);
//   const quote = await createQuote();
//   console.log("Quote: ", quote);
//   const booking = await createBooking(quote.quoteId, quote.offerHash);
//   console.log("Booking: ", booking);
//   // const amend = await amendBooking(booking);
//   // console.log("Amend: ", amend);
//   // const result = await cancelBooking(booking);
//   // console.log("Cancel result: ", result);
// };

// testTransfer();

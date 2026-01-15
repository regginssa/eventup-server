const Amadeus = require("amadeus");

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET,
});

const fetchFlightOfferSearch = async (
  type = "standard",
  originLocationCode,
  destinationLocationCode,
  departureDate,
  adults = 1
) => {
  try {
    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode,
      destinationLocationCode,
      departureDate: departureDate,
      adults: adults,
      departureDate,
      oneWay: true,
    });

    return response.data;
  } catch (error) {
    console.error("Amadeus API error:", error);
    throw error;
  }
};

module.exports = {
  fetchFlightOfferSearch,
};

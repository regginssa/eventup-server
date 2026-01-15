const Amadeus = require("amadeus");

// Determine hostname: 'test' or 'production' (defaults to 'production')
// Set AMADEUS_HOSTNAME=test in .env for test environment
const hostname = process.env.AMADEUS_HOSTNAME || "test";

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET,
  hostname: hostname, // Explicitly set hostname
  logLevel: "warn", // Reduce log noise, but keep errors
});

/**
 * Get location code (airport or city) from coordinates using Amadeus API
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<string|null>} - Location code (IATA) or null if not found
 */
const getLocationCodeFromCoords = async (latitude, longitude) => {
  try {
    const response = await amadeus.referenceData.locations.airports.get({
      latitude,
      longitude,
    });

    // Return the IATA code of the first result (closest airport)
    if (response.data && response.data.length > 0) {
      return response.data[0].iataCode;
    }

    return null;
  } catch (error) {
    console.error("Error getting location code from coords:", error);
    return null;
  }
};

const fetchFlightOfferSearch = async (
  type = "standard",
  originLocationCode,
  destinationLocationCode,
  departureDate,
  adults = 1
) => {
  try {
    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: "LON",
      destinationLocationCode: "NYC",
      departureDate: "2026-01-20",
      adults: 1,
      oneWay: true,
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching flight offer search:", error);
    return [];
  }
};

module.exports = {
  fetchFlightOfferSearch,
  getLocationCodeFromCoords,
};

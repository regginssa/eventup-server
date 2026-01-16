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
    } else {
      const { findNearestAirport } = require("../utils/airports");
      const nearestAirport = findNearestAirport(latitude, longitude);
      if (nearestAirport && nearestAirport.iata) {
        return nearestAirport.iata;
      }
    }

    return null;
  } catch (error) {
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
      travelClass: type === "standard" ? "ECONOMY" : "BUSINESS",
      originLocationCode,
      destinationLocationCode,
      departureDate,
      adults,
      currencyCode: "USD",
    });

    return response.data || [];
  } catch (error) {
    return [];
  }
};

//----------------- Hotel Booking Engine -----------------

/**
 * Fetch hotel list from Amadeus API
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {string} checkInDate - Check-in date
 * @param {string} checkOutDate - Check-out date
 * @param {number} adults - Number of adults
 * @param {number} roomQuantity - Number of rooms
 * @param {string} currency - Currency code
 * @returns {Promise<Array>} - Array of hotel offers
 */
const fetchHotelsList = async (
  latitude,
  longitude,
  checkInDate,
  checkOutDate,
  adults,
  roomQuantity,
  currency = "USD"
) => {
  try {
    const response = await amadeus.shopping.hotelOffers.get({
      latitude, // Latitude
      longitude, // Longitude
      radius: 5, // Optional — radius in km (default 5)
      radiusUnit: "KM", // Optional — unit can be 'KM' or 'MILE'
      adults, // Optional — number of guests
      checkInDate,
      checkOutDate,
      roomQuantity, // Optional — number of rooms
      currency, // Optional — display currency
    });

    return response.data || [];
  } catch (error) {
    return [];
  }
};

module.exports = {
  fetchFlightOfferSearch,
  getLocationCodeFromCoords,
  fetchHotelsList,
};

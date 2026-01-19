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

//----------------- Flight Booking Engine -----------------

/**
 * Get location code (airport or city) from coordinates using Amadeus API
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<string|null>} - Location code (IATA) or null if not found
 */
const fetchAirportLocationCodeFromCoords = async (latitude, longitude) => {
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

const fetchPointOfInterest = async (latitude, longitude) => {
  try {
    const pois = await amadeus.referenceData.locations.pointsOfInterest.get({
      latitude,
      longitude,
      radius: 2,
    });

    return pois.data[0].id;
  } catch (error) {
    return null;
  }
};

//----------------- Flight Booking Engine -----------------

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
 */
const fetchHotelsList = async (latitude, longitude) => {
  try {
    const response = await amadeus.referenceData.locations.hotels.byGeocode.get(
      {
        latitude,
        longitude,
      }
    );

    return response.data || [];
  } catch (error) {
    return [];
  }
};

/**
 * Fetch hotel offers from Amadeus API
 * @param {string} hotelIds - Comma-separated hotel IDs
 * @param {string} checkInDate - Check-in date
 * @param {string} checkOutDate - Check-out date
 * @param {number} adults - Number of adults
 * @param {number} roomQuantity - Number of rooms
 * @param {string} currency - Currency code
 * @param {string} type - Hotel type (standard or gold)
 */
const fetchHotelOffers = async (
  hotelIds,
  checkInDate,
  checkOutDate,
  adults = 1,
  roomQuantity = 1,
  currency = "USD",
  type = "standard"
) => {
  try {
    const response = await amadeus.shopping.hotelOffersSearch.get({
      hotelIds,
      checkInDate,
      checkOutDate,
      adults,
      roomQuantity,
      currency,
      boardType: type === "standard" ? "BED_AND_BREAKFAST" : "ALL_INCLUSIVE",
    });

    return response.data || [];
  } catch (error) {
    return [];
  }
};

//----------------- Transfer Booking Engine -----------------

/**
 * Fetch transfer offers from Amadeus API
 * @param {string} startLocationCode - Start location code
 * @param {string} endAddressLine - End address line
 * @param {string} endCityName - End city name
 * @param {string} endZipCode - End zip code
 * @param {string} endCountryCode - End country code
 * @param {string} endName - End name
 * @param {string} endGeoCode - End geo code
 * @param {string} transferType - Transfer type
 * @param {string} startDateTime - Start date time
 * @param {number} passengers - Number of passengers
 */
const fetchTransferOffers = async (
  startLocationCode,
  endAddressLine,
  endCityName,
  endZipCode,
  endCountryCode,
  endName,
  endGeoCode,
  transferType,
  startDateTime,
  passengers
) => {
  console.log("params: ", startLocationCode,
    endAddressLine,
    endCityName,
    endZipCode,
    endCountryCode,
    endName,
    endGeoCode,
    transferType,
    startDateTime,
    passengers)

  try {
    const response = await amadeus.shopping.transferOffers.post({
      startLocationCode,
      endAddressLine,
      endCityName,
      endZipCode,
      endCountryCode,
      endName,
      endGeoCode,
      // transferType,
      startDateTime,
      passengers
    });
    return response.data || [];
  } catch (error) {
    return [];
  }
};

module.exports = {
  fetchAirportLocationCodeFromCoords,
  fetchPointOfInterest,
  fetchFlightOfferSearch,
  fetchHotelsList,
  fetchHotelOffers,
  fetchTransferOffers,
};

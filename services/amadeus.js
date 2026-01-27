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

//----------------- Flight Booking Engine -----------------

/**
 * Fetch flight offers from Amadeus API
 * @param {string} type - Flight type (standard or gold)
 * @param {string} originLocationCode - Origin location code
 * @param {string} destinationLocationCode - Destination location code
 * @param {string} departureDate - Departure date
 * @param {number} adults - Number of adults
 */
const fetchFlightOffers = async (
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

/**
 * Fetch flight offers pricing from Amadeus API
 * @param {array} flightOffers - Flight offers
 */
const fetchFlightOffersPricing = async (flightOffers) => {
  try {
    const response = await amadeus.shopping.flightOffers.pricing.post({
      data: {
        type: "flight-offers-pricing",
        flightOffers,
      },
    });

    return response.data?.flightOffers || [];
  } catch (error) {
    return [];
  }
};

/**
 * Create flight order from Amadeus API
 * @param {object} params - Parameters
 * @param {array} params.flightOffers - Flight offers
 * @param {array} params.travelers - Travelers
 * @param {object} params.remarks - Remarks
 * @param {array} params.contacts - Contacts
 */
const createFlightOrder = async (params) => {
  try {
    const { flightOffers, travelers, remarks, contacts } = params;

    const response = await amadeus.booking.flightOrders.post({
      data: {
        type: "flight-order",
        flightOffers,
        travelers,
        remarks,
        contacts,
      },
    });

    return {
      ok: true,
      data: response.data,
    }
  } catch (error) {
    return {
      ok: false,
      message: error.title,
    };
  }
};

/**
 * Fetch flight order from Amadeus API
 * @param {string} orderId - Order ID
 */
const fetchFlightOrder = async (orderId) => {
  try {
    const response = await amadeus.shopping.flightOrders.get(orderId);
    return response.data || null;
  } catch (error) {
    return null;
  }
};

/**
 * Cancel flight order from Amadeus API
 * @param {string} orderId - Order ID
 */
const deleteFlightOrder = async (orderId) => {
  try {
    const response = await amadeus.shopping.flightOrders.delete(orderId);
    return response.data || null;
  } catch (error) {
    return null;
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

/**
 * Fetch hotel offer pricing from Amadeus API
 * @param {string} offerId - Offer ID
 */
const fetchHotelOfferPricing = async (offerId) => {
  try {
    const response = await amadeus.client.get(
      `/v3/shopping/hotel-offers/${offerId}`
    );

    return response.data || null;
  } catch (error) {
    console.error("fetch hotel offer pricing error: ", error);
    return null;
  }
};

/**
 * Create hotel order from Amadeus API
 * @param {object} params - Parameters
 * @param {array} params.guests - Guests
 * @param {string} params.travelAgent - Travel agent
 * @param {array} params.roomAssociations - Room associations
 * @param {object} params.payment - Payment
 */
const createHotelOrder = async (params) => {
  try {
    const { guests, travelAgent, roomAssociations, payment } = params;

    const response = await amadeus.client.post("/v2/booking/hotel-orders", {
      data: {
        type: "hotel-order",
        guests,
        travelAgent,
        roomAssociations,
        payment,
      },
    });
    return {
      ok: true,
      data: response.data,
    };
  } catch (error) {
    return {
      ok: false,
      message: error.title,
    };
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
  console.log(
    "params: ",
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
  );

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
      passengers,
    });
    return response.data || [];
  } catch (error) {
    return [];
  }
};

/**
 * Create transfer order from Amadeus API
 * @param {object} params - Parameters
 * @param {string} params.offerId - Offer ID
 * @param {string} params.note - Note
 * @param {number} params.passengers - Number of passengers
 * @param {object} params.agency - Agency
 * @param {object} params.payment - Payment
 * @param {array} params.extraServices - Extra services
 * @param {object} params.corporation - Corporation
 * @param {object} params.startConnectedSegment - Start connected segment
 * @param {object} params.endConnectedSegment - End connected segment
 */
const createTransferOrder = async (params) => {
  try {
    const { id: offerId } = params;

    const response = await amadeus.client.post(
      `/v1/ordering/transfer-orders/${offerId}`,
      {
        data: { ...params, note: "" },
      }
    );

    return {
      ok: true,
      data: response.data,
    };
  } catch (error) {
    console.error("create transfer order error: ", error);
    return {
      ok: false,
      message: error.response.result.errors[0].title,
    };
  }
};

module.exports = {
  fetchAirportLocationCodeFromCoords,
  fetchFlightOffers,
  fetchFlightOffersPricing,
  createFlightOrder,
  fetchFlightOrder,
  deleteFlightOrder,

  fetchHotelsList,
  fetchHotelOffers,
  fetchHotelOfferPricing,
  createHotelOrder,

  fetchTransferOffers,
  createTransferOrder,
};

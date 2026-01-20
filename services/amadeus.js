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
 * @param {array} flightOffers - Flight offers
 * @param {array} travelers - Travelers
 */
const createFlightOrder = async (flightOffers, travelers) => {
  try {
    const remarks = {
      general: [
        {
          subType: "GENERAL_MISCELLANEOUS",
          text: "ONLINE BOOKING FROM CHARLIE UNICORN AI",
        },
      ],
    };

    const contacts = [
      {
        addresseeName: {
          firstName: "Lukasz",
          lastName: "Szymborski",
        },
        companyName: "CHARLIE UNICORN AI",
        purpose: "STANDARD",
        phones: [
          {
            deviceType: "MOBILE",
            countryCallingCode: "48",
            number: "504412991",
          },
        ],
        emailAddress: "team@charlieunicornai.eu",
        address: {
          lines: ["Calle Prado, 16"],
          postalCode: "28014",
          cityName: "Madrid",
          countryCode: "ES",
        },
      },
    ];

    const response = await amadeus.shopping.flightOrders.post({
      data: {
        type: "flight-order",
        flightOffers,
        travelers,
        remarks,
        contacts,
      },
    });

    return response.data || null;
  } catch (error) {
    return null;
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
    const response = await amadeus.shopping.hotelOffers.get(offerId);
    return response.data || null;
  } catch (error) {
    return null;
  }
};

/**
 * Create hotel order from Amadeus API
 * @param {array} guests - Guests
 * @param {string} travelAgent - Travel agent
 * @param {array} roomAssociations - Room associations
 * @param {object} payment - Payment
 */
const createHotelOrder = async (
  guests,
  travelAgent,
  roomAssociations,
  payment
) => {
  try {
    const response = await amadeus.shopping.hotelOrders.post({
      data: {
        type: "hotel-order",
        guests,
        travelAgent,
        roomAssociations,
        payment,
      },
    });
    return response.data || null;
  } catch (error) {
    return null;
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
 * @param {string} offerId - Offer ID
 * @param {string} note - Note
 * @param {number} passengers - Number of passengers
 * @param {object} agency - Agency
 * @param {object} payment - Payment
 * @param {array} extraServices - Extra services
 * @param {object} corporation - Corporation
 * @param {object} startConnectedSegment - Start connected segment
 * @param {object} endConnectedSegment - End connected segment
 */
const createTransferOrder = async (
  offerId,
  note,
  passengers,
  agency,
  payment,
  extraServices,
  corporation,
  startConnectedSegment,
  endConnectedSegment
) => {
  try {
    const response = await amadeus.shopping.transferOrders.post({
      offerId,
      data: {
        note,
        passengers,
        agency,
        payment,
        extraServices,
        corporation,
        startConnectedSegment,
        endConnectedSegment,
      },
    });
    return response.data || null;
  } catch (error) {
    return null;
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

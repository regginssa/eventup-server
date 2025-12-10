/*
@params = {
  type = "standard" | "gold",
  airportOriginCode = "JFK",
  airportDestinationCode = "LAX",
  departureDate = "2025-01-01", YYYY-MM-DD
  adults = 1,
  childs = 0,
  infants = 0,
  requiredCurrency = "USD"
}
*/

const { parseDateTime } = require("../utils/format");

const fetchFlightAvailability = async (
  type = "standard",
  airportOriginCode,
  airportDestinationCode,
  departureDate,
  adults = 1,
  childs = 0,
  infants = 0,
  requiredCurrency = "USD"
) => {
  const res = await fetch(process.env.TRAVELOPRO_FLIGHT_AVAILABILITY_API_URL, {
    method: "POST",
    headers: {},
    body: JSON.stringify({
      user_id: process.env.TRAVELOPRO_USER_ID,
      user_password: process.env.TRAVELOPRO_USER_PASSWORD,
      access: process.env.TRAVELOPRO_ACCESS_MODE,
      ip_address: "50.7.159.34",
      requiredCurrency,
      journeyType: "OneWay",
      OriginDestinationInfo: [
        {
          departureDate,
          airportOriginCode,
          airportDestinationCode,
        },
      ],
      class: type === "standard" ? "Economy" : "Business",
      adults,
      childs,
      infants,
    }),
  });

  const response = await res.json();

  if (response.Errors) {
    return {
      flights: [],
      session_id: null,
    };
  }

  return {
    flights: response.AirSearchResponse.AirSearchResult.FareItineraries || [],
    session_id: response.AirSearchResponse.session_id || null,
  };
};

function getCheapestFlight(flights) {
  if (!Array.isArray(flights) || flights.length === 0) {
    return null;
  }

  let cheapest = null;
  let minPrice = Infinity;

  for (const item of flights) {
    try {
      const fareInfo = item.FareItinerary?.AirItineraryFareInfo;
      const priceStr = fareInfo?.ItinTotalFares?.TotalFare?.Amount;

      if (!priceStr) continue;

      const price = parseFloat(priceStr);
      if (isNaN(price)) continue;

      if (price < minPrice) {
        minPrice = price;
        cheapest = item;
      }
    } catch (err) {
      // Skip broken items safely
      continue;
    }
  }

  return cheapest;
}

/*
@params = {
  "user_id": "<id>",
  "user_password": "<password>",
  "access": "Test",
  "ip_address": "127.0.0.1",
  "requiredCurrency": "USD",
  "nationality": "US",
  "checkin": "2025-11-16",
  "checkout": "2025-11-18",
  "latitude": 36.116156,
  "longitude": -115.175058,
  "city_name": "Las Vegas",
  "country_name": "United States",
  "radius": 20,
  "maxResult": 30,
  "occupancy": [
    {
      "room_no": 1,
      "adult": 2,
      "child": 0,
      "child_age": [0]
    }
  ]
}
*/

const fetchHotelAvailability = async (
  requiredCurrency,
  nationality,
  checkin,
  checkout,
  latitude,
  longitude,
  city_name,
  country_name,
  radius = 20,
  maxResult = 30,
  occupancy = [{ room_no: 1, adult: 1, child: 0, child_age: [0] }]
) => {
  const res = await fetch(process.env.TRAVELOPRO_HOTEL_AVAILABILITY_API_URL, {
    method: "POST",
    headers: {},
    body: JSON.stringify({
      user_id: process.env.TRAVELOPRO_USER_ID,
      user_password: process.env.TRAVELOPRO_USER_PASSWORD,
      access: process.env.TRAVELOPRO_ACCESS_MODE,
      ip_address: "50.7.159.34",
      requiredCurrency,
      nationality,
      checkin,
      checkout,
      latitude,
      longitude,
      city_name,
      country_name,
      radius,
      maxResult,
      occupancy,
    }),
  });

  const response = await res.json();

  if (response.status.errors) {
    return {
      session_id: null,
      hotels: [],
    };
  }

  return {
    session_id: response.status.sessionId || null,
    hotels: response.itineraries || [],
  };
};

/**
 * Get cheapest mid-range hotel (3 or 4 star) from Travelopro hotel response
 * @param {Array} hotels
 * @returns {Object|null}
 */
function getCheapestMidRangeHotel(hotels) {
  if (!Array.isArray(hotels) || hotels.length === 0) {
    return null;
  }

  // 1. Filter for mid-range (3 & 4 star hotels)
  const midRangeHotels = hotels.filter((h) => {
    const rating = Number(h.hotelRating || 0);
    return rating === 3 || rating === 4;
  });

  if (midRangeHotels.length === 0) {
    return null;
  }

  // 2. Find hotel with lowest total price
  let cheapest = null;
  let minPrice = Infinity;

  for (const h of midRangeHotels) {
    const priceStr = h.total;
    if (!priceStr) continue;

    const price = parseFloat(priceStr);
    if (isNaN(price)) continue;

    if (price < minPrice) {
      minPrice = price;
      cheapest = h;
    }
  }

  return cheapest;
}

const fetchTransfersAvailability = async (
  currency = "USD",
  adults,
  children,
  infants,
  pickupLat,
  pickupLon,
  dropoffLat,
  dropoffLon,
  arrivalDateTime,
  pickupLocationType,
  dropoffLocationType,
  sorting = "price-low-high",
  pickupDate,
  pickupTime
) => {
  const arrival = parseDateTime(arrivalDateTime);

  console.log(pickupDate, pickupTime);

  let payload = {
    user_id: process.env.TRAVELOPRO_USER_ID,
    user_password: process.env.TRAVELOPRO_USER_PASSWORD,
    access: process.env.TRAVELOPRO_ACCESS_MODE,
    ip_address: "50.7.159.34",

    journey_type: "OneWay",
    search_currency: currency,

    adults: String(adults),
    children: String(children),
    infants: String(infants),

    // GEO search values for airport → hotel
    pickup_location_code: `${pickupLat},${pickupLon}`,
    pickup_location_type: pickupLocationType,

    dropoff_location_code: `${dropoffLat},${dropoffLon}`,
    dropoff_location_type: dropoffLocationType,

    // Flight arrival at destination
    arrival_date: arrival.date,
    arrival_time: arrival.time,

    // // Flight departure (return)
    // departure_date: departure.date,
    // departure_time: departure.time,

    sorting,
  };

  if (pickupDate) {
    payload.pickup_date = pickupDate;
    payload.pickup_time = pickupTime;
  }

  console.log("Transfer availability payload: ", payload);

  const response = await fetch(
    process.env.TRAVELOPRO_TRANSFER_AVAILABILITY_API_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Transfer API error: ${response.status} ${text}`);
  }

  return await response.json();
};

/**
 * Fetch detailed hotel information from Travelopro Hotel Details API
 *
 * @param {Object} params
 * @param {string} params.sessionId   - Returned from Hotel Search Results API
 * @param {string} params.hotelId     - Hotel ID from search results
 * @param {string} params.productId   - Product ID (e.g., trx109)
 * @param {string} params.tokenId     - Token ID from search results
 */
async function fetchHotelDetails({ sessionId, hotelId, productId, tokenId }) {
  if (!sessionId || !hotelId || !productId || !tokenId) {
    throw new Error("Missing required parameters for hotelDetails API");
  }

  const url = `https://travelnext.works/api/hotel-api-v6/hotelDetails?sessionId=${sessionId}&hotelId=${hotelId}&productId=${productId}&tokenId=${tokenId}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Hotel Details API Error: ${res.status} - ${txt}`);
  }

  const data = await res.json();
  return data;
}

async function validateFlightFareMethod(session_id, fare_source_code) {
  const res = await fetch(process.env.TRAVELOPRO_VALIDATE_FLIGHT_FARE_METHOD, {
    method: "POST",
    headers: {},
    body: JSON.stringify({
      session_id,
      fare_source_code,
    }),
  });

  const response = await res.json();

  if (response?.AirRevalidateResponse?.AirRevalidateResult) {
    return response?.AirRevalidateResponse?.AirRevalidateResult.IsValid;
  }

  return false;
}

async function flightBookingMethod(payload) {
  try {
    const res = await fetch(process.env.TRAVELOPRO_FLIGHT_BOOKING_METHOD, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const response = await res.json();

    const result = response?.BookFlightResponse?.BookFlightResult;
    if (!result) {
      return {
        success: false,
        errorMessage:
          response?.Errors?.Error?.ErrorMessage ?? "Unexpected response format",
      };
    }

    const isSuccess =
      typeof result.Success === "string"
        ? result.Success.toLowerCase() === "true"
        : Boolean(result.Success);

    // 🔥 extract common fields
    const common = {
      status: result.Status,
      success: isSuccess,
      target: result.Target,
      tktTimeLimit: result.TktTimeLimit,
      uniqueId: result.UniqueID,
    };

    // 🟢 Successful booking
    if (isSuccess) {
      console.log(isSuccess);
      return { ...common, errorMessage: "" };
    }

    // 🔴 Error booking — normalize error message
    const errorMsg =
      result.Errors?.ErrorMessage ??
      result?.Errors?.Error?.ErrorMessage ??
      result.Errors?.[0]?.Errors?.ErrorMessage ??
      "Booking failed";

    return { ...common, errorMessage: errorMsg };
  } catch (err) {
    console.error("❌ Flight booking failed:", err);
    return {
      success: false,
      errorMessage: err?.message ?? "Network error",
    };
  }
}

// Ticket order methods ----------------------------------------------------------------
async function flightTicketOrderMethod(uniqueId) {
  const res = await fetch(process.env.TRAVELOPRO_FLIGHT_TICKET_ORDER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: process.env.TRAVELOPRO_USER_ID,
      user_password: process.env.TRAVELOPRO_USER_PASSWORD,
      access: process.env.TRAVELOPRO_ACCESS_MODE,
      ip_address: "50.7.159.34",
      UniqueID: uniqueId,
    }),
  });

  const response = await res.json();

  if (response?.Errors) {
    return {
      errorMessage: response.Errors.ErrorMessage,
      success: false,
    };
  }

  const result = response.AirOrderTicketRS.TicketOrderResult;

  const errorMessage = result?.Errors?.Error?.ErrorMessage ?? "";

  return {
    errorMessage,
    success:
      typeof result.Success === "string"
        ? result.Success.toLowerCase() === "true"
        : Boolean(result.Success),
    uniqueId: result.UniqueID,
  };
}

async function fetchFlightTripDetails(uniqueId) {
  const res = await fetch(process.env.TRAVELOPRO_FLIGHT_TRIP_DETAILS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: process.env.TRAVELOPRO_USER_ID,
      user_password: process.env.TRAVELOPRO_USER_PASSWORD,
      access: process.env.TRAVELOPRO_ACCESS_MODE,
      ip_address: "50.7.159.34",
      UniqueID: uniqueId,
    }),
  });

  const response = await res.json();

  if (response?.Errors?.ErrorMessage) {
    return response.Errors.ErrorMessage;
  }

  return response?.TripDetailsResponse?.TripDetailsResult;
}

async function fetchRoomRates(sessionId, productId, tokenId, hotelId) {
  const res = await fetch(process.env.TRAVELOPRO_HOTEL_ROOM_RATES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionId,
      productId,
      tokenId,
      hotelId,
    }),
  });

  const response = await res.json();

  return response?.roomRates?.perBookingRates;
}

async function checkRoomRates(sessionId, productId, tokenId, rateBasisId) {
  const res = await fetch(process.env.TRAVELOPRO_HOTEL_CHECK_ROOM_RATES, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionId,
      productId,
      tokenId,
      rateBasisId,
    }),
  });

  const response = await res.json();

  return response?.roomRates?.perBookingRates;
}

// {
//   "sessionId":"TVRVNE1qSTJOelEzTVY4ME5UZGZNVEkxTGprNUxqSTBNUzR5TkE9PV8w",
//   "productId":"trx101",
//   "tokenId":"HTB0zd1QyPEeR3oIpmVn",
//   "rateBasisId": "MTU3",
//   "clientRef":"TDB85454",
//   "customerEmail":"test@gmail.com",
//   "customerPhone":"53453454334",
//   "bookingNote":"Remark",
//   "paxDetails":[
//     {
//       "room_no":1,
//       "adult":{
//         "title":["Mr","Mr"],
//         "firstName":["test1","test2"],
//         "lastName":["last1","last2"]
//       }
//     }
//   ]
// }

async function hotelBookingMethod(payload) {
  console.log(payload);

  const res = await fetch(process.env.TRAVELOPRO_HOTEL_BOOKING_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...payload, clientRef: "TDB85454" }),
  });

  const response = await res.json();

  return response;
}

async function fetchHotelBookingDetails(supplierConfirmationNum, referenceNum) {
  const res = await fetch(
    process.env.TRAVELOPRO_HOTEL_BOOKING_DETAILS_API_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: process.env.TRAVELOPRO_USER_ID,
        user_password: process.env.TRAVELOPRO_USER_PASSWORD,
        access: process.env.TRAVELOPRO_ACCESS_MODE,
        ip_address: "50.7.159.34",
        supplierConfirmationNum,
        referenceNum,
      }),
    }
  );

  const response = await res.json();

  return response;
}

module.exports = {
  fetchFlightAvailability,
  validateFlightFareMethod,
  flightBookingMethod,
  flightTicketOrderMethod,
  fetchHotelAvailability,
  getCheapestFlight,
  getCheapestMidRangeHotel,
  fetchTransfersAvailability,
  fetchHotelDetails,
  fetchFlightTripDetails,
  fetchRoomRates,
  checkRoomRates,
  hotelBookingMethod,
  fetchHotelBookingDetails,
};

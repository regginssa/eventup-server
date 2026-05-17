const { Duffel } = require("@duffel/api");
const ACCESS_TOKEN = process.env.DUFFEL_ACCESS_TOKEN;

const duffel = new Duffel({
  token: ACCESS_TOKEN,
});

function matchHotelByPackage(accommodation, packageType) {
  const rating = accommodation.rating || 0;
  const amenitiesCount = accommodation.amenities?.length || 0;

  if (packageType === "gold") {
    return rating >= 5 || amenitiesCount >= 15;
  }

  if (packageType === "standard") {
    return rating <= 4;
  }

  return true;
}

function formatCheckInInfo(info) {
  if (!info) return "";

  const parts = [];

  if (info.check_in_after_time) {
    parts.push(`Check-in from ${info.check_in_after_time}`);
  }

  if (info.check_in_before_time && info.check_in_before_time !== "00:00") {
    parts.push(`until ${info.check_in_before_time}`);
  }

  if (info.check_out_before_time) {
    parts.push(`Check-out before ${info.check_out_before_time}`);
  }

  return parts.join(" • ");
}

function map(data, type = "search") {
  if (type !== "search") return null;

  const rooms = data.accommodation.rooms || [];

  const defaultRoom =
    rooms.find((r) => Array.isArray(r.rates) && r.rates.length > 0) || null;

  if (!defaultRoom) return null;

  const defaultRate = defaultRoom.rates[0];
  if (!defaultRate) return null;

  const getCondition = (title) =>
    defaultRate.conditions?.find((c) => c.title === title)?.description || null;

  return {
    // =====================
    // IDS
    // =====================
    id: `${data.accommodation.id}_${defaultRate.id}`,
    hotelId: data.accommodation.id,
    rateId: defaultRate.id,

    // =====================
    // HOTEL
    // =====================
    name: data.accommodation.name,
    category: `${data.accommodation.rating} STARS`,

    address: data.accommodation.location?.address?.line_one || "",
    city: data.accommodation.location?.address?.city_name || "",
    countryCode: data.accommodation.location?.address?.country_code || "",

    latitude: String(
      data.accommodation.location?.geographic_coordinates?.latitude ?? "",
    ),
    longitude: String(
      data.accommodation.location?.geographic_coordinates?.longitude ?? "",
    ),

    image: data.accommodation.photos?.[0]?.url || "",

    // =====================
    // PRICING
    // =====================
    currency: defaultRate.public_currency,
    totalAmount: Number(defaultRate.total_amount),
    netAmount: Number(defaultRate.base_amount),
    taxes: Number(defaultRate.tax_amount),
    fees: Number(defaultRate.fee_amount),
    dueAtAccommodation: Number(defaultRate.due_at_accommodation_amount),

    // =====================
    // ROOM
    // =====================
    roomName: defaultRoom.name,
    boardName: defaultRate.board_type,

    // =====================
    // POLICIES
    // =====================
    ratePolicy:
      getCondition("Rate Description") ||
      getCondition("Description") ||
      defaultRate.description ||
      null,

    cancellationPolicy: {
      raw: defaultRate.cancellation_timeline || defaultRate.conditions || [],
      summary:
        getCondition("Guarantee Policy") ||
        getCondition("Cancellation Policy") ||
        null,
      refundable:
        (defaultRate.cancellation_timeline?.length ?? 0) > 0 ||
        defaultRate.conditions?.some((c) =>
          c.title?.toLowerCase().includes("cancellation"),
        ),
      timeline: defaultRate.cancellation_timeline || [],
    },

    // =====================
    // SERVICES
    // =====================
    services: (data.accommodation.amenities || []).map((a) => ({
      description: a.description || a.name || a,
      type: a.type || a.code || "unknown",
    })),

    // =====================
    // DATES
    // =====================
    checkIn: data.check_in_date,
    checkOut: data.check_out_date,
    checkInInfo: formatCheckInInfo(data.accommodation.check_in_information),

    // =====================
    // FULL DATA
    // =====================
    rooms: rooms.map((room) => ({
      name: room.name,
      rates: room.rates || [],
    })),

    defaultRoom,
    defaultRate,

    // =====================
    // PAYMENT META (DUFFEL SAFE)
    // =====================
    payment: {
      type: defaultRate.payment_type,
      methods: defaultRate.available_payment_methods || [],
      instructionAllowed: defaultRate.payment_instruction_allowed,
    },

    availability: {
      quantity: defaultRate.quantity_available,
      expiresAt: defaultRate.expires_at,
    },

    // =====================
    // CONVERTED
    // =====================
    converted: {
      totalAmount: Number(defaultRate.total_amount),
      netAmount: Number(defaultRate.base_amount),
      taxes: Number(defaultRate.tax_amount),
      fees: Number(defaultRate.fee_amount),
      currency: defaultRate.total_currency,
    },
  };
}

async function search(lat, lng, checkIn, checkOut, packageType) {
  const payload = {
    rooms: 1,
    location: {
      radius: 2,
      geographic_coordinates: {
        longitude: parseFloat(lng),
        latitude: parseFloat(lat),
      },
    },
    check_out_date: checkOut,
    check_in_date: checkIn,
    guests: [{ type: "adult" }],
  };

  try {
    const searchRes = await duffel.stays.search(payload);

    if (!searchRes?.data?.results?.length) return [];

    // ✅ Get ALL matching hotels (not just one)
    const matchedHotels = searchRes.data.results.filter((result) =>
      matchHotelByPackage(result.accommodation, packageType),
    );

    if (matchedHotels.length === 0) return [];

    // ✅ Take top 3
    const topHotels = matchedHotels.slice(0, 3);

    // ✅ Fetch rates for all 3 in parallel
    const results = await Promise.all(
      topHotels.map(async (hotel) => {
        try {
          const ratesRes = await duffel.stays.searchResults.fetchAllRates(
            hotel.id,
          );

          if (!ratesRes?.data) return null;

          return map(ratesRes.data);
        } catch (err) {
          console.error("[hotel rate error]: ", err);
          return null;
        }
      }),
    );

    const offers = results.filter(Boolean);

    console.log(offers[0]);
    return offers;
  } catch (error) {
    console.error("[search hotel error]: ", error);
    return [];
  }
}

async function quote(rateId) {
  try {
    const res = await duffel.stays.quotes.create(rateId);
    if (!res?.data) return null;

    const data = res.data;

    const room = data.accommodation.rooms?.[0];

    if (!room) return null;

    const mapped = {
      id: data.id,
      name: data.accommodation.name,
      category: `${data.accommodation.rating} STARS`,
      address: data.accommodation.location?.address?.line_one,
      street: data.accommodation.location?.address?.line_one,
      city: data.accommodation.location?.address?.city_name,
      postalCode: data.accommodation.location?.address?.postal_code,
      countryCode: data.accommodation.location?.address?.country_code,
      latitude: String(
        data.accommodation.location.geographic_coordinates.latitude,
      ),
      longitude: String(
        data.accommodation.location.geographic_coordinates.longitude,
      ),
      image: data.accommodation.photos?.[0]?.url,
      currency: data.total_currency,
      totalAmount: Number(data.total_amount),
      netAmount: Number(data.base_amount),
      roomName: room?.name,
      boardName: room?.beds?.[0]?.type?.toUpperCase(),
      services: data.accommodation.amenities || [],
      checkIn: data.check_in_date,
      checkOut: data.check_out_date,
      checkInInfo: formatCheckInInfo(data.accommodation.check_in_information),
      converted: {
        totalAmount: 0,
        currency: "EUR",
      },
    };

    return mapped;
  } catch (error) {
    console.error("[quote hotel error]: ", error);
    return null;
  }
}

async function book({ quoteId, phoneNumber, guestInfo, specialRequests = "" }) {
  try {
    const res = await duffel.stays.bookings.create({
      quote_id: quoteId,
      phone_number: phoneNumber,
      guests: [
        {
          given_name: guestInfo.given_name,
          family_name: guestInfo.family_name,
          born_on: guestInfo.born_on,
        },
      ],
      email: guestInfo.email,
      accommodation_special_requests: specialRequests,
    });

    if (!res.data)
      return {
        status: "failed",
        message: "Hotel booking failed",
      };

    return {
      status: "confirmed",
      id: res.data.id,
      reference: res.data.reference,
      hotelName: res.data.accommodation.name,
      checkIn: res.data.check_in_date,
      checkOut: res.data.check_out_date,
      message: "Your booking hotel is confirmed!",
    };
  } catch (error) {
    console.error("[book hotel error]: ", error);
    return {
      status: "failed",
      message: error.response?.data?.error?.message || "Booking hotel failed",
    };
  }
}

module.exports = {
  search,
  quote,
  book,
};

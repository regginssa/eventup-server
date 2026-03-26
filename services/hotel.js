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
  if (type === "search") {
    const room = data.accommodation.rooms?.[0];

    if (!room || !room.rates[0].id) return null;

    return {
      id: room.rates[0].id,
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
      currency: data.cheapest_rate_currency,
      totalAmount: Number(
        data.cheapest_rate_total_amount || data.total_currency || 0,
      ),
      netAmount: Number(
        data.cheapest_rate_base_amount || data.total_currency || 0,
      ),
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
  } else {
  }
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

    if (!searchRes?.data?.results?.length) return null;

    const selectedSearch = searchRes.data.results.find((result) =>
      matchHotelByPackage(result.accommodation, packageType),
    );

    if (!selectedSearch) return null;

    const ratesRes = await duffel.stays.searchResults.fetchAllRates(
      selectedSearch.id,
    );

    if (!ratesRes?.data) return null;

    return map(ratesRes.data);
  } catch (error) {
    console.error("[search hotel error]: ", error);
    return null;
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

async function book(quoteId, phoneNumber, guestInfo, specialRequests = "") {
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

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

    const rate = ratesRes.data;
    const room = rate.accommodation.rooms?.[0];

    const offer = {
      id: rate.id,
      name: rate.accommodation.name,
      category: `${rate.accommodation.rating} STARS`,
      address: rate.accommodation.location?.address?.line_one,
      street: rate.accommodation.location?.address?.line_one,
      city: rate.accommodation.location?.address?.city_name,
      postalCode: rate.accommodation.location?.address?.postal_code,
      countryCode: rate.accommodation.location?.address?.country_code,
      latitude: String(
        rate.accommodation.location.geographic_coordinates.latitude,
      ),
      longitude: String(
        rate.accommodation.location.geographic_coordinates.longitude,
      ),
      image: rate.accommodation.photos?.[0]?.url,
      currency: rate.cheapest_rate_currency,
      totalAmount: Number(rate.cheapest_rate_total_amount || 0),
      netAmount: Number(rate.cheapest_rate_base_amount || 0),
      roomName: room?.name,
      boardName: room?.beds?.[0].type.toUpperCase(),
      services: rate.accommodation.amenities || [],
    };
    console.log("[Duffel Hotel Search offer]: ", offer);
    return offer;
  } catch (error) {
    console.error("[search hotel error]: ", error);
    return null;
  }
}

module.exports = {
  search,
};

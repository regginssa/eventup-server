const BASE_URL = "https://api.duffel.com";
const ACCESS_TOKEN = process.env.DUFFEL_ACCESS_TOKEN;

async function search(
  lat,
  lng,
  checkIn,
  checkOut,
  packageType,
  guestsCount = 1,
) {
  try {
    const isGold = packageType === "gold";

    const response = await fetch(`${BASE_URL}/stays/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Duffel-Version": "v1", // Use v1 or v2 depending on your current token access
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          check_in_date: checkIn,
          check_out_date: checkOut,
          rooms: 1,
          guests: Array(guestsCount).fill({ type: "adult" }),
          location: {
            radius: 15, // Expanded radius for more options
            geographic_coordinates: {
              latitude: Number(lat),
              longitude: Number(lng),
            },
          },
          // We fetch rates immediately to find the room details
          accommodation: { fetch_rates: true },
        },
      }),
    });

    const json = await response.json();

    if (json.errors || !json.data || !json.data.results) {
      console.log("[Duffel Hotel Search Error]:", JSON.stringify(json.errors));
      return null;
    }

    // --- Package Filtering Logic ---
    let filteredResults = json.data.results;

    if (isGold) {
      // GOLD: Filter for 4-5 star hotels or rooms with "Luxury", "Suite", "Deluxe"
      filteredResults = filteredResults.filter((res) => {
        const rating = res.accommodation.rating || 0;
        const roomName = res.rooms[0]?.name?.toLowerCase() || "";
        return (
          rating >= 4 ||
          roomName.includes("deluxe") ||
          roomName.includes("suite")
        );
      });
    } else {
      // STANDARD: Filter for 2-3 star hotels and avoid expensive suites
      filteredResults = filteredResults.filter((res) => {
        const rating = res.accommodation.rating || 0;
        return rating > 0 && rating <= 3.5;
      });
    }

    // If no specific match, fallback to the first available to avoid empty screen
    const result =
      filteredResults.length > 0 ? filteredResults[0] : json.data.results[0];

    const hotel = result.accommodation;
    const rate = result.rooms[0]?.rates[0];

    return {
      id: result.id,
      name: hotel.name,
      // Logic to label category based on your app's packages
      category: isGold ? "Gold (Luxury)" : "Standard",
      address: `${hotel.location.address.line_one}, ${hotel.location.address.city_name}`,
      latitude: hotel.location.geographic_coordinates.latitude.toString(),
      longitude: hotel.location.geographic_coordinates.longitude.toString(),
      image: hotel.photos[0]?.url || "",
      currency: rate?.public_currency || "USD",
      totalAmount: parseFloat(rate?.public_amount || 0),
      netAmount: parseFloat(rate?.base_amount || 0),
      rateId: rate?.id,
      roomName:
        result.rooms[0]?.name || (isGold ? "Luxury Suite" : "Standard Room"),
      boardName: rate?.board_type || "Room Only",
      cancellationPolicy: rate?.cancellation_timeline
        ? {
            amount: parseFloat(
              rate.cancellation_timeline[0]?.refund_amount || 0,
            ),
            from: rate.cancellation_timeline[0]?.before || "",
          }
        : null,
    };
  } catch (err) {
    console.log("[duffel search hotels error]: ", err);
    return null;
  }
}

async function book(rateId, guestDetails, email, phone) {
  try {
    // STEP 1: Create a Quote to lock the price
    const quoteResponse = await fetch(`${BASE_URL}/stays/quotes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Duffel-Version": "v1",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: { rate_id: rateId },
      }),
    });

    const quoteJson = await quoteResponse.json();
    if (!quoteResponse.ok) throw new Error(quoteJson.errors[0].message);

    const quoteId = quoteJson.data.id;

    // STEP 2: Create the Booking using your Duffel Balance
    const response = await fetch(`${BASE_URL}/stays/bookings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Duffel-Version": "v1",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          quote_id: quoteId,
          guests: guestDetails, // Array: [{ given_name, family_name, born_on }]
          email: email,
          phone_number: phone,
          // Stays bookings automatically use your Duffel Balance if set up
        },
      }),
    });

    const json = await response.json();

    if (response.ok) {
      return {
        status: "confirmed",
        bookingReference: json.data.reference, // The hotel's confirmation code
        clientReference: json.data.id, // Your internal Duffel Booking ID
        hotelName: json.data.accommodation?.name || "",
        checkIn: json.data.check_in_date,
        checkOut: json.data.check_out_date,
        totalAmount: parseFloat(quoteJson.data.base_amount),
        currency: quoteJson.data.base_currency,
        message: "Hotel booked successfully!",
      };
    }

    return { status: "failed", message: json.errors[0].message };
  } catch (err) {
    console.error("[hotel book error]: ", err);
    return { status: "failed", message: err.message };
  }
}

module.exports = { search, book };

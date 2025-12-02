const DISCOVER_BASE = "https://app.ticketmaster.com/discovery/v2/events/";
const API_KEY = process.env.TICKETMASTER_API_KEY;

const fetchEventDetailsFromTM = async (eventId) => {
  const url = DISCOVER_BASE + `${eventId}.json?apikey=${API_KEY}`;

  try {
    const res = await fetch(url);

    const data = await res.json();

    return data;
  } catch (error) {
    console.error("fetch event details from tm error: ", error);
    return null;
  }
};

module.exports = { fetchEventDetailsFromTM };

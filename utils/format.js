function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateTime(dateTimeStr) {
  // Input example: "2025-11-20T09:10:00"
  const [date, time] = dateTimeStr.split("T");
  return {
    date,
    time: time.slice(0, 5), // HH:mm
  };
}

module.exports = { formatDate, parseDateTime };

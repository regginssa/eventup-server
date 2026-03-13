const createSession = async (userId) => {
  const url = process.env.DIDIT_SESSION_BASE_URL;
  const callback = `${process.env.DIDIT_CALLBACK}` + `?userId=${userId}`;

  const options = {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-key": process.env.DIDIT_API_KEY,
    },
    body: JSON.stringify({
      workflow_id: process.env.DIDIT_WORKFLOW_ID,
      vendor_data: userId,
      callback,
    }),
  };

  try {
    const response = await fetch(url, options);

    const data = await response.json();

    if (response.status === 201 && data) {
      return data;
    } else {
      console.error("Error creating session:", data.message);
      throw new Error(data.message);
    }
  } catch (error) {
    console.error("Network error:", error);
    throw error;
  }
};

const getSessionDecision = async (sessionId) => {
  const BASE_URL = process.env.DIDIT_SESSION_BASE_URL;
  const endpoint = `${BASE_URL}${sessionId}/decision/`;

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": process.env.DIDIT_API_KEY,
  };

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers,
    });

    const data = await response.json();

    if (response.ok) {
      return data;
    } else {
      console.error("Error fetching session decision:", data.message);
      throw new Error(data.message);
    }
  } catch (err) {
    console.error("Network error:", err);
    throw err;
  }
};

module.exports = { createSession, getSessionDecision };

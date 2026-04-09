const PLAYER_API_BASE = "http://localhost:3000/api/players";

async function parseResponse(response) {
  let payload = null;

  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    const message = payload?.error?.message || "API request failed.";
    throw new Error(message);
  }

  return payload.data;
}

export async function fetchPlayers({ schoolId } = {}) {
  const url = new URL(PLAYER_API_BASE);

  if (schoolId !== undefined && schoolId !== null && schoolId !== "") {
    url.searchParams.set("school_id", schoolId);
  }

  const response = await fetch(url);
  return parseResponse(response);
}

export async function fetchPlayerById(id) {
  const response = await fetch(`${PLAYER_API_BASE}/${id}`);
  return parseResponse(response);
}

export async function createPlayer(playerPayload) {
  const response = await fetch(PLAYER_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(playerPayload),
  });

  return parseResponse(response);
}
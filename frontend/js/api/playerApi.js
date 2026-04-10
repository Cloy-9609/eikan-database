const PLAYER_API_BASE = "/api/players";

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
  const params = new URLSearchParams();

  if (schoolId !== undefined && schoolId !== null && schoolId !== "") {
    params.set("school_id", schoolId);
  }

  const query = params.toString();
  const response = await fetch(query ? `${PLAYER_API_BASE}?${query}` : PLAYER_API_BASE);
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

export async function updatePlayer(id, playerPayload) {
  const response = await fetch(`${PLAYER_API_BASE}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(playerPayload),
  });

  return parseResponse(response);
}

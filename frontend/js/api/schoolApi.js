const SCHOOL_API_BASE = "http://localhost:3000/api/schools";

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

export async function fetchSchools() {
  const response = await fetch(SCHOOL_API_BASE);
  return parseResponse(response);
}

export async function fetchSchoolById(id) {
  const response = await fetch(`${SCHOOL_API_BASE}/${id}`);
  return parseResponse(response);
}

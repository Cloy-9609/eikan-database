const SCHOOL_API_BASE = "/api/schools";

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

export async function fetchSchools(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const requestUrl = searchParams.size > 0 ? `${SCHOOL_API_BASE}?${searchParams.toString()}` : SCHOOL_API_BASE;
  const response = await fetch(requestUrl);
  return parseResponse(response);
}

export async function fetchSchoolById(id) {
  const response = await fetch(`${SCHOOL_API_BASE}/${id}`);
  return parseResponse(response);
}

export async function createSchool(schoolPayload) {
  const response = await fetch(SCHOOL_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(schoolPayload),
  });

  return parseResponse(response);
}

export async function updateSchool(id, schoolPayload) {
  const response = await fetch(`${SCHOOL_API_BASE}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(schoolPayload),
  });

  return parseResponse(response);
}

export async function deleteSchool(id) {
  const response = await fetch(`${SCHOOL_API_BASE}/${id}`, {
    method: "DELETE",
  });

  return parseResponse(response);
}

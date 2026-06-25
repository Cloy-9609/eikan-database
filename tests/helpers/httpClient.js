function normalizePath(path) {
  if (!path) {
    return "/";
  }

  return path.startsWith("/") ? path : `/${path}`;
}

async function requestJson({ baseUrl, method = "GET", path = "/", body, headers = {} }) {
  const requestHeaders = { ...headers };
  const options = {
    method,
    headers: requestHeaders,
  };

  if (body !== undefined) {
    requestHeaders["content-type"] = requestHeaders["content-type"] || "application/json";
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${baseUrl}${normalizePath(path)}`, options);
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  let responseBody = null;

  if (text && contentType.includes("application/json")) {
    try {
      responseBody = JSON.parse(text);
    } catch (error) {
      responseBody = null;
    }
  } else if (text) {
    responseBody = text;
  }

  return {
    status: response.status,
    ok: response.ok,
    headers: response.headers,
    body: responseBody,
    text,
  };
}

module.exports = {
  requestJson,
};

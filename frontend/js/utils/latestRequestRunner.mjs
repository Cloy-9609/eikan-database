const STATUS_SUCCESS = "success";
const STATUS_ERROR = "error";
const STATUS_STALE = "stale";

export function createLatestRequestRunner() {
  let latestRequestId = 0;

  return async function runLatestRequest({ request, onStart, onSuccess, onError, onFinally } = {}) {
    const requestId = latestRequestId + 1;
    latestRequestId = requestId;

    onStart?.({ requestId });

    let outcome;
    try {
      outcome = { status: STATUS_SUCCESS, value: await request() };
    } catch (error) {
      outcome = { status: STATUS_ERROR, error };
    }

    if (requestId !== latestRequestId) {
      return { status: STATUS_STALE, requestId };
    }

    try {
      if (outcome.status === STATUS_SUCCESS) {
        onSuccess?.(outcome.value, { requestId });
      } else {
        onError?.(outcome.error, { requestId });
      }
    } finally {
      if (requestId === latestRequestId) {
        onFinally?.({ requestId });
      }
    }

    return { status: outcome.status, requestId };
  };
}

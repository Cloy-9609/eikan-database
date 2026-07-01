const test = require("node:test");
const assert = require("node:assert/strict");

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

async function loadRunner() {
  return import("../../frontend/js/utils/latestRequestRunner.mjs");
}

test("latest success runs success and finally callbacks", async () => {
  const { createLatestRequestRunner } = await loadRunner();
  const runLatestRequest = createLatestRequestRunner();
  const calls = [];

  const result = await runLatestRequest({
    request: async () => "value",
    onStart: () => calls.push("start"),
    onSuccess: (value) => calls.push(`success:${value}`),
    onError: () => calls.push("error"),
    onFinally: () => calls.push("finally"),
  });

  assert.deepEqual(calls, ["start", "success:value", "finally"]);
  assert.equal(result.status, "success");
});

test("latest failure runs error and finally callbacks", async () => {
  const { createLatestRequestRunner } = await loadRunner();
  const runLatestRequest = createLatestRequestRunner();
  const calls = [];
  const failure = new Error("failed");

  const result = await runLatestRequest({
    request: async () => {
      throw failure;
    },
    onStart: () => calls.push("start"),
    onSuccess: () => calls.push("success"),
    onError: (error) => calls.push(`error:${error.message}`),
    onFinally: () => calls.push("finally"),
  });

  assert.deepEqual(calls, ["start", "error:failed", "finally"]);
  assert.equal(result.status, "error");
});

test("stale success is ignored when a newer request succeeds first", async () => {
  const { createLatestRequestRunner } = await loadRunner();
  const runLatestRequest = createLatestRequestRunner();
  const requestA = createDeferred();
  const requestB = createDeferred();
  const calls = [];

  const resultAPromise = runLatestRequest({
    request: () => requestA.promise,
    onStart: () => calls.push("A:start"),
    onSuccess: () => calls.push("A:success"),
    onError: () => calls.push("A:error"),
    onFinally: () => calls.push("A:finally"),
  });
  const resultBPromise = runLatestRequest({
    request: () => requestB.promise,
    onStart: () => calls.push("B:start"),
    onSuccess: (value) => calls.push(`B:success:${value}`),
    onError: () => calls.push("B:error"),
    onFinally: () => calls.push("B:finally"),
  });

  requestB.resolve("new");
  const resultB = await resultBPromise;
  requestA.resolve("old");
  const resultA = await resultAPromise;

  assert.deepEqual(calls, ["A:start", "B:start", "B:success:new", "B:finally"]);
  assert.equal(resultA.status, "stale");
  assert.equal(resultB.status, "success");
});

test("stale failure is ignored while the latest request remains pending", async () => {
  const { createLatestRequestRunner } = await loadRunner();
  const runLatestRequest = createLatestRequestRunner();
  const requestA = createDeferred();
  const requestB = createDeferred();
  const calls = [];
  let busy = false;

  const resultAPromise = runLatestRequest({
    request: () => requestA.promise,
    onStart: () => {
      busy = true;
      calls.push("A:start");
    },
    onSuccess: () => calls.push("A:success"),
    onError: () => calls.push("A:error"),
    onFinally: () => {
      busy = false;
      calls.push("A:finally");
    },
  });
  const resultBPromise = runLatestRequest({
    request: () => requestB.promise,
    onStart: () => {
      busy = true;
      calls.push("B:start");
    },
    onSuccess: (value) => calls.push(`B:success:${value}`),
    onError: () => calls.push("B:error"),
    onFinally: () => {
      busy = false;
      calls.push("B:finally");
    },
  });

  requestA.reject(new Error("old failure"));
  const resultA = await resultAPromise;

  assert.deepEqual(calls, ["A:start", "B:start"]);
  assert.equal(busy, true);
  assert.equal(resultA.status, "stale");

  requestB.resolve("new");
  const resultB = await resultBPromise;

  assert.deepEqual(calls, ["A:start", "B:start", "B:success:new", "B:finally"]);
  assert.equal(busy, false);
  assert.equal(resultB.status, "success");
});

test("only the last of multiple requests is reflected", async () => {
  const { createLatestRequestRunner } = await loadRunner();
  const runLatestRequest = createLatestRequestRunner();
  const requestA = createDeferred();
  const requestB = createDeferred();
  const requestC = createDeferred();
  const calls = [];

  const resultAPromise = runLatestRequest({ request: () => requestA.promise, onStart: () => calls.push("A:start"), onSuccess: () => calls.push("A:success"), onFinally: () => calls.push("A:finally") });
  const resultBPromise = runLatestRequest({ request: () => requestB.promise, onStart: () => calls.push("B:start"), onSuccess: () => calls.push("B:success"), onFinally: () => calls.push("B:finally") });
  const resultCPromise = runLatestRequest({ request: () => requestC.promise, onStart: () => calls.push("C:start"), onSuccess: () => calls.push("C:success"), onFinally: () => calls.push("C:finally") });

  requestB.resolve("middle");
  requestA.resolve("old");
  requestC.resolve("new");

  const [resultA, resultB, resultC] = await Promise.all([resultAPromise, resultBPromise, resultCPromise]);

  assert.deepEqual(calls, ["A:start", "B:start", "C:start", "C:success", "C:finally"]);
  assert.equal(resultA.status, "stale");
  assert.equal(resultB.status, "stale");
  assert.equal(resultC.status, "success");
});

test("success callback errors are not converted into request errors", async () => {
  const { createLatestRequestRunner } = await loadRunner();
  const runLatestRequest = createLatestRequestRunner();
  const calls = [];
  const callbackError = new Error("callback failed");

  await assert.rejects(
    runLatestRequest({
      request: async () => "value",
      onSuccess: () => {
        calls.push("success");
        throw callbackError;
      },
      onError: () => calls.push("error"),
      onFinally: () => calls.push("finally"),
    }),
    callbackError
  );

  assert.deepEqual(calls, ["success", "finally"]);
});


import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { inspectWorkerMultipart } from "./parse-cloudflare-worker-multipart.mjs";

const boundary = "zyen-test-boundary";

function makeMultipart(parts) {
  const chunks = [];

  for (const { name, data } of parts) {
    chunks.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${name}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`
    ));
    chunks.push(Buffer.from(data));
    chunks.push(Buffer.from("\r\n"));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return Buffer.concat(chunks);
}

const contentType =
  `multipart/form-data; boundary=${boundary}`;

function inspect(parts) {
  return inspectWorkerMultipart(
    makeMultipart(parts),
    contentType
  );
}

// Test 1: Valid multipart response
{
  const result = inspect([
    { name: "metadata", data: '{"main_module":"worker.js"}' },
    { name: "worker.js", data: 'export default {};' }
  ]);

  assert.equal(result.partCount, 2);
  assert.equal(result.parts[0].name, "metadata");
  assert.equal(result.parts[1].name, "worker.js");
  console.log("PASS: valid multipart response");
}

// Test 2: Binary data remains unchanged
{
  const binary = Buffer.from([0, 1, 2, 255, 128, 10]);
  const result = inspect([
    { name: "binary", data: binary }
  ]);

  const expected = createHash("sha256")
    .update(binary)
    .digest("hex");

  assert.equal(result.parts[0].sha256, expected);
  assert.equal(result.parts[0].size, binary.length);
  console.log("PASS: binary content integrity");
}

// Test 3: Empty response rejected
{
  assert.throws(
    () => inspectWorkerMultipart(
      new Uint8Array(),
      contentType
    ),
    /Invalid response size/
  );

  console.log("PASS: empty response rejected");
}

// Test 4: Invalid content type rejected
{
  const data = makeMultipart([
    { name: "worker.js", data: "test" }
  ]);

  assert.throws(
    () => inspectWorkerMultipart(data, "application/json"),
    /Unsupported multipart content type/
  );

  console.log("PASS: invalid content type rejected");
}

// Test 5: Missing closing boundary rejected
{
  const data = makeMultipart([
    { name: "worker.js", data: "test" }
  ]);

  const truncated = data.subarray(0, data.length - 8);

  assert.throws(
    () => inspectWorkerMultipart(truncated, contentType)
  );

  console.log("PASS: truncated response rejected");
}

// Test 6: Excessive response size rejected
{
  const data = new Uint8Array(10_000_001);

  assert.throws(
    () => inspectWorkerMultipart(data, contentType),
    /Invalid response size/
  );

  console.log("PASS: oversized response rejected");
}

// Test 7: Duplicate names must be rejected
{
  assert.throws(
    () => inspect([
      { name: "worker.js", data: "first" },
      { name: "worker.js", data: "second" }
    ])
  );

  console.log("PASS: duplicate part names rejected");
}

 // Test 8: Boundary-like bytes inside binary content
{
  const binary = Buffer.from(
    "Start of binary data\r\n" +
    `--${boundary}NOT_A_REAL_BOUNDARY\r\n` +
    "End of binary data"
  );

  const expected = createHash("sha256")
    .update(binary)
    .digest("hex");

  const result = inspect([
    { name: "worker.js", data: binary }
  ]);

  assert.equal(result.partCount, 1);
  assert.equal(result.parts[0].size, binary.length);
  assert.equal(result.parts[0].sha256, expected);

  console.log("PASS: boundary-like binary content preserved");
}

console.log("Offline multipart parser tests completed.");

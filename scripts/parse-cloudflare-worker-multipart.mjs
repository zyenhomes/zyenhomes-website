
import { createHash } from "node:crypto";

const MAX_BYTES = 10_000_000;
const MAX_PARTS = 50;

export function inspectWorkerMultipart(bytes, contentType) {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error("Expected Uint8Array");
  }

  if (bytes.length === 0 || bytes.length > MAX_BYTES) {
    throw new Error("Invalid response size");
  }

  const match = /^multipart\/form-data\s*;\s*boundary=(?:"([^"]+)"|([^;\s]+))\s*$/i.exec(
    contentType?.trim() ?? ""
  );

  if (!match) {
    throw new Error("Unsupported multipart content type");
  }

  const boundary = match[1] ?? match[2];

  if (!boundary || boundary.length > 200) {
    throw new Error("Invalid multipart boundary");
  }

  const raw = Buffer.from(bytes);
  const delimiter = Buffer.from(`--${boundary}`, "ascii");
  const separator = Buffer.from("\r\n\r\n", "ascii");
  const marker = Buffer.from(`\r\n--${boundary}`, "ascii");

  let position = 0;
  let count = 0;
  const parts = [];

  if (!raw.subarray(0, delimiter.length).equals(delimiter)) {
    throw new Error("Missing opening boundary");
  }

  position = delimiter.length;

  while (position < raw.length) {
    if (raw.subarray(position, position + 2).toString("ascii") === "--") {
      position += 2;
      if (raw.subarray(position).toString("ascii") !== "\r\n" &&
          position !== raw.length) {
        throw new Error("Unexpected trailing data");
      }
      if (count === 0) throw new Error("No multipart parts");
      return {
        partCount: count,
        parts
      };
    }

    if (raw.subarray(position, position + 2).toString("ascii") !== "\r\n") {
      throw new Error("Malformed multipart boundary");
    }
    position += 2;

    const headerEnd = raw.indexOf(separator, position);
    if (headerEnd < 0 || headerEnd - position > 8192) {
      throw new Error("Invalid part headers");
    }

    const headers = raw.subarray(position, headerEnd).toString("latin1");
    const disposition = headers
      .split("\r\n")
      .find(line => /^content-disposition:/i.test(line));

    const nameMatch = disposition?.match(
      /(?:^|;)\s*name="([^"]{1,200})"/i
    );

    if (!nameMatch) {
      throw new Error("Missing part name");
    }

    const bodyStart = headerEnd + separator.length;
    const bodyEnd = raw.indexOf(marker, bodyStart);

    if (bodyEnd < 0) {
      throw new Error("Missing closing boundary");
    }

    const body = raw.subarray(bodyStart, bodyEnd);
    const hash = createHash("sha256").update(body).digest("hex");

    parts.push({
      name: nameMatch[1],
      size: body.length,
      sha256: hash
    });

    count++;
    if (count > MAX_PARTS) {
      throw new Error("Too many multipart parts");
    }

    position = bodyEnd + 2;

    if (!raw.subarray(position, position + delimiter.length).equals(delimiter)) {
      throw new Error("Invalid next boundary");
    }

    position += delimiter.length;
  }

  throw new Error("Missing final boundary");
}

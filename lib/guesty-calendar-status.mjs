// Conservative Guesty Booking Engine calendar parser.
// No unavailable claim is made unless every requested night is represented
// and at least one night explicitly reports a blocking status.
export function assessCalendar(payload, checkIn, checkOut) {
  const days = Array.isArray(payload) ? payload
    : Array.isArray(payload?.days) ? payload.days
    : Array.isArray(payload?.results?.days) ? payload.results.days
    : null;
  if (!days) return "unknown";
  const byDate = new Map();
  for (const day of days) {
    const date = day?.date ?? day?.day;
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (byDate.has(date)) return "unknown";
    byDate.set(date, day);
  }
  const start = Date.parse(checkIn), end = Date.parse(checkOut);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "unknown";
  let blocked = false;
  for (let t = start; t < end; t += 86400000) {
    const date = new Date(t).toISOString().slice(0,10);
    const day = byDate.get(date);
    if (!day) return "unknown";
    const status = String(day.status ?? "").toLowerCase();
    if (["blocked","unavailable","booked","reserved"].includes(status)) blocked = true;
    else if (status !== "available") return "unknown";
  }
  return blocked ? "unavailable" : "available";
}

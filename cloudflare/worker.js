
let cachedToken = null;
let tokenExpiresAt = 0;
let pendingToken = null;



export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return Response.json({
        service: "Zyen Homes Booking API",
        status: "running"
      });
    }

    if (url.pathname === "/api/test-guesty") {
      try {
        await getGuestyToken(env);

        return Response.json({
          success: true,
          message: "Guesty authentication successful"
        });
      } catch (error) {
        console.error("Guesty authentication test failed:", error?.message);

        return Response.json({
          success: false,
          message: "Guesty authentication failed"
        }, { status: 502 });
      }
    }

if (url.pathname === "/api/test-149-tyrolean") {
  try {
    const token = await getGuestyToken(env);

    const listingId = "6abf9b85caf2480012c82479";

    const response = await fetch(
      `https://booking.guesty.com/api/listings/${listingId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        }
      }
    );

    if (!response.ok) {
      return Response.json({
        success: false,
        status: response.status,
        message: "Guesty listing lookup failed"
      }, { status: 502 });
    }

    const data = await response.json();
    const listing = data.results ?? data;

    return Response.json({
      success: true,
      listingId: listing._id ?? listing.id ?? null,
      title: listing.title ?? null,
      nickname: listing.nickname ?? null,
      accommodates: listing.accommodates ?? null,
      city: listing.address?.city ?? null
    });

  } catch (error) {
    console.error("Guesty listing lookup failed");

    return Response.json({
      success: false,
      message: "Unable to verify Guesty listing"
    }, { status: 502 });
  }
}

if (url.pathname === "/api/availability/149-tyrolean") {
  try {
    const token = await getGuestyToken(env);

    const listingId = "6abf9b85caf2480012c82479";

    // Read dates from the URL
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    // Validate dates
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    const validDate = (value) =>
      datePattern.test(value) &&
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value;

    if (
      !from ||
      !to ||
      !validDate(from) ||
      !validDate(to) ||
      from > to
    ) {
      return Response.json({
        success: false,
        message: "Valid from and to dates are required"
      }, { status: 400 });
    }

    const guestyUrl = new URL(
      `https://booking.guesty.com/api/listings/${listingId}/calendar`
    );

    guestyUrl.searchParams.set("from", from);
    guestyUrl.searchParams.set("to", to);

    const response = await fetch(guestyUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return Response.json({
        success: false,
        status: response.status,
        message: "Unable to retrieve Guesty calendar"
      }, { status: 502 });
    }

    const calendar = await response.json();

    return Response.json({
      success: true,
      property: "149 Tyrolean Lane",
      listingId,
      from,
      to,
      calendar
    });

  } catch (error) {
    console.error("Guesty calendar request failed");

    return Response.json({
      success: false,
      message: "Unable to retrieve availability"
    }, { status: 502 });
  }
}


if (false && url.pathname === "/api/quote/149-tyrolean") {
  // Temporary test endpoint. Remove before public launch.
  if (request.method !== "POST") {
    return Response.json(
      { error: "POST required" },
      { status: 405 }
    );
  }

  // A private test key must be configured as a Worker secret.
  const testKey = request.headers.get("X-Zyen-Test-Key");

  if (
    !env.ZYEN_QUOTE_TEST_KEY ||
    testKey !== env.ZYEN_QUOTE_TEST_KEY
  ) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const token = await getGuestyToken(env);

    // Fixed test booking: November 10–12, 2026, 6 guests.
    const quoteRequest = {
      listingId: "6abf9b85caf2480012c82479",
      checkInDateLocalized: "2026-11-10",
      checkOutDateLocalized: "2026-11-12",
      guestsCount: 6
    };

    const response = await fetch(
      "https://booking.guesty.com/api/reservations/quotes",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(quoteRequest)
      }
    );

    if (!response.ok) {
      return Response.json(
        {
          success: false,
          guestyStatus: response.status,
          message: "Guesty quote request failed"
        },
        { status: 502 }
      );
    }

    const data = await response.json();

    
  // Read the quote created by Guesty.
  const quote = data.results ?? data;
  const createdQuote = Array.isArray(quote)
    ? quote[0]
    : quote;

  if (!createdQuote?._id) {
    throw new Error("Guesty quote ID missing");
  }

  // Retrieve the existing quote using its ID.
  const retrieveResponse = await fetch(
    `https://booking.guesty.com/api/reservations/quotes/${encodeURIComponent(createdQuote._id)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    }
  );

  if (!retrieveResponse.ok) {
    throw new Error(
      `Guesty retrieve quote HTTP ${retrieveResponse.status}`
    );
  }

  const retrievedData = await retrieveResponse.json();
  const retrievedQuote = retrievedData.results ?? retrievedData;

  const firstQuote = Array.isArray(retrievedQuote)
    ? retrievedQuote[0]
    : retrievedQuote;

  const ratePlans = Array.isArray(firstQuote?.rates?.ratePlans)
    ? firstQuote.rates.ratePlans
    : [];

  
const money =
  ratePlans[0]?.ratePlan?.money ??
  ratePlans[0]?.money?.money ??
  ratePlans[0]?.money ??
  firstQuote?.rates?.money ??
  firstQuote?.money ??
  {};


const sanitizeGuestyQuote = (value) => {
  const sensitiveKeys = new Set([
    "accessToken",
    "refreshToken",
    "clientSecret",
    "clientId",
    "authorization",
    "email",
    "phone",
    "firstName",
    "lastName",
    "address",
    "guest",
    "guests",
    "accountId",
    "guestId",
    "paymentMethod",
    "ccToken"
  ]);

  const clean = (item, depth = 0) => {
    if (depth > 30) return "[DEPTH LIMIT]";

    if (Array.isArray(item)) {
      return item.map(v => clean(v, depth + 1));
    }

    if (item && typeof item === "object") {
      return Object.fromEntries(
        Object.entries(item).map(([key, val]) => [
          key,
          sensitiveKeys.has(key) ||
          /token|secret|password|authorization|cookie/i.test(key)
            ? "[REDACTED]"
            : clean(val, depth + 1)
        ])
      );
    }

    return item;
  };

  return clean(value);
};

const sanitizedQuoteResponses = {
  postCreateQuote: sanitizeGuestyQuote(data),
  getRetrieveQuote: sanitizeGuestyQuote(retrievedData)
};

const nestedMoney = ratePlans[0]?.money?.money ?? null;
const diagnostic = {
  sanitizedQuoteResponses,
    nestedMoneyCheck: {
    outerMoneyExists: Boolean(ratePlans[0]?.money),
    innerMoneyExists: Boolean(nestedMoney),
    innerMoneyFields: Object.keys(nestedMoney ?? {}),
    invoiceItemsExist: Array.isArray(nestedMoney?.invoiceItems),
    invoiceItemCount: nestedMoney?.invoiceItems?.length ?? 0
  },
  quoteFields: Object.keys(firstQuote ?? {}),
  
stayFields: Object.keys(firstQuote?.stay ?? {}),
stayMoneyFields: Object.keys(firstQuote?.stay?.money ?? {}),
stayHasMoney: Boolean(firstQuote?.stay?.money),

  ratesFields: Object.keys(firstQuote?.rates ?? {}),
  moneyLocations: {
    quote: Boolean(firstQuote?.money),
    rates: Boolean(firstQuote?.rates?.money),
    ratePlans: ratePlans.map(plan => ({
      hasMoney: Boolean(plan.money),
      moneyFields: Object.keys(plan.money ?? {})
    }))
  }
  ,
  ratePlanDetails: ratePlans.map(plan => ({
    fields: Object.keys(plan ?? {}),
    dayFields: Object.keys(plan?.days?.[0] ?? {}),
    rateFields: Object.keys(plan?.rates ?? {}),
    priceFields: Object.keys(plan?.price ?? {})
  })),
  stayDetails: Array.isArray(firstQuote?.stay)
    ? firstQuote.stay.map(item => ({
        fields: Object.keys(item ?? {}),
        priceFields: Object.keys(item?.price ?? {}),
        moneyFields: Object.keys(item?.money ?? {})
      }))
    : []
};

    return Response.json({
      success: true,
      property: "149 Tyrolean Lane",
      quoteId: firstQuote?._id ?? null,
ratePlanId: ratePlans[0]?.ratePlan?._id ?? null,
      checkIn: quoteRequest.checkInDateLocalized,
      checkOut: quoteRequest.checkOutDateLocalized,
      guests: quoteRequest.guestsCount,
      diagnostic,
      pricing: {
        currency: money.currency ?? null,
        accommodation: money.fareAccommodation ?? null,
        cleaning: money.fareCleaning ?? null,
        fees: money.totalFees ?? null,
        taxes: money.totalTaxes ?? null,
        subtotal: money.subTotalPrice ?? null,
        total: money.hostPayout ?? null,
        nightlyRates: ratePlans.flatMap(
          plan => (plan.days ?? []).map(day => ({
            date: day.date,
            price: day.price,
            currency: day.currency
          }))
        )
      }
    });

  
} catch (error) {
  console.error(
  "Guesty quote test failed:",
  error?.name,
  error?.message
);

  return Response.json(
    {
      success: false,
      message: "Pricing diagnostic failed",
      errorType: error?.name ?? "Unknown",
      errorDetails: error instanceof TypeError
        ? "A pricing response field has an unexpected structure"
        : "Check Cloudflare Worker logs"
    },
    { status: 502 }
  );
}

}


if (false && url.pathname === "/api/test-149-inquiry") {
  if (request.method !== "POST") {
    return Response.json(
      { error: "POST required" },
      { status: 405 }
    );
  }

  const testKey = request.headers.get("X-Zyen-Test-Key");

  if (
    !env.ZYEN_QUOTE_TEST_KEY ||
    testKey !== env.ZYEN_QUOTE_TEST_KEY
  ) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const token = await getGuestyToken(env);

    const quoteId = "6adb5d7320cb330ec34a3507";

    const response = await fetch(
      `https://booking.guesty.com/api/reservations/quotes/${encodeURIComponent(quoteId)}/inquiry`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ratePlanId: "default-rateplan-id",
          reservedUntil: -1,
          guest: {
            firstName: "Brendan",
            lastName: "Nguyen",
            email: "snguyen_7@rogers.com"
          }
        })
      }
    );

    const data = await response.json();

    return Response.json({
      success: response.ok,
      guestyStatus: response.status,
      reservationId: data._id ?? null,
      reservationStatus: data.status ?? null,
      message: response.ok
        ? "Test inquiry reservation created"
        : "Guesty inquiry request failed",
      error: response.ok ? null : data
    });

  } catch (error) {
    console.error("Guesty inquiry test failed:", error?.message);

    return Response.json(
      {
        success: false,
        message: "Guesty inquiry test failed",
        errorType: error?.name ?? "Unknown"
      },
      { status: 502 }
    );
  }
}

if (url.pathname === "/api/public/quote/149-tyrolean") {
  const origin = request.headers.get("Origin");
  const allowedOrigins = new Set([
    "https://zyenhomes.com",
    "https://www.zyenhomes.com"
  ]);
  const corsHeaders = allowedOrigins.has(origin)
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Vary": "Origin"
      }
    : { "Vary": "Origin" };

  const corsResponse = (body, init = {}) => Response.json(body, {
    ...init,
    headers: { ...(init.headers || {}), ...corsHeaders }
  });

  if (request.method === "OPTIONS") {
    return allowedOrigins.has(origin)
      ? new Response(null, { status: 204, headers: corsHeaders })
      : Response.json({ success: false, message: "Origin not allowed" }, { status: 403 });
  }
  if (origin && !allowedOrigins.has(origin)) {
    return corsResponse({ success: false, message: "Origin not allowed" }, { status: 403 });
  }
  if (request.method !== "POST") {
    return corsResponse({ success: false, message: "POST required" }, { status: 405, headers: corsHeaders });
  }
  if (Number(request.headers.get("Content-Length") || 0) > 2048) {
    return corsResponse({ success: false, message: "Request too large" }, { status: 413, headers: corsHeaders });
  }

  
  // Limit pricing requests per client.
  const clientIP = request.headers.get("CF-Connecting-IP");

  if (!clientIP) {
    return corsResponse(
      { success: false, message: "Unable to verify client" },
      { status: 403 }
    );
  }

  const { success: allowed } = await env.BOOKING_RATE_LIMITER.limit({
    key: `quote-149:${clientIP}`
  });

  if (!allowed) {
    return corsResponse(
      {
        success: false,
        message: "Too many pricing requests. Please try again shortly."
      },
      {
        status: 429,
        headers: { "Retry-After": "60" }
      }
    );
  }

  if (request.method !== "POST") {
    return corsResponse(
      { success: false, message: "POST required" },
      { status: 405 }
    );
  }

  try {
    const rawBody = await request.text();
    if (rawBody.length > 2048) return corsResponse({ success: false, message: "Request too large" }, { status: 413 });
    const body = JSON.parse(rawBody);
    const { checkIn, checkOut, guests } = body ?? {};

    const validDate = (value) => {
      if (typeof value !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

      const date = new Date(value + "T00:00:00Z");
      return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value;
    };

    const nights = validDate(checkIn) && validDate(checkOut)
      ? Math.round(
          (Date.parse(checkOut) - Date.parse(checkIn)) / 86400000
        )
      : 0;

    const guestCount = Number(guests);

    if (
      !validDate(checkIn) ||
      !validDate(checkOut) ||
      checkIn < new Date().toISOString().slice(0, 10) ||
      nights < 1 ||
      nights > 30 ||
      !Number.isInteger(guestCount) ||
      guestCount < 1 ||
      guestCount > 16
    ) {
      return corsResponse(
        { success: false, message: "Invalid dates or guest count" },
        { status: 400 }
      );
    }

    const token = await getGuestyToken(env);

    const quoteResponse = await fetch(
      "https://booking.guesty.com/api/reservations/quotes",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          listingId: "6abf9b85caf2480012c82479",
          checkInDateLocalized: checkIn,
          checkOutDateLocalized: checkOut,
          guestsCount: guestCount
        })
      }
    );

    if (!quoteResponse.ok) {
      return corsResponse(
        {
          success: false,
          message: "Unable to obtain Guesty pricing"
        },
        { status: 502 }
      );
    }

    const data = await quoteResponse.json();
    const result = data.results ?? data;
    const quote = Array.isArray(result) ? result[0] : result;

    const ratePlans = quote?.rates?.ratePlans ?? [];
    const selectedPlan = ratePlans[0];
    const money = selectedPlan?.ratePlan?.money;

    if (
      !money ||
      typeof money.hostPayout !== "number"
    ) {
      return corsResponse(
        {
          success: false,
          message: "Complete pricing is unavailable"
        },
        { status: 502 }
      );
    }

    return corsResponse({
      success: true,
      property: "149 Tyrolean Lane",
      checkIn,
      checkOut,
      guests: guestCount,
      pricing: {
        currency: money.currency,
        accommodation: money.fareAccommodation,
        cleaning: money.fareCleaning,
        fees: money.totalFees,
        taxes: money.totalTaxes,
        subtotal: money.subTotalPrice,
        total: money.hostPayout,
        invoiceItems: (money.invoiceItems ?? []).map(item => ({
          title: item.title,
          amount: item.amount,
          currency: item.currency,
          type: item.type
        })),
        nightlyRates: (selectedPlan.days ?? []).map(day => ({
          date: day.date,
          price: day.price,
          currency: day.currency
        }))
      }
    });

  } catch (error) {
    console.error("Public quote failed:", error?.message);

    return corsResponse(
      {
        success: false,
        message: "Unable to retrieve pricing"
      },
      { status: 502 }
    );
  }
}


    if (url.pathname.startsWith("/api/public/quote/property/")) {
      const listings = {
        "100-pilsen": "6914041f5fbb6800444aca89",
        "105-pilsen": "69140406129e4200436cc529",
        "106-birch-view": "699b704dda533d00151fd63b",
        "109-plater": "69140412df75040043bc8c0d",
        "116-tyrolean": "6914041adf75040043bc8ed8",
        "147-campbell": "691403f14ae1bb0013bf4d92",
        "149-tyrolean": "6abf9b85caf2480012c82479",
        "197-arlberg": "6abf956cb58bb9004973e443",
        "37-snowbridge": "691403d937f0ea0013f72152"
      };
      const propertyId = url.pathname.slice("/api/public/quote/property/".length);
      const listingId = listings[propertyId];
      if (!listingId) return Response.json({ success: false, message: "Property not connected to Guesty" }, { status: 404 });

      const origin = request.headers.get("Origin");
      const allowed = origin === "https://zyenhomes.com" || origin === "https://www.zyenhomes.com";
      const cors = allowed ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Vary": "Origin"
      } : { "Vary": "Origin" };
      const reply = (data, status = 200, extra = {}) => Response.json(data, { status, headers: { ...cors, ...extra } });
      if (request.method === "OPTIONS") return allowed
        ? new Response(null, { status: 204, headers: cors })
        : reply({ success: false, message: "Origin not allowed" }, 403);
      if (origin && !allowed) return reply({ success: false, message: "Origin not allowed" }, 403);
      if (request.method !== "POST") return reply({ success: false, message: "POST required" }, 405);
      if (Number(request.headers.get("Content-Length") || 0) > 2048) return reply({ success: false, message: "Request too large" }, 413);

      const ip = request.headers.get("CF-Connecting-IP");
      if (!ip) return reply({ success: false, message: "Client could not be verified" }, 403);
      const limited = await env.BOOKING_RATE_LIMITER.limit({ key: "quote-all:" + ip });
      if (!limited.success) return reply({ success: false, message: "Too many requests" }, 429, { "Retry-After": "60" });

      try {
        const raw = await request.text();
        if (raw.length > 2048) return reply({ success: false, message: "Request too large" }, 413);
        const body = JSON.parse(raw);
        const { checkIn, checkOut, guests } = body ?? {};
        const validDate = (value) => {
          if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
          const d = new Date(value + "T00:00:00Z");
          return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
        };
        const nights = validDate(checkIn) && validDate(checkOut)
          ? (Date.parse(checkOut) - Date.parse(checkIn)) / 86400000 : 0;
        const count = Number(guests);
        const maxGuests = { "100-pilsen": 16, "105-pilsen": 20, "106-birch-view": 14, "109-plater": 20, "116-tyrolean": 20, "147-campbell": 12, "149-tyrolean": 16, "197-arlberg": 20, "37-snowbridge": 10 };
        if (!validDate(checkIn) || !validDate(checkOut) || checkIn < new Date().toISOString().slice(0, 10) ||
            nights < 1 || nights > 30 || !Number.isInteger(count) || count < 1 || count > maxGuests[propertyId]) {
          return reply({ success: false, message: "Invalid dates or guest count" }, 400);
        }
        const token = await getGuestyToken(env);
        const response = await fetch("https://booking.guesty.com/api/reservations/quotes", {
          method: "POST",
          headers: { Authorization: "Bearer " + token, Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ listingId, checkInDateLocalized: checkIn, checkOutDateLocalized: checkOut, guestsCount: count })
        });
        if (!response.ok) {
          // Only verify calendar availability after a quote fails. A failed quote
          // alone is not proof of blocked dates, minimum stays or unavailable inventory.
          let availability = "unknown";
          try {
            const calendarUrl = new URL("https://booking.guesty.com/api/listings/" +
              encodeURIComponent(listingId) + "/calendar");
            calendarUrl.searchParams.set("from", checkIn);
            calendarUrl.searchParams.set("to", checkOut);
            const calendarResponse = await fetch(calendarUrl, {
              headers: { Authorization: "Bearer " + token, Accept: "application/json" }
            });
            if (calendarResponse.ok) {
              const calendarData = await calendarResponse.json();
              const rawDays = Array.isArray(calendarData) ? calendarData
                : Array.isArray(calendarData?.results) ? calendarData.results
                : Array.isArray(calendarData?.results?.days) ? calendarData.results.days
                : Array.isArray(calendarData?.days) ? calendarData.days : [];
              const stayDates = Array.from({length: nights}, (_, i) =>
                new Date(Date.parse(checkIn) + i * 86400000).toISOString().slice(0, 10));
              const daysByDate = new Map(rawDays.map(day =>
                [day?.date ?? day?.day ?? day?.startDate, day]));
              // Conservative: only explicit blocked/unavailable day statuses qualify.
              // Missing or ambiguous calendar data remains unknown.
              if (stayDates.some(date => {
                const day = daysByDate.get(date);
                return day && ["blocked", "unavailable", "booked"].includes(
                  String(day.status ?? "").toLowerCase());
              })) availability = "unavailable";
            }
          } catch (calendarError) {
            console.warn("Calendar availability verification unavailable");
          }
          // Report only the upstream HTTP status and a vetted machine-readable error code.
          // Never forward upstream response bodies: they may contain sensitive details.
          const knownStatus = [400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504];
          const upstreamStatus = knownStatus.includes(response.status) ? response.status : null;
          const category = response.status === 400 || response.status === 422
            ? "QUOTE_REJECTED"
            : response.status === 404 ? "LISTING_NOT_FOUND"
            : response.status === 409 ? "QUOTE_CONFLICT"
            : response.status === 429 ? "GUESTY_RATE_LIMITED"
            : response.status === 401 || response.status === 403 ? "GUESTY_AUTHORIZATION"
            : response.status >= 500 ? "GUESTY_UPSTREAM_ERROR"
            : "GUESTY_QUOTE_UNAVAILABLE";
          return reply({
            success: false,
            message: "Guesty quote unavailable",
            errorCode: category,
            guestyStatus: upstreamStatus,
            availability
          }, 502);
        }
        const payload = await response.json();
        const data = payload.results ?? payload;
        const quote = Array.isArray(data) ? data[0] : data;
        const plans = Array.isArray(quote?.rates?.ratePlans) ? quote.rates.ratePlans : [];
        const plan = plans[0];
        const money = plan?.ratePlan?.money ?? plan?.money?.money;
        if (!money || !Number.isFinite(money.hostPayout)) return reply({ success: false, message: "Complete pricing unavailable" }, 502);
        return reply({
          success: true, propertyId, checkIn, checkOut, guests: count,
          pricing: {
            currency: money.currency || "CAD",
            accommodation: money.fareAccommodation ?? null,
            cleaning: money.fareCleaning ?? null,
            taxes: money.totalTaxes ?? null,
            subtotal: money.subTotalPrice ?? null,
            total: money.hostPayout,
            invoiceItems: (money.invoiceItems ?? []).map(i => ({ title: i.title, amount: i.amount, currency: i.currency, type: i.type })),
            nightlyRates: (plan.days ?? []).map(d => ({ date: d.date, price: d.price, currency: d.currency }))
          }
        });
      } catch (error) {
        console.error("Multi-property quote failed:", error?.message);
        return reply({ success: false, message: "Unable to retrieve pricing" }, 502);
      }
    }

    return Response.json(
      { error: "Not found" },
      { status: 404 }
    );
  }
};


async function getGuestyToken(env) {
  const now = Date.now();

  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  if (pendingToken) {
    return pendingToken;
  }

  pendingToken = (async () => {
    const kv = env.GUESTY_TOKEN_KV;

    if (kv) {
      const stored = await kv.get("guesty_booking_token", "json");

      if (stored?.accessToken &&
          Date.now() < stored.expiresAt) {
        cachedToken = stored.accessToken;
        tokenExpiresAt = stored.expiresAt;
        return cachedToken;
      }
    }

    const clientId = env.GUESTY_CLIENT_ID;
    const clientSecret = env.GUESTY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Guesty credentials missing");
    }

    const response = await fetch(
      "https://booking.guesty.com/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          scope: "booking_engine:api",
          client_id: clientId,
          client_secret: clientSecret
        }).toString()
      }
    );

    if (!response.ok) {
      const retryAfter = response.headers.get("Retry-After");
      console.error(
        "Guesty token request failed",
        response.status,
        "Retry-After:",
        retryAfter || "not provided"
      );
      throw new Error(
        `Guesty authentication HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new Error("Guesty access token missing");
    }

    const expiresAt =
      Date.now() +
      Math.max(0, (data.expires_in || 86400) - 300) * 1000;

    cachedToken = data.access_token;
    tokenExpiresAt = expiresAt;

    if (kv) {
      try {
        await kv.put(
          "guesty_booking_token",
          JSON.stringify({
            accessToken: cachedToken,
            expiresAt
          }),
          { expirationTtl: Math.max(60, Math.floor((expiresAt - Date.now()) / 1000)) }
        );
      } catch (error) {
        console.error("Guesty token cache write failed", error?.message);
      }
    }

    return cachedToken;
  })();

  try {
    return await pendingToken;
  } finally {
    pendingToken = null;
  }
}

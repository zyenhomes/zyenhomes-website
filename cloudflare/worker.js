
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
  
  // Limit pricing requests per client.
  const clientIP = request.headers.get("CF-Connecting-IP");

  if (!clientIP) {
    return Response.json(
      { success: false, message: "Unable to verify client" },
      { status: 403 }
    );
  }

  const { success: allowed } = await env.BOOKING_RATE_LIMITER.limit({
    key: `quote-149:${clientIP}`
  });

  if (!allowed) {
    return Response.json(
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
    return Response.json(
      { success: false, message: "POST required" },
      { status: 405 }
    );
  }

  try {
    const body = await request.json();
    const { checkIn, checkOut, guests } = body;

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
      nights < 1 ||
      nights > 30 ||
      !Number.isInteger(guestCount) ||
      guestCount < 1 ||
      guestCount > 16
    ) {
      return Response.json(
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
      return Response.json(
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
      return Response.json(
        {
          success: false,
          message: "Complete pricing is unavailable"
        },
        { status: 502 }
      );
    }

    return Response.json({
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

    return Response.json(
      {
        success: false,
        message: "Unable to retrieve pricing"
      },
      { status: 502 }
    );
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

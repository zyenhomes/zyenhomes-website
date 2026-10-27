(() => {
  "use strict";
  const form = document.getElementById("filters");
  if (!form) return;
  const connected = new Set([
    "100-pilsen","105-pilsen","106-birch-view","109-plater",
    "116-tyrolean","147-campbell","149-tyrolean",
    "197-arlberg","37-snowbridge"
  ]);
  const base = "https://zyenhomes-booking-api.brendan-nguyen-90f.workers.dev/api/public/quote/property/";
  const statuses = new Map();
  let generation = 0;
  let lastStartedAt = 0;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const currency = (value, code) => new Intl.NumberFormat("en-CA", {
    style: "currency", currency: code || "CAD"
  }).format(value);

  function updateCards() {
    for (const el of document.querySelectorAll("[data-price-id]")) {
      const id = el.dataset.priceId;
      const state = statuses.get(id);
      el.replaceChildren();
      if (!connected.has(id)) {
        el.textContent = "Contact us for rates and availability";
      } else if (!state) {
        el.textContent = "Select dates and click Find Properties for live pricing";
      } else if (state.type === "price") {
        const amount = document.createElement("strong");
        amount.textContent = currency(state.total, state.currency);
        const note = document.createElement("small");
        note.textContent = "Total for selected stay · includes fees and taxes · Quote only";
        el.append(amount, note);
      } else {
        el.textContent = state.message;
      }
    }
  }
  window.zyUpdateQuoteCards = updateCards;
  updateCards();

  async function searchQuotes() {
    const myGeneration = ++generation;
    const checkIn = form.elements.checkin.value;
    const checkOut = form.elements.checkout.value;
    const guests = Number(form.elements.guests.value);
    statuses.clear();
    if (!checkIn || !checkOut || checkOut <= checkIn || !Number.isInteger(guests) || guests < 1) {
      for (const id of connected) statuses.set(id, { type: "message", message: "Choose valid dates and guests" });
      updateCards();
      return;
    }
    const eligible = window.ZYEN_PROPERTIES.filter(p => connected.has(p.id) && p.guests >= guests);
    for (const property of eligible) statuses.set(property.id, { type: "message", message: "Checking Guesty pricing…" });
    updateCards();
    try {
      const response = await fetch("https://zyenhomes-booking-api.brendan-nguyen-90f.workers.dev/api/public/quotes/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkIn, checkOut, guests })
      });
      const result = await response.json();
      if (generation !== myGeneration) return;
      if (!response.ok || !result.success) throw Error("Batch quote unavailable");
      for (const property of eligible) {
        const item = result.results?.[property.id];
        if (item?.status === "priced" && Number.isFinite(item.total)) {
          statuses.set(property.id, { type: "price", total: item.total, currency: item.currency });
        } else if (item?.status === "unavailable") {
          statuses.set(property.id, { type: "message", message: "Select different date" });
        } else {
          statuses.set(property.id, { type: "message", message: "Unable to check availability" });
        }
      }
    } catch {
      if (generation !== myGeneration) return;
      for (const property of eligible) {
        statuses.set(property.id, { type: "message", message: "Unable to check availability" });
      }
    }
    updateCards();
  }
  form.addEventListener("submit", () => { void searchQuotes(); });
  // Search automatically when the home-page Search Stays link supplied valid dates.
  // Wait until all page scripts initialize; never submit the form again or navigate.
  const query = new URLSearchParams(window.location.search);
  const fromHome = query.has("checkin") && query.has("checkout");
  if (fromHome && form.elements.checkin.value && form.elements.checkout.value &&
      form.elements.checkout.value > form.elements.checkin.value) {
    void searchQuotes();
  }
  for (const name of ["checkin", "checkout", "guests"]) {
    form.elements[name].addEventListener("change", () => {
      generation++;
      statuses.clear();
      updateCards();
    });
  }
})();

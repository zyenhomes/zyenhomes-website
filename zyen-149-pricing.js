(() => {
  const form = document.querySelector("#filters");
  const status = document.querySelector("#zy-149-status");
  const details = document.querySelector("#zy-149-details");
  if (!form || !status || !details) return;
  let sequence = 0;
  let cardPrice = "Select dates above to see live Guesty pricing";
  window.ZYEN_149_CARD_PRICE = cardPrice;
  function setCardPrice(html) {
    cardPrice = html;
    window.ZYEN_149_CARD_PRICE = html;
    if (typeof window.render === "function") window.render();
    const card = document.getElementById("zy-price-149");
    if (card) card.innerHTML = html;
  }
  const money = (n, currency) => new Intl.NumberFormat("en-CA", {style:"currency",currency:currency||"CAD"}).format(n);
  function addLine(label, amount, currency) {
    const row = document.createElement("div");
    row.className = "zy-149-line";
    const name = document.createElement("span");
    const value = document.createElement("strong");
    name.textContent = label;
    value.textContent = money(amount, currency);
    row.append(name, value);
    details.append(row);
  }
  async function quote() {
    const checkIn = form.elements.checkin.value;
    const checkOut = form.elements.checkout.value;
    const guests = Number(form.elements.guests.value);
    const id = ++sequence;
    details.replaceChildren();
    setCardPrice("Checking live Guesty price…");
    details.hidden = true;
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      status.textContent = "Select valid check-in and check-out dates to see the price.";
      setCardPrice("Select valid dates above to see pricing.");
      return;
    }
    if (!Number.isInteger(guests) || guests < 1 || guests > 16) {
      status.textContent = "149 Tyrolean Lane accommodates up to 16 guests.";
      setCardPrice("149 Tyrolean Lane accommodates up to 16 guests.");
      return;
    }
    status.textContent = "Checking Guesty live pricing…";
    try {
      const response = await fetch("https://zyenhomes-booking-api.brendan-nguyen-90f.workers.dev/api/public/quote/149-tyrolean", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({checkIn,checkOut,guests})
      });
      const result = await response.json();
      if (id !== sequence) return;
      if (!response.ok || !result.success || !Number.isFinite(result.pricing?.total)) throw Error("Quote unavailable");
      const pricing = result.pricing;
      const currency = pricing.currency || "CAD";
      for (const item of pricing.invoiceItems || []) {
        if (Number.isFinite(item.amount)) addLine(item.title || item.type || "Charge", item.amount, currency);
      }
      addLine("Total booking price", pricing.total, currency);
      details.hidden = false;
      setCardPrice("<strong>" + money(pricing.total, currency) + "</strong><small>Total for selected stay · includes fees and taxes</small>");
      status.textContent = "Guesty quote only; dates are not reserved. Prices may change before confirmation.";
    } catch {
      if (id !== sequence) return;
      status.textContent = "Live price unavailable. Use the Guesty booking search below.";
      setCardPrice("Live price unavailable — check Guesty booking search.");
    }
  }
  form.addEventListener("submit", quote);
  if (form.elements.checkin.value && form.elements.checkout.value) quote();
})();

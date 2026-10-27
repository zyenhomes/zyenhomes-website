(() => {
  "use strict";
  const root = document.querySelector("#property");
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const property = window.ZYEN_PROPERTIES?.find(p => p.id === id);
  if (!root || !property) return;
  const connected = new Set(["100-pilsen","105-pilsen","106-birch-view","109-plater","116-tyrolean","147-campbell","149-tyrolean","197-arlberg","37-snowbridge"]);
  const section = document.createElement("section");
  section.className = "zy-detail-booking";
  section.style.cssText = "margin:20px 0 26px;padding:20px;background:#f3f6f3;border-radius:14px;border:1px solid #dce6e1";
  const title = document.createElement("h2");
  title.textContent = "Check dates & pricing";
  title.style.cssText = "font:700 25px Georgia,serif;color:#153e35;margin:0 0 12px";
  section.append(title);
  if (!connected.has(id)) {
    const note = document.createElement("p");
    note.textContent = "Contact us for rates and availability";
    section.append(note);
  } else {
    const form = document.createElement("form");
    form.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;align-items:end";
    const field = (label, name, type, value) => {
      const wrap = document.createElement("label");
      wrap.style.cssText = "display:flex;flex-direction:column;gap:5px;color:#153e35;font-weight:600";
      wrap.textContent = label;
      const input = document.createElement("input");
      input.name = name; input.type = type; input.required = true;
      input.style.cssText = "width:100%;box-sizing:border-box;padding:12px;border:1px solid #cad4cc;border-radius:8px;font:inherit";
      if (value) input.value = value;
      wrap.append(input); form.append(wrap); return input;
    };
    const checkin = field("Check-in", "checkin", "date", params.get("checkin"));
    const checkout = field("Check-out", "checkout", "date", params.get("checkout"));
    const guests = field("Guests", "guests", "number", params.get("guests") || "2");
    guests.min = "1"; guests.max = String(property.guests);
    const now = new Date();
    const localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0,10);
    checkin.min = localToday;
    checkout.min = localToday;
    checkin.addEventListener("change", () => {
      checkout.min = checkin.value || localToday;
      if (checkout.value && checkout.value <= checkin.value) checkout.value = "";
    });
    const button = document.createElement("button");
    button.type = "submit"; button.textContent = "Check price";
    button.className = "zy-button";
    form.append(button);
    const status = document.createElement("p");
    status.setAttribute("role","status");
    status.style.cssText = "margin:12px 0 0;color:#244638";
    const note = document.createElement("p");
    note.textContent = "Calendar availability is not yet verified. Prices are quotes only; dates are not reserved.";
    note.style.cssText = "font-size:13px;color:#586d62";
    section.append(form,status,note);
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (!checkin.value || !checkout.value || checkout.value <= checkin.value) {
        status.textContent = "Select valid check-in and check-out dates."; return;
      }
      button.disabled = true; status.textContent = "Checking Guesty pricing…";
      try {
        const response = await fetch("https://zyenhomes-booking-api.brendan-nguyen-90f.workers.dev/api/public/quote/property/" + encodeURIComponent(id), {
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({checkIn:checkin.value,checkOut:checkout.value,guests:Number(guests.value)})
        });
        const data = await response.json();
        if (response.ok && data.success && Number.isFinite(data.pricing?.total)) {
          status.textContent = new Intl.NumberFormat("en-CA",{style:"currency",currency:data.pricing.currency || "CAD"}).format(data.pricing.total) + " total for selected stay, including fees and taxes.";
        } else {
          status.textContent = "Unable to confirm availability for these dates. Please contact us or try different dates.";
        }
      } catch {
        status.textContent = "Unable to check pricing right now. Please try again.";
      } finally { button.disabled = false; }
    });
  }
  const gallery = root.querySelector("#live-gallery");
  if (gallery) gallery.before(section);
  else root.append(section);
})();

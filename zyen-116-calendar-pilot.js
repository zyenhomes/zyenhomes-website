(() => {
  "use strict";
  const params = new URLSearchParams(location.search);
  if (params.get("id") !== "116-tyrolean") return;
  const root = document.getElementById("property");
  if (!root) return;
  const section = document.createElement("section");
  section.className = "zy-116-booking";
  section.style.cssText = "background:#f3f6f3;border:1px solid #dce6e1;border-radius:15px;padding:20px;margin:20px 0 28px;max-width:740px";
  section.innerHTML = '<h2 style="font:700 26px Georgia,serif;color:#153e35;margin:0 0 8px">Check dates & pricing</h2><p class="zy-116-hint">Choose check-in, then check-out. Booked and blocked dates are disabled.</p><div class="zy-116-controls" style="display:flex;gap:12px;flex-wrap:wrap;margin:12px 0"></div><div class="zy-116-calendar" hidden style="display:none;max-width:420px;background:white;border:1px solid #dce6e1;border-radius:12px;padding:14px"></div><button type="button" class="zy-button zy-116-check" disabled style="margin-top:14px">Check price</button><p class="zy-116-result" role="status" aria-live="polite"></p>';
  const slot = root.querySelector("#zy-116-booking-slot");
  if (slot) slot.replaceWith(section);
  else {
    const details = root.querySelector(".zy-detail > div:last-child");
    if (details) details.append(section);
    else root.prepend(section);
  }
  // Responsive layout: keep the calendar within narrow phone screens.
  section.style.maxWidth="100%";
  section.style.boxSizing="border-box";
  section.style.minWidth="0";
  const responsiveCalendar=section.querySelector(".zy-116-calendar");
  responsiveCalendar.style.maxWidth="100%";
  responsiveCalendar.style.width="100%";
  responsiveCalendar.style.boxSizing="border-box";
  responsiveCalendar.style.overflowX="hidden";
  const controls = section.querySelector(".zy-116-controls");
  const fields = {};
  for (const name of ["Check-in","Check-out","Guests"]) {
    const label = document.createElement("label");
    label.style.cssText = "display:flex;flex-direction:column;gap:5px;flex:1;min-width:120px;font-weight:600;color:#153e35";
    label.textContent = name;
    const input = document.createElement("input");
    input.style.cssText = "box-sizing:border-box;width:100%;padding:11px;border:1px solid #cad4cc;border-radius:8px;font:inherit";
    input.name = name.toLowerCase();
    input.type = name === "Guests" ? "number" : "text";
    if (name === "Guests") {input.min="1";input.max="20";input.value=params.get("guests") || "2";}
    else {input.readOnly=true;input.placeholder="Click";input.style.cursor="pointer";}
    label.append(input);controls.append(label);fields[name]=input;
  }
  // Enforce the individual property's licensed guest capacity.
  const maxGuests = Number(window.ZYEN_PROPERTIES?.find(p => p.id === propertyId)?.guests) || 20;
  fields.Guests.max = String(maxGuests);
  fields.Guests.setAttribute("aria-label","Guests (maximum "+maxGuests+")");
  const guestLimit = document.createElement("small");
  guestLimit.textContent = "Maximum "+maxGuests+" guests";
  guestLimit.style.cssText = "font-size:12px;color:#52685d";
  fields.Guests.parentElement.appendChild(guestLimit);
  function enforceGuestLimit(){
    const value = Number(fields.Guests.value);
    if (!Number.isFinite(value) || value < 1) fields.Guests.value = "1";
    else if (value > maxGuests) fields.Guests.value = String(maxGuests);
  }
  fields.Guests.addEventListener("input",enforceGuestLimit);
  fields.Guests.addEventListener("change",enforceGuestLimit);
  enforceGuestLimit();
  const today = new Date();
  const iso = d => [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  const todayISO = iso(today);
  let month = new Date(today.getFullYear(),today.getMonth(),1);
  let checkIn = "", checkOut = "", selectingOut = false, sequence = 0;
  const known = new Map();
  const calendar = section.querySelector(".zy-116-calendar");
  calendar.hidden=true;
  calendar.style.display="none";
  const setCalendarOpen = open => {calendar.hidden=!open;calendar.style.display=open?"block":"none";};
  const result = section.querySelector(".zy-116-result");
  const check = section.querySelector(".zy-116-check");
  const plus = (date,n) => new Date(Date.parse(date+"T00:00:00Z")+n*86400000).toISOString().slice(0,10);
  function refreshFields() {
    fields["Check-in"].value=checkIn;
    fields["Check-out"].value=checkOut;
    check.disabled=!(checkIn && checkOut);
    section.querySelector(".zy-116-hint").textContent=selectingOut
      ? "Now choose check-out in the same calendar."
      : "Choose check-in, then check-out. Grey dates cannot be selected.";
  }
  async function loadMonth() {
    const ticket=++sequence;
    const from=iso(month)>todayISO?iso(month):todayISO;
    // Include the following month to support stays crossing month boundaries.
    const to=iso(new Date(month.getFullYear(),month.getMonth()+2,1));
    if(to<=from){render();return;}
    result.textContent="Loading Guesty calendar…";
    try {
      const url="https://zyenhomes-booking-api.brendan-nguyen-90f.workers.dev/api/public/calendar/116-tyrolean?from="+from+"&to="+to;
      const response=await fetch(url);
      const data=await response.json();
      if(ticket!==sequence)return;
      if(!response.ok||!data.success||!Array.isArray(data.days))throw Error("Calendar unavailable");
      for(const day of data.days)known.set(day.date,{status:day.status,minNights:day.minNights,cta:day.cta,ctd:day.ctd});
      result.textContent="";
    } catch {
      if(ticket!==sequence)return;
      result.textContent="Calendar could not be verified. Please try again later.";
    }
    render();
  }
  function canSelect(date) {
    if (date < todayISO) return false;
    const day=known.get(date);
    if (!day) return false;
    if (!selectingOut) return day.status==="available" && day.cta===false &&
      Number.isInteger(day.minNights) && day.minNights>=1;
    const arrival=known.get(checkIn);
    const nights=(Date.parse(date)-Date.parse(checkIn))/86400000;
    return date>checkIn && nights<=30 && nights>=arrival.minNights &&
      day.ctd===false && stayClear(checkIn,date);
  }
  function stayClear(start,end) {
    for(let date=start;date<end;date=plus(date,1)) {
      const day=known.get(date);
      if (!day || day.status!=="available") return false;
    }
    return true;
  }
  function render() {
    calendar.replaceChildren();
    const head=document.createElement("div");
    head.style.cssText="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px";
    const prev=document.createElement("button"),next=document.createElement("button");
    prev.type=next.type="button";prev.textContent="‹";next.textContent="›";
    prev.disabled=month.getFullYear()===today.getFullYear()&&month.getMonth()===today.getMonth();
    const label=document.createElement("strong");
    label.textContent=month.toLocaleDateString("en-CA",{month:"long",year:"numeric"});
    for(const b of [prev,next]){b.style.cssText="padding:7px 13px;border:1px solid #cad4cc;border-radius:7px;background:white;cursor:pointer";}
    prev.onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);loadMonth();};
    next.onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);loadMonth();};
    head.append(prev,label,next);calendar.append(head);
    const grid=document.createElement("div");
    grid.style.cssText="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;text-align:center;width:100%";
    for(const name of ["Su","Mo","Tu","We","Th","Fr","Sa"]){
      const el=document.createElement("span");el.textContent=name;el.style.fontSize="12px";grid.append(el);
    }
    const y=month.getFullYear(),m=month.getMonth();
    for(let i=0;i<new Date(y,m,1).getDay();i++)grid.append(document.createElement("span"));
    for(let n=1;n<=new Date(y,m+1,0).getDate();n++){
      const date=iso(new Date(y,m,n));
      const b=document.createElement("button");b.type="button";b.textContent=String(n);
      b.disabled=!canSelect(date);
      b.setAttribute("aria-label",date+" "+(known.get(date)?.status||"not verified"));
      b.style.cssText="padding:10px 0;min-width:0;min-height:40px;border:0;border-radius:6px;font:inherit;cursor:pointer;background:white;color:#153e35";
      if(b.disabled)b.style.cssText+=";color:#a7aaa7;background:#edf0ed;cursor:not-allowed;text-decoration:line-through";
      if(checkIn && checkOut && date>checkIn && date<checkOut) b.style.background="#d7ebe1";
      if(date===checkIn||date===checkOut)b.style.cssText+=";background:#174f41;color:white";
      b.onclick=()=>{
        if(!selectingOut){checkIn=date;checkOut="";selectingOut=true;}
        else {checkOut=date;selectingOut=false;setCalendarOpen(false);}
        clearQuote();result.textContent="";refreshFields();render();
      };
      grid.append(b);
    }
    calendar.append(grid);
    const legend=document.createElement("p");
    legend.style.cssText="font-size:12px;color:#42584e;margin:12px 0 0";
    legend.textContent="White: Available | Grey: Unavailable | Dark green: Selected dates | Light green: Selected stay";
    calendar.append(legend);
  }
  for(const key of ["Check-in","Check-out"])fields[key].onclick=()=>{
    selectingOut=key==="Check-out" && Boolean(checkIn);
    if(key==="Check-in"){checkIn="";checkOut="";}
    clearQuote();setCalendarOpen(true);refreshFields();render();
  };
  // Show a real inline form; sending still uses the guest's email app.
  const inquiry=document.createElement("button");
  inquiry.type="button";inquiry.className="zy-button";
  inquiry.textContent="Request to book";
  inquiry.hidden=true;inquiry.style.cssText="display:none;margin:12px 0 0 10px";
  check.after(inquiry);
  const form=document.createElement("form");
  form.hidden=true;form.style.cssText="display:none;margin-top:16px;padding:16px;background:white;border:1px solid #dce6e1;border-radius:10px";
  form.innerHTML='<h3 style="margin:0 0 12px;color:#153e35">Booking request details</h3><label style="display:block;margin-bottom:10px">Full name <input name="fullName" autocomplete="name" required maxlength="100" style="display:block;width:100%;box-sizing:border-box;padding:10px"></label><label style="display:block;margin-bottom:10px">Email <input type="email" name="email" autocomplete="email" required maxlength="150" style="display:block;width:100%;box-sizing:border-box;padding:10px"></label><label style="display:block;margin-bottom:10px">Phone <input type="tel" name="phone" autocomplete="tel" required maxlength="40" style="display:block;width:100%;box-sizing:border-box;padding:10px"></label><label style="display:block;margin-bottom:10px">Message (optional) <textarea name="message" maxlength="1000" rows="3" style="display:block;width:100%;box-sizing:border-box;padding:10px"></textarea></label><p style="font-size:13px">Submitting opens your email application with these details. You must send the email to complete the request. No reservation or payment is created.</p><button class="zy-button" type="submit">Prepare booking request email</button>';
  section.append(form);
  let quotedTotal=null;
  function clearQuote(){
    quotedTotal=null;inquiry.hidden=true;inquiry.style.display="none";
    form.hidden=true;form.style.display="none";
  }
  inquiry.onclick=()=>{
    form.hidden=false;
    form.style.display="block";
    form.scrollIntoView({behavior:"smooth",block:"start"});
    const nameField=form.querySelector('input[name="fullName"]');
    if(nameField) nameField.focus({preventScroll:true});
  };
  form.onsubmit=event=>{
    event.preventDefault();
    if(!quotedTotal || !form.reportValidity())return;
    const data=new FormData(form);
    const id=typeof propertyId==="string"?propertyId:"116-tyrolean";
    const propertyName=window.ZYEN_PROPERTIES?.find(p=>p.id===id)?.name || "Vacation rental";
    const lines=["Hello Zyen Homes,","I would like to request a booking.","",
      "Property: "+propertyName,"Check-in: "+checkIn,"Check-out: "+checkOut,
      "Guests: "+fields.Guests.value,"Quoted total: "+quotedTotal,"",
      "Full name: "+data.get("fullName"),"Email: "+data.get("email"),
      "Phone: "+data.get("phone"),"Message: "+(data.get("message")||""),"",
      "Please confirm availability and next steps."];
    const href="mailto:info@zyenhomes.com?subject="+encodeURIComponent("Booking inquiry: "+propertyName)+"&body="+encodeURIComponent(lines.join("\n"));
    window.location.href=href;
  };
  fields.Guests.addEventListener("change",()=>{clearQuote();result.textContent="";});
  check.onclick=async()=>{
    if(!checkIn||!checkOut||!stayClear(checkIn,checkOut) || !known.has(checkOut) || known.get(checkOut).ctd!==false || known.get(checkIn).cta!==false || (Date.parse(checkOut)-Date.parse(checkIn))/86400000<known.get(checkIn).minNights){result.textContent="Select an available stay.";return;}
    clearQuote();check.disabled=true;result.textContent="Checking live Guesty price…";
    let resolvedQuote=null;
    try{
      const res=await fetch("https://zyenhomes-booking-api.brendan-nguyen-90f.workers.dev/api/public/quote/property/116-tyrolean",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({checkIn,checkOut,guests:Number(fields.Guests.value)})
      });
      const data=await res.json();
      if(res.ok&&data.success&&Number.isFinite(data.pricing?.total)) resolvedQuote={total:data.pricing.total,formatted:new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD"}).format(data.pricing.total)};
      result.textContent=res.ok&&data.success&&Number.isFinite(data.pricing?.total)
        ? new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD"}).format(data.pricing.total)+" total, including fees and taxes. Quote only; no dates reserved."
        : "Unable to confirm this stay. Please select different dates or contact us.";
    }catch{result.textContent="Unable to check pricing right now. Please try again.";}
    if(resolvedQuote && Number.isFinite(resolvedQuote.total)){
      quotedTotal=resolvedQuote.formatted;
      inquiry.hidden=false;inquiry.style.display="inline-block";
    }
    check.disabled=false;
  };
  refreshFields();loadMonth();
})();

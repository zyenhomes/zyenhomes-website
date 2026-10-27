(() => {
  "use strict";
  const form = document.getElementById("filters");
  if (!form) return;
  const start = form.elements.checkin;
  const end = form.elements.checkout;
  const today = new Date();
  const todayISO = [today.getFullYear(), String(today.getMonth()+1).padStart(2,"0"), String(today.getDate()).padStart(2,"0")].join("-");
  const dateISO = (y,m,d) => [y,String(m+1).padStart(2,"0"),String(d).padStart(2,"0")].join("-");
  const valid = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
  if (!valid(start.value)) start.value = "";
  if (!valid(end.value)) end.value = "";
  let choosing = start.value && !end.value ? "checkout" : "checkin";
  let month = new Date((start.value || todayISO) + "T12:00:00");
  const popup = document.createElement("div");
  popup.className = "zy-calendar";
  popup.hidden = true;
  popup.setAttribute("role","dialog");
  popup.setAttribute("aria-label","Choose check-in and check-out dates");
  popup.innerHTML = '<div class="zy-calendar-head"><button type="button" data-nav="-1" aria-label="Previous month">‹</button><strong class="zy-month-title"></strong><button type="button" data-nav="1" aria-label="Next month">›</button></div><p class="zy-calendar-hint"></p><div class="zy-calendar-grid"></div><button class="zy-calendar-close" type="button">Close calendar</button>';
  document.body.append(popup);
  function place(anchor) {
    if (innerWidth <= 550) return;
    const rect = anchor.getBoundingClientRect();
    popup.style.left = Math.min(scrollX + rect.left, scrollX + innerWidth - 365) + "px";
    popup.style.top = scrollY + rect.bottom + 6 + "px";
  }
  function draw() {
    popup.querySelector(".zy-month-title").textContent = month.toLocaleDateString("en-CA",{month:"long",year:"numeric"});
    popup.querySelector(".zy-calendar-hint").textContent = choosing === "checkin" ? "Select your check-in date" : "Now select your check-out date";
    const grid = popup.querySelector(".zy-calendar-grid");
    grid.replaceChildren();
    for (const day of ["Su","Mo","Tu","We","Th","Fr","Sa"]) {
      const label = document.createElement("span"); label.textContent=day; grid.append(label);
    }
    const year=month.getFullYear(), m=month.getMonth();
    const offset=new Date(year,m,1).getDay();
    for(let i=0;i<offset;i++) grid.append(document.createElement("span"));
    const count=new Date(year,m+1,0).getDate();
    for(let day=1;day<=count;day++){
      const value=dateISO(year,m,day);
      const btn=document.createElement("button");
      btn.type="button";btn.className="zy-calendar-day";btn.textContent=String(day);
      btn.setAttribute("aria-label",value);
      btn.disabled=value<todayISO || (choosing==="checkout" && value<=start.value);
      if(value===start.value || value===end.value) btn.classList.add("zy-selected");
      else if(start.value && end.value && value>start.value && value<end.value) btn.classList.add("zy-between");
      btn.addEventListener("click",()=>select(value));
      grid.append(btn);
    }
  }
  function show(target) {
    choosing = target === end && start.value ? "checkout" : "checkin";
    month = new Date((choosing==="checkout" ? (end.value || start.value) : (start.value || todayISO)) + "T12:00:00");
    popup.hidden=false;place(target);draw();
  }
  function select(value) {
    if(choosing==="checkin"){
      start.value=value;end.value="";
      start.dispatchEvent(new Event("change",{bubbles:true}));
      end.dispatchEvent(new Event("change",{bubbles:true}));
      choosing="checkout";
      draw();
    } else {
      end.value=value;
      end.dispatchEvent(new Event("change",{bubbles:true}));
      popup.hidden=true;
      form.elements.guests.focus();
    }
  }
  start.addEventListener("click",()=>show(start));
  end.addEventListener("click",()=>show(end));
  for(const input of [start,end]) input.addEventListener("keydown",e=>{
    if(e.key==="Enter"||e.key===" "){e.preventDefault();show(input);}
  });
  popup.querySelectorAll("[data-nav]").forEach(button=>button.addEventListener("click",()=>{
    month=new Date(month.getFullYear(),month.getMonth()+Number(button.dataset.nav),1);
    draw();
  }));
  popup.querySelector(".zy-calendar-close").addEventListener("click",()=>popup.hidden=true);
  document.addEventListener("keydown",e=>{if(e.key==="Escape")popup.hidden=true;});
  document.addEventListener("pointerdown",e=>{
    if(!popup.hidden && !popup.contains(e.target) && e.target!==start && e.target!==end)popup.hidden=true;
  });
})();

// Read-only quote diagnostics. Does not create inquiries or reservations.
const base="https://zyenhomes-booking-api.brendan-nguyen-90f.workers.dev";
const cases=[
  {property:"105-pilsen",checkIn:"2026-11-10",checkOut:"2026-11-12",guests:2},
  {property:"149-tyrolean",checkIn:"2026-11-10",checkOut:"2026-11-12",guests:2},
  {property:"149-tyrolean",checkIn:"2026-11-11",checkOut:"2026-11-13",guests:2}
];
let failed=0;
for(const c of cases){
  const url=base+(c.property==="149-tyrolean"?"/api/public/quote/149-tyrolean":"/api/public/quote/property/"+c.property);
  try{
    const response=await fetch(url,{
      method:"POST",
      headers:{"Content-Type":"application/json","Origin":"https://zyenhomes.com"},
      body:JSON.stringify({checkIn:c.checkIn,checkOut:c.checkOut,guests:c.guests}),
      signal:AbortSignal.timeout(20000)
    });
    const body=await response.json().catch(()=>({}));
    const ok=response.ok&&body.success&&Number.isFinite(body.pricing?.total);
    console.log(JSON.stringify({
      property:c.property,checkIn:c.checkIn,checkOut:c.checkOut,
      httpStatus:response.status,success:ok,
      currency:ok?body.pricing.currency:undefined,
      errorType:ok?undefined:body.errorType,
      message:ok?undefined:String(body.message||"No response message").slice(0,160)
    }));
    if(!ok)failed++;
  }catch(error){
    failed++;
    console.log(JSON.stringify({property:c.property,checkIn:c.checkIn,
      networkError:error.name}));
  }
  await new Promise(resolve=>setTimeout(resolve,1200));
}
console.log("Quote cases tested:",cases.length,"Unsuccessful:",failed);
if(failed)process.exitCode=1;

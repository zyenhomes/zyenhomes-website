// Private, temporary Booking Engine quote ID diagnostic. Disabled by default.
// This endpoint does not create reservations/inquiries or change production flags.
const listingId="6914041adf75040043bc8ed8"; // 116 Tyrolean
const json=(body,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
async function sameSecret(expected,supplied) {
 if(typeof expected!=="string"||expected.length<32||
    typeof supplied!=="string"||supplied.length!==expected.length)return false;
 const digest=async s=>new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)));
 const [a,b]=await Promise.all([digest(expected),digest(supplied)]);
 let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}
export async function handlePrivateQuoteIdDiagnostic(request,env,{tokenProvider,transport=fetch}={}) {
 if(env?.ZYEN_PRIVATE_QUOTE_ID_DIAGNOSTIC_ENABLED!=="true")
  return json({success:false,reason:"disabled"},404);
 if(request.method!=="POST")return json({success:false,reason:"method_not_allowed"},405);
 if(!await sameSecret(env?.ZYEN_QUOTE_TEST_KEY,request.headers.get("X-Zyen-Test-Key")))
  return json({success:false,reason:"unauthorized"},401);
 if(typeof tokenProvider!=="function")return json({success:false,reason:"unavailable"},503);
 let input;
 try {
  if(Number(request.headers.get("Content-Length")||0)>1024)return json({success:false,reason:"invalid_input"},400);
  const raw=await request.text();if(raw.length>1024)return json({success:false,reason:"invalid_input"},400);
  input=JSON.parse(raw);
 }catch{return json({success:false,reason:"invalid_input"},400);}
 const {checkIn,checkOut,guests}=input??{};
 const validDate=d=>typeof d==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
   !Number.isNaN(Date.parse(d))&&new Date(d+"T00:00:00Z").toISOString().slice(0,10)===d;
 const nights=validDate(checkIn)&&validDate(checkOut)?(Date.parse(checkOut)-Date.parse(checkIn))/86400000:0;
 if(!validDate(checkIn)||!validDate(checkOut)||checkIn<new Date().toISOString().slice(0,10)||
   nights<1||nights>30||!Number.isSafeInteger(guests)||guests<1||guests>20)
  return json({success:false,reason:"invalid_input"},400);
 try {
  const token=await tokenProvider(env);
  const response=await transport("https://booking.guesty.com/api/reservations/quotes",{
   method:"POST",
   headers:{Authorization:"Bearer "+token,Accept:"application/json","Content-Type":"application/json"},
   body:JSON.stringify({listingId,checkInDateLocalized:checkIn,checkOutDateLocalized:checkOut,guestsCount:guests})
  });
  if(!response?.ok)return json({success:false,reason:"quote_unavailable"},502);
  const payload=await response.json();
  const data=payload?.results??payload;
  const quote=Array.isArray(data)?data[0]:data;
  if(typeof quote?._id!=="string"||!/^[a-f0-9]{24}$/i.test(quote._id))
   return json({success:false,reason:"quote_id_missing"},502);
  return json({success:true,quoteId:quote._id,listingId,checkIn,checkOut,guests,
   note:"Booking Engine quote only; no reservation or inquiry created"});
 }catch{return json({success:false,reason:"quote_unavailable"},502);}
}

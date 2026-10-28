// Guesty uses Svix signatures. Validate over the original unmodified request body.
const decoder = new TextDecoder();
function base64Bytes(value) {
  const raw = atob(value);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
function equalBytes(a,b) {
  if(a.length!==b.length)return false;
  let diff=0;
  for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
  return diff===0;
}
export async function verifyGuestySvix(headers, raw, secret, now=Date.now()) {
  const id=headers.get("svix-id"), stamp=headers.get("svix-timestamp"), sig=headers.get("svix-signature");
  if(!id || !/^[-_a-zA-Z0-9]{6,200}$/.test(id) || !/^\d{10,13}$/.test(stamp||"") || !sig)return null;
  const seconds=Number(stamp);
  if(!Number.isSafeInteger(seconds) || Math.abs(now-seconds*1000)>300000)return null;
  if(!secret?.startsWith("whsec_"))return null;
  let key;
  try{key=base64Bytes(secret.slice(6));}catch{return null;}
  const hmac=await crypto.subtle.importKey("raw",key,{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signed=new TextEncoder().encode(id+"."+stamp+"."+raw);
  const expected=new Uint8Array(await crypto.subtle.sign("HMAC",hmac,signed));
  for(const candidate of sig.split(" ")){
    const [version,encoded]=candidate.split(",");
    if(version!=="v1" || !encoded)continue;
    try{if(equalBytes(expected,base64Bytes(encoded)))return id;}catch{}
  }
  return null;
}
export async function receiveGuestyMessageWebhook(request,env){
  const json=(data,status)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
  if(request.method!=="POST")return json({success:false},405);
  if(env.GUESTY_WEBHOOKS_ENABLED!=="true")return json({success:false,message:"Webhook receiver disabled"},503);
  if(!env.GUESTY_WEBHOOK_SECRET || !env.BOOKING_DB)return json({success:false},503);
  if(Number(request.headers.get("Content-Length")||0)>65536)return json({success:false},413);
  let raw;
  try{raw=await request.text();}catch{return json({success:false},400);}
  if(new TextEncoder().encode(raw).length>65536)return json({success:false},413);
  const svixId=await verifyGuestySvix(request.headers,raw,env.GUESTY_WEBHOOK_SECRET);
  if(!svixId)return json({success:false,message:"Invalid webhook signature"},401);
  let event;
  try{event=JSON.parse(raw);}catch{return json({success:false},400);}
  const type=event?.event;
  if(!["reservation.messageReceived","reservation.messageSent"].includes(type))return json({success:false,message:"Unsupported event"},400);
  const reservationId=event?.reservationId;
  if(typeof reservationId!=="string" || reservationId.length>128 || !reservationId)return json({success:false},400);
  const eventId=event?.meta?.eventId;
  const safeEventId=typeof eventId==="string"&&eventId.length<=200?eventId:null;
  const conversationId=event?.conversation?._id;
  const safeConversationId=typeof conversationId==="string"&&conversationId.length<=200?conversationId:null;
  const occurredAt=event?.message?.createdAt??event?.message?.sentAt??event?.lastUpdatedAt;
  const safeOccurredAt=typeof occurredAt==="string"&&occurredAt.length<=64?occurredAt:null;
  try{
    await env.BOOKING_DB.prepare(
      "INSERT OR IGNORE INTO guesty_message_events (svix_id,guesty_event_id,event_type,reservation_id,conversation_id,occurred_at,payload_json) VALUES (?,?,?,?,?,?,?)"
    ).bind(svixId,safeEventId,type,reservationId,safeConversationId,safeOccurredAt,raw).run();
    return json({success:true},200);
  }catch{
    return json({success:false,message:"Storage unavailable"},503);
  }
}

// Offline-only validation for possible Guesty signing-secret responses.
// No network, no Cloudflare writes, no real secrets, no raw response logging.
// Actual Guesty response shape must be confirmed before implementing live retrieval.
export function extractSecret(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  // Conservative: only an explicit top-level secret key is accepted.
  const keys=Object.keys(payload);
  if(keys.length!==1 || keys[0]!=="secret")return null;
  const value=payload.secret;
  if(typeof value!=="string" || !/^whsec_[A-Za-z0-9+/=]{20,}$/.test(value))return null;
  return value;
}
if(import.meta.url===`file://${process.argv[1]}`){
  const fake="whsec_"+Buffer.alloc(32,17).toString("base64");
  const tests=[
    [{secret:fake},true],
    [{},false],
    [{secret:"not-a-secret"},false],
    [{secret:fake,extra:"unexpected"},false],
    [{data:{secret:fake}},false],
    [{secret:123},false]
  ];
  for(const [input,expected] of tests){
    if(Boolean(extractSecret(input))!==expected)throw Error("Signing secret response validation failed");
  }
  console.log("PASS: Offline signing-secret response validation (synthetic values only)");
  console.log("No Guesty API calls, no Cloudflare writes, no subscription creation.");
}

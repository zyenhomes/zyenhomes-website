// Composes trusted Google JWKS retrieval and signature/claim verification.
// This is not yet connected to the deployed OAuth Worker.
import {getGoogleJwks} from "./google-jwks.js";
import {verifyGoogleIdToken} from "./google-id-token.js";
export async function verifyArchiveIdentity(idToken,nonce,{clientId,fetchImpl=fetch,nowSeconds=Math.floor(Date.now()/1000)}){
 if(typeof idToken!=="string"||!idToken||typeof nonce!=="string"||!nonce||!clientId)throw Error("Missing identity verification input");
 const jwks=await getGoogleJwks({fetchImpl});
 const identity=await verifyGoogleIdToken(idToken,{jwks,clientId,nonce,nowSeconds});
 return identity.mailbox;
}

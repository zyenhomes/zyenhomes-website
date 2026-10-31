// Standalone Gmail OAuth Worker dependency preflight.
// No live route activation. Never log secret values or database contents.
export function inspectGmailOAuthBindings(env){
 const missing=[];
 if(!env||typeof env!=="object")return {ready:false,missing:["environment"]};
 if(!env.GMAIL_OAUTH_DB||typeof env.GMAIL_OAUTH_DB.prepare!=="function")missing.push("GMAIL_OAUTH_DB");
 if(!env.GMAIL_LOGIN_RATE_LIMITER||typeof env.GMAIL_LOGIN_RATE_LIMITER.limit!=="function")missing.push("GMAIL_LOGIN_RATE_LIMITER");
 if(typeof env.GOOGLE_OAUTH_CLIENT_ID!=="string"||!env.GOOGLE_OAUTH_CLIENT_ID)missing.push("GOOGLE_OAUTH_CLIENT_ID");
 if(typeof env.GOOGLE_OAUTH_CLIENT_SECRET!=="string"||!env.GOOGLE_OAUTH_CLIENT_SECRET)missing.push("GOOGLE_OAUTH_CLIENT_SECRET");
 if(typeof env.GMAIL_TOKEN_ENCRYPTION_KEY!=="string"||!env.GMAIL_TOKEN_ENCRYPTION_KEY)missing.push("GMAIL_TOKEN_ENCRYPTION_KEY");
 return {ready:missing.length===0,missing};
}

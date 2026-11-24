// Isolated candidate, deliberately status-only. No imports of live adapters,
// no fetch, no database binding, no credentials, no request body parsing.
export default {
 async fetch(request){
 const url=new URL(request.url);
 const headers={"Cache-Control":"no-store","Content-Type":"application/json"};
 if(request.method==="GET"&&url.pathname==="/"){
 return new Response(JSON.stringify({status:"running",mode:"isolated_candidate",liveWritesEnabled:false,databaseWritesEnabled:false}),{headers});
 }
 return new Response(JSON.stringify({success:false,code:"ISOLATED_WRITES_DISABLED"}),{status:403,headers});
 }
};

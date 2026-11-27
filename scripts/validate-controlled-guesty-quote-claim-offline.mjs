import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync,mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {Worker} from "node:worker_threads";
import {DB} from "./nonblocking-upload-preflight.mjs";
import {TEST_BOOKING} from "./controlled-guesty-quote.mjs";
import {QUOTE_TEST_KEY,CLAIM_QUOTE_SQL,VERIFY_QUOTE_SQL,UNCERTAIN_QUOTE_SQL,
  createIsolatedQuoteStore,runClaimedControlledQuote} from "./controlled-guesty-quote-claim.mjs";

const schema=readFileSync(new URL("../cloudflare/isolated-migrations/0001_controlled_quote_attempt.sql",import.meta.url),"utf8");
const sha="a".repeat(40),otherSha="b".repeat(40),account="c".repeat(32);
const root="https://api.cloudflare.com/client/v4/accounts/"+account+"/d1/database/"+DB;
const now=Date.parse("2026-11-27T12:00:00Z");
function quote(){
  return {_id:"1234567890abcdef12345678",accountId:TEST_BOOKING.accountId,
    unitTypeId:TEST_BOOKING.listingId,checkInDateLocalized:TEST_BOOKING.checkIn,
    checkOutDateLocalized:TEST_BOOKING.checkOut,guestsCount:TEST_BOOKING.guests,
    status:"valid",expiresAt:new Date(now+300000).toISOString(),
    rates:{ratePlans:[{ratePlan:{_id:"test-rate-plan",
      money:{currency:"CAD",invoiceItems:[{amount:1100},{amount:250},{amount:229.50}]}}}]}};
}
function fixture(){
  const db=new DatabaseSync(":memory:");
  db.exec(schema);
  let authCalls=0,quoteCalls=0,queryCalls=0;
  const options={account,token:"mock-cf-token",transport:async(url,opts)=>{
    assert.equal(opts.redirect,"error");
    assert.equal(opts.headers.Authorization,"Bearer mock-cf-token");
    if(url===root){
      assert.equal(opts.method,"GET");
      return {ok:true,json:async()=>({success:true,result:{uuid:DB,name:"zyenhomes-booking-test"}})};
    }
    assert.equal(url,root+"/query");
    assert.equal(opts.method,"POST");
    queryCalls++;
    const {sql,params}=JSON.parse(opts.body);
    assert.ok([CLAIM_QUOTE_SQL,VERIFY_QUOTE_SQL,UNCERTAIN_QUOTE_SQL].includes(sql));
    const results=db.prepare(sql).all(...params);
    const changes=db.prepare("SELECT changes() AS n").get().n;
    return {ok:true,json:async()=>({success:true,result:[{success:true,results,meta:{changes}}]})};
  }};
  const input={runId:"100",commitSha:sha,now:()=>now,
    authenticate:async()=>{authCalls++;return {ok:true,accessToken:"mock-guesty-token"};},
    transport:async(url,opts)=>{
      quoteCalls++;
      assert.equal(new URL(url).pathname,"/v1/quotes");
      assert.equal(opts.method,"POST");
      return {ok:true,json:async()=>quote()};
    }};
  return {db,options,input,counts:()=>({authCalls,quoteCalls,queryCalls}),
    row:()=>db.prepare("SELECT * FROM controlled_quote_attempts").get()};
}

let f=fixture();
let store=await createIsolatedQuoteStore(f.options);
const result=await runClaimedControlledQuote({...f.input,store});
assert.equal(result.totalCents,157950);
assert.equal(f.row().state,"verified");
assert.equal(f.row().quote_id,result.quoteId);
assert.equal(f.row().total_cents,157950);
// A separate run and commit use the same durable booking key.
store=await createIsolatedQuoteStore(f.options);
await assert.rejects(()=>runClaimedControlledQuote({...f.input,store,runId:"101",commitSha:otherSha}),/already_consumed/);
assert.equal(f.counts().authCalls,1);
assert.equal(f.counts().quoteCalls,1);
f.db.close();

for(const failure of ["auth","timeout","bad_response","audit_failure","claim_response_lost"]){
  f=fixture();
  const realTransport=f.options.transport;
  f.options.transport=async(url,opts)=>{
    const r=await realTransport(url,opts);
    if(url===root+"/query"){
      const {sql}=JSON.parse(opts.body);
      if(failure==="claim_response_lost"&&sql===CLAIM_QUOTE_SQL)throw Error("simulated_lost_claim_response");
      if(failure==="audit_failure"&&sql===VERIFY_QUOTE_SQL)throw Error("simulated_lost_audit_response");
    }
    return r;
  };
  store=await createIsolatedQuoteStore(f.options);
  let sends=0;
  if(failure==="auth")f.input.authenticate=async()=>({ok:false});
  if(failure==="timeout")f.input.transport=async()=>{sends++;throw Error("simulated_timeout");};
  if(failure==="bad_response")f.input.transport=async()=>{sends++;return {ok:true,json:async()=>({})};};
  await assert.rejects(()=>runClaimedControlledQuote({...f.input,store}));
  const before={...f.counts(),sends};
  // Recreate the store with a fresh runner and the durable DB.
  f.options.transport=realTransport;
  store=await createIsolatedQuoteStore(f.options);
  await assert.rejects(()=>runClaimedControlledQuote({...f.input,store,runId:"102",commitSha:otherSha}),/already_consumed/);
  assert.equal(f.counts().authCalls,before.authCalls);
  assert.equal(f.counts().quoteCalls,before.quoteCalls);
  assert.equal(sends,before.sends);
  assert.ok(f.row());
  f.db.close();
}

for(const bad of [{uuid:"wrong",name:"zyenhomes-booking-test"},{uuid:DB,name:"production"}]){
  let calls=0;
  await assert.rejects(()=>createIsolatedQuoteStore({account,token:"mock",
    transport:async()=>{calls++;return {ok:true,json:async()=>({success:true,result:bad})};}}),/wrong_quote_database/);
  assert.equal(calls,1);
}
for(const bad of [
  {success:true,result:[{success:true,results:[],meta:{changes:1}}]},
  {success:true,result:[{success:true,results:[{test_key:QUOTE_TEST_KEY,run_id:"wrong",commit_sha:sha}],meta:{changes:1}}]},
  {success:true,result:[{success:false,results:[],meta:{changes:0}}]}
]){
  f=fixture();
  const real=f.options.transport;
  store=await createIsolatedQuoteStore({...f.options,transport:async(url,opts)=>
    url===root?real(url,opts):{ok:true,json:async()=>bad}});
  await assert.rejects(()=>runClaimedControlledQuote({...f.input,store}),/quote_claim_result_unverified/);
  assert.equal(f.counts().authCalls,0);
  assert.equal(f.counts().quoteCalls,0);
  f.db.close();
}

// Actual SQLite concurrency, independent connections and simultaneous start.
// No Cloudflare or Guesty network calls.
const dir=mkdtempSync(join(tmpdir(),"zyen-quote-claim-"));
try{
  const path=join(dir,"test.sqlite");
  const db=new DatabaseSync(path);
  db.exec(schema);
  const barrier=new SharedArrayBuffer(4);
  const gate=new Int32Array(barrier);
  const children=["201","202"].map(runId=>{
    const w=new Worker(`
      const {parentPort,workerData}=require("node:worker_threads");
      const {DatabaseSync}=require("node:sqlite");
      const db=new DatabaseSync(workerData.path);
      db.exec("PRAGMA busy_timeout=10000");
      parentPort.postMessage("ready");
      const gate=new Int32Array(workerData.barrier);
      Atomics.wait(gate,0,0,10000);
      const rows=db.prepare(workerData.sql).all(...workerData.params);
      db.close();
      parentPort.postMessage(rows.length);
    `,{eval:true,workerData:{path,barrier,sql:CLAIM_QUOTE_SQL,params:[QUOTE_TEST_KEY,runId,sha]}});
    let readyResolve,doneResolve,doneReject;
    const ready=new Promise(r=>readyResolve=r);
    const done=new Promise((r,j)=>{doneResolve=r;doneReject=j});
    w.on("message",m=>m==="ready"?readyResolve():doneResolve(m));
    w.on("error",doneReject);
    w.on("exit",code=>{if(code!==0)doneReject(Error("worker_failed"));});
    return {ready,done,w};
  });
  try{
    await Promise.race([Promise.all(children.map(x=>x.ready)),Promise.all(children.map(x=>x.done)).then(()=>{throw Error("workers exited early")})]);
    Atomics.store(gate,0,1);Atomics.notify(gate,0,2);
    assert.deepEqual((await Promise.all(children.map(x=>x.done))).sort(),[0,1]);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM controlled_quote_attempts").get().n,1);
  }finally{
    await Promise.all(children.map(x=>x.w.terminate()));
    db.close();
  }
}finally{rmSync(dir,{recursive:true,force:true});}
console.log("PASS: persistent single-use quote claim across separate runs and commits");
console.log("PASS: uncertain quote outcomes and audit failures cannot release claim");
console.log("PASS: exact isolated D1 REST target and fail-closed claim verification");
console.log("PASS: independent SQLite connections race for one quote claim");

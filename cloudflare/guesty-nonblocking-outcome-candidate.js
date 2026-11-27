// Candidate only; not imported by any Worker. Never marks an inquiry successful.
export async function recordNonblockingOutcome({db,requestId,attemptId,claimToken,result}={}){
 const denied=reason=>({recorded:false,reason,retryAutomatically:false});
 if(![requestId,attemptId,claimToken].every(v=>typeof v==="string"&&/^[a-zA-Z0-9_-]{8,128}$/.test(v)))return denied("invalid_ids");
 const outcome=result?.state==="uncertain"?"uncertain":"manual_review";
 const reference=/^[a-f0-9]{24}$/i.test(result?.reference??"")?result.reference:null;
 // Audit is the durable source of truth. Keep request claimed (processing)
 // until independently verified reconciliation; never release it for retry.
 try{
 const r=await db.prepare(`UPDATE guesty_inquiry_sync_attempts
 SET outcome=?, completed_at=CURRENT_TIMESTAMP, guesty_reference=?, error_category=?
 WHERE attempt_id=? AND request_id=? AND claim_token=? AND outcome='processing'
 AND EXISTS (SELECT 1 FROM booking_requests WHERE request_id=? AND guesty_sync_claim_token=? AND guesty_sync_status='processing')`)
 .bind(outcome,reference,outcome,attemptId,requestId,claimToken,requestId,claimToken).run();
 if(r?.success!==true||r.meta?.changes!==1)return denied("outcome_not_recorded");
 return {recorded:true,outcome,reference,retryAutomatically:false};
 }catch{return denied("outcome_write_uncertain");}
}

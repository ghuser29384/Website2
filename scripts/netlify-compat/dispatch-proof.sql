-- Local-only prototype. Cryptographic verification remains the application's job.
CREATE FUNCTION synthetic_audit_dispatch.save_proof(
 p_dispatch text,p_worker text,p_generation bigint,p_checkpoint text,
 p_id text,p_url text,p_der bytea,p_verified timestamp,p_fingerprint text
) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE current_owner synthetic_audit_dispatch.owner%ROWTYPE;
BEGIN
 SELECT * INTO current_owner FROM synthetic_audit_dispatch.owner WHERE singleton FOR UPDATE;
 IF current_owner.dispatch_id IS DISTINCT FROM p_dispatch OR current_owner.worker IS DISTINCT FROM p_worker
 OR current_owner.generation IS DISTINCT FROM p_generation OR current_owner.expires_at IS NULL
 OR current_owner.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'stale dispatch owner'; END IF;
 IF NOT EXISTS(SELECT 1 FROM synthetic_audit_dispatch.batch WHERE dispatch_id=p_dispatch AND p_checkpoint=ANY(checkpoint_ids)) THEN RAISE EXCEPTION 'checkpoint outside dispatch'; END IF;
 IF p_id IS NULL OR p_url IS NULL OR p_der IS NULL OR octet_length(p_der)=0 THEN RAISE EXCEPTION 'invalid proof data'; END IF;
 INSERT INTO "AuditTimestamp"(id,"checkpointId","tsaUrl","rootHash","timestampTokenDer","verifiedAt","certificateFingerprint")
 SELECT p_id,c.id,p_url,c."rootHash",p_der,p_verified,p_fingerprint FROM "AuditCheckpoint" c WHERE c.id=p_checkpoint
 ON CONFLICT("checkpointId") DO NOTHING;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION synthetic_audit_dispatch.save_proof(text,text,bigint,text,text,text,bytea,timestamp,text) FROM PUBLIC;

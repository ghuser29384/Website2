-- Explicit original no-provider outcome; never claims proofs were verified.
ALTER TABLE synthetic_audit_dispatch.batch ADD COLUMN outcome jsonb;
CREATE FUNCTION synthetic_audit_dispatch.skip_unconfigured(p_dispatch text,p_worker text,p_generation bigint)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE owner_row synthetic_audit_dispatch.owner%ROWTYPE;
BEGIN
 SELECT * INTO owner_row FROM synthetic_audit_dispatch.owner WHERE singleton FOR UPDATE;
 IF owner_row.dispatch_id IS DISTINCT FROM p_dispatch OR owner_row.worker IS DISTINCT FROM p_worker OR owner_row.generation IS DISTINCT FROM p_generation OR owner_row.expires_at IS NULL OR owner_row.expires_at<=clock_timestamp() THEN RETURN false; END IF;
 UPDATE synthetic_audit_dispatch.batch SET prepared=true,finished_at=clock_timestamp(),outcome='{"timestamped":0,"skipped":"TSA_URL is not configured."}'::jsonb
 WHERE dispatch_id=p_dispatch AND NOT prepared AND finished_at IS NULL;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM synthetic_audit_dispatch.release(p_dispatch,p_worker,p_generation);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION synthetic_audit_dispatch.skip_unconfigured(text,text,bigint) FROM PUBLIC;

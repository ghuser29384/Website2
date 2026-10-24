CREATE FUNCTION synthetic_audit_dispatch.finish(p_dispatch text,p_worker text,p_generation bigint)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE owner_row synthetic_audit_dispatch.owner%ROWTYPE;
BEGIN
 SELECT * INTO owner_row FROM synthetic_audit_dispatch.owner WHERE singleton FOR UPDATE;
 IF owner_row.dispatch_id IS DISTINCT FROM p_dispatch OR owner_row.worker IS DISTINCT FROM p_worker
 OR owner_row.generation IS DISTINCT FROM p_generation OR owner_row.expires_at IS NULL OR owner_row.expires_at<=clock_timestamp() THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM synthetic_audit_dispatch.batch WHERE dispatch_id=p_dispatch AND prepared) THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM synthetic_audit_dispatch.batch b CROSS JOIN LATERAL unnest(b.checkpoint_ids) AS chosen(checkpoint_id)
 WHERE b.dispatch_id=p_dispatch AND NOT EXISTS(SELECT 1 FROM "AuditTimestamp" t WHERE t."checkpointId"=chosen.checkpoint_id)) THEN RETURN false; END IF;
 UPDATE synthetic_audit_dispatch.batch SET finished_at=clock_timestamp() WHERE dispatch_id=p_dispatch AND finished_at IS NULL;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM synthetic_audit_dispatch.release(p_dispatch,p_worker,p_generation);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION synthetic_audit_dispatch.finish(text,text,bigint) FROM PUBLIC;

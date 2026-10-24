ALTER TABLE synthetic_audit_dispatch.batch ADD COLUMN prepared boolean NOT NULL DEFAULT true;
ALTER TABLE synthetic_audit_dispatch.batch ADD COLUMN original_payload jsonb;
CREATE FUNCTION synthetic_audit_dispatch.register(p_id text,p_payload jsonb,p_limit integer)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE old_payload jsonb; old_limit integer; inserted boolean;
BEGIN
 IF p_id IS NULL OR p_payload IS NULL OR p_limit IS NULL OR p_limit<1 THEN RAISE EXCEPTION 'invalid registration'; END IF;
 INSERT INTO synthetic_audit_dispatch.batch(dispatch_id,checkpoint_ids,batch_limit,prepared,original_payload)
 VALUES(p_id,ARRAY[]::text[],p_limit,false,p_payload) ON CONFLICT(dispatch_id) DO NOTHING;
 inserted:=FOUND;
 SELECT original_payload,batch_limit INTO old_payload,old_limit FROM synthetic_audit_dispatch.batch WHERE dispatch_id=p_id;
 IF old_payload IS DISTINCT FROM p_payload OR old_limit IS DISTINCT FROM p_limit THEN RAISE EXCEPTION 'dispatch identity conflict'; END IF;
 RETURN inserted;
END $$;
REVOKE ALL ON FUNCTION synthetic_audit_dispatch.register(text,jsonb,integer) FROM PUBLIC;
CREATE FUNCTION synthetic_audit_dispatch.prepare(p_id text,p_worker text,p_generation bigint)
RETURNS text[] LANGUAGE plpgsql AS $$
DECLARE current_owner synthetic_audit_dispatch.owner%ROWTYPE; chosen text[]; configured_limit integer;
BEGIN
 SELECT * INTO current_owner FROM synthetic_audit_dispatch.owner WHERE singleton FOR UPDATE;
 IF current_owner.dispatch_id IS DISTINCT FROM p_id OR current_owner.worker IS DISTINCT FROM p_worker
 OR current_owner.generation IS DISTINCT FROM p_generation OR current_owner.expires_at IS NULL OR current_owner.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'stale preparation owner'; END IF;
 SELECT checkpoint_ids INTO chosen FROM synthetic_audit_dispatch.batch WHERE dispatch_id=p_id AND prepared;
 IF FOUND THEN RETURN chosen; END IF;
 SELECT batch_limit INTO configured_limit FROM synthetic_audit_dispatch.batch WHERE dispatch_id=p_id;
 SELECT coalesce(array_agg(id ORDER BY "createdAt",id),ARRAY[]::text[]) INTO chosen FROM (
 SELECT c.id,c."createdAt" FROM "AuditCheckpoint" c WHERE NOT EXISTS(SELECT 1 FROM "AuditTimestamp" t WHERE t."checkpointId"=c.id)
 ORDER BY c."createdAt",c.id LIMIT configured_limit) pending;
 UPDATE synthetic_audit_dispatch.batch SET checkpoint_ids=chosen,prepared=true WHERE dispatch_id=p_id;
 RETURN chosen;
END $$;
REVOKE ALL ON FUNCTION synthetic_audit_dispatch.prepare(text,text,bigint) FROM PUBLIC;

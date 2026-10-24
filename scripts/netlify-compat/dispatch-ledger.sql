-- Local prototype only. Not a production migration or grant proposal.
CREATE SCHEMA synthetic_audit_dispatch;
REVOKE ALL ON SCHEMA synthetic_audit_dispatch FROM PUBLIC;
CREATE TABLE synthetic_audit_dispatch.batch (
  dispatch_id text PRIMARY KEY,
  checkpoint_ids text[] NOT NULL,
  batch_limit integer NOT NULL CHECK(batch_limit>0),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON synthetic_audit_dispatch.batch FROM PUBLIC;
CREATE FUNCTION synthetic_audit_dispatch.admit(p_id text,p_limit integer DEFAULT 5)
RETURNS text[] LANGUAGE plpgsql AS $$
DECLARE chosen text[];
BEGIN
 IF p_id IS NULL OR length(p_id)=0 OR length(p_id)>200 OR p_limit IS NULL OR p_limit<1 THEN RAISE EXCEPTION 'invalid admission'; END IF;
 SELECT checkpoint_ids INTO chosen FROM synthetic_audit_dispatch.batch WHERE dispatch_id=p_id;
 IF FOUND THEN RETURN chosen; END IF;
 SELECT coalesce(array_agg(id ORDER BY "createdAt",id),ARRAY[]::text[]) INTO chosen FROM (
  SELECT c.id,c."createdAt" FROM "AuditCheckpoint" c
  WHERE NOT EXISTS(SELECT 1 FROM "AuditTimestamp" t WHERE t."checkpointId"=c.id)
  ORDER BY c."createdAt",c.id LIMIT p_limit
 ) pending;
 INSERT INTO synthetic_audit_dispatch.batch(dispatch_id,checkpoint_ids,batch_limit)
 VALUES(p_id,chosen,p_limit) ON CONFLICT(dispatch_id) DO NOTHING;
 SELECT checkpoint_ids INTO chosen FROM synthetic_audit_dispatch.batch WHERE dispatch_id=p_id;
 RETURN chosen;
END $$;
REVOKE ALL ON FUNCTION synthetic_audit_dispatch.admit(text,integer) FROM PUBLIC;

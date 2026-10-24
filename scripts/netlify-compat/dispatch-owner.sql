-- Prototype execution ownership, not a complete protected write API.
CREATE TABLE synthetic_audit_dispatch.owner (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 dispatch_id text, worker text, generation bigint NOT NULL DEFAULT 0,
 expires_at timestamptz
);
REVOKE ALL ON synthetic_audit_dispatch.owner FROM PUBLIC;
INSERT INTO synthetic_audit_dispatch.owner(singleton) VALUES(true);
CREATE FUNCTION synthetic_audit_dispatch.claim(p_id text,p_worker text)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE acquired bigint;
BEGIN
 IF p_worker IS NULL OR length(p_worker)<1 OR NOT EXISTS(SELECT 1 FROM synthetic_audit_dispatch.batch WHERE dispatch_id=p_id) THEN RAISE EXCEPTION 'invalid worker or dispatch'; END IF;
 PERFORM 1 FROM synthetic_audit_dispatch.owner WHERE singleton FOR UPDATE;
 IF EXISTS(SELECT 1 FROM synthetic_audit_dispatch.batch WHERE dispatch_id=p_id AND finished_at IS NOT NULL) THEN RETURN NULL; END IF;
 UPDATE synthetic_audit_dispatch.owner SET dispatch_id=p_id,worker=p_worker,generation=generation+1,expires_at=clock_timestamp()+interval '16 minutes'
 WHERE singleton AND (worker IS NULL OR expires_at<=clock_timestamp()) RETURNING generation INTO acquired;
 RETURN acquired;
END $$;
REVOKE ALL ON FUNCTION synthetic_audit_dispatch.claim(text,text) FROM PUBLIC;
CREATE FUNCTION synthetic_audit_dispatch.release(p_id text,p_worker text,p_generation bigint)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
 UPDATE synthetic_audit_dispatch.owner SET worker=NULL,dispatch_id=NULL,expires_at=NULL
 WHERE singleton AND dispatch_id=p_id AND worker=p_worker AND generation=p_generation AND expires_at>clock_timestamp();
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION synthetic_audit_dispatch.release(text,text,bigint) FROM PUBLIC;

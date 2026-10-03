"""Offline continuation contracts; no network or actual credentials."""
import importlib.util
import hashlib
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('resume', HERE / 'pr547-every-org-replacement-resume.py')
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)
m = r.m
WORKFLOW = HERE / 'pr547-every-org-replacement-resume-20261003.yml'
if not WORKFLOW.exists():
    WORKFLOW = HERE.parent / 'workflows/pr547-every-org-replacement-resume-20261003.yml'

class ResumeContracts(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {'PHASE2_RESUME_AUTHORIZED':'true', 'GITHUB_SHA':'e'*40, 'GITHUB_RUN_ID':'999'}, clear=True)
        self.env.start()
        self.state = patch.dict(m.STATE, {'cutoverAttempted':False, 'cutoverConfirmed':False, 'phase2Verified':False}, clear=True)
        self.state.start()
        self.network = patch.object(m.http.client, 'HTTPSConnection', side_effect=AssertionError('network forbidden'))
        self.network.start()
    def tearDown(self):
        self.network.stop(); self.state.stop(); self.env.stop()

    def test_receipt_digest_is_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp); data=b'{"ok":true}\n'; (path/'fixture.json').write_bytes(data)
            with patch.object(r, 'PRIOR', path), patch.dict(r.PINNED_RECEIPT_DIGESTS, {'fixture.json':hashlib.sha256(data).hexdigest()}, clear=True):
                self.assertEqual(r.receipt('fixture.json'), {'ok':True})
                (path/'fixture.json').write_bytes(b'{"ok":false}\n')
                with self.assertRaisesRegex(RuntimeError,'prior_receipt_digest_mismatch'):r.receipt('fixture.json')

    def test_origin_receipt_hashes_bind_all_expected_evidence(self):
        self.assertEqual(len(r.PINNED_RECEIPT_DIGESTS),11)
        self.assertTrue(all(len(x)==64 for x in r.PINNED_RECEIPT_DIGESTS.values()))
        self.assertIn('validation-source.json',r.PINNED_RECEIPT_DIGESTS)
        self.assertIn('original-artifact-manifest.json',r.PINNED_RECEIPT_DIGESTS)
        self.assertIn('copied-artifact-manifest.json',r.PINNED_RECEIPT_DIGESTS)

    def exercise(self, fail_at=None):
        from contextlib import ExitStack
        calls=[]
        with ExitStack() as stack:
            for name in ['validation_source','credentials','assert_pr','protection','validate_deployment','alias_read','alias_snapshot','assert_other_aliases','evidence','operation_state']:
                stack.enter_context(patch.object(m,name,side_effect=lambda *a,_name=name,**k:calls.append((_name,a,k))))
            stack.enter_context(patch.object(r,'verify_prior_evidence',side_effect=lambda:calls.append(('prior',(),{}))))
            def verify(host,label):
                calls.append(('verify_host',(host,label),{}))
                if label==fail_at:raise RuntimeError('controlled_probe_failure')
            stack.enter_context(patch.object(m,'verify_host',side_effect=verify))
            def api(path,**kw):
                calls.append(('api',(path,),kw))
                return {'uid':m.ALIAS_UID,'alias':m.ALIAS,'oldDeploymentId':m.BOOTSTRAP_ID}
            stack.enter_context(patch.object(m,'api',side_effect=api))
            stack.enter_context(patch.object(m,'rollback',side_effect=lambda *a:calls.append(('rollback',a,{}))))
            if fail_at:
                with self.assertRaisesRegex(RuntimeError,'controlled_probe_failure'):r.resume()
            else:r.resume()
        return calls

    def test_resume_checks_before_only_alias_write_and_rechecks_both_hosts(self):
        calls=self.exercise()
        writes=[(i,c) for i,c in enumerate(calls) if c[0]=='api' and c[2].get('method')=='POST']
        self.assertEqual(len(writes),1)
        index,write=writes[0]
        self.assertEqual(write[1][0],'/v2/deployments/'+r.DEPLOYMENT_ID+'/aliases')
        self.assertEqual(write[2]['payload'],{'alias':m.ALIAS})
        self.assertLess(next(i for i,c in enumerate(calls) if c[0]=='prior'),index)
        self.assertLess(next(i for i,c in enumerate(calls) if c[0]=='verify_host' and c[1][1]=='immutable-before-cutover'),index)
        self.assertEqual([c[1][1] for c in calls if c[0]=='verify_host'],['immutable-before-cutover','immutable-after-cutover','alias-after-cutover-probes'])
        self.assertEqual(m.STATE['deploymentOriginController'],r.ORIGIN_SHA)
        self.assertEqual(m.STATE['deploymentOriginRun'],r.ORIGIN_RUN)
        self.assertEqual(os.environ['GITHUB_SHA'],'e'*40)
        self.assertEqual(os.environ['GITHUB_RUN_ID'],'999')
        self.assertTrue(m.STATE['phase2Verified'])
        self.assertFalse(m.STATE['newDeploymentCreated'])

    def test_failed_immutable_check_prevents_alias_write(self):
        calls=self.exercise('immutable-before-cutover')
        self.assertFalse(any(c[0]=='api' and c[2].get('method')=='POST' for c in calls))
        self.assertFalse(any(c[0]=='rollback' for c in calls))

    def test_failed_postcheck_invokes_exact_existing_rollback(self):
        calls=self.exercise('alias-after-cutover-probes')
        self.assertEqual([c[1] for c in calls if c[0]=='rollback'],[(r.DEPLOYMENT_ID,)])
        self.assertFalse(m.STATE['phase2Verified'])

    def test_workflow_is_marker_only_first_use_and_no_build_or_deploy(self):
        workflow=WORKFLOW.read_text()
        source=(HERE/'pr547-every-org-replacement-resume.py').read_text()
        self.assertIn('    paths:\n      - '+r.MARKER,workflow)
        self.assertIn('test "$GITHUB_RUN_ATTEMPT" = 1',workflow)
        self.assertIn('git log "$BEFORE_SHA" --format=%H -- "$PHASE2_MARKER"',workflow)
        self.assertIn('cmp -s - "$PHASE2_MARKER"',workflow)
        self.assertIn('artifact-ids: '+str(r.ORIGIN_ARTIFACT),workflow)
        self.assertIn('run-id: '+r.ORIGIN_RUN,workflow)
        self.assertNotIn('npm ',workflow)
        self.assertNotIn('m.deploy(',source)
        self.assertNotIn('subprocess',source)
        self.assertNotIn('os.environ["GITHUB_SHA"] =',source)
        self.assertNotIn('os.environ["GITHUB_RUN_ID"] =',source)
        self.assertIn('m.rollback(DEPLOYMENT_ID)',source)
        self.assertIn('prior_receipt_digest_mismatch',source)

if __name__=='__main__':unittest.main(verbosity=2)

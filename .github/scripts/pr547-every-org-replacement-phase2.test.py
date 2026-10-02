"""Offline safety/unit/source contracts. No real credentials or network requests."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
SCRIPT = HERE / 'phase2.py'
if not SCRIPT.exists():
    SCRIPT = HERE / 'pr547-every-org-replacement-phase2.py'
spec = importlib.util.spec_from_file_location('phase2', SCRIPT)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
WORKFLOW = HERE / 'workflow.yml'
if not WORKFLOW.exists():
    WORKFLOW = HERE.parent / 'workflows/pr547-every-org-replacement-phase2-20261002.yml'
GUARD = HERE / 'build_guard.py'
if not GUARD.exists():
    GUARD = HERE / 'pr547-every-org-replacement-build-guard.py'


def env():
    values = {name: 'dummy-only-' + name.lower().replace('_', '-') for name in m.SECRET_NAMES}
    values['EVERY_ORG_STAGING_VERCEL_BYPASS_SECRET'] = 'A' * 32
    values['GITHUB_SHA'] = 'a' * 40
    values['GITHUB_RUN_ID'] = '123'
    return values


def alias(target=None):
    return {'alias': m.ALIAS, 'uid': m.ALIAS_UID, 'projectId': m.PROJECT,
            'deploymentId': target or m.BOOTSTRAP_ID}


def deployment(id='dpl_New', host='new.vercel.app', **updates):
    value = {'id': id, 'url': host, 'projectId': m.PROJECT, 'readyState': 'READY', 'target': None,
             'meta': {'moralTradeCandidateSha': m.APP_SHA, 'moralTradeCandidateTree': m.APP_TREE,
                      'moralTradeExpectedPrHead': m.PR_HEAD, 'moralTradePurpose': m.PURPOSE,
                      'moralTradeControllerSha': 'a' * 40, 'moralTradeWorkflowRunId': '123', 'moralTradeBuildArtifactSha256': 'b' * 64}}
    value.update(updates)
    return value


class Phase2Contracts(unittest.TestCase):
    def setUp(self):
        self.environ = patch.dict(os.environ, env(), clear=True)
        self.environ.start()
        self.state = patch.dict(m.STATE, {'artifactDigest': 'b' * 64}, clear=True)
        self.state.start()
        # Every test fails closed if it unexpectedly attempts real network access.
        self.network = patch.object(m.http.client, 'HTTPSConnection', side_effect=AssertionError('network forbidden in tests'))
        self.network.start()

    def tearDown(self):
        self.network.stop()
        self.state.stop()
        self.environ.stop()

    def test_distinct_credentials_pass(self):
        m.credentials()

    def test_equal_directional_credentials_fail(self):
        os.environ[m.PAIR[1]] = os.environ[m.PAIR[0]]
        with self.assertRaisesRegex(RuntimeError, 'distinct'):
            m.credentials()

    def test_pair_may_not_equal_other_credentials(self):
        os.environ[m.PAIR[0]] = os.environ['QA_SUPABASE_SERVICE_ROLE_KEY']
        with self.assertRaisesRegex(RuntimeError, 'distinct'):
            m.credentials()

    def test_bad_bypass_and_line_break_fail(self):
        for name, value in [('EVERY_ORG_STAGING_VERCEL_BYPASS_SECRET', 'invalid'),
                            (m.PAIR[1], 'line\nbreak'), (m.PAIR[0], ' leading')]:
            with self.subTest(name=name), patch.dict(os.environ, {name: value}):
                with self.assertRaises(RuntimeError):
                    m.credentials()

    def test_alias_checks_uid_project_target_and_redirect(self):
        m.validate_alias(alias(), m.BOOTSTRAP_ID)
        for key, value in [('uid', 'different'), ('projectId', 'wrong'), ('alias', 'other.vercel.app'),
                            ('deploymentId', 'dpl_Unexpected'), ('redirect', 'https://elsewhere')]:
            with self.subTest(key=key):
                item = alias(); item[key] = value
                with self.assertRaises(RuntimeError):
                    m.validate_alias(item, m.BOOTSTRAP_ID)

    def test_new_deployment_checks_all_provenance(self):
        m.validate_deployment(deployment(), 'dpl_New', 'new.vercel.app')
        for field in ('moralTradeCandidateSha', 'moralTradeCandidateTree', 'moralTradeExpectedPrHead',
                      'moralTradePurpose', 'moralTradeControllerSha', 'moralTradeWorkflowRunId', 'moralTradeBuildArtifactSha256'):
            value = deployment(); value['meta'][field] = 'wrong'
            with self.subTest(field=field), self.assertRaises(RuntimeError):
                m.validate_deployment(value, 'dpl_New', 'new.vercel.app')

    def test_production_deployment_always_fails(self):
        with self.assertRaisesRegex(RuntimeError, 'not_preview'):
            m.validate_deployment(deployment(target='production'), 'dpl_New', 'new.vercel.app')

    def test_generic_app_401_is_not_vercel_protection(self):
        headers = {'server': 'Vercel', 'x-vercel-id': 'test', 'content-type': 'application/json'}
        self.assertFalse(m.vercel_intercepted(401, headers, b'{"ok":false}'))
        self.assertTrue(m.vercel_intercepted(401, headers, b'Authentication Required'))
        self.assertFalse(m.vercel_intercepted(200, headers, b'Authentication Required'))

    def test_protection_redirect_is_observed_not_followed(self):
        headers = {'server': 'Vercel', 'x-vercel-id': 'test', 'location': 'https://vercel.com/sso-api?x=y'}
        self.assertTrue(m.vercel_intercepted(307, headers, b''))
        headers['location'] = 'https://evil.example/sso-api'
        self.assertFalse(m.vercel_intercepted(307, headers, b''))

    def test_exact_post_and_page_each_have_no_and_invalid_bypass(self):
        with patch.object(m, 'request', return_value=(401, {'server': 'Vercel', 'x-vercel-id': 'test'}, b'Authentication Required')) as req:
            result = m.host_protection(m.ALIAS)
        self.assertEqual(len(result), 4)
        self.assertEqual([x[1]['method'] for x in req.call_args_list], ['POST', 'POST', 'GET', 'GET'])
        self.assertIn(m.ROUTE, req.call_args_list[0].args[0])
        self.assertNotIn('?', req.call_args_list[0].args[0])
        self.assertIn('deliberately-invalid', req.call_args_list[1].args[0])

    def test_query_bypass_no_cookie_or_header_substitution(self):
        value = m.callback_url(m.ALIAS)
        self.assertEqual(m.urllib.parse.parse_qs(m.urllib.parse.urlsplit(value).query),
                         {'x-vercel-protection-bypass': ['A' * 32]})

    def test_correct_auth_requires_exact_400_invalid_json(self):
        for code, body in [(422, b'{"ok":false,"error":"invalid_json"}'),
                           (400, b'{"ok":false}'), (401, b'{"ok":false}')]:
            with patch.object(m, 'request', return_value=(code, {'content-type': 'application/json'}, body)):
                with self.assertRaises(RuntimeError):
                    m.probe_json(m.ALIAS, 'correct-invalid-json', [], 400, {'ok': False, 'error': 'invalid_json'})

    def test_auth_matrix_uses_only_malformed_and_empty_payloads(self):
        def response(url, **kw):
            fields = [v for k, v in kw['headers'] if k.lower() == 'authorization']
            header = 'Bearer ' + os.environ[m.PAIR[1]]
            if len(fields) == 2:
                return 400, {'server': 'Vercel', 'x-vercel-id': 'test', 'content-type': 'text/plain'}, b'Bad request'
            if fields == [header] and m.ROUTE in url:
                error = 'invalid_json' if kw['body'] == b'not-json' else 'missing_partner_donation_id'
                return 400, {'content-type': 'application/json'}, json.dumps({'ok': False, 'error': error}).encode()
            return 401, {'content-type': 'application/json'}, b'{"ok":false}'
        with patch.object(m, 'request', side_effect=response) as req:
            results = m.auth_matrix(m.ALIAS)
        self.assertEqual(len(results), 11)
        self.assertTrue(any(x['case'] == 'public-token-as-bearer' and x['status'] == 401 for x in results))
        self.assertTrue(any(x['case'] == 'duplicate-authorization-fields' and x['transportRejected'] for x in results))
        self.assertTrue(all(c.kwargs['body'] in (b'not-json', b'{}') for c in req.call_args_list))
        self.assertTrue(all(not any(k.lower() == 'cookie' for k, _ in c.kwargs['headers']) for c in req.call_args_list))

    def test_duplicate_app_400_is_never_counted_as_transport_rejection(self):
        generic = (401, {'content-type': 'application/json'}, b'{"ok":false}')
        duplicate = (400, {'server': 'Vercel', 'x-vercel-id': 'test', 'content-type': 'application/json'}, b'{"ok":false,"error":"invalid_json"}')
        with patch.object(m, 'request', side_effect=[generic] * 7 + [duplicate]):
            with self.assertRaisesRegex(RuntimeError, 'duplicate_not_transport'):
                m.auth_matrix(m.ALIAS)

    def test_duplicate_mixed_case_json_400_is_not_transport_rejection(self):
        generic = (401, {'content-type': 'application/json'}, b'{"ok":false}')
        duplicate = (400, {'server': 'Vercel', 'x-vercel-id': 'test', 'content-type': 'APPLICATION/JSON'}, b'{"ok":false,"error":"invalid_json"}')
        with patch.object(m, 'request', side_effect=[generic] * 7 + [duplicate]):
            with self.assertRaisesRegex(RuntimeError, 'duplicate_not_transport'):
                m.auth_matrix(m.ALIAS)

    def test_database_counts_are_read_only_head_and_exact(self):
        with patch.object(m, 'request', return_value=(206, {'content-range': '0-0/12'}, b'')) as req:
            self.assertEqual(m.counts(), dict.fromkeys(m.TABLES, 12))
        self.assertEqual(req.call_count, 5)
        self.assertTrue(all(c.kwargs['method'] == 'HEAD' for c in req.call_args_list))
        self.assertTrue(all(c.kwargs['headers']['Prefer'] == 'count=exact' for c in req.call_args_list))
        self.assertTrue(all(c.kwargs['headers']['Range-Unit'] == 'items' for c in req.call_args_list))

    def test_runtime_readiness_uses_no_provider_query_or_private_auth(self):
        replies = [(200, {'content-type': 'text/html'}, b'<h1>Move part or all of a planned donation, then add to it.</h1>'),
                   (200, {'content-type': 'application/json'}, b'{"results":[]}')]
        with patch.object(m, 'request', side_effect=replies) as req:
            value = m.runtime_readiness(m.ALIAS)
        self.assertFalse(value['providerSearchRequestSent'])
        self.assertEqual(req.call_count, 2)
        self.assertTrue(all(not c.kwargs for c in req.call_args_list))
        self.assertNotIn('q=', req.call_args_list[1].args[0])

    def test_fail_closed_rendered_page_blocks_release(self):
        with patch.object(m, 'request', return_value=(200, {'content-type': 'text/html'},
                         b'Move part or all of a planned donation, then add to it. The direct Donation Upgrade rail is fail-closed.')):
            with self.assertRaisesRegex(RuntimeError, 'staging_runtime_not_ready'):
                m.runtime_readiness(m.ALIAS)

    def test_unknown_or_missing_count_fails(self):
        with patch.object(m, 'request', return_value=(200, {'content-range': '0-0/*'}, b'')):
            with self.assertRaisesRegex(RuntimeError, 'exact_count_missing'):
                m.counts()

    def test_failed_probe_still_gets_count_readback(self):
        with patch.object(m, 'counts', return_value={'table': 2}) as counts, \
             patch.object(m, 'host_protection', side_effect=RuntimeError('probe failed')), patch.object(m, 'evidence') as evidence:
            with self.assertRaisesRegex(RuntimeError, 'probe failed'):
                m.verify_host(m.ALIAS, 'test')
        self.assertEqual(counts.call_count, 2)
        self.assertIn('do not prove zero writes', evidence.call_args.args[1]['cardinalityLimitation'])

    def test_count_change_fails(self):
        with patch.object(m, 'counts', side_effect=[{'table': 2}, {'table': 3}]), \
             patch.object(m, 'host_protection', return_value=[]), patch.object(m, 'auth_matrix', return_value=[]), patch.object(m, 'runtime_readiness', return_value={}), \
             patch.object(m, 'evidence'):
            with self.assertRaisesRegex(RuntimeError, 'cardinality_changed'):
                m.verify_host(m.ALIAS, 'test')

    def test_secret_scan_never_emits_raw_or_encoded_secret(self):
        for name in m.SECRET_NAMES:
            with self.subTest(name=name), self.assertRaisesRegex(RuntimeError, '^secret_in_output$'):
                m.no_secret(('value=' + os.environ[name]).encode())
        with self.assertRaisesRegex(RuntimeError, '^secret_in_output$'):
            m.no_secret(m.base64.b64encode(os.environ[m.PAIR[1]].encode()))

    def test_runtime_env_is_staging_with_directional_pair(self):
        value = m.runtime_env()
        self.assertEqual(value['EVERY_ORG_ENVIRONMENT'], 'staging')
        self.assertEqual(value['DIRECT_DONATION_UPGRADE_MODE'], 'staging')
        self.assertEqual(value['EVERY_ORG_DONATE_LINK_WEBHOOK_TOKEN'], os.environ[m.PAIR[0]])
        self.assertEqual(value['EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_TOKEN'], os.environ[m.PAIR[1]])
        self.assertNotIn('VERCEL_TOKEN', value)
        self.assertNotIn('EVERY_ORG_STAGING_VERCEL_BYPASS_SECRET', value)
        self.assertEqual(value['CONDITIONAL_PAYMENTS_MODE'], 'disabled')

    def test_cli_env_does_not_inherit_any_credential(self):
        child = m.minimal_cli_env()
        self.assertTrue(all(name not in child for name in m.SECRET_NAMES))
        self.assertEqual(child['VERCEL_TELEMETRY_DISABLED'], '1')

    def test_rollback_refuses_unexpected_uid_target_or_project(self):
        for field, value in [('uid', 'other'), ('deploymentId', 'dpl_Unexpected'), ('projectId', 'other')]:
            current = alias('dpl_New'); current[field] = value
            with patch.object(m, 'api', return_value=current) as api:
                with self.assertRaises(RuntimeError):
                    m.rollback('dpl_New')
                self.assertEqual(api.call_count, 1)
                self.assertNotIn('method', api.call_args.kwargs)

    def test_rollback_already_at_bootstrap_makes_no_write(self):
        with patch.object(m, 'api', return_value=alias()) as api:
            m.rollback('dpl_New')
        self.assertEqual(api.call_count, 1)
        self.assertTrue(m.STATE['aliasAlreadyAtBootstrap'])

    def test_rollback_exact_new_target_is_single_write_then_readbacks(self):
        m.STATE['deploymentHost'] = 'new.vercel.app'
        calls = []
        def api(path, **kw):
            calls.append((path, kw))
            if kw.get('method') == 'POST':
                return {'uid': m.ALIAS_UID, 'alias': m.ALIAS, 'oldDeploymentId': 'dpl_New'}
            if path.startswith('/v4/aliases/'):
                return alias('dpl_New') if len(calls) == 1 else alias()
            if m.BOOTSTRAP_ID in path:
                return deployment(m.BOOTSTRAP_ID, m.BOOTSTRAP_HOST)
            return deployment()
        with patch.object(m, 'api', side_effect=api), patch.object(m, 'operation_state'), \
             patch.object(m, 'host_protection'), patch.object(m, 'bootstrap_probes'):
            m.rollback('dpl_New')
        self.assertEqual(sum(kw.get('method') == 'POST' for _, kw in calls), 1)
        self.assertTrue(m.STATE['rollbackConfirmed'])

    def test_uncertain_rollback_write_is_not_retried(self):
        m.STATE['deploymentHost'] = 'new.vercel.app'
        with patch.object(m, 'api', side_effect=[alias('dpl_New'), deployment(), deployment(m.BOOTSTRAP_ID, m.BOOTSTRAP_HOST), RuntimeError('network_request_failed')]) as api, patch.object(m, 'operation_state'):
            with self.assertRaisesRegex(RuntimeError, 'network_request_failed'):
                m.rollback('dpl_New')
        self.assertEqual(api.call_count, 4)
        self.assertFalse(m.STATE.get('rollbackConfirmed', False))

    def test_alias_inventory_requires_other_existing_aliases_unchanged(self):
        before = {'old.vercel.app': {'uid': 'old', 'deploymentId': 'dpl_Old'}, m.ALIAS: {'uid': m.ALIAS_UID, 'deploymentId': m.BOOTSTRAP_ID}}
        after = {**before, m.ALIAS: {'uid': m.ALIAS_UID, 'deploymentId': 'dpl_New'}}
        with patch.object(m, 'alias_snapshot', return_value=after):
            m.assert_other_aliases(before)
        after['old.vercel.app'] = {'uid': 'old', 'deploymentId': 'dpl_Wrong'}
        with patch.object(m, 'alias_snapshot', return_value=after), self.assertRaisesRegex(RuntimeError, 'other_alias_changed'):
            m.assert_other_aliases(before)

    def test_unexpected_new_alias_fails_inventory_gate(self):
        before = {m.ALIAS: {'uid': m.ALIAS_UID, 'deploymentId': m.BOOTSTRAP_ID}}
        after = {**before, 'unapproved.vercel.app': {'uid': 'new', 'deploymentId': 'dpl_New'}}
        with patch.object(m, 'alias_snapshot', return_value=after), self.assertRaisesRegex(RuntimeError, 'unexpected_new_alias'):
            m.assert_other_aliases(before)

    def test_standalone_rejects_external_symlink(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp, 'output'); root.mkdir()
            outside = Path(tmp, 'outside'); outside.write_text('not uploaded')
            (root / 'escape').symlink_to(outside)
            with self.assertRaisesRegex(RuntimeError, 'escapes_output'):
                m.standalone_tree(root)

    def test_standalone_rejects_symlinked_root(self):
        with tempfile.TemporaryDirectory() as tmp:
            outside = Path(tmp, 'outside'); outside.mkdir()
            root = Path(tmp, 'output'); root.symlink_to(outside)
            with self.assertRaisesRegex(RuntimeError, 'root_symlink'):
                m.standalone_tree(root)

    def test_upload_project_link_rejects_wrong_project_or_team_before_write(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp, 'project.json')
            good = {'orgId': m.TEAM, 'projectId': m.PROJECT, 'projectName': 'moraltrade-site',
                    'settings': {'framework': 'nextjs', 'devCommand': None, 'installCommand': 'npm ci',
                                 'buildCommand': 'npm run build', 'directoryListing': False, 'rootDirectory': None,
                                 'nodeVersion': '24.x', 'createdAt': 1, 'outputDirectory': None}}
            path.write_text(json.dumps(good))
            m.validate_project_link(path)
            for field in ('orgId', 'projectId'):
                path.write_text(json.dumps({**good, field: 'wrong'}))
                with self.subTest(field=field), self.assertRaises(RuntimeError):
                    m.validate_project_link(path)

    def test_upload_project_link_rejects_unreviewed_root_settings_or_extra_fields(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp, 'project.json')
            good = {'orgId': m.TEAM, 'projectId': m.PROJECT, 'projectName': 'moraltrade-site',
                    'settings': {'framework': 'nextjs', 'devCommand': None, 'installCommand': 'npm ci',
                                 'buildCommand': 'npm run build', 'directoryListing': False, 'rootDirectory': None,
                                 'nodeVersion': '24.x', 'createdAt': 1, 'outputDirectory': None}}
            for settings in ({**good['settings'], 'rootDirectory': '/elsewhere'},
                             {**good['settings'], 'buildCommand': 'unreviewed'},
                             {**good['settings'], 'extra': 'unreviewed'}):
                path.write_text(json.dumps({**good, 'settings': settings}))
                with self.assertRaises(RuntimeError):
                    m.validate_project_link(path)
            path.write_text(json.dumps({**good, 'env': {}}))
            with self.assertRaises(RuntimeError):
                m.validate_project_link(path)

    def test_vetted_cli_version_path_and_digest_all_required(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp, 'every-org-vercel-cli/node_modules/vercel')
            (root / 'dist').mkdir(parents=True)
            cli = root / 'dist/vc.js'; cli.write_text('vetted fixture only')
            (root / 'package.json').write_text(json.dumps({'name': 'vercel', 'version': '50.38.1'}))
            with patch.dict(os.environ, {'RUNNER_TEMP': tmp, 'PHASE2_VERCEL_CLI': str(cli),
                            'PHASE2_VERCEL_CLI_SHA256': m.hashlib.sha256(cli.read_bytes()).hexdigest()}):
                self.assertEqual(m.validated_cli(), str(cli))
                cli.write_text('changed')
                with self.assertRaisesRegex(RuntimeError, 'executable_drift'):
                    m.validated_cli()

    def test_standalone_accepts_internal_relative_symlink(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'data').write_text('safe')
            (root / 'alias').symlink_to('data')
            m.standalone_tree(root)

    def test_standalone_rejects_external_file_path_map(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / '.vc-config.json').write_text(json.dumps({'filePathMap': {'index.js': '../../../private'}}))
            with self.assertRaisesRegex(RuntimeError, 'file_map_'):
                m.standalone_tree(root)

    def test_standalone_allows_only_file_map_values_inside_output_root(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp, '.vercel/output'); root.mkdir(parents=True)
            (root / 'internal.js').write_text('safe')
            config = root / '.vc-config.json'
            config.write_text(json.dumps({'filePathMap': {'index.js': '.vercel/output/internal.js'}}))
            m.standalone_tree(root)
            Path(tmp, 'outside.js').write_text('not uploaded')
            config.write_text(json.dumps({'filePathMap': {'index.js': 'outside.js'}}))
            with self.assertRaisesRegex(RuntimeError, 'escapes_output'):
                m.standalone_tree(root)

    def test_standalone_rejects_credential_placeholder_or_disabled_runtime_shadow(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for environment in ({'EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_TOKEN': ''},
                                {'DIRECT_DONATION_UPGRADES_ENABLED': 'false'},
                                {'DIRECT_DONATION_UPGRADE_MODE': 'disabled'}):
                (root / '.vc-config.json').write_text(json.dumps({'environment': environment}))
                with self.subTest(environment=environment), self.assertRaises(RuntimeError):
                    m.standalone_tree(root)

    def test_standalone_scans_actual_upload_bytes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'client.js').write_text(os.environ[m.PAIR[0]])
            with self.assertRaisesRegex(RuntimeError, 'secret_in_output'):
                m.standalone_tree(root)

    def test_artifact_manifest_binds_contents_paths_links_modes_and_identity(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'file.js').write_text('safe')
            (root / 'link').symlink_to('file.js')
            first = m.artifact_manifest(root)
            self.assertEqual(first['acceptedAppSha'], m.APP_SHA)
            self.assertEqual(first['controllerCommit'], 'a' * 40)
            self.assertEqual(first['runId'], '123')
            self.assertEqual(first['entries'][1]['target'], 'file.js')
            (root / 'file.js').write_text('changed')
            self.assertNotEqual(m.artifact_manifest(root)['sha256'], first['sha256'])

    def test_request_rejects_unapproved_host_or_cookie_before_network(self):
        for url, headers in [('https://evil.example', []),
                              ('https://' + m.ALIAS, [('Cookie', 'anything')]),
                              ('https://' + m.ALIAS, [('x-vercel-set-bypass-cookie', 'true')])]:
            with self.subTest(url=url, headers=headers), self.assertRaises(RuntimeError):
                m.request(url, headers=headers)

    def test_source_release_order_and_no_production_flags(self):
        source = SCRIPT.read_text()
        release = source.split('def release():', 1)[1].split('def operation_state():', 1)[0]
        self.assertLess(release.index('verify_host(host, "immutable-before-cutover")'), release.index('method="POST"'))
        self.assertLess(release.index('before = alias_read(BOOTSTRAP_ID)'), release.index('method="POST"'))
        self.assertIn('verify_host(host, "immutable-after-cutover")', release)
        self.assertIn('verify_host(ALIAS, "alias-after-cutover-probes")', release)
        self.assertIn('rollback(deployment_id)', release)
        self.assertIn('"--prebuilt"', source)
        self.assertNotIn('"--prod"', source)
        self.assertNotIn('"--skip-domain"', source)
        self.assertNotIn('"--build-env"', source)
        self.assertNotIn('method="DELETE"', source)
        self.assertNotIn('method="PATCH"', source)
        deploy = source.split('def deploy():', 1)[1].split('def rollback(', 1)[0]
        self.assertNotIn('npx', deploy)
        self.assertNotIn('npm', deploy)
        self.assertIn('validated_cli()', deploy)
        self.assertLess(deploy.index('validate_project_link(upload'), deploy.index('STATE["deploymentAttempted"] = True'))

    def test_workflow_marker_only_first_add_first_attempt(self):
        source = WORKFLOW.read_text()
        for text in ['test "$GITHUB_RUN_ATTEMPT" = 1', 'git rev-parse HEAD^',
                     'git log "$BEFORE_SHA" --format=%H -- "$PHASE2_MARKER"',
                     "git diff --name-status", 'cmp -s - "$PHASE2_MARKER"',
                     'owner_saved_replacement_pair_and_approved_phase2=yes',
                     "if: needs.control.outputs.authorized == 'true'", 'persist-credentials: false']:
            self.assertIn(text, source)
        self.assertNotIn('workflow_dispatch:', source)
        self.assertNotIn('pull_request:', source)

    def test_workflow_secrets_are_not_job_level_or_in_app_gate_commands(self):
        source = WORKFLOW.read_text()
        job_env = source.split('  build_deploy_verify:', 1)[1].split('    steps:', 1)[0]
        self.assertNotIn('secrets.', job_env)
        gates = source.split('      - name: Run credential-free', 1)[1].split('      - name: Scan final', 1)[0]
        self.assertNotIn('STAGING_PARTNER_WEBHOOK_AUTHORIZATION_TOKEN', gates)
        self.assertNotIn('STAGING_DONATE_LINK_WEBHOOK_TOKEN', gates)
        self.assertNotIn('secrets.VERCEL_TOKEN', gates)
        self.assertIn('npm test', gates)
        self.assertIn('npm run build', gates)
        self.assertIn('build --target=preview --standalone', gates)
        self.assertIn('npx tsc --noEmit', gates)
        self.assertIn('npm run lint -- --quiet', gates)
        self.assertIn('if: always() && steps.sanitize.outcome', source)

    def test_artifact_upload_excludes_raw_logs_and_build_output(self):
        source = WORKFLOW.read_text()
        self.assertIn('path: evidence/*.json', source)
        self.assertNotIn('tee ', source)
        self.assertNotIn('path: app/', source.split('uses: actions/upload-artifact@v4', 1)[1])
        self.assertNotIn('set -x', source)

    def test_build_guard_rejects_credentials_and_accepts_two_modes(self):
        common = {'PATH': os.defpath, 'DIRECT_DONATION_UPGRADES_ENABLED': 'false',
                  'DIRECT_DONATION_UPGRADE_MODE': 'disabled', 'DIRECT_DONATION_UPGRADE_QA_FIXTURES': 'false',
                  'EVERY_ORG_PLEDGE_DONATIONS_ENABLED': 'false', 'CONDITIONAL_PAYMENTS_MODE': 'disabled',
                  'TRADE_DONATION_POOL_ENABLED': 'false', 'TRADE_DONATION_POOL_MODE': 'disabled',
                  'VERCEL_ENV': 'preview', 'VERCEL_TARGET_ENV': 'preview'}
        with tempfile.TemporaryDirectory() as temp:
            result = subprocess.run(['python3', str(GUARD)], cwd=temp, env=common, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            for name in (m.PAIR[0], m.PAIR[1], 'VERCEL_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY'):
                result = subprocess.run(['python3', str(GUARD)], cwd=temp, env={**common, name: 'secret'}, capture_output=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertNotIn(b'secret', result.stderr)
            staging = {**common, 'DIRECT_DONATION_UPGRADES_ENABLED': 'true', 'DIRECT_DONATION_UPGRADE_MODE': 'staging'}
            result = subprocess.run(['python3', str(GUARD), 'staging-preview'], cwd=temp, env=staging, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            Path(temp, '.env.local').write_text('PRIVATE=secret')
            result = subprocess.run(['python3', str(GUARD)], cwd=temp, env=common, capture_output=True)
            self.assertNotEqual(result.returncode, 0)


if __name__ == '__main__':
    unittest.main(verbosity=2)

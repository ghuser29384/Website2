import base64
import hashlib
import lzma
import pathlib
import subprocess

controller = pathlib.Path('../controller/.github')
encoded = ''.join((controller / f'audit-remediation.part{i}.b64').read_text().strip() for i in (1, 2))
patch = lzma.decompress(base64.b64decode(encoded, validate=True))
expected_patch = 'a73844fe81f018e09208e2dcc395c886f364a749ad37be3189ac4018bfe5dfc4'
assert hashlib.sha256(patch).hexdigest() == expected_patch, 'Patch checksum mismatch'
evidence = pathlib.Path('../evidence')
evidence.mkdir(exist_ok=True)
(evidence / 'remediation.patch').write_bytes(patch)
subprocess.run(['git', 'apply', '--check', '--unidiff-zero', '../evidence/remediation.patch'], check=True)
subprocess.run(['git', 'apply', '--unidiff-zero', '../evidence/remediation.patch'], check=True)
allowed = '''playwright.audit.config.ts
public/moral-trade-account-identity.js
public/moral-trade-create/index.html
public/moral-trade-live-account.js
public/moral-trade-live-now.js
public/moral-trade-live-route-recommendations.js
public/moral-trade-live.html
scripts/audit-remediation-fixture.mjs
scripts/auth-resolution-supabase.mjs
src/app/commitments/commitments-redesign.module.css
src/app/commitments/loading.module.css
src/app/commitments/loading.tsx
src/app/commitments/page.tsx
src/app/donation-offsets/conditional/deadline-field.tsx
src/app/mpgf/pools/page.tsx
src/app/offers/offers-density.module.css
src/app/offers/page.tsx
src/app/pools/page.tsx
src/commitments-portfolio-wiring.test.ts
src/components/commitments/commitment-summary-icon.tsx
src/components/commitments/commitments-local-greeting.tsx
src/components/dashboard/background-account-security-panel.tsx
src/components/dashboard/background-local-drafts-panel.tsx
src/components/donation-offsets/donation-redirect-impact-flow.tsx
src/components/marketplace/marketplace-components.tsx
src/components/marketplace/participant-offer-group.tsx
src/components/mpgf/mpgf-contribution-controls.tsx
src/components/ui/local-date-time.tsx
src/lib/audit-remediation.test.ts
src/lib/background-explanations.ts
src/lib/commitments-offer-data.test.ts
src/lib/commitments-portfolio.ts
src/lib/commitments-summary.ts
src/lib/interface-locale.ts
src/lib/moral-trade/reasoning-packets.ts
src/lib/offer-discovery-facts.ts
src/lib/offers-directory-layout.test.ts
src/lib/public-route-smoke.test.ts
src/lib/smart-query-records.ts
src/live-account-data.test.ts
tests/audit-remediation.auth.ts
tests/home-bootstrap-resilience.spec.ts
tests/offers-density.spec.ts'''.splitlines()
changed = subprocess.check_output(['git', 'diff', '--name-only'], text=True).splitlines()
untracked = subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard'], text=True).splitlines()
assert sorted(set(changed + untracked)) == sorted(allowed), 'Unexpected changed-file set'
manifest = '\n'.join(path + ' ' + hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest() for path in sorted(allowed)) + '\n'
assert hashlib.sha256(manifest.encode()).hexdigest() == '9640586c0e6f963adcffa4707f2ca4040c44a14b4c9754020559e4f1152cea8f', 'Applied file bytes differ from the locally tested candidate'
(evidence / 'source-manifest.txt').write_text(manifest)
subprocess.run(['git', 'add', '--', *allowed], check=True)
subprocess.run(['git', 'diff', '--cached', '--check'], check=True)
# Git abbreviates blob IDs based on repository object count. The explicit
# per-file SHA-256 manifest above proves bytes without comparing that formatting.
print('Verified 43 exact file contents against the reviewed source manifest.')

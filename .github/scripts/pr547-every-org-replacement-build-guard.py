"""No network: fail closed if any private credential reaches app build/test work."""
import json
import os
import sys
from pathlib import Path

# Next/Vercel/NPM may read local dotenv or npmrc files independently of env vars.
ALLOWED_ENV_FILE = Path('.vercel/.env.preview.local')
for path in Path('.').rglob('.env*'):
    if any(part in ('node_modules', '.git', '.next', 'output') for part in path.parts):
        continue
    if path.name in ('.env.example', '.env.sample', '.env.template'):
        continue
    if path == ALLOWED_ENV_FILE and path.read_text() == '# Deliberately no project credentials\n':
        continue
    raise SystemExit('Unreviewed environment file present; file contents suppressed')
for name, value in os.environ.items():
    if not value:
        continue
    forbidden = (name in ('GH_TOKEN', 'GITHUB_TOKEN', 'VERCEL_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY', 'CRON_SECRET')
                 or name.startswith(('EVERY_ORG_STAGING_', 'QA_SUPABASE_SERVICE_', 'STRIPE_', 'RESEND_'))
                 or name in ('EVERY_ORG_PUBLIC_API_KEY', 'EVERY_ORG_DONATE_LINK_WEBHOOK_TOKEN',
                             'EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_TOKEN', 'EVERY_ORG_PARTNER_METADATA_SECRET',
                             'EVERY_ORG_WEBHOOK_TOKEN', 'MPGF_EVERY_ORG_PUBLIC_WEBHOOK_TOKEN',
                             'MPGF_EVERY_ORG_WEBHOOK_SHARED_SECRET'))
    if forbidden:
        raise SystemExit('Unexpected application credential in test/build environment; value suppressed')
mode = sys.argv[1] if len(sys.argv) == 2 else "disabled"
if mode not in ("disabled", "staging-preview"):
    raise SystemExit("Invalid build mode")
for name, expected in {
    'DIRECT_DONATION_UPGRADES_ENABLED': 'true' if mode == 'staging-preview' else 'false',
    'DIRECT_DONATION_UPGRADE_MODE': 'staging' if mode == 'staging-preview' else 'disabled',
    'DIRECT_DONATION_UPGRADE_QA_FIXTURES': 'false', 'EVERY_ORG_PLEDGE_DONATIONS_ENABLED': 'false',
    'CONDITIONAL_PAYMENTS_MODE': 'disabled', 'TRADE_DONATION_POOL_ENABLED': 'false',
    'TRADE_DONATION_POOL_MODE': 'disabled', 'VERCEL_ENV': 'preview', 'VERCEL_TARGET_ENV': 'preview',
}.items():
    if os.environ.get(name) != expected:
        raise SystemExit('Disabled-money Preview environment contract failed')
project = Path('.vercel/project.json')
if project.exists():
    data = json.loads(project.read_text())
    if data.get('projectId') != 'prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7' or data.get('orgId') != 'team_ySu6sF3Uho1E1GnJtCQPVEuJ':
        raise SystemExit('Project link identity drift')
print('Credential-free environment and money-rail boundaries verified')

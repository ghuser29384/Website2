from pathlib import Path
import re
import subprocess
import textwrap

expected = {
    'src/lib/app-data.ts': 'd4d5a4a20bc3afadc6c520ec06b443e40f681540',
    'src/app/dashboard/page.tsx': 'cda0274edeb6b78e5877bdb40df2731d7d0a9053',
}
for path, sha in expected.items():
    actual = subprocess.check_output(['git', 'hash-object', path], text=True).strip()
    if actual != sha:
        raise SystemExit(f'Refusing to change unexpected source at {path}: {actual}')

path = Path('src/lib/app-data.ts')
source = path.read_text()
start = source.index('  let agreements: AgreementRecord[] = [];', source.index('export async function getDashboardData('))
end = source.index('\n  return {\n    offers: hydratedOwnOffers,', start)
region = source[start:end]
policy_ids = '''  const collectivePolicyIds = [
    ...new Set([
      ...collectives.map((collective) => collective.id),
      ...collectiveMemberships.map((membership) => membership.collective_id),
    ]),
  ];
'''
assert region.count(policy_ids) == 1
region = region.replace(policy_ids, '')
pattern = re.compile(r'^(  let (\w+):[^\n]+;\n)(  try \{\n.*?^  \}\n?)', re.M | re.S)
blocks = list(pattern.finditer(region))
assert not pattern.sub('', region).strip(), 'Unrecognized code in the section-loader region'
assert len(blocks) == 42, f'Expected 42 section loaders, found {len(blocks)}'
names = [match[2] for match in blocks]
assert len(set(names)) == 42
assert 'matchSuggestions' in names and 'collectives' in names and 'collectiveMemberships' in names

def tasks(selected):
    return '\n'.join('    async () => {\n' + textwrap.indent(match[3].rstrip(), '    ') + '\n    },' for match in selected)

dependent = {'wishNotifications', 'collectivePolicies'}
replacement = ''.join(match[1] for match in blocks)
replacement += '\n  // Load independent sections concurrently without flooding the database.\n'
replacement += '  // Each loader retains its own fallback, error key, and authorization checks.\n'
replacement += '  await runDashboardLoaders([\n' + tasks([m for m in blocks if m[2] not in dependent]) + '\n  ]);\n\n'
replacement += '  // These reads need the matches or collective memberships loaded above.\n'
replacement += policy_ids
replacement += '  await runDashboardLoaders([\n' + tasks([m for m in blocks if m[2] in dependent]) + '\n  ]);\n'
source = source[:start] + replacement + source[end:]
anchor = 'import { cache } from "react";\n'
assert source.count(anchor) == 1
source = source.replace(anchor, anchor + '\nimport { runDashboardLoaders } from "@/lib/dashboard-loading";\n', 1)
path.write_text(source)

path = Path('src/app/dashboard/page.tsx')
source = path.read_text()
old = '''  const dashboardData = viewer ? await getDashboardData(viewer.authUser.id) : null;
  const accountSecuritySummary = viewer ? await loadBackgroundAccountSecuritySummary() : null;
  const priorityFundSummary =
    viewer && supabaseReady && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? await getPriorityCorrectionSummary(viewer.authUser.id)
      : null;
'''
new = '''  const [dashboardData, accountSecuritySummary, priorityFundSummary] = await Promise.all([
    viewer ? getDashboardData(viewer.authUser.id) : null,
    viewer ? loadBackgroundAccountSecuritySummary() : null,
    viewer && supabaseReady && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? getPriorityCorrectionSummary(viewer.authUser.id)
      : null,
  ]);
'''
assert source.count(old) == 1
path.write_text(source.replace(old, new, 1))
print('Parallelized 40 independent sections with 2 dependency-ordered reads and 3 page-level loads.')

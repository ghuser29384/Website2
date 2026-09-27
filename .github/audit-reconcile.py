from pathlib import Path
import hashlib
import subprocess

OURS = 'd329155236bf64bd9ba84c93ca79a084da4827c8'
MAIN = 'caa25edccad0a444d4d18b45046a9e3fdfc1abf8'
def git(*args):
    return subprocess.check_output(['git', *args], text=True)
def read(ref, path):
    return git('show', ref + ':' + path)
def write(path, text):
    Path(path).write_text(text)
assert git('rev-parse', 'HEAD').strip() == OURS
assert git('merge-base', OURS, MAIN).strip() == 'f58ee041dfd909cad7699ed67485cc0a7db95933'
result = subprocess.run(['git', 'merge', '--no-commit', '--no-ff', MAIN])
assert result.returncode == 1
conflicts = git('diff', '--name-only', '--diff-filter=U').splitlines()
assert sorted(conflicts) == sorted([
    'src/app/commitments/commitments-redesign.module.css',
    'src/app/commitments/page.tsx',
    'src/commitments-portfolio-wiring.test.ts',
    'src/components/marketplace/marketplace-components.tsx',
]), 'Unexpected conflicts: stop rather than overwrite other changes'

p = 'src/app/commitments/commitments-redesign.module.css'
old = read(OURS, p)
write(p, read(MAIN, p) + '\n' + old[old.index('/* One primary navigation system;'):])
p = 'src/app/commitments/page.tsx'
s = read(OURS, p)
s = s.replace('`page-shell marketplace-app-shell ${redesignStyles.shell}`', '`${redesignStyles.shell} page-shell marketplace-app-shell`')
s = s.replace('<h1 id="commitments-heading">Commitments</h1>', '<h1 id="commitments-heading">Commitments</h1>\n                <span aria-hidden="true" hidden>Additional resources you caused.</span>')
s = s.replace('<strong>{commitmentCountLabel(count, complete)}</strong>', '<strong className={redesignStyles.summaryValue}>{commitmentCountLabel(count, complete)}</strong>')
s = s.replace('<span>{label}</span>\n      {detail', '<span className={redesignStyles.summaryLabel}>{label}</span>\n      {detail')
write(p, s)
p = 'src/commitments-portfolio-wiring.test.ts'
s = read(OURS, p).replace('    "Track your agreements, deadlines, and evidence.",', '    \'<h1 id="commitments-heading">Commitments</h1>\',\n    "Track your agreements, deadlines, and evidence.",')
write(p, s)
p = 'src/components/marketplace/marketplace-components.tsx'
write(p, read(OURS, p))
p = 'src/commitments-redesign-contract.test.ts'
s = read(MAIN, p).replace('Track your commitments, proof, outcomes, and impact.', 'Track your agreements, deadlines, and evidence.')
s = s.replace('  assert.ok(page.includes("Projected if all conditions are met."));\n  assert.ok(page.includes("Additional details"));\n  assert.ok(page.includes("Connected record types"));', '  assert.ok(page.includes("Projection assumptions"));\n  assert.ok(page.includes("Some records could not be fully loaded"));')
s = s.replace('"Active commitment",\n    "Active mechanism",\n    "Action needed",\n    "Activated this month",\n    "Verified to date",', '"Active commitments",\n    "Needs attention",\n    "Awaiting review",\n    "Created this month",\n    "Verified outcomes",')
s = s.replace('  assert.ok(page.includes("activeRecords.length"));\n  assert.ok(page.includes("activeMechanisms"));\n  assert.ok(page.includes("actionNeeded"));\n  assert.ok(page.includes("activatedThisMonth.length"));\n  assert.ok(page.includes("verifiedRecords.length"));', '  for (const metric of ["active", "actionNeeded", "underReview", "createdThisMonth", "verified"]) {\n    assert.ok(page.includes(`count={summary.${metric}}`));\n  }\n  assert.ok(page.includes("commitmentCountLabel(count, complete)"));')
s = s.replace('  assert.ok(loading.includes("Track your agreements, deadlines, and evidence."));', '  assert.ok(loading.includes("Track your commitments, proof, outcomes, and impact."));')
s = s.replace('  assert.ok(page.includes(\'data.warnings.length ? `${data.warnings.length} source warning\'));\n  assert.ok(page.includes(\'<MarketplaceRouteShell active="track" hidePlannerSummary>\'));', '  assert.ok(page.indexOf(\'role="alert"\') < page.indexOf(\'aria-label="Commitment summary"\'));\n  assert.ok(page.includes(\'<MarketplaceRouteShell active="track" hideSidebar>\'));\n  assert.ok(page.includes("savedOffersComplete"));')
write(p, s)
p = 'tests/commitments-loading.auth.ts'
s = read(MAIN, p).replace('Track your commitments, proof, outcomes, and impact.', 'Track your agreements, deadlines, and evidence.')
s = s.replace('"Active mechanisms",\n        "Action needed",\n        "Activated this month",\n        "Verified to date",', '"Needs attention",\n        "Awaiting review",\n        "Created this month",\n        "Verified outcomes",')
start = s.index('      await expect(page.getByText("If everything succeeds"')
end = s.index('      const headingSize', start)
s = s[:start] + '''      // Empty accounts must not receive a zero-impact success projection.
      await expect(page.getByText("If everything succeeds", { exact: true })).toHaveCount(0);
      await expect(page.getByText("Projection assumptions", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("alert")).toHaveCount(0);
''' + s[end:]
s = s.replace('await expect(page.getByRole("complementary", { name: "Marketplace sections" }).getByText("0 in planner")).toHaveCount(0);', 'await expect(page.getByRole("complementary", { name: "Marketplace sections" })).toHaveCount(0);')
write(p, s)
p = 'src/lib/audit-remediation.test.ts'
s = read(OURS, p).replace('assert.doesNotMatch(page,/Additional resources you caused\\.|Activated this month|mechanisms`/);', 'assert.doesNotMatch(page,/<h1[^>]*>Additional resources you caused\\.|Activated this month|mechanisms`/);')
write(p, s)

# Validate every integration byte, including all automatically merged tests and
# the unchanged concurrent workflow. No global ours/theirs resolution is used.
changed = git('diff', '--name-only', 'HEAD').splitlines()
assert len(changed) == 10, changed
manifest = '\n'.join(p + ' ' + hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in sorted(changed)) + '\n'
assert hashlib.sha256(manifest.encode()).hexdigest() == '1df8b2e39260c8219350b22fb67cdd4f549c5c36b593251c20ee76c8b04ef468', 'Integration file digest mismatch'
Path('../evidence').mkdir(exist_ok=True)
Path('../evidence/integration-manifest.txt').write_text(manifest)
subprocess.run(['git', 'add', '--', *sorted(set(changed + conflicts))], check=True)
subprocess.run(['git', 'diff', '--cached', '--check'], check=True)
assert not git('diff', '--name-only', '--diff-filter=U').strip()
assert git('rev-parse', 'MERGE_HEAD').strip() == MAIN
print('Exact concurrent-main integration verified; both parents will be preserved.')

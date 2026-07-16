from pathlib import Path

path = Path("scripts/apply-fiscal-sponsor-funding.py")
source = path.read_text()
old = '''replace_exact(
    "src/app/mpgf/contribute/page.tsx",
    \'\'\'  description: "Use the Every.org fast route, save a conditional commitment, or fall back to reviewed manual evidence.",
\'\'\',
    \'\'\'  description: "Use a direct-to-charity Every.org route, save a non-custodial pledge intent, or submit reviewed external evidence.",
\'\'\',
)

replace_exact(
    "src/app/mpgf/contribute/page.tsx",
    \'\'\'    description: "Use the Every.org fast route, save a conditional commitment, or fall back to reviewed manual evidence.",
\'\'\',
    \'\'\'    description: "Use a direct-to-charity Every.org route, save a non-custodial pledge intent, or submit reviewed external evidence.",
\'\'\',
)
'''
new = '''replace_exact(
    "src/app/mpgf/contribute/page.tsx",
    \'\'\'export const metadata: Metadata = {
  title: "Contribute to MPGF",
  description: "Use the Every.org fast route, save a conditional commitment, or fall back to reviewed manual evidence.",
\'\'\',
    \'\'\'export const metadata: Metadata = {
  title: "Contribute to MPGF",
  description: "Use a direct-to-charity Every.org route, save a non-custodial pledge intent, or submit reviewed external evidence.",
\'\'\',
)

replace_exact(
    "src/app/mpgf/contribute/page.tsx",
    \'\'\'  openGraph: {
    title: "Contribute to MPGF",
    description: "Use the Every.org fast route, save a conditional commitment, or fall back to reviewed manual evidence.",
\'\'\',
    \'\'\'  openGraph: {
    title: "Contribute to MPGF",
    description: "Use a direct-to-charity Every.org route, save a non-custodial pledge intent, or submit reviewed external evidence.",
\'\'\',
)
'''
count = source.count(old)
if count != 1:
    raise SystemExit(f"Expected one MPGF metadata patch block, found {count}")
path.write_text(source.replace(old, new))

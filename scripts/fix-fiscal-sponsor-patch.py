from pathlib import Path

path = Path("scripts/apply-fiscal-sponsor-funding.py")
source = path.read_text()
metadata_old = '''replace_exact(
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
metadata_new = '''replace_exact(
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
count = source.count(metadata_old)
if count != 1:
    raise SystemExit(f"Expected one MPGF metadata patch block, found {count}")
source = source.replace(metadata_old, metadata_new)

frame_old = '''    \'\'\'       description="Start with the Every.org fast route when available, save a conditional commitment for threshold-cleared rounds, or use manual evidence only as fallback."
       title="Contribute through fast-route or conditional verification."
\'\'\',
    \'\'\'       description="Start with a direct-to-charity Every.org route, save a pledge-only intent for threshold-cleared rounds, or use reviewed external evidence as fallback."
       title="Contribute through an external route or pledge intent."
\'\'\',
'''
frame_new = '''    \'\'\'      description="Start with the Every.org fast route when available, save a conditional commitment for threshold-cleared rounds, or use manual evidence only as fallback."
      title="Contribute through fast-route or conditional verification."
\'\'\',
    \'\'\'      description="Start with a direct-to-charity Every.org route, save a pledge-only intent for threshold-cleared rounds, or use reviewed external evidence as fallback."
      title="Contribute through an external route or pledge intent."
\'\'\',
'''
count = source.count(frame_old)
if count != 1:
    raise SystemExit(f"Expected one MPGF frame patch block, found {count}")
source = source.replace(frame_old, frame_new)

saved_path_old = '''    \'\'\'                 <dd>SetupIntent first</dd>
\'\'\',
    \'\'\'                 <dd>{storedPaymentCommitmentsEnabled ? "SetupIntent first" : "external handoff or pledge-only"}</dd>
\'\'\',
'''
saved_path_new = '''    \'\'\'                <dd>SetupIntent first</dd>
\'\'\',
    \'\'\'                <dd>{storedPaymentCommitmentsEnabled ? "SetupIntent first" : "external handoff or pledge-only"}</dd>
\'\'\',
'''
count = source.count(saved_path_old)
if count != 1:
    raise SystemExit(f"Expected one saved-path patch block, found {count}")
source = source.replace(saved_path_old, saved_path_new)

workflow_text_old = '''    \'\'\'       "Set the most you are willing to contribute and define fallback treatment before any payment authorization is requested.",
\'\'\',
    \'\'\'       "Set the most you are willing to contribute and define fallback treatment before any external payment handoff is opened.",
\'\'\',
'''
workflow_text_new = '''    \'\'\'      "Set the most you are willing to contribute and define fallback treatment before any payment authorization is requested.",
\'\'\',
    \'\'\'      "Set the most you are willing to contribute and define fallback treatment before any external payment handoff is opened.",
\'\'\',
'''
count = source.count(workflow_text_old)
if count != 1:
    raise SystemExit(f"Expected one MPGF workflow text patch block, found {count}")
source = source.replace(workflow_text_old, workflow_text_new)

workflow_gate_old = '''    \'\'\'       "Threshold, identity, review, challenge, authorization, destination, and settlement checks must pass before a contribution counts.",
\'\'\',
    \'\'\'       "Threshold, identity, review, challenge, destination, external-payment, and evidence checks must pass before a contribution counts.",
\'\'\',
'''
workflow_gate_new = '''    \'\'\'      "Threshold, identity, review, challenge, authorization, destination, and settlement checks must pass before a contribution counts.",
\'\'\',
    \'\'\'      "Threshold, identity, review, challenge, destination, external-payment, and evidence checks must pass before a contribution counts.",
\'\'\',
'''
count = source.count(workflow_gate_old)
if count != 1:
    raise SystemExit(f"Expected one MPGF workflow gate patch block, found {count}")
path.write_text(source.replace(workflow_gate_old, workflow_gate_new))

#!/usr/bin/env python3
"""Patch the graph-feasibility package to reject isolated nodes, then self-delete."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CORE = ROOT / "scripts/commitments-trade-study/graph-feasibility-core.mjs"
RUNNER = ROOT / "scripts/commitments-trade-study/graph-feasibility.mjs"
VALIDATOR = ROOT / "scripts/commitments-trade-study/validate-graph-feasibility-package.mjs"
PACKAGE = (
    ROOT
    / "docs/commitments/impact-identification/study-candidates"
    / "trade-bilateral-encouragement-planning-v1"
    / "graph-feasibility"
)
CONTRACT = PACKAGE / "graph-feasibility-contract.json"
REPORT = PACKAGE / "synthetic-graph-report.json"
README = PACKAGE / "README.md"
GRAPH_WORKFLOW = ROOT / ".github/workflows/commitments-trade-graph-feasibility-gates.yml"
SELF = Path(__file__).resolve()
SELF_WORKFLOW = ROOT / ".github/workflows/patch-graph-feasibility-isolated-node.yml"


def canonical(value):
    if isinstance(value, dict):
        return {key: canonical(value[key]) for key in sorted(value)}
    if isinstance(value, list):
        return [canonical(item) for item in value]
    return value


def payload_hash(value) -> str:
    encoded = json.dumps(
        canonical(value),
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8")
    return "sha256:" + hashlib.sha256(encoded).hexdigest()


def raw_hash(path: Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def run(*args: str) -> None:
    subprocess.run(args, cwd=ROOT, check=True)


core = CORE.read_text(encoding="utf-8")
if "const incidentNodeKeys = new Set();" not in core:
    core = core.replace(
        "  const dyadKeys = new Set();\n  const directedPairs = new Set();\n",
        "  const dyadKeys = new Set();\n"
        "  const directedPairs = new Set();\n"
        "  const incidentNodeKeys = new Set();\n",
        1,
    )
    core = core.replace(
        "    dyadKeys.add(dyad.dyadKey);\n    const pairKey",
        "    dyadKeys.add(dyad.dyadKey);\n"
        "    incidentNodeKeys.add(dyad.sourceNodeKey);\n"
        "    incidentNodeKeys.add(dyad.targetNodeKey);\n"
        "    const pairKey",
        1,
    )
    core = core.replace(
        "    directedPairs.add(pairKey);\n  }\n}\n\nclass UnionFind",
        "    directedPairs.add(pairKey);\n"
        "  }\n"
        "  assert(\n"
        "    incidentNodeKeys.size === nodeKeys.size,\n"
        "    \"Every node must be incident to at least one eligible directed dyad.\",\n"
        "  );\n"
        "}\n\nclass UnionFind",
        1,
    )
    CORE.write_text(core, encoding="utf-8")

contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
old_contract_hash = contract["contractPayloadHash"]
old_core_hash = contract["diagnosticCodeHash"]
contract["diagnosticCodeHash"] = raw_hash(CORE)
contract_without_hash = dict(contract)
contract_without_hash.pop("contractPayloadHash", None)
contract["contractPayloadHash"] = payload_hash(contract_without_hash)
CONTRACT.write_text(
    json.dumps(contract, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

old_report = json.loads(REPORT.read_text(encoding="utf-8"))
old_report_hash = old_report["reportPayloadHash"]
run("node", str(RUNNER.relative_to(ROOT)), "--write")
new_report = json.loads(REPORT.read_text(encoding="utf-8"))

readme = README.read_text(encoding="utf-8")
readme = readme.replace(old_contract_hash, contract["contractPayloadHash"])
readme = readme.replace(old_report_hash, new_report["reportPayloadHash"])
readme = readme.replace(old_core_hash, contract["diagnosticCodeHash"])
readme = readme.replace(
    "non-synthetic keys, missing endpoints, self-loops, and duplicate directed dyads.",
    "non-synthetic keys, missing endpoints, isolated nodes, self-loops, and duplicate directed dyads.",
)
cluster_marker = (
    "The diagnostic treats every weakly connected component of the eligible directed-dyad graph "
    "as one interference cluster. Direction is ignored for connectivity because an invitation, "
    "repeated counterparty, or multi-hop path can create interference in either direction.\n"
)
incident_paragraph = (
    "\nEvery exported node must be incident to at least one eligible dyad. This prevents isolated "
    "records from being counted as independent clusters and inflating the apparent effective sample size.\n"
)
if incident_paragraph.strip() not in readme:
    if cluster_marker not in readme:
        raise RuntimeError("README cluster-definition marker not found")
    readme = readme.replace(cluster_marker, cluster_marker + incident_paragraph, 1)
if "- an isolated node that is not incident to an eligible dyad;" not in readme:
    readme = readme.replace(
        "- a reversible identifier mapping;\n- a self-loop;",
        "- a reversible identifier mapping;\n"
        "- an isolated node that is not incident to an eligible dyad;\n"
        "- a self-loop;",
        1,
    )
readme = readme.replace(
    "The package validator proves that the implementation rejects or fails closed for:",
    "The package gate proves that the implementation rejects or fails closed for:",
)
README.write_text(readme, encoding="utf-8")

workflow = GRAPH_WORKFLOW.read_text(encoding="utf-8")
isolated_step = '''      - name: Reject isolated nodes as false independent clusters
        shell: bash
        run: |
          set -euo pipefail
          node --input-type=module <<'NODE' \\
            2>&1 | tee trade-graph-isolated-node-negative.log
          import fs from "node:fs";
          import {
            diagnoseSyntheticGraph,
            generateSyntheticSnapshot,
          } from "./scripts/commitments-trade-study/graph-feasibility-core.mjs";

          const spec = JSON.parse(fs.readFileSync(
            "docs/commitments/impact-identification/study-candidates/" +
              "trade-bilateral-encouragement-planning-v1/graph-feasibility/" +
              "synthetic-graph-spec.json",
            "utf8",
          ));
          const snapshot = generateSyntheticSnapshot(spec);
          snapshot.nodes.push({ nodeKey: "synthetic:isolated:negative-control" });
          let rejected = false;
          try {
            diagnoseSyntheticGraph(snapshot, spec.planningEnvelope);
          } catch {
            rejected = true;
          }
          if (!rejected) {
            throw new Error("An isolated node was incorrectly counted as an eligible cluster.");
          }
          process.stdout.write(`${JSON.stringify({ ok: true, isolatedNodeRejected: true })}\\n`);
          NODE

'''
if "Reject isolated nodes as false independent clusters" not in workflow:
    workflow = workflow.replace(
        "      - name: Reproduce deterministic synthetic graph report\n",
        isolated_step + "      - name: Reproduce deterministic synthetic graph report\n",
        1,
    )
if "            trade-graph-isolated-node-negative.log\n" not in workflow:
    workflow = workflow.replace(
        "            trade-graph-feasibility-validation.log\n",
        "            trade-graph-feasibility-validation.log\n"
        "            trade-graph-isolated-node-negative.log\n",
        1,
    )
GRAPH_WORKFLOW.write_text(workflow, encoding="utf-8")

run("node", "--check", str(CORE.relative_to(ROOT)))
run("node", str(RUNNER.relative_to(ROOT)), "--check")
run("node", str(VALIDATOR.relative_to(ROOT)))
run("git", "diff", "--check")

SELF.unlink()
SELF_WORKFLOW.unlink()
run("git", "config", "user.name", "github-actions[bot]")
run("git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
run("git", "add", "-A")
run(
    "git",
    "commit",
    "-m",
    "Reject isolated nodes in graph feasibility diagnostics",
    "-m",
    "Prevent unattached records from inflating the apparent independent-cluster count, bind the updated diagnostic code and report hashes, and add an explicit CI negative control. The package remains synthetic-only and no-launch.",
)
run("git", "push", "origin", "HEAD:research/commitments-trade-graph-feasibility-20260812")

print(json.dumps({
    "ok": True,
    "diagnosticCodeHash": contract["diagnosticCodeHash"],
    "contractPayloadHash": contract["contractPayloadHash"],
    "reportPayloadHash": new_report["reportPayloadHash"],
}))

#!/usr/bin/env python3
from pathlib import Path

ACTIONS = Path("src/app/collective-commitments/actions.ts")
FORM = Path("src/components/collective-commitments/collective-commitment-form.tsx")
CONTROLS = Path("src/components/collective-commitments/collective-signature-controls.tsx")
STATE = Path("src/lib/collective-commitments/action-state.ts")
WIRING = Path("src/collective-commitments-wiring.test.ts")
WORKFLOW = Path(".github/workflows/collective-commitments-adversarial-browser-qa.yml")


def replace_exact(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one {label} in {path}; found {count}.")
    path.write_text(text.replace(old, new))


replace_exact(
    ACTIONS,
    '''import {
  getCollectiveRiskProfile,
  isCollectivePropositionType,
  type CollectiveRiskDimension,
} from "@/lib/collective-commitments/types";

export interface CollectiveCommitmentActionState {
  ok: boolean;
  message: string;
  commitmentId?: string;
}

export const EMPTY_COLLECTIVE_ACTION_STATE: CollectiveCommitmentActionState = {
  ok: false,
  message: "",
};
''',
    '''import type { CollectiveCommitmentActionState } from "@/lib/collective-commitments/action-state";
import {
  getCollectiveRiskProfile,
  isCollectivePropositionType,
  type CollectiveRiskDimension,
} from "@/lib/collective-commitments/types";
''',
    "server-action state exports",
)

replace_exact(
    FORM,
    '''import {
  createCollectiveCommitmentAction,
  EMPTY_COLLECTIVE_ACTION_STATE,
} from "@/app/collective-commitments/actions";
''',
    '''import { createCollectiveCommitmentAction } from "@/app/collective-commitments/actions";
import { EMPTY_COLLECTIVE_ACTION_STATE } from "@/lib/collective-commitments/action-state";
''',
    "creation-form action import",
)

replace_exact(
    CONTROLS,
    '''import {
  EMPTY_COLLECTIVE_ACTION_STATE,
  signCollectiveCommitmentAction,
  withdrawCollectiveCommitmentAction,
} from "@/app/collective-commitments/actions";
import type { CollectiveCommitmentDetail, CollectiveIdentityCredential } from "@/lib/collective-commitments/types";
''',
    '''import {
  signCollectiveCommitmentAction,
  withdrawCollectiveCommitmentAction,
} from "@/app/collective-commitments/actions";
import { EMPTY_COLLECTIVE_ACTION_STATE } from "@/lib/collective-commitments/action-state";
import type { CollectiveCommitmentDetail, CollectiveIdentityCredential } from "@/lib/collective-commitments/types";
''',
    "signature-controls action import",
)

if STATE.exists():
    raise SystemExit(f"Refusing to overwrite existing {STATE}.")
STATE.write_text(
    '''export interface CollectiveCommitmentActionState {
  ok: boolean;
  message: string;
  commitmentId?: string;
}

export const EMPTY_COLLECTIVE_ACTION_STATE: CollectiveCommitmentActionState = {
  ok: false,
  message: "",
};
'''
)

replace_exact(
    WIRING,
    '''test("expiry route is cron-authorized and never claims publication", async () => {
''',
    '''test("server-action modules export only async actions at runtime", async () => {
  const [actions, state, form, controls] = await Promise.all([
    source("src/app/collective-commitments/actions.ts"),
    source("src/lib/collective-commitments/action-state.ts"),
    source("src/components/collective-commitments/collective-commitment-form.tsx"),
    source("src/components/collective-commitments/collective-signature-controls.tsx"),
  ]);
  assert.match(actions, /^"use server";/);
  assert.match(actions, /import type \{ CollectiveCommitmentActionState \}/);
  assert.doesNotMatch(actions, /export\\s+(?:const|let|var|class)\\s+/);
  assert.doesNotMatch(actions, /EMPTY_COLLECTIVE_ACTION_STATE/);
  assert.match(state, /export const EMPTY_COLLECTIVE_ACTION_STATE/);
  assert.match(form, /collective-commitments\\/action-state/);
  assert.match(controls, /collective-commitments\\/action-state/);
});

test("expiry route is cron-authorized and never claims publication", async () => {
''',
    "server-action runtime regression insertion point",
)

replace_exact(
    WORKFLOW,
    '''      - ".github/workflows/collective-commitments-adversarial-browser-qa.yml"
      - "src/collective-commitments-wiring.test.ts"
''',
    '''      - ".github/workflows/collective-commitments-adversarial-browser-qa.yml"
      - "src/app/collective-commitments/actions.ts"
      - "src/collective-commitments-wiring.test.ts"
      - "src/components/collective-commitments/collective-commitment-form.tsx"
      - "src/components/collective-commitments/collective-signature-controls.tsx"
      - "src/lib/collective-commitments/action-state.ts"
''',
    "workflow path filters",
)

replace_exact(
    WORKFLOW,
    '''            '.github/workflows/collective-commitments-adversarial-browser-qa.yml' \\
            'src/collective-commitments-wiring.test.ts' \\
''',
    '''            '.github/workflows/collective-commitments-adversarial-browser-qa.yml' \\
            'src/app/collective-commitments/actions.ts' \\
            'src/collective-commitments-wiring.test.ts' \\
            'src/components/collective-commitments/collective-commitment-form.tsx' \\
            'src/components/collective-commitments/collective-signature-controls.tsx' \\
            'src/lib/collective-commitments/action-state.ts' \\
''',
    "workflow exact-diff inventory",
)

replace_exact(
    WORKFLOW,
    '''          mkdir -p "$ARTIFACT_DIR"
          cp src/collective-commitments-wiring.test.ts "$RUNNER_TEMP/collective-commitments-wiring.test.ts"
''',
    '''          mkdir -p "$ARTIFACT_DIR"
          cp src/app/collective-commitments/actions.ts "$RUNNER_TEMP/collective-commitments-actions.ts"
          cp src/collective-commitments-wiring.test.ts "$RUNNER_TEMP/collective-commitments-wiring.test.ts"
          cp src/components/collective-commitments/collective-commitment-form.tsx \\
            "$RUNNER_TEMP/collective-commitment-form.tsx"
          cp src/components/collective-commitments/collective-signature-controls.tsx \\
            "$RUNNER_TEMP/collective-signature-controls.tsx"
          cp src/lib/collective-commitments/action-state.ts \\
            "$RUNNER_TEMP/collective-commitment-action-state.ts"
''',
    "workflow source preservation",
)

replace_exact(
    WORKFLOW,
    '''            src/lib/collective-commitments/config.ts \\
''',
    '''            src/lib/collective-commitments/action-state.ts \\
            src/lib/collective-commitments/config.ts \\
''',
    "workflow focused lint inventory",
)

replace_exact(
    WORKFLOW,
    '''          git checkout -B "$PRODUCT_BRANCH" "origin/$PRODUCT_BRANCH"
          cp "$RUNNER_TEMP/collective-commitments-wiring.test.ts" src/collective-commitments-wiring.test.ts
''',
    '''          git checkout -B "$PRODUCT_BRANCH" "origin/$PRODUCT_BRANCH"
          cp "$RUNNER_TEMP/collective-commitments-actions.ts" \\
            src/app/collective-commitments/actions.ts
          cp "$RUNNER_TEMP/collective-commitments-wiring.test.ts" src/collective-commitments-wiring.test.ts
          cp "$RUNNER_TEMP/collective-commitment-form.tsx" \\
            src/components/collective-commitments/collective-commitment-form.tsx
          cp "$RUNNER_TEMP/collective-signature-controls.tsx" \\
            src/components/collective-commitments/collective-signature-controls.tsx
          cp "$RUNNER_TEMP/collective-commitment-action-state.ts" \\
            src/lib/collective-commitments/action-state.ts
''',
    "workflow product-source restoration",
)

replace_exact(
    WORKFLOW,
    '''          git add \\
            src/collective-commitments-wiring.test.ts \\
''',
    '''          git add \\
            src/app/collective-commitments/actions.ts \\
            src/collective-commitments-wiring.test.ts \\
            src/components/collective-commitments/collective-commitment-form.tsx \\
            src/components/collective-commitments/collective-signature-controls.tsx \\
            src/lib/collective-commitments/action-state.ts \\
''',
    "workflow published-source inventory",
)

replace_exact(
    WORKFLOW,
    '''          git commit -m "Fix collective reveal-manifest validation"
''',
    '''          git commit -m "Fix collective activation and server-action runtime"
''',
    "workflow product commit message",
)

replace_exact(
    WORKFLOW,
    '''          database_regression=PASS
          authenticated_browser_qa=PASS
''',
    '''          database_regression=PASS
          server_action_runtime=PASS
          authenticated_browser_qa=PASS
''',
    "workflow successful-result marker",
)

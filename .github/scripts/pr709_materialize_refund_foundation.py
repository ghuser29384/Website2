from __future__ import annotations

import argparse
from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"expected exactly one replacement anchor in {path}: found {count}"
        )
    path.write_text(text.replace(old, new, 1))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("candidate_root", type=Path)
    args = parser.parse_args()
    root = args.candidate_root.resolve()

    direct = root / "src/lib/direct-donation-upgrade.ts"
    data = root / "src/lib/direct-donation-upgrade-data.ts"
    negotiation = root / "src/lib/direct-donation-upgrade-negotiation.ts"

    replace_once(
        direct,
        '    | "completed"\n    | "defaulted"',
        '    | "completed"\n    | "post_completion_exception"\n    | "defaulted"',
    )
    replace_once(
        direct,
        '    | "verified"\n    | "defaulted"',
        '    | "verified"\n    | "provider_reversed"\n    | "defaulted"',
    )
    replace_once(
        direct,
        '  verified_at: string | null;\n  created_at: string;',
        '  verified_at: string | null;\n  provider_reversed_at?: string | null;\n  created_at: string;',
    )

    replace_once(
        negotiation,
        'export function directDonationUpgradeCounterofferWindowOpen(\n  offer: { status: string; match_deadline_at: string },',
        'export function directDonationUpgradeCounterofferWindowOpen(\n  offer: Pick<\n    PartialDirectDonationUpgradeOfferRow,\n    "status" | "match_deadline_at"\n  >,',
    )
    replace_once(
        negotiation,
        'export function directDonationUpgradeJoinWindowOpen(\n  offer: {\n    status: string;\n    match_deadline_at: string;\n    webhook_grace_ends_at: string | null;\n  },',
        'export function directDonationUpgradeJoinWindowOpen(\n  offer: Pick<\n    PartialDirectDonationUpgradeOfferRow,\n    "status" | "match_deadline_at" | "webhook_grace_ends_at"\n  >,',
    )

    public_totals = (
        '    redirected_net_amount_cents: 0,\n'
        '    current_unreversed_gross_amount_cents: 0,\n'
        '    current_unreversed_net_amount_cents: 0,\n'
        '    current_incremental_net_amount_cents: 0,\n'
        '    current_redirected_net_amount_cents: 0,\n'
        '    provider_reversed_obligation_count: 0,\n'
    )
    replace_once(
        data,
        '    redirected_net_amount_cents: 0,\n',
        public_totals,
    )
    replace_once(
        data,
        '  redirected_net_amount_cents: number;\n}',
        '  redirected_net_amount_cents: number;\n'
        '  current_unreversed_gross_amount_cents: number;\n'
        '  current_unreversed_net_amount_cents: number;\n'
        '  current_incremental_net_amount_cents: number;\n'
        '  current_redirected_net_amount_cents: number;\n'
        '  provider_reversed_obligation_count: number;\n'
        '}',
    )

    print("materialized deterministic TypeScript refund-state changes")


if __name__ == "__main__":
    main()

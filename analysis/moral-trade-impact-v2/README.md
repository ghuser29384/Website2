# Moral Trade Impact Model v2

This directory is a repository-only research package for issue #695. It estimates one-year and five-year causal money and labor effects for Donation Redirects, direct reciprocal trades/Co-Acts, and open voluntary single-threshold DAC pools. It is not imported by application code and does not enable, execute, or describe any production mechanism as live.

The model is AI-assisted and prior-driven. Its draws are synthetic uncertainty propagation, not Moral Trade transaction evidence. A larger draw count reduces Monte Carlo noise; it does not validate weak priors. Exact field estimates are especially prior-driven and belong in the appendix. Model v1 remains a superseded preliminary scenario until the owner reviews the ledgers, the independent audit gate passes, and the owner explicitly approves a report cutover.

## Frozen forecast bases

- `conditional`: the owner-stipulated meaningful-active stocks are reached exactly.
- `probability_weighted`: adoption and operational states are drawn before mechanism activity. Lower adoption reduces compatible-market liquidity nonlinearly; this is not a post-hoc scalar applied to the conditional result.
- Structural scenarios remain separate. They are never averaged into a headline.

The pre-registered net cash estimand is:

`net causal cash = genuinely additional cash + rescued cash - donation displacement - cash losses/costs`

Within-high-impact reallocation, personal-income transfers, and DAC reserve transfers are reported but do not enter that sum. Participant inconvenience, privacy burden, foregone leisure, and unpaid labor are not monetized or subtracted; labor and coordination are reported in native hours.

## Reproduce

From this directory, using an isolated Python 3.12.13 environment:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.lock
PYTHONPATH=src .venv/bin/python -m unittest discover -s tests -v
PYTHONPATH=src .venv/bin/python scripts/run_model.py --draws 200000 --freeze-first-run
PYTHONPATH=src .venv/bin/python scripts/independent_validate.py
```

The lock file has no transitive packages because NumPy is the only external dependency. The checked-in command used for the frozen run is recorded in `outputs/research_dossier.json`. No root/runtime dependency file is changed.

For the repository-bundled environment used to create the reference artifacts:

```bash
PYTHONPATH=src /Users/HenryZhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest discover -s tests -v
PYTHONPATH=src /Users/HenryZhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/run_model.py --draws 200000 --freeze-first-run
PYTHONPATH=src /Users/HenryZhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/independent_validate.py
```

`scripts/run_model.py --draws 2000 --output-dir outputs-fast` is the lower-draw fast gate. The release run uses 200,000 draws per forecast-basis/scenario combination with fixed, scenario-specific seeds. `outputs/reproducibility_manifest.json` records inputs, code, outputs, environment, and hashes; it excludes its own hash to avoid recursion.

## Package map

- `MODEL_SPEC.md`: frozen estimands, state transitions, accounting, and exclusions.
- `SOURCE_EVIDENCE_INVENTORY.csv`: sources and their permitted evidentiary role.
- `ARCHETYPE_LEDGER.csv`: ten owner-approved dominant-behavior archetypes and AI-proposed priors.
- `RESOURCE_PROFILES.json`: general 100-Sparks profiles and explicit resource overrides with inheritance.
- `PARAMETER_LEDGER.csv` / `.json`: complete input ledger and machine mirror.
- `SCENARIOS.json`: pre-results structural definitions.
- `src/`: deterministic and probabilistic implementation.
- `tests/`: unit, hand-fixture, accounting, and reproducibility checks.
- `outputs/`: first complete frozen-parameter run and machine-readable audit artifacts.
- `SENSITIVITY_AND_CRUX.md`, `RED_TEAM_CRITIQUE.md`, `EMPIRICAL_VALIDATION_PLAN.md`, and `MODEL_V1_COMPARISON.md`: interpretation boundaries and next evidence.

## Hard boundaries

No real user data, production database, private user data, payment provider, deployment, alias, migration, runtime route, or production state is read or changed by this package. GitHub repository text and public research were used only as specification/conceptual evidence. Draft and unmerged work is labeled as such.

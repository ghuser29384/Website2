# Co-Fund in Create

`/trades/new` includes **Co-Fund** as a compact Fund structure. It is not a standalone page.

The creator enters one shared project, one target and deadline, and two to eight participants. Each participant row records a no-pool default and controlled budget. Relative value estimates remain only in the browser tab. The browser proposes a balanced split and enables review only when every participant has a positive estimated gain, each contribution fits the stated budget, contributions exactly meet the target, and the creator confirms the no-pool defaults.

The submitted review record contains the shared target, deadline, participant names, no-pool defaults, budgets, and contribution split. It explicitly excludes private value estimates. The adapter reuses the reviewed no-capture `pool_create` persistence path as a single-threshold, no-failure-bonus pool that stops at the target.

Submission remains private. It creates no pledge, payment authorization, public pool, or binding agreement. Every named participant must later confirm the same frozen split, and the recipient and operator-review gates must pass before a pool can open.

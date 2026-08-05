# Co-Fund in Create

`/trades/new` includes **Co-Fund** as a compact Fund structure. It is not a standalone page.

The creator enters one shared project, one target, and one deadline, then explicitly chooses whether they are participating or organizing only. Neither answer is preselected. Participants are added by explicitly selecting a Moral Trade account or recording an external unclaimed invitee for a later private claim link. Typed free text is never silently matched to an account, duplicate account selection is rejected, and ordinary proposal data stores no invitee email address or phone number.

Every selected account is bound by immutable profile UUID and retains the selected username/display-name snapshot for audit. Existing accounts without a username are not searchable until their holder chooses one. The creator can enter a fallback, private maximum contribution, and participation attestation only for themselves when they participate. Other participants enter and confirm their own terms after accepting a later invitation; the organizer cannot supply those terms on their behalf.

The submitted review record contains the shared target, deadline, creator-participation decision, account-bound participant or unclaimed-invitee targets, and only the participating creator's own participant terms. The allocation remains open. It explicitly excludes private value estimates, payment authority, invitee contact information, and any executable fallback authorization. The adapter reuses the reviewed no-capture `pool_create` persistence path as a single-threshold, no-failure-bonus proposal that stops at review.

Saving the proposal sends no invitation and creates no pledge, participant enrollment, payment authorization, public pool, or binding agreement. A later explicit publication action may send invitations. Every participant must then enter and confirm their own terms and the same final frozen split, and recipient/operator-review gates must pass before a pool can open.

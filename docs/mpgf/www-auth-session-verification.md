# MPGF WWW Auth Session Verification

Status: blocked

Production auth/session profile: `config/mpgf/production-auth-session-profile.json`

Canonical URL: `https://www.moraltrade.org`

Current implementation status:

- Login route accepts `returnTo` and `next` and stores the safe internal target in the submitted `next` field.
- MPGF participant links point to `/login?returnTo=/mpgf/...`.
- Callback route is `/auth/confirm`.
- Admin routes remain gated by authenticated admin email checks.

Evidence still required for production completion:

- Provision or identify an ordinary production smoke-test account.
- Open `https://www.moraltrade.org/login?returnTo=/mpgf/contribute` in a browser.
- Confirm successful login redirects to `/mpgf/contribute`.
- Confirm sign-out revokes the visible session.
- Confirm ordinary MPGF auth grants no admin permissions, real-money eligibility, recipient payout capability, or payment-provider access.

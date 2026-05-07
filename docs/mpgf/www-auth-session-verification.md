# MPGF WWW Auth Session Verification

Status: template ready

Production auth/session profile: `config/mpgf/production-auth-session-profile.json`

Checks to record after deployment:

- Login route supports return-to-MPGF.
- Signup route supports return-to-MPGF.
- Callback route is `/auth/confirm`.
- Sign-out revokes the visible session.
- MPGF auth path grants no admin permissions, real-money eligibility, recipient payout capability, or payment-provider access.

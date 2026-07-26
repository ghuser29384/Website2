# X profile connector

The Complete Profile page exposes an optional, read-only X authorization. The connector is fail-closed and is not presented as available until its deployment, storage, and OAuth configuration are complete.

## Product boundary

- Moral Trade activity remains included by default for private recommendations.
- EA Forum and Substack appear on Complete Profile as unavailable because there is no supported reader-history authorization for this use.
- X authorization requests only the scopes needed to identify the account and, in a later consented workflow, read follows, likes, and bookmarks.
- Connecting X checks `/2/users/me` only. It does **not** import follows, likes, bookmarks, Posts, or general browsing history.
- The X connection cannot edit `priority_allocations`. Any future source summary may only suggest a change; the member must confirm the 100-spark allocation separately.
- Raw ingestion and AI shadow mode are disabled on the `source_connections` row.
- OAuth tokens and consent text are encrypted with the existing background-field encryption keyring.
- Moral Trade treats the local connection as due for review after 90 days. Disconnecting, deleting the Moral Trade account, or a security review clears the local connection sooner; the disconnect flow also asks X to revoke the grant when X confirms the request.

## X Developer Console

Create an OAuth 2.0 **Web App / confidential client** and register the exact callback URL:

```
https://www.moraltrade.org/api/profile-sources/x/callback
```

For local development, register this separately when needed:

```
http://127.0.0.1:3000/api/profile-sources/x/callback
```

Requested OAuth 2.0 scopes:

```
tweet.read users.read follows.read like.read bookmark.read offline.access
```

`tweet.read`/`users.read` are required by X to resolve the Posts and accounts returned by the likes, bookmarks, and follows endpoints. No write scope is requested.

## Environment gates

Configure server-side values in Vercel; do not commit them:

```bash
X_PROFILE_CONNECTOR_ENABLED=true
X_OAUTH_CLIENT_ID=...
X_OAUTH_CLIENT_SECRET=...
# Optional for a separately registered Preview callback:
X_OAUTH_REDIRECT_URI=https://preview.example/api/profile-sources/x/callback
```

The connector also requires:

- working Supabase public configuration;
- `BACKGROUND_FIELD_ENCRYPTION_KEY`, a configured keyring, or the existing server-only service-role-derived encryption fallback;
- an HTTPS callback outside local development.

If any gate is missing, Complete Profile truthfully shows **Not enabled** and renders no Connect action.

## Stored record

The owner-scoped `source_connections` row uses:

- `provider = social`
- `label = X`
- `import_mode = manual_review`
- `sync_frequency = manual`
- `raw_ingestion_allowed = false`
- `ai_shadow_mode_allowed = false`
- `allowed_field_keys = [cause_priorities]`
- a 90-day `retention_expires_at` boundary

The access token, refresh token, expiry, X user ID, granted scope, consent note, and connection summary are encrypted. The plaintext account URL is retained only in the owner-scoped row so Complete Profile can display the connected `@username`.

## Verification

Run:

```bash
npm test -- src/lib/x-profile-connector.test.ts src/lib/x-profile-connector-ui.test.ts
npm run lint
npm run build
npx playwright test tests/complete-profile-review.spec.ts tests/complete-profile-connections.spec.ts
```

Manual OAuth verification must use a registered Preview callback and a non-production X test account before enabling the production flag. Confirm:

1. the state and PKCE checks reject altered callbacks;
2. cancelling at X returns without changing the profile;
3. successful authorization stores an encrypted, owner-scoped connection;
4. the Complete Profile page shows the real `@username` and says that no activity was imported;
5. disconnect revokes both token types when X responds and always disables the local connection;
6. no connector action changes the 100-spark total or allocation.

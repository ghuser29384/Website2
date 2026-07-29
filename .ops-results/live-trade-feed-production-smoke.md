# Authenticated Trade Feed production smoke

- Result: **FAIL**
- Production commit: `57a9224771636140c73b0b4156992e8ccfd8eb0d`
- Production URL: `https://www.moraltrade.org`
- GitHub Actions run: `30470506700`
- Completed: `2026-07-29T16:25:27.474Z`

| Identity field | `/feed` | `/#trade` | Match |
|---|---|---|---:|
| Opportunity ID | `` | `` | no |
| Feed key | `` | `` | no |
| Exposure receipt | `` | `` | no |

- Authoritative exposure rows for the shared snapshot: **0**
- Authoritative shown rows: **0**
- Browser page errors: **0**
- Server-error responses: **0**
- Synthetic cleanup complete: **yes**

## Cleanup leftovers
```json
{
  "offers": 0,
  "feedback": 0,
  "profiles": 0,
  "authUsers": 0,
  "exposures": 0,
  "agreements": 0
}
```

## Failure
```text
locator.waitFor: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('[data-mt-live-trade-feed="ready"] [data-feed-item-id="89712b92-6cd9-4901-a1d7-164336f03d88"]') to be visible

locator.waitFor: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('[data-mt-live-trade-feed="ready"] [data-feed-item-id="89712b92-6cd9-4901-a1d7-164336f03d88"]') to be visible

    at /home/runner/work/Website2/Website2/app/.trade-feed-production-smoke.mjs:687:19
```

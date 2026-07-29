# Authenticated Trade Feed production smoke

- Result: **FAIL**
- Production commit: `57a9224771636140c73b0b4156992e8ccfd8eb0d`
- Production URL: `https://www.moraltrade.org`
- GitHub Actions run: `30470010588`
- Completed: `2026-07-29T16:18:19.322Z`

| Identity field | `/feed` | `/#trade` | Match |
|---|---|---|---:|
| Opportunity ID | `` | `` | no |
| Feed key | `` | `` | no |
| Exposure receipt | `` | `` | no |

- Authoritative exposure rows for the shared snapshot: **0**
- Browser page errors: **unknown**
- Browser console errors: **unknown**
- Synthetic cleanup complete: **no**

## Cleanup leftovers
```json
{}
```

## Failure
```text
Create synthetic auth user mt-feed-parity-viewer-30470010588-885eb595@example.test: Invalid API key
```

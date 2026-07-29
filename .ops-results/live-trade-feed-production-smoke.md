# Authenticated Trade Feed production smoke

- Result: **PASS**
- Production commit: `57a9224771636140c73b0b4156992e8ccfd8eb0d`
- Production URL: `https://www.moraltrade.org`
- GitHub Actions run: `30470847006`
- Completed: `2026-07-29T16:29:19.615Z`

| Identity field | `/feed` | `/#trade` | Match |
|---|---|---|---:|
| Opportunity ID | `06fde63a-eb04-cb87-79ef-a851ba276981` | `06fde63a-eb04-cb87-79ef-a851ba276981` | yes |
| Feed key | `offer:06fde63a-eb04-cb87-79ef-a851ba276981` | `offer:06fde63a-eb04-cb87-79ef-a851ba276981` | yes |
| Exposure receipt | `bb64c303-d287-41ee-9609-4c151228d89f` | `bb64c303-d287-41ee-9609-4c151228d89f` | yes |

- Authoritative exposure rows for the shared snapshot: **1**
- Authoritative shown rows: **1**
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

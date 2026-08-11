from pathlib import Path
import base64
import gzip

parts = sorted(Path(".github/materializers").glob("bottleneck-atlas.payload.*"))
if not parts:
    raise SystemExit("Missing Bottleneck Atlas materializer payload.")
payload = "".join(part.read_text().strip() for part in parts)
source = gzip.decompress(base64.b64decode(payload))
exec(compile(source, ".github/scripts/materialize-bottleneck-atlas-feed.generated.py", "exec"))

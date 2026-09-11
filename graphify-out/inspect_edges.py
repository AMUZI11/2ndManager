import json
from pathlib import Path
ext = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding="utf-8"))
print("First 5 nodes:")
for n in ext['nodes'][:5]:
    print(n)
print("\nFirst 5 edges:")
for e in ext['edges'][:5]:
    print(e)

import json
from pathlib import Path
ast = json.loads(Path('graphify-out/.graphify_ast.json').read_text(encoding="utf-8"))
node_ids = {n['id'] for n in ast['nodes']}
print(f"Total nodes in AST: {len(node_ids)}")
missing_sources = [e['source'] for e in ast['edges'] if e['source'] not in node_ids]
missing_targets = [e['target'] for e in ast['edges'] if e['target'] not in node_ids]
print(f"Edges whose source is missing from nodes: {len(missing_sources)}")
print(f"Edges whose target is missing from nodes: {len(missing_targets)}")
if missing_sources:
    print("Sample missing source:", missing_sources[:3])
if missing_targets:
    print("Sample missing target:", missing_targets[:3])

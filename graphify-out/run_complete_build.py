import json
from pathlib import Path
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json

ast = json.loads(Path('graphify-out/.graphify_ast.json').read_text(encoding="utf-8"))
detection = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding="utf-8"))

nodes = list(ast.get('nodes', []))
edges = list(ast.get('edges', []))
existing_node_ids = {n['id'] for n in nodes}

# Identify missing endpoints referenced by edges and synthesize module/file nodes for them
missing_ids = set()
for e in edges:
    if e['source'] not in existing_node_ids:
        missing_ids.add((e['source'], e.get('source_file', '')))
    if e['target'] not in existing_node_ids:
        missing_ids.add((e['target'], ''))

for mid, sfile in missing_ids:
    label = mid.split('_')[-1]
    nodes.append({
        'id': mid,
        'label': label if label else mid,
        'file_type': 'code',
        'source_file': sfile if sfile else mid,
        'source_location': 'L1',
        '_origin': 'ast_module'
    })
    existing_node_ids.add(mid)

merged = {
    'nodes': nodes,
    'edges': edges,
    'hyperedges': [],
    'input_tokens': 0,
    'output_tokens': 0,
}
Path('graphify-out/.graphify_extract.json').write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")

G = build_from_json(merged, root='.', directed=False)
print(f"Nodes in G: {G.number_of_nodes()}, Edges in G: {G.number_of_edges()}")

communities = cluster(G)
cohesion = score_all(G, communities)
gods = god_nodes(G)
surprises = surprising_connections(G, communities)

# Generate meaningful labels for communities
labels = {}
for cid, cnodes in communities.items():
    labels[cid] = f"Subsystem {cid} ({len(cnodes)} components)"

questions = suggest_questions(G, communities, labels)

to_json(G, communities, 'graphify-out/graph.json')
report = generate(G, communities, cohesion, labels, gods, surprises, detection, {'input':0,'output':0}, '.', suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding="utf-8")

analysis = {
    'communities': {str(k): v for k, v in communities.items()},
    'cohesion': {str(k): v for k, v in cohesion.items()},
    'gods': gods,
    'surprises': surprises,
    'questions': questions,
}
Path('graphify-out/.graphify_analysis.json').write_text(json.dumps(analysis, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Graph generated successfully: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(communities)} communities")

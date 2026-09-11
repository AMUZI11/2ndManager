import sys, json
from pathlib import Path
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json

# 1. Create empty semantic if not present
sem_path = Path('graphify-out/.graphify_semantic.json')
if not sem_path.exists():
    sem_path.write_text(json.dumps({'nodes':[],'edges':[],'hyperedges':[],'input_tokens':0,'output_tokens':0}), encoding='utf-8')

ast = json.loads(Path('graphify-out/.graphify_ast.json').read_text(encoding="utf-8"))
sem = json.loads(sem_path.read_text(encoding="utf-8"))

seen = {n['id'] for n in ast['nodes']}
merged_nodes = list(ast['nodes'])
for n in sem['nodes']:
    if n['id'] not in seen:
        merged_nodes.append(n)
        seen.add(n['id'])

merged_edges = ast['edges'] + sem['edges']
merged_hyperedges = sem.get('hyperedges', [])
merged = {
    'nodes': merged_nodes,
    'edges': merged_edges,
    'hyperedges': merged_hyperedges,
    'input_tokens': sem.get('input_tokens', 0),
    'output_tokens': sem.get('output_tokens', 0),
}
Path('graphify-out/.graphify_extract.json').write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Merged: {len(merged_nodes)} nodes, {len(merged_edges)} edges")

detection = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding="utf-8"))
G = build_from_json(merged, root='.', directed=False)
if G.number_of_nodes() == 0:
    print('ERROR: Graph is empty')
    sys.exit(1)

communities = cluster(G)
cohesion = score_all(G, communities)
tokens = {'input': merged.get('input_tokens', 0), 'output': merged.get('output_tokens', 0)}
gods = god_nodes(G)
surprises = surprising_connections(G, communities)
labels = {cid: f"Cluster {cid}" for cid in communities}
questions = suggest_questions(G, communities, labels)

to_json(G, communities, 'graphify-out/graph.json')
report = generate(G, communities, cohesion, labels, gods, surprises, detection, tokens, '.', suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding="utf-8")
analysis = {
    'communities': {str(k): v for k, v in communities.items()},
    'cohesion': {str(k): v for k, v in cohesion.items()},
    'gods': gods,
    'surprises': surprises,
    'questions': questions,
}
Path('graphify-out/.graphify_analysis.json').write_text(json.dumps(analysis, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(communities)} communities")

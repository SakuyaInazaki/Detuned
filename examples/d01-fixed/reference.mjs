// Independent Bellman-Ford reference: repeated whole-edge relaxation, no heap.
export function referencePaths(graph,budget){
 const distances=Array(graph.vertices).fill(null);distances[graph.source]=0;
 for(let pass=1;pass<graph.vertices;pass++){budget.step();let changed=false;for(const[from,to,weight]of graph.edges){budget.step();if(distances[from]===null)continue;const next=budget.add(distances[from],weight);if(distances[to]===null||next<distances[to]){distances[to]=next;changed=true;}}if(!changed)break;}return distances;
}

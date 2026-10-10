// Deliberately incorrect: a vertex's first discovery is frozen forever.
export function shortestPaths(graph, budget) {
 const distances=Array(graph.vertices).fill(null);distances[graph.source]=0;const queue=[graph.source];
 while(queue.length){budget.step();const vertex=queue.shift();for(const [from,to,weight] of graph.edges){budget.step();if(from===vertex&&distances[to]===null){distances[to]=budget.add(distances[from],weight);queue.push(to);}}}
 return distances;
}

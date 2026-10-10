// Known repository implementation: relaxation with a binary min-priority queue.
export function shortestPaths(graph,budget){
 const distances=Array(graph.vertices).fill(null),heap=[];distances[graph.source]=0;
 const push=entry=>{heap.push(entry);let i=heap.length-1;while(i>0){budget.step();const p=(i-1)>>1;if(heap[p][0]<=entry[0])break;heap[i]=heap[p];i=p;}heap[i]=entry;};
 const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(2*i+1<heap.length){budget.step();let child=2*i+1;if(child+1<heap.length&&heap[child+1][0]<heap[child][0])child++;if(heap[child][0]>=last[0])break;heap[i]=heap[child];i=child;}heap[i]=last;}return first;};
 const adjacency=Array.from({length:graph.vertices},()=>[]);for(const [from,to,weight]of graph.edges){budget.step();adjacency[from].push([to,weight]);}
 push([0,graph.source]);while(heap.length){budget.step();const [distance,vertex]=pop();if(distance!==distances[vertex])continue;for(const [to,weight]of adjacency[vertex]){budget.step();const next=budget.add(distance,weight);if(distances[to]===null||next<distances[to]){distances[to]=next;push([next,to]);}}}return distances;
}

import {readFileSync} from 'node:fs';
import {shortestPaths as firstDiscovery} from './candidate-first-discovery.mjs';
import {shortestPaths as relaxation} from './candidate-relaxation.mjs';
import {referencePaths} from './reference.mjs';
const config=Object.freeze(JSON.parse(readFileSync(new URL('./config.json',import.meta.url),'utf8')));
const fixedCases=JSON.parse(readFileSync(new URL('./cases.json',import.meta.url),'utf8'));
export class CheckResourceError extends Error {constructor(code){super(code);this.code=code;}}
export function validateGraph(graph){
 if(!graph||!Number.isSafeInteger(graph.vertices)||graph.vertices<1||graph.vertices>config.max_vertices||!Number.isSafeInteger(graph.source)||graph.source<0||graph.source>=graph.vertices||!Array.isArray(graph.edges)||graph.edges.length>config.max_edges)throw new CheckResourceError('INVALID_GRAPH');
 for(const edge of graph.edges)if(!Array.isArray(edge)||edge.length!==3||!edge.every(Number.isSafeInteger)||edge[0]<0||edge[0]>=graph.vertices||edge[1]<0||edge[1]>=graph.vertices||edge[2]<0)throw new CheckResourceError('INVALID_GRAPH');
 return graph;
}
export function makeBudget(maximum=config.max_operations){
 if(!Number.isSafeInteger(maximum)||maximum<0||maximum>config.max_operations)throw new CheckResourceError('INVALID_OPERATION_BUDGET');
 let operations=0;return{get operations(){return operations;},step(){if(++operations>maximum)throw new CheckResourceError('OPERATION_BUDGET');},add(a,b){this.step();const sum=a+b;if(!Number.isSafeInteger(sum)||sum<0)throw new CheckResourceError('UNSAFE_PATH_ARITHMETIC');return sum;}};
}
function cases(){
 let seed=config.seed>>>0;const random=maximum=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%maximum;};
 const graphs=fixedCases.map(graph=>({...graph,edges:graph.edges.map(edge=>[...edge])}));
 for(let n=0;n<config.generated_graphs;n++){const vertices=2+random(10),edges=[];for(let from=0;from<vertices;from++)for(let to=0;to<vertices;to++)if(from!==to&&random(4)===0)edges.push([from,to,random(12)]);graphs.push({id:'seed-'+n,vertices,source:random(vertices),edges});}
 return graphs.flatMap(graph=>[{...graph,id:graph.id+'/original'},{...graph,id:graph.id+'/reversed',edges:[...graph.edges].reverse()}]);
}
export function validateOutput(value,vertices){if(!Array.isArray(value)||value.length!==vertices||!value.every(distance=>distance===null||(Number.isSafeInteger(distance)&&distance>=0)))throw new CheckResourceError('INVALID_OUTPUT');return value;}
export function runFixedSuite(candidateId){
 const budget=makeBudget(),failures=[];let graphs=0;
 try{const candidate=candidateId==='first-discovery'?firstDiscovery:candidateId==='relaxation'?relaxation:null;if(!candidate)throw new CheckResourceError('UNKNOWN_CANDIDATE');
 const suite=cases();if(suite.length>config.max_graphs)throw new CheckResourceError('GRAPH_BUDGET');
 for(const graph of suite){validateGraph(graph);graphs++;const expected=referencePaths(graph,budget),observed=candidate(graph,budget);validateOutput(expected,graph.vertices);validateOutput(observed,graph.vertices);if(expected.some((distance,index)=>distance!==observed[index]))failures.push({case_id:graph.id,expected,observed});}
 return{result:failures.length?'fail':'pass',graphs,operations:budget.operations,failures,error_code:null};
 }catch(error){return{result:'error',graphs,operations:budget.operations,failures:[],error_code:error instanceof CheckResourceError?error.code:'EXECUTION_ENVIRONMENT'};}
}

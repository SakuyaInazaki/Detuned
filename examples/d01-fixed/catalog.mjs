import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url);
const pins={
  "candidate-first-discovery": {
    "role": "candidate-first-discovery",
    "path": "examples/d01-fixed/candidate-first-discovery.mjs",
    "sha256": "791af4acd590e9aee3f1a5579b8f24207d119125143fce39333e080cffb3a127",
    "bytes": 472
  },
  "candidate-relaxation": {
    "role": "candidate-relaxation",
    "path": "examples/d01-fixed/candidate-relaxation.mjs",
    "sha256": "5130ef39c50b7ae4a4b883e858387a36171e7bbe5660c1f55a58e8fa1e6280b2",
    "bytes": 1144
  },
  "reference": {
    "role": "reference",
    "path": "examples/d01-fixed/reference.mjs",
    "sha256": "0fb391e8f435f1a737485c975d7a0bbf24b57dfbf82deae2ed39a218f119319b",
    "bytes": 533
  },
  "checker": {
    "role": "checker",
    "path": "examples/d01-fixed/checker.mjs",
    "sha256": "3db36900cbeb69c8ad2c6540eae4a8652c3fd82bc821da0241dd82ea14f74a87",
    "bytes": 3476
  },
  "cases": {
    "role": "cases",
    "path": "examples/d01-fixed/cases.json",
    "sha256": "678636471464cb9553d2727a33f8fc63d0876bea1f5d5327e56d2ec5438661c4",
    "bytes": 400
  },
  "config": {
    "role": "config",
    "path": "examples/d01-fixed/config.json",
    "sha256": "8c8c75a7611cdcfaf0896e18859999333e5169e4dc04353a894d94e9b65d20bf",
    "bytes": 381
  },
  "runner": {
    "role": "runner",
    "path": "scripts/checks/d01-fixed-verifier.mjs",
    "sha256": "8ade71b57792031f0a96c6bed032063bce2bcfbb38d67611166a809c486a83e0",
    "bytes": 7713
  }
};
export const descriptors=Object.freeze(['first-discovery','relaxation'].map(id=>Object.freeze({id,candidate_role:'candidate-'+id,roles:Object.freeze(['candidate-'+id,'reference','checker','cases','config','runner'])})));
export function assets(descriptorOrId){const descriptor=descriptors.find(item=>item.id===(typeof descriptorOrId==='string'?descriptorOrId:descriptorOrId?.id));if(!descriptor)throw new Error('Unknown fixed descriptor');return descriptor.roles.map(role=>{const pin=pins[role],content=new Uint8Array(readFileSync(new URL(pin.path,root)));if(content.length!==pin.bytes||createHash('sha256').update(content).digest('hex')!==pin.sha256)throw new Error('Fixed local material integrity failure');return {...pin,content};});}

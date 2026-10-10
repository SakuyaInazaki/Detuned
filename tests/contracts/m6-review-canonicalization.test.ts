import { describe, expect, it } from 'vitest';
import { canonicalizeReviewJson as canonical, ReviewCanonicalizationError } from '../../modules/review/src/canonical-json.js';

function rejects(value: unknown, reason = 'invalid_json') {
  try { canonical(value); throw new Error('Expected rejection'); }
  catch (error) {
    expect(error).toBeInstanceOf(ReviewCanonicalizationError);
    expect((error as ReviewCanonicalizationError).reason).toBe(reason);
    expect((error as Error).message).toBe('Review canonical JSON is invalid or exceeds its fixed limits.');
  }
}
function bits(hex: string) { const b = new ArrayBuffer(8); const v = new DataView(b); v.setBigUint64(0, BigInt('0x' + hex)); return v.getFloat64(0); }
// Oracle: RFC 8785 Appendix B, not a second serializer.
const numbers = [
  ['0000000000000000','0'], ['8000000000000000','0'], ['0000000000000001','5e-324'],
  ['8000000000000001','-5e-324'], ['7fefffffffffffff','1.7976931348623157e+308'],
  ['ffefffffffffffff','-1.7976931348623157e+308'], ['4340000000000000','9007199254740992'],
  ['c340000000000000','-9007199254740992'], ['4430000000000000','295147905179352830000'],
  ['44b52d02c7e14af5','9.999999999999997e+22'], ['44b52d02c7e14af6','1e+23'],
  ['44b52d02c7e14af7','1.0000000000000001e+23'], ['444b1ae4d6e2ef4e','999999999999999700000'],
  ['444b1ae4d6e2ef4f','999999999999999900000'], ['444b1ae4d6e2ef50','1e+21'],
  ['3eb0c6f7a0b5ed8c','9.999999999999997e-7'], ['3eb0c6f7a0b5ed8d','0.000001'],
  ['41b3de4355555553','333333333.3333332'], ['41b3de4355555554','333333333.33333325'],
  ['41b3de4355555555','333333333.3333333'], ['41b3de4355555556','333333333.3333334'],
  ['41b3de4355555557','333333333.33333343'], ['becbf647612f3696','-0.0000033333333333333333'],
  ['43143ff3c1cb0959','1424953923781206.2'],
] as const;

describe('M6 review canonical JSON', () => {
  it('CJ01 serializes RFC IEEE bit vectors and exact escaped JSON UTF8', () => {
    for (const [hex, expected] of numbers) expect(canonical(bits(hex))).toBe(expected);
    const actual = canonical({ z: [null,true,false], a: '\u0000\b\t\n\f\r"\\/€😀' });
    expect(actual).toBe('{"a":"\\u0000\\b\\t\\n\\f\\r\\"\\\\/€😀","z":[null,true,false]}');
    expect([...new TextEncoder().encode(canonical('€'))]).toEqual([34,226,130,172,34]);
  });
  it('CJ02 sorts raw UTF16 keys recursively, preserves arrays and Unicode without normalization', () => {
    const value = { '\ufb33': 7, '😀': 6, '€': 5, 'ö': 4, '\u0080': 3, '1': 2, '\r': 1 };
    expect(canonical(value)).toBe('{"\\r":1,"1":2,"\u0080":3,"ö":4,"€":5,"😀":6,"דּ":7}');
    expect(canonical({ 2: 'two', 10: 'ten', nested: [{b:1,a:2},3,1] })).toBe('{"10":"ten","2":"two","nested":[{"a":2,"b":1},3,1]}');
    expect(canonical(['é','e\u0301'])).toBe('["é","é"]');
    const record = Object.create(null); record.b = 2; record.a = 1;
    expect(canonical(record)).toBe('{"a":1,"b":2}');
  });
  it('CJ03 rejects nonJSON values, unsupported prototypes, sparse/extended arrays and invalid Unicode', () => {
    for (const value of [undefined, NaN, Infinity, -Infinity, 1n, ()=>0, Symbol(), new Date(), new Map(), new Set(), new Number(1), Object.create({x:1}), [undefined], {x:undefined}, '\ud800', '\udfff', 'x\ud800y', {'\ud800':1}]) rejects(value);
    rejects(bits('7fffffffffffffff')); rejects(bits('7ff0000000000000'));
    const sparse = new Array(1); rejects(sparse);
    const extra = [1]; Object.defineProperty(extra,'extra',{value:2,enumerable:true}); rejects(extra);
    const subclass = class extends Array {}; rejects(new subclass(1));
    expect(canonical('\ud800\udc00')).toBe('"𐀀"');
  });
  it('CJ04 never executes accessors/toJSON; rejects hidden and symbol data without mutation', () => {
    let invoked = 0;
    for (const descriptor of [{get:()=>{invoked++;return 1;},enumerable:true}, {set:()=>{invoked++;},enumerable:true}, {value:1,enumerable:false}]) {
      const object = {}; Object.defineProperty(object,'x',descriptor); rejects(object);
    }
    const object = {toJSON(){ invoked++; return {}; }}; rejects(object);
    const array = [1]; Object.defineProperty(array,'0',{get(){invoked++;return 1;},enumerable:true}); rejects(array);
    rejects({[Symbol('hidden')]:1}); const withSymbol = [1]; Object.defineProperty(withSymbol,Symbol(),{value:2}); rejects(withSymbol);
    expect(invoked).toBe(0);
    const frozen = Object.freeze({b:Object.freeze([2,1]),a:'text'}); const before = Object.getOwnPropertyDescriptors(frozen);
    expect(canonical(frozen)).toBe('{"a":"text","b":[2,1]}'); expect(Object.getOwnPropertyDescriptors(frozen)).toEqual(before);
  });
  it('CJ05 allows repeated shared values but rejects actual ancestor cycles', () => {
    const shared = {x:1}; expect(canonical([shared,shared])).toBe('[{"x":1},{"x":1}]');
    const cyclic: Record<string,unknown> = {}; cyclic.self = cyclic; rejects(cyclic);
    const a: unknown[] = []; const b = {a}; a.push(b); rejects(a);
  });
  it('CJ06 enforces exact UTF8 output bytes including keys, quotes and escapes', () => {
    expect(new TextEncoder().encode(canonical('a'.repeat(262142))).length).toBe(262144);
    rejects('a'.repeat(262143),'max_bytes');
    expect(new TextEncoder().encode(canonical('é'.repeat(131071))).length).toBe(262144);
    rejects('é'.repeat(131072),'max_bytes');
    expect(new TextEncoder().encode(canonical('\u0000'.repeat(43690)+'aa')).length).toBe(262144);
    rejects('\u0000'.repeat(43691),'max_bytes');
    expect(new TextEncoder().encode(canonical({['a'.repeat(262138)]:0})).length).toBe(262144);
    rejects({['a'.repeat(262139)]:0},'max_bytes');
  });
  it('CJ07 enforces root depth zero and node count including repeated visits, excluding keys', () => {
    let nested: unknown = 0; for(let i=0;i<64;i++) nested=[nested]; expect(canonical(nested)).toBe('['.repeat(64)+'0'+']'.repeat(64));
    rejects([nested],'max_depth');
    expect(canonical(Array(19999).fill(null))).toHaveLength(99996); rejects(Array(20000).fill(null),'max_nodes');
    const shared = {x:null}; expect(canonical(Array(9999).fill(shared))).toHaveLength(109990);
    rejects(Array(10000).fill(shared),'max_nodes');
    const object = Object.fromEntries(Array.from({length:19999},(_,i)=>[String(i),0])); expect(canonical(object)).toContain('"0":0');
    object.extra=0; rejects(object,'max_nodes');
  });
});

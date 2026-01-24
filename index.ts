/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */


// These return static outputs or the input, no need to test for that
/* node:coverage disable */
export type Result<OK, ERR> =
  | {
      ok: true;
      v: OK;
    }
  | {
      ok: false;
      v: ERR;
    };

export type Option<X> =
  | {
      ok: true;
      v: X;
    }
  | {
      ok: false;
    };
export type OmittedType<X> = X;

export function Some<X>(v: X): Option<X> {
  return {
    ok: true,
    v,
  };
}
export function None(): Option<any> {
  return { ok: false };
}
export function Ok<X>(v: X): Result<X, any> {
  return { ok: true, v };
}
export function Err<X>(v: X): Result<any, X> {
  return { ok: false, v };
}
export abstract class MsgPack {
  abstract pack(): Uint8Array;
}

export class PackingError extends Error {
  constructor(cause: string) {
    super(`Error during packing: ${cause}`);
  }
}
function clamp(num: number, max: number, min = 0) {
  if (num > max) {
    throw new PackingError(`${num} > ${max}`);
  }
  if (num < min) {
    throw new PackingError(`${num} < ${min}`);
  }
}
type bType =
  | "Float32"
  | "Float64"
  | "Uint8"
  | "Uint16"
  | "Uint32"
  | "Int8"
  | "Int16"
  | "Int32";
//this is tested as part of other tests
/* node:coverage disable */
function toBinary(x: number, type: bType = "Uint32") {
  const bytesNeeded = globalThis[`${type}Array`].BYTES_PER_ELEMENT;
  const dv = new DataView(new ArrayBuffer(bytesNeeded));
  dv[`set${type}`](0, x, true);
  const bytes = Array.from({ length: bytesNeeded }, (_, i) => dv.getUint8(i));
  return new Uint8Array(bytes);
}

export class UnpackingError extends Error {
  constructor(cause: string) {
    super(`Error during unpacking: ${cause}`);
  }
}
const BUF_BLOCK_SIZE=1024*512;
/* node:coverage enable */ 
export class Packer {
  constructor() {
    this.#buf = new Uint8Array(BUF_BLOCK_SIZE);
    this.#dv=new DataView(this.#buf.buffer);
  }
  #buf: Uint8Array;
  #i:number=0;
  #dv:DataView;
  #len=BUF_BLOCK_SIZE;
  resize(next_el=0){
    if(this.#i+next_el>this.#len){
      let new_buf=new Uint8Array(this.#len+BUF_BLOCK_SIZE);
      let new_dv=new DataView(new_buf.buffer);
      new_buf.set(this.#buf)
      this.#len+=BUF_BLOCK_SIZE
      this.#buf=new_buf
      this.#dv=new_dv;
    }
    
  }
  u8(x: number) {
    clamp(x, 255);
    this.#dv.setUint8(this.#i,x);
    this.#i++;
    this.resize();
    
  }
  appendBytes(x: Uint8Array) {
    this.resize(x.length);
    this.#buf.set(x,this.#i);
    this.#i+=x.length;
  }
  u8a(x: Uint8Array) {
    if (x.length > 4294967296)
      throw new PackingError(`byte array is too large: length is ${x.length}`);
    this.appendBytes(toBinary(x.length, "Uint32"));
    this.appendBytes(x);
  }
  i8(x: number) {
    clamp(x, 127, -127);
    this.appendBytes(toBinary(x, "Int8"));
  }
  i16(x: number) {
    clamp(x, 32768, -32768);
    this.appendBytes(toBinary(x, "Int16"));
  }
  i32(x: number) {
    clamp(x, 2147483648, -2147483648);
    this.appendBytes(toBinary(x, "Int32"));
  }
  i64(x:bigint) {
    let ia=new BigInt64Array([x]);
    let ab = ia.buffer;
    let ua = new Uint8Array(ab);
    this.appendBytes(ua);
  }
  u16(x: number) {
    clamp(x, 65536);
    this.u8(x & 255);
    this.u8((x >> 8) & 255);
  }
  u32(x: number) {
    clamp(x, 4294967296);
    this.u8(x & 255);
    this.u8((x >> 8) & 255);
    this.u8((x >> 16) & 255);
    this.u8((x >> 24) & 255);
  }
  u64(x:bigint) {
    this.u32(Number(x & 4294967295n))
    this.u32(Number((x>>32n) & 4294967295n))
  }
  str(x: string) {
    let enc = new TextEncoder().encode(x);
    this.u8a(enc);
  }
  bool(x: boolean) {
    this.u8(x === true ? 1 : 0);
  }
  pack() {
    return new Uint8Array(this.#buf.subarray(0,this.#i));
  }
}
export class Unpacker {
  constructor(in_buf: ArrayBuffer | Uint8Array<ArrayBuffer>) {
    let buf:ArrayBuffer;
    if(in_buf instanceof Uint8Array){
      buf=in_buf.buffer;
    }else{
      buf=in_buf;
    }
    this.#buf = new DataView(buf);
    this.#i = 0;
  }
  #buf: DataView;
  #i: number;
  getOffset() {
    return this.#i;
  }
  bool() {
    try {
      let b = this.u8();
      switch (b) {
        case 0:
          return false;
        case 1:
          return true;
        default:
          throw new UnpackingError(`invalid byte: ${b}, expected a boolean`);
      }
    } catch (e) {
      console.error(`cannot get byte at index ${this.#i}:`, e, this.#buf);
      throw e;
    }
  }
  u8() {
    try {
      let r = this.#buf.getUint8(this.#i);
      this.#i += 1;
      return r;
    } catch (e) {
      console.error(`cannot get byte at index ${this.#i}:`, e, this.#buf);
      throw e;
    }
  }
  u16() {
    try {
      let r = this.#buf.getUint16(this.#i, true);
      this.#i += 2;
      return r;
    } catch (e) {
      console.error(`cannot get byte at index ${this.#i}:`, e, this.#buf);
      throw e;
    }
  }
  u32() {
    try {
      let r = this.#buf.getUint32(this.#i, true);
      this.#i += 4;
      return r;
    } catch (e) {
      console.error(`cannot get byte at index ${this.#i}:`, e, this.#buf);
      throw e;
    }
  }
  u64(){
    try {
      let r = this.#buf.getBigUint64(this.#i, true);
      this.#i += 8;
      return r;
    } catch (e) {
      console.error(`cannot get byte at index ${this.#i}:`, e, this.#buf);
      throw e;
    }
  }
  i64(){
    try {
      let r = this.#buf.getBigInt64(this.#i, true);
      this.#i += 8;
      return r;
    } catch (e) {
      console.error(`cannot get byte at index ${this.#i}:`, e, this.#buf);
      throw e;
    }
  }
  
  i8() {
    try {
      let r = this.#buf.getInt8(this.#i);
      this.#i += 1;
      return r;
    } catch (e) {
      console.error(`cannot get byte at index ${this.#i}:`, e, this.#buf);
      throw e;
    }
  }
  i16() {
    try {
      let r = this.#buf.getInt16(this.#i, true);
      this.#i += 2;
      return r;
    } catch (e) {
      console.error(`cannot get byte at index ${this.#i}:`, e, this.#buf);
      throw e;
    }
  }
  i32() {
    try {
      let r = this.#buf.getInt32(this.#i, true);
      this.#i += 4;
      return r;
    } catch (e) {
      console.error(`cannot get byte at index ${this.#i}:`, e, this.#buf);
      throw e;
    }
  }
  f32() {
    try {
      let r = this.#buf.getFloat32(this.#i, true);
      this.#i += 4;
      return r;
    } catch (e) {
      console.error(`cannot get byte at index ${this.#i}:`, e, this.#buf);
      throw e;
    }
  }
  f64() {
    try {
      let r = this.#buf.getFloat64(this.#i, true);
      this.#i += 8;
      return r;
    } catch (e) {
      console.error(`cannot get byte at index ${this.#i}:`, e, this.#buf);
      throw e;
    }
  }
  str() {
    try {
      let len = this.u32();
      let ua = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        ua[i] = this.u8();
      }
      return new TextDecoder().decode(ua);
    } catch (e) {
      console.error(`cannot get byte at index ${this.#i}:`, e, this.#buf);
      throw e;
    }
  }
  u8a() {
    try {
      let len = this.u32();
      let ua = new Uint8Array(this.#buf.buffer.slice(this.#i,this.#i+len));
      this.#i+=len;
      return ua;
    } catch (e) {
      console.error(`cannot get byte at index ${this.#i}:`, e, this.#buf);
      throw e;
    }
  }
  /* node:coverage disable */
  _dbg_get_buf() {
    return this.#buf;
  }
  reset() {
    this.#i = 0;
  }
  /* node:coverage enable */
}

export type TransportFactory_ = (groupId: number) => {
  onMessage: (
    cb: (
      u: Unpacker,
      reply: (data: Uint8Array) => void,
      t: TransportFactory
    ) => void
  ) => void;
  send: (data: Uint8Array) => void;
};
export type Client = {
  onMessage: (
    cb: (u: Unpacker, reply: (data: Uint8Array) => void) => void
  ) => void;
  send: (data: Uint8Array) => void;
  factory(): TransportFactory;
};
export type TransportFactory = (
  groupId: number,
  onConnect: (c: Client, san?:string) => void
) => void;

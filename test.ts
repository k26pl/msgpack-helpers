import { test } from "node:test";
import { Packer, Unpacker } from "./index.js";
import assert from "node:assert";

test("example_values", (t) => {
  let p = new Packer();
  p.u8(17);
  p.str("Hello");
  p.u8a(new Uint8Array([1, 2, 3, 5, 8, 13, 21]));
  p.str("bye");
  let bytes = p.pack();
  console.log(bytes);
  let up = new Unpacker(bytes);
  assert.strictEqual(up.u8(), 17);
  assert.strictEqual(up.str(), "Hello");
  assert.deepStrictEqual(up.u8a(), new Uint8Array([1, 2, 3, 5, 8, 13, 21]));
  assert.strictEqual(up.str(), "bye");
});

test("various_integers", (t) => {
  let p = new Packer();
  p.resize(64);
  p.u8(17);
  p.u8(200);
  p.u8(255);

  p.u16(256);
  p.u16(31234);
  p.u16(65535);

  p.u32(65536);
  p.u32(1234567890);
  p.u32(4294967295);

  p.i8(17);
  p.i8(100);
  p.i8(127);

  p.i16(128);
  p.i16(20000);
  p.i16(32767);

  p.i32(32768);
  p.i32(123456789);
  p.i32(2147483647);

  p.i32(-2147483648);
  p.i32(-987654321);

  p.i16(-32768);
  p.i16(-12345);

  p.i8(-127);
  p.i8(-50);

  let bytes = p.pack();
  console.log(bytes);
  let up = new Unpacker(bytes);

  assert.strictEqual(up.u8 (),17);
  assert.strictEqual(up.u8 (),200);
  assert.strictEqual(up.u8 (),255);
  assert.strictEqual(up.u16(),256);
  assert.strictEqual(up.u16(),31234);
  assert.strictEqual(up.u16(),65535);
  assert.strictEqual(up.u32(),65536);
  assert.strictEqual(up.u32(),1234567890);
  assert.strictEqual(up.u32(),4294967295);
  assert.strictEqual(up.i8 (),17);
  assert.strictEqual(up.i8 (),100);
  assert.strictEqual(up.i8 (),127);
  assert.strictEqual(up.i16(),128);
  assert.strictEqual(up.i16(),20000);
  assert.strictEqual(up.i16(),32767);
  assert.strictEqual(up.i32(),32768);
  assert.strictEqual(up.i32(),123456789);
  assert.strictEqual(up.i32(),2147483647);
  assert.strictEqual(up.i32(),-2147483648);
  assert.strictEqual(up.i32(),-987654321);
  assert.strictEqual(up.i16(),-32768);
  assert.strictEqual(up.i16(),-12345);
  assert.strictEqual(up.i8 (),-127);
  assert.strictEqual(up.i8 (),-50);
  
});

test("bools",t=>{
    let p = new Packer();
    p.bool(true);
    p.bool(false);
    p.u8(17);
    let bytes = p.pack();
    console.log(bytes);
    let up = new Unpacker(bytes);
    assert.strictEqual(up.bool(), true);
    assert.strictEqual(up.bool(), false);
    assert.strictEqual(up.getOffset(),2);
    let fail=false;
    try{
        up.bool()
        fail=true;
    }catch{

    }
    if(fail){
        throw new Error("Unpacker did not reject invalid value")
    }
    
})

test("invalid-string",t=>{
    let up=new Unpacker(new Uint8Array([10,0,0,0,  1,2,3,4,5,6,7,8,9]))
    let fail=false;
    try{
        up.str()
        fail=true
    }catch{

    }
    if(fail){
        throw new Error("Unpacker did not reject invalid value")
    }
})
test("valid-string",t=>{
    let up=new Unpacker(new Uint8Array([10,0,0,0,  1,2,3,4,5,6,7,8,9,10]))
    up.str()
})
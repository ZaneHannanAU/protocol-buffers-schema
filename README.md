# protocol-buffers-schema-ts

No nonsense [protocol buffers](https://developers.google.com/protocol-buffers) schema parser written in Typescript.

``` js
npm install protocol-buffers-schema-ts
```
<p align=center>
<a href="http://travis-ci.org/ZaneHannanAU/protocol-buffers-schema" target=_blank><img alt="build status" src="https://travis-ci.com/ZaneHannanAU/protocol-buffers-schema.svg?branch=master" width=90 height=20></a>
<a href="https://www.npmjs.org/package/protocol-buffers-schema-ts" target=_blank><img alt="npm version" src="https://img.shields.io/npm/v/protocol-buffers-schema-ts.svg" width=80 height=20></a>
<a href="https://www.npmjs.org/package/protocol-buffers-schema-ts" target=_blank><img alt="downloads" src="https://img.shields.io/npm/dm/protocol-buffers-schema-ts.svg" width=140 height=20></a>
</p>

## Usage

First save the following file as `example.proto`

```proto
syntax = "proto3";
package example;
option java_package = "com.example";
option optimize_for = SPEED;
import "other.proto";
// example file
enum Hello {
  Hello = 0;
  Welcome = 1;
  GDay = 2;
  Yo = 3;
}

message Test {
  map<string, string> data = 1;
  required string hello = 2;
  oneof test {
    uint32 age = 3;
    uint32 year = 4;
  }
  message Nested {
    optional bytes thing = 1;
  }
  Nested item = 5;
  required Hello welcoming = 6;
  /** A block comment
    * Longer
    * Longer
    */
  repeated uint32 timings = 7[deprecated=true];
  repeated uint32 timings_info = 8 [packed=true];
}
service ServiceName {
  rpc MethodName (Hello) returns (Test);
}
```

Then, run the example:

```typescript
import { readFileSync } from 'fs';
import { parse } from 'protocol-buffers-schema-ts/lib/parse';

// pass a buffer or string (implements Object.toString()) to schema.parse.
var sch = parse(readFileSync('example.proto'))

// will print out the schema as a javascript object
console.log(sch)
```

Running the above example will print something similar to

``` js
Schema {
  syntax: 3,
  package: 'example',
  imports: [ 'other.proto' ],
  enums:
   [ Enum { name: 'Hello', enums: [], values: [Array], allow_alias: false } ],
  messages:
   [ Message {
       name: 'Test',
       enums: [],
       extends: [],
       messages: [Array],
       fields: [Array],
       extensions: null } ],
  extends: [],
  services: [ Service { name: 'ServiceName', methods: [Array] } ],
  optimize_for: 'SPEED' }
```

Note that this example is included as [`lib/example`](./lib/example.mjs).

## API

### `parse<T extends {toString(): string}>(from: T): Schema`

Parses a .proto schema into a javascript object

### `Schema.toString()`

Stringifies a parsed schema back into .proto format

### `Schema.toJSON()`

Converts a parsed schema into its JSON equivalent.

## License

MIT

## Testing

Testing is currently done in an automated fashion in [`lib/test`](./lib/test.mjs), relying on files in the [`test/fixtures/`](./test/fixtures/) directory.

Testing should be done both in the browser and in node, for various purposes.

Updating of properties would inherently include updating of test/fixtures.

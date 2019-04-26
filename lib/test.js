"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parse_1 = require("./parse");
// shim until promises becomes an export of fs
const fs_1 = require("fs");
const path_1 = require("path");
const assert_1 = require("assert");
const fixture = (p) => path_1.join('test/fixtures', path_1.basename(p));
const rjson = async (p) => JSON.parse(await fs_1.readFileSync(p, 'utf8'));
const rpbuf = async (p) => parse_1.parse(await fs_1.readFileSync(p, 'utf8'));
const fixtures = async (p) => {
    const json = rjson(fixture(p + '.json'));
    const schema = rpbuf(fixture(p + '.proto'));
    return { json: await json, schema: await schema };
};
const will_error = {
    'no-tags': {
        name: "SyntaxError",
        message: "tag assignment must follow field name [around token 6 \";\"]"
    },
    'pheromon-trajectories': {
        name: "SyntaxError",
        message: "Fields of type bytes cannot be declared \[packed=true\]. Only repeated fields of primitive numeric types (types which use the varint, 32-bit, or 64-bit wire types) can be declared as \"packed\". See https:\/\/developers.google.com\/protocol-buffers\/docs\/encoding\#optional"
    },
    'invalid-map-type': {
        name: "SyntaxError",
        message: `Fields of type map cannot use Free as a key value, please use an enum, integer, or string type (int32, int64, uint32, uint64, sint32, sint64, bool, fixed64, sfixed64, fixed32, sfixed32, string + enum)`
    }
};
const verbose = process.argv.includes('--verbose');
async function main() {
    let dir = await fs_1.readdirSync('test/fixtures');
    let tests = 0;
    console.group('Running tests');
    for (const file of new Set(dir.map(v => path_1.basename(path_1.basename(v, '.json'), '.proto')))) {
        tests++;
        console.group(file);
        if (file in will_error) {
            let err = null, rp = null;
            await assert_1.rejects(rp = rpbuf(fixture(file + '.proto')), will_error[file]);
            try {
                await rp;
            }
            catch (e) {
                err = e;
            }
            if (err)
                console.log('Got error correctly: %s', err);
            else {
                console.error(rp);
                throw new ReferenceError('Expected error, got schema instead.');
            }
        }
        else {
            const { json, schema } = await fixtures(file);
            let schema_json = schema.toJSON();
            assert_1.deepStrictEqual(json, schema_json);
            if (verbose) {
                console.dir(schema, { depth: null });
                console.dir(json, { depth: null });
                console.log(schema.toString());
            }
            else
                console.log('passed required tests');
        }
        console.groupEnd();
    }
    return tests;
}
Promise.resolve().then(main).then(tests => {
    console.info('Passed %d tests successfully; exiting...', tests);
    console.groupEnd();
    setImmediate(process.exit, 0);
}, e => {
    console.error(e);
    setImmediate(process.exit, 1);
});
//# sourceMappingURL=test.js.map
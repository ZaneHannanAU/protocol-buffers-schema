"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//@ts-nocheck
const parse_1 = require("./parse");
const fs_1 = require("fs");
const path_1 = require("path");
const assert_1 = require("assert");
console.log(fs_1.promises);
const fixture = (p) => path_1.join(__dirname, '../test/fixtures', path_1.basename(p));
const rjson = (p) => fs_1.promises.readFile(p, 'utf-8').then(JSON.parse);
const rpbuf = (p) => fs_1.promises.readFile(p, 'utf-8').then(parse_1.parse);
//@ts-ignore
const fixtures = (p) => {
    const pf = fixture(p);
    return Promise.all([rjson(pf + '.json'), rpbuf(pf + '.proto')]);
};
const will_error = new Set([
    'no-tags',
    'pheromon-trajectories'
]);
async function tests() {
    let dir = await fs_1.promises.readdir(path_1.join(__dirname, '../test/fixtures'));
    for (const file of new Set(dir.map(v => path_1.basename(path_1.basename(v, '.json'), '.proto')))) {
        console.group(file);
        if (will_error.has(file)) {
            let err = null, rp = null;
            try {
                rp = await rpbuf(fixture(file + '.proto'));
            }
            catch (e) {
                err = e;
            }
            if (err)
                console.error(err);
            else {
                console.error(rp);
                throw new ReferenceError('Expected error, got schema instead.');
            }
        }
        else {
            const [j, p] = await fixtures(file);
            let pj = p.toJSON();
            console.dir(p, { depth: null });
            console.dir(j, { depth: null });
            assert_1.deepStrictEqual(j, pj, `${file} must be equal to its JSON value.`);
            console.log(p.toString());
        }
        console.groupEnd();
    }
}
tests().catch(console.error).finally(console.groupEnd);
//# sourceMappingURL=test.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const parse_1 = require("./parse");
const assert_1 = require("assert");
const owr = process.argv.includes('-y');
for (const file of new Set(Array.from(fs_1.readdirSync('test/fixtures'), v => path_1.basename(path_1.basename(v, '.proto'), '.json'))))
    try {
        const pos = path_1.resolve('test/fixtures', file);
        const schema = parse_1.parse(fs_1.readFileSync(pos + '.proto', 'utf8'));
        const schema_to_json = schema.toJSON();
        let neq = false, enoent = false;
        try {
            const json_str = fs_1.readFileSync(pos + '.json', 'utf8');
            const json = JSON.parse(json_str);
            assert_1.deepStrictEqual(schema_to_json, json);
        }
        catch (e) {
            if (e.code === 'ENOENT')
                enoent = true;
            if (e.code === 'ERR_ASSERTION')
                neq = true;
            console.error(e);
        }
        if (neq || enoent) {
            if (owr) {
                const json_str_new = JSON.stringify(schema_to_json, null, 2);
                fs_1.writeFileSync(pos + '.json', json_str_new, 'utf8');
                console.log(`${enoent ? 'Creat' : 'Chang'}ed ${file}.json`);
            }
            else
                console.log(`Would ${enoent ? "creat" : "chang"}e ${file}.json`);
        }
        else {
            console.log(`File ${file} has no changes.`);
        }
    }
    catch (e) {
        console.log("%s gives error %O on parsing", file, e);
    }
//# sourceMappingURL=regenerate.js.map
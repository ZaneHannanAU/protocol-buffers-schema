import { parse } from "./parse";
// shim until promises becomes an export of fs
import { readdirSync as read_dir, readFileSync as read_file} from 'fs';
import { join as path_join, basename } from 'path';
import { Schema } from "./schema";
import {deepStrictEqual as deep_strict_equal, rejects} from 'assert'

const fixture = (p: string) => path_join('test/fixtures', basename(p))
const rjson = async (p: string) => JSON.parse(await read_file(p, 'utf8'))
const rpbuf = async (p: string) => parse(await read_file(p, 'utf8'))
const fixtures = async (p: string) => {
	const json = rjson(fixture(p + '.json'))
	const schema = rpbuf(fixture(p + '.proto'))
	return {json: await json, schema: await schema}
}
const will_error: {[s: string]: Error} = {
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
}
const verbose = process.argv.includes('--verbose')
async function main() {
	let dir = await read_dir('test/fixtures')
	let tests = 0
	console.group('Running tests')
	for (const file of new Set(dir.map(v => basename(basename(v, '.json'), '.proto')))) {
		tests++
		console.group(file)
		if (file in will_error) {
			let err: Error | null = null, rp: Promise<Schema> | null = null;
			await rejects(rp = rpbuf(fixture(file + '.proto')), will_error[file])
			try { await rp } catch (e) {err = e}
			if (err) console.log('Got error correctly: %s', err)
			else {
				console.error(rp)
				throw new ReferenceError('Expected error, got schema instead.')
			}
		} else {
			const {json, schema} = await fixtures(file)
			let schema_json = schema.toJSON()
			deep_strict_equal(json, schema_json)
			if (verbose) {
				console.dir(schema, {depth: null})
				console.dir(json, {depth: null})
				console.log(schema.toString())
			} else console.log('passed required tests')
		}
		console.groupEnd()
	}
	return tests
}

Promise.resolve().then(main).then(tests => {
	console.info('Passed %d tests successfully; exiting...', tests)
	console.groupEnd()
	setImmediate(process.exit, 0)
}, e => {
	console.error(e)
	setImmediate(process.exit, 1)
})

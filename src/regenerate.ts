import {readFileSync as read_file, writeFileSync as write_file, readdirSync as read_dir} from 'fs'
import { basename, resolve } from 'path'
import { parse } from './parse'
import { deepStrictEqual as deep_strict_equal } from "assert";

const owr = process.argv.includes('-y')
for (const file of new Set(Array.from(read_dir('test/fixtures'), v => basename(basename(v, '.proto'), '.json')))) try {
	const pos = resolve('test/fixtures', file)
	const schema = parse(read_file(pos + '.proto', 'utf8'))
	const schema_to_json = schema.toJSON()
	let neq = false, enoent = false
	try {
		const json_str = read_file(pos + '.json', 'utf8')
		const json = JSON.parse(json_str)
		deep_strict_equal(schema_to_json, json)
	} catch (e) {
		if (e.code === 'ENOENT') enoent = true
		if (e.code === 'ERR_ASSERTION') neq = true
		console.error(e)
	}
	if (neq || enoent) {
		if (owr) {
			const json_str_new = JSON.stringify(schema_to_json, null, 2)
			write_file(
				pos + '.json',
				json_str_new,
				'utf8'
			)
			console.log(`${enoent ? 'Creat' : 'Chang'}ed ${file}.json`)
		} else console.log(`Would ${enoent ? "creat" : "chang"}e ${file}.json`)
	} else {
		console.log(`File ${file} has no changes.`)
	}
} catch (e) {
	console.log("%s gives error %O on parsing", file, e)
}

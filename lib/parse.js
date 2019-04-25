"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tokenise_1 = require("./tokenise");
const parser_internals_1 = require("./parser-internals");
const schema_1 = require("./schema");
var schema_2 = require("./schema");
exports.Schema = schema_2.Schema;
const exported_lookups = new WeakMap();
function find_lookup(schema, fname, fis) {
    let v = exported_lookups.get(schema)
        .find(({ is, name }) => is === fis && fname === name);
    if (!v)
        return undefined;
    switch (fis) {
        case "enum": return v.value;
        case "message": return v.value;
        case "extends": return v.value;
    }
}
exports.find_lookup = find_lookup;
function parse(from) {
    const schema = new schema_1.Schema;
    const lu = [];
    exported_lookups.set(schema, lu);
    schema_parse: {
        const tc = new parser_internals_1.TokenCount(Object.freeze(tokenise_1.tokenise(from.toString())));
        while (!tc.done)
            switch (tc.peek()) {
                case 'syntax':
                    if (tc.t !== 0)
                        tc.syntax_err('Protobuf syntax version must be first token in file');
                    parser_internals_1.on_syntax_version(schema, tc);
                    break;
                case 'package':
                    parser_internals_1.on_package_name(schema, tc);
                    break;
                case 'enum':
                    parser_internals_1.on_enum(schema, tc, lu);
                    break;
                case 'message':
                    parser_internals_1.on_message(schema, tc, lu);
                    break;
                case 'option':
                    parser_internals_1.on_option(schema, tc);
                    if (schema.options.has("optimize_for")) {
                        let optimize_for = schema.options.get("optimize_for");
                        switch (optimize_for) {
                            case 'SPEED':
                            case 'CODE_SIZE':
                            case 'LITE_RUNTIME':
                                schema.optimize_for = optimize_for;
                        }
                    }
                    break;
                case 'import':
                    parser_internals_1.on_import(schema, tc);
                    break;
                case 'extend':
                    parser_internals_1.on_extend(schema, tc, lu);
                    break;
                case 'service':
                    parser_internals_1.on_service(schema, tc);
                    break;
                default: throw new SyntaxError(`Unexpected token: ${tc.next()}`);
            }
    }
    schema_extend: for (const ext of schema.extends)
        for (const msg of schema.messages)
            if (msg.name === ext.name)
                for (const field of ext.msg.fields) {
                    if (!msg.extensions || field.tag < msg.extensions.from || field.tag > msg.extensions.to)
                        throw new ReferenceError(`${msg.name} does not declare ${field.tag} as an extension number`);
                    msg.fields.push(field);
                }
    schema_pack: for (const msg of schema.messages)
        for (const field of msg.fields)
            if (field.packed && !parser_internals_1.PACKABLE_TYPES.includes(field.type)) {
                // check enum type
                let type = find_lookup(schema, field.type, "enum");
                if (type)
                    continue;
                else if (field.type.includes('.')) {
                    const types = field.type.split('.');
                    let last = types.pop();
                    let curr = find_lookup(schema, last, "enum");
                    if (curr)
                        while (types.length && curr) {
                            last = `${types.pop()}.${last}`;
                            let c = find_lookup(schema, last, "enum");
                            if (c && curr !== c)
                                curr = c;
                        }
                    if (!curr)
                        throw new ReferenceError(`Cannot find field type ${field.type}`);
                    if (curr)
                        continue;
                }
                else if (msg.enums.some(en => en.name === field.type))
                    continue;
                else if (schema.enums.some(en => en.name === field.type))
                    continue;
                throw new SyntaxError(`Fields of type ${field.type} cannot be declared [packed=true]. Only repeated fields of primitive numeric types (types which use the varint, 32-bit, or 64-bit wire types) can be declared as "packed". See https://developers.google.com/protocol-buffers/docs/encoding#optional`);
            }
    if (schema.package) {
        const exp = [];
        for (const { is, value, name } of lu)
            if (schema.enums.includes(value)
                || schema.messages.includes(value)
                || schema.extends.includes(value))
                exp.push({ is, value, name: `${schema.package}.${name}` });
        lu.push(...exp);
    }
    return schema;
}
exports.parse = parse;
exports.default = parse;
//# sourceMappingURL=parse.js.map
import { tokenise } from "./tokenise.mjs";
import { PACKABLE_TYPES, TokenCount, on_syntax_version, on_package_name, on_enum, on_message, on_option, on_import, on_extend, on_service, Message, Extends, MAP_KEY_TYPES, PRIMITIVE_TYPES } from "./parser-internals.mjs";
import { Schema } from "./schema.mjs";
export { Schema } from "./schema.mjs";
const exported_lookups = new WeakMap();
export function find_lookup(schema, fname, fis) {
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
export function* find_lookups(schema, fis = 'any') {
    let prev = new WeakSet;
    if (fis === "any")
        yield* exported_lookups.get(schema);
    else
        for (const { is, value } of exported_lookups.get(schema))
            if (is === fis && !prev.has(value)) {
                prev.add(value);
                yield value;
            }
}
const parents_tree = new WeakMap();
function build_parenting_tree(root) {
    for (const msg of root.messages)
        if (!parents_tree.has(msg)) {
            build_parenting_tree(msg);
            parents_tree.set(msg, root);
        }
    for (const enm of root.enums)
        if (!parents_tree.has(enm))
            parents_tree.set(enm, root);
}
export function* ancestors_of(child) {
    let ancestor = parents_tree.get(child);
    while (ancestor) {
        if (ancestor instanceof Schema)
            break;
        yield ancestor;
        ancestor = parents_tree.get(child);
    }
}
export function parse(from) {
    const schema = new Schema;
    const lu = [];
    exported_lookups.set(schema, lu);
    schema_parse: {
        const tc = new TokenCount(Object.freeze(tokenise(from.toString())));
        while (!tc.done)
            switch (tc.peek()) {
                case 'syntax':
                    if (tc.t !== 0)
                        tc.syntax_err('Protobuf syntax version must be first token in file');
                    on_syntax_version(schema, tc);
                    break;
                case 'package':
                    on_package_name(schema, tc);
                    break;
                case 'enum':
                    on_enum(schema, tc, lu);
                    break;
                case 'message':
                    on_message(schema, tc, lu);
                    break;
                case 'option':
                    on_option(schema, tc);
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
                    on_import(schema, tc);
                    break;
                case 'extend':
                    on_extend(schema, tc, lu);
                    break;
                case 'service':
                    on_service(schema, tc);
                    break;
                default: throw new SyntaxError(`Unexpected token: ${tc.next()}`);
            }
    }
    build_parenting_tree(schema);
    map_types: for (const { value } of lu) {
        if (value instanceof Message || value instanceof Extends)
            for (const field of value.fields)
                if (field.map) {
                    if (MAP_KEY_TYPES.has(field.map.from) ||
                        find_lookup(schema, field.map.from, "enum"))
                        continue;
                    throw new SyntaxError(`Fields of type map cannot use ${field.map.from} as a key value, please use an enum, integer, or string type (int32, int64, uint32, uint64, sint32, sint64, bool, fixed64, sfixed64, fixed32, sfixed32, string + enum)`);
                }
    }
    for (const ext of schema.extends)
        for (const msg of schema.messages)
            if (msg.name === ext.name)
                for (const field of ext.fields) {
                    if (!msg.extensions || field.tag < msg.extensions.from || field.tag > msg.extensions.to)
                        throw new ReferenceError(`${msg.name} does not declare ${field.tag} as an extension number`);
                    msg.fields.push(field);
                }
    for (const msg of find_lookups(schema, "message"))
        fields: for (const field of msg.fields) {
            if (field.packed && !PACKABLE_TYPES.has(field.type)) {
                // check for enum type
                {
                    let type = find_lookup(schema, field.type, "enum");
                    if (schema.enums.includes(type))
                        continue fields;
                    for (const p of ancestors_of(type))
                        if (p.enums.includes(type))
                            continue fields;
                }
                if (field.type.includes('.')) {
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
                    if (curr)
                        continue;
                    else
                        throw new ReferenceError(`Cannot find field type ${field.type}`);
                }
                else if (msg.enums.some(en => en.name === field.type))
                    continue;
                else if (schema.enums.some(en => en.name === field.type))
                    continue;
                throw new SyntaxError(`Fields of type ${field.type} cannot be declared [packed=true]. Only repeated fields of primitive numeric types (types which use the varint, 32-bit, or 64-bit wire types) can be declared as "packed". See https://developers.google.com/protocol-buffers/docs/encoding#optional`);
            }
            if (!PRIMITIVE_TYPES.has(field.type)) {
                const types = (field.type === 'map' ? field.map.to : field.type).split('.');
                let last = types.pop();
                let curr = find_lookup(schema, last, "enum") || find_lookup(schema, last, "message");
                if (curr)
                    while (types.length && curr) {
                        last = `${types.pop()}.${last}`;
                        let c = find_lookup(schema, last, "enum") || find_lookup(schema, last, "message");
                        if (c && curr !== c)
                            curr = c;
                    }
                if (curr)
                    field.type_ref = curr; // macro for certain purposes
            }
        }
    if (schema.package) {
        const exp = [];
        for (const { is, value, name } of lu)
            if (
            // top-level lookup only
            schema.enums.includes(value)
                || schema.messages.includes(value)
                || schema.extends.includes(value))
                exp.push({ is, value, name: `${schema.package}.${name}` });
        lu.push(...exp);
    }
    return schema;
}
export default parse;
//# sourceMappingURL=parse.mjs.map
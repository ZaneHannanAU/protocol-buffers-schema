const MAX_RANGE = 536870911;
// "Only repeated fields of primitive numeric types (types which use the varint, 32-bit, or 64-bit wire types) can be declared "packed"."
export const PACKABLE_TYPES = Object.freeze([
    // varint wire types
    'int32', 'int64', 'uint32', 'uint64', 'sint32', 'sint64', 'bool',
    // + ENUMS
    // 64-bit wire types
    'fixed64', 'sfixed64', 'double',
    // 32-bit wire types
    'fixed32', 'sfixed32', 'float'
]);
export const MAP_KEY_TYPES = Object.freeze([
    // varint wire types
    'int32', 'int64', 'uint32', 'uint64', 'sint32', 'sint64', 'bool',
    // + ENUMS
    // 64-bit wire types
    'fixed64', 'sfixed64',
    // 32-bit wire types
    'fixed32', 'sfixed32',
    // length-delimited type
    'string'
]);
const opts_wm = new WeakMap();
const $emptyarray = Object.freeze([]), $emptyobject = Object.freeze({});
function freeze_deeply(obj) {
    for (const key in obj)
        if (typeof obj[key] === 'object')
            freeze_deeply(obj[key]);
    return Object.freeze(obj);
}
export class Options {
    parse_bool(name) {
        switch (this.get_option(name)) {
            case "true": return true;
            case "false": return false;
            case undefined: return null;
        }
        return null;
    }
    get_option(name) {
        return opts_wm.has(this) ? opts_wm.get(this).get(name) : undefined;
    }
    get options() {
        let m = opts_wm.get(this);
        if (!m) {
            m = new Map;
            opts_wm.set(this, m);
        }
        return m;
    }
    static intoJSON(opts) {
        const o = {};
        for (const [k, v] of Array.from(opts).sort())
            if (v === '{}') {
                let c = o;
                for (const ke of k.split('.'))
                    switch (typeof c[ke]) {
                        case 'object':
                            c = c[ke];
                            break;
                        case 'string': throw new SyntaxError('bad key for string');
                        case 'undefined': c = (c[ke] = {});
                    }
            }
            else if (k.includes('.')) {
                let c = o;
                let kv = k.split('.');
                let last = kv.pop();
                for (const ke of kv)
                    switch (typeof c[ke]) {
                        case 'object':
                            c = c[ke];
                            break;
                        case 'string': throw new SyntaxError('bad key for string');
                        case 'undefined': c = (c[ke] = {});
                    }
                c[last] = v;
            }
            else
                o[k] = v;
        return o;
    }
    options_as_object() {
        if (opts_wm.has(this))
            return freeze_deeply(Options.intoJSON(opts_wm.get(this)));
        return $emptyobject;
    }
    toJSON() {
        const j = {};
        for (const k in this) {
            if (Array.isArray(this[k])) {
                //@ts-ignore
                if (this[k].length && 'object' === typeof this[k][0])
                    //@ts-ignore
                    j[k] = Array.from(this[k], v => v.toJSON ? v.toJSON() : v);
                else
                    j[k] = $emptyarray;
            }
            else {
                j[k] = this[k] && ('object' === typeof this[k] ? (
                //@ts-ignore
                'function' === typeof this[k].toJSON ? this[k].toJSON() : this[k]) : this[k]);
            }
        }
        return { ...j, options: this.options_as_object() };
    }
}
export class MessageField extends Options {
    constructor() {
        super(...arguments);
        this.name = '';
        this.type = '';
        this.tag = -1;
        this.map = null;
        this.oneof = '';
        this.required = false;
        this.repeated = false;
        this.deprecated = false;
        this.packed = false;
        this.optional = false;
    }
}
function on_field({ fields }, c) {
    const field = new MessageField;
    while (!c.done)
        switch (c.peek()) {
            case 'repeated':
            case 'required':
            case 'optional':
                {
                    let t = c.next();
                    field.required = t === 'required';
                    field.repeated = t === 'repeated';
                    field.optional = t === 'optional';
                }
                if (c.peek() === 'map')
                    c.syntax_err('map type cannot be prefixed by required or repeated or optional');
                break;
            case 'map':
                field.type = c.assert('map type', 'map', '<') && 'map';
                field.map = {
                    from: c.next(),
                    to: c.assert('map type', ',') && c.next()
                };
                field.name = c.assert('map type', '>') && c.next();
                if (c.peek() !== '=')
                    c.syntax_err('map name must be followed by a tag assignment');
                break;
            //@ts-ignore
            default:
                field.type = c.next();
                field.name = c.next();
                if (c.peek() !== '=')
                    c.syntax_err('tag assignment must follow field name');
            //@ts-ignore
            case '=':
                field.tag = Number.parseInt(c.next(2), 10);
                if (Number.isNaN(field.tag) || field.tag < 0 || field.tag > MAX_RANGE)
                    c.syntax_err(`Invalid tag number in message field: ${field.name}, got ${field.tag}`);
                if (c.peek() === ';')
                    break;
                else if (c.peek() !== '[')
                    c.syntax_err('field tag must be followed by options or end of field');
            //@ts-ignore
            case '[':
                on_inline_options(field, c);
                if (field.parse_bool("packed"))
                    field.packed = true;
                if (field.parse_bool("deprecated"))
                    field.deprecated = true;
                if (c.peek() !== ';')
                    c.syntax_err('field must end with semicolon');
            case ';':
                if (field.name === '')
                    c.syntax_err('Missing field name');
                if (field.type === '')
                    c.syntax_err(`Missing type in message field: ${field.name}`);
                if (field.tag === -1)
                    c.syntax_err(`Missing tag number in message field: ${field.name}`);
                field.tag >>>= 0;
                fields.push(field);
                c.assert('field ends with semicolon', ';');
                return field;
        }
    throw new Error('No ; found to close message field');
}
function on_inline_options({ options }, c) {
    while (!c.done)
        switch (c.peek()) {
            case '[':
            //@ts-ignore
            case ',':
                {
                    let name = c.next(2);
                    if (name === '(') {
                        name = c.next();
                        c.assert('parentheses closed name', ')');
                    }
                    if (c.peek()[0] === '.')
                        name += c.next();
                    c.assert('inline options assignment', '=');
                    if (c.peek() === ']')
                        c.syntax_err(`Unexpected ] in field option in ${name}`);
                    let value = c.next();
                    if (value === '{') {
                        value = '{}';
                        on_map_options(options, name, c);
                    }
                    options.set(name, value);
                }
                if (c.peek() === ',')
                    break;
                else if (c.peek() !== ']')
                    c.syntax_err('inline options must close or continue after a value');
            case ']':
                c.assert('inline options close', ']');
                return;
            default:
                c.syntax_err('field options has no closing tag');
        }
    throw new SyntaxError('No closing tag for field options');
}
export function on_package_name(schema, t) {
    schema.package = t.next(2);
    t.assert('package name closing semicolon', ';');
    return schema.package;
}
export function on_syntax_version(schema, n) {
    n.assert('syntax version assignment', 'syntax', '=');
    switch (n.next()) {
        case '"proto2"':
        case "'proto2'":
            n.assert("syntax version closing semicolon", ";");
            schema.syntax = 2;
            return 2;
        case '"proto3"':
        case "'proto3'":
            n.assert("syntax version closing semicolon", ";");
            schema.syntax = 3;
            return 3;
    }
    throw new SyntaxError(`${n.peek(-1)} is not a valid protobuf syntax version`);
}
function on_map_options(options, prefix, n) {
    let paren = false;
    while (!n.done)
        switch (n.peek()) {
            case '}':
                n.next();
                return;
            case ';': throw n.syntax_err('Unexpected end of map options');
            //@ts-ignore
            case '(':
                n.next();
                paren = true;
            default: {
                let key = `${prefix}.${n.next()}`;
                if (options.has(key))
                    n.syntax_err(`Duplicate option named ${key} on same options value`);
                if (paren)
                    n.assert('map options paren', ')');
                if (n.peek() === ':')
                    n.next();
                if (n.peek() === '{') {
                    n.next();
                    on_map_options(options, key, n);
                    let l = key.lastIndexOf('.');
                    while (l > -1 && key) {
                        key = key.slice(0, l);
                        l = key.lastIndexOf('.');
                        if (options.has(key) && options.get(key) !== '{}')
                            n.syntax_err(`Duplicate option named ${key} on same options value`);
                        else
                            options.set(key, '{}');
                    }
                }
                else
                    options.set(key, n.next());
                if (n.peek() === ';')
                    n.next();
                paren = false;
            }
        }
}
export function on_option({ options }, n) {
    let key = '', value = '', paren = false;
    while (!n.done)
        switch (n.next()) {
            case ';':
                if (options.has(key) && options.get(key) !== '{}')
                    n.syntax_err(`Duplicate option named ${key} on same options value`);
                if (key.includes('.')) {
                    options.set(key, value);
                    let l = key.lastIndexOf('.');
                    while (l > -1 && key) {
                        key = key.slice(0, l);
                        l = key.lastIndexOf('.');
                        if (options.has(key) && options.get(key) !== '{}')
                            n.syntax_err(`Duplicate option named ${key} on same options value`);
                        else
                            options.set(key, '{}');
                    }
                }
                else
                    options.set(key, value);
                return;
            case 'option':
                paren = n.peek() === '(';
                key = n.next(paren ? 2 : 1);
                if (paren)
                    n.assert('parenthesised options', ')');
                if (n.peek()[0] === '.')
                    key += n.next();
                break;
            case '=':
                if (key === '')
                    n.syntax_err(`Name must be provided for option with value ${n.peek()}`);
                value = n.next();
                if (key === 'optimize_for')
                    switch (value) {
                        default: throw new SyntaxError(`Unexpected value for option optimize_for: ${value}`);
                        case 'SPEED':
                        case 'CODE_SIZE':
                        case 'LITE_RUNTIME':
                    }
                else if (value === '{') {
                    value = '{}';
                    on_map_options(options, key, n);
                }
                break;
        }
}
export class EnumValue extends Options {
    constructor(name, value) {
        super();
        this.name = name;
        this.value = value;
    }
}
export class Enum extends Options {
    constructor(name) {
        super();
        this.name = name;
        this.enums = [];
        this.values = [];
        this.allow_alias = false;
    }
}
function on_enum_value({ values }, n) {
    while (!n.done)
        switch (n.peek()) {
            case 'reserved':
                // nop until we eat through a semicolon
                while (n.next() !== ';')
                    ;
                return;
            default: {
                let name = n.next();
                n.assert('enum value', '=');
                let value = Number.parseInt(n.next(), 10);
                if (isNaN(value))
                    n.syntax_err(`Enum value with name ${name} must not parse as NaN, original is ${n.peek(-1)}`);
                if (value > 2147483647)
                    n.syntax_err(`Enum value must not be greater than the 32 bit signed integer limit`);
                value |= 0;
                if (value < 0)
                    n.syntax_err(`Enum value must be greater than or equal to 0`);
                let ret = new EnumValue(name, value);
                if (n.peek() === '[')
                    on_inline_options(ret, n);
                n.assert('enum value closing semicolon', ';');
                values.push(ret);
                return ret;
            }
        }
    throw new SyntaxError(`enum value was not closed before token completion of file`);
}
;
export function on_enum({ enums }, n, l) {
    const en = new Enum(n.next(2));
    n.assert('next is opening bracket', '{');
    while (!n.done)
        switch (n.peek()) {
            case 'option':
                on_option(en, n);
                if (en.parse_bool("allow_alias"))
                    en.allow_alias = true;
                break;
            case '}':
                n.next(n.peek(0) === ';' ? 2 : 1);
                enums.push(en);
                l.push({ name: en.name, is: 'enum', value: en });
                return en;
            default:
                on_enum_value(en, n);
        }
    throw new SyntaxError(`enum was not closed before completion of file`);
}
export class Message extends Options {
    constructor(name) {
        super();
        this.name = name;
        this.enums = [];
        this.extends = [];
        this.messages = [];
        this.fields = [];
        this.extensions = null;
    }
}
export function on_message({ messages }, c, l) {
    const m = new Message(c.next(2));
    let lvl = 0;
    while (!c.done)
        switch (c.peek()) {
            case '{':
                ++lvl;
                c.next();
                break;
            case 'map':
            case 'required':
            case 'optional':
            case 'repeated':
                on_field(m, c);
                break;
            case 'enum':
                {
                    const e = on_enum(m, c, l);
                    l.push({ name: `${m.name}.${e.name}`, is: 'enum', value: e });
                }
                break;
            case 'message':
                {
                    const me = on_message(m, c, l);
                    l.push({ name: `${m.name}.${me.name}`, is: 'message', value: me });
                }
                break;
            case 'extensions':
                on_extensions(m, c);
                break;
            case 'oneof':
                {
                    let name = c.next(2);
                    c.assert('oneof', '{');
                    while (c.peek() !== '}') {
                        const field = on_field(m, c);
                        field.oneof = name;
                        field.optional = true;
                    }
                    c.next();
                }
                break;
            case 'extend':
                on_extend(m, c, l);
                break;
            case ';':
                c.next();
                break;
            case 'reserved':
                do
                    c.next();
                while (c.peek() !== ';');
                break;
            case 'option':
                on_option(m, c);
                break;
            default:
                on_field(m, c).optional = true;
                break;
            case '}':
                c.next();
                if (!--lvl) {
                    messages.push(m);
                    l.push({ name: m.name, is: "message", value: m });
                    return m;
                }
                break;
        }
    throw new SyntaxError(`message was not closed before token completion of file`);
}
function on_extensions(m, c) {
    const from = Number.parseInt(c.next(2), 10);
    if (isNaN(from))
        c.syntax_err(`Invalid "from" value in extensions definition`);
    if (c.next() !== 'to')
        c.syntax_err("Expected keyword 'to' in extensions definition");
    let sto = c.next();
    const to = sto === 'max' ? MAX_RANGE : Number.parseInt(sto, 10);
    if (isNaN(to))
        c.syntax_err(`Invalid "to" value in extensions definition`);
    c.assert('extensions definition', ';');
    m.extensions = { from, to };
}
export class Extends extends Options {
    constructor(name) {
        super();
        this.name = name;
        this.messages = [];
        this.enums = [];
        this.fields = [];
    }
}
export function on_extend({ extends: ex }, c, l) {
    let e = new Extends(c.peek(1));
    const msg = on_message({ messages: [] }, c, l);
    if (msg.extends.length)
        c.syntax_err(`Cannot use an extends operator inside an extend key`);
    if (msg.extensions)
        c.syntax_err(`Cannot set extensions on an extend key`);
    e.messages.push(...msg.messages);
    e.fields.push(...msg.fields);
    e.enums.push(...msg.enums);
    ex.push(e);
    l.push({ name: e.name, is: "extends", value: e });
    return e;
}
export function on_import({ imports }, c) {
    let file = c.next(2).replace(/^(?:"([^"]+)"|'([^']+)')$/, '$1$2');
    c.assert('after import', ';');
    imports.push(file);
}
export class RPC extends Options {
    constructor(name) {
        super();
        this.name = name;
        this.input_type = '';
        this.output_type = '';
        this.client_streaming = false;
        this.server_streaming = false;
    }
}
export class Service extends Options {
    constructor(name) {
        super();
        this.name = name;
        this.methods = [];
    }
}
export function on_service({ services }, c) {
    const serv = new Service(c.next(2));
    c.assert('service open', '{');
    while (!c.done)
        switch (c.peek()) {
            case 'option':
                on_option(serv, c);
                break;
            //@ts-ignore
            case 'rpc':
                on_rpc(serv, c);
                if (c.peek() !== '}')
                    break;
            case '}':
                c.next();
                if (c.peek() === ';')
                    c.next();
                services.push(serv);
                return;
        }
}
function on_rpc({ methods }, c) {
    const rpc = new RPC(c.next(2));
    c.assert("RPC", '(');
    if (c.peek() === 'stream') {
        rpc.client_streaming = true;
        c.next();
    }
    rpc.input_type = c.next();
    c.assert("RPC", ')', 'returns', '(');
    if (c.peek() === 'stream') {
        rpc.server_streaming = true;
        c.next();
    }
    rpc.output_type = c.next();
    c.assert("RPC", ')');
    while (!c.done)
        switch (c.peek()) {
            //@ts-ignore fallthroughCaseInSwitch
            case '{':
                c.assert('rpc option open', '{');
                if (c.peek() === '}')
                    break;
                else if (c.peek() !== 'option')
                    c.syntax_err(`rpc options must be followed by closing or option tag`);
            //@ts-ignore fallthroughCaseInSwitch
            case 'option':
                on_option(rpc, c);
                if (c.peek() === 'option')
                    break;
            //@ts-ignore fallthroughCaseInSwitch
            case '}':
                c.assert('rpc options close', '}');
            case ';':
                if (c.peek() === ';')
                    c.next();
                methods.push(rpc);
                return rpc;
        }
    throw new Error('No closing tag for rpc');
}
export class TokenCount {
    constructor(tokens) {
        this.tokens = tokens;
        this.t = 0;
        this.l = tokens.length;
        this.done = this.l === 0;
    }
    assert(name, next, ...further) {
        for (const tk of [next, ...further])
            if (tk !== this.next())
                this.syntax_err(`Unexpected ${name} token: ${this.peek(-1)} (expected ${tk})`);
        return true;
    }
    peek(n = 0) {
        return this.tokens[this.t + n];
    }
    next(n = 1) {
        if (n < 1)
            throw new RangeError();
        this.done = this.l === (this.t += n);
        return this.tokens[this.t - 1];
    }
    syntax_err(str) {
        throw new SyntaxError(str + ` [around token ${this.t} "${this.peek()}"]`);
    }
}
//# sourceMappingURL=parser-internals.js.map
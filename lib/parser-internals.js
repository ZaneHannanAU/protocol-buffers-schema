"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MAX_RANGE = 0x1FFFFFFF;
// "Only repeated fields of primitive numeric types (types which use the varint, 32-bit, or 64-bit wire types) can be declared "packed"."
exports.PACKABLE_TYPES = Object.freeze([
    // varint wire types
    'int32', 'int64', 'uint32', 'uint64', 'sint32', 'sint64', 'bool',
    // + ENUMS
    // 64-bit wire types
    'fixed64', 'sfixed64', 'double',
    // 32-bit wire types
    'fixed32', 'sfixed32', 'float'
]);
exports.MAP_TYPES = Object.freeze([
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
const parse_bool = (m, s, n) => {
    if (m.options.has(s))
        switch (m.options.get(s)) {
            case "true": return true;
            case "false": return false;
            default: n.syntax_err(`Cannot convert value of ${s} (${m.options.get(s)}) to boolean`);
        }
    return false;
};
const opts_wm = new WeakMap();
const $emptyarray = Object.freeze([]);
class Options {
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
                for (const v of k.split('.'))
                    c = ('object' === typeof c[v] ? c[v] : (c[v] = {}));
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
        if (opts_wm.has(this))
            return { ...j, options: Options.intoJSON(opts_wm.get(this)) };
        else
            return { ...j, options: {} };
    }
}
exports.Options = Options;
class MessageField extends Options {
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
exports.MessageField = MessageField;
function on_field({ fields }, c) {
    const field = new MessageField;
    while (!c.done)
        switch (c.peek()) {
            case '=':
                field.tag = Number(c.next(2));
                break;
            case 'map':
                field.type = c.assert('map type', 'map', '<') && 'map';
                field.map = {
                    from: c.next(),
                    to: c.assert('map type', ',') && c.next()
                };
                field.name = c.assert('map type', '>') && c.next();
                break;
            case 'repeated':
            case 'required':
            case 'optional':
                {
                    let t = c.next();
                    field.required = t === 'required';
                    field.repeated = t === 'repeated';
                    field.type = c.next();
                    field.name = c.next();
                }
                break;
            case '[':
                on_inline_options(field, c);
                field.packed = parse_bool(field, "packed", c);
                field.deprecated = parse_bool(field, "deprecated", c);
                break;
            case ';':
                if (field.name === '')
                    throw new SyntaxError('Missing field name');
                if (field.type === '')
                    throw new SyntaxError(`Missing type in message field: ${field.name}`);
                if (field.tag === -1)
                    throw new SyntaxError(`Missing tag number in message field: ${field.name}`);
                fields.push(field);
                c.next();
                return field;
            default:
                field.type = c.next();
                field.name = c.next();
                break;
        }
    throw new Error('No ; found for message field');
}
function on_inline_options({ options }, c) {
    while (!c.done)
        switch (c.peek()) {
            case '[':
            case ',':
                {
                    let name = c.next(2);
                    if (name === '(') {
                        name = c.next();
                        c.next();
                    }
                    c.assert('inline options', '=');
                    if (c.peek() === ']')
                        throw new SyntaxError(`Unexpected ] in field option in ${name}`);
                    let value = c.next();
                    options.set(name, value);
                }
                break;
            case ']':
                c.next();
                return;
            default:
                c.assert('field options', '');
        }
    throw new SyntaxError('No closing tag for field options');
}
function on_package_name(schema, t) {
    schema.package = t.next(2);
    t.assert('package name', ';');
    return schema.package;
}
exports.on_package_name = on_package_name;
function on_syntax_version(schema, n) {
    n.assert('syntax version assignment', 'syntax', '=');
    switch (n.next()) {
        case '"proto2"':
        case "'proto2'":
            n.assert("syntax version", ";");
            schema.syntax = 2;
            return 2;
        case '"proto3"':
        case "'proto3'":
            n.assert("syntax version", ";");
            schema.syntax = 3;
            return 3;
    }
    throw new SyntaxError(`${n.peek(-1)} is not a valid protobuf syntax version`);
}
exports.on_syntax_version = on_syntax_version;
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
function on_option({ options }, n) {
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
exports.on_option = on_option;
class EnumValue extends Options {
    constructor(name, value) {
        super();
        this.name = name;
        this.value = value;
    }
}
exports.EnumValue = EnumValue;
class Enum extends Options {
    constructor(name) {
        super();
        this.name = name;
        this.enums = [];
        this.values = [];
        this.allow_alias = false;
    }
}
exports.Enum = Enum;
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
                let value = +n.next();
                let ret = new EnumValue(name, value);
                if (n.peek() === '[')
                    on_inline_options(ret, n);
                n.assert('enum value', ';');
                values.push(ret);
                return ret;
            }
        }
    throw new SyntaxError(`enum value was not closed before token completion of file`);
}
;
function on_enum({ enums }, n, l) {
    const en = new Enum(n.next(2));
    n.next();
    while (!n.done)
        switch (n.peek()) {
            case 'option':
                on_option(en, n);
                en.allow_alias = parse_bool(en, "allow_alias", n);
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
exports.on_enum = on_enum;
class Message extends Options {
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
exports.Message = Message;
function on_message({ messages }, c, l) {
    const m = new Message(c.next(2));
    let lvl = 0;
    while (!c.done)
        switch (c.peek()) {
            case '{':
                ++lvl;
                c.next();
                break;
            case '}':
                c.next();
                if (!--lvl) {
                    messages.push(m);
                    l.push({ name: m.name, is: "message", value: m });
                    return m;
                }
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
            case 'option':
                do
                    c.next();
                while (c.peek() !== ';');
                break;
            default:
                on_field(m, c).optional = true;
                break;
        }
    throw new SyntaxError(`message was not closed before token completion of file`);
}
exports.on_message = on_message;
function on_extensions(m, c) {
    const from = +c.next(2);
    if (isNaN(from))
        c.syntax_err(`Invalid "from" value in extensions definition`);
    if (c.next() !== 'to')
        c.syntax_err("Expected keyword 'to' in extensions definition");
    let sto = c.next();
    const to = sto === 'max' ? MAX_RANGE : +sto;
    if (isNaN(to))
        c.syntax_err(`Invalid "to" value in extensions definition`);
    c.assert('extensions definition', ';');
    m.extensions = { from, to };
}
class Extends extends Options {
    constructor(name, msg) {
        super();
        this.name = name;
        this.msg = msg;
    }
}
exports.Extends = Extends;
function on_extend({ extends: ex }, c, l) {
    let e = new Extends(c.peek(1), on_message({ messages: [] }, c, l));
    ex.push(e);
    l.push({ name: e.name, is: "extends", value: e });
    return e;
}
exports.on_extend = on_extend;
function on_import({ imports }, c) {
    let file = c.next(2).replace(/^(?:"([^"]+)"|'([^']+)')$/, '$1$2');
    c.assert('after import', ';');
    imports.push(file);
}
exports.on_import = on_import;
class RPC extends Options {
    constructor(name) {
        super();
        this.name = name;
        this.input_type = '';
        this.output_type = '';
        this.client_streaming = false;
        this.server_streaming = false;
    }
}
exports.RPC = RPC;
class Service extends Options {
    constructor(name) {
        super();
        this.name = name;
        this.methods = [];
    }
}
exports.Service = Service;
function on_service({ services }, c) {
    const serv = new Service(c.next(2));
    c.assert('service', '{');
    while (!c.done)
        switch (c.peek()) {
            case '}':
                c.next();
                if (c.peek() === ';')
                    c.next();
                services.push(serv);
                return;
            case 'option':
                on_option(serv, c);
                break;
            case 'rpc':
                on_rpc(serv, c);
                break;
        }
}
exports.on_service = on_service;
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
    if (c.peek() === '{')
        while (!c.done)
            switch (c.peek()) {
                case '}':
                    if (c.assert('rpc close', '}') && c.peek() === ';')
                        c.next();
                    methods.push(rpc);
                    return rpc;
                case '{':
                    c.assert('rpc option open', '{');
                    break;
                case 'option':
                    on_option(rpc, c);
                    break;
            }
    else if (c.peek() === ';') {
        c.next();
        methods.push(rpc);
        return rpc;
    }
    throw new Error('No closing tag for rpc');
}
class TokenCount {
    constructor(tokens) {
        this.tokens = tokens;
        this.t = 0;
        this.l = tokens.length;
        this.done = this.l === 0;
    }
    assert(name, ...tks) {
        for (const tk of tks)
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
exports.TokenCount = TokenCount;
//# sourceMappingURL=parser-internals.js.map
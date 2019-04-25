import { Schema } from "./schema";
interface LookupIs {
    "enum": Enum;
    "message": Message;
    "extends": Extends;
}
export interface LookupIn<T extends keyof LookupIs> {
    name: string;
    is: T;
    value: LookupIs[T];
}
export declare type Lookup = LookupIn<keyof LookupIs>[];
export declare const PACKABLE_TYPES: readonly string[];
export declare const MAP_KEY_TYPES: readonly string[];
export declare type NameMappedValueMap = Map<string, string>;
export interface OptionsJSON {
    [s: string]: string | OptionsJSON;
}
export declare class Options {
    parse_bool(name: string): true | false | null;
    readonly options: NameMappedValueMap;
    static intoJSON(opts: NameMappedValueMap): OptionsJSON;
    toJSON(): any;
}
export declare class MessageField extends Options {
    name: string;
    type: string;
    tag: number;
    map: null | {
        from: string;
        to: string;
    };
    oneof: string;
    required: boolean;
    repeated: boolean;
    deprecated: boolean;
    packed: boolean;
    optional: boolean;
}
export declare function on_package_name(schema: Schema, t: TokenCount): string;
export declare function on_syntax_version(schema: Schema, n: TokenCount): 3 | 2;
export declare function on_option<T extends Options>({ options }: T, n: TokenCount): void;
export declare class EnumValue extends Options {
    name: string;
    value: number;
    constructor(name: string, value: number);
}
export declare class Enum extends Options {
    name: string;
    enums: Enum[];
    values: EnumValue[];
    allow_alias: boolean;
    constructor(name: string);
}
export interface Enums {
    enums: Enum[];
}
export declare function on_enum<T extends Enums>({ enums }: T, n: TokenCount, l: Lookup): Enum;
export declare class Message extends Options {
    name: string;
    enums: Enum[];
    extends: Extends[];
    messages: Message[];
    fields: MessageField[];
    extensions: null | {
        from: number;
        to: number;
    };
    constructor(name: string);
}
export interface Messages {
    messages: Message[];
}
export declare function on_message<T extends Messages>({ messages }: T, c: TokenCount, l: Lookup): Message;
export declare class Extends extends Options {
    name: string;
    messages: Message[];
    enums: Enum[];
    fields: MessageField[];
    constructor(name: string);
}
interface Extendss {
    extends: Extends[];
}
export declare function on_extend<T extends Extendss>({ extends: ex }: T, c: TokenCount, l: Lookup): Extends;
export declare function on_import({ imports }: Schema, c: TokenCount): void;
export declare class RPC extends Options {
    name: string;
    constructor(name: string);
    input_type: string;
    output_type: string;
    client_streaming: boolean;
    server_streaming: boolean;
}
export declare class Service extends Options {
    name: string;
    constructor(name: string);
    methods: RPC[];
}
export declare function on_service({ services }: Schema, c: TokenCount): void;
export declare class TokenCount {
    private tokens;
    t: number;
    l: number;
    done: boolean;
    constructor(tokens: readonly string[]);
    assert(name: string, next: string, ...further: string[]): true;
    peek(n?: number): string;
    next(n?: number): string;
    syntax_err(str: string): never;
}
export {};
//# sourceMappingURL=parser-internals.d.ts.map
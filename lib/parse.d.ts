import { Enum, Message, Extends } from "./parser-internals";
import { Schema } from "./schema";
export { Schema } from "./schema";
export declare function find_lookup(s: Schema, name: string, is: "enum"): Enum | undefined;
export declare function find_lookup(s: Schema, name: string, is: "message"): Message | undefined;
export declare function find_lookup(s: Schema, name: string, is: "extends"): Extends | undefined;
interface ToString {
    toString(): string;
}
export declare function parse<T extends ToString>(from: T): Schema;
export default parse;
//# sourceMappingURL=parse.d.ts.map
import { LookupIn } from "./parser-internals";
import { Schema } from "./schema";
export declare const exported_interfaces: WeakMap<Schema, LookupIn<"message" | "enum" | "extends">[]>;
interface ToString {
    toString(): string;
}
export declare function parse<T extends ToString>(from: T): Schema;
export default parse;
//# sourceMappingURL=parse.d.ts.map
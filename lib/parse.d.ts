import { Enum, Message, Extends, LookupIn } from "./parser-internals";
import { Schema } from "./schema";
export { Schema } from "./schema";
export declare function find_lookup(s: Schema, name: string, is: "enum"): Enum | undefined;
export declare function find_lookup(s: Schema, name: string, is: "message"): Message | undefined;
export declare function find_lookup(s: Schema, name: string, is: "extends"): Extends | undefined;
export declare function find_lookups(schema: Schema, is: "enum"): IterableIterator<Enum>;
export declare function find_lookups(schema: Schema, is: "message"): IterableIterator<Message>;
export declare function find_lookups(schema: Schema, is: "extends"): IterableIterator<Extends>;
export declare function find_lookups(schema: Schema, is?: "any"): IterableIterator<LookupIn<"message" | "enum" | "extends">>;
export declare function ancestors_of(child: Enum | Message): IterableIterator<Message>;
interface ToString {
    toString(): string;
}
export declare function parse<T extends ToString>(from: T): Schema;
export default parse;
//# sourceMappingURL=parse.d.ts.map
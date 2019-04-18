import { Schema } from "./schema";
interface ToString {
    toString(): string;
}
export declare function parse<T extends ToString>(from: T): Schema;
export default parse;
//# sourceMappingURL=parse.d.ts.map
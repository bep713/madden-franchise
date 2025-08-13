import M20FTCFileStrategy from "./M20FTCFileStrategy.js";
import M20FTCTableStrategy from "./M20FTCTableStrategy.js";
import M20FTCTable2FieldStrategy from "./M20FTCTable2FieldStrategy.js";
import M24Table3Strategy from "../../franchise/m24/M24Table3FieldStrategy.js";
export const name = 'M20FTCStrategy';
export { M20FTCFileStrategy as file };
export { M20FTCTableStrategy as table };
export { M20FTCTable2FieldStrategy as table2Field };
export { M24Table3Strategy as table3Field };
export default {
    name,
    file: M20FTCFileStrategy,
    table: M20FTCTableStrategy,
    table2Field: M20FTCTable2FieldStrategy,
    table3Field: M24Table3Strategy
};

import M19FTCFileStrategy from "./M19FTCFileStrategy.js";
import M19FTCTableStrategy from "./M19FTCTableStrategy.js";
import M19FTCTable2FieldStrategy from "./M19FTCTable2FieldStrategy.js";
import M24Table3Strategy from "../../franchise/m24/M24Table3FieldStrategy.js";
export const name = 'M19FTCStrategy';
export { M19FTCFileStrategy as file };
export { M19FTCTableStrategy as table };
export { M19FTCTable2FieldStrategy as table2Field };
export { M24Table3Strategy as table3Field };
export default {
    name,
    file: M19FTCFileStrategy,
    table: M19FTCTableStrategy,
    table2Field: M19FTCTable2FieldStrategy,
    table3Field: M24Table3Strategy
};

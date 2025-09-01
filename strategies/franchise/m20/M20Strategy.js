import M20FileStrategy from "./M20FileStrategy.js";
import M20TableStrategy from "./M20TableStrategy.js";
import M20Table2FieldStrategy from "./M20Table2FieldStrategy.js";
import M24Table3FieldStrategy from "../m24/M24Table3FieldStrategy.js";
export const name = 'M20Strategy';
export { M20FileStrategy as file };
export { M20TableStrategy as table };
export { M20Table2FieldStrategy as table2Field };
export { M24Table3FieldStrategy as table3Field };
export default {
    name,
    file: M20FileStrategy,
    table: M20TableStrategy,
    table2Field: M20Table2FieldStrategy,
    table3Field: M24Table3FieldStrategy
};

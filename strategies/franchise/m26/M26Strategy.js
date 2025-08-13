import M20FileStrategy from "../m20/M20FileStrategy.js";
import M24TableStrategy from "../m24/M24TableStrategy.js";
import M20Table2FieldStrategy from "../m20/M20Table2FieldStrategy.js";
import M26Table3FieldStrategy from "./M26Table3FieldStrategy.js";
export const name = 'M26Strategy';
export { M20FileStrategy as file };
export { M24TableStrategy as table };
export { M20Table2FieldStrategy as table2Field };
export { M26Table3FieldStrategy as table3Field };
export default {
    name,
    file: M20FileStrategy,
    table: M24TableStrategy,
    table2Field: M20Table2FieldStrategy,
    table3Field: M26Table3FieldStrategy
};

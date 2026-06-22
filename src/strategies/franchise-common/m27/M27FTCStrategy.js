import M20FTCFileStrategy from '../m20/M20FTCFileStrategy.js';
import M20FTCTableStrategy from '../m20/M20FTCTableStrategy.js';
import M20FTCTable2FieldStrategy from '../m20/M20FTCTable2FieldStrategy.js';
import M26Table3Strategy from '../../franchise/m26/M26Table3FieldStrategy.js';
export const name = 'M20FTCStrategy';
export { M20FTCFileStrategy as file };
export { M20FTCTableStrategy as table };
export { M20FTCTable2FieldStrategy as table2Field };
export { M26Table3Strategy as table3Field };
export default {
    name,
    file: M20FTCFileStrategy,
    table: M20FTCTableStrategy,
    table2Field: M20FTCTable2FieldStrategy,
    table3Field: M26Table3Strategy
};

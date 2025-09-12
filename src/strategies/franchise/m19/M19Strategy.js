import M19FileStrategy from './M19FileStrategy.js';
import M19TableStrategy from './M19TableStrategy.js';
import M19Table2FieldStrategy from './M19Table2FieldStrategy.js';
import M24Table3Strategy from '../m24/M24Table3FieldStrategy.js';
export const name = 'M19Strategy';
export { M19FileStrategy as file };
export { M19TableStrategy as table };
export { M19Table2FieldStrategy as table2Field };
export { M24Table3Strategy as table3Field };
export default {
    name,
    file: M19FileStrategy,
    table: M19TableStrategy,
    table2Field: M19Table2FieldStrategy,
    table3Field: M24Table3Strategy
};

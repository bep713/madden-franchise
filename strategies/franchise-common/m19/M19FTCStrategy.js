const M19FTCFileStrategy = require('./M19FTCFileStrategy');
const M19FTCTableStrategy = require('./M19FTCTableStrategy');
const M19FTCTable2FieldStrategy = require('./M19FTCTable2FieldStrategy');
const M24Table3Strategy = require('../../franchise/m24/M24Table3FieldStrategy');

module.exports = {
    'name': 'M19FTCStrategy',
    'file': M19FTCFileStrategy,
    'table': M19FTCTableStrategy,
    'table2Field': M19FTCTable2FieldStrategy,
    'table3Field': M24Table3Strategy
};
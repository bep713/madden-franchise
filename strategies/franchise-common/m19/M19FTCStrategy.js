const M19FTCFileStrategy = require('./M19FTCFileStrategy');
const M19FTCTableStrategy = require('./M19FTCTableStrategy');
const M19FTCTable2FieldStrategy = require('./M19FTCTable2FieldStrategy');

module.exports = {
    'name': 'FTCStrategy',
    'file': M19FTCFileStrategy,
    'table': M19FTCTableStrategy,
    'table2Field': M19FTCTable2FieldStrategy
};
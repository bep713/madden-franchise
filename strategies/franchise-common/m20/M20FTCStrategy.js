const M20FTCFileStrategy = require('./M20FTCFileStrategy');
const M20FTCTableStrategy = require('./M20FTCTableStrategy');
const M20FTCTable2FieldStrategy = require('./M20FTCTable2FieldStrategy');

module.exports = {
    'name': 'M20FTCStrategy',
    'file': M20FTCFileStrategy,
    'table': M20FTCTableStrategy,
    'table2Field': M20FTCTable2FieldStrategy
};
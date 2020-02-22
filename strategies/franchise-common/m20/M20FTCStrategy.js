const M20FTCFileStrategy = require('./M20FTCFileStrategy');
const M20FTCTableStrategy = require('../../franchise/m20/M20TableStrategy');
const M20FTCTable2FieldStrategy = require('../../franchise/m20/M20Table2FieldStrategy');

module.exports = {
    'name': 'FTCStrategy',
    'file': M20FTCFileStrategy,
    'table': M20FTCTableStrategy,
    'table2Field': M20FTCTable2FieldStrategy
};
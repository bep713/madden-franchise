const M19FileStrategy = require('./M19FileStrategy');
const M19TableStrategy = require('./M19TableStrategy');
const M19Table2FieldStrategy = require('./M19Table2FieldStrategy');
const M24Table3Strategy = require('../m24/M24Table3FieldStrategy');

/**
 * @type {GameStrategy}
 */
module.exports = {
    'name': 'M19Strategy',
    'file': M19FileStrategy,
    'table': M19TableStrategy,
    'table2Field': M19Table2FieldStrategy,
    'table3Field': M24Table3Strategy
};
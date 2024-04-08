const M20FileStrategy = require('./M20FileStrategy');
const M20TableStrategy = require('./M20TableStrategy');
const M20Table2FieldStrategy = require('./M20Table2FieldStrategy');
const M24Table3FieldStrategy = require('../m24/M24Table3FieldStrategy');

/**
 * @type {GameStrategy}
 */
module.exports = {
    'name': 'M20Strategy',
    'file': M20FileStrategy,
    'table': M20TableStrategy,
    'table2Field': M20Table2FieldStrategy,
    'table3Field': M24Table3FieldStrategy
};
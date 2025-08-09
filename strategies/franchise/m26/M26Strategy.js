const M20FileStrategy = require('../m20/M20FileStrategy');
const M24TableStrategy = require('../m24/M24TableStrategy');
const M20Table2FieldStrategy = require('../m20/M20Table2FieldStrategy');
const M26Table3FieldStrategy = require('./M26Table3FieldStrategy');

/**
 * @type {GameStrategy}
 */
module.exports = {
    'name': 'M26Strategy',
    'file': M20FileStrategy,
    'table': M24TableStrategy,
    'table2Field': M20Table2FieldStrategy,
    'table3Field': M26Table3FieldStrategy
};
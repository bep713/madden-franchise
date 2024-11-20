const M20FileStrategy = require('../m20/M20FileStrategy');
const M24TableStrategy = require('../m24/M24TableStrategy');
const M20Table2FieldStrategy = require('../m20/M20Table2FieldStrategy');
const M25Table3FieldStrategy = require('./M25Table3FieldStrategy');

/**
 * @type {GameStrategy}
 */
module.exports = {
    'name': 'M24Strategy',
    'file': M20FileStrategy,
    'table': M24TableStrategy,
    'table2Field': M20Table2FieldStrategy,
    'table3Field': M25Table3FieldStrategy
};
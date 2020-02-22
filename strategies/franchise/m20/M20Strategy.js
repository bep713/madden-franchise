const M20FileStrategy = require('./M20FileStrategy');
const M20TableStrategy = require('./M20TableStrategy');
const M20Table2FieldStrategy = require('./M20Table2FieldStrategy');

module.exports = {
    'name': 'M20Strategy',
    'file': M20FileStrategy,
    'table': M20TableStrategy,
    'table2Field': M20Table2FieldStrategy
};
const M19FileStrategy = require('./M19FileStrategy');
const M19TableStrategy = require('./M19TableStrategy');
const M19Table2FieldStrategy = require('./M19Table2FieldStrategy');

module.exports = {
    'name': 'M19Strategy',
    'file': M19FileStrategy,
    'table': M19TableStrategy,
    'table2Field': M19Table2FieldStrategy
};
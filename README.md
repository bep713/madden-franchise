# madden-franchise
JS API for reading and writing Madden franchise files

## Usage
    const Franchise = require('madden-franchise');

    let franchise = new Franchise([path to file]);

    franchise.on('ready', function () {
      let playerTable = franchise.getTableByName('Player');
      playerTable.readRecords().then(function (table) {
        // records are loaded here
        console.log(table.records[0].FirstName); // or table.getValueByKey('FirstName'), or table.getFieldByKey('FirstName').value
      });

      // OR to read certain fields to save memory...
      playerTable.readRecords(['FirstName', 'LastName']).then(function (table) {
        console.log(table.records[0].FirstName);
      });
    });

    franchise.on('change', function (table) {
      console.log(table.name, 'changed');
    });
    
## Documentation
### Structure
FranchiseFile 1->* FranchiseFileTable 1->* FranchiseFileRecord 1->* FranchiseFileField 1->1 FranchiseFileTable2Field

### FranchiseFile
constructor(filePath [,settings]) - will automatically parse the tables and schema. Will not automatically read records. Emits the 'ready' event when processing is complete.

Franchise file settings  
  
    {
       'saveOnChange': true/false [default: false] // if any field value is changed, the file will be saved automatically. You won't need to call .save() every time.
    }

#### fields
- rawContents - return the Buffer
- filePath - currently opened file path
- schema - returns the FranchiseSchema instance, which contains every schema

#### methods
- parse() - read all tables and schemas. This is done automatically when initializing!
- save(output) - will re-pack and save the file. If output is omitted, it will overwrite the currently opened file.
- packFile(output) - same as save method.
- getTableByName(name) - returns the first table matching the name. There can be multiple tables with the same name.
- getAllTablesByName(name) - returns a list of all tables matching the name.
- getTableById(id) - returns the table matching the id argument.
- getTableByIndex(index) - returns the index-th table in the file.

#### events
- ready - emitted when the tables and schemas have been parsed and the file is ready
- change - emitted after any table has changed (returns changed table as second argument)
- saving - emitted just before the file is saved
- saved - emitted after the file was saved successfully

  
### FranchiseFileTable

#### fields
- records - array of records in the table
- data - raw Buffer data for the table
- offset - table's offset in the file
- name - table's name
- recordsRead - true if the table's records were loaded at least once
- isArray - true if the table is an array store
- header - table's header data
- loadedOffsets - list of offsets currently loaded in the records
- schema - the table's schema definition

#### methods
- readRecords(attributeList) - will load all records in the table to memory. attributeList is a list of strings that defines which fields to load. If omitted, the record will load all fields.

#### events
- change - fired whenever a record emits a 'change' event.

  
### FranchiseFileRecord

#### fields
- fields - list of all fields in the record
- hexData - record's raw Buffer data
- [field key] - returns the formatted value of the FranchiseFileField of given key. Can set the value this way too! Ex: playerTable.records[0].FirstName = 'Matt' will set the FranchiseFileField instance's value, triggering change events.

#### methods
- getFieldByKey(key) - returns the FranchiseFileField object by the given key
- getValueByKey(key) - returns the formatted value of the FranchiseFileField object by given key.

#### events
- change - emitted when a field's value is changed. NOT emitted when string fields are changed.
- table2-change - emitted when a string field's table2 value is changed.

  
### FranchiseFileField

#### fields
- key - the field's name
- value - the field's formatted value (setting this will also set the unformatted value and trigger a change event)
- unformattedValue - the field's value in binary (setting this will also set the value and trigger a change event)
- offset - the field's offset table entry
- secondTableField - the FranchiseFileTable2Field instance associated with the object.

#### events
- change - fired when the value or unformatted value changes NOT fired if the field has a secondTableField
- table2-change - fired when the secondTableField's value changes

  
### FranchiseFileTable2Field

#### fields
- rawIndex - the field's raw binary value
- index - decimal value of the rawIndex
- maxLength - how long the value can be
- unformattedValue - the string value plus padded 0s. Length = maxLength
- value - the trimmed string value
- hexData - field's raw Buffer data

#### events
- change - emitted when the value or unformattedValue changes.

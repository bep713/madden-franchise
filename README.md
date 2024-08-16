# madden-franchise
Read and write Madden Franchise files using NodeJS.

## Usage
    const Franchise = require('madden-franchise');

    let franchise = await Franchise.create([path to file], [options]);
    let table = franchise.getTableByName('Player');

    // Read all records...
    await table.readRecords();
    console.log(table.records[0].FirstName); // Alts: table.getValueByKey('FirstName') or table.getFieldByKey('FirstName').value

    // OR Save time & memory by reading certain fields...
    await table.readRecords(['FirstName', 'LastName'])

    table.records[0].FirstName = 'John';
    table.records[0].LastName = 'Madden';

    await franchise.save();
    
## Documentation
### Supported Games
| Game | Support |
| ---- | ------- |
| Madden 19 | ✅ Full |
| Madden 20 | ✅ Full |
| Madden 21 | ✅ Full |
| Madden 22 | ✅ Full |
| Madden 23 | ✅ Full |
| Madden 24 | ✅ Full |
| Madden 25 | 🟡 Partial (everything except Character Visuals) |

### Quick Start
#### Initializing
(New for v3.3.0): `let franchise = await FranchiseFile.create(filePath, [,settings])` returns a Promise that resolves once the file is ready.

(Old): `new FranchiseFile(filePath, [,settings]).on('ready', file => { // your code here })` the old way still works to preserve backwards compatibility.

#### Franchise File Settings  
  
    {
      // SAVE ON CHANGE
      saveOnChange: true/false [default: false] // if any field value is changed, the file will be saved automatically. You won't need to call .save() every time.

      // SCHEMA OVERRIDE - manually specify a schema version and path to use
      schemaOverride: {
        'major': int,  // the schema major version
        'minor': int,  // the schema minor version
        'gameYear': int, // the Madden year (19 or 20)
        'path': string // path to the schema file
      }

      // SCHEMA DIRECTORY - add a custom directory of schemas for the system to automatically choose from in addition to the bundled ones.
      schemaDirectory: string // path to a directory containing schema files to choose

      // AUTO PARSE - specify if you want the system to automatically parse all tables in the file, or if you want to explicity call file.parse()
      autoParse: true/false [default: true]

      // AUTO UNEMPTY - specify if you want the system to automatically determine if an empty field should become un-empty once you edit it.
      // Warning: may have unintended side-effects if you batch import. Enable with caution.
      autoUnempty: true/false [default: false]
    }

#### Terminology
| Term | Definition |
| ---- | ---------- |
| FranchiseFile | Represents the file itself |
| FranchiseFileTable | Represents a table within the file |
| FranchiseFileRecord | Represents a record (or row) within a table |
| FranchiseFileField | Represents a field within a record |
| FranchiseFileTable2Field | Usually for String Fields, contains the actual string value |
| FranchiseFileTable3Field | Usually for Binary Blob Fields, contains the actual JSON data |
| FranchiseSchema | Maps the columns to human-readable field names |
| FranchiseEnum | For enum fields, represents a pre-set valid value for a field |
| FranchiseFileSettings | All possible configuration options for reading the file |
| File type | Franchise or FTC, which file type has been loaded |
| FTC | Pre-loaded file within the game files that contains common data |
| Game year | The year on the title of the game. Ex: M24 = 24 |
| Strategy | Custom logic to ensure each file type and game year works properly |

#### Schemas
Schemas define human-readable field (column) names for each table. They make editing files much easier and more straightforward. Schemas are located within the game files and can be found using a tool like `Frosty`.

Ex: a schama defines that the Player table has 300+ fields, that the `FirstName` field is a string containing up to 30 characters, or that the `AwarenessRating` is an integer with a maxValue of 127 (yes, really).

*New for v3.3.0* - the library can support schema-less or partial schemas. Tables will be read with generic field names and each field will default to the `int` data type. This can lead to unexpected results in-game and very likely will cause crashes. Prefer to edit tables with schemas defined unless you are an advanced user.

### Cloning/Forking Guide
1. `npm install` all dependencies
1. Make your changes
1. You can run the 700+ regression tests using `mocha tests\**\*.spec.js`. Test data is included with this repository.

### Extended Docs
#### FranchiseFile
Represents the file as a whole. Contains metadata, list of tables, and allows saving.
##### Fields
| Field name | Description |
| ---------- | ----------- |
| rawContents | (Buffer) the currently opened file buffer |
| filePath | (String) the path to the opened file |
| schema | (FranchiseSchema) List of loaded schemas |
| settings | (FranchiseFileSettings) Settings object |
| type | (String) Represents the file type (franchise or franchise-common) |
| game year | (Number) Represents the year on the game title. M24 = 24 |


##### Functions
| Function name | Description |
| ------------- | ----------- |
| parse() | read all tables and schemas. This is done automatically unless disabled in settings |
| save(output) | will re-pack and save the file. If output is omitted, it will overwrite the currently opened file. |
| packFile(output) | same as save method. |
| getTableByUniqueId(id) | **(Best way to find a table)** returns the table by its globally unique id. These ids do not change between game years and schema versions. |
| getTableByName(name) | returns the first table matching the name. There can be multiple tables with the same name. |
| getAllTablesByName(name) | returns a list of all tables matching the name. |
| getTableById(id) | **(Try not to use)** returns the table matching the id argument. These ids can change per file, schema, or game year. |
| getTableByIndex(index) | returns the index-th table in the file. |
| getReferencedRecord(ref) | returns the record referenced by the argument |
| getReferenceFromAssetId(id) | returns the reference data from the asset id |
| getReferencesToRecord(tableId, rowNum) | returns a list of references to the specified record |

##### Events
| Event name | Description |
| ---------- | ----------- |
| ready | emitted when the tables and schemas have been parsed and the file is ready |
| change | emitted after any table has changed (returns changed table as second argument) |
| saving | emitted just before the file is saved |
| saved | emitted after the file was saved successfully |

  
### FranchiseFileTable
Tables can hold zero or many records. Each table has a capacity defined in its header which denotes the maximum size it can be. In addition, a table may contain empty records.

#### Fields
| Field name | Description |
| ---------- | ----------- |
| data | (Buffer) raw table data |
| offset | (Number) table's offset in the file |
| name | (String) table name |
| recordsRead | (Boolean) true if the table's records are loaded |
| isArray | (Boolean) true if the table is an array store |
| isChanged | (Boolean) true if the data has changed since last save |
| header | (Object) table's header data |
| loadedOffsets | (Array<`Offset`>) list of offsets currently loaded in the records |
| schema | (Schema Object) the table's schema definition |
| records  | (Array<`FranchiseFileRecord`>) all records in the table |
| table2Records | (Array<`FranchiseFileTable2Field`) all table2 fields |
| table3Records | (Array<`FranchiseFileTable3Field`) all table3 fields |
| arraySizes | (Array<Number>) For array stores, the number of items in each record |
| emptyRecords | (Map<Number, Object>) Map of empty records to the next/previous empty record |
| gameYear | (Number) same as the table game year field |
| strategy | (Strategy module) Functions that contain custom logic for the game year |
| hexData | (Buffer) Generates and returns updated data based on changes |

#### Functions
| Function name | Description |
| ------------- | ----------- |
| readRecords(attributeList) | (Promise) will load all records in the table to memory. attributeList is a list of strings that defines which fields to load. If omitted, the record will load all fields. |
| updateBuffer() | (Void) Generates updated data based on changes. Sets `this.data` |
| getBinaryReferenceToRecord(idx) | (Reference object) returns a Ref object pointing to the index-th record |
| replaceRawData(buf, shouldReadRecords) | (Void) Fully replace a table's data with another buffer. Optionally read the buffer records based on the 2nd argument. |
| setNextRecordToUse(index, reset) | **(Advanced - Use with caution)** (Void) Manually set `index` as the next record to use. |
| recalculateEmptyRecordReferences() | **(Advanced - Use with caution)** (Void) Recalculate the empty record map and check if any unreachable records exist to prevent game crashes. |

#### Events
| Event name | Description |
| ---------- | ----------- |
| change | fired whenever a record changes. |

#### Empty Records (Advanced)
Empty records are `null` records that can appear scattered throughout a table. They are captured as `FranchiseFileRecord` objects and can be detected with the `isEmpty` attribute on the record object. 

Think of empty records like a linked list. Each empty record points to the next empty record in the chain. Technically speaking, the first 4 bytes of a record contain the next empty record index while the rest of the record bytes are set to `00`. Due to this, empty record string values may point to the first table2 field so it may initially seem like they are populated with duplicate data but they are not.

Each table's header keeps a reference of the `nextRecordToUse`, which either points to an empty record or equals the number of rows in the table. When a new record needs to be added, the `nextRecordToUse` should be the row that gets populated. Once populated, the header's `nextRecordToUse` will take on the value of the next empty record in the mapping.

The final empty record's reference will equal the number of rows in the table. This means it is the last empty row in the table and no other empty rows exist. The `nextRecordToUse` would then get updated to match the table length. If a new row is to be added and the table capacity is not yet filled, a new row may be inserted. If the table is already at capacity, a new row cannot be added.

##### Example
`nextRecordToUse` is set to row 2. Row 0 is not empty, Row 1 & 2 are empty. Row #2 points to Row #1. Row #1 points to Row #3, which is equal to the number of rows in the table. This means Row #1 is the last empty row that can be filled. Note that the actual length of Field_1 and Field_2 would be 32 bits, or 4 bytes.

| Row # | Field_1 | Field_2 |
| ----- | ------- | ------- |
| 0 | Some Data | Some Other Data |
| 1 | 0000...03 | 0000...0 |
| 2 | 0000...01 | 0000...0 |

When a new row gets populated, the game will place the data in row #2 because it is the `nextRecordToUse`. `nextRecordToUse` gets updated to row 1, because row #2 previously pointed to row #1.

| Row # | Field_1 | Field_2 |
| ----- | ------- | ------- |
| 0 | Some Data | Some Other Data |
| 1 | 0000...03 | 0000...0 |
| 2 | New Data | New Other Data |

If yet another row was added, it would be placed in Row #1. `nextRecordToUse` would get updated to 3 in this case, indicating there are no more empty records.

| Row # | Field_1 | Field_2 |
| ----- | ------- | ------- |
| 0 | Some Data | Some Other Data |
| 1 | Newest Data | Some Other Newest Data |
| 2 | New Data | Other New Data |

### FranchiseFileRecord
A record represents a row in a table. It can have many columns, or fields. Technically speaking, this is a `Proxy` object that allows you to directly access field names as if they were attributes of the object itself and return their respective formatted values.

Ex: a record in the Player table. You can access/write a field by writing `record.FirstName = 'Matt'`.

#### Fields
| Field name | Description |
| ---------- | ----------- |
| data | (Buffer) the raw record data |
| hexData | (Buffer) an alias for the `data` attribute |
| index | (Number) the record index (row number) |
| arraySize | (Number) for array tables, represents the number of items in the array. |
| fields | (Object) A map of fields where the field name is the key and the `FranchiseFileField` is the value. |
| fieldsArray | (Array<`FranchiseFileField`>) An array version of the `fields` attribute. |
| [field key] | (Field data type) The formatted value of the `FranchiseFileField` of given key. Can set data this way too. |
| isChanged | (Boolean) returns true if the record has changed since last save. |
| isEmpty | (Boolean) returns true if the record is empty. (See above) |
| parent | (`FranchiseFileTable`) a reference to the table object containing this record. |

#### Functions
| Function name | Description |
| ------------- | ----------- |
| getFieldByKey(key) | (`FranchiseFileField`) the FranchiseFileField object of the given key |
| getValueByKey(key) | (Field data type) the formatted value of the FranchiseFileField object by given key. |
| getReferenceDataByKey(key) | (Reference object) the reference data contained in the given key |
| empty() | **(Advanced - Use with caution)** (Void) Manually empty the record. |

  
### FranchiseFileField
Fields contain a key and data. The `offset table` determines how each field should read its data from the buffer. Most field values are read as bits and converted to formatted values for easy use in JS.

Ex: a Player's Awareness rating shows as `64` but it is stored in binary as 7 bits with value `1000000`. 
- In this case, the formatted value is  `64` and the unformatted value is a `BitView` instance representing the binary `1000000`.

Note for string and blob field types, `value` will return the string/blob itself from the `table2Field`/`table3Field`, while `unformattedValue` will contain the `BitView` instance of the table2/table3 offset.
- Ex: Player First Name = "Matt". The table1 data will equal the offset of the string in the table2 data. The table2 data will contain the literal string "Matt".

Field values are not loaded by default. Every time their values are accessed/changed, the value is cached for quick future retrieval.

#### Fields
| Field name | Description |
| ---------- | ----------- |
| key | (String) the field's name |
| value | (Field data type) the field's formatted value (setting this will also set the unformatted value and trigger a change event) |
| unformattedValue | (`BitView`) the field's BitView, a representation of data in binary format |
| offset | (`Offset Table` Object) the field's offset table entry |
| parent | (`FranchiseFileRecord`) the record instance containing this field. |
| secondTableField | (`FranchiseFileTable2Field`) if string datatype, the `FranchiseFileTable2Field` instance associated with the object. |
| thirdTableField | (`FranchiseFileTable3Field`) if blob datatype, the `FranchiseFileTable3Field` instance associated with the object. |
| isChanged | (Boolean) true if the data has changed since last save |
| isReference | (Boolean) true if the field is a reference to another field |
| referenceData | (Reference object) the formatted reference object metadata pointing to the referenced field. |

#### Functions
| Function name | Description |
| ------------- | ----------- |
| getValueAs(offset) | *New in v3.3.0* (Offset data type) Return the value as if the field was another datatype, specified in the argument. |
| clearCachedValues() | (Void) clear any cached values |

  
### FranchiseFileTable2Field & FranchiseFileTable3Field
These objects represent the literal string/blob values for their respective fields. Their save behavior is slightly different between Franchise and FTC files:
- Franchise files: Strings always take up the full amount of length defined in the schema. Strings are padded with `00`s.
- FTC files: Strings take up only as much room as they need and are not padded.

#### Fields
| Field name | Description |
| ---------- | ----------- |
| offset | (Number) the `FranchiseFileField`'s offset in table1 data |
| index | (Number) alias for `offset` |
| rawIndex | **(Discouraged use)**  (Number) an old alias for `offset` |
| maxLength | (Number) how long the value can be |
| value | (String/Blob) the trimmed string value |
| unformattedValue | (String/Blob) the string value plus padded 0s. Length = maxLength |
| hexData | (String/Blob) alias for `unformattedValue`. The value stored in the file. |
| parent | (`FranchiseFileTable`) the table containing this instance.
| fieldReference | (`FranchiseFileField`) the field connected to this instance. |
| lengthAtLastSave | (Number) the length of the string/blob at last save. |
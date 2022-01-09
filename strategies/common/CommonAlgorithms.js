let CommonAlgorithms = {};

CommonAlgorithms.save = (units, oldData) => {
    // first check if any records changed. If not, we can return immediately because nothing changed.
    const changedUnits = units.find((unit) => { return unit.isChanged; });

    if (!changedUnits) {
        return oldData;
    }

    // if there are changed records, we need to loop through them all...kinda :)
    let offsetDifference = 0;
    let oldOffsetCounter = 0;
    let bufferArrays = [];

    // Ensure the units are sorted by index in the actual file. Otherwise, we may overwrite data
    units.sort((a, b) => { return a.index - b.index; });

    units.forEach((unit, index) => {
        if (unit.offset === 0 && index > 0) {
            // there are usually trailing records at the end of the table that reference
            // the first offset. Take a look at the Player table for an example of this.
            // There are a bunch of rows at the end where FirstName, LastName, etc...
            // will all point to the very first record.

            // We don't need to worry about these records at all, so just skip them.
            return;
        }

        // Update the record's offset so that it's up to date with the changes.
        // Remember, a record's length can change here...so we need to keep the
        // offsets up to date.
        unit.offset += offsetDifference;

        if (unit.isChanged) {
            // If a record has changed, we want to get all the unchanged data from before this record up until this record
            // in the old data. Take a look at the test cases and add some console logs if you want to see what I mean by this.
            // Basically, we are pushing all the unchanged data directly from the old data, and any new data is inserted in there as well.
            const unchangedDataSinceLastChangedRecord = oldData.slice(oldOffsetCounter, unit.offset - offsetDifference);
            const newHexData = unit.hexData;
            bufferArrays.push(unchangedDataSinceLastChangedRecord, newHexData);

            // Now we need to update our counts so that the above statements work for the rest of the loop.
            oldOffsetCounter = (unit.offset - offsetDifference) + unit.lengthAtLastSave;
            offsetDifference += (newHexData.length - unit.lengthAtLastSave);

            // We update the length at last save so that this algorithm works the next time it's called.
            unit.lengthAtLastSave = newHexData.length;

            unit.isChanged = false;
        }
    });
    
    // Next, we need to push the remainder of data onto the array.

    // For example, think if a user changed the 3rd record out of 100.
    // In the loop, we would push the first 2 records as the unchangedDataSinceLastChangedRecord (since they didn't change!)
    // We would also push the changed 3rd record (newHexData)

    // Now we need to push records 4 to 100. These did not get added in the loop because they didn't change.
    // We'll push them here.
    // console.log(oldOffsetCounter);
    bufferArrays.push(oldData.slice(oldOffsetCounter));

    // Finally, concat all of the arrays into one buffer to return it.
    // Why do all of this BS? Well, concat is an 'expensive' operation. 
    // It's not very efficient and takes a long time comparatively to other methods.
    // So, instead of concat-ing each change record, we will only do it one time here at the end.

    // We also want to reduce the number of items in the bufferArrays as much as possible to save on time.
    // That's why we use the unchangedDataSinceLastChangedRecord to combine a bunch of records that weren't changed together.
    return Buffer.concat(bufferArrays);
}

module.exports = CommonAlgorithms;
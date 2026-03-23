let FranchiseTable2FieldStrategy = {};
FranchiseTable2FieldStrategy.getInitialUnformattedValue = (field, data) => {
    return data.slice(
        field.secondTableField.index,
        field.secondTableField.index + field.offset.maxLength
    );
};
FranchiseTable2FieldStrategy.setUnformattedValueFromFormatted = (
    formattedValue,
    maxLength
) => {
    // Convert formatted value to buffer first to ensure accurate length
    let valueBuffer = Buffer.from(formattedValue);
    if (valueBuffer.length > maxLength) {
        valueBuffer = valueBuffer.subarray(0, maxLength);
    }
    const numberOfNullCharactersToAdd = maxLength - valueBuffer.length;
    const padBuffer = Buffer.alloc(numberOfNullCharactersToAdd, 0);
    valueBuffer = Buffer.concat([valueBuffer, padBuffer]);
    return valueBuffer;
};
export default FranchiseTable2FieldStrategy;

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
    for (let i = 0; i < numberOfNullCharactersToAdd; i++) {
        valueBuffer = Buffer.concat([valueBuffer, Buffer.from([0])]);
    }
    return valueBuffer;
};
export default FranchiseTable2FieldStrategy;

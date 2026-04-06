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
    // We can simply allocate a buffer of maxLength size and then use
    // buffer.write, which automatically handles UTF-8 and truncation
    let valueBuffer = Buffer.alloc(maxLength, 0);
    valueBuffer.write(formattedValue, 0, maxLength, 'utf-8');
    return valueBuffer;
};
export default FranchiseTable2FieldStrategy;

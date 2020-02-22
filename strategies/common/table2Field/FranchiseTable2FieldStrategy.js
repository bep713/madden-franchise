let FranchiseTable2FieldStrategy = {};

FranchiseTable2FieldStrategy.setUnformattedValueFromFormatted = (formattedValue, maxLength) => {
    let valuePadded = formattedValue;
    
    if (formattedValue.length < maxLength) {
      const numberOfNullCharactersToAdd = maxLength - formattedValue.length;
      
      for (let i = 0; i < numberOfNullCharactersToAdd; i++) {
        valuePadded += String.fromCharCode(0);
      }
    }
    
    return valuePadded.split('').map((char) => {
      return char.charCodeAt(0).toString(2).padStart(8, '0');
    }).join('');
};

module.exports = FranchiseTable2FieldStrategy;
const CommonAlgorithms = require('../CommonAlgorithms');

let FTCTableStrategy = {};

FTCTableStrategy.getTable2BinaryData = CommonAlgorithms.save;

FTCTableStrategy.getMandatoryOffsets = (offsets) => {
    return offsets.filter((offset) => { 
        return offset.valueInSecondTable; 
    }).map((offset) => {
        return offset.name;
    });
};

module.exports = FTCTableStrategy;
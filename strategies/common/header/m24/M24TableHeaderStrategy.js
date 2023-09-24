const M20TableHeaderStrategy = require("../m20/M20TableHeaderStrategy");

let M24TableHeaderStrategy = {};

M24TableHeaderStrategy.parseHeader = (data) => {
    let header = M20TableHeaderStrategy.parseHeader(data);
    
    header.table3Length = header.data1Pad3;
    header.hasThirdTable = header.table3Length > 0;
    header.table3StartIndex = header.table2StartIndex + header.table2Length;

    return header;
};

module.exports = M24TableHeaderStrategy;
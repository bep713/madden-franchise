import M20TableHeaderStrategy from '../m20/M20TableHeaderStrategy.js';
let M24TableHeaderStrategy = {};
M24TableHeaderStrategy.parseHeader = (data) => {
    let header = M20TableHeaderStrategy.parseHeader(data);
    const hasThirdTable = header.data1Pad3 !== header.tablePad1;
    header.table3Length = hasThirdTable ? header.data1Pad3 : 0;
    header.hasThirdTable = hasThirdTable;
    header.table3StartIndex = hasThirdTable
        ? header.table2StartIndex + header.table2Length
        : undefined;
    return header;
};
export default M24TableHeaderStrategy;

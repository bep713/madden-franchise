import M20TableHeaderStrategy from "../m20/M20TableHeaderStrategy.js";
let M24TableHeaderStrategy = {};
M24TableHeaderStrategy.parseHeader = (data) => {
    let header = M20TableHeaderStrategy.parseHeader(data);
    header.table3Length = header.data1Pad3;
    header.hasThirdTable = header.table3Length > 0;
    header.table3StartIndex = header.table2StartIndex + header.table2Length;
    return header;
};
export default M24TableHeaderStrategy;

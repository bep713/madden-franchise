import Constants from '../Constants.js';
import M19Strategy from './franchise/m19/M19Strategy.js';
import M20Strategy from './franchise/m20/M20Strategy.js';
import M24Strategy from './franchise/m24/M24Strategy.js';
import M25Strategy from './franchise/m25/M25Strategy.js';
import M26Strategy from './franchise/m26/M26Strategy.js';
import M19FTCStrategy from './franchise-common/m19/M19FTCStrategy.js';
import M20FTCStrategy from './franchise-common/m20/M20FTCStrategy.js';

/**
 * @typedef FileStrategy
 * @property {function(any, any): any} postPackFile
 * @property {function(any, any): any} generateUnpackedContents
 *
 * @typedef {import('../FranchiseFileTable.js').FranchiseFileTableHeader} FranchiseFileTableHeader
 * @typedef TableStrategy
 * @property {function(any): FranchiseFileTableHeader} parseHeader
 * @property {function(any, any, any): {
 *  headerSize: any;
 *  record1Size: any;
 *  table1StartIndex: any;
 *  table2StartIndex: any;
 * }} parseHeaderAttributesFromSchema
 * @property {function(any, any): any[]} getTable2BinaryData
 * @property {function(any, any): any[]} getTable3BinaryData
 * @property {function(any): any[]} getMandatoryOffsets
 * @property {function(any, any): void} recalculateStringOffsets
 * @property {function(any, any): void} recalculateBlobOffsets
 *
 * @typedef Table2FieldStrategy
 * @property {function(any, any): any} getInitialUnformattedValue
 * @property {function(any, any): any} setUnformattedValueFromFormatted
 *
 * @typedef Table3FieldStrategy
 * @property {function(any, any): any} getInitialUnformattedValue
 * @property {function(any): any} getFormattedValueFromUnformatted
 * @property {function(any, any, any): any} setUnformattedValueFromFormatted
 *
 * @typedef GameStrategy
 * @property {string} name
 * @property {FileStrategy} file
 * @property {TableStrategy} table
 * @property {Table2FieldStrategy} table2Field
 * @property {Table3FieldStrategy} table3Field
 */

let StrategyPicker = {};
/**
 * @returns GameStrategy
 */
StrategyPicker.pick = (type) => {
    if (type.format === Constants.FORMAT.FRANCHISE) {
        switch (type.year) {
            case 19:
                return M19Strategy;
            case 20:
            case 21:
            case 22:
            case 23:
            default:
                return M20Strategy;
            case 24:
                return M24Strategy;
            case 25:
                return M25Strategy;
            case 26:
                return M26Strategy;
        }
    } else {
        switch (type.year) {
            case 19:
                return M19FTCStrategy;
            case 20:
            case 21:
            default:
                return M20FTCStrategy;
        }
    }
};
export default StrategyPicker;

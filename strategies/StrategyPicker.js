import Constants from "../Constants.js";
import M19Strategy from "./franchise/m19/M19Strategy.js";
import M20Strategy from "./franchise/m20/M20Strategy.js";
import M24Strategy from "./franchise/m24/M24Strategy.js";
import M25Strategy from "./franchise/m25/M25Strategy.js";
import M26Strategy from "./franchise/m26/M26Strategy.js";
import M19FTCStrategy from "./franchise-common/m19/M19FTCStrategy.js";
import M20FTCStrategy from "./franchise-common/m20/M20FTCStrategy.js";
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
    }
    else {
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

const Constants = require('../Constants');
const M19Strategy = require('./franchise/m19/M19Strategy');
const M20Strategy = require('./franchise/m20/M20Strategy');
const M24Strategy = require('./franchise/m24/M24Strategy');
const M19FTCStrategy = require('./franchise-common/m19/M19FTCStrategy');
const M20FTCStrategy = require('./franchise-common/m20/M20FTCStrategy');

let StrategyPicker = {};

/**
 * @returns GameStrategy
 */
StrategyPicker.pick = (type) => {
    if (type.format === Constants.FORMAT.FRANCHISE) {
        switch(type.year) {
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
        }
    }
    else {
        switch(type.year) {
            case 19:
                return M19FTCStrategy;
            case 20:
            case 21:
            default:
                return M20FTCStrategy;
        }
    }
};

module.exports = StrategyPicker;
import { expect } from 'chai';
import Constants from '../../../src/Constants.js';
import StrategyPicker from '../../../src/strategies/StrategyPicker.js';

describe('Strategy Picker unit tests', () => {
    it('M19', () => {
        let type = {
            'format': Constants.FORMAT.FRANCHISE,
            'compressed': true,
            'year': 19
        }

        const result = StrategyPicker.pick(type);
        expect(result.name).to.equal('M19Strategy');
    });

    it('M20', () => {
        let type = {
            'format': Constants.FORMAT.FRANCHISE,
            'compressed': true,
            'year': 20
        }

        const result = StrategyPicker.pick(type);
        expect(result.name).to.equal('M20Strategy');
    });

    it('M21', () => {
        let type = {
            'format': Constants.FORMAT.FRANCHISE,
            'compressed': true,
            'year': 21
        }

        const result = StrategyPicker.pick(type);
        expect(result.name).to.equal('M20Strategy');
    });

    it('FTC', () => {
        let type = {
            'format': Constants.FORMAT.FRANCHISE_COMMON,
            'compressed': false,
            'year': 20
        }

        const result = StrategyPicker.pick(type);
        expect(result.name).to.equal('M20FTCStrategy');
    });
});
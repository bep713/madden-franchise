import { expect } from 'chai';
import FranchiseFileSettings from '../../src/FranchiseFileSettings.js';

const defaultSettings = {
    'saveOnChange': false,
    'schemaOverride': false,
    'schemaDirectory': false,
    'autoParse': true
};

function checkSettings(settings, args) {
    // Check that the other settings are set automatically to their default values
    // and that any explicitly set settings are maintained.

    for (const setting in defaultSettings) {
        if (args[setting] === null || args[setting] === undefined) {
            expect(settings[setting]).to.eql(defaultSettings[setting]);
        }
        else {
            expect(settings[setting]).to.eql(args[setting]);
        }
    }
};

describe('FranchiseFileSettings unit tests', () => {
    it('default', () => {
        const settings = new FranchiseFileSettings();
        checkSettings(settings, {});
    });

    it('save on change', () => {
        let args = {
            'saveOnChange': true
        };

        const settings = new FranchiseFileSettings(args);
        checkSettings(settings, args);
    });

    it('schemaOverride', () => {
        let args = {
            'schemaOverride': {
                'major': 370,
                'minor': 1,
                'gameYear': 20
            }
        };

        const settings = new FranchiseFileSettings(args);
        checkSettings(settings, args);
    });

    it('schemaDirectory', () => {
        let args = {
            'schemaDirectory': 'C:\\Users\\Test\\Schemas'
        };

        const settings = new FranchiseFileSettings(args);
        checkSettings(settings, args);
    });

    it('autoParse', () => {
        let args = {
            'autoParse': true
        };

        const settings = new FranchiseFileSettings(args);
        checkSettings(settings, args);
    });

    it('all settings', () => {
        let args = {
            'saveOnChange': true,
            'schemaOverride': {
                'major': 370,
                'minor': 1,
                'gameYear': 20
            },
            'schemaDirectory': 'C:\\Users\\Test\\Schemas',
            'autoParse': false
        };

        const settings = new FranchiseFileSettings(args);
        checkSettings(settings, args);
    })
});
import { expect } from 'chai';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import Constants from '../../src/Constants.js';
import schemaPicker from '../../src/services/schemaPicker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const gameTypeSchemaSettings = {
    schemaDirectory: path.join(
        __dirname,
        '..',
        'data',
        'test-schemas',
        'game-type'
    )
};

describe('schema picker game type unit tests', () => {
    it('picks college schema when gameType is college and a college schema exists', () => {
        const schema = schemaPicker.pick(
            27,
            441,
            0,
            gameTypeSchemaSettings,
            Constants.GAME_TYPE.COLLEGE
        );
        expect(path.basename(schema.path)).to.equal('C27_441_0.gz');
    });

    it('picks madden schema when gameType is madden and a madden schema exists', () => {
        const schema = schemaPicker.pick(
            27,
            525,
            0,
            gameTypeSchemaSettings,
            Constants.GAME_TYPE.MADDEN
        );
        expect(path.basename(schema.path)).to.equal('M27_525_0.gz');
    });
});

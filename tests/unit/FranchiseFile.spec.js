const fs = require('fs');
const zlib = require('zlib');
const sinon = require('sinon');
const expect = require('chai').expect;
const proxyquire = require('proxyquire');
const common = require('./common/common');
const Constants = require('../../Constants');

const zlibSpy = {
    'inflateSync': sinon.spy((data) => { return zlib.inflateSync(data); }),
};

const FranchiseFile = proxyquire('../../FranchiseFile', {
    'zlib': zlibSpy
});

const filePaths = {
    'compressed': {
        'm19': 'tests/data/CAREER-19COMPRESS',
        'm20': 'tests/data/CAREER-20COMPRESS'
    },
    'decompressed': {
        'm19': 'tests/data/19UNCOMPRESS.frt',
        'm20': 'tests/data/20UNCOMPRESS.frt'
    },
    'saveTest': {
        'm20': 'tests/data/CAREER-TESTSAVE'
    },
    'ftc': {
        'tuningCompressed': 'tests/data/FTC_COMPRESS.FTC',
        'tuningDecompressed': 'tests/data/FTC_UNCOMPRESS'
    }
};

const files = {
    'compressed': {
        'm19': fs.readFileSync(filePaths.compressed.m19),
        'm20': fs.readFileSync(filePaths.compressed.m20)
    },
    'decompressed': {
        'm19': fs.readFileSync(filePaths.decompressed.m19),
        'm20': fs.readFileSync(filePaths.decompressed.m20)
    },
    'ftc': {
        'tuningCompressed': fs.readFileSync(filePaths.ftc.tuningCompressed),
        'tuningDecompressed': fs.readFileSync(filePaths.ftc.tuningDecompressed)
    },
}

const franchiseFileOptions = {
    'autoParse': false
};

describe('Franchise File unit tests', () => {
    beforeEach(() => {
        zlibSpy.inflateSync.resetHistory();
    });

    describe('can identify a file\'s type', () => {
        it('Decompressed M19', () => {
            const file = new FranchiseFile(filePaths.decompressed.m19, franchiseFileOptions);
            expect(file.type).to.eql({
                'format': Constants.FORMAT.FRANCHISE,
                'compressed': false,
                'year': 19
            });
        });

        it('Compressed M19', () => {
            const file = new FranchiseFile(filePaths.compressed.m19, franchiseFileOptions);
            expect(file.type).to.eql({
                'format': Constants.FORMAT.FRANCHISE,
                'compressed': true,
                'year': 19
            });
        });

        it('Decompressed M20', () => {
            const file = new FranchiseFile(filePaths.decompressed.m20, franchiseFileOptions);
            expect(file.type).to.eql({
                'format': Constants.FORMAT.FRANCHISE,
                'compressed': false,
                'year': 20
            });
        });

        it('Compressed M20', () => {
            const file = new FranchiseFile(filePaths.compressed.m20, franchiseFileOptions);
            expect(file.type).to.eql({
                'format': Constants.FORMAT.FRANCHISE,
                'compressed': true,
                'year': 20
            });
        });

        it('Compressed FTC', () => {
            const file = new FranchiseFile(filePaths.ftc.tuningCompressed, franchiseFileOptions);
            expect(file.type).to.eql({
                'format': Constants.FORMAT.FRANCHISE_COMMON,
                'compressed': true,
                'year': 20
            });
        });

        it('Decompressed FTC', () => {
            const file = new FranchiseFile(filePaths.ftc.tuningDecompressed, franchiseFileOptions);
            expect(file.type).to.eql({
                'format': Constants.FORMAT.FRANCHISE_COMMON,
                'compressed': false,
                'year': 20
            });
        });
    });

    describe('can parse the schema version in the file', () => {
        it('Decompressed M19', () => {
            const file = new FranchiseFile(filePaths.decompressed.m19, franchiseFileOptions);
            expect(file.expectedSchemaVersion).to.eql({
                'major': 0,
                'minor': 0,
                'gameYear': 19
            });
        });

        it('Compressed M19', () => {
            const file = new FranchiseFile(filePaths.compressed.m19, franchiseFileOptions);
            expect(file.expectedSchemaVersion).to.eql({
                'major': 95,
                'minor': 7,
                'gameYear': 19
            });
        });

        it('Decompressed M20', () => {
            const file = new FranchiseFile(filePaths.decompressed.m20, franchiseFileOptions);
            expect(file.expectedSchemaVersion).to.eql({
                'major': 342,
                'minor': 1,
                'gameYear': 20
            });
        });

        it('Compressed M20', () => {
            const file = new FranchiseFile(filePaths.compressed.m20, franchiseFileOptions);
            expect(file.expectedSchemaVersion).to.eql({
                'major': 342,
                'minor': 1,
                'gameYear': 20
            });
        });

        it('Compressed FTC', () => {
            const file = new FranchiseFile(filePaths.ftc.tuningCompressed, franchiseFileOptions);
            expect(file.expectedSchemaVersion).to.eql({
                'major': 371,
                'minor': 2,
                'gameYear': 20
            });
        });

        it('Decompressed FTC', () => {
            const file = new FranchiseFile(filePaths.ftc.tuningDecompressed, franchiseFileOptions);
            expect(file.expectedSchemaVersion).to.eql({
                'major': 371,
                'minor': 2,
                'gameYear': 20
            });
        });
    });

    describe('can uncompress a compressed file', () => {
        it('Decompressed M19', () => {
            // don't need to call zlib because data is decompressed

            const file = new FranchiseFile(filePaths.decompressed.m19, franchiseFileOptions);
            expect(file.packedFileContents).to.be.undefined;
            common.hashCompare(file.unpackedFileContents, files.decompressed.m19);
            expect(zlibSpy.inflateSync.called).to.be.false;
        });

        it('Compressed M19', () => {
            const file = new FranchiseFile(filePaths.compressed.m19, franchiseFileOptions);
            common.hashCompare(file.packedFileContents, files.compressed.m19);
            expect(file.unpackedFileContents).to.not.be.undefined;
            expect(zlibSpy.inflateSync.calledOnce).to.be.true;
            expect(zlibSpy.inflateSync.args[0][0].slice(0, 2)).to.eql(Buffer.from([0x78, 0x9C]));
        });

        it('Decompressed M20', () => {
            const file = new FranchiseFile(filePaths.decompressed.m20, franchiseFileOptions);
            expect(file.packedFileContents).to.be.undefined;
            common.hashCompare(file.unpackedFileContents, files.decompressed.m20);
            expect(zlibSpy.inflateSync.called).to.be.false;
        });

        it('Compressed M20', () => {
            const file = new FranchiseFile(filePaths.compressed.m20, franchiseFileOptions);
            common.hashCompare(file.packedFileContents, files.compressed.m20);
            expect(file.unpackedFileContents).to.not.be.undefined;
            expect(zlibSpy.inflateSync.calledOnce).to.be.true;
            expect(zlibSpy.inflateSync.args[0][0].slice(0, 2)).to.eql(Buffer.from([0x78, 0x9C]));
        });

        it('Compressed FTC', () => {
            const file = new FranchiseFile(filePaths.ftc.tuningCompressed, franchiseFileOptions);
            common.hashCompare(file.packedFileContents, files.ftc.tuningCompressed);
            expect(file.unpackedFileContents).to.not.be.undefined;
            expect(zlibSpy.inflateSync.calledOnce).to.be.true;
            expect(zlibSpy.inflateSync.args[0][0].slice(0, 2)).to.eql(Buffer.from([0x78, 0x9C]));
        });

        it('Decompressed FTC', () => {
            const file = new FranchiseFile(filePaths.ftc.tuningDecompressed, franchiseFileOptions);
            expect(file.packedFileContents).to.be.undefined;
            common.hashCompare(file.unpackedFileContents, files.ftc.tuningDecompressed);
            expect(zlibSpy.inflateSync.called).to.be.false;
        });
    });
});
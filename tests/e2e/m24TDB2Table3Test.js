const FranchiseFile = require('../FranchiseFile');
const fs = require('fs');

const franchise = new FranchiseFile('../data/CAREER-24Table3TDB2Data');

franchise.on('ready', async function () {
    let characterVisualsTable = franchise.getTableByName('CharacterVisuals');

    await characterVisualsTable.readRecords();

    let rawData = JSON.parse(characterVisualsTable.records[610]['RawData']);

    if(rawData.assetName !== 'PenixJrMichael_298')
    {
        console.log('Assetname not as expected. Expected: PenixJrMichael_298, got: ' + rawData.assetName);
    }

    fs.writeFileSync('../data/24Table3TDB2Data.json', JSON.stringify(rawData, null, 2));

    console.log("Test completed. Saved JSON data to ../data/24Table3TDB2Data.json");

});
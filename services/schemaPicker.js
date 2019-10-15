const fs = require('fs');
const path = require('path');

let schemaPicker = {};

schemaPicker.pick = (gameYear, major, minor) => {
  const schemasMeta = readSchemaDirectory('../data/schemas');
  return findApplicableSchema(schemasMeta, gameYear, major, minor);
}

module.exports = schemaPicker;

function readSchemaDirectory(dirpath) {
  let schemaMeta = {};

  const dirs = fs.readdirSync(path.join(__dirname, dirpath)).filter(f => fs.statSync(path.join(__dirname, dirpath, f)).isDirectory());

  dirs.forEach((dir) => {
    const files = fs.readdirSync(path.join(__dirname, dirpath, dir));
    const fileMeta = files.map((file) => {
      let regex = /(\d+)_(\d+)/.exec(file);
      return {
        'major': parseInt(regex[1]),
        'minor': parseInt(regex[2]),
        'path': path.join(__dirname, dirpath, dir, file)
      }
    });

    schemaMeta[dir] = fileMeta;
  });

  return schemaMeta;
};

function findApplicableSchema(schemaMeta, gameYear, major, minor) {
  // check if game year exists
  if (schemaMeta && schemaMeta[gameYear]) {
    // check if exact major exists
    const exactMajor = schemaMeta[gameYear].filter((schema) => { return schema.major == major });

    if (exactMajor.length > 0) {
      return getClosestMinor(exactMajor);
    }
    else {
      const majors = schemaMeta[gameYear].map((schema) => {
        return schema.major;
      });

      const closest = getClosestValue(majors, major);
      const majorMatches = schemaMeta[gameYear].filter((schema) => { return schema.major === closest; });

      if (majorMatches.length > 0) {
        return getClosestMinor(majorMatches); 
      }
    }

    return null;
  }

  function getClosestMinor(arr, goal) {
    const minors = arr.map((schema) => {
      return schema.minor;
    });
    const closest = getClosestValue(minors, goal);
    return arr.find((schema) => { return schema.minor === closest; });
  };

  function getClosestValue(arr, goal) {
    return arr.reduce(function (prev, curr) {
      return (Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev);
    });
  };
};
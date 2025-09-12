import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCHEMA_DIRECTORY = path.join(__dirname, '../../data/schemas');
let schemaPicker = {};
/** @param {number} gameYear @param {number} major @param {number} minor @param {FranchiseFileSettings?} [settings] @returns {SchemaMetadata?} */
schemaPicker.pick = (gameYear, major, minor, settings) => {
    let schemaDirectories = [SCHEMA_DIRECTORY];
    if (settings && settings.schemaDirectory) {
        schemaDirectories.unshift(settings.schemaDirectory);
    }
    const schemasMeta = readSchemaDirectories(schemaDirectories);
    return findApplicableSchema(schemasMeta, gameYear, major, minor);
};
/** @param {string} customDirectory @returns {Array<SchemaMetadata>} */
schemaPicker.retrieveSchemas = (customDirectory) => {
    let dirsToRead = [SCHEMA_DIRECTORY];
    if (customDirectory) {
        dirsToRead.push(customDirectory);
    }
    return readSchemaDirectories(dirsToRead).filter((schema) => {
        return schema.major !== null && schema.minor !== null;
    });
};
export default schemaPicker;
function readSchemaDirectories(dirpaths) {
    let schemaMeta = [];
    dirpaths.forEach(function (dirpath) {
        const dirs = fs
            .readdirSync(dirpath)
            .filter((f) => fs.statSync(path.join(dirpath, f)).isDirectory());
        const schemaMap = dirs.map((dir) => {
            return getSchemasInFolder(path.join(dirpath, dir));
        });
        schemaMeta.push(schemaMap);
        schemaMeta.push(getSchemasInFolder(dirpath));
    });
    return flatten(schemaMeta);
    function flatten(arr) {
        return arr.reduce(function (flat, toFlatten) {
            return flat.concat(
                Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten
            );
        }, []);
    }
}
function getSchemasInFolder(dir) {
    const files = fs.readdirSync(dir);
    return files.map((file) => {
        let regex = /(?:(?=M)M(\d+)_(\d+)_(\d+)|(?!M)(\d+)_(\d+))/.exec(file);
        return {
            gameYear: regex && regex[1] ? parseInt(regex[1]) : null,
            major:
                regex && (regex[2] || regex[4])
                    ? parseInt(regex[2] || regex[4])
                    : null,
            minor:
                regex && (regex[3] || regex[5])
                    ? parseInt(regex[3] || regex[5])
                    : null,
            path: path.join(dir, file)
        };
    });
}
function findApplicableSchema(schemaMeta, gameYear, major, minor) {
    // check if game year exists
    if (schemaMeta) {
        const schemasToSearch = schemaMeta.filter((schema) => {
            if (gameYear) {
                return (
                    schema.gameYear == gameYear ||
                    (schema.gameYear === null &&
                        schema.major !== null &&
                        schema.minor !== null)
                );
            } else {
                return schema.major !== null && schema.minor !== null;
            }
        });
        // check if exact major exists
        const exactMajor = schemasToSearch.filter((schema) => {
            return schema.major == major;
        });
        if (exactMajor.length > 0) {
            return getClosestMinor(exactMajor, minor);
        } else {
            const majors = schemasToSearch.map((schema) => {
                return schema.major;
            });
            const closest = getClosestValue(majors, major);
            const majorMatches = schemasToSearch.filter((schema) => {
                return schema.major === closest;
            });
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
        return arr.find((schema) => {
            return schema.minor === closest;
        });
    }
    function getClosestValue(arr, goal) {
        return arr.reduce(function (prev, curr) {
            return Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev;
        });
    }
}

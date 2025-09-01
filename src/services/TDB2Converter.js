import { BitView } from 'bit-buffer';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const slotsLookup = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/lookup-files/slotsLookup.json'), 'utf8'));
const fieldLookup = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/lookup-files/fieldLookup.json'), 'utf8'));
const enumLookup = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/lookup-files/enumLookup.json'), 'utf8'));

// Field type constants
const FIELD_TYPE_INT = 0;
const FIELD_TYPE_STRING = 1;
const FIELD_TYPE_ARRAY = 4;
const FIELD_TYPE_FLOAT = 10;

let parser;
let offset = 0;

function readBytes(length) {
    const bytes = parser.subarray(offset, offset + length);
    offset += length;
    return bytes;
}

function readByte() {
    return readBytes(1);
}

function decrementOffset(length = 1) {
    offset -= length;
}

function readChviArray(arrayLength)
{
    let array = [];

    for(let i = 0; i < arrayLength; i++)
    {
        let recordObject = {};
        let previousByte = -1;

        do
        {
            if(previousByte !== -1)
            {
                decrementOffset();
            }
            let fieldKey = getUncompressedTextFromSixBitCompression(readBytes(3));
            let fieldName = findFieldByFieldKey(fieldKey);

            let fieldType = readByte().readUInt8(0);

            switch(fieldType)
            {
                case FIELD_TYPE_INT:
                    let intValue = readModifiedLebEncodedNumber();

                    if(!fieldName)
                    {
                        break;
                    }

                    // Check for special cases that require lookups (enums)
                    if(fieldName === "slotType")
                    {
                        intValue = slotsLookup[intValue];
                    }
                    else if(fieldName === "loadoutType" || fieldName === "loadoutCategory")
                    {
                        intValue = findEnumValByNum(enumLookup[fieldName], intValue);
                    }

                    recordObject[fieldName] = intValue;
                    break;
                case FIELD_TYPE_STRING:
                    let stringLength = readModifiedLebEncodedNumber();
                    let stringValue = readBytes(stringLength);
                    // Remove null terminator from string
                    stringValue = stringValue.slice(0, -1).toString('utf8');

                    if(!fieldName)
                    {
                        break;
                    }

                    recordObject[fieldName] = stringValue;
                    break;
                case FIELD_TYPE_FLOAT:
                    let floatValue = readBytes(4).readFloatBE(0);

                    if(!fieldName)
                    {
                        break;
                    }

                    recordObject[fieldName] = floatValue;
                    break;
                case FIELD_TYPE_ARRAY:
                    readByte(); // Unknown byte
                    let arrayLength = readModifiedLebEncodedNumber();

                    // Hacky way of handling empty arrays (they still have a recordcount of 1 for some reason)
                    if(parser[offset] === 0x00)
                    {
                        recordObject[fieldName] = [];
                        readByte();
                        break;
                    }
                    let arrayObject = readChviArray(arrayLength);
                    
                    if(!fieldName)
                    {
                        break;
                    }

                    recordObject[fieldName] = arrayObject;
                    break;
                default:
                    break;
            }

            previousByte = readByte().readUInt8(0);
        }
        while(previousByte !== 0x00);

        array.push(recordObject);
    }

    return array;
}

function findFieldByFieldKey(fieldKey)
{
    const fields = Object.keys(fieldLookup);

    for(const field of fields)
    {
        if(fieldLookup[field].key === fieldKey)
        {
            return field;
        }
    }
}

function findEnumValByNum(object, enumNum)
{
    const fields = Object.keys(object);

    for(const field of fields)
    {
        if(object[field] === enumNum)
        {
            return field;
        }
    }
}


// Function to read a CHVI record
export function readChviRecord(dataBuf)
{
    parser = dataBuf;
    offset = 0;

    let recordObject = {};

    while(offset < parser.length)
    {
        let fieldBytes = readBytes(3);
        let fieldKey = getUncompressedTextFromSixBitCompression(fieldBytes);

        let fieldName = findFieldByFieldKey(fieldKey);
        let fieldType = readByte().readUInt8(0);

        if(fieldType === 0x03)
        {
            readByte();
            continue;
        }
        switch(fieldType)
        {
            case FIELD_TYPE_INT:
                let intValue = readModifiedLebEncodedNumber();

                if(!fieldName)
                {
                    break;
                }

                // Check for special cases that require lookups
                if(fieldName === "slotType")
                {
                    intValue = slotsLookup[intValue];
                }
                else if(fieldName === "loadoutType" || fieldName === "loadoutCategory")
                {
                    intValue = enumLookup[fieldName][intValue];
                }

                recordObject[fieldName] = intValue;
                break;
            case FIELD_TYPE_STRING:
                let stringLength = readModifiedLebEncodedNumber();
                let stringValue = readBytes(stringLength);
                // Remove null terminator from string
                stringValue = stringValue.slice(0, -1).toString('utf8');

                if(!fieldName)
                {
                    break;
                }

                recordObject[fieldName] = stringValue;
                break;
            case FIELD_TYPE_FLOAT:
                let floatValue = readBytes(4).readFloatBE(0);

                if(!fieldName)
                {
                    break;
                }

                recordObject[fieldName] = floatValue;
                break;
            case FIELD_TYPE_ARRAY:
                readByte();
                let arrayLength = readModifiedLebEncodedNumber();
                let arrayObject = readChviArray(arrayLength);
                
                if(!fieldName)
                {
                    break;
                }

                if(readByte().readUInt8(0) !== 0x00)
                {
                    decrementOffset();
                }

                recordObject[fieldName] = arrayObject;
            default:
                break;

        }
    }

    return recordObject;
}

function getUncompressedTextFromSixBitCompression(data) 
{
    const bv = new BitView(data, data.byteOffset);
    bv.bigEndian = true;
    const numCharacters = (data.length * 8) / 6;
    
    let text = '';

    for (let i = 0; i < numCharacters; i++) 
    {
        text += String.fromCharCode(getCharCode(i * 6));
    }

    return text;

    function getCharCode(offset) 
    {
        return bv.getBits(offset, 6) + 32;
    }
}

function readModifiedLebEncodedNumber()
{
    let byteArray = [];
    let currentByte;

    do
    {
        currentByte = readByte().readUInt8(0);
        byteArray.push(currentByte);
    }
    while((currentByte & 0x80));
    
    let value = 0;
    let isNegative = false;

    const buf = Buffer.from(byteArray);

    for (let i = (buf.length - 1); i >= 0; i--) {
        let currentByte = buf.readUInt8(i);

        if (i !== (buf.length - 1)) {
        currentByte = currentByte ^ 0x80;
        }

        if (i === 0 && (currentByte & 0x40) === 0x40) {
        currentByte = currentByte ^ 0x40;
        isNegative = true;
        }

        let multiplicationFactor = 1 << (i * 6);

        if (i > 1) {
        multiplicationFactor = multiplicationFactor << 1;
        }

        value += currentByte * multiplicationFactor;

        if (isNegative) {
        value *= -1;
        }
    }

    return value;
}
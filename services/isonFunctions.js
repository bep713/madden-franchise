// Required modules
const path = require("path");
const fs = require("fs");
const zlib = require("zlib");

// Read in all available interned string lookups
let internedLookups = {};
const gameYears = [25, 26];
for (let year of gameYears) 
{
	const lookupFilePath = path.join(__dirname, `../data/interned-strings/${year.toString()}/lookup.json`);
	if (fs.existsSync(lookupFilePath)) 
	{
		internedLookups[year] = JSON.parse(fs.readFileSync(lookupFilePath, 'utf8'));
	}

}

// Default to 25 lookup until we know the game year
let stringLookup = internedLookups[25];
let reverseStringLookup = {};
populateReverseStringLookup(); 

function populateReverseStringLookup() {
  // Create a reverse lookup for JSON -> ISON
  for (let key in stringLookup) {
    reverseStringLookup[stringLookup[key].toLowerCase()] = parseInt(key); // Create reverse lookup
  }
}

function initGameSpecific(gameYear) {
  stringLookup = internedLookups[gameYear];
  reverseStringLookup = {};
  populateReverseStringLookup();
}

// ISON constants
const ISON_HEADER = 0x0d;
const ISON_OBJECT_START = 0x0f;
const ISON_OBJECT_END = 0x13;
const ISON_ARRAY_START = 0x0e;
const ISON_ARRAY_END = 0x12;
const ISON_INTERNED_STRING = 0x0a;
const ISON_STRING = 0x0b;
const ISON_KEYVALUEPAIR = 0x10;
const ISON_DOUBLE = 0x09;
const ISON_BYTE = 0x03;
const ISON_END = 0x11;

let fileData;
let isonOffset = 0;

function isonVisualsToJson(fileBuf, gameYear = 25) {
  initGameSpecific(gameYear);
  
  isonOffset = 0;

  fileData = fileBuf;

  let obj = {};

  // Read the first byte
  const firstByte = readBytes(1).readUInt8(0);

  // Check if the first byte is 0x0D (ISON_HEADER)
  if (firstByte !== ISON_HEADER) {
    // Not an ISON file, so return null
    return null;
  }

  // Start reading the value into the object
  obj = readValue();

  const lastByte = readBytes(1).readUInt8(0);

  return obj;
}

function jsonVisualsToIson(jsonObj, gameYear = 25) {
  initGameSpecific(gameYear);
  
  const isonBuffer = writeIsonFromJson(jsonObj);

  // For 26 onwards, return the raw ISON buffer (strategy will handle compression).
  // For 25, return the compressed buffer since it's just simple gzip
  return gameYear >= 26 ? isonBuffer : writeTable3IsonData(isonBuffer);
}

// Function to write the ISON data to a compressed buffer
function writeTable3IsonData(isonBuffer) {
  const compressedData = zlib.gzipSync(isonBuffer);

  return compressedData;
}

// Helper to write ISON file
function writeBytes(buffer, offset, data) {
  data.copy(buffer, offset);
  return offset + data.length;
}

// Helper to write a single byte
function writeByte(buffer, offset, byte) {
  if (byte < 0 || byte > 255) {
    byte = 0;
  }

  buffer.writeUInt8(byte, offset);
  return offset + 1;
}

// Helper to write a double
function writeDouble(buffer, offset, value) {
  buffer.writeDoubleLE(value, offset);
  return offset + 8;
}

// Helper to write a string
function writeString(buffer, offset, value) {
  if (reverseStringLookup.hasOwnProperty(value.toLowerCase())) {
    offset = writeByte(buffer, offset, ISON_INTERNED_STRING); // Write interned string type
    const stringKey = reverseStringLookup[value.toLowerCase()];
    buffer.writeUInt16LE(stringKey, offset); // Write the string key (2 bytes)
    offset += 2;
    return offset;
  }

  offset = writeByte(buffer, offset, ISON_STRING); // Write string type
  const strBuffer = Buffer.from(value, "utf8");
  buffer.writeUInt32LE(strBuffer.length, offset); // Write the string length (4 bytes)
  offset += 4;
  return writeBytes(buffer, offset, strBuffer);
}

// Convert JSON back to ISON
function jsonToIson(json, buffer, offset = 0) {
  if (typeof json === "object" && !Array.isArray(json)) {
    offset = writeByte(buffer, offset, ISON_OBJECT_START); // Write object start byte
    for (const key in json) {
      offset = writeByte(buffer, offset, ISON_KEYVALUEPAIR); // Write key-value pair marker
      offset = writeString(buffer, offset, key); // Write the key (assume all keys are strings)
      offset = jsonToIson(json[key], buffer, offset); // Write the value recursively
    }
    offset = writeByte(buffer, offset, ISON_OBJECT_END); // Write object end byte
  } else if (Array.isArray(json)) {
    offset = writeByte(buffer, offset, ISON_ARRAY_START); // Write array start byte
    for (const item of json) {
      offset = jsonToIson(item, buffer, offset); // Write each array item recursively
    }
    offset = writeByte(buffer, offset, ISON_ARRAY_END); // Write array end byte
  } else if (typeof json === "string") {
    if (reverseStringLookup.hasOwnProperty(json.toLowerCase())) {
      offset = writeByte(buffer, offset, ISON_INTERNED_STRING); // Write interned string type
      const stringKey = reverseStringLookup[json.toLowerCase()];
      buffer.writeUInt16LE(stringKey, offset); // Write the string key (2 bytes)
      offset += 2;
    } else {
      offset = writeString(buffer, offset, json); // Write the string value
    }
  } else if (typeof json === "number" && !Number.isInteger(json)) {
    offset = writeByte(buffer, offset, ISON_DOUBLE); // Write double type
    offset = writeDouble(buffer, offset, json); // Write the double value
  } else if (typeof json === "boolean" || typeof json === "number") {
    offset = writeByte(buffer, offset, ISON_BYTE); // Write byte type for boolean or byte
    offset = writeByte(buffer, offset, json); // Write the byte value
  }
  return offset;
}

// Function to convert JSON to ISON and write it to a file
function writeIsonFromJson(jsonObj) {  
  // Estimate the buffer size; this can be optimized based on specific requirements.
  let buffer = Buffer.alloc(1024 * 1024); // 1MB buffer for now
  let offset = 0;

  // Write the ISON header
  offset = writeByte(buffer, offset, ISON_HEADER);

  // Convert the JSON to ISON
  offset = jsonToIson(jsonObj, buffer, offset);

  // Write the ISON terminator
  offset = writeByte(buffer, offset, ISON_END);

  return buffer.subarray(0, offset);
}

// Function to read a specified number of bytes from the buffer
function readBytes(length) {
  const bytes = fileData.subarray(isonOffset, isonOffset + length);
  isonOffset += length;
  return bytes;
}

// Decrement the offset
function decrementOffset(length = 1) {
  isonOffset -= length;
}

// Function to read the value depending on its type
function readValue() {
  const valueType = readBytes(1).readUInt8(0);

  if (valueType === ISON_INTERNED_STRING) {
    const stringKey = readBytes(2).readUInt16LE(0);

    if (!stringLookup.hasOwnProperty(stringKey)) {
      return "UnkString";
    }
    return stringLookup[stringKey]; // Return the interned string from the lookup
  } else if (valueType === ISON_STRING) {
    const stringLength = readBytes(4).readUInt32LE(0);
    return readBytes(stringLength).toString("utf8"); // Read and return the full string
  } else if (valueType === ISON_DOUBLE) {
    return readBytes(8).readDoubleLE(0); // Read and return a double value
  } else if (valueType === ISON_BYTE) {
    return readBytes(1).readUInt8(0); // Read and return a byte value
  } else if (valueType === ISON_OBJECT_START) {
    return readObject(); // Recursively read an object
  } else if (valueType === ISON_ARRAY_START) {
    return readArray(); // Recursively read an array
  }

  return null;
}

// Function to read an array
function readArray() {
  let arr = [];
  let byte;

  do {
    byte = readBytes(1).readUInt8(0);
    if (byte !== ISON_ARRAY_END) {
      decrementOffset(1); // Decrement offset to re-read this byte for the next value type
      arr.push(readValue()); // Read the value and push it to the array
    }
  } while (byte !== ISON_ARRAY_END);

  return arr; // Return the constructed array
}

// Function to read an object
function readObject() {
  let obj = {};
  let byte;

  do {
    byte = readBytes(1).readUInt8(0);
    if (byte === ISON_KEYVALUEPAIR) {
      const key = readValue(); // Read the key
      const value = readValue(); // Read the corresponding value
      obj[key] = value; // Assign key-value pair to the object
    } else if (byte !== ISON_OBJECT_END) {
      // If we haven't reached the object end, put the byte back and continue reading
      decrementOffset(1);
      readValue(); // Continue reading values (this might be nested structures)
    }
  } while (byte !== ISON_OBJECT_END);

  return obj; // Return the constructed object
}

module.exports = {
  isonVisualsToJson,
  jsonVisualsToIson,
};

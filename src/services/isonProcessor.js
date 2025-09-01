// Required modules
import path, { dirname } from "path";
import fs from "fs";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * ISON processor class that handles game year specific interned string lookups
 */
export class IsonProcessor {
  // ISON constants
  static ISON_HEADER = 0x0d;
  static ISON_OBJECT_START = 0x0f;
  static ISON_OBJECT_END = 0x13;
  static ISON_ARRAY_START = 0x0e;
  static ISON_ARRAY_END = 0x12;
  static ISON_INTERNED_STRING = 0x0a;
  static ISON_STRING = 0x0b;
  static ISON_KEYVALUEPAIR = 0x10;
  static ISON_DOUBLE = 0x09;
  static ISON_BYTE = 0x03;
  static ISON_END = 0x11;

  constructor(gameYear = 25) {
    this.gameYear = gameYear;
    this.stringLookup = null;
    this.reverseStringLookup = {};
    this.fileData = null;
    this.isonOffset = 0;
    
    // Static cache shared across all instances to avoid reloading the same data
    if (!IsonProcessor.internedLookups) {
      IsonProcessor.internedLookups = {};
    }
    
    // Initialize the lookup data for this game year
    this.loadGameYearData();
  }

  /**
   * Lazy load the interned string lookup for the specified game year
   */
  loadGameYearData() {
    // Check if we already have this game year's lookup loaded into memory, and if not, load it from file
    if (!IsonProcessor.internedLookups[this.gameYear]) {
      const lookupFilePath = path.join(__dirname, `../../data/interned-strings/${this.gameYear.toString()}/lookup.json`);
      if (fs.existsSync(lookupFilePath)) {
        IsonProcessor.internedLookups[this.gameYear] = JSON.parse(fs.readFileSync(lookupFilePath, 'utf8'));
      } else {
        // If we don't have a lookup for this game year, recursively fall back to Madden 25 (which we should always have a lookup for)
        if (this.gameYear !== 25) {
          IsonProcessor.internedLookups[this.gameYear] = this.loadGameYearDataStatic(25);
        } else {
          throw new Error(`Interned string lookup file not found for game year ${this.gameYear} and no fallback available`);
        }
      }
    }
    
    this.stringLookup = IsonProcessor.internedLookups[this.gameYear];
    this.populateReverseStringLookup();
  }

  /**
   * Static helper method for loading game year data (used for fallback)
   */
  loadGameYearDataStatic(gameYear) {
    if (!IsonProcessor.internedLookups[gameYear]) {
      const lookupFilePath = path.join(__dirname, `../../data/interned-strings/${gameYear.toString()}/lookup.json`);
      if (fs.existsSync(lookupFilePath)) {
        IsonProcessor.internedLookups[gameYear] = JSON.parse(fs.readFileSync(lookupFilePath, 'utf8'));
      } else {
        throw new Error(`Interned string lookup file not found for game year ${gameYear}`);
      }
    }
    return IsonProcessor.internedLookups[gameYear];
  }

  /**
   * Create a reverse lookup for JSON -> ISON conversion
   */
  populateReverseStringLookup() {
    this.reverseStringLookup = {}; // Reset the lookup
    if (this.stringLookup) {
      for (let key in this.stringLookup) {
        this.reverseStringLookup[this.stringLookup[key].toLowerCase()] = parseInt(key);
      }
    }
  }

  /**
   * Convert ISON buffer to JSON object
   */
  isonVisualsToJson(fileBuf) {
    this.isonOffset = 0;
    this.fileData = fileBuf;

    let obj = {};

    // Read the first byte
    const firstByte = this.readBytes(1).readUInt8(0);

    // Check if the first byte is 0x0D (ISON_HEADER)
    if (firstByte !== IsonProcessor.ISON_HEADER) {
      // Not an ISON file, so return null
      return null;
    }

    // Start reading the value into the object
    obj = this.readValue();

    const lastByte = this.readBytes(1).readUInt8(0);

    return obj;
  }

  /**
   * Convert JSON object to ISON buffer
   */
  jsonVisualsToIson(jsonObj) {
    const isonBuffer = this.writeIsonFromJson(jsonObj);

    // For 26 onwards, return the raw ISON buffer (strategy will handle compression).
    // For 25, return the compressed buffer since it's just simple gzip
    return this.gameYear >= 26 ? isonBuffer : this.writeTable3IsonData(isonBuffer);
  }

  /**
   * Function to write the ISON data to a compressed buffer
   */
  writeTable3IsonData(isonBuffer) {
    const compressedData = zlib.gzipSync(isonBuffer);
    return compressedData;
  }

  // Helper to write ISON file
  writeIsonFromJson(jsonObj) {
    // Estimate the buffer size; this can be optimized based on specific requirements.
    let buffer = Buffer.alloc(1024 * 1024); // 1MB buffer for now
    let offset = 0;

    // Write the ISON header
    offset = this.writeByte(buffer, offset, IsonProcessor.ISON_HEADER);

    // Convert the JSON to ISON
    offset = this.jsonToIson(jsonObj, buffer, offset);

    // Write the ISON terminator
    offset = this.writeByte(buffer, offset, IsonProcessor.ISON_END);

    return buffer.subarray(0, offset);
  }

  // Helper to write bytes
  writeBytes(buffer, offset, data) {
    data.copy(buffer, offset);
    return offset + data.length;
  }

  // Helper to write a single byte
  writeByte(buffer, offset, byte) {
    if (byte < 0 || byte > 255) {
      byte = 0;
    }

    buffer.writeUInt8(byte, offset);
    return offset + 1;
  }

  // Helper to write a double
  writeDouble(buffer, offset, value) {
    buffer.writeDoubleLE(value, offset);
    return offset + 8;
  }

  // Helper to write a string
  writeString(buffer, offset, value) {
    if (this.reverseStringLookup.hasOwnProperty(value.toLowerCase())) {
      offset = this.writeByte(buffer, offset, IsonProcessor.ISON_INTERNED_STRING); // Write interned string type
      const stringKey = this.reverseStringLookup[value.toLowerCase()];
      buffer.writeUInt16LE(stringKey, offset); // Write the string key (2 bytes)
      offset += 2;
      return offset;
    }

    offset = this.writeByte(buffer, offset, IsonProcessor.ISON_STRING); // Write string type
    const strBuffer = Buffer.from(value, "utf8");
    buffer.writeUInt32LE(strBuffer.length, offset); // Write the string length (4 bytes)
    offset += 4;
    return this.writeBytes(buffer, offset, strBuffer);
  }

  // Convert JSON back to ISON
  jsonToIson(json, buffer, offset = 0) {
    if (typeof json === "object" && !Array.isArray(json)) {
      offset = this.writeByte(buffer, offset, IsonProcessor.ISON_OBJECT_START); // Write object start byte
      for (const key in json) {
        offset = this.writeByte(buffer, offset, IsonProcessor.ISON_KEYVALUEPAIR); // Write key-value pair marker
        offset = this.writeString(buffer, offset, key); // Write the key (assume all keys are strings)
        offset = this.jsonToIson(json[key], buffer, offset); // Write the value recursively
      }
      offset = this.writeByte(buffer, offset, IsonProcessor.ISON_OBJECT_END); // Write object end byte
    } else if (Array.isArray(json)) {
      offset = this.writeByte(buffer, offset, IsonProcessor.ISON_ARRAY_START); // Write array start byte
      for (const item of json) {
        offset = this.jsonToIson(item, buffer, offset); // Write each array item recursively
      }
      offset = this.writeByte(buffer, offset, IsonProcessor.ISON_ARRAY_END); // Write array end byte
    } else if (typeof json === "string") {
      if (this.reverseStringLookup.hasOwnProperty(json.toLowerCase())) {
        offset = this.writeByte(buffer, offset, IsonProcessor.ISON_INTERNED_STRING); // Write interned string type
        const stringKey = this.reverseStringLookup[json.toLowerCase()];
        buffer.writeUInt16LE(stringKey, offset); // Write the string key (2 bytes)
        offset += 2;
      } else {
        offset = this.writeString(buffer, offset, json); // Write the string value
      }
    } else if (typeof json === "number" && !Number.isInteger(json)) {
      offset = this.writeByte(buffer, offset, IsonProcessor.ISON_DOUBLE); // Write double type
      offset = this.writeDouble(buffer, offset, json); // Write the double value
    } else if (typeof json === "boolean" || typeof json === "number") {
      offset = this.writeByte(buffer, offset, IsonProcessor.ISON_BYTE); // Write byte type for boolean or byte
      offset = this.writeByte(buffer, offset, json); // Write the byte value
    }
    return offset;
  }

  // Function to read a specified number of bytes from the buffer
  readBytes(length) {
    const bytes = this.fileData.subarray(this.isonOffset, this.isonOffset + length);
    this.isonOffset += length;
    return bytes;
  }

  // Decrement the offset
  decrementOffset(length = 1) {
    this.isonOffset -= length;
  }

  // Function to read the value depending on its type
  readValue() {
    const valueType = this.readBytes(1).readUInt8(0);

    if (valueType === IsonProcessor.ISON_INTERNED_STRING) {
      const stringKey = this.readBytes(2).readUInt16LE(0);

      if (!this.stringLookup.hasOwnProperty(stringKey)) {
        return "UnkString";
      }
      return this.stringLookup[stringKey]; // Return the interned string from the lookup
    } else if (valueType === IsonProcessor.ISON_STRING) {
      const stringLength = this.readBytes(4).readUInt32LE(0);
      return this.readBytes(stringLength).toString("utf8"); // Read and return the full string
    } else if (valueType === IsonProcessor.ISON_DOUBLE) {
      return this.readBytes(8).readDoubleLE(0); // Read and return a double value
    } else if (valueType === IsonProcessor.ISON_BYTE) {
      return this.readBytes(1).readUInt8(0); // Read and return a byte value
    } else if (valueType === IsonProcessor.ISON_OBJECT_START) {
      return this.readObject(); // Recursively read an object
    } else if (valueType === IsonProcessor.ISON_ARRAY_START) {
      return this.readArray(); // Recursively read an array
    }

    return null;
  }

  // Function to read an array
  readArray() {
    let arr = [];
    let byte;

    do {
      byte = this.readBytes(1).readUInt8(0);
      if (byte !== IsonProcessor.ISON_ARRAY_END) {
        this.decrementOffset(1); // Decrement offset to re-read this byte for the next value type
        arr.push(this.readValue()); // Read the value and push it to the array
      }
    } while (byte !== IsonProcessor.ISON_ARRAY_END);

    return arr; // Return the constructed array
  }

  // Function to read an object
  readObject() {
    let obj = {};
    let byte;

    do {
      byte = this.readBytes(1).readUInt8(0);
      if (byte === IsonProcessor.ISON_KEYVALUEPAIR) {
        const key = this.readValue(); // Read the key
        const value = this.readValue(); // Read the corresponding value
        obj[key] = value; // Assign key-value pair to the object
      } else if (byte !== IsonProcessor.ISON_OBJECT_END) {
        // If we haven't reached the object end, put the byte back and continue reading
        this.decrementOffset(1);
        this.readValue(); // Continue reading values (this might be nested structures)
      }
    } while (byte !== IsonProcessor.ISON_OBJECT_END);

    return obj; // Return the constructed object
  }
}

// Backward compatibility functions that create instances as needed. I don't think these will be needed but they're here just in case.
export function isonVisualsToJson(fileBuf, gameYear = 25) {
  const processor = new IsonProcessor(gameYear);
  return processor.isonVisualsToJson(fileBuf);
}

export function jsonVisualsToIson(jsonObj, gameYear = 25) {
  const processor = new IsonProcessor(gameYear);
  return processor.jsonVisualsToIson(jsonObj);
}

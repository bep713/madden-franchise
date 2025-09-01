'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var fs = require('fs');
var zlib = require('zlib');
var events = require('events');
var path = require('path');
var require$$0 = require('stream');
var url = require('url');
var fs$1 = require('fs/promises');
var nodeZstd = require('@toondepauw/node-zstd');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
const FORMAT = {
    'FRANCHISE': 'franchise',
    'FRANCHISE_COMMON': 'franchise-common'
};
var Constants = {
    FORMAT
};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var bitBuffer = {exports: {}};

var hasRequiredBitBuffer;

function requireBitBuffer () {
	if (hasRequiredBitBuffer) return bitBuffer.exports;
	hasRequiredBitBuffer = 1;
	(function (module) {
		(function (root) {

		/**********************************************************
		 *
		 * BitView
		 *
		 * BitView provides a similar interface to the standard
		 * DataView, but with support for bit-level reads / writes.
		 *
		 **********************************************************/
		var BitView = function (source, byteOffset, byteLength) {
			var isBuffer = source instanceof ArrayBuffer ||
				(typeof Buffer !== 'undefined' && source instanceof Buffer);

			if (!isBuffer) {
				throw new Error('Must specify a valid ArrayBuffer or Buffer.');
			}

			byteOffset = byteOffset || 0;
			byteLength = byteLength || source.byteLength /* ArrayBuffer */ || source.length /* Buffer */;

			this._view = new Uint8Array(source.buffer || source, byteOffset, byteLength);

			this.bigEndian = false;
		};

		// Used to massage fp values so we can operate on them
		// at the bit level.
		BitView._scratch = new DataView(new ArrayBuffer(8));

		Object.defineProperty(BitView.prototype, 'buffer', {
			get: function () { return typeof Buffer !== 'undefined' ?  Buffer.from(this._view.buffer) : this._view.buffer; },
			enumerable: true,
			configurable: false
		});

		Object.defineProperty(BitView.prototype, 'byteLength', {
			get: function () { return this._view.length; },
			enumerable: true,
			configurable: false
		});

		BitView.prototype._setBit = function (offset, on) {
			if (on) {
				this._view[offset >> 3] |= 1 << (offset & 7);
			} else {
				this._view[offset >> 3] &= ~(1 << (offset & 7));
			}
		};

		BitView.prototype.getBits = function (offset, bits, signed) {
			var available = (this._view.length * 8 - offset);

			if (bits > available) {
				throw new Error('Cannot get ' + bits + ' bit(s) from offset ' + offset + ', ' + available + ' available');
			}

			var value = 0;
			for (var i = 0; i < bits;) {
				var remaining = bits - i;
				var bitOffset = offset & 7;
				var currentByte = this._view[offset >> 3];

				// the max number of bits we can read from the current byte
				var read = Math.min(remaining, 8 - bitOffset);

				var mask, readBits;
				if (this.bigEndian) {
					// create a mask with the correct bit width
					mask = ~(0xFF << read);
					// shift the bits we want to the start of the byte and mask of the rest
					readBits = (currentByte >> (8 - read - bitOffset)) & mask;

					value <<= read;
					value |= readBits;
				} else {
					// create a mask with the correct bit width
					mask = ~(0xFF << read);
					// shift the bits we want to the start of the byte and mask off the rest
					readBits = (currentByte >> bitOffset) & mask;

					value |= readBits << i;
				}

				offset += read;
				i += read;
			}

			if (signed) {
				// If we're not working with a full 32 bits, check the
				// imaginary MSB for this bit count and convert to a
				// valid 32-bit signed value if set.
				if (bits !== 32 && value & (1 << (bits - 1))) {
					value |= -1 ^ ((1 << bits) - 1);
				}

				return value;
			}

			return value >>> 0;
		};

		BitView.prototype.setBits = function (offset, value, bits) {
			var available = (this._view.length * 8 - offset);

			if (bits > available) {
				throw new Error('Cannot set ' + bits + ' bit(s) from offset ' + offset + ', ' + available + ' available');
			}

			for (var i = 0; i < bits;) {
				var remaining = bits - i;
				var bitOffset = offset & 7;
				var byteOffset = offset >> 3;
				var wrote = Math.min(remaining, 8 - bitOffset);

				var mask, writeBits, destMask;
				if (this.bigEndian) {
					// create a mask with the correct bit width
					mask = ~(-1 << wrote);
					// shift the bits we want to the start of the byte and mask of the rest
					writeBits = (value >> (bits - i - wrote)) & mask;

					var destShift = 8 - bitOffset - wrote;
					// destination mask to zero all the bits we're changing first
					destMask = ~(mask << destShift);

					this._view[byteOffset] =
						(this._view[byteOffset] & destMask)
						| (writeBits << destShift);

				} else {
					// create a mask with the correct bit width
					mask = ~(0xFF << wrote);
					// shift the bits we want to the start of the byte and mask of the rest
					writeBits = value & mask;
					value >>= wrote;

					// destination mask to zero all the bits we're changing first
					destMask = ~(mask << bitOffset);

					this._view[byteOffset] =
						(this._view[byteOffset] & destMask)
						| (writeBits << bitOffset);
				}

				offset += wrote;
				i += wrote;
			}
		};

		BitView.prototype.getBoolean = function (offset) {
			return this.getBits(offset, 1, false) !== 0;
		};
		BitView.prototype.getInt8 = function (offset) {
			return this.getBits(offset, 8, true);
		};
		BitView.prototype.getUint8 = function (offset) {
			return this.getBits(offset, 8, false);
		};
		BitView.prototype.getInt16 = function (offset) {
			return this.getBits(offset, 16, true);
		};
		BitView.prototype.getUint16 = function (offset) {
			return this.getBits(offset, 16, false);
		};
		BitView.prototype.getInt32 = function (offset) {
			return this.getBits(offset, 32, true);
		};
		BitView.prototype.getUint32 = function (offset) {
			return this.getBits(offset, 32, false);
		};
		BitView.prototype.getFloat32 = function (offset) {
			BitView._scratch.setUint32(0, this.getUint32(offset));
			return BitView._scratch.getFloat32(0);
		};
		BitView.prototype.getFloat64 = function (offset) {
			BitView._scratch.setUint32(0, this.getUint32(offset));
			// DataView offset is in bytes.
			BitView._scratch.setUint32(4, this.getUint32(offset+32));
			return BitView._scratch.getFloat64(0);
		};

		BitView.prototype.setBoolean = function (offset, value) {
			this.setBits(offset, value ? 1 : 0, 1);
		};
		BitView.prototype.setInt8  =
		BitView.prototype.setUint8 = function (offset, value) {
			this.setBits(offset, value, 8);
		};
		BitView.prototype.setInt16  =
		BitView.prototype.setUint16 = function (offset, value) {
			this.setBits(offset, value, 16);
		};
		BitView.prototype.setInt32  =
		BitView.prototype.setUint32 = function (offset, value) {
			this.setBits(offset, value, 32);
		};
		BitView.prototype.setFloat32 = function (offset, value) {
			BitView._scratch.setFloat32(0, value);
			this.setBits(offset, BitView._scratch.getUint32(0), 32);
		};
		BitView.prototype.setFloat64 = function (offset, value) {
			BitView._scratch.setFloat64(0, value);
			this.setBits(offset, BitView._scratch.getUint32(0), 32);
			this.setBits(offset+32, BitView._scratch.getUint32(4), 32);
		};
		BitView.prototype.getArrayBuffer = function (offset, byteLength) {
			var buffer = new Uint8Array(byteLength);
			for (var i = 0; i < byteLength; i++) {
				buffer[i] = this.getUint8(offset + (i * 8));
			}
			return buffer;
		};

		/**********************************************************
		 *
		 * BitStream
		 *
		 * Small wrapper for a BitView to maintain your position,
		 * as well as to handle reading / writing of string data
		 * to the underlying buffer.
		 *
		 **********************************************************/
		var reader = function (name, size) {
			return function () {
				if (this._index + size > this._length) {
					throw new Error('Trying to read past the end of the stream');
				}
				var val = this._view[name](this._index);
				this._index += size;
				return val;
			};
		};

		var writer = function (name, size) {
			return function (value) {
				this._view[name](this._index, value);
				this._index += size;
			};
		};

		function readASCIIString(stream, bytes) {
			return readString(stream, bytes, false);
		}

		function readUTF8String(stream, bytes) {
			return readString(stream, bytes, true);
		}

		function readString(stream, bytes, utf8) {
			if (bytes === 0) {
				return '';
			}
			var i = 0;
			var chars = [];
			var append = true;
			var fixedLength = !!bytes;
			if (!bytes) {
				bytes = Math.floor((stream._length - stream._index) / 8);
			}

			// Read while we still have space available, or until we've
			// hit the fixed byte length passed in.
			while (i < bytes) {
				var c = stream.readUint8();

				// Stop appending chars once we hit 0x00
				if (c === 0x00) {
					append = false;

					// If we don't have a fixed length to read, break out now.
					if (!fixedLength) {
						break;
					}
				}
				if (append) {
					chars.push(c);
				}

				i++;
			}

			var string = String.fromCharCode.apply(null, chars);
			if (utf8) {
				try {
					return decodeURIComponent(escape(string)); // https://stackoverflow.com/a/17192845
				} catch (e) {
					return string;
				}
			} else {
				return string;
			}
		}

		function writeASCIIString(stream, string, bytes) {
			var length = bytes || string.length + 1;  // + 1 for NULL

			for (var i = 0; i < length; i++) {
				stream.writeUint8(i < string.length ? string.charCodeAt(i) : 0x00);
			}
		}

		function writeUTF8String(stream, string, bytes) {
			var byteArray = stringToByteArray(string);

			var length = bytes || byteArray.length + 1;  // + 1 for NULL
			for (var i = 0; i < length; i++) {
				stream.writeUint8(i < byteArray.length ? byteArray[i] : 0x00);
			}
		}

		function stringToByteArray(str) { // https://gist.github.com/volodymyr-mykhailyk/2923227
			var b = [], i, unicode;
			for (i = 0; i < str.length; i++) {
				unicode = str.charCodeAt(i);
				// 0x00000000 - 0x0000007f -> 0xxxxxxx
				if (unicode <= 0x7f) {
					b.push(unicode);
					// 0x00000080 - 0x000007ff -> 110xxxxx 10xxxxxx
				} else if (unicode <= 0x7ff) {
					b.push((unicode >> 6) | 0xc0);
					b.push((unicode & 0x3F) | 0x80);
					// 0x00000800 - 0x0000ffff -> 1110xxxx 10xxxxxx 10xxxxxx
				} else if (unicode <= 0xffff) {
					b.push((unicode >> 12) | 0xe0);
					b.push(((unicode >> 6) & 0x3f) | 0x80);
					b.push((unicode & 0x3f) | 0x80);
					// 0x00010000 - 0x001fffff -> 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
				} else {
					b.push((unicode >> 18) | 0xf0);
					b.push(((unicode >> 12) & 0x3f) | 0x80);
					b.push(((unicode >> 6) & 0x3f) | 0x80);
					b.push((unicode & 0x3f) | 0x80);
				}
			}

			return b;
		}

		var BitStream = function (source, byteOffset, byteLength) {
			var isBuffer = source instanceof ArrayBuffer ||
				(typeof Buffer !== 'undefined' && source instanceof Buffer);

			if (!(source instanceof BitView) && !isBuffer) {
				throw new Error('Must specify a valid BitView, ArrayBuffer or Buffer');
			}

			if (isBuffer) {
				this._view = new BitView(source, byteOffset, byteLength);
			} else {
				this._view = source;
			}

			this._index = 0;
			this._startIndex = 0;
			this._length = this._view.byteLength * 8;
		};

		Object.defineProperty(BitStream.prototype, 'index', {
			get: function () { return this._index - this._startIndex; },
			set: function (val) { this._index = val + this._startIndex; },
			enumerable: true,
			configurable: true
		});

		Object.defineProperty(BitStream.prototype, 'length', {
			get: function () { return this._length - this._startIndex; },
			set: function (val) { this._length = val + this._startIndex; },
			enumerable  : true,
			configurable: true
		});

		Object.defineProperty(BitStream.prototype, 'bitsLeft', {
			get: function () { return this._length - this._index; },
			enumerable  : true,
			configurable: true
		});

		Object.defineProperty(BitStream.prototype, 'byteIndex', {
			// Ceil the returned value, over compensating for the amount of
			// bits written to the stream.
			get: function () { return Math.ceil(this._index / 8); },
			set: function (val) { this._index = val * 8; },
			enumerable: true,
			configurable: true
		});

		Object.defineProperty(BitStream.prototype, 'buffer', {
			get: function () { return this._view.buffer; },
			enumerable: true,
			configurable: false
		});

		Object.defineProperty(BitStream.prototype, 'view', {
			get: function () { return this._view; },
			enumerable: true,
			configurable: false
		});

		Object.defineProperty(BitStream.prototype, 'bigEndian', {
			get: function () { return this._view.bigEndian; },
			set: function (val) { this._view.bigEndian = val; },
			enumerable: true,
			configurable: false
		});

		BitStream.prototype.readBits = function (bits, signed) {
			var val = this._view.getBits(this._index, bits, signed);
			this._index += bits;
			return val;
		};

		BitStream.prototype.writeBits = function (value, bits) {
			this._view.setBits(this._index, value, bits);
			this._index += bits;
		};

		BitStream.prototype.readBoolean = reader('getBoolean', 1);
		BitStream.prototype.readInt8 = reader('getInt8', 8);
		BitStream.prototype.readUint8 = reader('getUint8', 8);
		BitStream.prototype.readInt16 = reader('getInt16', 16);
		BitStream.prototype.readUint16 = reader('getUint16', 16);
		BitStream.prototype.readInt32 = reader('getInt32', 32);
		BitStream.prototype.readUint32 = reader('getUint32', 32);
		BitStream.prototype.readFloat32 = reader('getFloat32', 32);
		BitStream.prototype.readFloat64 = reader('getFloat64', 64);

		BitStream.prototype.writeBoolean = writer('setBoolean', 1);
		BitStream.prototype.writeInt8 = writer('setInt8', 8);
		BitStream.prototype.writeUint8 = writer('setUint8', 8);
		BitStream.prototype.writeInt16 = writer('setInt16', 16);
		BitStream.prototype.writeUint16 = writer('setUint16', 16);
		BitStream.prototype.writeInt32 = writer('setInt32', 32);
		BitStream.prototype.writeUint32 = writer('setUint32', 32);
		BitStream.prototype.writeFloat32 = writer('setFloat32', 32);
		BitStream.prototype.writeFloat64 = writer('setFloat64', 64);

		BitStream.prototype.readASCIIString = function (bytes) {
			return readASCIIString(this, bytes);
		};

		BitStream.prototype.readUTF8String = function (bytes) {
			return readUTF8String(this, bytes);
		};

		BitStream.prototype.writeASCIIString = function (string, bytes) {
			writeASCIIString(this, string, bytes);
		};

		BitStream.prototype.writeUTF8String = function (string, bytes) {
			writeUTF8String(this, string, bytes);
		};
		BitStream.prototype.readBitStream = function(bitLength) {
			var slice = new BitStream(this._view);
			slice._startIndex = this._index;
			slice._index = this._index;
			slice.length = bitLength;
			this._index += bitLength;
			return slice;
		};

		BitStream.prototype.writeBitStream = function(stream, length) {
			if (!length) {
				length = stream.bitsLeft;
			}

			var bitsToWrite;
			while (length > 0) {
				bitsToWrite = Math.min(length, 32);
				this.writeBits(stream.readBits(bitsToWrite), bitsToWrite);
				length -= bitsToWrite;
			}
		};

		BitStream.prototype.readArrayBuffer = function(byteLength) {
			var buffer = this._view.getArrayBuffer(this._index, byteLength);
			this._index += (byteLength * 8);
			return buffer;
		};

		BitStream.prototype.writeArrayBuffer = function(buffer, byteLength) {
			this.writeBitStream(new BitStream(buffer), byteLength * 8);
		};

		// AMD / RequireJS
		if (module.exports) {
			module.exports = {
				BitView: BitView,
				BitStream: BitStream
			};
		}

		}()); 
	} (bitBuffer));
	return bitBuffer.exports;
}

var bitBufferExports = requireBitBuffer();

let utilService = {};
utilService.intersection = function (arrayOfArrays) {
    return arrayOfArrays
        .reduce((acc, array, index) => {
        if (index === 0)
            return array;
        return array.filter((value) => acc.includes(value));
    }, [])
        .filter((value, index, self) => self.indexOf(value) === index) // Make values unique
    ;
};
utilService.dec2bin = function (dec, len) {
    const bin = (dec >>> 0).toString(2);
    if (len)
        return bin.padStart(len, '0');
    return bin;
};
utilService.bin2dec = function (binary) {
    if (!utilService.isString(binary)) {
        throw new Error(`Argument invalid - must be of type string. You passed in a ${typeof binary}.`);
    }
    else if (!utilService.stringOnlyContainsBinaryDigits(binary)) {
        throw new Error(`Argument invalid - string must only contain binary digits.`);
    }
    return parseInt(binary, 2);
};
utilService.bin2Float = function (binary) {
    if (!utilService.isString(binary)) {
        throw new Error(`Argument invalid - must be of type string. You passed in a ${typeof binary}.`);
    }
    else if (!utilService.stringOnlyContainsBinaryDigits(binary)) {
        throw new Error(`Argument invalid - string must only contain binary digits.`);
    }
    const buffer = Buffer.from(utilService.bin2hex(binary), 'hex');
    if (buffer.length >= 4) {
        return buffer.readFloatBE(0);
    }
    else {
        return 0;
    }
};
utilService.float2Bin = function (float) {
    const getHex = i => ('00' + i.toString(16)).slice(-2);
    var view = new DataView(new ArrayBuffer(4)), result;
    view.setFloat32(0, float);
    result = Array
        .apply(null, { length: 4 })
        .map((_, i) => getHex(view.getUint8(i)))
        .join('');
    return utilService.hex2bin(result).padStart(32, '0');
};
utilService.uintToInt = function (uint, nbit) {
    nbit = +nbit || 32;
    if (nbit > 32)
        throw new RangeError('uintToInt only supports ints up to 32 bits');
    uint <<= 32 - nbit;
    uint >>= 32 - nbit;
    return uint;
};
utilService.hex2bin = function (hex) {
    return (parseInt(hex, 16).toString(2)).padStart(8, '0');
};
utilService.bin2hex = function (bin) {
    return parseInt(bin, 2).toString(16).padStart(2, '0').toUpperCase();
};
utilService.chunk = function (str, n) {
    var ret = [];
    var i;
    var len;
    for (i = 0, len = str.length; i < len; i += n) {
        ret.push(str.substr(i, n));
    }
    return ret;
};
utilService.binaryBlockToHexBlock = function (binary) {
    const byteArray = utilService.chunk(binary, 8);
    let bytes = [];
    byteArray.forEach((byte) => {
        const hex = utilService.bin2hex(byte);
        if (hex) {
            bytes.push(hex);
        }
    });
    return bytes;
};
utilService.binaryBlockToDecimalBlock = function (binary) {
    const byteArray = utilService.chunk(binary, 8);
    let bytes = [];
    byteArray.forEach((byte) => {
        const dec = utilService.bin2dec(byte);
        if (dec !== null && dec !== undefined) {
            bytes.push(dec);
        }
    });
    return bytes;
};
utilService.getBitArray = function (data) {
    let arr = [...data];
    try {
        const bits = arr.map((decimal) => {
            return (decimal).toString(2).padStart(8, '0');
        }).reduce((prev, curr, idx) => {
            return prev + curr;
        });
        return bits;
    }
    catch (err) {
        return null;
    }
};
utilService.replaceAt = function (oldValue, index, value) {
    if (index < 0) {
        throw new Error('Index must be a positive number.');
    }
    return oldValue.substr(0, index) + value + oldValue.substr(index + value.length);
};
utilService.byteArrayToLong = function (byteArray, reverse) {
    let newByteArray;
    if (Buffer.isBuffer(byteArray)) {
        newByteArray = Buffer.from(byteArray);
    }
    else {
        newByteArray = byteArray.slice();
    }
    if (reverse) {
        newByteArray = newByteArray.reverse();
    }
    var value = 0;
    for (var i = newByteArray.length - 1; i >= 0; i--) {
        value = (value * 256) + newByteArray[i];
    }
    return value;
};
utilService.show = function (element) {
    element.classList.remove('hidden');
};
utilService.hide = function (element) {
    element.classList.add('hidden');
};
utilService.arrayMove = function (arr, old_index, new_index) {
    if (new_index >= arr.length) {
        var k = new_index - arr.length + 1;
        while (k--) {
            arr.push(undefined);
        }
    }
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
    return arr;
};
utilService.removeChildNodes = function (node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
};
utilService.isString = function (str) {
    return (typeof str === 'string' || str instanceof String);
};
utilService.stringOnlyContainsBinaryDigits = function (str) {
    return /[a-zA-Z2-9]/.test(str) === false;
};
utilService.readDWordAt = function (index, data, le) {
    if (index < 3) {
        throw new Error('Error: index must be equal to or greater than 3.');
    }
    else if (index >= data.length) {
        throw new Error('Error: index must not be greater than the passed in data array length.');
    }
    if (le) {
        return utilService.toUint32(data[index - 3] | data[index - 2] << 8 | data[index - 1] << 16 | data[index] << 24);
    }
    return utilService.toUint32(data[index] | data[index - 1] << 8 | data[index - 2] << 16 | data[index - 3] << 24);
};
utilService.toUint32 = function (x) {
    return utilService.modulo(utilService.toInteger(x), Math.pow(2, 32));
};
utilService.modulo = function (a, b) {
    return a - Math.floor(a / b) * b;
};
utilService.toInteger = function (x) {
    x = Number(x);
    return x < 0 ? Math.ceil(x) : Math.floor(x);
};
utilService.getReferenceData = function (value) {
    return {
        'tableId': utilService.bin2dec(value.substring(0, 15)),
        'rowNumber': utilService.bin2dec(value.substring(15))
    };
};
utilService.getReferenceDataFromBuffer = (buf) => {
    let bv = new bitBufferExports.BitView(buf, buf.byteOffset);
    bv.bigEndian = true;
    return utilService.getReferenceDataFromBitview(bv);
};
utilService.getReferenceDataFromBitview = (bv, start = 0) => {
    return {
        tableId: bv.getBits(start, 15),
        rowNumber: bv.getBits(start + 15, 17)
    };
};
utilService.getBinaryReferenceData = function (tableId, rowNumber) {
    const referenceBinary = utilService.dec2bin(tableId, 15);
    const recordIndexBinary = utilService.dec2bin(rowNumber, 17);
    return referenceBinary + recordIndexBinary;
};

class FranchiseEnumValue {
    /** @param {string} name @param {number} index @param {string} value @param {string?} [unformattedValue] */
    constructor(name, index, value, unformattedValue) {
        /** @private */
        this._name = name;
        /** @private */
        this._index = typeof (index) === 'number' ? index : parseInt(index);
        /** @private */
        this._value = typeof (value) === 'number' ? value : parseInt(value);
        /** @private */
        this._unformattedValue = unformattedValue ? unformattedValue : parseFormattedValue(parseInt(value));
    }
    ;
    get name() {
        return this._name;
    }
    ;
    get index() {
        return this._index;
    }
    ;
    get value() {
        return this._value;
    }
    ;
    /** @returns {string?} */
    get unformattedValue() {
        return this._unformattedValue;
    }
    ;
    /** @param {number} length */
    setMemberLength(length) {
        if (this.value < 0) {
            this._unformattedValue = '1' + this._unformattedValue.padStart(length - 1, '0');
        }
        else {
            this._unformattedValue = this._unformattedValue.padStart(length, '0');
        }
    }
    ;
}
function parseFormattedValue(value) {
    if (value < 0) {
        return utilService.dec2bin((value * -1) - 1);
    }
    return utilService.dec2bin(value);
}

class FranchiseEnum {
    /** @param {string | FranchiseEnum} name @param {number} assetId @param {boolean} isRecordPersistent */
    constructor(name, assetId, isRecordPersistent) {
        if (typeof name === 'object') {
            const theEnum = name;
            /** @private */
            this._name = theEnum._name;
            /** @private */
            this._assetId = theEnum._assetId;
            /** @private */
            this._isRecordPersistent = theEnum._isRecordPersistent;
            /** @private */
            this._members = [];
            for (let i = 0; i < theEnum._members.length; i++) {
                const member = theEnum._members[i];
                this.addMember(member._name, member._index, member._value, member._unformattedValue);
            }
            this._maxLength = this._members[0].unformattedValue.length;
        }
        else {
            this._name = name;
            this._assetId = assetId;
            this._isRecordPersistent = isRecordPersistent;
            this._members = [];
            this._maxLength = -1;
        }
    }
    ;
    /** @returns {string} */
    get name() {
        return this._name;
    }
    ;
    /** @returns {number} */
    get assetId() {
        return this._assetId;
    }
    ;
    /** @returns {boolean} */
    get isRecordPersistent() {
        return this._isRecordPersistent;
    }
    ;
    /** @returns {Array<FranchiseEnumValue>} */
    get members() {
        return this._members;
    }
    /** @param {string} name @param {number} index @param {string} value @param {string?} [unformattedValue] */
    addMember(name, index, value, unformattedValue) {
        this._members.push(new FranchiseEnumValue(name, index, value, unformattedValue));
    }
    ;
    /** @param {string} value @returns {FranchiseEnumValue?} */
    getMemberByValue(value) {
        const matches = this._members.filter((member) => { return member.name !== 'First_' && member.name !== 'Last_' && member.value === value; });
        if (matches.length === 0) {
            throw new Error(`Argument is not a valid enum value for this field. You passed in ${value}. Field name: ${this.name}`);
        }
        const matchesNoUnderscore = matches.find((member) => { return member.name[member.name.length - 1] !== '_'; });
        return matchesNoUnderscore ? matchesNoUnderscore : matches[0];
    }
    ;
    /** @param {string} value @returns {FranchiseEnumValue?} */
    getMemberByUnformattedValue(value) {
        if (value.length > this._maxLength) {
            const valueToCutOff = value.substring(0, value.length - this._maxLength);
            // if the user passes in 100000, but the enum's max value is only 5 digits...we need to throw an error.
            const cutOffContainsData = /[a-zA-Z1-9]/.test(valueToCutOff);
            if (cutOffContainsData) {
                throw new Error(`Argument is not a valid enum value for this field. You passed in ${value}. Field name: ${this.name}`);
            }
            value = value.substring(value.length - this._maxLength);
        }
        const matches = this._members.filter((member) => { return member.name !== 'First_' && member.name !== 'Last_' && member.unformattedValue === value; });
        if (matches.length === 0) {
            throw new Error(`Argument is not a valid enum value for this field. You passed in ${value}. Field name: ${this.name}`);
        }
        const matchesNoUnderscore = matches.find((member) => { return member.name[member.name.length - 1] !== '_'; });
        return matchesNoUnderscore ? matchesNoUnderscore : matches[0];
    }
    ;
    /** @param {string} name @returns {FranchiseEnumValue?} */
    getMemberByName(name) {
        return this._members.find((member) => { return member.name.toLowerCase() === name.toLowerCase(); });
    }
    ;
    setMemberLength() {
        if (this._members.length === 0) {
            return;
        }
        const maxValue = this._members.reduce((accum, currentVal) => {
            return (accum.value > currentVal.value ? accum : currentVal);
        });
        const hasNegativeNumbers = this._members.find((member) => { return member.value < 0; });
        this._maxLength = hasNegativeNumbers ? maxValue.unformattedValue.length + 1 : maxValue.unformattedValue.length;
        this._members.forEach((member) => {
            member.setMemberLength(this._maxLength);
        });
    }
    ;
}

var parser$1 = {};

var hasRequiredParser;

function requireParser () {
	if (hasRequiredParser) return parser$1;
	hasRequiredParser = 1;

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	Object.defineProperty(parser$1, "__esModule", {
	  value: true
	});
	parser$1.EVENTS = undefined;

	var _createClass = function () {
	  function defineProperties(target, props) {
	    for (var i = 0; i < props.length; i++) {
	      var descriptor = props[i];
	      descriptor.enumerable = descriptor.enumerable || false;
	      descriptor.configurable = true;
	      if ("value" in descriptor) descriptor.writable = true;
	      Object.defineProperty(target, descriptor.key, descriptor);
	    }
	  }

	  return function (Constructor, protoProps, staticProps) {
	    if (protoProps) defineProperties(Constructor.prototype, protoProps);
	    if (staticProps) defineProperties(Constructor, staticProps);
	    return Constructor;
	  };
	}();

	var _stream = require$$0;

	function _classCallCheck(instance, Constructor) {
	  if (!(instance instanceof Constructor)) {
	    throw new TypeError("Cannot call a class as a function");
	  }
	}

	function _possibleConstructorReturn(self, call) {
	  if (!self) {
	    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
	  }
	  return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
	}

	function _inherits(subClass, superClass) {
	  if (typeof superClass !== "function" && superClass !== null) {
	    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
	  }
	  subClass.prototype = Object.create(superClass && superClass.prototype, {
	    constructor: {
	      value: subClass,
	      enumerable: false,
	      writable: true,
	      configurable: true
	    }
	  });
	  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
	}

	/**
	 * A fast XML parser for NodeJS using Writable streams.
	 *
	 * What this is:
	 * Simple and fast XML parser purley written for NodeJS. No extra production dependencies.
	 * A handy way parse ATOM/RSS/RDF feeds and such. No validation is made on the document that is parsed.
	 *
	 * Motivation
	 * There is already quite a few parsers out there. I just wanted a parser that was as tiny and fast as possible to handle easy parsing of
	 * RSS/ATOM/RDF feeds using streams, no fancy stuff needed. If you want more functionality you should check out other recommended parsers (see below)
	 *
	 * Usage
	 * Just #pipe() a <stream.Readable> and you are ready to listen for events.
	 * You can also use the #write() method to write directly to the parser.
	 *
	 * The source is written using ES2015, babel is used to translate to the dist.
	 *
	 * Other recommended parsers for node that are great:
	 * https://github.com/isaacs/sax-js
	 * https://github.com/xmppjs/ltx
	 *
	 * Events:
	 * - text
	 * - instruction
	 * - opentag
	 * - closetag
	 * - cdata
	 *
	 * Comments are ignored, so there is no events for them.
	 *
	 */
	var Parser = function (_Writable) {
	  _inherits(Parser, _Writable);

	  function Parser() {
	    _classCallCheck(this, Parser);

	    var _this = _possibleConstructorReturn(this, (Parser.__proto__ || Object.getPrototypeOf(Parser)).call(this));

	    _this.state = STATE.TEXT;
	    _this.buffer = "";
	    _this.pos = 0;
	    _this.tagType = TAG_TYPE.NONE;
	    return _this;
	  }

	  _createClass(Parser, [{
	    key: "_write",
	    value: function _write(chunk, encoding, done) {
	      chunk = typeof chunk !== "string" ? chunk.toString() : chunk;
	      for (var i = 0; i < chunk.length; i++) {
	        var c = chunk[i];
	        var prev = this.buffer[this.pos - 1];
	        this.buffer += c;
	        this.pos++;

	        switch (this.state) {
	          case STATE.TEXT:
	            if (c === "<") this._onStartNewTag();
	            break;

	          case STATE.TAG_NAME:
	            if (prev === "<" && c === "?") {
	              this._onStartInstruction();
	            }
	            if (prev === "<" && c === "/") {
	              this._onCloseTagStart();
	            }
	            if (this.buffer[this.pos - 3] === "<" && prev === "!" && c === "[") {
	              this._onCDATAStart();
	            }
	            if (this.buffer[this.pos - 3] === "<" && prev === "!" && c === "-") {
	              this._onCommentStart();
	            }
	            if (c === ">") {
	              if (prev === "/") {
	                this.tagType = TAG_TYPE.SELF_CLOSING;
	              }
	              this._onTagCompleted();
	            }
	            break;

	          case STATE.INSTRUCTION:
	            if (prev === "?" && c === ">") this._onEndInstruction();
	            break;

	          case STATE.CDATA:
	            if (this.buffer[this.pos - 3] === "]" && prev === "]" && c === ">") this._onCDATAEnd();
	            break;

	          case STATE.IGNORE_COMMENT:
	            if (this.buffer[this.pos - 3] === "-" && prev === "-" && c === ">") this._onCommentEnd();
	            break;
	        }
	      }
	      done();
	    }
	  }, {
	    key: "_endRecording",
	    value: function _endRecording() {
	      var rec = this.buffer.slice(1, this.pos - 1);
	      this.buffer = this.buffer.slice(-1); // Keep last item in buffer for prev comparison in main loop.
	      this.pos = 1; // Reset the position (since the buffer was reset)
	      return rec;
	    }
	  }, {
	    key: "_onStartNewTag",
	    value: function _onStartNewTag() {
	      var text = this._endRecording().trim();
	      if (text) {
	        this.emit(EVENTS.TEXT, text);
	      }
	      this.state = STATE.TAG_NAME;
	      this.tagType = TAG_TYPE.OPENING;
	    }
	  }, {
	    key: "_onTagCompleted",
	    value: function _onTagCompleted() {
	      var tag = this._endRecording();

	      var _parseTagString2 = this._parseTagString(tag),
	          name = _parseTagString2.name,
	          attributes = _parseTagString2.attributes;

	      if (name === null) {
	        this.emit(EVENTS.ERROR, new Error("Failed to parse name for tag" + tag));
	      }

	      if (this.tagType && this.tagType == TAG_TYPE.OPENING) {
	        this.emit(EVENTS.OPEN_TAG, name, attributes);
	      }

	      if (this.tagType && this.tagType === TAG_TYPE.CLOSING) {
	        this.emit(EVENTS.CLOSE_TAG, name, attributes);
	      }
	      if (this.tagType && this.tagType === TAG_TYPE.SELF_CLOSING) {
	        if (Object.keys(attributes).length === 0 && attributes.constructor === Object) {
	          attributes = { ___selfClosing___: true };
	        }
	        this.emit(EVENTS.OPEN_TAG, name, attributes);
	        this.emit(EVENTS.CLOSE_TAG, name, attributes);
	      }

	      this.state = STATE.TEXT;
	      this.tagType = TAG_TYPE.NONE;
	    }
	  }, {
	    key: "_onCloseTagStart",
	    value: function _onCloseTagStart() {
	      this._endRecording();
	      this.tagType = TAG_TYPE.CLOSING;
	    }
	  }, {
	    key: "_onStartInstruction",
	    value: function _onStartInstruction() {
	      this._endRecording();
	      this.state = STATE.INSTRUCTION;
	    }
	  }, {
	    key: "_onEndInstruction",
	    value: function _onEndInstruction() {
	      this.pos -= 1; // Move position back 1 step since instruction ends with '?>'
	      var inst = this._endRecording();

	      var _parseTagString3 = this._parseTagString(inst),
	          name = _parseTagString3.name,
	          attributes = _parseTagString3.attributes;

	      if (name === null) {
	        this.emit(EVENTS.ERROR, new Error("Failed to parse name for inst" + inst));
	      }
	      this.emit(EVENTS.INSTRUCTION, name, attributes);
	      this.state = STATE.TEXT;
	    }
	  }, {
	    key: "_onCDATAStart",
	    value: function _onCDATAStart() {
	      this._endRecording();
	      this.state = STATE.CDATA;
	    }
	  }, {
	    key: "_onCDATAEnd",
	    value: function _onCDATAEnd() {
	      var text = this._endRecording(); // Will return CDATA[XXX] we regexp out the actual text in the CDATA.
	      text = text.slice(text.indexOf("[") + 1, text.lastIndexOf("]>") - 1);
	      this.state = STATE.TEXT;

	      this.emit(EVENTS.CDATA, text);
	    }
	  }, {
	    key: "_onCommentStart",
	    value: function _onCommentStart() {
	      this.state = STATE.IGNORE_COMMENT;
	    }
	  }, {
	    key: "_onCommentEnd",
	    value: function _onCommentEnd() {
	      this._endRecording();
	      this.state = STATE.TEXT;
	    }

	    /**
	     * Helper to parse a tag string 'xml version="2.0" encoding="utf-8"' with regexp.
	     * @param  {string} str the tag string.
	     * @return {object}     {name, attributes}
	     */
	  }, {
	    key: "_parseTagString",
	    value: function _parseTagString(str) {
	      // parse name

	      var name = void 0;
	      var parsedString = /^([a-zäöüßÄÖÜA-Z0-9:_\-.\/]+?)(\s|$)/.exec(str);
	      if (parsedString && parsedString.length > 0) {
	        name = parsedString[1];
	        var attributesString = str.substr(name.length);
	        var attributeRegexp = /([a-zäöüßÄÖÜA-Z0-9:_\-.]+?)="([^"]+?)"/g;
	        var match = attributeRegexp.exec(attributesString);
	        var attributes = {};
	        while (match != null) {
	          attributes[match[1]] = match[2];
	          match = attributeRegexp.exec(attributesString);
	        }
	        if (name[name.length - 1] === "/") {
	          name = name.substr(0, name.length - 1);
	        }
	        return { name: name, attributes: attributes };
	      }
	      return { name: null, attributes: {} };
	    }
	  }]);

	  return Parser;
	}(_stream.Writable);

	parser$1.default = Parser;

	var STATE = {
	  TEXT: 0,
	  TAG_NAME: 1,
	  INSTRUCTION: 2,
	  IGNORE_COMMENT: 4,
	  CDATA: 8
	};

	var TAG_TYPE = {
	  NONE: 0,
	  OPENING: 1,
	  CLOSING: 2,
	  SELF_CLOSING: 3
	};

	var EVENTS = parser$1.EVENTS = {
	  ERROR: "error",
	  TEXT: "text",
	  INSTRUCTION: "instruction",
	  OPEN_TAG: "opentag",
	  CLOSE_TAG: "closetag",
	  CDATA: "cdata"
	};
	return parser$1;
}

var dist;
var hasRequiredDist;

function requireDist () {
	if (hasRequiredDist) return dist;
	hasRequiredDist = 1;

	var _parser = requireParser();

	var _parser2 = _interopRequireDefault(_parser);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	dist = _parser2.default;
	return dist;
}

var distExports = requireDist();
var XmlParser = /*@__PURE__*/getDefaultExportFromCjs(distExports);

const __filename$6 = url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href)));
const __dirname$6 = path.dirname(__filename$6);

let schemaGenerator = {};
schemaGenerator.eventEmitter = new events.EventEmitter();
/** @param {string} inputFile @param {boolean?} [showOutput] @param {string?} [outputFile] */
schemaGenerator.generate = (inputFile, showOutput, outputFile) => {
    const stream = fs.createReadStream(inputFile);
    schemaGenerator.generateFromStream(stream, showOutput, outputFile);
};
/** @param {ReadableStream} stream @param {boolean?} [showOutput] @param {string?} [outputFile] */
schemaGenerator.generateFromStream = (stream, showOutput, outputFile) => {
    schemaGenerator.root = {};
    schemaGenerator.schemas = [];
    schemaGenerator.schemaMap = {};
    schemaGenerator.schemaMeta = {};
    schemaGenerator.enums = [];
    const extraSchemas = schemaGenerator.getExtraSchemas();
    schemaGenerator.xml = new XmlParser();
    require$$0.pipeline(stream, schemaGenerator.xml, (err) => {
        if (err) {
            console.error(err);
            throw err;
        }
        schemaGenerator.enums.forEach((theEnum) => {
            theEnum.setMemberLength();
        });
        const majorVersion = schemaGenerator.schemaMeta.dataMajorVersion;
        const minorVersion = schemaGenerator.schemaMeta.dataMinorVersion;
        const databaseName = schemaGenerator.schemaMeta.databaseName;
        const gameYear = /Madden(\d{2})/.exec(databaseName)[1];
        addExtraSchemas();
        calculateInheritedSchemas();
        schemaGenerator.root = {
            'meta': {
                'major': parseInt(majorVersion),
                'minor': parseInt(minorVersion),
                'gameYear': parseInt(gameYear)
            },
            'schemas': schemaGenerator.schemas,
            'schemaMap': schemaGenerator.schemaMap
        };
        if (outputFile) {
            zlib.gzip(JSON.stringify(schemaGenerator.root), function (_, data) {
                fs.writeFileSync(path.join(outputFile, `${majorVersion}_${minorVersion}.gz`), data);
            });
        }
        schemaGenerator.eventEmitter.emit('schemas:done', schemaGenerator.root);
    });
    let currentParent = {
        type: '',
        ref: null
    };
    schemaGenerator.xml.on('opentag', (name, attrs) => {
        if (name === 'FranTkData') {
            schemaGenerator.schemaMeta.databaseName = attrs.databaseName;
            schemaGenerator.schemaMeta.dataMajorVersion = attrs.dataMajorVersion;
            schemaGenerator.schemaMeta.dataMinorVersion = attrs.dataMinorVersion;
        }
        else if (name === 'enum') {
            let theEnum = parseEnum(attrs);
            schemaGenerator.enums.push(theEnum);
            currentParent = {
                type: 'enum',
                ref: theEnum
            };
        }
        else if (name === 'schema') {
            let schema = parseSchema(attrs);
            schema.attributes = [];
            schemaGenerator.schemas.push(schema);
            schemaGenerator.schemaMap[schema.name] = schema;
            currentParent = {
                type: 'schema',
                ref: schema
            };
        }
        else if (name === 'attribute') {
            if (currentParent.type === 'enum') {
                currentParent.ref.addMember(attrs.name, attrs.idx, attrs.value);
            }
            else {
                const attribute = parseAttribute(attrs);
                currentParent.ref.attributes.push(attribute);
            }
        }
    });
    function parseEnum(enumAttributes) {
        return new FranchiseEnum(enumAttributes.name, enumAttributes.assetId, enumAttributes.isRecordPersistent);
    }
    function parseSchema(schemaAttributes) {
        return {
            'assetId': schemaAttributes.assetId,
            'ownerAssetId': schemaAttributes.ownerAssetId,
            'numMembers': schemaAttributes.numMembers,
            'name': schemaAttributes.name,
            'base': schemaAttributes.base
        };
    }
    function parseAttribute(attributeAttributes) {
        return {
            'index': attributeAttributes.idx,
            'name': attributeAttributes.name,
            'type': attributeAttributes.type,
            'minValue': attributeAttributes.minValue,
            'maxValue': attributeAttributes.maxValue,
            'maxLength': attributeAttributes.maxLen,
            'default': getDefaultValue(attributeAttributes.default),
            'final': attributeAttributes.final,
            'enum': getEnum(attributeAttributes.type),
            'const': attributeAttributes.const
        };
        function getDefaultValue(defaultVal) {
            if (!defaultVal) {
                return undefined;
            }
            defaultVal = defaultVal
                .replace(new RegExp('&#xD;', 'g'), '\r')
                .replace(new RegExp('&#xA;', 'g'), '\n')
                .replace(new RegExp('&amp;', 'g'), '&')
                .replace(new RegExp('&gt;', 'g'), '>')
                .replace(new RegExp('&lt;', 'g'), '<')
                .replace(new RegExp('&quot;', 'g'), '\"');
            return defaultVal;
        }
    }
    function addExtraSchemas() {
        extraSchemas.forEach((schema) => {
            if (!schemaGenerator.schemaMap[schema.name]) {
                schema.attributes.filter((attrib) => {
                    return attrib.enum && !(attrib.enum instanceof FranchiseEnum);
                }).forEach((attrib) => {
                    attrib.enum = getEnum(attrib.enum);
                });
                schemaGenerator.schemas.unshift(schema);
            }
        });
    }
    function calculateInheritedSchemas() {
        schemaGenerator.calculateInheritedSchemas(schemaGenerator.schemas);
    }
    function getEnum(name) {
        return schemaGenerator.enums.find((theEnum) => { return theEnum.name === name; });
    }
};
/** @returns {Record<string, any>} */
schemaGenerator.getExtraSchemas = () => {
    const filePath = path.join(__dirname$6, '../data/schemas/extra-schemas.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
};
/** @param {Array<TableSchema>} schemaList */
schemaGenerator.calculateInheritedSchemas = (schemaList) => {
    const schemasWithBase = schemaList.filter((schema) => { return schema.base && schema.base.indexOf("()") === -1; });
    schemasWithBase.forEach((schema) => {
        if (schema.base && schema.base.indexOf('()') === -1) {
            schema.originalAttributesOrder = schema.attributes;
            const baseSchema = schemaList.find((schemaToSearch) => { return schemaToSearch.name === schema.base; });
            if (baseSchema) {
                baseSchema.attributes.forEach((baseAttribute, index) => {
                    let oldIndex = schema.attributes.findIndex((schemaAttribute) => { return schemaAttribute?.name === baseAttribute?.name; });
                    utilService.arrayMove(schema.attributes, oldIndex, index);
                });
            }
        }
    });
};

const nameStartChar = ':A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD';
const nameChar = nameStartChar + '\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040';
const nameRegexp = '[' + nameStartChar + '][' + nameChar + ']*';
const regexName = new RegExp('^' + nameRegexp + '$');

function getAllMatches(string, regex) {
  const matches = [];
  let match = regex.exec(string);
  while (match) {
    const allmatches = [];
    allmatches.startIndex = regex.lastIndex - match[0].length;
    const len = match.length;
    for (let index = 0; index < len; index++) {
      allmatches.push(match[index]);
    }
    matches.push(allmatches);
    match = regex.exec(string);
  }
  return matches;
}

const isName = function(string) {
  const match = regexName.exec(string);
  return !(match === null || typeof match === 'undefined');
};

function isExist(v) {
  return typeof v !== 'undefined';
}

// const fakeCall = function(a) {return a;};
// const fakeCallNoReturn = function() {};

const defaultOptions$1 = {
  allowBooleanAttributes: false, //A tag can have attributes without any value
  unpairedTags: []
};

//const tagsPattern = new RegExp("<\\/?([\\w:\\-_\.]+)\\s*\/?>","g");
function validate(xmlData, options) {
  options = Object.assign({}, defaultOptions$1, options);

  //xmlData = xmlData.replace(/(\r\n|\n|\r)/gm,"");//make it single line
  //xmlData = xmlData.replace(/(^\s*<\?xml.*?\?>)/g,"");//Remove XML starting tag
  //xmlData = xmlData.replace(/(<!DOCTYPE[\s\w\"\.\/\-\:]+(\[.*\])*\s*>)/g,"");//Remove DOCTYPE
  const tags = [];
  let tagFound = false;

  //indicates that the root tag has been closed (aka. depth 0 has been reached)
  let reachedRoot = false;

  if (xmlData[0] === '\ufeff') {
    // check for byte order mark (BOM)
    xmlData = xmlData.substr(1);
  }
  
  for (let i = 0; i < xmlData.length; i++) {

    if (xmlData[i] === '<' && xmlData[i+1] === '?') {
      i+=2;
      i = readPI(xmlData,i);
      if (i.err) return i;
    }else if (xmlData[i] === '<') {
      //starting of tag
      //read until you reach to '>' avoiding any '>' in attribute value
      let tagStartPos = i;
      i++;
      
      if (xmlData[i] === '!') {
        i = readCommentAndCDATA(xmlData, i);
        continue;
      } else {
        let closingTag = false;
        if (xmlData[i] === '/') {
          //closing tag
          closingTag = true;
          i++;
        }
        //read tagname
        let tagName = '';
        for (; i < xmlData.length &&
          xmlData[i] !== '>' &&
          xmlData[i] !== ' ' &&
          xmlData[i] !== '\t' &&
          xmlData[i] !== '\n' &&
          xmlData[i] !== '\r'; i++
        ) {
          tagName += xmlData[i];
        }
        tagName = tagName.trim();
        //console.log(tagName);

        if (tagName[tagName.length - 1] === '/') {
          //self closing tag without attributes
          tagName = tagName.substring(0, tagName.length - 1);
          //continue;
          i--;
        }
        if (!validateTagName(tagName)) {
          let msg;
          if (tagName.trim().length === 0) {
            msg = "Invalid space after '<'.";
          } else {
            msg = "Tag '"+tagName+"' is an invalid name.";
          }
          return getErrorObject('InvalidTag', msg, getLineNumberForPosition(xmlData, i));
        }

        const result = readAttributeStr(xmlData, i);
        if (result === false) {
          return getErrorObject('InvalidAttr', "Attributes for '"+tagName+"' have open quote.", getLineNumberForPosition(xmlData, i));
        }
        let attrStr = result.value;
        i = result.index;

        if (attrStr[attrStr.length - 1] === '/') {
          //self closing tag
          const attrStrStart = i - attrStr.length;
          attrStr = attrStr.substring(0, attrStr.length - 1);
          const isValid = validateAttributeString(attrStr, options);
          if (isValid === true) {
            tagFound = true;
            //continue; //text may presents after self closing tag
          } else {
            //the result from the nested function returns the position of the error within the attribute
            //in order to get the 'true' error line, we need to calculate the position where the attribute begins (i - attrStr.length) and then add the position within the attribute
            //this gives us the absolute index in the entire xml, which we can use to find the line at last
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, attrStrStart + isValid.err.line));
          }
        } else if (closingTag) {
          if (!result.tagClosed) {
            return getErrorObject('InvalidTag', "Closing tag '"+tagName+"' doesn't have proper closing.", getLineNumberForPosition(xmlData, i));
          } else if (attrStr.trim().length > 0) {
            return getErrorObject('InvalidTag', "Closing tag '"+tagName+"' can't have attributes or invalid starting.", getLineNumberForPosition(xmlData, tagStartPos));
          } else if (tags.length === 0) {
            return getErrorObject('InvalidTag', "Closing tag '"+tagName+"' has not been opened.", getLineNumberForPosition(xmlData, tagStartPos));
          } else {
            const otg = tags.pop();
            if (tagName !== otg.tagName) {
              let openPos = getLineNumberForPosition(xmlData, otg.tagStartPos);
              return getErrorObject('InvalidTag',
                "Expected closing tag '"+otg.tagName+"' (opened in line "+openPos.line+", col "+openPos.col+") instead of closing tag '"+tagName+"'.",
                getLineNumberForPosition(xmlData, tagStartPos));
            }

            //when there are no more tags, we reached the root level.
            if (tags.length == 0) {
              reachedRoot = true;
            }
          }
        } else {
          const isValid = validateAttributeString(attrStr, options);
          if (isValid !== true) {
            //the result from the nested function returns the position of the error within the attribute
            //in order to get the 'true' error line, we need to calculate the position where the attribute begins (i - attrStr.length) and then add the position within the attribute
            //this gives us the absolute index in the entire xml, which we can use to find the line at last
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, i - attrStr.length + isValid.err.line));
          }

          //if the root level has been reached before ...
          if (reachedRoot === true) {
            return getErrorObject('InvalidXml', 'Multiple possible root nodes found.', getLineNumberForPosition(xmlData, i));
          } else if(options.unpairedTags.indexOf(tagName) !== -1); else {
            tags.push({tagName, tagStartPos});
          }
          tagFound = true;
        }

        //skip tag text value
        //It may include comments and CDATA value
        for (i++; i < xmlData.length; i++) {
          if (xmlData[i] === '<') {
            if (xmlData[i + 1] === '!') {
              //comment or CADATA
              i++;
              i = readCommentAndCDATA(xmlData, i);
              continue;
            } else if (xmlData[i+1] === '?') {
              i = readPI(xmlData, ++i);
              if (i.err) return i;
            } else {
              break;
            }
          } else if (xmlData[i] === '&') {
            const afterAmp = validateAmpersand(xmlData, i);
            if (afterAmp == -1)
              return getErrorObject('InvalidChar', "char '&' is not expected.", getLineNumberForPosition(xmlData, i));
            i = afterAmp;
          }else {
            if (reachedRoot === true && !isWhiteSpace(xmlData[i])) {
              return getErrorObject('InvalidXml', "Extra text at the end", getLineNumberForPosition(xmlData, i));
            }
          }
        } //end of reading tag text value
        if (xmlData[i] === '<') {
          i--;
        }
      }
    } else {
      if ( isWhiteSpace(xmlData[i])) {
        continue;
      }
      return getErrorObject('InvalidChar', "char '"+xmlData[i]+"' is not expected.", getLineNumberForPosition(xmlData, i));
    }
  }

  if (!tagFound) {
    return getErrorObject('InvalidXml', 'Start tag expected.', 1);
  }else if (tags.length == 1) {
      return getErrorObject('InvalidTag', "Unclosed tag '"+tags[0].tagName+"'.", getLineNumberForPosition(xmlData, tags[0].tagStartPos));
  }else if (tags.length > 0) {
      return getErrorObject('InvalidXml', "Invalid '"+
          JSON.stringify(tags.map(t => t.tagName), null, 4).replace(/\r?\n/g, '')+
          "' found.", {line: 1, col: 1});
  }

  return true;
}
function isWhiteSpace(char){
  return char === ' ' || char === '\t' || char === '\n'  || char === '\r';
}
/**
 * Read Processing insstructions and skip
 * @param {*} xmlData
 * @param {*} i
 */
function readPI(xmlData, i) {
  const start = i;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] == '?' || xmlData[i] == ' ') {
      //tagname
      const tagname = xmlData.substr(start, i - start);
      if (i > 5 && tagname === 'xml') {
        return getErrorObject('InvalidXml', 'XML declaration allowed only at the start of the document.', getLineNumberForPosition(xmlData, i));
      } else if (xmlData[i] == '?' && xmlData[i + 1] == '>') {
        //check if valid attribut string
        i++;
        break;
      } else {
        continue;
      }
    }
  }
  return i;
}

function readCommentAndCDATA(xmlData, i) {
  if (xmlData.length > i + 5 && xmlData[i + 1] === '-' && xmlData[i + 2] === '-') {
    //comment
    for (i += 3; i < xmlData.length; i++) {
      if (xmlData[i] === '-' && xmlData[i + 1] === '-' && xmlData[i + 2] === '>') {
        i += 2;
        break;
      }
    }
  } else if (
    xmlData.length > i + 8 &&
    xmlData[i + 1] === 'D' &&
    xmlData[i + 2] === 'O' &&
    xmlData[i + 3] === 'C' &&
    xmlData[i + 4] === 'T' &&
    xmlData[i + 5] === 'Y' &&
    xmlData[i + 6] === 'P' &&
    xmlData[i + 7] === 'E'
  ) {
    let angleBracketsCount = 1;
    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === '<') {
        angleBracketsCount++;
      } else if (xmlData[i] === '>') {
        angleBracketsCount--;
        if (angleBracketsCount === 0) {
          break;
        }
      }
    }
  } else if (
    xmlData.length > i + 9 &&
    xmlData[i + 1] === '[' &&
    xmlData[i + 2] === 'C' &&
    xmlData[i + 3] === 'D' &&
    xmlData[i + 4] === 'A' &&
    xmlData[i + 5] === 'T' &&
    xmlData[i + 6] === 'A' &&
    xmlData[i + 7] === '['
  ) {
    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === ']' && xmlData[i + 1] === ']' && xmlData[i + 2] === '>') {
        i += 2;
        break;
      }
    }
  }

  return i;
}

const doubleQuote = '"';
const singleQuote = "'";

/**
 * Keep reading xmlData until '<' is found outside the attribute value.
 * @param {string} xmlData
 * @param {number} i
 */
function readAttributeStr(xmlData, i) {
  let attrStr = '';
  let startChar = '';
  let tagClosed = false;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === doubleQuote || xmlData[i] === singleQuote) {
      if (startChar === '') {
        startChar = xmlData[i];
      } else if (startChar !== xmlData[i]) ; else {
        startChar = '';
      }
    } else if (xmlData[i] === '>') {
      if (startChar === '') {
        tagClosed = true;
        break;
      }
    }
    attrStr += xmlData[i];
  }
  if (startChar !== '') {
    return false;
  }

  return {
    value: attrStr,
    index: i,
    tagClosed: tagClosed
  };
}

/**
 * Select all the attributes whether valid or invalid.
 */
const validAttrStrRegxp = new RegExp('(\\s*)([^\\s=]+)(\\s*=)?(\\s*([\'"])(([\\s\\S])*?)\\5)?', 'g');

//attr, ="sd", a="amit's", a="sd"b="saf", ab  cd=""

function validateAttributeString(attrStr, options) {
  //console.log("start:"+attrStr+":end");

  //if(attrStr.trim().length === 0) return true; //empty string

  const matches = getAllMatches(attrStr, validAttrStrRegxp);
  const attrNames = {};

  for (let i = 0; i < matches.length; i++) {
    if (matches[i][1].length === 0) {
      //nospace before attribute name: a="sd"b="saf"
      return getErrorObject('InvalidAttr', "Attribute '"+matches[i][2]+"' has no space in starting.", getPositionFromMatch(matches[i]))
    } else if (matches[i][3] !== undefined && matches[i][4] === undefined) {
      return getErrorObject('InvalidAttr', "Attribute '"+matches[i][2]+"' is without value.", getPositionFromMatch(matches[i]));
    } else if (matches[i][3] === undefined && !options.allowBooleanAttributes) {
      //independent attribute: ab
      return getErrorObject('InvalidAttr', "boolean attribute '"+matches[i][2]+"' is not allowed.", getPositionFromMatch(matches[i]));
    }
    /* else if(matches[i][6] === undefined){//attribute without value: ab=
                    return { err: { code:"InvalidAttr",msg:"attribute " + matches[i][2] + " has no value assigned."}};
                } */
    const attrName = matches[i][2];
    if (!validateAttrName(attrName)) {
      return getErrorObject('InvalidAttr', "Attribute '"+attrName+"' is an invalid name.", getPositionFromMatch(matches[i]));
    }
    if (!attrNames.hasOwnProperty(attrName)) {
      //check for duplicate attribute.
      attrNames[attrName] = 1;
    } else {
      return getErrorObject('InvalidAttr', "Attribute '"+attrName+"' is repeated.", getPositionFromMatch(matches[i]));
    }
  }

  return true;
}

function validateNumberAmpersand(xmlData, i) {
  let re = /\d/;
  if (xmlData[i] === 'x') {
    i++;
    re = /[\da-fA-F]/;
  }
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === ';')
      return i;
    if (!xmlData[i].match(re))
      break;
  }
  return -1;
}

function validateAmpersand(xmlData, i) {
  // https://www.w3.org/TR/xml/#dt-charref
  i++;
  if (xmlData[i] === ';')
    return -1;
  if (xmlData[i] === '#') {
    i++;
    return validateNumberAmpersand(xmlData, i);
  }
  let count = 0;
  for (; i < xmlData.length; i++, count++) {
    if (xmlData[i].match(/\w/) && count < 20)
      continue;
    if (xmlData[i] === ';')
      break;
    return -1;
  }
  return i;
}

function getErrorObject(code, message, lineNumber) {
  return {
    err: {
      code: code,
      msg: message,
      line: lineNumber.line || lineNumber,
      col: lineNumber.col,
    },
  };
}

function validateAttrName(attrName) {
  return isName(attrName);
}

// const startsWithXML = /^xml/i;

function validateTagName(tagname) {
  return isName(tagname) /* && !tagname.match(startsWithXML) */;
}

//this function returns the line number for the character at the given index
function getLineNumberForPosition(xmlData, index) {
  const lines = xmlData.substring(0, index).split(/\r?\n/);
  return {
    line: lines.length,

    // column number is last line's length + 1, because column numbering starts at 1:
    col: lines[lines.length - 1].length + 1
  };
}

//this function returns the position of the first character of match within attrStr
function getPositionFromMatch(match) {
  return match.startIndex + match[1].length;
}

const defaultOptions = {
    preserveOrder: false,
    attributeNamePrefix: '@_',
    attributesGroupName: false,
    textNodeName: '#text',
    ignoreAttributes: true,
    removeNSPrefix: false, // remove NS from tag name or attribute name if true
    allowBooleanAttributes: false, //a tag can have attributes without any value
    //ignoreRootElement : false,
    parseTagValue: true,
    parseAttributeValue: false,
    trimValues: true, //Trim string values of tag and attributes
    cdataPropName: false,
    numberParseOptions: {
      hex: true,
      leadingZeros: true,
      eNotation: true
    },
    tagValueProcessor: function(tagName, val) {
      return val;
    },
    attributeValueProcessor: function(attrName, val) {
      return val;
    },
    stopNodes: [], //nested tags will not be parsed even for errors
    alwaysCreateTextNode: false,
    isArray: () => false,
    commentPropName: false,
    unpairedTags: [],
    processEntities: true,
    htmlEntities: false,
    ignoreDeclaration: false,
    ignorePiTags: false,
    transformTagName: false,
    transformAttributeName: false,
    updateTag: function(tagName, jPath, attrs){
      return tagName
    },
    // skipEmptyListItem: false
    captureMetaData: false,
};
   
const buildOptions = function(options) {
    return Object.assign({}, defaultOptions, options);
};

let METADATA_SYMBOL$1;

if (typeof Symbol !== "function") {
  METADATA_SYMBOL$1 = "@@xmlMetadata";
} else {
  METADATA_SYMBOL$1 = Symbol("XML Node Metadata");
}

class XmlNode{
  constructor(tagname) {
    this.tagname = tagname;
    this.child = []; //nested tags, text, cdata, comments in order
    this[":@"] = {}; //attributes map
  }
  add(key,val){
    // this.child.push( {name : key, val: val, isCdata: isCdata });
    if(key === "__proto__") key = "#__proto__";
    this.child.push( {[key]: val });
  }
  addChild(node, startIndex) {
    if(node.tagname === "__proto__") node.tagname = "#__proto__";
    if(node[":@"] && Object.keys(node[":@"]).length > 0){
      this.child.push( { [node.tagname]: node.child, [":@"]: node[":@"] });
    }else {
      this.child.push( { [node.tagname]: node.child });
    }
    // if requested, add the startIndex
    if (startIndex !== undefined) {
      // Note: for now we just overwrite the metadata. If we had more complex metadata,
      // we might need to do an object append here:  metadata = { ...metadata, startIndex }
      this.child[this.child.length - 1][METADATA_SYMBOL$1] = { startIndex };
    }
  }
  /** symbol used for metadata */
  static getMetaDataSymbol() {
    return METADATA_SYMBOL$1;
  }
}

//TODO: handle comments
function readDocType(xmlData, i){
    
    const entities = {};
    if( xmlData[i + 3] === 'O' &&
         xmlData[i + 4] === 'C' &&
         xmlData[i + 5] === 'T' &&
         xmlData[i + 6] === 'Y' &&
         xmlData[i + 7] === 'P' &&
         xmlData[i + 8] === 'E')
    {    
        i = i+9;
        let angleBracketsCount = 1;
        let hasBody = false, comment = false;
        let exp = "";
        for(;i<xmlData.length;i++){
            if (xmlData[i] === '<' && !comment) { //Determine the tag type
                if( hasBody && hasSeq(xmlData, "!ENTITY",i)){
                    i += 7; 
                    let entityName, val;
                    [entityName, val,i] = readEntityExp(xmlData,i+1);
                    if(val.indexOf("&") === -1) //Parameter entities are not supported
                        entities[ entityName ] = {
                            regx : RegExp( `&${entityName};`,"g"),
                            val: val
                        };
                }
                else if( hasBody && hasSeq(xmlData, "!ELEMENT",i))  {
                    i += 8;//Not supported
                    const {index} = readElementExp(xmlData,i+1);
                    i = index;
                }else if( hasBody && hasSeq(xmlData, "!ATTLIST",i)){
                    i += 8;//Not supported
                    // const {index} = readAttlistExp(xmlData,i+1);
                    // i = index;
                }else if( hasBody && hasSeq(xmlData, "!NOTATION",i)) {
                    i += 9;//Not supported
                    const {index} = readNotationExp(xmlData,i+1);
                    i = index;
                }else if( hasSeq(xmlData, "!--",i) ) comment = true;
                else throw new Error(`Invalid DOCTYPE`);

                angleBracketsCount++;
                exp = "";
            } else if (xmlData[i] === '>') { //Read tag content
                if(comment){
                    if( xmlData[i - 1] === "-" && xmlData[i - 2] === "-"){
                        comment = false;
                        angleBracketsCount--;
                    }
                }else {
                    angleBracketsCount--;
                }
                if (angleBracketsCount === 0) {
                  break;
                }
            }else if( xmlData[i] === '['){
                hasBody = true;
            }else {
                exp += xmlData[i];
            }
        }
        if(angleBracketsCount !== 0){
            throw new Error(`Unclosed DOCTYPE`);
        }
    }else {
        throw new Error(`Invalid Tag instead of DOCTYPE`);
    }
    return {entities, i};
}

const skipWhitespace = (data, index) => {
    while (index < data.length && /\s/.test(data[index])) {
        index++;
    }
    return index;
};

function readEntityExp(xmlData, i) {    
    //External entities are not supported
    //    <!ENTITY ext SYSTEM "http://normal-website.com" >

    //Parameter entities are not supported
    //    <!ENTITY entityname "&anotherElement;">

    //Internal entities are supported
    //    <!ENTITY entityname "replacement text">

    // Skip leading whitespace after <!ENTITY
    i = skipWhitespace(xmlData, i);

    // Read entity name
    let entityName = "";
    while (i < xmlData.length && !/\s/.test(xmlData[i]) && xmlData[i] !== '"' && xmlData[i] !== "'") {
        entityName += xmlData[i];
        i++;
    }
    validateEntityName(entityName);

    // Skip whitespace after entity name
    i = skipWhitespace(xmlData, i);

    // Check for unsupported constructs (external entities or parameter entities)
    if (xmlData.substring(i, i + 6).toUpperCase() === "SYSTEM") {
        throw new Error("External entities are not supported");
    }else if (xmlData[i] === "%") {
        throw new Error("Parameter entities are not supported");
    }

    // Read entity value (internal entity)
    let entityValue = "";
    [i, entityValue] = readIdentifierVal(xmlData, i, "entity");
    i--;
    return [entityName, entityValue, i ];
}

function readNotationExp(xmlData, i) {
    // Skip leading whitespace after <!NOTATION
    i = skipWhitespace(xmlData, i);

    // Read notation name
    let notationName = "";
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
        notationName += xmlData[i];
        i++;
    }
    validateEntityName(notationName);

    // Skip whitespace after notation name
    i = skipWhitespace(xmlData, i);

    // Check identifier type (SYSTEM or PUBLIC)
    const identifierType = xmlData.substring(i, i + 6).toUpperCase();
    if (identifierType !== "SYSTEM" && identifierType !== "PUBLIC") {
        throw new Error(`Expected SYSTEM or PUBLIC, found "${identifierType}"`);
    }
    i += identifierType.length;

    // Skip whitespace after identifier type
    i = skipWhitespace(xmlData, i);

    // Read public identifier (if PUBLIC)
    let publicIdentifier = null;
    let systemIdentifier = null;

    if (identifierType === "PUBLIC") {
        [i, publicIdentifier ] = readIdentifierVal(xmlData, i, "publicIdentifier");

        // Skip whitespace after public identifier
        i = skipWhitespace(xmlData, i);

        // Optionally read system identifier
        if (xmlData[i] === '"' || xmlData[i] === "'") {
            [i, systemIdentifier ] = readIdentifierVal(xmlData, i,"systemIdentifier");
        }
    } else if (identifierType === "SYSTEM") {
        // Read system identifier (mandatory for SYSTEM)
        [i, systemIdentifier ] = readIdentifierVal(xmlData, i, "systemIdentifier");

        if (!systemIdentifier) {
            throw new Error("Missing mandatory system identifier for SYSTEM notation");
        }
    }
    
    return {notationName, publicIdentifier, systemIdentifier, index: --i};
}

function readIdentifierVal(xmlData, i, type) {
    let identifierVal = "";
    const startChar = xmlData[i];
    if (startChar !== '"' && startChar !== "'") {
        throw new Error(`Expected quoted string, found "${startChar}"`);
    }
    i++;

    while (i < xmlData.length && xmlData[i] !== startChar) {
        identifierVal += xmlData[i];
        i++;
    }

    if (xmlData[i] !== startChar) {
        throw new Error(`Unterminated ${type} value`);
    }
    i++;
    return [i, identifierVal];
}

function readElementExp(xmlData, i) {
    // <!ELEMENT br EMPTY>
    // <!ELEMENT div ANY>
    // <!ELEMENT title (#PCDATA)>
    // <!ELEMENT book (title, author+)>
    // <!ELEMENT name (content-model)>
    
    // Skip leading whitespace after <!ELEMENT
    i = skipWhitespace(xmlData, i);

    // Read element name
    let elementName = "";
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
        elementName += xmlData[i];
        i++;
    }

    // Validate element name
    if (!validateEntityName(elementName)) {
        throw new Error(`Invalid element name: "${elementName}"`);
    }

    // Skip whitespace after element name
    i = skipWhitespace(xmlData, i);
    let contentModel = "";
    // Expect '(' to start content model
    if(xmlData[i] === "E" && hasSeq(xmlData, "MPTY",i)) i+=4;
    else if(xmlData[i] === "A" && hasSeq(xmlData, "NY",i)) i+=2;
    else if (xmlData[i] === "(") {
        i++; // Move past '('

        // Read content model
        while (i < xmlData.length && xmlData[i] !== ")") {
            contentModel += xmlData[i];
            i++;
        }
        if (xmlData[i] !== ")") {
            throw new Error("Unterminated content model");
        }

    }else {
        throw new Error(`Invalid Element Expression, found "${xmlData[i]}"`);
    }
    
    return {
        elementName,
        contentModel: contentModel.trim(),
        index: i
    };
}

function hasSeq(data, seq,i){
    for(let j=0;j<seq.length;j++){
        if(seq[j]!==data[i+j+1]) return false;
    }
    return true;
}

function validateEntityName(name){
    if (isName(name))
	return name;
    else
        throw new Error(`Invalid entity name ${name}`);
}

const hexRegex = /^[-+]?0x[a-fA-F0-9]+$/;
const numRegex = /^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/;
// const octRegex = /^0x[a-z0-9]+/;
// const binRegex = /0x[a-z0-9]+/;

 
const consider = {
    hex :  true,
    // oct: false,
    leadingZeros: true,
    decimalPoint: "\.",
    eNotation: true,
    //skipLike: /regex/
};

function toNumber(str, options = {}){
    options = Object.assign({}, consider, options );
    if(!str || typeof str !== "string" ) return str;
    
    let trimmedStr  = str.trim();
    
    if(options.skipLike !== undefined && options.skipLike.test(trimmedStr)) return str;
    else if(str==="0") return 0;
    else if (options.hex && hexRegex.test(trimmedStr)) {
        return parse_int(trimmedStr, 16);
    // }else if (options.oct && octRegex.test(str)) {
    //     return Number.parseInt(val, 8);
    }else if (trimmedStr.search(/.+[eE].+/)!== -1) { //eNotation
        return resolveEnotation(str,trimmedStr,options);
    // }else if (options.parseBin && binRegex.test(str)) {
    //     return Number.parseInt(val, 2);
    }else {
        //separate negative sign, leading zeros, and rest number
        const match = numRegex.exec(trimmedStr);
        // +00.123 => [ , '+', '00', '.123', ..
        if(match){
            const sign = match[1] || "";
            const leadingZeros = match[2];
            let numTrimmedByZeros = trimZeros(match[3]); //complete num without leading zeros
            const decimalAdjacentToLeadingZeros = sign ? // 0., -00., 000.
                str[leadingZeros.length+1] === "." 
                : str[leadingZeros.length] === ".";

            //trim ending zeros for floating number
            if(!options.leadingZeros //leading zeros are not allowed
                && (leadingZeros.length > 1 
                    || (leadingZeros.length === 1 && !decimalAdjacentToLeadingZeros))){
                // 00, 00.3, +03.24, 03, 03.24
                return str;
            }
            else {//no leading zeros or leading zeros are allowed
                const num = Number(trimmedStr);
                const parsedStr = String(num);

                if( num === 0) return num;
                if(parsedStr.search(/[eE]/) !== -1){ //given number is long and parsed to eNotation
                    if(options.eNotation) return num;
                    else return str;
                }else if(trimmedStr.indexOf(".") !== -1){ //floating number
                    if(parsedStr === "0") return num; //0.0
                    else if(parsedStr === numTrimmedByZeros) return num; //0.456. 0.79000
                    else if( parsedStr === `${sign}${numTrimmedByZeros}`) return num;
                    else return str;
                }
                
                let n = leadingZeros? numTrimmedByZeros : trimmedStr;
                if(leadingZeros){
                    // -009 => -9
                    return (n === parsedStr) || (sign+n === parsedStr) ? num : str
                }else  {
                    // +9
                    return (n === parsedStr) || (n === sign+parsedStr) ? num : str
                }
            }
        }else { //non-numeric string
            return str;
        }
    }
}

const eNotationRegx = /^([-+])?(0*)(\d*(\.\d*)?[eE][-\+]?\d+)$/;
function resolveEnotation(str,trimmedStr,options){
    if(!options.eNotation) return str;
    const notation = trimmedStr.match(eNotationRegx); 
    if(notation){
        let sign = notation[1] || "";
        const eChar = notation[3].indexOf("e") === -1 ? "E" : "e";
        const leadingZeros = notation[2];
        const eAdjacentToLeadingZeros = sign ? // 0E.
            str[leadingZeros.length+1] === eChar 
            : str[leadingZeros.length] === eChar;

        if(leadingZeros.length > 1 && eAdjacentToLeadingZeros) return str;
        else if(leadingZeros.length === 1 
            && (notation[3].startsWith(`.${eChar}`) || notation[3][0] === eChar)){
                return Number(trimmedStr);
        }else if(options.leadingZeros && !eAdjacentToLeadingZeros){ //accept with leading zeros
            //remove leading 0s
            trimmedStr = (notation[1] || "") + notation[3];
            return Number(trimmedStr);
        }else return str;
    }else {
        return str;
    }
}

/**
 * 
 * @param {string} numStr without leading zeros
 * @returns 
 */
function trimZeros(numStr){
    if(numStr && numStr.indexOf(".") !== -1){//float
        numStr = numStr.replace(/0+$/, ""); //remove ending zeros
        if(numStr === ".")  numStr = "0";
        else if(numStr[0] === ".")  numStr = "0"+numStr;
        else if(numStr[numStr.length-1] === ".")  numStr = numStr.substring(0,numStr.length-1);
        return numStr;
    }
    return numStr;
}

function parse_int(numStr, base){
    //polyfill
    if(parseInt) return parseInt(numStr, base);
    else if(Number.parseInt) return Number.parseInt(numStr, base);
    else if(window && window.parseInt) return window.parseInt(numStr, base);
    else throw new Error("parseInt, Number.parseInt, window.parseInt are not supported")
}

function getIgnoreAttributesFn(ignoreAttributes) {
    if (typeof ignoreAttributes === 'function') {
        return ignoreAttributes
    }
    if (Array.isArray(ignoreAttributes)) {
        return (attrName) => {
            for (const pattern of ignoreAttributes) {
                if (typeof pattern === 'string' && attrName === pattern) {
                    return true
                }
                if (pattern instanceof RegExp && pattern.test(attrName)) {
                    return true
                }
            }
        }
    }
    return () => false
}

// const regx =
//   '<((!\\[CDATA\\[([\\s\\S]*?)(]]>))|((NAME:)?(NAME))([^>]*)>|((\\/)(NAME)\\s*>))([^<]*)'
//   .replace(/NAME/g, util.nameRegexp);

//const tagsRegx = new RegExp("<(\\/?[\\w:\\-\._]+)([^>]*)>(\\s*"+cdataRegx+")*([^<]+)?","g");
//const tagsRegx = new RegExp("<(\\/?)((\\w*:)?([\\w:\\-\._]+))([^>]*)>([^<]*)("+cdataRegx+"([^<]*))*([^<]+)?","g");

class OrderedObjParser{
  constructor(options){
    this.options = options;
    this.currentNode = null;
    this.tagsNodeStack = [];
    this.docTypeEntities = {};
    this.lastEntities = {
      "apos" : { regex: /&(apos|#39|#x27);/g, val : "'"},
      "gt" : { regex: /&(gt|#62|#x3E);/g, val : ">"},
      "lt" : { regex: /&(lt|#60|#x3C);/g, val : "<"},
      "quot" : { regex: /&(quot|#34|#x22);/g, val : "\""},
    };
    this.ampEntity = { regex: /&(amp|#38|#x26);/g, val : "&"};
    this.htmlEntities = {
      "space": { regex: /&(nbsp|#160);/g, val: " " },
      // "lt" : { regex: /&(lt|#60);/g, val: "<" },
      // "gt" : { regex: /&(gt|#62);/g, val: ">" },
      // "amp" : { regex: /&(amp|#38);/g, val: "&" },
      // "quot" : { regex: /&(quot|#34);/g, val: "\"" },
      // "apos" : { regex: /&(apos|#39);/g, val: "'" },
      "cent" : { regex: /&(cent|#162);/g, val: "¢" },
      "pound" : { regex: /&(pound|#163);/g, val: "£" },
      "yen" : { regex: /&(yen|#165);/g, val: "¥" },
      "euro" : { regex: /&(euro|#8364);/g, val: "€" },
      "copyright" : { regex: /&(copy|#169);/g, val: "©" },
      "reg" : { regex: /&(reg|#174);/g, val: "®" },
      "inr" : { regex: /&(inr|#8377);/g, val: "₹" },
      "num_dec": { regex: /&#([0-9]{1,7});/g, val : (_, str) => String.fromCodePoint(Number.parseInt(str, 10)) },
      "num_hex": { regex: /&#x([0-9a-fA-F]{1,6});/g, val : (_, str) => String.fromCodePoint(Number.parseInt(str, 16)) },
    };
    this.addExternalEntities = addExternalEntities;
    this.parseXml = parseXml;
    this.parseTextData = parseTextData;
    this.resolveNameSpace = resolveNameSpace;
    this.buildAttributesMap = buildAttributesMap;
    this.isItStopNode = isItStopNode;
    this.replaceEntitiesValue = replaceEntitiesValue;
    this.readStopNodeData = readStopNodeData;
    this.saveTextToParentTag = saveTextToParentTag;
    this.addChild = addChild;
    this.ignoreAttributesFn = getIgnoreAttributesFn(this.options.ignoreAttributes);
  }

}

function addExternalEntities(externalEntities){
  const entKeys = Object.keys(externalEntities);
  for (let i = 0; i < entKeys.length; i++) {
    const ent = entKeys[i];
    this.lastEntities[ent] = {
       regex: new RegExp("&"+ent+";","g"),
       val : externalEntities[ent]
    };
  }
}

/**
 * @param {string} val
 * @param {string} tagName
 * @param {string} jPath
 * @param {boolean} dontTrim
 * @param {boolean} hasAttributes
 * @param {boolean} isLeafNode
 * @param {boolean} escapeEntities
 */
function parseTextData(val, tagName, jPath, dontTrim, hasAttributes, isLeafNode, escapeEntities) {
  if (val !== undefined) {
    if (this.options.trimValues && !dontTrim) {
      val = val.trim();
    }
    if(val.length > 0){
      if(!escapeEntities) val = this.replaceEntitiesValue(val);
      
      const newval = this.options.tagValueProcessor(tagName, val, jPath, hasAttributes, isLeafNode);
      if(newval === null || newval === undefined){
        //don't parse
        return val;
      }else if(typeof newval !== typeof val || newval !== val){
        //overwrite
        return newval;
      }else if(this.options.trimValues){
        return parseValue(val, this.options.parseTagValue, this.options.numberParseOptions);
      }else {
        const trimmedVal = val.trim();
        if(trimmedVal === val){
          return parseValue(val, this.options.parseTagValue, this.options.numberParseOptions);
        }else {
          return val;
        }
      }
    }
  }
}

function resolveNameSpace(tagname) {
  if (this.options.removeNSPrefix) {
    const tags = tagname.split(':');
    const prefix = tagname.charAt(0) === '/' ? '/' : '';
    if (tags[0] === 'xmlns') {
      return '';
    }
    if (tags.length === 2) {
      tagname = prefix + tags[1];
    }
  }
  return tagname;
}

//TODO: change regex to capture NS
//const attrsRegx = new RegExp("([\\w\\-\\.\\:]+)\\s*=\\s*(['\"])((.|\n)*?)\\2","gm");
const attrsRegx = new RegExp('([^\\s=]+)\\s*(=\\s*([\'"])([\\s\\S]*?)\\3)?', 'gm');

function buildAttributesMap(attrStr, jPath, tagName) {
  if (this.options.ignoreAttributes !== true && typeof attrStr === 'string') {
    // attrStr = attrStr.replace(/\r?\n/g, ' ');
    //attrStr = attrStr || attrStr.trim();

    const matches = getAllMatches(attrStr, attrsRegx);
    const len = matches.length; //don't make it inline
    const attrs = {};
    for (let i = 0; i < len; i++) {
      const attrName = this.resolveNameSpace(matches[i][1]);
      if (this.ignoreAttributesFn(attrName, jPath)) {
        continue
      }
      let oldVal = matches[i][4];
      let aName = this.options.attributeNamePrefix + attrName;
      if (attrName.length) {
        if (this.options.transformAttributeName) {
          aName = this.options.transformAttributeName(aName);
        }
        if(aName === "__proto__") aName  = "#__proto__";
        if (oldVal !== undefined) {
          if (this.options.trimValues) {
            oldVal = oldVal.trim();
          }
          oldVal = this.replaceEntitiesValue(oldVal);
          const newVal = this.options.attributeValueProcessor(attrName, oldVal, jPath);
          if(newVal === null || newVal === undefined){
            //don't parse
            attrs[aName] = oldVal;
          }else if(typeof newVal !== typeof oldVal || newVal !== oldVal){
            //overwrite
            attrs[aName] = newVal;
          }else {
            //parse
            attrs[aName] = parseValue(
              oldVal,
              this.options.parseAttributeValue,
              this.options.numberParseOptions
            );
          }
        } else if (this.options.allowBooleanAttributes) {
          attrs[aName] = true;
        }
      }
    }
    if (!Object.keys(attrs).length) {
      return;
    }
    if (this.options.attributesGroupName) {
      const attrCollection = {};
      attrCollection[this.options.attributesGroupName] = attrs;
      return attrCollection;
    }
    return attrs
  }
}

const parseXml = function(xmlData) {
  xmlData = xmlData.replace(/\r\n?/g, "\n"); //TODO: remove this line
  const xmlObj = new XmlNode('!xml');
  let currentNode = xmlObj;
  let textData = "";
  let jPath = "";
  for(let i=0; i< xmlData.length; i++){//for each char in XML data
    const ch = xmlData[i];
    if(ch === '<'){
      // const nextIndex = i+1;
      // const _2ndChar = xmlData[nextIndex];
      if( xmlData[i+1] === '/') {//Closing Tag
        const closeIndex = findClosingIndex(xmlData, ">", i, "Closing Tag is not closed.");
        let tagName = xmlData.substring(i+2,closeIndex).trim();

        if(this.options.removeNSPrefix){
          const colonIndex = tagName.indexOf(":");
          if(colonIndex !== -1){
            tagName = tagName.substr(colonIndex+1);
          }
        }

        if(this.options.transformTagName) {
          tagName = this.options.transformTagName(tagName);
        }

        if(currentNode){
          textData = this.saveTextToParentTag(textData, currentNode, jPath);
        }

        //check if last tag of nested tag was unpaired tag
        const lastTagName = jPath.substring(jPath.lastIndexOf(".")+1);
        if(tagName && this.options.unpairedTags.indexOf(tagName) !== -1 ){
          throw new Error(`Unpaired tag can not be used as closing tag: </${tagName}>`);
        }
        let propIndex = 0;
        if(lastTagName && this.options.unpairedTags.indexOf(lastTagName) !== -1 ){
          propIndex = jPath.lastIndexOf('.', jPath.lastIndexOf('.')-1);
          this.tagsNodeStack.pop();
        }else {
          propIndex = jPath.lastIndexOf(".");
        }
        jPath = jPath.substring(0, propIndex);

        currentNode = this.tagsNodeStack.pop();//avoid recursion, set the parent tag scope
        textData = "";
        i = closeIndex;
      } else if( xmlData[i+1] === '?') {

        let tagData = readTagExp(xmlData,i, false, "?>");
        if(!tagData) throw new Error("Pi Tag is not closed.");

        textData = this.saveTextToParentTag(textData, currentNode, jPath);
        if( (this.options.ignoreDeclaration && tagData.tagName === "?xml") || this.options.ignorePiTags);else {
  
          const childNode = new XmlNode(tagData.tagName);
          childNode.add(this.options.textNodeName, "");
          
          if(tagData.tagName !== tagData.tagExp && tagData.attrExpPresent){
            childNode[":@"] = this.buildAttributesMap(tagData.tagExp, jPath, tagData.tagName);
          }
          this.addChild(currentNode, childNode, jPath, i);
        }


        i = tagData.closeIndex + 1;
      } else if(xmlData.substr(i + 1, 3) === '!--') {
        const endIndex = findClosingIndex(xmlData, "-->", i+4, "Comment is not closed.");
        if(this.options.commentPropName){
          const comment = xmlData.substring(i + 4, endIndex - 2);

          textData = this.saveTextToParentTag(textData, currentNode, jPath);

          currentNode.add(this.options.commentPropName, [ { [this.options.textNodeName] : comment } ]);
        }
        i = endIndex;
      } else if( xmlData.substr(i + 1, 2) === '!D') {
        const result = readDocType(xmlData, i);
        this.docTypeEntities = result.entities;
        i = result.i;
      }else if(xmlData.substr(i + 1, 2) === '![') {
        const closeIndex = findClosingIndex(xmlData, "]]>", i, "CDATA is not closed.") - 2;
        const tagExp = xmlData.substring(i + 9,closeIndex);

        textData = this.saveTextToParentTag(textData, currentNode, jPath);

        let val = this.parseTextData(tagExp, currentNode.tagname, jPath, true, false, true, true);
        if(val == undefined) val = "";

        //cdata should be set even if it is 0 length string
        if(this.options.cdataPropName){
          currentNode.add(this.options.cdataPropName, [ { [this.options.textNodeName] : tagExp } ]);
        }else {
          currentNode.add(this.options.textNodeName, val);
        }
        
        i = closeIndex + 2;
      }else {//Opening tag
        let result = readTagExp(xmlData,i, this.options.removeNSPrefix);
        let tagName= result.tagName;
        const rawTagName = result.rawTagName;
        let tagExp = result.tagExp;
        let attrExpPresent = result.attrExpPresent;
        let closeIndex = result.closeIndex;

        if (this.options.transformTagName) {
          tagName = this.options.transformTagName(tagName);
        }
        
        //save text as child node
        if (currentNode && textData) {
          if(currentNode.tagname !== '!xml'){
            //when nested tag is found
            textData = this.saveTextToParentTag(textData, currentNode, jPath, false);
          }
        }

        //check if last tag was unpaired tag
        const lastTag = currentNode;
        if(lastTag && this.options.unpairedTags.indexOf(lastTag.tagname) !== -1 ){
          currentNode = this.tagsNodeStack.pop();
          jPath = jPath.substring(0, jPath.lastIndexOf("."));
        }
        if(tagName !== xmlObj.tagname){
          jPath += jPath ? "." + tagName : tagName;
        }
        const startIndex = i;
        if (this.isItStopNode(this.options.stopNodes, jPath, tagName)) {
          let tagContent = "";
          //self-closing tag
          if(tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1){
            if(tagName[tagName.length - 1] === "/"){ //remove trailing '/'
              tagName = tagName.substr(0, tagName.length - 1);
              jPath = jPath.substr(0, jPath.length - 1);
              tagExp = tagName;
            }else {
              tagExp = tagExp.substr(0, tagExp.length - 1);
            }
            i = result.closeIndex;
          }
          //unpaired tag
          else if(this.options.unpairedTags.indexOf(tagName) !== -1){
            
            i = result.closeIndex;
          }
          //normal tag
          else {
            //read until closing tag is found
            const result = this.readStopNodeData(xmlData, rawTagName, closeIndex + 1);
            if(!result) throw new Error(`Unexpected end of ${rawTagName}`);
            i = result.i;
            tagContent = result.tagContent;
          }

          const childNode = new XmlNode(tagName);

          if(tagName !== tagExp && attrExpPresent){
            childNode[":@"] = this.buildAttributesMap(tagExp, jPath, tagName);
          }
          if(tagContent) {
            tagContent = this.parseTextData(tagContent, tagName, jPath, true, attrExpPresent, true, true);
          }
          
          jPath = jPath.substr(0, jPath.lastIndexOf("."));
          childNode.add(this.options.textNodeName, tagContent);
          
          this.addChild(currentNode, childNode, jPath, startIndex);
        }else {
  //selfClosing tag
          if(tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1){
            if(tagName[tagName.length - 1] === "/"){ //remove trailing '/'
              tagName = tagName.substr(0, tagName.length - 1);
              jPath = jPath.substr(0, jPath.length - 1);
              tagExp = tagName;
            }else {
              tagExp = tagExp.substr(0, tagExp.length - 1);
            }
            
            if(this.options.transformTagName) {
              tagName = this.options.transformTagName(tagName);
            }

            const childNode = new XmlNode(tagName);
            if(tagName !== tagExp && attrExpPresent){
              childNode[":@"] = this.buildAttributesMap(tagExp, jPath, tagName);
            }
            this.addChild(currentNode, childNode, jPath, startIndex);
            jPath = jPath.substr(0, jPath.lastIndexOf("."));
          }
    //opening tag
          else {
            const childNode = new XmlNode( tagName);
            this.tagsNodeStack.push(currentNode);
            
            if(tagName !== tagExp && attrExpPresent){
              childNode[":@"] = this.buildAttributesMap(tagExp, jPath, tagName);
            }
            this.addChild(currentNode, childNode, jPath, startIndex);
            currentNode = childNode;
          }
          textData = "";
          i = closeIndex;
        }
      }
    }else {
      textData += xmlData[i];
    }
  }
  return xmlObj.child;
};

function addChild(currentNode, childNode, jPath, startIndex){
  // unset startIndex if not requested
  if (!this.options.captureMetaData) startIndex = undefined;
  const result = this.options.updateTag(childNode.tagname, jPath, childNode[":@"]);
  if(result === false); else if(typeof result === "string"){
    childNode.tagname = result;
    currentNode.addChild(childNode, startIndex);
  }else {
    currentNode.addChild(childNode, startIndex);
  }
}

const replaceEntitiesValue = function(val){

  if(this.options.processEntities){
    for(let entityName in this.docTypeEntities){
      const entity = this.docTypeEntities[entityName];
      val = val.replace( entity.regx, entity.val);
    }
    for(let entityName in this.lastEntities){
      const entity = this.lastEntities[entityName];
      val = val.replace( entity.regex, entity.val);
    }
    if(this.options.htmlEntities){
      for(let entityName in this.htmlEntities){
        const entity = this.htmlEntities[entityName];
        val = val.replace( entity.regex, entity.val);
      }
    }
    val = val.replace( this.ampEntity.regex, this.ampEntity.val);
  }
  return val;
};
function saveTextToParentTag(textData, currentNode, jPath, isLeafNode) {
  if (textData) { //store previously collected data as textNode
    if(isLeafNode === undefined) isLeafNode = currentNode.child.length === 0;
    
    textData = this.parseTextData(textData,
      currentNode.tagname,
      jPath,
      false,
      currentNode[":@"] ? Object.keys(currentNode[":@"]).length !== 0 : false,
      isLeafNode);

    if (textData !== undefined && textData !== "")
      currentNode.add(this.options.textNodeName, textData);
    textData = "";
  }
  return textData;
}

//TODO: use jPath to simplify the logic
/**
 * 
 * @param {string[]} stopNodes 
 * @param {string} jPath
 * @param {string} currentTagName 
 */
function isItStopNode(stopNodes, jPath, currentTagName){
  const allNodesExp = "*." + currentTagName;
  for (const stopNodePath in stopNodes) {
    const stopNodeExp = stopNodes[stopNodePath];
    if( allNodesExp === stopNodeExp || jPath === stopNodeExp  ) return true;
  }
  return false;
}

/**
 * Returns the tag Expression and where it is ending handling single-double quotes situation
 * @param {string} xmlData 
 * @param {number} i starting index
 * @returns 
 */
function tagExpWithClosingIndex(xmlData, i, closingChar = ">"){
  let attrBoundary;
  let tagExp = "";
  for (let index = i; index < xmlData.length; index++) {
    let ch = xmlData[index];
    if (attrBoundary) {
        if (ch === attrBoundary) attrBoundary = "";//reset
    } else if (ch === '"' || ch === "'") {
        attrBoundary = ch;
    } else if (ch === closingChar[0]) {
      if(closingChar[1]){
        if(xmlData[index + 1] === closingChar[1]){
          return {
            data: tagExp,
            index: index
          }
        }
      }else {
        return {
          data: tagExp,
          index: index
        }
      }
    } else if (ch === '\t') {
      ch = " ";
    }
    tagExp += ch;
  }
}

function findClosingIndex(xmlData, str, i, errMsg){
  const closingIndex = xmlData.indexOf(str, i);
  if(closingIndex === -1){
    throw new Error(errMsg)
  }else {
    return closingIndex + str.length - 1;
  }
}

function readTagExp(xmlData,i, removeNSPrefix, closingChar = ">"){
  const result = tagExpWithClosingIndex(xmlData, i+1, closingChar);
  if(!result) return;
  let tagExp = result.data;
  const closeIndex = result.index;
  const separatorIndex = tagExp.search(/\s/);
  let tagName = tagExp;
  let attrExpPresent = true;
  if(separatorIndex !== -1){//separate tag name and attributes expression
    tagName = tagExp.substring(0, separatorIndex);
    tagExp = tagExp.substring(separatorIndex + 1).trimStart();
  }

  const rawTagName = tagName;
  if(removeNSPrefix){
    const colonIndex = tagName.indexOf(":");
    if(colonIndex !== -1){
      tagName = tagName.substr(colonIndex+1);
      attrExpPresent = tagName !== result.data.substr(colonIndex + 1);
    }
  }

  return {
    tagName: tagName,
    tagExp: tagExp,
    closeIndex: closeIndex,
    attrExpPresent: attrExpPresent,
    rawTagName: rawTagName,
  }
}
/**
 * find paired tag for a stop node
 * @param {string} xmlData 
 * @param {string} tagName 
 * @param {number} i 
 */
function readStopNodeData(xmlData, tagName, i){
  const startIndex = i;
  // Starting at 1 since we already have an open tag
  let openTagCount = 1;

  for (; i < xmlData.length; i++) {
    if( xmlData[i] === "<"){ 
      if (xmlData[i+1] === "/") {//close tag
          const closeIndex = findClosingIndex(xmlData, ">", i, `${tagName} is not closed`);
          let closeTagName = xmlData.substring(i+2,closeIndex).trim();
          if(closeTagName === tagName){
            openTagCount--;
            if (openTagCount === 0) {
              return {
                tagContent: xmlData.substring(startIndex, i),
                i : closeIndex
              }
            }
          }
          i=closeIndex;
        } else if(xmlData[i+1] === '?') { 
          const closeIndex = findClosingIndex(xmlData, "?>", i+1, "StopNode is not closed.");
          i=closeIndex;
        } else if(xmlData.substr(i + 1, 3) === '!--') { 
          const closeIndex = findClosingIndex(xmlData, "-->", i+3, "StopNode is not closed.");
          i=closeIndex;
        } else if(xmlData.substr(i + 1, 2) === '![') { 
          const closeIndex = findClosingIndex(xmlData, "]]>", i, "StopNode is not closed.") - 2;
          i=closeIndex;
        } else {
          const tagData = readTagExp(xmlData, i, '>');

          if (tagData) {
            const openTagName = tagData && tagData.tagName;
            if (openTagName === tagName && tagData.tagExp[tagData.tagExp.length-1] !== "/") {
              openTagCount++;
            }
            i=tagData.closeIndex;
          }
        }
      }
  }//end for loop
}

function parseValue(val, shouldParse, options) {
  if (shouldParse && typeof val === 'string') {
    //console.log(options)
    const newval = val.trim();
    if(newval === 'true' ) return true;
    else if(newval === 'false' ) return false;
    else return toNumber(val, options);
  } else {
    if (isExist(val)) {
      return val;
    } else {
      return '';
    }
  }
}

const METADATA_SYMBOL = XmlNode.getMetaDataSymbol();

/**
 * 
 * @param {array} node 
 * @param {any} options 
 * @returns 
 */
function prettify(node, options){
  return compress( node, options);
}

/**
 * 
 * @param {array} arr 
 * @param {object} options 
 * @param {string} jPath 
 * @returns object
 */
function compress(arr, options, jPath){
  let text;
  const compressedObj = {};
  for (let i = 0; i < arr.length; i++) {
    const tagObj = arr[i];
    const property = propName(tagObj);
    let newJpath = "";
    if(jPath === undefined) newJpath = property;
    else newJpath = jPath + "." + property;

    if(property === options.textNodeName){
      if(text === undefined) text = tagObj[property];
      else text += "" + tagObj[property];
    }else if(property === undefined){
      continue;
    }else if(tagObj[property]){
      
      let val = compress(tagObj[property], options, newJpath);
      const isLeaf = isLeafTag(val, options);
      if (tagObj[METADATA_SYMBOL] !== undefined) {
        val[METADATA_SYMBOL] = tagObj[METADATA_SYMBOL]; // copy over metadata
      }

      if(tagObj[":@"]){
        assignAttributes( val, tagObj[":@"], newJpath, options);
      }else if(Object.keys(val).length === 1 && val[options.textNodeName] !== undefined && !options.alwaysCreateTextNode){
        val = val[options.textNodeName];
      }else if(Object.keys(val).length === 0){
        if(options.alwaysCreateTextNode) val[options.textNodeName] = "";
        else val = "";
      }

      if(compressedObj[property] !== undefined && compressedObj.hasOwnProperty(property)) {
        if(!Array.isArray(compressedObj[property])) {
            compressedObj[property] = [ compressedObj[property] ];
        }
        compressedObj[property].push(val);
      }else {
        //TODO: if a node is not an array, then check if it should be an array
        //also determine if it is a leaf node
        if (options.isArray(property, newJpath, isLeaf )) {
          compressedObj[property] = [val];
        }else {
          compressedObj[property] = val;
        }
      }
    }
    
  }
  // if(text && text.length > 0) compressedObj[options.textNodeName] = text;
  if(typeof text === "string"){
    if(text.length > 0) compressedObj[options.textNodeName] = text;
  }else if(text !== undefined) compressedObj[options.textNodeName] = text;
  return compressedObj;
}

function propName(obj){
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if(key !== ":@") return key;
  }
}

function assignAttributes(obj, attrMap, jpath, options){
  if (attrMap) {
    const keys = Object.keys(attrMap);
    const len = keys.length; //don't make it inline
    for (let i = 0; i < len; i++) {
      const atrrName = keys[i];
      if (options.isArray(atrrName, jpath + "." + atrrName, true, true)) {
        obj[atrrName] = [ attrMap[atrrName] ];
      } else {
        obj[atrrName] = attrMap[atrrName];
      }
    }
  }
}

function isLeafTag(obj, options){
  const { textNodeName } = options;
  const propCount = Object.keys(obj).length;
  
  if (propCount === 0) {
    return true;
  }

  if (
    propCount === 1 &&
    (obj[textNodeName] || typeof obj[textNodeName] === "boolean" || obj[textNodeName] === 0)
  ) {
    return true;
  }

  return false;
}

class XMLParser{
    
    constructor(options){
        this.externalEntities = {};
        this.options = buildOptions(options);
        
    }
    /**
     * Parse XML dats to JS object 
     * @param {string|Buffer} xmlData 
     * @param {boolean|Object} validationOption 
     */
    parse(xmlData,validationOption){
        if(typeof xmlData === "string");else if( xmlData.toString){
            xmlData = xmlData.toString();
        }else {
            throw new Error("XML data is accepted in String or Bytes[] form.")
        }
        if( validationOption){
            if(validationOption === true) validationOption = {}; //validate with default options
            
            const result = validate(xmlData, validationOption);
            if (result !== true) {
              throw Error( `${result.err.msg}:${result.err.line}:${result.err.col}` )
            }
          }
        const orderedObjParser = new OrderedObjParser(this.options);
        orderedObjParser.addExternalEntities(this.externalEntities);
        const orderedResult = orderedObjParser.parseXml(xmlData);
        if(this.options.preserveOrder || orderedResult === undefined) return orderedResult;
        else return prettify(orderedResult, this.options);
    }

    /**
     * Add Entity which is not by default supported by this library
     * @param {string} key 
     * @param {string} value 
     */
    addEntity(key, value){
        if(value.indexOf("&") !== -1){
            throw new Error("Entity value can't have '&'")
        }else if(key.indexOf("&") !== -1 || key.indexOf(";") !== -1){
            throw new Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'")
        }else if(value === "&"){
            throw new Error("An entity with value '&' is not permitted");
        }else {
            this.externalEntities[key] = value;
        }
    }

    /**
     * Returns a Symbol that can be used to access the metadata
     * property on a node.
     * 
     * If Symbol is not available in the environment, an ordinary property is used
     * and the name of the property is here returned.
     * 
     * The XMLMetaData property is only present when `captureMetaData`
     * is true in the options.
     */
    static getMetaDataSymbol() {
        return XmlNode.getMetaDataSymbol();
    }
}

const __filename$5 = url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href)));
const __dirname$5 = path.dirname(__filename$5);

/**
 * Parse FTX schema files with support for IncludeFile dependencies.
 * @param {{main: string, [id:string]: string}} fileMap - { main: '/abs/path/to/main.FTX', ...otherName: '/abs/path/to/other.FTX' }
 * @param {Object[]} [extraSchemas] - Optional array of extra schemas to include. If not included, will use defaults.
 * @returns {Promise<Object>} - Parsed schema object
 */
async function generateSchemaV2({ fileMap, extraSchemas }) {
    const parsedFiles = {};
    const enums = [];
    const schemas = [];
    const schemaMap = {};
    let schemaMeta = {};
    if (!extraSchemas || extraSchemas.length === 0) {
        // Load extra schemas if available
        try {
            const extraPath = path.join(__dirname$5, '../data/schemas/extra-schemas.json');
            const extraRaw = await fs$1.readFile(extraPath, 'utf8');
            extraSchemas = JSON.parse(extraRaw);
        }
        catch (e) {
            // ignore if not present
        }
    }
    // Recursively parse a file and its includes (async)
    async function parseFile(fileKey) {
        if (parsedFiles[fileKey])
            return;
        const filePath = fileMap[fileKey];
        if (!filePath)
            throw new Error(`Missing file mapping for: ${fileKey}`);
        const xml = await fs$1.readFile(filePath, 'utf8');
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', allowBooleanAttributes: true, trimValues: false });
        const doc = parser.parse(xml);
        const root = doc.FranTkData;
        if (!schemaMeta.databaseName && root.databaseName) {
            schemaMeta = {
                databaseName: root.databaseName,
                dataMajorVersion: root.dataMajorVersion,
                dataMinorVersion: root.dataMinorVersion
            };
        }
        // Parse includes first
        if (root.Includes && root.Includes.IncludeFile) {
            const includes = Array.isArray(root.Includes.IncludeFile)
                ? root.Includes.IncludeFile
                : [root.Includes.IncludeFile];
            for (const inc of includes) {
                let incKey = inc.fileName.replace(/\.FTX$/i, '');
                if (!fileMap[incKey]) {
                    // Try all lowercase
                    incKey = incKey.toLowerCase();
                    if (!fileMap[incKey]) {
                        console.warn(`schemaGeneratorV2: Missing file mapping for include: ${incKey} in ${fileKey}`);
                        continue; // Suppress missing include mapping
                    }
                }
                await parseFile(incKey);
            }
        }
        // Parse enums and schemas
        if (root.schemas) {
            const items = Object.entries(root.schemas)
                .flatMap(([tag, val]) => Array.isArray(val) ? val.map(v => ({ tag, ...v })) : [{ tag, ...val }]);
            for (const item of items) {
                if (item.tag === 'enum') {
                    const theEnum = new FranchiseEnum(item.name, item.assetId, item.isRecordPersistent);
                    theEnum._members = [];
                    if (item.attribute) {
                        const members = Array.isArray(item.attribute) ? item.attribute : [item.attribute];
                        for (const attr of members) {
                            theEnum.addMember && theEnum.addMember(attr.name, attr.idx, attr.value);
                        }
                    }
                    enums.push(theEnum);
                }
                else if (item.tag === 'schema') {
                    const schema = {
                        assetId: item.assetId,
                        ownerAssetId: item.ownerAssetId,
                        numMembers: item.numMembers,
                        name: item.name,
                        base: item.base,
                        attributes: []
                    };
                    if (item.attribute) {
                        const attrs = Array.isArray(item.attribute) ? item.attribute : [item.attribute];
                        for (const attr of attrs) {
                            schema.attributes.push(parseAttribute(attr));
                        }
                    }
                    schemas.push(schema);
                    schemaMap[schema.name] = schema;
                }
            }
        }
        parsedFiles[fileKey] = true;
    }
    // Attribute parsing logic (copied from schemaGenerator.js)
    function parseAttribute(attributeAttributes) {
        return {
            index: attributeAttributes.idx,
            name: attributeAttributes.name,
            type: attributeAttributes.type,
            minValue: attributeAttributes.minValue,
            maxValue: attributeAttributes.maxValue,
            maxLength: attributeAttributes.maxLen,
            default: getDefaultValue(attributeAttributes.default),
            final: attributeAttributes.final,
            enum: getEnum(attributeAttributes.type),
            const: attributeAttributes.const
        };
        function getDefaultValue(defaultVal) {
            if (!defaultVal) {
                return undefined;
            }
            // Only replace XML entities, do not trim or modify whitespace at all
            return defaultVal
                .replace(/&#xD;/g, '\r')
                .replace(/&#xA;/g, '\n')
                .replace(/&amp;/g, '&')
                .replace(/&gt;/g, '>')
                .replace(/&lt;/g, '<')
                .replace(/&quot;/g, '"');
        }
    }
    function getEnum(name) {
        return enums.find(theEnum => theEnum.name === name);
    }
    function addExtraSchemas() {
        if (!Array.isArray(extraSchemas))
            return;
        extraSchemas.forEach((schema) => {
            if (!schemaMap[schema.name]) {
                schema.attributes.filter((attrib) => {
                    return attrib.enum && !(attrib.enum instanceof FranchiseEnum);
                }).forEach((attrib) => {
                    attrib.enum = getEnum(attrib.enum);
                });
                schemas.unshift(schema);
            }
        });
    }
    function calculateInheritedSchemas(schemaList) {
        const schemasWithBase = schemaList.filter((schema) => schema.base && schema.base.indexOf('()') === -1);
        schemasWithBase.forEach((schema) => {
            if (schema.base && schema.base.indexOf('()') === -1) {
                schema.originalAttributesOrder = schema.attributes;
                const baseSchema = schemaList.find((schemaToSearch) => schemaToSearch.name === schema.base);
                if (baseSchema) {
                    baseSchema.attributes.forEach((baseAttribute, index) => {
                        let oldIndex = schema.attributes.findIndex((schemaAttribute) => schemaAttribute?.name === baseAttribute?.name);
                        utilService.arrayMove(schema.attributes, oldIndex, index);
                    });
                }
            }
        });
    }
    await parseFile('main');
    addExtraSchemas();
    calculateInheritedSchemas(schemas);
    // Set enum member lengths if needed
    enums.forEach(e => e.setMemberLength && e.setMemberLength());
    // Extract gameYear from databaseName
    const majorVersion = schemaMeta.dataMajorVersion;
    const minorVersion = schemaMeta.dataMinorVersion;
    const databaseName = schemaMeta.databaseName;
    const gameYearMatch = /Madden(\d{2})/.exec(databaseName);
    const gameYear = gameYearMatch ? parseInt(gameYearMatch[1]) : null;
    const root = {
        meta: {
            major: parseInt(majorVersion),
            minor: parseInt(minorVersion),
            gameYear
        },
        schemas,
        schemaMap
    };
    // Return the plain object
    return root;
}

const EventEmitter$2 = events.EventEmitter;
/**
   * @typedef SchemaAttribute
   * @param {string} index
   * @param {string} name
   * @param {string} type
   * @param {string} minValue
   * @param {string} maxValue
   * @param {string} maxLength
   * @param {string} default
   * @param {string} final
   * @param {FranchiseEnum?} [enum]
   * @param {string}
*/
/**
   * @typedef TableSchema
   * @param {number} assetId
   * @param {number} ownerAssetId
   * @param {number} numMembers
   * @param {string} name
   * @param {string} base
   * @param {Array<SchemaAttribute>} attributes
*/
class FranchiseSchema extends EventEmitter$2 {
    constructor(filePath, { useNewSchemaGeneration = false, extraSchemas = [], fileMap = {} } = {}) {
        super();
        this.schemas = [];
        this.path = filePath;
        this.useNewSchemaGeneration = useNewSchemaGeneration;
        this.extraSchemas = extraSchemas;
        this.fileMap = fileMap;
    }
    ;
    evaluate() {
        const fileExtension = path.extname(this.path).toLowerCase();
        switch (fileExtension) {
            case '.gz':
                // const schemaFile = fs.readFileSync(this.path);
                this.evaluateSchemaGzip(this.path);
                break;
            case '.ftx':
            case '.xml':
                this.evaluateSchemaXml();
                break;
            default:
                throw new Error('Invalid schema. Please make sure your schema file is of correct format (.gz, .xml, or .ftx).');
        }
    }
    ;
    getSchema(name) {
        // return this.schemas.find((schema) => { return schema.name === name; });
        return this.schemaMap[name];
    }
    ;
    getEnum(name) {
        return this.enums.find((theEnum) => { return theEnum.name === name; });
    }
    ;
    evaluateSchemaGzip(schemaPath) {
        const schemaFile = fs.readFileSync(this.path);
        const uncompressed = zlib.gunzipSync(schemaFile);
        this.schema = JSON.parse(uncompressed.toString());
        this.meta = this.schema.meta;
        this.schemas = this.schema.schemas;
        this.schemaMap = {};
        this.enumMap = {};
        for (let i = 0; i < this.schemas.length; i++) {
            const schema = this.schemas[i];
            this.schemaMap[schema.name] = schema;
            for (let j = 0; j < schema.attributes.length; j++) {
                const attribute = schema.attributes[j];
                if (attribute.enum) {
                    attribute.enum = new FranchiseEnum(attribute.enum);
                    this.enumMap[attribute.enum.name] = attribute.enum;
                }
            }
        }
        let addedExtraSchema = false;
        const extraSchemas = schemaGenerator.getExtraSchemas();
        extraSchemas.forEach((schema) => {
            if (!this.schemaMap[schema.name]) {
                schema.attributes.forEach((attrib) => {
                    if (attrib.enum) {
                        attrib.enum = new FranchiseEnum(this.enumMap[attrib.enum]);
                    }
                });
                this.schemas.unshift(schema);
                this.schemaMap[schema.name] = schema;
                addedExtraSchema = true;
            }
        });
        if (addedExtraSchema) {
            schemaGenerator.calculateInheritedSchemas(this.schemas);
        }
        this.emit('schemas:done');
    }
    ;
    evaluateSchemaXml() {
        if (this.useNewSchemaGeneration) {
            generateSchemaV2({
                fileMap: this.fileMap,
                extraSchemas: this.extraSchemas
            }).then((schema) => {
                this.schema = schema;
                this.meta = schema.meta;
                this.schemas = schema.schemas;
                this.schemaMap = schema.schemaMap;
                this.emit('schemas:done');
            });
        }
        else {
            schemaGenerator.eventEmitter.on('schemas:done', (schema) => {
                this.schema = schema;
                this.meta = schema.meta;
                this.schemas = schema.schemas;
                this.schemaMap = schema.schemaMap;
                this.emit('schemas:done');
            });
            schemaGenerator.generate(this.path);
        }
    }
    ;
}

class FranchiseFileTable2Field {
    /** @param {number} index @param {number} maxLength @param {FranchiseFileTable} parent */
    constructor(index, maxLength, parent) {
        /** @private */
        this._value = '';
        /** @type {number} */
        this.rawIndex = index;
        this.isChanged = false;
        this.maxLength = maxLength;
        /** @type {FranchiseFileField} */
        this.fieldReference = null;
        /** @type {number} */
        this.lengthAtLastSave = null;
        /** @private */
        this._unformattedValue = null;
        this.index = index;
        this._offset = this.index;
        this._parent = parent;
    }
    ;
    get unformattedValue() {
        return this._unformattedValue;
    }
    ;
    set unformattedValue(value) {
        this._unformattedValue = value;
        if (this.lengthAtLastSave === null) {
            this.lengthAtLastSave = getLengthOfUnformattedValue$1(this._unformattedValue);
        }
        this._value = null;
        if (this._parent) {
            this._parent.onEvent('change', this);
        }
    }
    ;
    get value() {
        if (this._value === null) {
            this._value = this._unformattedValue.toString().replace(/\0.*$/g, '');
        }
        return this._value;
    }
    ;
    set value(value) {
        this._value = value;
        if (value.length > this.maxLength) {
            value = value.substring(0, this.maxLength);
        }
        this._unformattedValue = this._strategy.setUnformattedValueFromFormatted(value, this.maxLength);
        if (this.lengthAtLastSave === null) {
            this.lengthAtLastSave = getLengthOfUnformattedValue$1(this._unformattedValue);
        }
        this._parent.onEvent('change', this);
    }
    ;
    get hexData() {
        return this._unformattedValue;
    }
    ;
    /** @type {Table2FieldStrategy} */
    get strategy() {
        return this._strategy;
    }
    ;
    /** @param {Table2FieldStrategy} strategy */
    set strategy(strategy) {
        this._strategy = strategy;
    }
    ;
    /** @returns {number} */
    get offset() {
        return this._offset;
    }
    ;
    /** @param {number} offset */
    set offset(offset) {
        const offsetChanged = this._offset !== offset;
        this._offset = offset;
        this.index = offset;
        if (offsetChanged && this.fieldReference) {
            this.fieldReference.unformattedValue.setBits(this.fieldReference.offset.offset, offset, 32);
            this.fieldReference.isChanged = true;
            this.fieldReference._bubbleChangeToParent();
        }
    }
    ;
    get parent() {
        return this._parent;
    }
    ;
    /** @param {FranchiseFileTable} parent */
    set parent(parent) {
        this._parent = parent;
    }
    ;
}
function getLengthOfUnformattedValue$1(value) {
    return value.length;
}

class FranchiseFileTable3Field {
    /** @param {number} index @param {number} maxLength @param {FranchiseFileTable} parent */
    constructor(index, maxLength, parent) {
        /** @private */
        this._value = '';
        /** @type {number} */
        this.rawIndex = index;
        this.isChanged = false;
        this.maxLength = maxLength;
        /** @type {FranchiseFileField} */
        this.fieldReference = null;
        /** @type {number} */
        this.lengthAtLastSave = null;
        /** @private */
        this._unformattedValue = null;
        this.index = index;
        this._offset = this.index;
        this._parent = parent;
    }
    ;
    get unformattedValue() {
        return this._unformattedValue;
    }
    ;
    set unformattedValue(value) {
        this._unformattedValue = value;
        if (this.lengthAtLastSave === null) {
            this.lengthAtLastSave = getLengthOfUnformattedValue(this._unformattedValue);
        }
        this._value = null;
        if (this._parent) {
            this._parent.onEvent('change', this);
        }
    }
    ;
    get value() {
        if (this._value === null) {
            this._value = this._strategy.getFormattedValueFromUnformatted(this._unformattedValue);
        }
        return this._value;
    }
    ;
    set value(value) {
        this._value = value;
        this._unformattedValue = this._strategy.setUnformattedValueFromFormatted(value, this._unformattedValue, this.maxLength);
        if (this.lengthAtLastSave === null) {
            this.lengthAtLastSave = getLengthOfUnformattedValue(this._unformattedValue);
        }
        this._parent.onEvent('change', this);
    }
    ;
    get hexData() {
        return this._unformattedValue;
    }
    ;
    /** @type {Table3FieldStrategy} */
    get strategy() {
        return this._strategy;
    }
    ;
    /** @param {Table3FieldStrategy} strategy */
    set strategy(strategy) {
        this._strategy = strategy;
    }
    ;
    /** @returns {number} */
    get offset() {
        return this._offset;
    }
    ;
    /** @param {number} offset */
    set offset(offset) {
        this._offset = offset;
        this.index = offset;
        if (this.fieldReference) {
            this.fieldReference.unformattedValue.setBits(this.fieldReference.offset.offset, offset, 32);
        }
    }
    ;
    get parent() {
        return this._parent;
    }
    ;
    /** @param {FranchiseFileTable} parent */
    set parent(parent) {
        this._parent = parent;
    }
    ;
}
function getLengthOfUnformattedValue(value) {
    return value.length;
}

class FranchiseFileField {
    /** @param {string} key @param {Buffer} value @param {OffsetTableEntry} offset @param {FranchiseFileRecord} parent */
    constructor(key, value, offset, parent) {
        /** @private */
        this._key = key;
        /** @private */
        this._recordBuffer = value;
        /** @private */
        this._unformattedValue = null;
        /** @private */
        this._offset = offset;
        /** @private */
        this._parent = parent;
        /** @private */
        this._isChanged = false;
        if (offset.valueInSecondTable) {
            /** @type {FranchiseFileTable2Field?} */
            this.secondTableField = new FranchiseFileTable2Field(this._recordBuffer.readUInt32BE(offset.offset / 8), offset.maxLength);
            this.secondTableField.fieldReference = this;
        }
        if (offset.valueInThirdTable) {
            /** @type {FranchiseFileTable3Field?} */
            this.thirdTableField = new FranchiseFileTable3Field(this._recordBuffer.readUInt32BE(offset.offset / 8), offset.maxLength);
            this.thirdTableField.fieldReference = this;
        }
    }
    ;
    /** @returns {string} */
    get key() {
        return this._key;
    }
    ;
    /** @returns {OffsetTableEntry} */
    get offset() {
        return this._offset;
    }
    ;
    /** @returns {*} */
    get value() {
        if (this._unformattedValue === null) {
            this._setUnformattedValueIfEmpty();
        }
        if (this._value === null) {
            this._value = this._parseFieldValue(this._unformattedValue, this._offset);
        }
        return this._value;
    }
    ;
    /** @returns {boolean} */
    get isReference() {
        return this._offset.isReference;
    }
    ;
    /** @returns {RecordReference?} */
    get referenceData() {
        if (this._unformattedValue === null) {
            this._setUnformattedValueIfEmpty();
        }
        if (this.isReference) {
            return utilService.getReferenceDataFromBitview(this._unformattedValue, this.offset.offset);
        }
        return null;
    }
    ;
    set value(value) {
        if (this._unformattedValue === null) {
            this._setUnformattedValueIfEmpty();
        }
        this._value = value;
        this.isChanged = true;
        if (this.offset.valueInSecondTable) {
            this.secondTableField.value = value.toString();
        }
        else if (this.offset.valueInThirdTable) {
            if (typeof value === 'object') {
                const newVal = JSON.stringify(value);
                this._value = newVal;
                this.thirdTableField.value = newVal;
            }
            else {
                this.thirdTableField.value = value.toString();
            }
        }
        else {
            let actualValue;
            if (this.offset.isReference) {
                if (!utilService.isString(value)) {
                    throw new Error(`Argument must be of type string. You passed in a ${typeof unformattedValue}.`);
                }
                else if (!utilService.stringOnlyContainsBinaryDigits(value)) {
                    throw new Error(`Argument must only contain binary digits 1 and 0. If you would like to set the value, please set the 'value' attribute instead.`);
                }
                const referenceData = utilService.getReferenceData(value);
                this._unformattedValue.setBits(this.offset.offset, referenceData.tableId, 15);
                this._unformattedValue.setBits((this.offset.offset + 15), referenceData.rowNumber, 17);
            }
            else if (this.offset.enum) {
                try {
                    let theEnum = this._getEnumFromValue(value);
                    // Enums can have negative values and Madden negative numbers are not standard. We need to convert it here.
                    // Ex: In Madden, binary "1000" = -1 for an enum with a max length of 4. But for everything else, "1000" = 8, so we need to get the "real" value here.
                    const decimalEquivalent = utilService.bin2dec(theEnum.unformattedValue);
                    this._unformattedValue.setBits(this.offset.offset, decimalEquivalent, this.offset.length);
                    this._value = theEnum.name;
                }
                catch (err) {
                    // if user tries entering an invalid enum value, check if it's an empty record reference (will be binary)
                    if (utilService.stringOnlyContainsBinaryDigits(value)) {
                        this._value = value;
                        this._unformattedValue.setBits(this.offset.offset, value, this.offset.length);
                    }
                    else {
                        this._value = null;
                        throw err;
                    }
                }
            }
            else {
                switch (this.offset.type) {
                    case 's_int':
                        actualValue = parseInt(value);
                        this._value = actualValue;
                        this._unformattedValue.setBits(this.offset.offset, actualValue - this.offset.minValue, this.offset.length);
                        break;
                    default:
                    case 'int':
                        actualValue = parseInt(value);
                        this._value = actualValue;
                        if (this.offset.minValue || this.offset.maxValue) {
                            // return utilService.dec2bin(formatted, offset.length);
                            this._unformattedValue.setBits(this.offset.offset, actualValue, this.offset.length);
                        }
                        else {
                            const maxValueBinary = getMaxValueBinary(this.offset);
                            const maxValue = utilService.bin2dec(maxValueBinary);
                            // return utilService.dec2bin(formatted + maxValue, offset.length);
                            this._unformattedValue.setBits(this.offset.offset, actualValue + maxValue, this.offset.length);
                        }
                        break;
                    case 'bool':
                        // return (formatted == 1 || (formatted.toString().toLowerCase() == 'true')) ? '1' : '0';
                        actualValue = (value == 1 || (value.toString().toLowerCase() == 'true'));
                        this._value = actualValue;
                        this._unformattedValue.setBits(this.offset.offset + (this.offset.length - 1), actualValue, 1);
                        break;
                    case 'float':
                        actualValue = parseFloat(value);
                        this._value = actualValue;
                        // return utilService.float2Bin(formatted);
                        // this._unformattedValue.setBits(this.offset.offset, value, this.offset.length);
                        this._unformattedValue.setFloat32(this.offset.offset, actualValue);
                        break;
                }
            }
            this._parent.onEvent('change', this);
        }
    }
    ;
    /** @returns {BitView} */
    get unformattedValue() {
        if (this._unformattedValue === null) {
            this._setUnformattedValueIfEmpty();
        }
        return this._unformattedValue;
    }
    ;
    /** @param {BitView} unformattedValue */
    set unformattedValue(unformattedValue) {
        this.setUnformattedValueWithoutChangeEvent(unformattedValue);
        this._value = null;
        this._parent.onEvent('change', this);
    }
    ;
    /** @returns {boolean} */
    get isChanged() {
        return this._isChanged;
    }
    ;
    /** @param {boolean} changed */
    set isChanged(changed) {
        this._isChanged = changed;
    }
    ;
    /** @param {OffsetTableEntry} offset */
    getValueAs(offset) {
        if (this._unformattedValue === null) {
            this._setUnformattedValueIfEmpty();
        }
        return this._parseFieldValue(this._unformattedValue, offset);
    }
    _bubbleChangeToParent() {
        this._parent.onEvent('change', this);
    }
    ;
    clearCachedValues() {
        this._value = null;
        this._unformattedValue = null;
    }
    ;
    _setUnformattedValueIfEmpty() {
        this._value = null;
        this._unformattedValue = new bitBufferExports.BitView(this._recordBuffer, this._recordBuffer.byteOffset);
        this._unformattedValue.bigEndian = true;
    }
    ;
    /** @param {BitView} unformattedValue @param {boolean} suppressErrors */
    setUnformattedValueWithoutChangeEvent(unformattedValue, suppressErrors) {
        if (!(unformattedValue instanceof bitBufferExports.BitView)) {
            throw new Error(`Argument must be of type BitView. You passed in a(n) ${typeof unformattedValue}.`);
        }
        else {
            this._unformattedValue = unformattedValue;
            this._value = null;
        }
    }
    /** @returns {FranchiseEnumValue?} */
    _getEnumFromValue(value) {
        const enumName = this.offset.enum.getMemberByName(value);
        if (enumName) {
            return enumName;
        }
        else {
            const formattedEnum = this.offset.enum.getMemberByValue(value);
            if (formattedEnum) {
                return formattedEnum;
            }
            else {
                const unformattedEnum = this.offset.enum.getMemberByUnformattedValue(value);
                if (unformattedEnum) {
                    return unformattedEnum;
                }
                else {
                    return this.offset.enum.members[0];
                }
            }
        }
    }
    ;
    /** @param {BitView} unformatted, @param {OffsetTableEntry} offset */
    _parseFieldValue(unformatted, offset) {
        if (offset.valueInSecondTable) {
            return this.secondTableField.value;
        }
        else if (offset.valueInThirdTable) {
            return this.thirdTableField.value;
        }
        else if (offset.enum) {
            const enumUnformattedValue = utilService.dec2bin(unformatted.getBits(offset.offset, offset.length), offset.enum._maxLength);
            try {
                const theEnum = offset.enum.getMemberByUnformattedValue(enumUnformattedValue);
                if (theEnum) {
                    return theEnum.name;
                }
            }
            catch (err) {
                // console.log(err);
            }
            return enumUnformattedValue;
        }
        else if (offset.isReference) {
            try {
                const referenceData = utilService.getReferenceDataFromBitview(unformatted, offset.offset);
                return utilService.getBinaryReferenceData(referenceData.tableId, referenceData.rowNumber);
            }
            catch (err) {
                console.warn(`Tried to read ${offset.name} as a reference, but received an error.`);
                // tried to read a reference, but the offset was incorrect
                return unformatted.getBits(offset.offset, offset.length);
            }
        }
        else {
            switch (offset.type) {
                case 's_int':
                    // return utilService.bin2dec(unformatted) + offset.minValue;
                    return unformatted.getBits(offset.offset, offset.length) + offset.minValue;
                case 'int':
                    if (offset.minValue || offset.maxValue) {
                        return unformatted.getBits(offset.offset, offset.length);
                    }
                    else {
                        // This is for int[] tables.
                        const maxValueBinary = getMaxValueBinary(offset);
                        const maxValue = utilService.bin2dec(maxValueBinary);
                        const newValue = unformatted.getBits(offset.offset, offset.length);
                        if (newValue === 0) {
                            return 0;
                        }
                        else {
                            return newValue - maxValue;
                        }
                    }
                case 'bool':
                    return unformatted.getBits(offset.offset + (offset.length - 1), 1) ? true : false;
                case 'float':
                    // return utilService.bin2Float(unformatted);
                    return unformatted.getFloat32(offset.offset, offset.length);
                default:
                    return unformatted;
            }
        }
    }
    ;
}
function getMaxValueBinary(offset) {
    let maxValue = '1';
    for (let j = 0; j < (offset.length - 1); j++) {
        maxValue += '0';
    }
    return maxValue;
}

class FranchiseFileRecord {
    /** @param {Buffer} data @param {number} index @param {OffsetTableEntry} offsetTable, @param {FranchiseFileTable} parent */
    constructor(data, index, offsetTable, parent) {
        /** @type {Buffer}  */
        this._data = data;
        /** @type {OffsetTableEntry} */
        this._offsetTable = offsetTable;
        /** @type {number} */
        this.index = index;
        /** @private @type {Array<FranchiseFileField>} */
        this._fieldsArray = [];
        /** @private @type {Record<string, FranchiseFileField>} */
        this._fields = this.parseRecordFields();
        this._isChanged = false;
        /** @type {number} */
        this.arraySize = null;
        this.isEmpty = false;
        /** @type {FranchiseFileTable} */
        this._parent = parent;
        return new Proxy(this, {
            get: function (target, prop, receiver) {
                return target.fields[prop] !== undefined ? target.fields[prop].value : target[prop] !== undefined ? target[prop] : null;
            },
            set: function (target, prop, receiver) {
                if (target.fields[prop] !== undefined) {
                    target.fields[prop].value = receiver;
                }
                else {
                    target[prop] = receiver;
                }
                return true;
            }
        });
    }
    ;
    /** @returns {Buffer} */
    get hexData() {
        return this._data;
    }
    ;
    /** @returns {Record<string, FranchiseFileField>} */
    get fields() {
        return this._fields;
    }
    ;
    /** @returns {Array<FranchiseFileField>} */
    get fieldsArray() {
        return this._fieldsArray;
    }
    ;
    /** @returns {Buffer} */
    get data() {
        return this._data;
    }
    ;
    /** @param {Buffer} data */
    set data(data) {
        this._data = data;
        this._fieldsArray.forEach((field) => {
            const unformattedValue = data.slice(field.offset.offset, field.offset.offset + field.offset.length);
            field.setUnformattedValueWithoutChangeEvent(unformattedValue);
        });
    }
    ;
    get isChanged() {
        return this._isChanged;
    }
    ;
    /** @param {boolean} changed */
    set isChanged(changed) {
        this._isChanged = changed;
        if (changed === false) {
            this.fieldsArray.forEach((field) => {
                field.isChanged = false;
            });
        }
    }
    /** @param {string} key @returns {FranchiseFileField?} */
    getFieldByKey(key) {
        return this._fields[key];
    }
    ;
    /** @param {string} key @returns {*?} */
    getValueByKey(key) {
        let field = this.getFieldByKey(key);
        return field ? field.value : null;
    }
    ;
    /** @param {string} key @returns {RecordReference?} */
    getReferenceDataByKey(key) {
        let field = this.getFieldByKey(key);
        return field ? field.referenceData : null;
    }
    ;
    /** @returns {Record<string, FranchiseFileField>} */
    parseRecordFields() {
        let fields = {};
        this._fieldsArray = [];
        for (let j = 0; j < this._offsetTable.length; j++) {
            const offset = this._offsetTable[j];
            // Push the entire record buffer to the field. No need to perform a calculation
            // to subarray the buffer, BitView will take care of it in the Field.
            fields[offset.name] = new FranchiseFileField(offset.name, this._data, offset, this);
            this._fieldsArray.push(fields[offset.name]);
        }
        return fields;
    }
    ;
    empty() {
        this._parent.onEvent('empty', this);
        this.isEmpty = true;
    }
    ;
    /** @param {string} name @param {FranchiseFileField} field */
    onEvent(name, field) {
        if (name === 'change') {
            // this._data = utilService.replaceAt(this._data, field.offset.offset, field.unformattedValue);
            // NOTE: At field time, we can only change the size of arrays of references.
            // I'm not sure how to change the size of non-reference arrays, or if it's even possible.
            if (this.arraySize !== null && this.arraySize !== undefined) {
                const referenceData = field.referenceData;
                // If the field is outside of the previous array size and was edited to a valid reference,
                // then reset the array size
                if (field.offset.index >= this.arraySize) {
                    if (field.isReference) {
                        if (referenceData.tableId !== 0 || referenceData.rowNumber !== 0) {
                            this.arraySize = field.offset.index + 1;
                        }
                    }
                }
                // If the value was changed to 0s, then shrink the array size to field index.
                else if (field.isReference) {
                    if (referenceData.tableId === 0 && referenceData.rowNumber === 0) {
                        this.arraySize = field.offset.index;
                    }
                }
            }
            this._parent.onEvent('change', this);
        }
    }
    ;
}

/**
 * @typedef {Object} SettingsParam
 * @param {boolean?} [saveOnChange]
 * @param {SchemaMetadata?} [schemaOverride]
 * @param {string?} [schemaDirectory]
 * @param {boolean?} [autoParse]
 * @param {boolean?} [autoUnempty]
*/
class FranchiseFileSettings {
    /** @param {SettingsParam} settings */
    constructor(settings) {
        /** @type {boolean} */
        this.saveOnChange = settings && settings.saveOnChange ? settings.saveOnChange : false;
        /** @type {SchemaMetadata | false} */
        this.schemaOverride = settings && settings.schemaOverride ? settings.schemaOverride : false;
        /** @type {string | false} */
        this.schemaDirectory = settings && settings.schemaDirectory ? settings.schemaDirectory : false;
        /** @type {boolean} */
        this.useNewSchemaGeneration = settings?.useNewSchemaGeneration ?? false;
        /** @type {Object} */
        this.schemaFileMap = settings?.schemaFileMap || {};
        /** @type {Object[]} */
        this.extraSchemas = settings?.extraSchemas || undefined;
        /** @type {boolean} */
        this.autoParse = settings && (settings.autoParse !== null && settings.autoParse !== undefined) ? settings.autoParse : true;
        /** @type {boolean} */
        this.autoUnempty = settings && (settings.autoUnempty !== null && settings.autoUnempty !== undefined) ? settings.autoUnempty : false;
        /** @type {number} */
        this.gameYearOverride = settings && (settings.gameYearOverride !== null && settings.gameYearOverride !== undefined) ? settings.gameYearOverride : null;
    }
}

const EventEmitter$1 = events.EventEmitter;
/**
 * @typedef {Object} FranchiseFileTableHeader
 * @param {string} name
 * @param {boolean} isArray
 * @param {number} tableId
 * @param {number} tablePad1
 * @param {number} uniqueId
 * @param {number} tableUnknown1
 * @param {number} tableUnknown2
 * @param {string} data1Id
 * @param {number} data1Type
 * @param {number} data1Unknown1
 * @param {number} data1Flag1
 * @param {number} data1Flag2
 * @param {number} data1Flag3
 * @param {number} data1Flag4
 * @param {number} tableStoreLength
 * @param {string} tableStoreName
 * @param {number} data1Offset
 * @param {string} data1TableId
 * @param {number} data1RecordCount
 * @param {number} data1Pad2
 * @param {number} table1Length
 * @param {number} table2Length
 * @param {number} data1Pad3
 * @param {number} data1Pad4
 * @param {number} headerSize
 * @param {number} headerOffset
 * @param {number} record1SizeOffset
 * @param {number} record1SizeLength
 * @param {number} record1Size
 * @param {number} offsetStart
 * @param {string} data2Id
 * @param {number} table1Length2
 * @param {number} tableTotalLength
 * @param {boolean} hasSecondTable
 * @param {number} table1StartIndex
 * @param {number} table2StartIndex
 * @param {number} recordWords
 * @param {number} recordCapacity
 * @param {number} numMembers
 * @param {number} nextRecordToUse
 * @param {boolean} hasThirdTable
 */
/**
 * @typedef {Object} OffsetTableEntry
 * @param {number} index
 * @param {number} originalIndex
 * @param {string} name
 * @param {string} type
 * @param {boolean} isReference
 * @param {boolean} valueInSecondTable
 * @param {boolean} valueInThirdTable
 * @param {boolean} isSigned
 * @param {number} minValue
 * @param {number} maxValue
 * @param {number} maxLength
 * @param {boolean} final
 * @param {number} indexOffset
 * @param {FranchiseEnum} enum
 * @param {boolean} const
 * @param {number} offset
 */
/**
 * @typedef EmptyRecordEntry
 * @param {number} previous
 * @param {number} next
 */
class FranchiseFileTable extends EventEmitter$1 {
    constructor(data, offset, gameYear, strategy, settings) {
        super();
        this.index = -1;
        /** @type {Buffer} */
        this.data = data;
        /** @type {number} */
        this.lengthAtLastSave = data.length;
        /** @type {number} */
        this.offset = offset;
        /** @type {GameStrategy} */
        this.strategyBase = strategy;
        /** @type {TableStrategy} */
        this.strategy = this.strategyBase.table;
        this.recordsRead = false;
        /** @type {number} */
        this._gameYear = gameYear;
        /** @type {FranchiseFileTableHeader} */
        this.header = this.strategy.parseHeader(this.data);
        /** @type {string} */
        this.name = this.header.name;
        /** @type {boolean} */
        this.isArray = this.header.isArray;
        /** @type {Array<OffsetTableEntry>} */
        this.loadedOffsets = [];
        this.isChanged = false;
        /** @type {Array<FranchiseFileRecord>} */
        this.records = [];
        /** @type {Array<FranchiseFileTable2Field>} */
        this.table2Records = [];
        /** @type {Array<FranchiseFileTable3Field>} */
        this.table3Records = [];
        /** @type {Array<number>} */
        this.arraySizes = [];
        /** @type {Map<EmptyRecordEntry>} */
        this.emptyRecords = new Map();
        /** @type {FranchiseFileSettings} */
        this._settings = settings;
    }
    ;
    /** @returns {Buffer} */
    get hexData() {
        this.updateBuffer();
        return this.data;
    }
    ;
    /** @param {TableSchema} schema */
    set schema(schema) {
        if (schema?.attributes?.length !== this.header.numMembers) {
            return;
        }
        /** @private @type {TableSchema} */
        this._schema = schema;
        const modifiedHeaderAttributes = this.strategy.parseHeaderAttributesFromSchema(schema, this.data, this.header);
        this.header.headerSize = modifiedHeaderAttributes.headerSize;
        this.header.record1Size = modifiedHeaderAttributes.record1Size;
        this.header.table1StartIndex = modifiedHeaderAttributes.table1StartIndex;
        this.header.table2StartIndex = modifiedHeaderAttributes.table2StartIndex;
        this.recordsRead = false;
        this.offsetTable = [];
        this.loadedOffsets = [];
        this.records = [];
        this.table2Records = [];
        this.table3Records = [];
        this.emptyRecords = new Map();
    }
    ;
    /** @type {TableSchema} */
    get schema() {
        return this._schema;
    }
    ;
    _generateGenericSchema() {
        let attributes = [];
        for (let i = 0; i < this.header.numMembers; i++) {
            attributes.push({
                'name': `Field_${i}`,
                'type': 'int',
                'minValue': 1, // set to 1 to avoid a weird case with int[] see: FranchiseFileField _parseFieldValue(...) function.
                'maxValue': 1
            });
        }
        return { attributes };
    }
    ;
    /** @param {number} index @returns {string} */
    getBinaryReferenceToRecord(index) {
        return utilService.getBinaryReferenceData(this.header.tableId, index);
    }
    ;
    updateBuffer() {
        // need to check table2 & table3 data first because it may change offsets of the legit records.
        let table2Data = this.strategy.getTable2BinaryData(this.table2Records, this.data.slice(this.header.table2StartIndex));
        let table3Data = [];
        if (this.header.table3StartIndex) {
            table3Data = this.strategy.getTable3BinaryData(this.table3Records, this.data.slice(this.header.table3StartIndex));
        }
        // update table2 length and table total length in table header (only if records have been read)
        if (this.recordsRead) {
            let table2DataLength = 0;
            let table3DataLength = 0;
            // Get length of all table2Data sub arrays
            table2Data.forEach((arr) => {
                table2DataLength += arr.length;
            });
            table3Data.forEach((arr) => {
                table3DataLength += arr.length;
            });
            this.header.table2Length = table2DataLength;
            this.header.tableTotalLength = this.header.table1Length + this.header.table2Length;
            this.header.table3Length = table3DataLength;
            this.data.writeUInt32BE(this.header.table2Length, this.header.offsetStart - 44);
            this.data.writeUInt32BE(this.header.table3Length, this.header.offsetStart - 40);
            this.data.writeUInt32BE(this.header.tableTotalLength, this.header.offsetStart - 24);
        }
        const changedRecords = this.records.filter((record) => {
            return record.isChanged;
        });
        let currentOffset = 0;
        let bufferArrays = [];
        // Add all of the array sizes to the buffer if the table is an array and had a change
        if (this.isArray && changedRecords.length > 0) {
            // Push the header data
            bufferArrays.push(this.data.slice(currentOffset, this.header.headerSize));
            let arraySizeBuffer = Buffer.alloc(this.header.data1RecordCount * 4);
            this.arraySizes.forEach((arraySize, index) => {
                arraySizeBuffer.writeUInt32BE(arraySize, (index * 4));
            });
            bufferArrays.push(arraySizeBuffer);
            currentOffset += this.header.headerSize + this.header.data1RecordCount * 4;
        }
        for (let i = 0; i < changedRecords.length; i++) {
            let record = changedRecords[i];
            record.isChanged = false;
            const recordOffset = this.header.table1StartIndex + (record.index * this.header.record1Size);
            bufferArrays.push(this.data.slice(currentOffset, recordOffset));
            const recordHexData = record.hexData;
            bufferArrays.push(recordHexData);
            currentOffset = recordOffset + recordHexData.length;
        }
        bufferArrays.push(this.data.slice(currentOffset, this.header.table2StartIndex));
        if (!this.recordsRead && this.header.hasSecondTable && table2Data.length === 0) {
            table2Data = this.data.slice(this.header.table2StartIndex);
        }
        bufferArrays = bufferArrays.concat(table2Data);
        if (!this.recordsRead && this.header.hasThirdTable && table3Data.length === 0) {
            table3Data = this.data.slice(this.header.table3StartIndex);
        }
        bufferArrays = bufferArrays.concat(table3Data);
        this.data = Buffer.concat(bufferArrays);
    }
    ;
    /** @param {number} index @param {boolean} resetEmptyRecordMap */
    setNextRecordToUse(index, resetEmptyRecordMap) {
        this._setNextRecordToUseBuffer(index);
        // Recalculate the empty record map if the option is set and the
        // records have already been read.
        if (resetEmptyRecordMap && this.recordsRead) {
            this.updateBuffer();
            this.emptyRecords = this._parseEmptyRecords();
        }
        this.emit('change');
    }
    ;
    /** @param {number} index */
    _setNextRecordToUseBuffer(index) {
        // We need to update the table header to use this row next
        this.header.nextRecordToUse = index;
        // And finally update the buffer to reflect this change
        this.data.writeUInt32BE(index, this.header.offsetStart - 4);
    }
    ;
    recalculateEmptyRecordReferences() {
        // For this method, we are not going to assume any existing empty records.
        // We're going through each record and checking if it is an empty reference.
        // If so, we'll add it to the list. At the end we will check if there are any unreachable empty references
        // and update those accordingly.
        let emptyRecordReferenceIndicies = [];
        this.records.forEach((record) => {
            let isEmptyReference = false;
            const firstFourBytesReference = utilService.getReferenceDataFromBuffer(record.data.slice(0, 4));
            if (firstFourBytesReference.tableId === 0 && firstFourBytesReference.rowNumber !== 0) {
                // Could be a an empty record reference or a table2 field.
                // Check for a table2 field reference.
                const firstOffset = this.offsetTable[0];
                if (firstOffset.type !== 'string') {
                    isEmptyReference = true;
                    // Save the row number that this record points to.
                    emptyRecordReferenceIndicies.push(firstFourBytesReference.rowNumber);
                }
            }
            record.isEmpty = isEmptyReference;
        });
        // We need to determine the starting node.
        // To do that, we need to find the empty record which no other empty record points to.
        const unreachableRecords = this.records.filter((record) => {
            return record.isEmpty;
        }).filter((record) => {
            return emptyRecordReferenceIndicies.indexOf(record.index) === -1;
        });
        // If there are more than 1 nodes which are not referenced, there is an issue
        if (unreachableRecords.length > 1) {
            const unreachableIndicies = unreachableRecords.map((record) => {
                return record.index;
            });
            console.warn(`(${this.header.tableId}) ${this.name} - More than one unreachable records found: ` +
                `(${unreachableIndicies.join(', ')}). The game will most likely crash if you do not fix this problem. ` +
                `The nextRecordToUse has NOT been updated.`);
        }
        else {
            let nextRecordToUse = this.header.recordCapacity;
            if (unreachableRecords.length === 1) {
                nextRecordToUse = unreachableRecords[0].index;
            }
            this._setNextRecordToUseBuffer(nextRecordToUse);
            this.emptyRecords = this._parseEmptyRecords();
            this.emit('change');
        }
    }
    ;
    /** @param {Buffer} buf @param {boolean} shouldReadRecords @returns {Promise<FranchiseFileTable>?} */
    async replaceRawData(buf, shouldReadRecords) {
        this.data = buf;
        // Reset fields
        this.recordsRead = false;
        this.header = this.strategy.parseHeader(this.data);
        this.name = this.header.name;
        this.isArray = this.header.isArray;
        this.loadedOffsets = [];
        this.isChanged = false;
        this.records = [];
        this.table2Records = [];
        this.table3Records = [];
        this.arraySizes = [];
        this.emptyRecords = new Map();
        this.emit('change');
        // Re-read records if desired
        if (shouldReadRecords) {
            return this.readRecords();
        }
    }
    ;
    // attribsToLoad is an array of attribute names (strings) to load. It is optional - if nothing is provided to the function it will load all attributes.
    /** @param {Array<string>?} [attribsToLoad] @returns {Promise<FranchiseFileTable>} */
    readRecords(attribsToLoad) {
        return new Promise((resolve, reject) => {
            if (!this.recordsRead || isLoadingNewOffsets(this.loadedOffsets, attribsToLoad, this.offsetTable)) {
                if (this.isArray) {
                    const numberOfFields = this.header.record1Size / 4;
                    let offsetTable = [];
                    let arraySizes = [];
                    for (let i = 0; i < numberOfFields; i++) {
                        const offset = {
                            'final': false,
                            'index': i,
                            'indexOffset': i * 32,
                            'isSigned': false,
                            'length': 32,
                            'maxLength': null,
                            'maxValue': null,
                            'minValue': null,
                            'name': `${this.name.substring(0, this.name.length - 2)}${i}`,
                            'offset': i * 32,
                            'type': this.name.substring(0, this.name.length - 2),
                            'valueInSecondTable': false,
                            'valueInThirdTable': false,
                        };
                        offset.isReference = !offset.enum && (offset.type[0] == offset.type[0].toUpperCase() || offset.type.includes('[]')) ? true : false;
                        offsetTable.push(offset);
                    }
                    for (let i = 0; i < this.header.data1RecordCount; i++) {
                        arraySizes.push(this.data.readUInt32BE(this.header.headerSize + (i * 4)));
                    }
                    this.offsetTable = offsetTable;
                    this.arraySizes = arraySizes;
                }
                else {
                    if (!this.schema) {
                        console.warn('Schema doesn\'t exist for this table. Generating generic schema from table header...');
                        this.schema = this._generateGenericSchema();
                    }
                    this.offsetTable = readOffsetTable(this.data, this.schema, this.header);
                }
                let offsetTableToUse = this.offsetTable;
                const mandatoryOffsetsToLoad = this.strategy.getMandatoryOffsets(this.offsetTable);
                if (attribsToLoad) {
                    // get any new attributes to load plus the existing loaded offsets
                    offsetTableToUse = offsetTableToUse.filter((attrib) => {
                        return mandatoryOffsetsToLoad.includes(attrib.name) ||
                            attribsToLoad.includes(attrib.name) ||
                            this.loadedOffsets.find((offset) => {
                                return offset.name === attrib.name;
                            });
                    });
                }
                this.loadedOffsets = offsetTableToUse;
                this.records = readRecords(this.data, this.header, offsetTableToUse, this);
                if (this.header.hasSecondTable) {
                    this._parseTable2Values(this.data, this.header, this.records);
                }
                if (this.header.hasThirdTable) {
                    this._parseTable3Values(this.data, this.header, this.records);
                }
                this.emptyRecords = this._parseEmptyRecords();
                this.records.forEach((record, index) => {
                    if (this.isArray) {
                        record.arraySize = this.arraySizes[index];
                    }
                    if (this.emptyRecords.get(index)) {
                        record.isEmpty = true;
                    }
                });
                this.recordsRead = true;
                resolve(this);
            }
            else {
                resolve(this);
            }
        });
    }
    ;
    /** @returns {Map<EmptyRecordEntry>} */
    _parseEmptyRecords() {
        let emptyRecords = new Map();
        const firstEmptyRecord = this.header.nextRecordToUse;
        let previousEmptyRecordIndex = null;
        let currentEmptyRecordIndex = firstEmptyRecord;
        if (firstEmptyRecord !== this.header.recordCapacity) {
            while (currentEmptyRecordIndex !== this.header.recordCapacity) {
                // let nextEmptyRecordIndex = this.data.readUInt32BE(this.header.table1StartIndex + (currentEmptyRecordIndex * sizeOfEachRecord));
                let nextEmptyRecordIndex = this.records[currentEmptyRecordIndex].data.readUInt32BE(0);
                emptyRecords.set(currentEmptyRecordIndex, {
                    previous: previousEmptyRecordIndex,
                    next: nextEmptyRecordIndex
                });
                previousEmptyRecordIndex = currentEmptyRecordIndex;
                currentEmptyRecordIndex = nextEmptyRecordIndex;
            }
        }
        return emptyRecords;
    }
    ;
    /** @param {FranchiseFileRecord} */
    _onRecordEmpty(record) {
        // First, check if the record is already empty. If so, don't do anything...
        // If not empty, then we need to empty it.
        if (!record.isEmpty) {
            record.isChanged = true;
            const lastEmptyRecordMapEntry = Array.from(this.emptyRecords).pop();
            // When we empty a record, we need to check if another empty record exists in the table.
            if (lastEmptyRecordMapEntry !== null && lastEmptyRecordMapEntry !== undefined) {
                // If an empty record already exists, we just need to get the last empty record
                // and update its index to point to the current record that we want to empty.
                const lastEmptyRecordIndex = lastEmptyRecordMapEntry[0];
                this.emptyRecords.set(lastEmptyRecordIndex, {
                    previous: lastEmptyRecordMapEntry[1].previous,
                    next: record.index
                });
                // Then we need to update the current record index to point to the record capacity.
                this.emptyRecords.set(record.index, {
                    previous: lastEmptyRecordIndex,
                    next: this.header.recordCapacity
                });
                // Finally, we need to update the buffers to reflect this data.
                // First, place the new referenced index (will be the first 4 bytes)
                // Next, fill the rest of the record with 0s (the last bytes of the record)
                // And update both record's data. This will set the unformatted and formatted values
                // without emitting an event
                this._changeRecordBuffers(lastEmptyRecordIndex, record.index);
                this._changeRecordBuffers(record.index, this.header.recordCapacity);
            }
            else {
                // In this case, the record that was emptied is the first empty record in the table
                this.emptyRecords.set(record.index, {
                    previous: null,
                    next: this.header.recordCapacity
                });
                // Finally update the table header and buffer so that the game uses this new empty
                // record as the next record to use (or fill)
                this.setNextRecordToUse(record.index);
                this._changeRecordBuffers(record.index, this.header.recordCapacity);
            }
            this.emit('change');
        }
    }
    ;
    /** @param {Buffer} data @param {FranchiseFileTableHeader} header @param {Array<FranchiseFileRecord>} records */
    _parseTable2Values(data, header, records) {
        const that = this;
        const secondTableData = data.slice(header.table2StartIndex);
        records.forEach((record) => {
            const fieldsReferencingSecondTable = record.fieldsArray.filter((field) => {
                return field.secondTableField;
            });
            fieldsReferencingSecondTable.forEach((field) => {
                field.secondTableField.unformattedValue = that.strategyBase.table2Field.getInitialUnformattedValue(field, secondTableData);
                field.secondTableField.strategy = that.strategyBase.table2Field;
                that.table2Records.push(field.secondTableField);
                field.secondTableField.parent = that;
            });
        });
    }
    ;
    /** @param {Buffer} data @param {FranchiseFileTableHeader} header @param {Array<FranchiseFileRecord>} records */
    _parseTable3Values(data, header, records) {
        const that = this;
        const thirdTableData = data.slice(header.table3StartIndex);
        records.forEach((record) => {
            const fieldsReferencingThirdTable = record.fieldsArray.filter((field) => {
                return field.thirdTableField;
            });
            fieldsReferencingThirdTable.forEach((field) => {
                field.thirdTableField.unformattedValue = that.strategyBase.table3Field.getInitialUnformattedValue(field, thirdTableData);
                field.thirdTableField.strategy = that.strategyBase.table3Field;
                that.table3Records.push(field.thirdTableField);
                field.thirdTableField.parent = that;
            });
        });
    }
    ;
    /** @param {number} index @param {number} emptyRecordReference */
    _changeRecordBuffers(index, emptyRecordReference) {
        this._setBufferToEmptyRecordReference(index, emptyRecordReference);
        this._setRecordInternalBuffer(index, emptyRecordReference);
    }
    ;
    /** @param {number} index @param {number} emptyRecordReference */
    _setBufferToEmptyRecordReference(index, emptyRecordReference) {
        const recordStartIndex = this.header.table1StartIndex + (index * this.header.record1Size);
        this.data.writeUInt32BE(emptyRecordReference, recordStartIndex);
        // that.data.fill(0, recordStartIndex + 4, recordStartIndex + that.header.record1Size);
    }
    ;
    /** @param {number} index @param {number} emptyRecordReference */
    _setRecordInternalBuffer(index, emptyRecordReference) {
        // let newData = utilService.dec2bin(emptyRecordReference, 32);
        // const recordSizeInBits = this.header.record1Size * 8;
        // if (recordSizeInBits > 32) {
        //   newData += this.records[index]._data.slice(32);
        // }
        // console.log(newData);
        this.records[index]._data.writeUInt32BE(emptyRecordReference, 0);
    }
    ;
    /** @param {string} name @param {*} object */
    onEvent(name, object) {
        if (object instanceof FranchiseFileRecord) {
            if (name === 'change') {
                object.isChanged = true;
                if (this.isArray) {
                    this.arraySizes[object.index] = object.arraySize;
                }
                // When a record changes, we need to check if it was previously empty
                // If so, we need to consider the record as no longer empty
                // So we need to adjust the empty records
                // First, check if the record's length is greater than 4 bytes (32 bits)
                // If less than 4 bytes, it can never become empty...probably. :)
                if (this.header.record1Size >= 4) {
                    // Ex: Empty record list looks like object: A -> B -> C
                    // When B's value is changed, the records need updated to: A -> C
                    const emptyRecordReference = this.emptyRecords.get(object.index);
                    const changedRecordWasEmpty = emptyRecordReference !== null && emptyRecordReference !== undefined;
                    // Automatically un-empty the row if the setting is enabled and the changed record was empty.
                    if (changedRecordWasEmpty) {
                        // Check if the record's first four bytes still have a reference to the 0th table.
                        // If so, then the record is still considered empty.
                        // We need to check the buffer because the first field is not always a reference.
                        // const referenceData = utilService.getReferenceDataFromBuffer(object.data.slice(0, 4));
                        // if (referenceData.tableId !== 0 || referenceData.rowNumber > this.header.recordCapacity) {
                        // if the changed field isn't included in the first 32 bits, zero out the first 32 bits. 
                        // Otherwise, it's not necessary to zero out.
                        const changedFieldsInFirst4Bytes = object.fieldsArray.filter((field) => {
                            return field.isChanged && field.offset.indexOffset < 32;
                        });
                        if (this._settings.autoUnempty && changedFieldsInFirst4Bytes.length === 0) {
                            // set first 4 bytes to 0
                            this._changeRecordBuffers(object.index, 0);
                            // invalidate the cached values since we set the buffer directly
                            const fieldsInFirst4Bytes = object.fieldsArray.filter((field) => {
                                return field.offset.indexOffset < 32;
                            });
                            fieldsInFirst4Bytes.forEach((field) => {
                                field.clearCachedValues();
                            });
                        }
                        // If autoUnempty is disabled, only un-empty the row if a field in the first 4 bytes changed.
                        // If autoUnempty is enabled, un-empty the row if ANY field changed.
                        if (this._settings.autoUnempty || changedFieldsInFirst4Bytes.length > 0) {
                            // if the record contains any string values, point the string values to
                            // their correct offsets
                            this.strategy.recalculateStringOffsets(this, object);
                            this.strategy.recalculateBlobOffsets(this, object);
                            // Delete the empty record entry because it is no longer empty
                            this.emptyRecords.delete(object.index);
                            // Set the isEmpty back to false because it's no longer empty
                            object.isEmpty = false;
                            // Check if there is a previous empty record
                            const previousEmptyReference = this.emptyRecords.get(emptyRecordReference.previous);
                            if (previousEmptyReference) {
                                // Set the previous empty record to point to the old reference's next node
                                this.emptyRecords.set(emptyRecordReference.previous, {
                                    previous: this.emptyRecords.get(emptyRecordReference.previous).previous,
                                    next: emptyRecordReference.next
                                });
                                // change the table buffer and record buffer to reflect object change
                                this._changeRecordBuffers(emptyRecordReference.previous, emptyRecordReference.next);
                            }
                            // If there is a next empty reference, update the previous value accordingly to now point
                            // to the current record's previous index.
                            const nextEmptyReference = this.emptyRecords.get(emptyRecordReference.next);
                            if (nextEmptyReference) {
                                this.emptyRecords.set(emptyRecordReference.next, {
                                    previous: emptyRecordReference.previous,
                                    next: this.emptyRecords.get(emptyRecordReference.next).next
                                });
                                if (!previousEmptyReference) {
                                    // If no previous empty record exists and a next record exists, we need to update the header to
                                    // point to object record as the next record to use.
                                    this.setNextRecordToUse(emptyRecordReference.next);
                                }
                            }
                            // If there are no previous or next empty references
                            // Then there are no more empty references in the table
                            // Update the table header nextRecordToUse back to the table record capacity
                            if (!previousEmptyReference && !nextEmptyReference) {
                                this.setNextRecordToUse(this.header.recordCapacity);
                            }
                        }
                        // }
                    }
                }
                this.emit('change');
            }
            else if (name === 'empty') {
                this._onRecordEmpty(object);
                this.emit('change');
            }
        }
        else if (object instanceof FranchiseFileTable2Field || object instanceof FranchiseFileTable3Field) {
            object.isChanged = true;
            // When a table2 field changes, we need to check if the record is empty. If so, we need to mark it as not empty. 
            if (object.fieldReference) {
                this.onEvent('change', object.fieldReference._parent);
            }
            else {
                // Only emit change here if the field reference is empty.
                // the onEvent call will emit a change in the above condition.
                this.emit('change');
            }
        }
    }
    ;
}
function readOffsetTable(data, schema, header) {
    let currentIndex = header.offsetStart;
    let offsetTable = parseOffsetTableFromData();
    // console.log(offsetTable.sort((a,b) => { return a.indexOffset - b.indexOffset}))
    sortOffsetTableByIndexOffset();
    function isSkippedOffset(offset) {
        return offset.final || offset.const || offset.type.indexOf('()') >= 0 || offset.type === 'ITransaction_Sleep';
    }
    for (let i = 0; i < offsetTable.length; i++) {
        let curOffset = offsetTable[i];
        let nextOffset = offsetTable.length > i + 1 ? offsetTable[i + 1] : null;
        if (nextOffset) {
            let curIndex = i + 2;
            while (nextOffset && isSkippedOffset(nextOffset)) {
                nextOffset = offsetTable[curIndex];
                curIndex += 1;
            }
            if (nextOffset) {
                curOffset.length = nextOffset.indexOffset - curOffset.indexOffset;
            }
            else {
                curOffset.length = (header.record1Size * 8) - curOffset.indexOffset;
            }
        }
        else {
            curOffset.length = (header.record1Size * 8) - curOffset.indexOffset;
        }
        if (curOffset.length > 32) {
            curOffset.length = 32;
        }
    }
    let currentOffsetIndex = 0;
    let chunked32bit = [];
    for (let i = 0; i < header.record1Size * 8; i += 32) {
        let chunkedOffsets = [];
        let offsetLength = i % 32;
        do {
            const currentOffset = offsetTable[currentOffsetIndex];
            if (currentOffset) {
                if (isSkippedOffset(currentOffset)) {
                    currentOffsetIndex += 1;
                    continue;
                }
                offsetLength += currentOffset.length;
                chunkedOffsets.push(currentOffset);
                currentOffsetIndex += 1;
            }
            else {
                break;
            }
        } while ((currentOffsetIndex < offsetTable.length) && offsetLength < 32);
        chunked32bit.push(chunkedOffsets);
    }
    chunked32bit.forEach((offsetArray) => {
        if (offsetArray.length > 0) {
            let currentOffset = offsetArray[0].indexOffset;
            offsetArray[offsetArray.length - 1].offset = currentOffset;
            for (let i = offsetArray.length - 2; i >= 0; i--) {
                let previousOffset = offsetArray[i + 1];
                let offset = offsetArray[i];
                offset.offset = previousOffset.offset + previousOffset.length;
            }
        }
    });
    offsetTable = offsetTable.filter((offset) => {
        return !(isSkippedOffset(offset));
    });
    offsetTable.sort((a, b) => {
        return a.offset - b.offset;
    });
    for (let i = 0; i < offsetTable.length; i++) {
        schema.attributes[offsetTable[i].index].offsetIndex = i;
    }
    return offsetTable;
    function sortOffsetTableByIndexOffset() {
        offsetTable.sort((a, b) => {
            return a.indexOffset - b.indexOffset;
        });
    }
    function parseOffsetTableFromData() {
        let table = [];
        let seenIndexOffsets = new Set();
        schema.attributes.forEach((attribute, index) => {
            const minValue = parseInt(attribute.minValue);
            const maxValue = parseInt(attribute.maxValue);
            const indexOffset = utilService.byteArrayToLong(data.slice(currentIndex, currentIndex + 4), true);
            const isRepeatedIndexOffset = seenIndexOffsets.has(indexOffset);
            const entry = {
                'index': index,
                'originalIndex': parseInt(attribute.index),
                'name': attribute.name,
                'type': (minValue < 0 || maxValue < 0) ? 's_' + attribute.type : attribute.type,
                'isReference': !attribute.enum && (attribute.type[0] == attribute.type[0].toUpperCase() || attribute.type.includes('[]') || attribute.type === 'record') ? true : false,
                'valueInSecondTable': header.hasSecondTable && attribute.type === 'string',
                'valueInThirdTable': header.hasThirdTable && attribute.type === 'binaryblob',
                'isSigned': minValue < 0 || maxValue < 0,
                'minValue': minValue,
                'maxValue': maxValue,
                'maxLength': attribute.maxLength ? parseInt(attribute.maxLength) : null,
                'final': attribute.final === 'true' || isRepeatedIndexOffset,
                'indexOffset': indexOffset,
                'enum': attribute.enum,
                'const': attribute.const,
            };
            table.push(entry);
            // determine if the offset should be skipped. For normal schemas, this is determined by final, const, or type.
            // For generated schemas, an offset is skipped if the indexOffset has been seen before.
            const isSkipped = isSkippedOffset(entry);
            if (!isSkipped) {
                seenIndexOffsets.add(indexOffset);
            }
            currentIndex += 4;
        });
        return table;
    }
}
function readRecords(data, header, offsetTable, table) {
    // const binaryData = utilService.getBitArray(data.slice(header.table1StartIndex, header.table2StartIndex));
    let records = [];
    if (data) {
        let index = 0;
        for (let i = header.table1StartIndex; i < header.table2StartIndex; i += header.record1Size) {
            // const recordBinary = binaryData.slice(i, i + (header.record1Size * 8));
            let record = new FranchiseFileRecord(data.slice(i, i + header.record1Size), index, offsetTable, table);
            records.push(record);
            index += 1;
        }
    }
    return records;
}
function isLoadingNewOffsets(currentlyLoaded, attribsToLoad, offsetTable) {
    const names = currentlyLoaded.map((currentlyLoadedOffset) => {
        return currentlyLoadedOffset.name;
    });
    if (attribsToLoad) {
        let newAttribs = attribsToLoad.filter((attrib) => {
            return !names.includes(attrib);
        });
        return newAttribs.length > 0;
    }
    else {
        return currentlyLoaded.length !== offsetTable.length;
    }
}

let CommonAlgorithms = {};
CommonAlgorithms.save = (units, oldData) => {
    // first check if any records changed. If not, we can return immediately because nothing changed.
    const changedUnits = units.find((unit) => {
        return unit.isChanged;
    });
    if (!changedUnits) {
        return oldData;
    }
    // if there are changed records, we need to loop through them all...kinda :)
    let offsetDifference = 0;
    let oldOffsetCounter = 0;
    let bufferArrays = [];
    // Ensure the units are sorted by index in the actual file. Otherwise, we may overwrite data
    units.sort((a, b) => {
        return a.index - b.index;
    });
    units.forEach((unit, index) => {
        if (unit.offset === 0 && index > 0) {
            // there are usually trailing records at the end of the table that reference
            // the first offset. Take a look at the Player table for an example of this.
            // There are a bunch of rows at the end where FirstName, LastName, etc...
            // will all point to the very first record.
            // We don't need to worry about these records at all, so just skip them.
            return;
        }
        // Update the record's offset so that it's up to date with the changes.
        // Remember, a record's length can change here...so we need to keep the
        // offsets up to date.
        unit.offset += offsetDifference;
        if (unit.isChanged) {
            // If a record has changed, we want to get all the unchanged data from before this record up until this record
            // in the old data. Take a look at the test cases and add some console logs if you want to see what I mean by this.
            // Basically, we are pushing all the unchanged data directly from the old data, and any new data is inserted in there as well.
            const unchangedDataSinceLastChangedRecord = oldData.slice(oldOffsetCounter, unit.offset - offsetDifference);
            const newHexData = unit.hexData;
            bufferArrays.push(unchangedDataSinceLastChangedRecord, newHexData);
            // Now we need to update our counts so that the above statements work for the rest of the loop.
            oldOffsetCounter = (unit.offset - offsetDifference) + unit.lengthAtLastSave;
            offsetDifference += (newHexData.length - unit.lengthAtLastSave);
            // We update the length at last save so that this algorithm works the next time it's called.
            unit.lengthAtLastSave = newHexData.length;
            unit.isChanged = false;
        }
    });
    // Next, we need to push the remainder of data onto the array.
    // For example, think if a user changed the 3rd record out of 100.
    // In the loop, we would push the first 2 records as the unchangedDataSinceLastChangedRecord (since they didn't change!)
    // We would also push the changed 3rd record (newHexData)
    // Now we need to push records 4 to 100. These did not get added in the loop because they didn't change.
    // We'll push them here.
    // console.log(oldOffsetCounter);
    bufferArrays.push(oldData.slice(oldOffsetCounter));
    // Finally, concat all of the arrays into one buffer to return it.
    // Why do all of this BS? Well, concat is an 'expensive' operation. 
    // It's not very efficient and takes a long time comparatively to other methods.
    // So, instead of concat-ing each change record, we will only do it one time here at the end.
    // We also want to reduce the number of items in the bufferArrays as much as possible to save on time.
    // That's why we use the unchangedDataSinceLastChangedRecord to combine a bunch of records that weren't changed together.
    return Buffer.concat(bufferArrays);
};

let CommonFileStrategy = {};
CommonFileStrategy.generateUnpackedContents = CommonAlgorithms.save;

const COMPRESSED_DATA_OFFSET$1 = 0x52;
let FranchiseFileStrategy = {};
FranchiseFileStrategy.generateUnpackedContents = CommonFileStrategy.generateUnpackedContents;
FranchiseFileStrategy.postPackFile = (originalData, newData) => {
    const header = originalData.slice(0, COMPRESSED_DATA_OFFSET$1);
    const endOfData = (newData.length).toString(16);
    header[0x4A] = parseInt(endOfData.substr(4), 16);
    header[0x4B] = parseInt(endOfData.substr(2, 2), 16);
    header[0x4C] = parseInt(endOfData.substr(0, 2), 16);
    const trailer = originalData.slice(newData.length + COMPRESSED_DATA_OFFSET$1);
    return Buffer.concat([header, newData, trailer]);
};

/**
 * @type {FileStrategy}
 */
let M19FileStrategy = {};
M19FileStrategy.postPackFile = FranchiseFileStrategy.postPackFile;
M19FileStrategy.generateUnpackedContents = FranchiseFileStrategy.generateUnpackedContents;

let FranchiseTableStrategy = {};
FranchiseTableStrategy.getTable2BinaryData = (table2Records, fullTable2Buffer) => {
    let table2Data = [];
    // Make sure to sort the table2 records by index
    const changedTable2Records = table2Records.filter((record) => { return record.isChanged; }).sort((a, b) => { return a.index - b.index; });
    let currentOffset = 0;
    for (let i = 0; i < changedTable2Records.length; i++) {
        let record = changedTable2Records[i];
        record.isChanged = false;
        const recordOffset = record.index;
        if (i > 0 && recordOffset === 0) {
            // this case is true for the last few rows with no data in them. They reference the first table2 value.
            continue;
        }
        const preData = fullTable2Buffer.slice(currentOffset, recordOffset);
        if (preData.length > 0) {
            table2Data.push(preData);
        }
        const recordHexData = record.hexData;
        table2Data.push(recordHexData);
        currentOffset = recordOffset + recordHexData.length;
    }
    if (table2Records.length > 0) {
        table2Data.push(fullTable2Buffer.slice(currentOffset));
    }
    return table2Data;
};
FranchiseTableStrategy.getMandatoryOffsets = (offsets) => {
    return [];
};
FranchiseTableStrategy.recalculateStringOffsets = (table, record) => {
    // First, calculate length allocated per record in table2
    const byteLengthPerRecord = table.offsetTable.filter((offsetEntry) => {
        return offsetEntry.type === 'string';
    }).reduce((accum, cur) => {
        return accum + cur.maxLength;
    }, 0);
    // Then, go through each string field sorted by offset index, and assign offsets to the table2 fields
    let runningOffset = 0;
    record.fieldsArray.filter((field) => {
        return field.offset.type === 'string';
    }).sort((a, b) => {
        return a.offset.index - b.offset.index;
    }).forEach((field) => {
        if (field.secondTableField) {
            field.secondTableField.offset = (record.index * byteLengthPerRecord) + runningOffset;
        }
        runningOffset += field.offset.maxLength;
    });
};
FranchiseTableStrategy.recalculateBlobOffsets = (table, record) => {
    // First, calculate length allocated per record in table2
    const byteLengthPerRecord = table.offsetTable.filter((offsetEntry) => {
        return offsetEntry.type === 'binaryblob';
    }).reduce((accum, cur) => {
        return accum + cur.maxLength + 2; // +2 bytes for size, which is not considered in max length.
    }, 0);
    // Then, go through each string field sorted by offset index, and assign offsets to the table2 fields
    let runningOffset = 0;
    record.fieldsArray.filter((field) => {
        return field.offset.type === 'binaryblob';
    }).sort((a, b) => {
        return a.offset.index - b.offset.index;
    }).forEach((field) => {
        if (field.thirdTableField) {
            field.thirdTableField.offset = (record.index * byteLengthPerRecord) + runningOffset;
        }
        runningOffset += field.offset.maxLength;
    });
};

let M19TableHeaderStrategy = {};
M19TableHeaderStrategy.parseHeader = (data) => {
    const headerStart = 0x80;
    const tableName = readTableName$1(data);
    const isArray = tableName.indexOf('[]') >= 0;
    const tableId = data.readUInt32BE(headerStart);
    const tablePad1 = data.readUInt32BE(headerStart + 4);
    const tableUnknown1 = data.readUInt32BE(headerStart + 8);
    const tableUnknown2 = data.readUInt32BE(headerStart + 12);
    const data1Id = readTableName$1(data.slice(headerStart + 16, headerStart + 20));
    const data1Type = data.readUInt32BE(headerStart + 20);
    const data1Unknown1 = data.readUInt32BE(headerStart + 24);
    const data1Flag1 = data[headerStart + 28];
    const data1Flag2 = data[headerStart + 29];
    const data1Flag3 = data[headerStart + 30];
    const data1Flag4 = data[headerStart + 31];
    const tableStoreLength = data.readUInt32BE(headerStart + 32);
    let headerOffset = headerStart + 36;
    let records1SizeOffset = 1689;
    let tableStoreName = null;
    if (tableStoreLength > 0) {
        headerOffset += tableStoreLength;
        records1SizeOffset += tableStoreLength * 8;
        tableStoreName = readTableName$1(data.slice(headerStart + 36, headerStart + 36 + tableStoreLength));
    }
    const data1Offset = data.readUInt32BE(headerOffset);
    const data1TableId = data.readUInt32BE(headerOffset + 4);
    const data1RecordCount = data.readUInt32BE(headerOffset + 8);
    const data1Pad2 = data.readUInt32BE(headerOffset + 12);
    const table1Length = data.readUInt32BE(headerOffset + 16);
    const table2Length = data.readUInt32BE(headerOffset + 20);
    const data1Pad3 = data.readUInt32BE(headerOffset + 24);
    const data1Pad4 = data.readUInt32BE(headerOffset + 28);
    const data2Id = readTableName$1(data.slice(headerOffset + 32, headerOffset + 36));
    const table1Length2 = data.readUInt32BE(headerOffset + 36);
    const tableTotalLength = data.readUInt32BE(headerOffset + 40);
    const data2RecordWords = data.readUInt32BE(headerOffset + 44);
    const data2RecordCapacity = data.readUInt32BE(headerOffset + 48);
    const data2IndexEntries = data.readUInt32BE(headerOffset + 52);
    data.readUInt32BE(headerOffset + 56);
    const nextRecordToUse = data.readUInt32BE(headerOffset + 60);
    let offsetStart = 0xE4 + tableStoreLength;
    const hasSecondTable = tableTotalLength > table1Length;
    let headerSize = 0;
    let records1Size = 0;
    if (isArray) {
        headerSize = 0xE4 + tableStoreLength;
        // const binaryData = utilService.getBitArray(data.slice(0, headerSize));
        records1Size = data2RecordWords * 4;
    }
    return {
        'name': tableName,
        'isArray': isArray,
        'tableId': tableId,
        'tablePad1': tablePad1,
        'uniqueId': tablePad1,
        'tableUnknown1': tableUnknown1,
        'tableUnknown2': tableUnknown2,
        'data1Id': data1Id,
        'data1Type': data1Type,
        'data1Unknown1': data1Unknown1,
        'data1Flag1': data1Flag1,
        'data1Flag2': data1Flag2,
        'data1Flag3': data1Flag3,
        'data1Flag4': data1Flag4,
        'tableStoreLength': tableStoreLength,
        'tableStoreName': tableStoreName,
        'data1Offset': data1Offset,
        'data1TableId': data1TableId,
        'data1RecordCount': data1RecordCount,
        'data1Pad2': data1Pad2,
        'table1Length': table1Length,
        'table2Length': table2Length,
        'data1Pad3': data1Pad3,
        'data1Pad4': data1Pad4,
        'headerSize': headerSize,
        'headerOffset': 0xE4,
        'record1SizeOffset': records1SizeOffset,
        'record1SizeLength': 9,
        'record1Size': records1Size,
        'offsetStart': offsetStart,
        'data2Id': data2Id,
        'table1Length2': table1Length2,
        'tableTotalLength': tableTotalLength,
        'hasSecondTable': hasSecondTable,
        'table1StartIndex': tableStoreLength === 0 && !isArray ? headerSize : headerSize + (data1RecordCount * 4),
        'table2StartIndex': tableStoreLength === 0 && !isArray ? headerSize + (data1RecordCount * records1Size) : headerSize + (data1RecordCount * 4) + (data1RecordCount * records1Size),
        'recordWords': data2RecordWords,
        'recordCapacity': data2RecordCapacity,
        'numMembers': data2IndexEntries,
        'nextRecordToUse': nextRecordToUse,
        'hasThirdTable': false
    };
};
M19TableHeaderStrategy.parseHeaderAttributesFromSchema = (schema, data, header) => {
    if (header.isArray) {
        return {
            'headerSize': header.headerSize,
            'record1Size': header.record1Size,
            'table1StartIndex': header.table1StartIndex,
            'table2StartIndex': header.table2StartIndex
        };
    }
    else {
        let headerSize = header.headerOffset + (schema.numMembers * 4) + header.tableStoreLength;
        const binaryData = utilService.getBitArray(data.slice(0, headerSize));
        let records1Size = utilService.bin2dec(binaryData.slice(header.record1SizeOffset, header.record1SizeOffset + header.record1SizeLength));
        return {
            'headerSize': headerSize,
            'record1Size': records1Size,
            'table1StartIndex': headerSize,
            'table2StartIndex': headerSize + (header.data1RecordCount * records1Size)
        };
    }
};
function readTableName$1(data) {
    let name = '';
    let i = 0;
    do {
        name += String.fromCharCode(data[i]);
        i += 1;
    } while (i < data.length && data[i] !== 0);
    return name;
}

/**
 * @type {TableStrategy}
 */
let M19TableStrategy = {};
M19TableStrategy.parseHeader = M19TableHeaderStrategy.parseHeader;
M19TableStrategy.parseHeaderAttributesFromSchema = M19TableHeaderStrategy.parseHeaderAttributesFromSchema;
M19TableStrategy.getTable2BinaryData = FranchiseTableStrategy.getTable2BinaryData;
M19TableStrategy.getTable3BinaryData = FranchiseTableStrategy.getTable2BinaryData;
M19TableStrategy.getMandatoryOffsets = FranchiseTableStrategy.getMandatoryOffsets;
M19TableStrategy.recalculateStringOffsets = FranchiseTableStrategy.recalculateStringOffsets;
M19TableStrategy.recalculateBlobOffsets = FranchiseTableStrategy.recalculateBlobOffsets;

let FranchiseTable2FieldStrategy = {};
FranchiseTable2FieldStrategy.getInitialUnformattedValue = (field, data) => {
    return data.slice(field.secondTableField.index, (field.secondTableField.index + field.offset.maxLength));
};
FranchiseTable2FieldStrategy.setUnformattedValueFromFormatted = (formattedValue, maxLength) => {
    let valuePadded = formattedValue;
    if (valuePadded.length > maxLength) {
        valuePadded = valuePadded.substring(0, maxLength);
    }
    const numberOfNullCharactersToAdd = maxLength - formattedValue.length;
    for (let i = 0; i < numberOfNullCharactersToAdd; i++) {
        valuePadded += String.fromCharCode(0);
    }
    return Buffer.from(valuePadded);
};

/**
 * @type {Table2FieldStrategy}
 */
let M19Table2Strategy = {};
M19Table2Strategy.getInitialUnformattedValue = FranchiseTable2FieldStrategy.getInitialUnformattedValue;
M19Table2Strategy.setUnformattedValueFromFormatted = FranchiseTable2FieldStrategy.setUnformattedValueFromFormatted;

const __filename$4 = url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href)));
const __dirname$4 = path.dirname(__filename$4);

const slotsLookup = JSON.parse(fs.readFileSync(path.join(__dirname$4, '../data/lookup-files/slotsLookup.json'), 'utf8'));
const fieldLookup = JSON.parse(fs.readFileSync(path.join(__dirname$4, '../data/lookup-files/fieldLookup.json'), 'utf8'));
const enumLookup = JSON.parse(fs.readFileSync(path.join(__dirname$4, '../data/lookup-files/enumLookup.json'), 'utf8'));

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
function readChviRecord(dataBuf)
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

        }
    }

    return recordObject;
}

function getUncompressedTextFromSixBitCompression(data) 
{
    const bv = new bitBufferExports.BitView(data, data.byteOffset);
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

let FranchiseTable3FieldStrategy$1 = {};
FranchiseTable3FieldStrategy$1.getZlibDataStartIndex = (unformattedValue) => {
    return unformattedValue.indexOf(Buffer.from([0x1F, 0x8B]));
};
FranchiseTable3FieldStrategy$1.getInitialUnformattedValue = (field, data) => {
    return data.slice(field.thirdTableField.index, (field.thirdTableField.index + field.offset.maxLength + 2));
    // extend maxLength + 2 because the first 2 bytes are the size of the zipped data
};
FranchiseTable3FieldStrategy$1.getFormattedValueFromUnformatted = (unformattedValue) => {
    const zlibDataStartIndex = FranchiseTable3FieldStrategy$1.getZlibDataStartIndex(unformattedValue);
    // first few bytes are the size of the zipped data & other flags, so skip those.
    const decompressedData = zlib.gunzipSync(unformattedValue.subarray(zlibDataStartIndex));
    // If the size is followed by 0x7 before the gzip-compressed data, the decompressed data is in TDB2 format, so use the TDB2 converter
    if (unformattedValue[2] === 0x7) {
        const jsonData = readChviRecord(decompressedData);
        return JSON.stringify(jsonData);
    }
    // Otherwise, it's a standard JSON, so just convert the buffer to a string
    return decompressedData.toString();
};
FranchiseTable3FieldStrategy$1.setUnformattedValueFromFormatted = (formattedValue, oldUnformattedValue, maxLength) => {
    let zippedData = zlib.gzipSync(formattedValue);
    let padding = Buffer.alloc(maxLength - zippedData.length); // table3s all have the same length and are zero padded to the end.
    let sizeBuf = Buffer.alloc(2);
    sizeBuf.writeUInt16LE(zippedData.length);
    return Buffer.concat([sizeBuf, zippedData, padding]);
};

/**
 * @type {Table3FieldStrategy}
 */
let M24Table3Strategy = {};
M24Table3Strategy.getInitialUnformattedValue = FranchiseTable3FieldStrategy$1.getInitialUnformattedValue;
M24Table3Strategy.getFormattedValueFromUnformatted = FranchiseTable3FieldStrategy$1.getFormattedValueFromUnformatted;
M24Table3Strategy.setUnformattedValueFromFormatted = FranchiseTable3FieldStrategy$1.setUnformattedValueFromFormatted;

const name$6 = 'M19Strategy';
var M19Strategy = {
    name: name$6,
    file: M19FileStrategy,
    table: M19TableStrategy,
    table2Field: M19Table2Strategy,
    table3Field: M24Table3Strategy
};

/**
 * @type {FileStrategy}
 */
let M20FileStrategy = {};
M20FileStrategy.postPackFile = FranchiseFileStrategy.postPackFile;
M20FileStrategy.generateUnpackedContents = FranchiseFileStrategy.generateUnpackedContents;

let M20TableHeaderStrategy = {};
M20TableHeaderStrategy.parseHeader = (data) => {
    const headerStart = 0x80;
    const tableName = readTableName(data);
    const isArray = tableName.indexOf('[]') >= 0;
    const tableId = data.readUInt32BE(headerStart);
    const tablePad1 = data.readUInt32BE(headerStart + 4);
    const tableUnknown1 = data.readUInt32BE(headerStart + 8);
    const tableUnknown2 = data.readUInt32BE(headerStart + 12);
    data.readUInt32BE(headerStart + 16);
    const data1Id = readTableName(data.slice(headerStart + 20, headerStart + 24));
    const data1Type = data.readUInt32BE(headerStart + 24);
    const data1Unknown1 = data.readUInt32BE(headerStart + 28);
    const data1Flag1 = data[headerStart + 32];
    const data1Flag2 = data[headerStart + 33];
    const data1Flag3 = data[headerStart + 34];
    const data1Flag4 = data[headerStart + 35];
    const tableStoreLength = data.readUInt32BE(headerStart + 36);
    let headerOffset = headerStart + 40;
    let records1SizeOffset = 1720;
    let tableStoreName = null;
    if (tableStoreLength > 0) {
        headerOffset += tableStoreLength;
        records1SizeOffset += tableStoreLength * 8;
        tableStoreName = readTableName(data.slice(headerStart + 40, headerStart + 40 + tableStoreLength));
    }
    const data1Offset = data.readUInt32BE(headerOffset);
    const data1TableId = data.readUInt32BE(headerOffset + 4);
    const data1RecordCount = data.readUInt32BE(headerOffset + 8);
    const data1Pad2 = data.readUInt32BE(headerOffset + 12);
    const table1Length = data.readUInt32BE(headerOffset + 16);
    const table2Length = data.readUInt32BE(headerOffset + 20);
    const data1Pad3 = data.readUInt32BE(headerOffset + 24);
    const data1Pad4 = data.readUInt32BE(headerOffset + 28);
    const data2Id = readTableName(data.slice(headerOffset + 32, headerOffset + 36));
    const table1Length2 = data.readUInt32BE(headerOffset + 36);
    const tableTotalLength = data.readUInt32BE(headerOffset + 40);
    const data2RecordWords = data.readUInt32BE(headerOffset + 44);
    const data2RecordCapacity = data.readUInt32BE(headerOffset + 48);
    const data2IndexEntries = data.readUInt32BE(headerOffset + 52);
    data.readUInt32BE(headerOffset + 56);
    const nextRecordToUse = data.readUInt32BE(headerOffset + 60);
    let offsetStart = 0xE8 + tableStoreLength;
    const hasSecondTable = tableTotalLength > table1Length;
    let headerSize = offsetStart;
    let records1Size = data2RecordWords * 4;
    let table1StartIndex, table2StartIndex;
    if (!isArray) {
        headerSize = headerSize + (data2IndexEntries * 4);
        table1StartIndex = headerSize;
        table2StartIndex = headerSize + (data1RecordCount * records1Size);
    }
    else {
        table1StartIndex = headerSize + (data1RecordCount * 4);
        table2StartIndex = table1StartIndex + (data1RecordCount * records1Size);
    }
    return {
        'name': tableName,
        'isArray': isArray,
        'tableId': tableId,
        'tablePad1': tablePad1,
        'uniqueId': tablePad1,
        'tableUnknown1': tableUnknown1,
        'tableUnknown2': tableUnknown2,
        'data1Id': data1Id,
        'data1Type': data1Type,
        'data1Unknown1': data1Unknown1,
        'data1Flag1': data1Flag1,
        'data1Flag2': data1Flag2,
        'data1Flag3': data1Flag3,
        'data1Flag4': data1Flag4,
        'tableStoreLength': tableStoreLength,
        'tableStoreName': tableStoreName,
        'data1Offset': data1Offset,
        'data1TableId': data1TableId,
        'data1RecordCount': data1RecordCount,
        'data1Pad2': data1Pad2,
        'table1Length': table1Length,
        'table2Length': table2Length,
        'data1Pad3': data1Pad3,
        'data1Pad4': data1Pad4,
        'headerSize': headerSize,
        'headerOffset': 0xE8,
        'record1SizeOffset': records1SizeOffset,
        'record1SizeLength': 10,
        'record1Size': records1Size,
        'offsetStart': offsetStart,
        'data2Id': data2Id,
        'table1Length2': table1Length2,
        'tableTotalLength': tableTotalLength,
        'hasSecondTable': hasSecondTable,
        'table1StartIndex': table1StartIndex,
        'table2StartIndex': table2StartIndex,
        'recordWords': data2RecordWords,
        'recordCapacity': data2RecordCapacity,
        'numMembers': data2IndexEntries,
        'nextRecordToUse': nextRecordToUse,
        'hasThirdTable': false
    };
};
M20TableHeaderStrategy.parseHeaderAttributesFromSchema = (schema, data, header) => {
    // headerSize = header.headerOffset + (schema.numMembers * 4) + header.tableStoreLength;
    // const binaryData = utilService.getBitArray(data.slice(0, headerSize));
    // let records1SizeNew = utilService.bin2dec(binaryData.slice(header.record1SizeOffset, header.record1SizeOffset + header.record1SizeLength));
    return {
        'headerSize': header.headerSize,
        'record1Size': header.record1Size,
        'table1StartIndex': header.table1StartIndex,
        'table2StartIndex': header.table2StartIndex
    };
};
function readTableName(data) {
    let name = '';
    let i = 0;
    do {
        name += String.fromCharCode(data[i]);
        i += 1;
    } while (i < data.length && data[i] !== 0);
    return name;
}

/**
 * @type {TableStrategy}
 */
let M20TableStrategy = {};
M20TableStrategy.parseHeader = M20TableHeaderStrategy.parseHeader;
M20TableStrategy.parseHeaderAttributesFromSchema = M20TableHeaderStrategy.parseHeaderAttributesFromSchema;
M20TableStrategy.getTable2BinaryData = FranchiseTableStrategy.getTable2BinaryData;
M20TableStrategy.getTable3BinaryData = FranchiseTableStrategy.getTable2BinaryData;
M20TableStrategy.getMandatoryOffsets = FranchiseTableStrategy.getMandatoryOffsets;
M20TableStrategy.recalculateStringOffsets = FranchiseTableStrategy.recalculateStringOffsets;
M20TableStrategy.recalculateBlobOffsets = FranchiseTableStrategy.recalculateBlobOffsets;

/**
 * @type {Table2FieldStrategy}
 */
let M20Table2Strategy = {};
M20Table2Strategy.getInitialUnformattedValue = FranchiseTable2FieldStrategy.getInitialUnformattedValue;
M20Table2Strategy.setUnformattedValueFromFormatted = FranchiseTable2FieldStrategy.setUnformattedValueFromFormatted;

const name$5 = 'M20Strategy';
var M20Strategy = {
    name: name$5,
    file: M20FileStrategy,
    table: M20TableStrategy,
    table2Field: M20Table2Strategy,
    table3Field: M24Table3Strategy
};

let M24TableHeaderStrategy = {};
M24TableHeaderStrategy.parseHeader = (data) => {
    let header = M20TableHeaderStrategy.parseHeader(data);
    header.table3Length = header.data1Pad3;
    header.hasThirdTable = header.table3Length > 0;
    header.table3StartIndex = header.table2StartIndex + header.table2Length;
    return header;
};

/**
 * @type {TableStrategy}
 */
let M24TableStrategy = {};
M24TableStrategy.parseHeader = M24TableHeaderStrategy.parseHeader;
M24TableStrategy.parseHeaderAttributesFromSchema = M20TableHeaderStrategy.parseHeaderAttributesFromSchema;
M24TableStrategy.getTable2BinaryData = FranchiseTableStrategy.getTable2BinaryData;
M24TableStrategy.getTable3BinaryData = FranchiseTableStrategy.getTable2BinaryData;
M24TableStrategy.getMandatoryOffsets = FranchiseTableStrategy.getMandatoryOffsets;
M24TableStrategy.recalculateStringOffsets = FranchiseTableStrategy.recalculateStringOffsets;
M24TableStrategy.recalculateBlobOffsets = FranchiseTableStrategy.recalculateBlobOffsets;

const name$4 = 'M24Strategy';
var M24Strategy = {
    name: name$4,
    file: M20FileStrategy,
    table: M24TableStrategy,
    table2Field: M20Table2Strategy,
    table3Field: M24Table3Strategy
};

// Required modules

const __filename$3 = url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href)));
const __dirname$3 = path.dirname(__filename$3);

/**
 * ISON processor class that handles game year specific interned string lookups
 */
class IsonProcessor {
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
      const lookupFilePath = path.join(__dirname$3, `../data/interned-strings/${this.gameYear.toString()}/lookup.json`);
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
      const lookupFilePath = path.join(__dirname$3, `../data/interned-strings/${gameYear.toString()}/lookup.json`);
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

    this.readBytes(1).readUInt8(0);

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

let FranchiseTable3FieldStrategy = {};
// Create a single IsonProcessor instance for M25 and reuse it for better performance
const isonProcessor$1 = new IsonProcessor(25);

FranchiseTable3FieldStrategy.getZlibDataStartIndex = (unformattedValue) => {
    return unformattedValue.indexOf(Buffer.from([0x1F, 0x8B]));
};

FranchiseTable3FieldStrategy.getInitialUnformattedValue = (field, data) => {
    return data.slice(field.thirdTableField.index, (field.thirdTableField.index + field.offset.maxLength + 2));
    // extend maxLength + 2 because the first 2 bytes are the size of the zipped data
};

FranchiseTable3FieldStrategy.getFormattedValueFromUnformatted = (unformattedValue) => {
    // First two bytes are the size of the zipped data, so skip those and get the raw ISON buffer
    const zlibDataStartIndex = FranchiseTable3FieldStrategy.getZlibDataStartIndex(unformattedValue);
    const isonBuf = zlib.gunzipSync(unformattedValue.subarray(zlibDataStartIndex));
    // Convert the ISON buffer to a JSON object using the class instance
    const jsonObj = isonProcessor$1.isonVisualsToJson(isonBuf);
    return JSON.stringify(jsonObj);
};

FranchiseTable3FieldStrategy.setUnformattedValueFromFormatted = (formattedValue, oldUnformattedValue, maxLength) => {
    // Parse the JSON string into a JSON object
    let jsonObj = JSON.parse(formattedValue);
    // Convert the object into an ISON buffer using the class instance
    let isonBuf = isonProcessor$1.jsonVisualsToIson(jsonObj);
    let padding = Buffer.alloc(maxLength - isonBuf.length); // table3s all have the same length and are zero padded to the end.
    let sizeBuf = Buffer.alloc(2);
    sizeBuf.writeUInt16LE(isonBuf.length);
    return Buffer.concat([sizeBuf, isonBuf, padding]);
};

/**
 * @type {Table3FieldStrategy}
 */
let M25Table3Strategy = {};
M25Table3Strategy.getInitialUnformattedValue = FranchiseTable3FieldStrategy.getInitialUnformattedValue;
M25Table3Strategy.getFormattedValueFromUnformatted = FranchiseTable3FieldStrategy.getFormattedValueFromUnformatted;
M25Table3Strategy.setUnformattedValueFromFormatted = FranchiseTable3FieldStrategy.setUnformattedValueFromFormatted;

const name$3 = 'M24Strategy';
var M25Strategy = {
    name: name$3,
    file: M20FileStrategy,
    table: M24TableStrategy,
    table2Field: M20Table2Strategy,
    table3Field: M25Table3Strategy
};

const __filename$2 = url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href)));
const __dirname$2 = path.dirname(__filename$2);

let FranchiseZstdTable3FieldStrategy = {};
let dictionary = fs.readFileSync(path.join(__dirname$2, '../data/zstd-dicts/26/dict.bin'));
const zstdDecoder = new nodeZstd.Decoder(dictionary);
// Create a single IsonProcessor instance for M26 and reuse it for better performance
const isonProcessor = new IsonProcessor(26);

FranchiseZstdTable3FieldStrategy.getZstdDataStartIndex = (unformattedValue) => {
    return unformattedValue.indexOf(Buffer.from([0x28, 0xB5, 0x2F, 0xFD]));
};

FranchiseZstdTable3FieldStrategy.getInitialUnformattedValue = (field, data) => {
    return data.slice(field.thirdTableField.index, (field.thirdTableField.index + field.offset.maxLength + 2));
    // extend maxLength + 2 because the first 2 bytes are the size of the compressed data
};

FranchiseZstdTable3FieldStrategy.getFormattedValueFromUnformatted = (unformattedValue) => {
    // First two bytes are the size of the zipped data, so skip those and get the raw ISON buffer
    const zstdDataStartIndex = FranchiseZstdTable3FieldStrategy.getZstdDataStartIndex(unformattedValue);
    // Zstd decoder cannot handle extra padding bytes, so we need to get the exact number of bytes
    const length = unformattedValue.readUInt16LE(0);
    const isonBuf = zstdDecoder.decodeSync(unformattedValue.subarray(zstdDataStartIndex, zstdDataStartIndex + length));
    // Convert the ISON buffer to a JSON object using the class instance
    const jsonObj = isonProcessor.isonVisualsToJson(isonBuf);
    return JSON.stringify(jsonObj);
};

FranchiseZstdTable3FieldStrategy.setUnformattedValueFromFormatted = (formattedValue, oldUnformattedValue, maxLength) => {
    // Parse the JSON string into a JSON object
    let jsonObj = JSON.parse(formattedValue);
    // Convert the object into an ISON buffer using the class instance
    let isonBuf = isonProcessor.jsonVisualsToIson(jsonObj);
    // Create the zstd-compressed buffer (not using dictionary due to node limitations, game still reads it fine)
    const compressedBuf = zlib.zstdCompressSync(isonBuf);
    let padding = Buffer.alloc(maxLength - compressedBuf.length); // table3s all have the same length and are zero padded to the end.
    let sizeBuf = Buffer.alloc(2);
    sizeBuf.writeUInt16LE(compressedBuf.length);
    return Buffer.concat([sizeBuf, compressedBuf, padding]);
};

/**
 * @type {Table3FieldStrategy}
 */
let M26Table3Strategy = {};
M26Table3Strategy.getInitialUnformattedValue = FranchiseZstdTable3FieldStrategy.getInitialUnformattedValue;
M26Table3Strategy.getFormattedValueFromUnformatted = FranchiseZstdTable3FieldStrategy.getFormattedValueFromUnformatted;
M26Table3Strategy.setUnformattedValueFromFormatted = FranchiseZstdTable3FieldStrategy.setUnformattedValueFromFormatted;

const name$2 = 'M26Strategy';
var M26Strategy = {
    name: name$2,
    file: M20FileStrategy,
    table: M24TableStrategy,
    table2Field: M20Table2Strategy,
    table3Field: M26Table3Strategy
};

let FTCFileStrategy = {};
FTCFileStrategy.generateUnpackedContents = CommonFileStrategy.generateUnpackedContents;
FTCFileStrategy.postPackFile = (originalData, newData) => {
    return newData;
};

/**
 * @type {FileStrategy}
 */
let M19FTCFileStrategy = {};
M19FTCFileStrategy.postPackFile = FTCFileStrategy.postPackFile;
M19FTCFileStrategy.generateUnpackedContents = FTCFileStrategy.generateUnpackedContents;

let FTCTableStrategy = {};
FTCTableStrategy.getTable2BinaryData = (table2Records, fullTable2Buffer) => {
    return [CommonAlgorithms.save(table2Records, fullTable2Buffer)];
};
FTCTableStrategy.getMandatoryOffsets = (offsets) => {
    return offsets.filter((offset) => {
        return offset.valueInSecondTable;
    }).map((offset) => {
        return offset.name;
    });
};

/**
 * @type {TableStrategy}
 */
let M19FTCTableStrategy = {};
M19FTCTableStrategy.parseHeader = M19TableHeaderStrategy.parseHeader;
M19FTCTableStrategy.parseHeaderAttributesFromSchema = M19TableHeaderStrategy.parseHeaderAttributesFromSchema;
M19FTCTableStrategy.getTable2BinaryData = FTCTableStrategy.getTable2BinaryData;
M19FTCTableStrategy.getTable3BinaryData = FTCTableStrategy.getTable2BinaryData;
M19FTCTableStrategy.getMandatoryOffsets = FTCTableStrategy.getMandatoryOffsets;
M19FTCTableStrategy.recalculateStringOffsets = () => { };

let FTCTable2FieldStrategy = {};
FTCTable2FieldStrategy.getInitialUnformattedValue = (field, data) => {
    let fieldData = data.slice(field.secondTableField.index, (field.secondTableField.index + field.offset.maxLength));
    const endOfFieldIndex = fieldData.indexOf(0x00);
    if (endOfFieldIndex >= 0) {
        // if there's a match, break the string early, making sure to include the 0s from the '00'.
        // All table2 fields include the trailing 0x00.
        fieldData = fieldData.slice(0, endOfFieldIndex + 1);
    }
    return fieldData;
};
FTCTable2FieldStrategy.setUnformattedValueFromFormatted = (formattedValue, maxLength) => {
    if (formattedValue.length >= maxLength) {
        // FTC strings cannot equal max length because the last character must be the null character.
        formattedValue = formattedValue.substring(0, maxLength - 1);
    }
    return Buffer.from(formattedValue + '\u0000');
};

/**
 * @type {Table2FieldStrategy}
 */
let M19FTCTable2FieldStrategy = {};
M19FTCTable2FieldStrategy.getInitialUnformattedValue = FTCTable2FieldStrategy.getInitialUnformattedValue;
M19FTCTable2FieldStrategy.setUnformattedValueFromFormatted = FTCTable2FieldStrategy.setUnformattedValueFromFormatted;

const name$1 = 'M19FTCStrategy';
var M19FTCStrategy = {
    name: name$1,
    file: M19FTCFileStrategy,
    table: M19FTCTableStrategy,
    table2Field: M19FTCTable2FieldStrategy,
    table3Field: M24Table3Strategy
};

/**
 * @type {FileStrategy}
 */
let M20FTCFileStrategy = {};
M20FTCFileStrategy.postPackFile = FTCFileStrategy.postPackFile;
M20FTCFileStrategy.generateUnpackedContents = FTCFileStrategy.generateUnpackedContents;

/**
 * @type {TableStrategy}
 */
let M20FTCTableStrategy = {};
M20FTCTableStrategy.parseHeader = M24TableHeaderStrategy.parseHeader;
M20FTCTableStrategy.parseHeaderAttributesFromSchema = M20TableHeaderStrategy.parseHeaderAttributesFromSchema;
M20FTCTableStrategy.getTable2BinaryData = FTCTableStrategy.getTable2BinaryData;
M20FTCTableStrategy.getTable3BinaryData = FTCTableStrategy.getTable2BinaryData;
M20FTCTableStrategy.getMandatoryOffsets = FTCTableStrategy.getMandatoryOffsets;
M20FTCTableStrategy.recalculateStringOffsets = () => { };

/**
 * @type {Table2FieldStrategy}
 */
let M20FTCTable2FieldStrategy = {};
M20FTCTable2FieldStrategy.getInitialUnformattedValue = FTCTable2FieldStrategy.getInitialUnformattedValue;
M20FTCTable2FieldStrategy.setUnformattedValueFromFormatted = FTCTable2FieldStrategy.setUnformattedValueFromFormatted;

const name = 'M20FTCStrategy';
var M20FTCStrategy = {
    name,
    file: M20FTCFileStrategy,
    table: M20FTCTableStrategy,
    table2Field: M20FTCTable2FieldStrategy,
    table3Field: M24Table3Strategy
};

let StrategyPicker = {};
/**
 * @returns GameStrategy
 */
StrategyPicker.pick = (type) => {
    if (type.format === Constants.FORMAT.FRANCHISE) {
        switch (type.year) {
            case 19:
                return M19Strategy;
            case 20:
            case 21:
            case 22:
            case 23:
            default:
                return M20Strategy;
            case 24:
                return M24Strategy;
            case 25:
                return M25Strategy;
            case 26:
                return M26Strategy;
        }
    }
    else {
        switch (type.year) {
            case 19:
                return M19FTCStrategy;
            case 20:
            case 21:
            default:
                return M20FTCStrategy;
        }
    }
};

const __filename$1 = url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href)));
const __dirname$1 = path.dirname(__filename$1);

const SCHEMA_DIRECTORY = path.join(__dirname$1, '../data/schemas');
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
    return readSchemaDirectories(dirsToRead).filter((schema) => { return schema.major !== null && schema.minor !== null; });
};
function readSchemaDirectories(dirpaths) {
    let schemaMeta = [];
    dirpaths.forEach(function (dirpath) {
        const dirs = fs.readdirSync(dirpath).filter(f => fs.statSync(path.join(dirpath, f)).isDirectory());
        const schemaMap = dirs.map((dir) => {
            return getSchemasInFolder(path.join(dirpath, dir));
        });
        schemaMeta.push(schemaMap);
        schemaMeta.push(getSchemasInFolder(dirpath));
    });
    return flatten(schemaMeta);
    function flatten(arr) {
        return arr.reduce(function (flat, toFlatten) {
            return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
        }, []);
    }
}
function getSchemasInFolder(dir) {
    const files = fs.readdirSync(dir);
    return files.map((file) => {
        let regex = /(?:(?=M)M(\d+)_(\d+)_(\d+)|(?!M)(\d+)_(\d+))/.exec(file);
        return {
            'gameYear': regex && regex[1] ? parseInt(regex[1]) : null,
            'major': regex && (regex[2] || regex[4]) ? parseInt(regex[2] || regex[4]) : null,
            'minor': regex && (regex[3] || regex[5]) ? parseInt(regex[3] || regex[5]) : null,
            'path': path.join(dir, file)
        };
    });
}
function findApplicableSchema(schemaMeta, gameYear, major, minor) {
    // check if game year exists
    if (schemaMeta) {
        const schemasToSearch = schemaMeta.filter((schema) => {
            if (gameYear) {
                return schema.gameYear == gameYear || schema.gameYear === null && schema.major !== null && schema.minor !== null;
            }
            else {
                return schema.major !== null && schema.minor !== null;
            }
        });
        // check if exact major exists
        const exactMajor = schemasToSearch.filter((schema) => { return schema.major == major; });
        if (exactMajor.length > 0) {
            return getClosestMinor(exactMajor, minor);
        }
        else {
            const majors = schemasToSearch.map((schema) => {
                return schema.major;
            });
            const closest = getClosestValue(majors, major);
            const majorMatches = schemasToSearch.filter((schema) => { return schema.major === closest; });
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
    }
    function getClosestValue(arr, goal) {
        return arr.reduce(function (prev, curr) {
            return (Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev);
        });
    }
}

const EventEmitter = events.EventEmitter;
const COMPRESSED_DATA_OFFSET = 0x52;
/**
 * @typedef {Object} AssetTable
 * @param {number} assetId
 * @param {number} reference
 */
/**
   * @typedef {Object} RecordReference
   * @param {number} tableId
   * @param {number} rowNumber
   */
class FranchiseFile extends EventEmitter {
    /**
     *
     * @param {string} filePath
     * @param {FranchiseFileSettings?} [settings]
     * @returns {Promise<FranchiseFile>}
     */
    static create(filePath, settings) {
        return new Promise((resolve, reject) => {
            const file = new FranchiseFile(filePath, settings);
            if (file.settings.autoParse) {
                file.on('ready', () => resolve(file));
                file.on('error', (err) => reject(err));
            }
            else {
                resolve(file);
            }
        });
    }
    /**
     *
     * @param {string} filePath
     * @param {FranchiseFileSettings} settings
     */
    constructor(filePath, settings) {
        super();
        /** @private @type {FranchiseFileSettings} */
        this._settings = new FranchiseFileSettings(settings);
        this.isLoaded = false;
        if (Array.isArray(filePath)) {
            /** @private @type {string} */
            this._filePath = filePath[0];
        }
        else {
            this._filePath = filePath;
        }
        /** @private @type {Buffer} */
        this._rawContents = fs.readFileSync(filePath);
        /** @private @type {FileType} */
        this._type = getFileType(this._rawContents, this._settings);
        /** @private @type {number} */
        this._gameYear = this._type.year;
        /** @private @type {SchemaMetadata} */
        this._expectedSchemaVersion = getSchemaMetadata(this.rawContents, this._type);
        if (this._type.compressed) {
            /** @type {Buffer} */
            this.packedFileContents = this._rawContents;
            /** @type {Buffer} */
            this.unpackedFileContents = unpackFile(this._rawContents, this._type);
            if (this._type.format === Constants.FORMAT.FRANCHISE_COMMON) {
                const newType = getFileType(this.unpackedFileContents, this._settings);
                this._type.year = newType.year;
                this._gameYear = this._type.year;
                this._expectedSchemaVersion = getSchemaMetadata(this.unpackedFileContents, newType);
            }
        }
        else {
            this.unpackedFileContents = this._rawContents;
        }
        if (this._settings.autoParse) {
            this.parse();
        }
    }
    /**
     * @returns {Promise<void>}
     */
    parse() {
        const that = this;
        this.strategy = StrategyPicker.pick(this.type);
        let schemaPromise = new Promise((resolve, reject) => {
            const schemaMeta = this.settings.schemaOverride
                ? this.settings.schemaOverride
                : this.expectedSchemaVersion;
            const schemaPath = this.settings.schemaOverride && this.settings.schemaOverride.path
                ? this.settings.schemaOverride.path
                : schemaPicker.pick(this._gameYear, schemaMeta.major, schemaMeta.minor, this.settings).path;
            try {
                this.schemaList = new FranchiseSchema(schemaPath, {
                    extraSchemas: this.settings.extraSchemas,
                    fileMap: this.settings.schemaFileMap,
                    useNewSchemaGeneration: this.settings.useNewSchemaGeneration
                });
                this.schemaList.on("schemas:done", () => {
                    resolve();
                });
                this.schemaList.evaluate();
            }
            catch (err) {
                reject(err);
            }
        });
        let tablePromise = new Promise((resolve, reject) => {
            const firstCheck = 0x53;
            const secondCheck = 0x50;
            const thirdCheck = 0x42;
            const fourthCheck = 0x46;
            const altFirstCheck = 0x41;
            const altSecondCheck = 0x53;
            const altThirdCheck = 0x54;
            const altFourthCheck = 0x4f;
            const alt2FirstCheck = 0x53;
            const alt2SecondCheck = 0x50;
            const alt2ThirdCheck = 0x45;
            const alt2FourthCheck = 0x58;
            const tableIndicies = [];
            for (let i = 0; i <= this.unpackedFileContents.length - 4; i += 1) {
                if ((this.unpackedFileContents[i] === firstCheck &&
                    this.unpackedFileContents[i + 1] === secondCheck &&
                    this.unpackedFileContents[i + 2] === thirdCheck &&
                    this.unpackedFileContents[i + 3] === fourthCheck) ||
                    (this.unpackedFileContents[i] === altFirstCheck &&
                        this.unpackedFileContents[i + 1] === altSecondCheck &&
                        this.unpackedFileContents[i + 2] === altThirdCheck &&
                        this.unpackedFileContents[i + 3] === altFourthCheck) ||
                    (this.unpackedFileContents[i] === alt2FirstCheck &&
                        this.unpackedFileContents[i + 1] === alt2SecondCheck &&
                        this.unpackedFileContents[i + 2] === alt2ThirdCheck &&
                        this.unpackedFileContents[i + 3] === alt2FourthCheck)) {
                    const tableStart = i - getTableStartOffsetByGameYear(this._gameYear);
                    tableIndicies.push(tableStart);
                }
            }
            /** @type {Array<FranchiseFileTable>} */
            this.tables = [];
            for (let i = 0; i < tableIndicies.length; i++) {
                const currentTable = tableIndicies[i];
                const nextTable = tableIndicies.length > i + 1
                    ? tableIndicies[i + 1]
                    : this.unpackedFileContents.length - 8; // Ignore trailing 8 bytes on last table
                const tableData = this.unpackedFileContents.slice(currentTable, nextTable);
                const newFranchiseTable = new FranchiseFileTable(tableData, currentTable, this._gameYear, this.strategy, this.settings);
                newFranchiseTable.index = i;
                this.tables.push(newFranchiseTable);
                newFranchiseTable.on("change", function () {
                    this.isChanged = true;
                    if (that.settings.saveOnChange) {
                        that.packFile();
                    }
                    that.emit("change", newFranchiseTable);
                });
            }
            resolve();
        });
        let assetTablePromise = new Promise((resolve, reject) => {
            /** @type {Array<AssetTable>} */
            this.assetTable = [];
            const assetTableOffset = this.unpackedFileContents.readUInt32BE(4);
            const assetTableEntries = this.unpackedFileContents.readUInt32BE(36);
            let currentOffset = assetTableOffset;
            for (let i = 0; i < assetTableEntries; i++) {
                const assetId = this.unpackedFileContents.readUInt32BE(currentOffset);
                const reference = this.unpackedFileContents.readUInt32BE(currentOffset + 4);
                this.assetTable.push({
                    assetId: assetId,
                    reference: reference,
                });
                currentOffset += 8;
            }
            resolve();
        });
        Promise.all([schemaPromise, tablePromise, assetTablePromise])
            .then(() => {
            that.tables.forEach((table, index) => {
                const schema = that.schemaList.getSchema(table.name);
                if (schema) {
                    table.schema = schema;
                }
            });
            that.isLoaded = true;
            that.emit("ready");
        })
            .catch((err) => {
            console.log(err);
            that.emit("error", err);
        });
    }
    /**
     *
     * @param {string} outputFilePath
     * @param {object} options
     * @returns {Promise<string>}
     */
    save(outputFilePath, options) {
        return this.packFile(outputFilePath, options);
    }
    /**
     *
     * @param {string} outputFilePath
     * @param {object} options
     * @returns {Promise<string>}
     */
    packFile(outputFilePath, options) {
        const that = this;
        this.emit("saving");
        return new Promise((resolve, reject) => {
            this.unpackedFileContents = this.strategy.file.generateUnpackedContents(this.tables, this.unpackedFileContents);
            let destination = outputFilePath ? outputFilePath : this.filePath;
            _packFile(this.unpackedFileContents, options).then((data) => {
                const dataToSave = this.strategy.file.postPackFile(this.packedFileContents, data);
                if (options && options.sync) {
                    _saveSync(destination, dataToSave);
                    postSaveActions();
                }
                else {
                    _save(destination, dataToSave, (err) => {
                        postSaveActions(err);
                    });
                }
                function postSaveActions(err) {
                    if (err) {
                        reject(err);
                        that.emit("save-error");
                    }
                    resolve("saved");
                    that.emit("saved");
                }
            });
        });
    }
    /**
     * @returns {Buffer}
     */
    get rawContents() {
        return this._rawContents;
    }
    get openedFranchiseFile() {
        return this._openedFranchiseFile;
    }
    /**
     * @returns {string}
     */
    get filePath() {
        return this._filePath;
    }
    /**
     * @returns {FranchiseSchema}
     */
    get schema() {
        return this.schemaList;
    }
    /**
     * @returns {SchemaMetadata}
     */
    get expectedSchemaVersion() {
        return this._expectedSchemaVersion;
    }
    /**
     * @returns {FranchiseFileSettings}
     */
    get settings() {
        return this._settings;
    }
    /**
     * @returns {number}
     */
    get gameYear() {
        return this._gameYear;
    }
    /**
     * @returns {FileType}
     */
    get type() {
        return this._type;
    }
    set filePath(path) {
        this._filePath = path;
    }
    set settings(settings) {
        this._settings = new FranchiseFileSettings(settings);
    }
    /**
     *
     * @param {string} name
     * @returns {FranchiseFileTable?}
     */
    getTableByName(name) {
        return this.tables.find((table) => {
            return table.name === name;
        });
    }
    /**
     *
     * @param {string} name
     * @returns {Array<FranchiseFileTable>}
     */
    getAllTablesByName(name) {
        return this.tables.filter((table) => {
            return table.name === name;
        });
    }
    /**
     *
     * @param {number} id
     * @returns {FranchiseFileTable?}
     */
    getTableById(id) {
        return this.tables.find((table) => {
            return table.header && table.header.tableId === id;
        });
    }
    /**
     *
     * @param {number} index
     * @returns {FranchiseFileTable?}
     */
    getTableByIndex(index) {
        return this.tables[index];
    }
    /**
     *
     * @param {number} id
     * @returns {FranchiseFileTable?}
     */
    getTableByUniqueId(id) {
        return this.tables.find((table) => {
            return table.header && table.header.uniqueId === id;
        });
    }
    /**
     *
     * @param {string} referenceValue
     * @returns {RecordReference}
     */
    getReferencedRecord(referenceValue) {
        const reference = utilService.getReferenceData(referenceValue);
        return this.getTableById(reference.tableId)?.records[reference.rowNumber];
    }
    /**
     *
     * @param {number} assetId
     * @returns {RecordReference?}
     */
    getReferenceFromAssetId(assetId) {
        const assetEntry = this.assetTable.find((assetEntry) => {
            return assetEntry.assetId === assetId;
        });
        if (assetEntry) {
            const referenceBinaryString = assetEntry.reference
                .toString(2)
                .padStart(32);
            return utilService.getReferenceData(referenceBinaryString);
        }
        else {
            return null;
        }
    }
    /**
     * @typedef {Object} TableRecordReference
     * @param {number} tableId
     * @param {string} name
     * @param {FranchiseFileTable} table
     */
    /**
     *
     * @param {number} tableId
     * @param {number} recordIndex
     * @returns {Array<TableRecordReference>}
     */
    getReferencesToRecord(tableId, recordIndex) {
        const referencedTable = this.getTableById(tableId);
        if (referencedTable) {
            const fullBinary = utilService.getBinaryReferenceData(tableId, recordIndex);
            const hex = utilService.bin2hex(fullBinary).padStart(8, "0");
            return this.tables
                .filter((table) => {
                if (table.schema) {
                    return (table.schema &&
                        table.schema.attributes.find((attribute) => {
                            // Generic record types can contain any table type
                            return attribute.type === referencedTable.name
                                || attribute.type === 'record';
                        }));
                }
                else if (table.isArray && referencedTable.schema) {
                    // If the referenced table has a schema, we can check its base name.
                    // Some array table names are by the base name like EnumTable[] can contain AwardTypeEnumTableEntry
                    return (table.name.slice(0, table.name.length - 2) ===
                        referencedTable.name ||
                        table.name.slice(0, table.name.length - 2) ===
                            referencedTable.schema.base);
                }
                else if (table.isArray) {
                    return (table.name.slice(0, table.name.length - 2) ===
                        referencedTable.name);
                }
            })
                .filter((table) => {
                return table.data.indexOf(hex, 0, "hex") !== -1;
            })
                .map((table) => {
                return {
                    tableId: table.header.tableId,
                    name: table.name,
                    table: table,
                };
            });
        }
    }
}
function getTableStartOffsetByGameYear(gameYear) {
    switch (gameYear) {
        case 19:
            return 0x90;
        case 20:
        case 21:
        default:
            return 0x94;
    }
}
function unpackFile(data, type) {
    let offset = 0;
    if (type.format === Constants.FORMAT.FRANCHISE) {
        offset = COMPRESSED_DATA_OFFSET;
    }
    return zlib.inflateSync(data.slice(offset));
}
function _packFile(data, options) {
    return new Promise((resolve, reject) => {
        if (options && options.sync) {
            const newData = zlib.deflateSync(data, {
                windowBits: 15,
            });
            resolve(newData);
        }
        else {
            zlib.deflate(data, {
                windowBits: 15,
            }, function (err, newData) {
                if (err)
                    reject(err);
                resolve(newData);
            });
        }
    });
}
function _save(destination, packedContents, callback) {
    fs.writeFile(destination, packedContents, callback);
}
function _saveSync(destination, packedContents) {
    fs.writeFileSync(destination, packedContents);
}
/**
 * @typedef {Object} FileType
 * @property {string} format
 * @property {number} year
 * @property {boolean} compressed
 */
/**
 *
 * @param {Buffer} data
 * @param {FranchiseFileSettings} settings
 * @returns {FileType}
 */
function getFileType(data, settings) {
    const isDataCompressed = isCompressed(data);
    const format = getFormat(data, isDataCompressed);
    const year = settings?.gameYearOverride ?? getGameYear(data, isDataCompressed, format);
    return {
        format: format,
        compressed: isDataCompressed,
        year: year,
    };
}
/**
 *
 * @param {Buffer} data
 * @returns {Boolean}
 */
function isCompressed(data) {
    const DECOMPRESSED_HEADER = Buffer.from([0x46, 0x72, 0x54, 0x6b]); // FrTk
    if (Buffer.compare(data.slice(0, 4), DECOMPRESSED_HEADER) === 0) {
        return false;
    }
    return true;
}
/**
 *
 * @param {Buffer} data
 * @param {Boolean} isCompressed
 * @returns {string}
 */
function getFormat(data, isCompressed) {
    if (isCompressed) {
        const ZLIB_HEADER = Buffer.from([0x78, 0x9c]);
        if (Buffer.compare(data.slice(0, 2), ZLIB_HEADER) === 0) {
            return "franchise-common";
        }
        else {
            return "franchise";
        }
    }
    else {
        // very simple check based on file length.
        // This assumes the common files are smaller than 9,000 KB.
        if (data.length > 0x895440) {
            return "franchise";
        }
        else {
            return "franchise-common";
        }
    }
}
/**
 *
 * @param {Buffer} data
 * @param {Boolean} isCompressed
 * @param {string} format
 * @returns {number}
 */
function getGameYear(data, isCompressed, format) {
    const schemaMax = [
        {
            year: 19,
            max: 95,
        },
        {
            year: 26,
            max: 999,
        },
    ];
    if (isCompressed) {
        // look at the max schemas per year. M19 schemas will be less than or equal to 95,
        // while M20 schemas can be anywhere from 96 to 999 because the last schema hasn't been made yet.
        // Once M21 releases, the M20 schema max will be updated with the final number.
        if (format === Constants.FORMAT.FRANCHISE_COMMON) {
            return null;
        }
        // M19 = RL12
        // M20 = M20
        // M21 = M21
        const yearIdentifier = data.slice(0x22, 0x25);
        if (yearIdentifier[0] === 0x52) {
            return 19;
        }
        else if (yearIdentifier[2] === 0x30) {
            return 20;
        }
        else if (yearIdentifier[2] === 0x31) {
            return 21;
        }
        else if (yearIdentifier[2] === 0x32) {
            return 22;
        }
        else if (yearIdentifier[2] === 0x33) {
            return 23;
        }
        else if (yearIdentifier[2] === 0x34 || yearIdentifier[2] === "d" || data[0x2A] === 0x34) {
            return 24;
        }
        else if (data[0x2A] === 0x35) {
            // M25 has year indicator in a different location
            return 25;
        }
        else if (data[0x2A] === 0x36) {
            return 26;
        }
        else {
            const schemaMajor = getCompressedSchema(data).major;
            const year = schemaMax.find((schema) => {
                return schema.max >= schemaMajor;
            }).year;
            return year;
        }
    }
    else {
        const schemaMajor = getDecompressedM20Schema(data).major;
        if (schemaMajor === 0) {
            // M19 did not include schema info in uncompressed files.
            return 19;
        }
        else {
            // M21 and M20 have very similar formats. We can tell M21 because it has a table with 'M21' in the name.
            if (data.indexOf("M21") > -1) {
                return 21;
            }
            else {
                return null;
            }
        }
    }
}
/**
 * @typedef {Object} SchemaMetadata
 * @property {string?} gameYear
 * @property {number?} major
 * @property {number?} minor
 * @property {string?} path
 */
/**
 *
 * @param {Buffer} data
 * @param {FileType} type
 * @returns {SchemaMetadata}
 */
function getSchemaMetadata(data, type) {
    let schemaMeta = {
        gameYear: type.year,
    };
    if (type.compressed) {
        if (type.format === Constants.FORMAT.FRANCHISE_COMMON) {
            // Compressed FTC files do not contain the schema information.
            // We need to get it later, after we inflate the file.
            return;
        }
        const schemaData = getCompressedSchema(data);
        schemaMeta.major = schemaData.major;
        schemaMeta.minor = schemaData.minor;
    }
    else {
        if (type.year === 19) {
            // M19 did not include schema info in uncompressed files.
            schemaMeta.major = 0;
            schemaMeta.minor = 0;
        }
        else {
            const schemaData = getDecompressedM20Schema(data);
            schemaMeta.major = schemaData.major;
            schemaMeta.minor = schemaData.minor;
        }
    }
    return schemaMeta;
}
/**
 * @typedef PartialSchemaMetadata
 * @property {number} major
 * @property {number} minor
 */
/**
 *
 * @param {Buffer} data
 * @returns {PartialSchemaMetadata}
 */
function getCompressedSchema(data) {
    return {
        major: data.readUInt32LE(0x3e),
        minor: data.readUInt32LE(0x42),
    };
}
function getDecompressedM20Schema(data) {
    return {
        major: data.readUInt32BE(0x2c),
        minor: data.readUInt32BE(0x28),
    };
}

const create = FranchiseFile.create;

exports.FranchiseEnum = FranchiseEnum;
exports.FranchiseEnumValue = FranchiseEnumValue;
exports.FranchiseFile = FranchiseFile;
exports.FranchiseFileField = FranchiseFileField;
exports.FranchiseFileRecord = FranchiseFileRecord;
exports.FranchiseFileSettings = FranchiseFileSettings;
exports.FranchiseFileTable = FranchiseFileTable;
exports.FranchiseFileTable2Field = FranchiseFileTable2Field;
exports.FranchiseFileTable3Field = FranchiseFileTable3Field;
exports.FranchiseSchema = FranchiseSchema;
exports.IsonProcessor = IsonProcessor;
exports.create = create;
exports.default = FranchiseFile;
exports.generateSchemaV2 = generateSchemaV2;
exports.readChviRecord = readChviRecord;
exports.schemaGenerator = schemaGenerator;
exports.schemaPicker = schemaPicker;
exports.utilService = utilService;
//# sourceMappingURL=index.cjs.map

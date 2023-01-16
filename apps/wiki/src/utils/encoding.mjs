import {align4} from './memory-utils.js';

const ADDENDUM_TYPES = (() => {
  let iota = 0;
  const result = new Map();
  result.set(Uint8Array, ++iota);
  result.set(Uint16Array, ++iota);
  result.set(Uint32Array, ++iota);
  result.set(Int8Array, ++iota);
  result.set(Int16Array, ++iota);
  result.set(Int32Array, ++iota);
  result.set(Float32Array, ++iota);
  result.set(Float64Array, ++iota);
  result.set(ArrayBuffer, ++iota);
  return result;
})();
const ADDENDUM_CONSTRUCTORS = (() => {
  const _construct = constructor =>
    (buffer, offset, byteLength) =>
      new constructor(buffer, offset, byteLength / constructor.BYTES_PER_ELEMENT)
  return [
    null, // start at 1
    _construct(Uint8Array),
    _construct(Uint16Array),
    _construct(Uint32Array),
    _construct(Int8Array),
    _construct(Int16Array),
    _construct(Int32Array),
    _construct(Float32Array),
    _construct(Float64Array),
    (buffer, offset, byteLength) => buffer.slice(offset, offset + byteLength), // ArrayBuffer
  ];
})();
const ADDENDUM_SERIALIZERS = (() => {
  const _serializedTypedArray = (typedArray, uint8Array, index) => {
    uint8Array.set(new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength), index);
  };
  _serializedTypedArray.getSize = typedArray => typedArray.byteLength;
  const _serializeArrayBuffer = (arrayBuffer, uint8Array, index) => {
    uint8Array.set(new Uint8Array(arrayBuffer), index);
  };
  _serializeArrayBuffer.getSize = arrayBuffer => arrayBuffer.byteLength;
  return [
    null, // start at 1
    _serializedTypedArray, // Uint8Array
    _serializedTypedArray, // Uint16Array
    _serializedTypedArray, // Uint32Array
    _serializedTypedArray, // Int8Array
    _serializedTypedArray, // Int16Array
    _serializedTypedArray, // Int32Array
    _serializedTypedArray, // Float32Array
    _serializedTypedArray, // Float64Array
    _serializeArrayBuffer, // ArrayBuffer
  ];
})();

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
let textUint8Array = new Uint8Array(4 * 1024 * 1024); // 4 MB

const encodableConstructors = [
  Uint8Array,
  Uint16Array,
  Uint32Array,
  Int8Array,
  Int16Array,
  Int32Array,
  Float32Array,
  Float64Array,
  ArrayBuffer,
];
const _isAddendumEncodable = o =>
  encodableConstructors.includes(
    o?.constructor
  );
const nullUint8Array = textEncoder.encode('null');
function zbencode(o) {
  const addendums = [];
  const addendumIndexes = [];
  const addendumTypes = [];
  const _getSb = () => {
    if (_isAddendumEncodable(o)) { // common fast path
      addendums.push(o);
      addendumIndexes.push(1);
      addendumTypes.push(ADDENDUM_TYPES.get(o.constructor));
      return nullUint8Array;
    } else {
      let recursionIndex = 0;
      const _recurseExtractAddendums = o => {
        recursionIndex++;
        if (_isAddendumEncodable(o)) {
          addendums.push(o);
          addendumIndexes.push(recursionIndex);
          const addendumType = ADDENDUM_TYPES.get(o.constructor);
          addendumTypes.push(addendumType)
          return null;
        } else {
          return o;
        }
      };
      const s = JSON.stringify(o, function(k, v) {
        return _recurseExtractAddendums(v);
      });
      let result;
      for (;;) {
        result = textEncoder.encodeInto(s, textUint8Array);
        if (result.read === s.length) {
          break;
        } else {
          textUint8Array = new Uint8Array(textUint8Array.length * 2);
          console.warn('zjs: resizing buffer');
        }
      }
      return textUint8Array.subarray(0, result.written);
    }
  };
  const sb = _getSb();
    
  let totalSize = 0;
  totalSize += Uint32Array.BYTES_PER_ELEMENT; // length
  totalSize += sb.byteLength; // data
  totalSize = align4(totalSize);
  totalSize += Uint32Array.BYTES_PER_ELEMENT; // count
  for (let i = 0; i < addendums.length; i++) {
    const addendum = addendums[i];
    
    totalSize += Uint32Array.BYTES_PER_ELEMENT; // index
    totalSize += Uint32Array.BYTES_PER_ELEMENT; // type
    totalSize += Uint32Array.BYTES_PER_ELEMENT; // length
    
    // totalSize += addendum.byteLength; // data
    const addendumType = addendumTypes[i];
    const Serializer = ADDENDUM_SERIALIZERS[addendumType];
    const addendumByteLength = Serializer.getSize(addendum);
    totalSize += align4(addendumByteLength);
  }
  
  const ab = new ArrayBuffer(totalSize);
  const uint8Array = new Uint8Array(ab);
  const dataView = new DataView(ab);
  {
    let index = 0;
    // sb
    {
      dataView.setUint32(index, sb.byteLength, true);
      index += Uint32Array.BYTES_PER_ELEMENT;
      
      uint8Array.set(sb, index);
      index += sb.byteLength;
      index = align4(index);
    }
    // addendums
    dataView.setUint32(index, addendums.length, true);
    index += Uint32Array.BYTES_PER_ELEMENT;
    for (let i = 0; i < addendums.length; i++) {
      const addendum = addendums[i];
      const addendumIndex = addendumIndexes[i];
      const addendumType = addendumTypes[i];
      
      dataView.setUint32(index, addendumIndex, true);
      index += Uint32Array.BYTES_PER_ELEMENT;
      
      dataView.setUint32(index, addendumType, true);
      index += Uint32Array.BYTES_PER_ELEMENT;
      
      const Serializer = ADDENDUM_SERIALIZERS[addendumType];
      const addendumByteLength = Serializer.getSize(addendum);

      dataView.setUint32(index, addendumByteLength, true);
      index += Uint32Array.BYTES_PER_ELEMENT;

      Serializer(addendum, uint8Array, index);
      index += align4(addendumByteLength);
    }
  }
  return uint8Array;
}
function zbdecode(uint8Array) {
  const dataView = new DataView(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength);
  
  let index = 0;
  const sbLength = dataView.getUint32(index, true);
  index += Uint32Array.BYTES_PER_ELEMENT;
  
  const sb = new Uint8Array(uint8Array.buffer, uint8Array.byteOffset + index, sbLength);
  index += sbLength;
  index = align4(index);
  const s = textDecoder.decode(sb);
  let j = JSON.parse(s);
  
  const numAddendums = dataView.getUint32(index, true);
  index += Uint32Array.BYTES_PER_ELEMENT;
  
  const addendums = Array(numAddendums);
  const addendumIndexes = Array(numAddendums);
  const addendumTypes = Array(numAddendums);
  for (let i = 0; i < numAddendums; i++) {
    const addendumIndex = dataView.getUint32(index, true);
    index += Uint32Array.BYTES_PER_ELEMENT;
    
    const addendumType = dataView.getUint32(index, true);
    index += Uint32Array.BYTES_PER_ELEMENT;
    
    const addendumByteLength = dataView.getUint32(index, true);
    index += Uint32Array.BYTES_PER_ELEMENT;
    
    const TypedArrayCons = ADDENDUM_CONSTRUCTORS[addendumType];
    /* if (!TypedArrayCons) {
      console.warn('failed to find typed array cons for', addendumType);
    } */
    const addendum = TypedArrayCons(
      uint8Array.buffer,
      uint8Array.byteOffset + index,
      addendumByteLength
    );
    index += addendumByteLength;
    index = align4(index);
    
    addendums[i] = addendum;
    addendumIndexes[i] = addendumIndex;
    addendumTypes[i] = addendumType;
  }
  
  {
    let recursionIndex = 0;
    let currentAddendum = 0;
    const _recurseBindAddendums = o => {
      recursionIndex++;
      
      const addendumIndex = addendumIndexes[currentAddendum];
      if (addendumIndex === recursionIndex) {
        const addendum = addendums[currentAddendum];
        currentAddendum++;
        return addendum;
      } else if (Array.isArray(o)) {
        for (let i = 0; i < o.length; i++) {
          const addendum = _recurseBindAddendums(o[i]);
          if (addendum) {
            o[i] = addendum;
          }
        }
      } else if (typeof o === 'object' && o !== null) {
        for (const k in o) {
          const addendum = _recurseBindAddendums(o[k]);
          if (addendum) {
            o[k] = addendum;
          }
        }
      }
      return null;
    };
    const j2 = _recurseBindAddendums(j);
    if (j2 !== null) {
      j = j2;
    }
    if (currentAddendum !== addendums.length) {
      console.warn('did not bind all addendums', j, currentAddendum, addendums);
      debugger;
    }
    return j;
  }
}

function zbclone(o) {
  return zbdecode(zbencode(o));
}

export {
  zbencode,
  zbdecode,
  zbclone,
};
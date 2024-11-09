export function Enum(values) {
  if (!Array.isArray(values)) {
    throw new Error('Values must be array');
  }
  
  for (let i = 0; i < values.length; i++) {
    if (typeof values[i] != 'string') {
      throw new Error(`values[${i}] not string`);
    }
  }
  
  let valuesSet = new Set();
  
  for (let value of values) {
    if (valuesSet.has(value)) {
      throw new Error(`values[${i}] ("${value}") is duplicate`);
    } else {
      valuesSet.add(value);
    }
  }
  
  return new Proxy(
    Object.freeze(
      Object.assign(
        Object.create(null),
        Object.fromEntries(values.map(x => [x, x]))
      )
    ),
    
    {
      get: (_, key) => {
        if (valuesSet.has(key)) {
          return key;
        } else {
          throw new Error(`Key ${key} not in enum`);
        }
      },
      
      set: () => {
        throw new Error('Enums are immutable');
      },
      
      deleteProperty: () => {
        throw new Error('Enums are immutable');
      },
    }
  );
}

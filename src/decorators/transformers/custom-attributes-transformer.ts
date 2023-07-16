import { Transform } from 'class-transformer';
import { KeyValue } from '../../global/query/key-value';

/**
 * Expects a string of format key=value,key=value...<br>
 * IMPORTANT - Splits on the first = for every key=value pair
 */
export function TransformCustomAttributes() {
  return Transform(({ value }) => {
    try {
      if (typeof value === 'string') {
        return value.split(',').map((item) => {
          const delimiterPosition = item.indexOf('=');
          const items = [
            item.substring(0, delimiterPosition),
            item.substring(delimiterPosition + 1),
          ];
          if (items[0].length === 0 || items[1].length === 0) {
            throw new Error();
          }
          const keyValue = new KeyValue();
          keyValue.key = items[0];
          keyValue.value = items[1];
          return keyValue;
        });
      }
    } catch (e) {
      return value;
    }
    return value;
  });
}

/**
 * Takes only first level key-value pairs from input object, where value is a string or number.<br>
 * Converts numbers to string.<br>
 * Empty string keys are omitted
 *
 * Returns the original value on parsing failure
 */
export function TransformCustomAttributesObject() {
  return Transform(({ value: obj }) => {
    const attributes: Record<string, string> = {};

    try {
      Object.entries(obj).forEach(([key, value]) => {
        switch (typeof value) {
          case 'string':
          case 'number':
          case 'boolean': {
            if (key !== '') {
              attributes[key] = String(value);
            }
          }
        }
      });
      return attributes;
    } catch (e) {
      return obj;
    }
  });
}

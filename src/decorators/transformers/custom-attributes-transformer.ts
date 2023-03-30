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

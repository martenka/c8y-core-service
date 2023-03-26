import { Transform } from 'class-transformer';
import { Types } from 'mongoose';
import { isEmpty } from '@nestjs/common/utils/shared.utils';

/**
 * Converts stringified ObjectIds / MongoIds to Types.ObjectId. If delimiter is given then tries to return an array.
 *
 * Returns the original value if parsing fails.
 * @param delimiter The delimiter to use if an array of IDs is given as a string
 */
export function TransformMongoId(delimiter?: string) {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    try {
      if (delimiter) {
        const valueArray = value
          .split(delimiter)
          .map((item) => new Types.ObjectId(item));

        return !isEmpty(valueArray) ? valueArray : value;
      } else {
        return new Types.ObjectId(value);
      }
    } catch (e) {
      return value;
    }
  });
}

import { Transform } from 'class-transformer';
import { Types } from 'mongoose';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { isPresent } from '../../utils/validation';

/**
 * Converts stringified ObjectIds / MongoIds to Types.ObjectId.
 * If delimiter is given then returns parsed Types.ObjectId array
 *
 * Works with both strings and string arrays.
 *
 *  Returns the original value if parsing fails.
 * @param delimiter The delimiter to use if an array of IDs is given as a string
 */
export function TransformMongoId(delimiter?: string) {
  return Transform(({ value }) => {
    try {
      if (delimiter) {
        const valueArray = value
          .split(delimiter)
          .map((item) => new Types.ObjectId(item));

        return !isEmpty(valueArray) ? valueArray : value;
      } else {
        if (Array.isArray(value)) {
          return value
            .map((item) => {
              if (isPresent(item) && item !== '') {
                return new Types.ObjectId(item);
              }
            })
            .filter(isPresent);
        }
        return new Types.ObjectId(value);
      }
    } catch (e) {
      return value;
    }
  });
}

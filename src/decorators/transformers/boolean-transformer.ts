import { Transform } from 'class-transformer';
import { convertBooleanOrOriginal } from '../../utils/helpers';

/**
 *
 * Transforms input string to boolean or returns original on parsing failure.
 * Input must be __true__ or __false__ ignoring case in string form
 */
export function TransformBoolean() {
  return Transform(({ value }) => {
    return convertBooleanOrOriginal(value);
  });
}

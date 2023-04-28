import { Transform } from 'class-transformer';

/**
 * Tries to transform input into lowercase
 * @return Lowercase input or original on failure
 */
export function TransformToLowercase() {
  return Transform(({ value }) => {
    try {
      return value.toLowerCase();
    } catch (e) {
      return value;
    }
  });
}

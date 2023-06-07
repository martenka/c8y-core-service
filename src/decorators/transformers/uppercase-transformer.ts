import { Transform } from 'class-transformer';

/**
 * Tries to transform input into lowercase
 * @return Lowercase input or original on failure
 */
export function TransformToUppercase() {
  return Transform(({ value }) => {
    try {
      return value.toUpperCase();
    } catch (e) {
      return value;
    }
  });
}

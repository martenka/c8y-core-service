import { Types } from 'mongoose';
import { isPresent, notPresent } from './validation';
import { BSONTypeError, ObjectIdLike } from 'bson';
import { isArray } from 'class-validator';
import { Buffer } from 'buffer';
import { KeyValue } from '../global/query/key-value';

export type ParsedPromisesResult<T> = { fulfilled: T[]; rejected: unknown[] };

export function removeNilProperties<T extends object>(value: T): Partial<T> {
  return pickBy(value, (element) => isPresent(element));
}

export function remapIDAndRemoveNil<T extends { id?: string }>(
  value: T,
  newID?: Types.ObjectId,
) {
  const mappedObj: Partial<T> = { ...value };

  if (isPresent(value.id)) {
    mappedObj['_id'] = newID ?? idToObjectIDOrOriginal(value.id);
  }

  const { id: _, ...result } = removeNilProperties(mappedObj);
  return result;
}
type TestType =
  | string
  | number
  | Types.ObjectId
  | ObjectIdLike
  | Buffer
  | Uint8Array;

export function idToObjectIDOrUndefined<T extends TestType | TestType[]>(
  id: T,
): T extends TestType[]
  ? Types.ObjectId[] | undefined
  : Types.ObjectId | undefined;
export function idToObjectIDOrUndefined(
  id: TestType | TestType[],
): Types.ObjectId[] | Types.ObjectId | undefined {
  if (notPresent(id)) {
    return undefined;
  }
  try {
    if (isArray(id)) {
      return id.filter(isPresent).map((value) => new Types.ObjectId(value));
    }
    return new Types.ObjectId(id);
  } catch (e) {
    if (e instanceof BSONTypeError) {
      return undefined;
    }
    throw e;
  }
}

export function idToObjectIDOrOriginal<T extends TestType>(
  id: T | undefined | null,
) {
  if (notPresent(id)) {
    return id;
  }
  try {
    if (isArray(id)) {
      return id.map((value) => {
        return isPresent(value) ? new Types.ObjectId(value) : value;
      });
    }
    return new Types.ObjectId(id);
  } catch (e) {
    if (e instanceof BSONTypeError) {
      return id;
    }
    throw e;
  }
}

export function pickBy<T extends object>(
  pickFrom: T,
  keyfn: <K extends keyof T>(value: T[K], key: K) => boolean,
): Partial<T> {
  const obj: Partial<T> = {};

  for (const key in pickFrom) {
    if (keyfn(pickFrom[key], key)) {
      obj[key] = pickFrom[key];
    }
  }

  return obj;
}

export async function awaitAllPromises<T>(
  promises: Promise<T>[],
): Promise<ParsedPromisesResult<T>> {
  const settled = await Promise.allSettled(promises.filter(isPresent));
  const result: ParsedPromisesResult<T> = {
    fulfilled: [],
    rejected: [],
  };

  settled.forEach((item) => {
    if (item.status === 'fulfilled') {
      result.fulfilled.push(item.value);
    } else {
      result.rejected.push(item.reason);
    }
  });

  return result;
}

export function getCustomAttributesQuery(
  name: string,
  values: KeyValue[] = [],
) {
  const query = {};

  values.forEach(
    (keyValue) => (query[`${name}.${keyValue.key}`] = keyValue.value),
  );

  return query;
}

export function remapKeyValueCustomAttributes<
  T extends { customAttributes?: KeyValue[] },
>(query: T) {
  const customAttributesQuery = getCustomAttributesQuery(
    'customAttributes',
    query.customAttributes,
  );
  const { customAttributes: _, ...rest } = query;
  return { customAttributesQuery, ...rest };
}

export function convertBooleanOrOriginal(value: unknown): boolean | unknown {
  if (typeof value === 'string') {
    switch (value.toLowerCase()) {
      case 'true':
        return true;
      case 'false':
        return false;
    }
  }
  return value;
}

export function convertArrayToMap<T>(
  arr: T[],
  keyFn: (element: T) => string | undefined,
): Map<string, T> {
  const resultMap = new Map<string, T>();

  for (const element of arr) {
    const key = keyFn(element);
    if (notPresent(key)) {
      continue;
    }
    resultMap.set(key, element);
  }

  return resultMap;
}

/**
 * Omits the specified keys from object at runtime.<br>
 * ONLY works with string keys

 */
export function omit<T extends object, K extends (keyof T)[]>(
  value: T,
  ...keys: K
): Omit<T, K[number]> {
  const result = {} as Omit<T, K[number]>;
  const keySet = new Set(keys);

  Object.keys(value).forEach((key) => {
    if (!keySet.has(key as keyof T)) {
      result[key] = value[key];
    }
  });

  return result;
}

export function pick<T extends object, K extends (keyof T)[]>(
  value: T,
  ...keys: K
): Pick<T, K[number]> {
  const result = {} as Pick<T, K[number]>;
  const keySet = new Set(keys);

  Object.keys(value).forEach((key) => {
    if (keySet.has(key as keyof T)) {
      result[key] = value[key];
    }
  });

  return result;
}

export function nullToUndefined<T>(value: T): NonNullable<T> | undefined {
  if (value === null) {
    return undefined;
  }
  return value;
}

/**
 * Parses the date from input into date or return current date on failure
 */
export function parseDateOrNow(inputDate: string | undefined): Date {
  if (notPresent(inputDate)) {
    return new Date();
  }
  const date = new Date(inputDate);
  if (date.toString() == 'Invalid Date') {
    return new Date();
  }
  return date;
}

export function exhaustiveCheck(value: never, context: string): never {
  throw new Error(
    `${context} - This shouldn't have been called, got called with ${value}`,
  );
}

export function parseNumberOrThrow(input: string): number {
  const number = parseFloat(input);
  if (!Number.isFinite(number)) {
    throw new Error(`Unable to convert ${number} to number`);
  }

  return number;
}

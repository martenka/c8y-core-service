import { Types } from 'mongoose';
import { notNil } from './validation';
import { ObjectIdLike, BSONTypeError } from 'bson';
import { isArray } from 'class-validator';
import { Buffer } from 'buffer';

export type ParsedPromisesResult<T> = { fulfilled: T[]; rejected: unknown[] };

export function remapIDAndRemoveNil<T extends { id?: string }>(
  value: T,
  newID?: Types.ObjectId,
) {
  let mappedObj: Partial<T> = { ...value };

  if (notNil(value.id)) {
    mappedObj['_id'] = newID ?? idToObjectID(value.id);
  }

  mappedObj = pickBy(mappedObj, (key) => notNil(key));

  const { id: _, ...result } = mappedObj;
  return result;
}
type TestType =
  | string
  | number
  | Types.ObjectId
  | ObjectIdLike
  | Buffer
  | Uint8Array;

export function idToObjectID<T extends TestType | TestType[]>(
  id: T,
): T extends TestType[] ? Types.ObjectId[] : Types.ObjectId;
export function idToObjectID(
  id: TestType | TestType[],
): Types.ObjectId[] | Types.ObjectId {
  try {
    if (isArray(id)) {
      return id.map((value) => new Types.ObjectId(value));
    }
    return new Types.ObjectId(id);
  } catch (e) {
    if (e instanceof BSONTypeError) {
      return undefined;
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
  const settled = await Promise.allSettled(promises);
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

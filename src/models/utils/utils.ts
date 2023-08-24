import { FilterQuery, Model, Types } from 'mongoose';
import { Base } from '../Base';
import { ensureArray, isPresent, notPresent } from '../../utils/validation';
import { BasicAttributes } from '../types/types';

export async function getDeletedIds<T extends Base = Base>(
  model: Model<T>,
  deletion: Types.ObjectId | Types.ObjectId[] | undefined | null,
): Promise<Types.ObjectId[]> {
  const itemsToDelete = ensureArray(deletion).filter(isPresent);
  const deleteCheck = await model.find(
    {
      _id: { $in: itemsToDelete },
    },
    { _id: 1 },
  );
  const existingIds = new Set(deleteCheck.map((item) => item._id));

  return itemsToDelete.filter((id) => !existingIds.has(id));
}

export function wrapFilterWithPrefixSearch<T>(
  filter: FilterQuery<T>,
): FilterQuery<T> {
  const resultFilter: FilterQuery<T> = {};

  for (const key in filter) {
    resultFilter[key as keyof FilterQuery<T>] = {
      $regex: `^${filter[key]}`,
      $options: 'i',
    };
  }

  return resultFilter;
}

/**
 * Converts _id and initiatedByUser to string on given task entity
 */
export const taskEntityConverter = (
  doc: Record<string, unknown>,
  ret: Record<string, unknown>,
) => {
  if (ret.initiatedByUser instanceof Types.ObjectId) {
    ret.initiatedByUser = ret.initiatedByUser.toString();
  }
  ret._id = ret._id?.toString();
};

/**
 *
 * Converts the given attributes suitable for Mongoose query<br>
 * Each key will be converted to form {objectName}.key<br>
 * Works only without nested attributes
 *
 * @param attributes - The attributes to convert
 * @param objectName - The object name to put as prefix to every attribute in the attributes objects
 */
export function transformAttributesToQuery(
  attributes: BasicAttributes | undefined | null,
  objectName: string,
): BasicAttributes | undefined | null {
  if (notPresent(objectName) || notPresent(attributes)) {
    return attributes;
  }

  const transformedAttributes: BasicAttributes = {};

  Object.keys(attributes).map(
    (key) => (transformedAttributes[`${objectName}.${key}`] = attributes[key]),
  );

  return transformedAttributes;
}

/**
 * Transforms given key names to MongoDB unset query in the form
 *  {objectName}.{key}
 *
 * Returns empty object if keys are not provided
 * Empty keys are ignored
 * @param keys - Keys to remove
 * @param objectName - Base object name
 */
export function transformKeysToUnsetForm(
  keys: string[] | undefined | null,
  objectName: string,
): Record<string, 1> {
  if (notPresent(objectName) || notPresent(keys)) {
    return {};
  }

  const transformedAttributes = {};

  keys.map((key) => {
    if (key !== '') {
      transformedAttributes[`${objectName}.${key}`] = 1;
    }
  });

  return transformedAttributes;
}

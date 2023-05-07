import { FilterQuery, Model, Types } from 'mongoose';
import { Base } from '../Base';
import { ensureArray, notNil } from '../../utils/validation';

export async function getDeletedIds<T extends Base = Base>(
  model: Model<T>,
  deletion: Types.ObjectId | Types.ObjectId[] | undefined | null,
): Promise<Types.ObjectId[]> {
  const itemsToDelete = ensureArray(deletion).filter(notNil);
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
  ret._id = ret._id.toString();
};

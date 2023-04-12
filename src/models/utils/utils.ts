import { Model, Types } from 'mongoose';
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

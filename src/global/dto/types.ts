import { DeleteResult } from 'mongodb';

export type IDeleteResponse = Pick<DeleteResult, 'deletedCount'>;

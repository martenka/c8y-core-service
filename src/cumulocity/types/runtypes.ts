import { Number, Record } from 'runtypes';

export const ResponseStatistics = Record({
  statistics: Record({
    currentPage: Number,
  }),
});

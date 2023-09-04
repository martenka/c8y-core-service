import { Array, Partial, Record, Static, String } from 'runtypes';
import { VisibilityStateRuntype } from '../common';

export const FileVisibilityStateMessageRuntype = Record({
  bucket: String,
  filePath: String,
  fileId: String,
  newVisibilityState: VisibilityStateRuntype,
});

export const FileDeletionMessageRuntype = Record({
  files: Array(
    Record({
      bucket: String,
      path: String,
    }),
  ),
});

const ErrorMessage = Partial({
  errorMessage: String,
});

export const VisibilityStateResultMessageRuntype = Partial({
  fileId: String,
}).And(ErrorMessage.Or(FileVisibilityStateMessageRuntype.omit('fileId')));

export type FileDeletionMessage = Static<typeof FileDeletionMessageRuntype>;
export type VisibilityStateResultMessage = Static<
  typeof VisibilityStateResultMessageRuntype
>;
export type FileVisibilityStateMessage = Static<
  typeof FileVisibilityStateMessageRuntype
>;

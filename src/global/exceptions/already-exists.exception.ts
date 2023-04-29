export class AlreadyExistsException extends Error {
  constructor(message?: string) {
    super(message);
  }
}

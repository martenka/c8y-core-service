import { CustomException } from './custom.exception';

export class AlreadyExistsException extends CustomException {
  constructor(message?: string) {
    super(message);
  }
}

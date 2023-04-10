import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class MongoIdTransformPipe implements PipeTransform {
  transform(value: string, _metadata: ArgumentMetadata): Types.ObjectId {
    try {
      return new Types.ObjectId(value);
    } catch (e) {
      throw new BadRequestException();
    }
  }
}

import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class OutputTaskDto {
  @Expose({ name: '_id' })
  id: string;

  @Expose()
  taskType: string;

  @Expose()
  name: string;

  @Expose()
  status: string;
}

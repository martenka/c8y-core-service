import { CreateGroupDto } from '../../core/groups/dto/create-group.dto';

export function getCreateGroupDtoStub(
  override?: Partial<CreateGroupDto>,
): CreateGroupDto {
  return {
    name: 'Group1',
    description: 'Group1 test description',
    owner: 'test_owner',
    customAttributes: {
      test: 'value',
    },
    sensors: [],
    groups: [],
    ...override,
  };
}

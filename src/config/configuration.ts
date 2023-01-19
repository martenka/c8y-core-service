import { isNil } from '@nestjs/common/utils/shared.utils';

export default () => ({
  CUMU_USERNAME: getOrThrow('CUMU_USERNAME'),
  CUMU_PASSWORD: getOrThrow('CUMU_PASSWORD'),
  CUMU_TENANT_ID: getOrThrow('CUMU_TENANT_ID'),
  CUMU_BASE_ADDRESS: getOrThrow('CUMU_BASE_ADDRESS'),
});

function getOrThrow(name: string) {
  console.log(process.env);
  const value = process.env[name];
  if (isNil(value)) {
    throw new Error(`${name} env variable value could not be found!`);
  }
  return value;
}

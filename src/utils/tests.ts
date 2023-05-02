import { Connection } from 'mongoose';

export function clearCollections(connection: Connection) {
  return async function () {
    const collections = connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  };
}

/**
 * Adds `fake` option to `jest.useFakeTimers` config api
 *
 * Uses solution from https://github.com/nock/nock/issues/2200
 * @param config Fake timers config options
 *
 * @return Jest instance
 */
export function fakeTime(config?: FakeTimersConfig & { fake?: FakeableAPI[] }) {
  if (config?.fake) {
    if (config.doNotFake) {
      throw new Error(
        'Passing both `fake` and `doNotFake` options to `useFakeTimers()` is not supported.',
      );
    }

    const { fake, ...options } = config;
    return jest.useFakeTimers({
      ...options,
      doNotFake: Array<FakeableAPI>(
        'Date',
        'hrtime',
        'nextTick',
        'performance',
        'queueMicrotask',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'requestIdleCallback',
        'cancelIdleCallback',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
      ).filter((api) => !fake.includes(api)),
    });
  }

  return jest.useFakeTimers(config);
}

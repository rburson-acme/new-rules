import { BootstrapHandler } from '../../src/test/bootstrap.js';
import { UserController } from '../../src/ts/persistence/controllers/UserController.js';
import { PersistenceFactory } from '../../src/ts/persistence/PersistenceFactory.js';
import { Logger } from '../../src/ts/thredlib/index.js';

export class Handler implements BootstrapHandler {

  async run(): Promise<void> {
    // create test users
    Logger.info('  > Creating test users...');
    await this.createTestUsers();
    Logger.info('  > Creating test data...');
    await this.createTestData();
  }

  async cleanup(): Promise<void> {
    Logger.info('  > Cleaning up test and demo databases...');
    await PersistenceFactory.removeDatabase({ dbname: 'test' });
    await PersistenceFactory.removeDatabase({ dbname: 'demo' });
  }

// test
private async createTestData() {
  const persistence = PersistenceFactory.getPersistence({ dbname: 'test' });
  await persistence.upsert({
    type: 'TestObject',
    values: { id: '0', participantId: 'participant0', locationId: '0' },
    matcher: { locationId: '0' },
  });
  await persistence.upsert({
    type: 'TestObject',
    values: { id: '1', participantId: 'participant1', locationId: '1' },
    matcher: { locationId: '1' },
  });
  await persistence.upsert({
    type: 'TestObject',
    values: { id: '2', participantId: 'participant2', locationId: '2' },
    matcher: { locationId: '2' },
  });
  await persistence.upsert({
    type: 'TestObject',
    values: { id: '3', participantId: 'participant3', locationId: '3' },
    matcher: { locationId: '3' },
  });
}

private async createTestUsers() {
  const uc = UserController.get();
  await uc.replaceUser({ id: 'participant0', password: 'password0' });
  await uc.replaceUser({ id: 'participant1', password: 'password1' });
  await uc.replaceUser({ id: 'participant2', password: 'password2' });
  await uc.replaceUser({ id: 'participant3', password: 'password3' });
}

}

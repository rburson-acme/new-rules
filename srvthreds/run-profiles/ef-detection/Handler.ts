import { BootstrapHandler } from '../../src/test/bootstrap.js';
import { UserController } from '../../src/ts/persistence/controllers/UserController.js';
import { PersistenceFactory } from '../../src/ts/persistence/PersistenceFactory.js';
import { Logger } from '../../src/ts/thredlib/index.js';

export class Handler implements BootstrapHandler {

  async run(): Promise<void> {
    // create test users
    Logger.info('  > Creating test users...');
    await this.createTestUsers();
  }

  async cleanup(): Promise<void> {
    Logger.info('  > Cleaning up test and demo databases...');
    await PersistenceFactory.removeDatabase({ dbname: 'test' });
    await PersistenceFactory.removeDatabase({ dbname: 'demo' });
  }


private async createTestUsers() {
  const uc = UserController.get();
  await uc.replaceUser({ id: 'participant0', password: 'password0' });
  await uc.replaceUser({ id: 'participant1', password: 'password1' });
  await uc.replaceUser({ id: 'participant2', password: 'password2' });
  await uc.replaceUser({ id: 'participant3', password: 'password3' });
}

}

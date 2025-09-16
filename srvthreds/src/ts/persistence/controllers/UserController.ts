import { Persistence } from '../Persistence.js';
import { PersistenceFactory } from '../PersistenceFactory.js';
import { Query } from '../../task/Taskable.js';
import {
  PatternModel,
  Logger,
  ThredLogRecord,
  EventRecord,
  ThredRecord,
  Persistent,
  Parallel,
} from '../../thredlib/index.js';
import { User } from '../../thredlib/persistence/User.js';
import { Types } from '../../thredlib/persistence/types.js';

export class UserController {
  private static instance: UserController;
  private persistence: Persistence;
  private constructor() {
    this.persistence = PersistenceFactory.getPersistence();
  }

  static get(): UserController {
    if (!UserController.instance) {
      UserController.instance = new UserController();
    }
    return UserController.instance;
  }

  async connect() {
    return PersistenceFactory.connect();
  }

  async disconnect() {
    return PersistenceFactory.disconnectAll();
  }

  async replaceUser(user: User): Promise<void> {
    await this.persistence.replace({ type: Types.User, matcher: { id: user.id }, values: user });
  }

  async addArchivedThredIdToUsers(userIds: string[], thredId: string): Promise<void> {
    return Parallel.forEach(userIds, async (userId) => {
      return this.addArchivedThredId(userId, thredId);
    });
  }

  async addArchivedThredId(userId: string, thredId: string): Promise<void> {
    return this.persistence.update({
      type: Types.User,
      matcher: { id: userId },
      values: { $add: { 'threds.archived': thredId } },
    });
  }

  async removeArchivedThredId(userId: string, thredId: string): Promise<void> {
    return this.persistence.update({
      type: Types.User,
      matcher: { id: userId },
      values: { $remove: { 'threds.archived': thredId } },
    });
  }

  async getUser(id: string): Promise<User | null> {
    return this.persistence.getOne({ type: Types.User, matcher: { id } });
  }

  async getUserByHandle(handle: string): Promise<User | null> {
    return this.persistence.getOne({ type: Types.User, matcher: { handle } });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.persistence.getOne({ type: Types.User, matcher: { email } });
  }

  async getUserArchivedThredIds(userId: string): Promise<User | null> {
    return this.persistence.getOne({
      type: Types.User,
      matcher: { id: userId },
      selector: { include: ['threds.archived'] },
    });
  }
}

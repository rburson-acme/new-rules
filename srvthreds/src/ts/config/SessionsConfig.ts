import { Group } from '../sessions/Group.js';
import { GroupModel, SessionsModel, StringMap } from '../thredlib/index.js';
import { Config } from './Config.js';
import { SessionsConfigDef } from './ConfigDefs.js';

export class SessionsConfig implements Config<SessionsConfigDef> {
  private _groups: StringMap<Group> = {};

  constructor(sessionsModel?: SessionsConfigDef) {
    if (sessionsModel) {
      this.setGroupModels(sessionsModel.groups);
    }
  }

  // call this to rebuild with updated config
  async updateConfig(sessionsModel: SessionsConfigDef) {
    this.setGroupModels(sessionsModel.groups);
  }

  setGroupModels(groupModels: GroupModel[]) {
    this._groups = groupModels.reduce((accum: StringMap<Group>, group) => {
      accum[group.name] = new Group(group);
      return accum;
    }, {});
  }

  get groups(): StringMap<Group> {
    return this._groups;
  }
}

import { Sessions } from '../../ts/sessions/Sessions.js';
import { SessionStorage } from '../../ts/sessions/storage/SessionStorage.js';
import { RedisStorage } from '../../ts/storage/RedisStorage.js';
import { StorageFactory } from '../../ts/storage/StorageFactory.js';
import { Address, Logger } from '../../ts/thredlib/index.js';
import { ResolverConfig } from '../../ts/sessions/Config.js';
import { Storage } from '../../ts/storage/Storage.js';

describe('sessions', function () {
  beforeAll(async () => {
    StorageFactory.purgeAll();
    storage = StorageFactory.getStorage();
    sessions = new Sessions(sessionsModel, resolverConfig, new SessionStorage(storage));
  });

  test('add participants', async function () {
    expect(1).toBe(1);
  });

  it('add participants', async function () {
    await sessions.addSession({ id: 'session1' }, 'bOompa');
    let sessionIds = await sessions.getSessionIdsFor('bOompa');
    expect(sessionIds).toContain('session1');
    await sessions.addSession({ id: 'session2' }, 'cBucket');
    sessionIds = await sessions.getSessionIdsFor('cBucket');
    expect(sessionIds).toContain('session2');
    const participantIds = await sessions.getAllParticipantIds();
    expect(participantIds.length).toBe(2);
  });
  it('re-add participants', async function () {
    await sessions.addSession({ id: 'session3' }, 'cBucket');
    let sessionIds = await sessions.getSessionIdsFor('cBucket');
    expect(sessionIds).toContain('session2');
    expect(sessionIds).toContain('session3');
    const participantIds = await sessions.getAllParticipantIds();
    expect(participantIds.length).toBe(2);
  });
  it('remove participants', async function () {
    await sessions.removeSession('session3');
    let sessionIds = await sessions.getSessionIdsFor('cBucket');
    expect(sessionIds.length).toBe(1);
    expect(sessionIds).toContain('session2');
    const participantIds = await sessions.getAllParticipantIds();
    expect(participantIds.length).toBe(2);
  });
  it('add more participants', async function () {
    await sessions.addSession({ id: 'session3' }, 'lLoompa');
    await sessions.addSession({ id: 'session4', nodeId: 'testNode' }, 'vSalt');
    await sessions.addSession({ id: 'session5', nodeId: 'testNode' }, 'cBucket');
    const participantIds = await sessions.getAllParticipantIds();
    expect(participantIds.length).toBe(4);
  });
  it('get all sessions for address', async function () {
    const sessionsByParticipant = await sessions.getSessionIdsForAll(['cBucket', 'vSalt']);
    expect(Object.keys(sessionsByParticipant)).toContain('cBucket');
    expect(Object.keys(sessionsByParticipant)).toContain('vSalt');
    expect(sessionsByParticipant['cBucket']).toContain('session2');
    expect(sessionsByParticipant['cBucket']).toContain('session5');
    expect(sessionsByParticipant['vSalt']).toContain('session4');
    expect(Object.keys(sessionsByParticipant).length).toBe(2);
  });
  it('get all sessions for address inlcuding group', async function () {
    const sessionsByParticipant = await sessions.getSessionIdsForAll(['$operators', 'vSalt']);
    expect(Object.keys(sessionsByParticipant)).toContain('cBucket');
    expect(Object.keys(sessionsByParticipant)).toContain('vSalt');
    expect(Object.keys(sessionsByParticipant)).toContain('bOompa');
    expect(sessionsByParticipant['cBucket']).toContain('session2');
    expect(sessionsByParticipant['cBucket']).toContain('session5');
    expect(sessionsByParticipant['vSalt']).toContain('session4');
    expect(sessionsByParticipant['bOompa']).toContain('session1');
    expect(Object.keys(sessionsByParticipant).length).toBe(3);
  });
  it('get sessions for unknown users', async function () {
    const sessionsByParticipant = await sessions.getSessionIdsForAll(['nobody', 'nope']);
    expect(sessionsByParticipant['nobody']).toBeUndefined;
    expect(sessionsByParticipant['nope']).toBeUndefined;
    expect(Object.keys(sessionsByParticipant).length).toBe(0);
  });
  it('get single address', async function () {
    expect(await sessions.getParticipantIdsFor(['cBucket'])).toStrictEqual(['cBucket']);
  });
  it('get group', async function () {
    expect(await sessions.getParticipantIdsFor(['$operators'])).toStrictEqual(['bOompa', 'cBucket']);
  });
  it('get all', async function () {
    const participantIds = await sessions.getParticipantIdsFor(['$all']);
    expect(participantIds).toContain('bOompa');
    expect(participantIds).toContain('cBucket');
    expect(participantIds).toContain('lLoompa');
    expect(participantIds).toContain('vSalt');
    expect(participantIds.length).toBe(4);
  });
  it('get all - 1', async function () {
    const participantIds = await sessions.getParticipantIdsFor({ include: ['$all'], exclude: ['lLoompa'] });
    expect(participantIds).toContain('bOompa');
    expect(participantIds).toContain('cBucket');
    expect(participantIds).toContain('vSalt');
    expect(participantIds).not.toContain('lLoompa');
    expect(participantIds.length).toBe(3);
  });
  it('get multiple', async function () {
    const participantIds = await sessions.getParticipantIdsFor(['bOompa', 'vSalt']);
    expect(participantIds).toContain('bOompa');
    expect(participantIds).toContain('vSalt');
    expect(participantIds.length).toBe(2);
  });
  it('get multiple groups', async function () {
    const participantIds = await sessions.getParticipantIdsFor(['$operators', '$technicians']);
    expect(participantIds).toContain('bOompa');
    expect(participantIds).toContain('cBucket');
    expect(participantIds).toContain('lLoompa');
    expect(participantIds).toContain('vSalt');
    expect(participantIds.length).toBe(4);
  });
  it('get multiple groups and single', async function () {
    const participantIds = await sessions.getParticipantIdsFor(['$technicians', 'bOompa']);
    expect(participantIds).toContain('bOompa');
    expect(participantIds).toContain('cBucket');
    expect(participantIds).toContain('lLoompa');
    expect(participantIds).toContain('vSalt');
    expect(participantIds.length).toBe(4);
  });
  it('get multiple groups and single', async function () {
    const participantIds = await sessions.getParticipantIdsFor(['$operators', 'lLoompa']);
    expect(participantIds).toContain('bOompa');
    expect(participantIds).toContain('cBucket');
    expect(participantIds).toContain('lLoompa');
    expect(participantIds.length).toBe(3);
  });
  it('get multiple groups and single not available', async function () {
    const participantIds = await sessions.getParticipantIdsFor(['$technicians', 'mTeevee']);
    expect(participantIds).toContain('cBucket');
    expect(participantIds).toContain('lLoompa');
    expect(participantIds).toContain('vSalt');
    expect(participantIds.length).toBe(4);
  });
  it('get groups not available', async function () {
    const participantIds = await sessions.getParticipantIdsFor(['$madeUpGroup', '$notAGroup']);
    expect(participantIds.length).toBe(0);
  });
  it('test filtering service addresses and participants', function () {
    const { serviceAddresses, participantAddresses } = sessions.getAddressResolver().filterServiceAddresses({
      include: ['org.wt.test_agent', 'org.wt.test_agent_2', 'bOompa'],
      exclude: ['some_test_participant'],
    });
    expect(serviceAddresses.length).toBe(2);
    expect(serviceAddresses).toContain('org.wt.test_agent');
    expect(serviceAddresses).toContain('org.wt.test_agent_2');
    expect((participantAddresses as Address).include.length).toBe(1);
    expect((participantAddresses as Address).include).toContain('bOompa');
    expect((participantAddresses as Address).exclude?.length).toBe(1);
    expect((participantAddresses as Address).exclude).toContain('some_test_participant');
  });
  it('test no service addresses', function () {
    const { serviceAddresses, participantAddresses } = sessions
      .getAddressResolver()
      .filterServiceAddresses({ include: ['bOompa'] });
    expect(serviceAddresses.length).toBe(0);
    expect((participantAddresses as Address).include.length).toBe(1);
    expect((participantAddresses as Address).include).toContain('bOompa');
  });
  it('get node type from service address', function () {
    const nodeType = sessions.getAddressResolver().getNodeTypeForServiceAddress('org.wt.test_agent');
    expect(nodeType).toBe('test_agent');
    const nodeType2 = sessions.getAddressResolver().getNodeTypeForServiceAddress('org.wt.test_agent_2');
    expect(nodeType2).toBe('test_agent_2');
  });
  it('remove participants', async function () {
    await sessions.removeParticipant('bOompa');
    await sessions.removeParticipant('cBucket');
    await sessions.removeParticipant('lLoompa');
    await sessions.removeParticipant('vSalt');
  });

  afterAll(async () => {
    await StorageFactory.purgeAll();
    StorageFactory.disconnectAll();
  });
});

const sessionsModel = {
  groups: [
    {
      name: 'operators',
      participants: [{ participantId: 'bOompa' }, { participantId: 'cBucket' }],
    },
    {
      name: 'technicians',
      participants: [{ participantId: 'lLoompa' }, { participantId: 'vSalt' }, { participantId: 'cBucket' }],
    },
  ],
};

const resolverConfig: ResolverConfig = {
  agents: [
    {
      name: 'Test Agent 1',
      nodeType: 'test_agent',
      address: 'org.wt.test_agent',
    },
    {
      name: 'Test Agent 2 Server',
      nodeType: 'test_agent_2',
      address: 'org.wt.test_agent_2',
    },
  ],
};
let storage :Storage;
let sessions: Sessions;

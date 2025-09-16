import { Sessions } from '../../ts/sessions/Sessions.js';
import { SessionStorage } from '../../ts/sessions/storage/SessionStorage.js';
import { StorageFactory } from '../../ts/storage/StorageFactory.js';
import { ResolverConfig } from '../../ts/sessions/Config.js';
import { Storage } from '../../ts/storage/Storage.js';
import { ThredContext } from '../../ts/engine/ThredContext.js';

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
    const sessionsByParticipant = await sessions.getSessionIdsForParticipantIds(['cBucket', 'vSalt']);
    expect(Object.keys(sessionsByParticipant)).toContain('cBucket');
    expect(Object.keys(sessionsByParticipant)).toContain('vSalt');
    expect(sessionsByParticipant['cBucket']).toContain('session2');
    expect(sessionsByParticipant['cBucket']).toContain('session5');
    expect(sessionsByParticipant['vSalt']).toContain('session4');
    expect(Object.keys(sessionsByParticipant).length).toBe(2);
  });
  it('get all sessions for address inlcuding group', async function () {
    const operators = await sessions.getParticipantIdsFor(['$operators']);
    const sessionsByParticipant = await sessions.getSessionIdsForParticipantIds([...operators, 'vSalt']);
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
    const sessionsByParticipant = await sessions.getSessionIdsForParticipantIds(['nobody', 'nope']);
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
    const { serviceAddresses, remoteServiceAddresses, participantAddresses } = sessions
      .getAddressResolver()
      .filterServiceAddresses(['org.wt.test_agent', 'org.wt.test_agent_2', 'bOompa']);
    expect(serviceAddresses.length).toBe(2);
    expect(serviceAddresses).toContain('org.wt.test_agent');
    expect(serviceAddresses).toContain('org.wt.test_agent_2');
    expect(participantAddresses.length).toBe(1);
    expect(participantAddresses).toContain('bOompa');
    expect(participantAddresses.length).toBe(1);
  });
  it('test no service addresses', function () {
    const { serviceAddresses, participantAddresses } = sessions.getAddressResolver().filterServiceAddresses(['bOompa']);
    expect(serviceAddresses.length).toBe(0);
    expect(participantAddresses.length).toBe(1);
    expect(participantAddresses).toContain('bOompa');
  });
  it('get address for node type', function () {
    const address = sessions.getAddressResolver().getServiceAddressForNode('org.wt.test_agent');
    expect(address).toBe('org.wt.test_agent');
    const nodeType2 = sessions.getAddressResolver().getServiceAddressForNode('org.wt.test_agent_2');
    expect(nodeType2).toBe('org.wt.test_agent_2');
  });
  it('get thred participants', async function () {
    const particpantIds = await sessions.getAddressResolver().getParticipantIdsFor(['$thred', 'vSalt'], thredContext);
    expect(particpantIds).toContain('bOompa');
    expect(particpantIds).toContain('cBucket');
    expect(particpantIds).toContain('lLoompa');
    expect(particpantIds).toContain('vSalt');
    expect(particpantIds.length).toBe(4);
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

const thredContext = new ThredContext({ thredId: 'testThredId', scope: {} });
thredContext.addParticipantIds(['bOompa', 'cBucket', 'lLoompa', 'org.wt.persistence']);

const resolverConfig: ResolverConfig = {
  agents: [
    {
      name: 'Test Agent 1',
      nodeType: 'org.wt.test_agent',
      nodeId: 'org.wt.test_agent1',
      address: 'org.wt.test_agent',
    },
    {
      name: 'Test Agent 2 Server',
      nodeType: 'org.wt.test_agent_2',
      nodeId: 'org.wt.test_agent2',
      address: 'org.wt.test_agent_2',
    },
    {
      name: 'Persistence Agent',
      nodeType: 'org.wt.persistence',
      nodeId: 'org.wt.persistence1',
      address: 'org.wt.persistence',
    },
  ],
};
let storage: Storage;
let sessions: Sessions;

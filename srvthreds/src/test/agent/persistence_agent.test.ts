import { Logger, LoggerLevel } from '../../ts/thredlib/index.js';
import { AgentConfig } from '../../ts/agent/Config.js';
import { EventQ } from '../../ts/queue/EventQ.js';
import { MessageQ } from '../../ts/queue/MessageQ.js';
import { AgentConnectionManager, events } from '../testUtils.js';
import agentConfig from '../../ts/config/persistence_agent.json';
import { aw } from 'vitest/dist/chunks/reporters.WnPwkmgA.js';

Logger.setLevel(LoggerLevel.INFO);

describe.skip('persistence agent test', function () {
    beforeAll(async () => {
        connMan = await AgentConnectionManager.newAgentInstance(agentConfig);
        await connMan.purgeAll();
        engineEventQ = connMan.engineEventQ;
        engineMessageQ = connMan.engineMessageQ;
    });
    test('test store object', async function () {
    });
    // cleanup in case of failure
    afterAll(async () => {
        await connMan.purgeAll();
        await connMan.disconnectAll();
    });
});

let connMan: AgentConnectionManager;
let engineEventQ: EventQ;
let engineMessageQ: MessageQ;
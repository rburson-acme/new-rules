import { Logger, LoggerLevel, PatternModel } from '../../ts/thredlib/index.js';
import { Persistence } from '../../ts/persistence/Persistence.js';
import { PatternManager } from '../../ts/admin/PatternManager.js';

Logger.setLevel(LoggerLevel.INFO);

describe('patternManager Test', function () {
  test('connect', async function () {
    manager = await PatternManager.getInstance();
  });
  test('test save PatternModel', async function () {
    await manager.savePatternModel(patternModel);
  });
  test('test retrive PatternModel', async function () {
    const paternModel = await manager.getPatternModel('echo_test');
    expect(paternModel.name).toEqual('Echo Test');
  });
  test('test save PatternModel', async function () {
    await manager.savePatternModel(patternModel);
  });
  // cleanup in case of failure
  afterAll(async () => {
    try {
      //await manager.persistence.removeDatabase();
    } catch (e) {
      Logger.error(`Cleanup Failed ${(e as Error).message}`);
    }
    await manager.persistence.disconnect();
  });
});

let manager: PatternManager;

const patternModel: PatternModel = {
  name: 'Echo Test',
  id: 'echo_test',
  instanceInterval: 0,
  maxInstances: 0,
  reactions: [
    {
      name: 'echo',
      condition: {
        type: 'filter',
        xpr: "$event.type = 'org.wt.echo'",
        onTrue: {
          xpr: "$setLocal('echoTimes', $local('echoTimes') ? $local('echoTimes') + 1 : 1)",
        },
        transform: {
          eventDataTemplate: {
            title: "$xpr( $valueNamed('echoTitle') & ' ' & $local('echoTimes') )",
            content: { values: { echoContent: "$xpr( $valueNamed('echoContent') )" } },
          },
        },
        publish: {
          to: "$xpr( $valueNamed('echoTo') )",
        },
        transition: {
          name: 'echo',
        },
      },
    },
  ],
};

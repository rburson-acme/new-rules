import { PatternModel } from '../../../thredlib/index.js';

export const patternModel: PatternModel = {
  name: 'Injury Monitor',
  id: 'injury_monitor',
  instanceInterval: 0,
  maxInstances: 0,
  reactions: [
    {
      condition: {
        type: 'filter',
        xpr: "$event.type = ''",
        onTrue: { xpr: "$setLocal('first_event', $event)" },
        transform: {
          eventDataTemplate: {
            title: 'Available Technican Query',
            description:
              "$xpr( $local('first_event').source.name & ' has failed with a ' & $local('first_event').data.description)",
            advice: {
              eventType: 'wonkaInc.rms.availableResources',
            },
            content: {
              tasks: [
                {
                  name: 'availableTechnicians',
                  op: 'get',
                  params: {
                    type: 'employee',
                    //selector: '{ id, name }',
                    matcher: {
                      available: true,
                      code: "$xpr( $local('first_event').data.content.values.errorCode )",
                      location: "$xpr( $local('first_event').source.name )",
                      role: 'technician',
                    },
                  },
                },
              ],
            },
          },
        },
        publish: {
          to: ['$event.source.id'],
        },
      },
    },
  ],
};

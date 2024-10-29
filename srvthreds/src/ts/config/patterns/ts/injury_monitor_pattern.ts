import { PatternModel } from "../../../thredlib";

export const patternModel: PatternModel = {
  name: 'Downtime Light',
  id: 'downtime_light',
  instanceInterval: 0,
  maxInstances: 0,
  reactions: [
    {
      condition: {
        name: 'filter',
        xpr: "$event.type = 'wonkaInc.downtime'",
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
                    selector: '{ id, name }',
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
          to: ['wonkaInc.rms.agent'],
        },
      },
    },
  ],
};

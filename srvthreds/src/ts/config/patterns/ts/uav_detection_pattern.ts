import { PatternModel } from '../../../thredlib';

export const patternModel: PatternModel = {
  meta: {
    active: true,
  },
  name: 'UAV Detection',
  id: 'uav_detect',
  reactions: [
    {
      name: 'lookup_contact',
      allowedSources: ['sensor_agent1'],
      condition: {
        type: 'filter',
        xpr: "$event.type = 'org.wt.sensor.detectionEvent'",
        onTrue: {
          xpr: "$setLocal('sensorId', $valueNamed('sensorId'))",
        },
        transform: {
          eventDataTemplate: {
            title: 'Contact Query',
            content: {
              tasks: [
                {
                  name: 'find_contact',
                  op: 'get',
                  params: {
                    type: 'ContactInfo',
                    matcher: {
                      sensorId: "$xpr( $valueNamed('sensorId') )",
                    },
                  },
                },
              ],
            },
          },
        },
        publish: {
          to: 'org.wt.persistence',
        },
      },
    },
    {
      name: 'notify_contact',
      allowedSources: ['persistence1'],
      condition: {
        type: 'filter',
        xpr: "$event.type = 'org.wt.persistence'",
        onTrue: {
          xpr: "$setLocal('contactId', $valueNamed('contactId'))",
        },
        transform: {
          eventDataTemplate: {
            title: 'Possible UAV Detected',
            description:
              "$xpr( $local('sensorId') & ' has detected a possible UAV')",
            advice: {
              eventType: 'org.wt.client.tell',
              template: {
                name: 'uav_notification',
                interactions: [
                  {
                    interaction: {
                      content: [
                        {
                          input: {
                            name: 'uav_response',
                            type: 'boolean',
                            display: 'Would you like to see a live video feed of the area?',
                          },
                        },
                        {
                          group: {
                            items: [
                              {
                                value: {
                                  forInput: 'uav_response',
                                  display: 'Yes, show me video',
                                  set: [true],
                                },
                              },
                              {
                                value: {
                                  forInput: 'uav_response',
                                  display: "No video",
                                  set: [false],
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
        publish: {
          to: "$xpr( $local('contactId') )",
        },
      },
    },
  ],
};

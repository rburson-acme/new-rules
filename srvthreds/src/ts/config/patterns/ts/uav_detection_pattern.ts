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
          xpr: "$setLocal('coords', { 'latitude': $valueNamed('latitude'), 'longitude': $valueNamed('longitude') })",
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
      allowedSources: ['org.wt.persistence'],
      condition: {
        type: 'filter',
        xpr: "$event.type = 'org.wt.persistence'",
        onTrue: {
          xpr: "$setLocal('contactId', $valueNamed('contactId'))",
        },
        transform: {
          eventDataTemplate: {
            title: 'Possible UAV Detected',
            description: "$xpr( $local('sensorId') & ' has detected a possible UAV')",
            advice: {
              eventType: 'org.wt.client.tell',
              template: {
                name: 'uav_notification',
                interactions: [
                  {
                    interaction: {
                      content: [
                        {
                          map: {
                            locations: [
                              {
                                name: 'detection_location',
                                latitude: "$xpr( $local('coords').latitude )",
                                longitude: "$xpr( $local('coords').longitude )",
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

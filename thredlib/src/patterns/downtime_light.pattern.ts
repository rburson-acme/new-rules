import { PatternModel } from '../model/PatternModel.js';

const pattern: PatternModel = {
  name: 'Downtime Light',
  id: 'downtime_light',
  instanceInterval: 0,
  multiInstance: 0,
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
    {
      name: 'notifyAvailableTechnician',
      condition: {
        name: 'filter',
        xpr: "$event.type = 'wonkaInc.rms.availableResources'",
        transform: {
          eventDataTemplate: {
            title: 'Assistance Needed',
            description:
              "$xpr( $local('first_event').source.name & ' has failed with a ' & $local('first_event').data.description)",
            advice: {
              eventType: 'wonkaInc.technician',
              title: 'Are you available?',
              template: {
                name: 'technician_accept_work',
                interactions: [
                  {
                    interaction: {
                      content: [
                        {
                          input: {
                            name: 'technician_response',
                            type: 'nominal',
                            display:
                              'Are you available to accept the work order?',
                          },
                        },
                        {
                          group: {
                            items: [
                              {
                                value: {
                                  forInput: 'technician_response',
                                  display: 'Yes, I can accept',
                                  set: [true],
                                },
                              },
                              {
                                value: {
                                  forInput: 'technician_response',
                                  display: 'No, not right now',
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
          to: ['$xpr( $content.values.availableTechnicians[0].id )'],
        },
      },
    },
    {
      condition: {
        name: 'or',
        operands: [
          {
            name: 'filter',
            xpr: "$event.type='wonkaInc.technician' and $content.values.technician_response",
            transform: {
              eventDataTemplate: {
                title:
                  "$xpr( $event.source.id & ' has now become unavailable' )",
                description:
                  "$xpr( $local('first_event').source.name & ' has failed with a ' & $local('first_event').data.description)",
                advice: {
                  eventType: 'wonkaInc.rms.availableTechniciansUpdated',
                },
                content: {
                  tasks: [
                    {
                      name: 'technicianUnavailable',
                      op: 'update',
                      params: {
                        type: 'employee',
                        values: {
                          id: '$xpr( $event.source.id )',
                          available: false,
                          unavailableAt: '$xpr( $millis() )',
                          unavailableTimeout: 15,
                        },
                      },
                    },
                  ],
                },
              },
            },
            transition: {
              name: 'notify_technician_workorder_assigned',
              input: 'forward',
            },
          },
          {
            name: 'filter',
            xpr: "$event.type='wonkaInc.technician' and $not($content.values.technician_response)",
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
                      name: 'technicianUnavailable',
                      op: 'update',
                      params: {
                        type: 'employee',
                        values: {
                          id: '$xpr( $event.source.id )',
                          available: false,
                          unavailableAt: '$xpr( $millis() )',
                          unavailableTimeout: 15,
                        },
                      },
                    },
                    {
                      name: 'availableTechnicians',
                      op: 'get',
                      params: {
                        type: 'employee',
                        selector: '{ id, name }',
                        values: {
                          available: true,
                          code: "$xpr( $local('first_event').data.content.errorCode )",
                          location: "$xpr( $local('first_event').source.name )",
                          role: 'technician',
                        },
                      },
                    },
                  ],
                },
              },
            },
            transition: {
              name: 'notifyAvailableTechnician',
            },
          },
        ],
        publish: {
          to: ['wonkaInc.rms.agent'],
        },
      },
    },
    {
      name: 'notify_technician_workorder_assigned',
      condition: {
        name: 'filter',
        xpr: "$event.type='wonkaInc.technician' and $content.values.technician_response",
        transform: {
          eventDataTemplate: {
            title: 'Resource manager has been updated',
            description: "$xpr( 'You have been assigned to this task' )",
          },
        },
        publish: {
          to: ['$xpr( $event.source.id )'],
        },
        transition: {
          name: '$terminate',
        },
      },
    },
  ],
};
import { eventTypes, PatternModel, systemEventTypes } from '../../thredlib';

export class SystemPatterns {
  getTerminateThredPattern(): PatternModel {
    return {
      name: 'Terminate Thred',
      id: 'sys_terminate_thred',
      instanceInterval: 0,
      maxInstances: 0,
      reactions: [
        {
          condition: {
            type: 'filter',
            xpr: `$event.type = ${eventTypes.control.thredControl.type} and $values.op = ${systemEventTypes.operations.terminateThred}`,
            onTrue: { xpr: '$terminateThred($values.thredId)' },
            transform: {
              meta: {
                reXpr: '$event.id',
              },
              eventDataTemplate: {
                title: "$xpr('Thred ' & $values.thredId & ' has been terminated')",
                content: {
                  values: {
                    status: systemEventTypes.successfulStatus,
                    operation: systemEventTypes.operations.terminateThred,
                  },
                },
              },
            },
            publish: { to: ['$xpr( $event.source.id )'] },
          },
        },
      ],
    };
  }
}

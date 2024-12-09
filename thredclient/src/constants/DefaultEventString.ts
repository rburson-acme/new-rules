export const DEFAULT_EVENT_JSON_STRING = JSON.stringify(
    {
      type: 'org.wt.echo',
      id: 'echo_' + Date.now(),
      source: { id: 'echo_' + Date.now() },
      data: {
        title: 'Echo Event',
        advice: {
          eventType: 'wonkaInc.operator',
          title: 'Work order needed?',
          template: {
            name: 'operator_create_workorder',
            interactions: [
              {
                interaction: {
                  content: [
                    {
                      input: {
                        name: 'operator_response',
                        type: 'nominal',
                        display: 'Do you need to create a new work order?',
                      },
                    },
                    {
                      group: {
                        items: [
                          {
                            value: {
                              forInput: 'operator_response',
                              display: 'Yes, create a work order',
                              set: [true],
                            },
                          },
                          {
                            value: {
                              forInput: 'operator_response',
                              display: "No, don't create a work order",
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
        content: {
          values: {
            echoTitle: 'Echo Back Event',
            echoTo: ['participant0', 'participant1'],
            echoContent: {
              values: {
                exampleValue1: 'value1',
              },
            },
          },
        },
      },
    },
    null,
    2,
  );
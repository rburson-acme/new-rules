export const DEFAULT_EVENT_JSON_STRING = JSON.stringify(
  {
    type: 'org.wt.echo',
    id: 'echo_1733511984009',
    source: {
      id: 'echo_1733511984009',
    },
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
                      name: 'technician_response',
                      type: 'boolean',
                      display: 'Are you available to accept the work order?',
                      set: [
                        {
                          display: 'Yes, I can accept',
                          value: true,
                        },
                        {
                          display: 'No, not right now',
                          value: false,
                        },
                      ],
                    },
                  },
                  {
                    image: {
                      uri: 'https://catalystserverstorage.blob.core.usgovcloudapi.net/public/pathfinder/logo.png',
                      height: 100,
                      width: 100,
                    },
                  },
                ],
              },
            },
            {
              interaction: {
                content: [
                  {
                    input: {
                      name: 'operator_response',
                      type: 'text',
                      display: 'What materials do you need for this work order?',
                    },
                  },
                ],
              },
            },
            {
              interaction: {
                content: [
                  {
                    input: {
                      name: 'how_many',
                      type: 'numeric',
                      display: 'How many workers will be needed for this work order?',
                    },
                  },
                ],
              },
            },
            {
              interaction: {
                content: [
                  {
                    input: {
                      name: 'favorite_color',
                      type: 'nominal',
                      display: 'What is your favorite color?',
                      set: [
                        { display: 'Red', value: 'red' },
                        { display: 'Blue', value: 'blue' },
                        { display: 'Green', value: 'green' },
                        { display: 'Purple', value: 'purple' },
                        { display: 'Orange', value: 'orange' },
                      ],
                    },
                  },
                ],
              },
            },
            {
              interaction: {
                content: [
                  {
                    input: {
                      name: 'favorite_color',
                      type: 'nominal',
                      display: 'Pick two foods you like.',
                      set: [
                        { display: 'Pizza', value: 'pizza' },
                        { display: 'Tacos', value: 'tacos' },
                        { display: 'Burgers', value: 'burgers' },
                        { display: 'Pasta', value: 'pasta' },
                        { display: 'Salad', value: 'salad' },
                      ],
                      multiple: true,
                    },
                  },
                ],
              },
            },
            { interaction: { content: [{ text: { value: 'Work order submitted. Thank you for your response.' } }] } },
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

import { SystemSpec } from '../../ts/thredlib/index.js';

const spec: SystemSpec = {
  addressSpec: {
    participants: [
      {
        id: 'participant0',
        name: 'Participant 0',
        uri: 'https://uxwing.com/wp-content/themes/uxwing/download/peoples-avatars/man-user-color-icon.png',
      },
      {
        id: 'participant1',
        name: 'Participant 1',
        uri: 'https://uxwing.com/wp-content/themes/uxwing/download/peoples-avatars/man-user-color-icon.png',
      },
      {
        id: 'participant2',
        name: 'Participant 2',
        uri: 'https://uxwing.com/wp-content/themes/uxwing/download/peoples-avatars/man-user-color-icon.png',
      },
      {
        id: 'participant3',
        name: 'Participant 3',
        uri: 'https://uxwing.com/wp-content/themes/uxwing/download/peoples-avatars/man-user-color-icon.png',
      },
    ],
    groups: [
      { name: 'group0', participants: [{ participantId: 'participant0' }, { participantId: 'participant1' }] },
      { name: 'group1', participants: [{ participantId: 'participant2' }, { participantId: 'participant3' }] },
    ],
  },
  serviceSpecs: [
    {
      name: 'Boston Dynamics Spot',
      nodeType: 'org.wt.robot',
      address: 'org.wt.robot',
      description: 'Automated mobile robot platform',
      entitySpecs: [
        {
          type: 'Param',
          description: 'Configurable parameters for the robot',
          propertySpecs: [
            {
              name: 'id',
              description: 'Unique identifier for the robot',
              type: 'string',
              readonly: true,
            },
            {
              name: 'routine',
              description: 'Routine to invoke on the robot',
              type: 'string',
            },
            {
              name: 'location',
              description: 'The target location to which to send the robot',
              type: 'object',
              propertySpec: [
                {
                  name: 'latitude',
                  description: 'Latitude of the target location.',
                  type: 'string',
                },
                {
                  name: 'longitude',
                  description: 'Longitude of the target location.',
                  type: 'string',
                },
              ],
            },
          ],
        },
        {
          type: 'DeployResponse',
          description: 'Response from the robot upon deployment',
          propertySpecs: [
            {
              name: 'robotId',
              description: 'Unique identifier for the robot',
              type: 'string',
            },
            {
              name: 'videoStreamUrl',
              description: 'URL of the video stream from the robot',
              type: 'string',
            },
            {
              name: 'latitude',
              description: "Latitude of the robot's current location.",
              type: 'string',
            },
            {
              name: 'longitude',
              description: "Longitude of the robot's current location.",
              type: 'string',
            },
          ],
        },
      ],
      inputSpecs: [
        {
          inputContentType: 'tasks',
          inputContentSpec: {
            description: 'Allows for robot parameters to be retrieved or updated.',
            targetTypeName: 'Param',
            allowedOps: ['get', 'update'],
          },
        },
      ],
      outputSpecs: [
        {
          eventType: 'org.wt.robot',
          description: 'Responses and notifications sent by the robot.',
          eventContentType: 'values',
          eventContentSpecs: [
            {
              targetTypeName: 'DeployResponse',
            },
          ],
        },
      ],
    },
    {
      name: 'McQ Unattended Ground Sensor',
      nodeType: 'org.cmi2.sensor',
      address: 'org.cmi2.sensor',
      description: 'Ground sensor for detecting presence and movement of entities',
      entitySpecs: [
        {
          type: 'DetectedEntity',
          description: 'Data describing an entity detected by the sensor.',
          propertySpecs: [
            {
              name: 'sensorId',
              description: 'Unique identifier for the sensor',
              type: 'string',
            },
            {
              name: 'latitude',
              description: "Latitude of the detected entity's current location.",
              type: 'string',
            },
            {
              name: 'longitude',
              description: "Longitude of the detected entity's current location.",
              type: 'string',
            },
          ],
        },
      ],
      inputSpecs: [],
      outputSpecs: [
        {
          eventType: 'org.cmi2.sensor.detectionEvent',
          description: 'Notifications sent by the sensor.',
          eventContentType: 'values',
          eventContentSpecs: [
            {
              targetTypeName: 'DetectedEntity',
            },
          ],
        },
      ],
    },
    {
      name: 'Persistent Storage',
      nodeType: 'org.wt.persistence',
      address: 'org.wt.persistence',
      description: 'Service providing simple CRUD operations for data storage and retrieval.',
      entitySpecs: [
        {
          type: 'TestObject',
          description: 'A test object representing a participant at a specific location.',
          propertySpecs: [
            {
              name: 'id',
              description: 'Unique identifier for the record.',
              type: 'string',
              readonly: true,
            },
            {
              name: 'participantId',
              description: 'Unique identifier for the participant at the associated location.',
              type: 'string',
            },
            {
              name: 'locationId',
              description: 'Unique identifier for the location.',
              type: 'string',
            },
            {
              name: 'locationCategory',
              description: 'Category of the location',
              type: 'string',
              set: [
                {
                  display: 'Store',
                  value: 'store',
                },
                {
                  display: 'Warehouse',
                  value: 'warehouse',
                },
                {
                  display: 'Factory',
                  value: 'factory',
                },
              ],
            },
            {
              name: 'participantInfo',
              description: 'Information about the participant.',
              type: 'object',
              propertySpec: [
                {
                  name: 'name',
                  description: 'Name of the participant.',
                  type: 'string',
                },
                {
                  name: 'contactEmail',
                  description: 'Contact email for the participant.',
                  type: 'string',
                },
              ],
            },
          ],
        },
      ],
      inputSpecs: [
        {
          inputContentType: 'tasks',
          inputContentSpec: {
            description: 'A set of test data that associates participants with locations.',
            targetTypeName: 'TestObject',
            allowedOps: ['put', 'get', 'getOne', 'update', 'upsert', 'replace', 'delete', 'count'],
            options: [
              {
                name: 'dbname',
                description: 'Database name to use for storage.',
                type: 'string',
              },
            ],
          },
        },
      ],
      outputSpecs: [
        {
          eventType: 'org.wt.persistence',
          description: 'Structured data as the result of a query or operation.',
          eventContentType: 'values',
          eventContentSpecs: [
            {
              targetTypeName: 'TestObject',
            },
          ],
        },
      ],
    },
  ],
};

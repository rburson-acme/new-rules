export const eventTypes = {
  system: {
    tell: {
      type: 'org.wt.tell',
    },
    broadcast: {
        type: 'org.wt.broadcast',
    },
    source: {
      id: 'SYSTEM',
      name: 'Workthreds Bot',
    },
  },
  control: {
    sysControl: {
      type: 'org.wt.control.sysControl',
    },
    thredControl: {
      type: 'org.wt.control.thredControl',
    },
    dataControl: {
      type: 'org.wt.control.dataControl',
    },
    userControl: {
      type: 'org.wt.control.userControl',
    }
  },
  client: {
    tell: {
      type: 'org.wt.client.tell',
    },
    broadcast: {
      type: 'org.wt.client.broadcast',
    },
  },
};

// these are application level types (i.e. content.type)
export const systemEventTypes = {
  responseTypes: {
    opStatus: 'opStatus',
  },
  successfulStatus: 'OK',
  unsuccessfulStatus: 'ERROR',
  operations: {
    transitionThred: 'transitionThred',
    terminateThred: 'terminateThred',
    reloadPattern: 'reloadPattern',
    getThreds: 'getThreds',
    watchThreds: 'watchThreds',
    terminateAllThreds: 'terminateAllThreds',
    shutdown: 'shutdown',
    user: {
      getThreds: 'getThreds',
      getEvents: 'getEvents',
      getSystemSpec: 'getSystemSpec',
    }
  },
};

export const ThredId = {
  SYSTEM: 'SYSTEM',
};

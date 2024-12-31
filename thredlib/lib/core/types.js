export const eventTypes = {
    system: {
        type: 'org.wt.tell',
        source: {
            "id": "SYSTEM",
            "name": "Workthreds Bot"
        }
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
    },
    client: {
        tell: {
            type: 'org.wt.client.tell',
        }
    }
};
// these are application level types (i.e. content.type)
export const systemEventTypes = {
    responseTypes: {
        opStatus: "opStatus",
    },
    successfulStatus: "OK",
    unsuccessfulStatus: "ERROR",
    operations: {
        transitionThred: "transitionThred",
        terminateThred: "terminateThred",
        resetPattern: "resetPattern",
        reloadPattern: "reloadPattern",
        getThreds: "getThreds",
        terminateAllThreds: "terminateAllThreds",
        shutdown: "shutdown"
    }
};
export const ThredId = {
    SYSTEM: 'SYSTEM'
};
export const systemAddress = {
    persistence: 'org.wt.persistence',
};

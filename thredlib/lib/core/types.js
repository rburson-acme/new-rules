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
};
// these are application level types (i.e. content.type)
export const systemEventTypes = {
    responseTypes: {
        opStatus: "opStatus",
    },
    successfulStatus: "OK",
    unsuccessfulStatus: "ERROR",
    operations: {
        timeoutReaction: "timeoutReaction",
        transitionThred: "transitionThred",
        terminateThred: "terminateThred",
        resetPattern: "resetPattern",
        terminateAllThreds: "terminateAllThreds",
        shutdown: "shutdown"
    }
};
export const ThredId = {
    SYSTEM: 'SYSTEM'
};

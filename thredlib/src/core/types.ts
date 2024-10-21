export const eventTypes = {
    system: {
        type: 'org.wt.tell',
        source: {
            "id": "SYSTEM",
            "name": "Workthreds Bot"
        }
    },
    control: {
        type: 'org.wt.control',
    },
}

// these are application level types (i.e. content.type)
export const systemEventTypes = {
    responseTypes: {
       opStatus: "opStatus", 
    },
    successfulStatus: "OK",
    unsuccessfulStatus: "ERROR",
    operationTypes: {
        sysControl: "sysControl",
        thredControl: "thredControl",
        storeObject: "storeObject",
    },
    operations: {
        timeoutReaction: "timeoutReaction",
        transitionThred: "transitionThred",
        terminateThred: "terminateThred",
        resetPattern: "resetPattern",
        terminateAllThreds: "terminateAllThreds",
        shutdown: "shutdown"
    }
}

export const ThredId  = {
    SYSTEM: 'SYSTEM'
}
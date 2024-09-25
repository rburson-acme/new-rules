export declare const eventTypes: {
    system: {
        type: string;
        source: {
            id: string;
            name: string;
        };
    };
    control: {
        type: string;
    };
};
export declare const systemEventTypes: {
    responseTypes: {
        opStatus: string;
    };
    successfulStatus: string;
    unsuccessfulStatus: string;
    operationTypes: {
        sysControl: string;
        thredControl: string;
        storeObject: string;
    };
    operations: {
        timeoutReaction: string;
        transitionThred: string;
        terminateThred: string;
        resetPattern: string;
        terminateAllThreds: string;
        shutdown: string;
    };
};
export declare const ThredId: {
    SYSTEM: string;
};

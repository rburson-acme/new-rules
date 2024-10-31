export declare const eventTypes: {
    system: {
        type: string;
        source: {
            id: string;
            name: string;
        };
    };
    control: {
        sysControl: {
            type: string;
        };
        thredControl: {
            type: string;
        };
        dataControl: {
            type: string;
        };
    };
    client: {
        tell: {
            type: string;
        };
    };
};
export declare const systemEventTypes: {
    responseTypes: {
        opStatus: string;
    };
    successfulStatus: string;
    unsuccessfulStatus: string;
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

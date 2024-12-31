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
        transitionThred: string;
        terminateThred: string;
        resetPattern: string;
        reloadPattern: string;
        getThreds: string;
        terminateAllThreds: string;
        shutdown: string;
    };
};
export declare const ThredId: {
    SYSTEM: string;
};
export declare const systemAddress: {
    persistence: string;
};

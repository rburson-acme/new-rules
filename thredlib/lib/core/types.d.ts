export declare const eventTypes: {
    system: {
        tell: {
            type: string;
        };
        broadcast: {
            type: string;
        };
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
        userControl: {
            type: string;
        };
    };
    client: {
        tell: {
            type: string;
        };
        broadcast: {
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
        reloadPattern: string;
        getThreds: string;
        watchThreds: string;
        terminateAllThreds: string;
        shutdown: string;
        user: {
            getThreds: string;
            getEvents: string;
            getSystemSpec: string;
        };
    };
};
export declare const ThredId: {
    SYSTEM: string;
};

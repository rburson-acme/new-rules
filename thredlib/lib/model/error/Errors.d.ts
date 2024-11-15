export interface ErrorCodeType {
    [index: string]: {
        message: string;
        code: number;
    };
}
export declare const errorKeys: {
    SERVER_ERROR: string;
    CLIENT_ERROR: string;
    TASK_ERROR: string;
    OBJECT_ALREADY_EXISTS: string;
    OBJECT_NOT_FOUND: string;
    INVALID_LOGIN: string;
    UNAUTHORIZED: string;
    ARGUMENT_VALIDATION_ERROR: string;
};
export declare const errorCodes: ErrorCodeType;

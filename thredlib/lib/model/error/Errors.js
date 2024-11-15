export const errorKeys = {
    SERVER_ERROR: 'SERVER_ERROR',
    CLIENT_ERROR: 'CLIENT_ERROR',
    TASK_ERROR: 'TASK_ERROR',
    OBJECT_ALREADY_EXISTS: 'OBJECT_ALREADY_EXISTS',
    OBJECT_NOT_FOUND: 'OBJECT_NOT_FOUND',
    INVALID_LOGIN: 'INVALID_LOGIN',
    UNAUTHORIZED: 'UNAUTHORIZED',
    ARGUMENT_VALIDATION_ERROR: 'Argument Validation Error',
};
export const errorCodes = {
    // 5xxx - server related errors
    [errorKeys.SERVER_ERROR]: {
        message: 'Server Error',
        code: 5000,
    },
    // 52xx - task related errors
    [errorKeys.TASK_ERROR]: {
        message: 'Task Error',
        code: 5200,
    },
    [errorKeys.OBJECT_NOT_FOUND]: {
        message: 'Object Not Found',
        code: 5201,
    },
    [errorKeys.OBJECT_ALREADY_EXISTS]: {
        message: 'Object Already Exists',
        code: 5202,
    },
    // 4xxx - client related errors
    [errorKeys.CLIENT_ERROR]: {
        message: 'Client Error',
        code: 4000,
    },
    // 41xx - authentication related errors
    [errorKeys.UNAUTHORIZED]: {
        message: 'UNAUTHORIZED',
        code: 4101,
    },
    [errorKeys.INVALID_LOGIN]: {
        message: 'Invalid Login',
        code: 4102,
    },
    // 42xx - argument validation errors
    [errorKeys.ARGUMENT_VALIDATION_ERROR]: {
        message: 'Invalid Argument(s)',
        code: 4200,
    },
};

import { Auth, AuthResult } from "./Auth.js";

export class BasicAuth implements Auth {

    login(username: string, password: string): AuthResult {
        const token = 'temp_token'
        const expires = Date.now() + 3600 * 1000; // Token expires in 1 hour
        return { token, expires };
    }

    validate(token: string): boolean {
        return true;
    }
}
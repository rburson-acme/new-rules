import { Auth } from "./Auth.js";

export class BasicAuth implements Auth {
   
    authenticate(token: any): any {
        return true;
    }
    
    authorize(token: any, requiredRole: string): any {
        return true;
    }
}
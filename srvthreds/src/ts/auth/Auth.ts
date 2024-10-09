export interface Auth {
  
    // jwt token
    authenticate(token: any): any;
   
    // jwt token
    authorize(token: any, requiredRole: string): any;
}
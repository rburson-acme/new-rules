
export interface AuthResult {
    token: string;
    expires: number;
}

export interface Auth {

    login(username: string, password: string): AuthResult;
  
    validate(token: string): boolean;
   
}
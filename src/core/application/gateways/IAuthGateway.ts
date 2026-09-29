export interface AuthSession {
  userId: string;
  token: string;
}

export interface IAuthGateway {
  login(email: string, password: string): Promise<AuthSession>;
  logout(): Promise<void>;
  getSession(): Promise<AuthSession | null>;
}

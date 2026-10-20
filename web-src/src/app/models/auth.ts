export interface AuthResponse {
  token: string;
  expiresAt: string;
  userId: number;
  email: string;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface JwtPayload {
  sub: string;     // id пользователя (строкой)
  email: string;
  exp: number;     // срок — секунды Unix
}

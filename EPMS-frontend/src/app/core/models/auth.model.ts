export enum Role {
  USER = 'USER'
}

export interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: UserInfo;
}

export interface LoginRequest {
  email: string;
  password: String;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
}

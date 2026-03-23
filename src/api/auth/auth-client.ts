export interface AuthClient {
  sendPhoneNumber(phone: string): Promise<void>;
  sendAuthCode(code: string): Promise<void>;
  resendCodeViaSms(): Promise<void>;
}

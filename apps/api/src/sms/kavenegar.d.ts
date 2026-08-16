// Minimal typings for the untyped `kavenegar` package (only what we use).
declare module "kavenegar" {
  export interface KavenegarClient {
    VerifyLookup(
      params: { receptor: string; token: string; template: string; token2?: string; token3?: string },
      callback: (response: unknown, status: number) => void,
    ): void;
    Send(
      params: { message: string; sender?: string; receptor: string },
      callback: (response: unknown, status: number) => void,
    ): void;
  }
  export function KavenegarApi(options: { apikey: string }): KavenegarClient;
}

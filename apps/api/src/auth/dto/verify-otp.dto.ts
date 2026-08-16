import { Matches } from "class-validator";

export class VerifyOtpDto {
  @Matches(/^(\+?98|0)?9\d{9}$/, { message: "شماره موبایل معتبر نیست" })
  phone!: string;

  @Matches(/^\d{6}$/, { message: "کد باید ۶ رقم باشد" })
  code!: string;
}

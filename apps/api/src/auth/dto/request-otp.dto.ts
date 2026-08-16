import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";

export class RequestOtpDto {
  // Iranian mobile: 11 digits starting 09, or +98/98 prefixed. Normalized in the service.
  @Matches(/^(\+?98|0)?9\d{9}$/, { message: "شماره موبایل معتبر نیست" })
  phone!: string;

  // "login" rejects unregistered phones; "signup" creates a new user. Defaults to login.
  @IsOptional()
  @IsIn(["login", "signup"])
  mode?: "login" | "signup";

  // Registration profile (captured on first sign-up).
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: "نام کامل بیش از حد بلند است" })
  fullName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "سن باید یک عدد باشد" })
  @Min(1, { message: "سن معتبر نیست" })
  @Max(120, { message: "سن معتبر نیست" })
  age?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  utmSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  utmMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  utmCampaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64, { message: "کد دعوت معتبر نیست" })
  referralCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  landingPath?: string;
}

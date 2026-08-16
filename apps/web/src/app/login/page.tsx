"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEventHandler, SubmitEventHandler, useState } from "react";
import { JSX } from "react/jsx-runtime";

import Button from "@/components/Button";
import ContextWrapper from "@/components/ContextWrapper";
import Modal from "@/components/Modal";
import { Tabs } from "@/components/Tab";
import TextField from "@/components/TextField";
import { api, ApiError } from "@/lib/api";
import { login } from "@/lib/helper";
import { showError } from "@/lib/toast";

export default function LoginPage(): JSX.Element {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const sp = useSearchParams();
  const ref = sp.get("ref");
  const router = useRouter();

  const [code, setCode] = useState("");

  function switchMode(next: "login" | "signup"): void {
    setMode(next);
    setLoading(false);
  }

  const handleFormSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rawData = Object.fromEntries(formData.entries()) as Record<string, string>;

    if (step === "phone") {
      sendOtp(rawData);
    } else {
      verify();
    }
  };

  async function sendOtp(rawData: Record<string, string>): Promise<void> {
    setLoading(true);
    try {
      await api.requestOtp({
        phone,
        mode,
        ...(mode === "signup"
          ? {
              fullName: rawData.fullname.trim(),
              age: Number(rawData.age),
              referralCode: rawData.referralCode.trim() || undefined,
            }
          : {}),
        landingPath: "/login",
      });
      setStep("code");
    } catch (e) {
      showError(e);
      // Unregistered phone tried to log in → guide them to sign up.
      if (mode === "login" && e instanceof ApiError && e.status === 404) {
        setMode("signup");
      }
    } finally {
      setLoading(false);
    }
  }

  async function verify(): Promise<void> {
    setLoading(true);
    try {
      const { token, user } = await api.verifyOtp({ phone, code });
      login(token, user);
      router.replace(ref || "/");
    } catch (e) {
      showError(e);
    } finally {
      setLoading(false);
    }
  }

  const handleOTP: ChangeEventHandler<HTMLInputElement> = (e) => {
    setCode(e.target.value.replace(/\D/g, ""));
  };

  return (
    <main className="flex items-center grow p-4 justify-center">
      <Modal
        content={
          <ContextWrapper
            content={
              <form className="flex flex-col gap-4" onSubmit={handleFormSubmit}>
                {step === "phone" ? (
                  <Tabs
                    value={mode}
                    onChange={switchMode}
                    items={[
                      { label: "ورود", value: "login" },
                      { label: "ثبت نام", value: "signup" },
                    ]}
                  />
                ) : null}

                {step === "phone" ? (
                  <>
                    {mode === "signup" ? (
                      <>
                        <TextField label="نام کامل" name="fullname" placeholder="نام کامل شما" />
                        <TextField label="سن" name="age" placeholder="مثلا 24" inputMode="numeric" />
                      </>
                    ) : null}

                    <TextField
                      label="شماره موبایل"
                      name="phone"
                      onChange={(e) => setPhone(e.target.value)}
                      autoFocus
                      type="tel"
                    />

                    {mode === "signup" ? (
                      <>
                        <TextField
                          label={
                            <>
                              کد دعوت
                              <span className="text-slate-400">(اختیاری)</span>
                            </>
                          }
                          name="referralCode"
                          placeholder="کد دوستتان"
                        />
                      </>
                    ) : null}

                    <Button disabled={loading} fontSize={16} height={24} type="submit">
                      {loading ? "در حال ارسال…" : "ارسال کد"}
                    </Button>
                  </>
                ) : (
                  <>
                    <TextField
                      name="otp"
                      label={`کد ۶ رقمی ارسال‌شده به ${phone}`}
                      autoFocus
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="______"
                      onChange={handleOTP}
                      style={{ letterSpacing: "0.5em", textAlign: "center" }}
                      key={"otp"}
                    />

                    <Button disabled={loading || code.length !== 6} type="submit">
                      {loading ? "در حال بررسی…" : "تایید و ادامه"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setStep("phone");
                        setCode("");
                      }}
                      className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
                    >
                      تغییر شماره
                    </button>
                  </>
                )}
              </form>
            }
            ribbonType={"yellow"}
            title={"ورود/ثبت نام"}
            className="[&>div.relative]:w-5/6 [&>div.relative]:mx-auto"
          />
        }
        show={true}
      />
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import { Shield, ArrowLeft, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export default function VerifyOTPPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { login: storeLogin } = useAuthStore();
  const toast = useToast();

  useEffect(() => {
    if (!email) router.push("/admin/login");
  }, [email, router]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/admin/verify-otp", { email, otp: code });
      const { user, accessToken, refreshToken } = res.data.data;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      storeLogin(email, "");
      toast.success("Login successful");
      window.location.href = "/admin";
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post("/api/admin/resend-otp", { email });
      setOtp(["", "", "", "", "", ""]);
      toast.success("New OTP sent to your email");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="text-white" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Two-Factor Authentication</h1>
            <p className="text-sm text-slate-500 mt-1">
              Enter the 6-digit code sent to <strong className="text-slate-700">{email}</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex justify-center gap-2 mb-8">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-11 h-12 text-center text-lg font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 bg-white"
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => router.push("/admin/login")}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} /> Back to Login
            </button>
            <button
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={14} className={resending ? "animate-spin" : ""} />
              {resending ? "Sending..." : "Resend Code"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

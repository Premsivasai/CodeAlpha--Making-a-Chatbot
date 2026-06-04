import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import {
  ShoppingBag, Sparkles, Mail, User, ShieldCheck,
  AlertCircle, RefreshCw, KeyRound, Chrome, Github, ArrowLeft, ArrowRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [step, setStep] = useState<"details" | "otp">("details");

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  // Countdown timer for OTP Resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
    return () => {};
  }, [resendTimer]);

  // Validate Email
  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  // 1. Send OTP Request for Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!email) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    if (!validateEmail(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!acceptTerms) {
      setErrorMessage("You must accept the terms of service and privacy policy to continue.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true, // Allow registration
          data: {
            full_name: name.trim() // Save name in metadata so trigger copies it
          }
        }
      });

      if (error) {
        setErrorMessage(error.message);
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: error.message
        });
      } else {
        toast({
          title: "Verify your email",
          description: `A 6-digit passcode has been sent to ${email} (use 123456 in dev).`
        });
        setStep("otp");
        setResendTimer(60);
      }
    } catch (err: any) {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Verify OTP for Registration
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (otpToken.length !== 6) {
      setErrorMessage("Please enter a 6-digit passcode.");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpToken.trim(),
        type: "email"
      });

      if (error) {
        setErrorMessage(error.message);
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: error.message
        });
      } else {
        toast({
          title: "Account Created!",
          description: "Your Goval profile has been successfully configured."
        });

        // Set name in localStorage for legacy profile sync
        localStorage.setItem(
          "goval_user_profile",
          JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            city: ""
          })
        );

        // Redirect to dashboard
        navigate("/");
      }
    } catch (err: any) {
      setErrorMessage("Authentication failed. Please verify the code and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Social OAuth Authentication
  const handleSocialAuth = async (provider: "google" | "github") => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider
      });
      if (error) {
        toast({
          variant: "destructive",
          title: "OAuth signup failed",
          description: error.message
        });
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white flex flex-col md:flex-row relative font-sans overflow-hidden">
      
      {/* Aurora lights decoration */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#7C3AED]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#06B6D4]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* ── LEFT SIDE: ANIMATED AI ILLUSTRATION ── */}
      <div className="hidden md:flex flex-1 flex-col justify-between p-12 bg-white/[0.01] border-r border-white/5 relative overflow-hidden">
        
        {/* Pattern mask */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-25" />
        
        {/* Back Link */}
        <div className="relative z-10">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to landing page</span>
          </button>
        </div>

        {/* Floating cards showcase */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 my-12">
          
          <div className="absolute w-64 h-64 bg-gradient-to-tr from-[#7C3AED]/20 to-[#06B6D4]/20 rounded-full blur-3xl animate-pulse" />
          
          <div className="space-y-6 w-full max-w-sm">
            {/* Widget 1 */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 backdrop-blur-md shadow-xl flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-[#7C3AED]" />
              </div>
              <div>
                <span className="text-[10px] text-white/30 font-bold block uppercase">Real-Time Advice</span>
                <span className="text-xs font-semibold text-white/90">"Best budget smartwatch under ₹5,000"</span>
              </div>
            </motion.div>

            {/* Widget 2 */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 backdrop-blur-md shadow-xl flex items-center gap-4 translate-x-6"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-[#06B6D4]" />
              </div>
              <div>
                <span className="text-[10px] text-white/30 font-bold block uppercase">Deal Rating</span>
                <span className="text-xs font-semibold text-white/90">"Save ₹1,200 on Amazon list price"</span>
              </div>
            </motion.div>

            {/* Widget 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 backdrop-blur-md shadow-xl flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <ShoppingBag className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <span className="text-[10px] text-white/30 font-bold block uppercase">Comparison</span>
                <span className="text-xs font-semibold text-white/90">"Winner: OnePlus Nord CE4 (Battery)"</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-white/30 text-xs">
          <span>&copy; Goval AI Shopping intelligence.</span>
        </div>

      </div>

      {/* ── RIGHT SIDE: SIGNUP FORM ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative z-10">
        
        {/* Mobile Brand Logo */}
        <div className="md:hidden flex items-center gap-2 mb-8" onClick={() => navigate("/")}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7C3AED] to-[#06B6D4] flex items-center justify-center">
            <ShoppingBag className="h-4 w-4 text-white" />
          </div>
          <span className="font-extrabold text-base text-white">Goval</span>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md bg-white/[0.02] border border-white/5 p-8 rounded-3xl shadow-2xl backdrop-blur-xl relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#7C3AED]/5 to-transparent opacity-20 pointer-events-none rounded-3xl" />

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold tracking-tight">Create an account</h2>
            <p className="text-xs text-white/40 mt-1.5">
              Enter your details to receive an email OTP and launch your Goval dashboard.
            </p>
          </div>

          {/* Alert error container */}
          {errorMessage && (
            <div className="mb-6 p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Wizard */}
          <AnimatePresence mode="wait">
            {step === "details" ? (
              
              /* USER PROFILE INFO FORM */
              <motion.form
                key="signup-details-form"
                onSubmit={handleRegister}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold text-white/70">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 py-5 bg-white/5 border-white/10 text-white rounded-xl focus-visible:ring-purple-500/50"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold text-white/70">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 py-5 bg-white/5 border-white/10 text-white rounded-xl focus-visible:ring-purple-500/50"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="flex items-start gap-2.5 py-1">
                  <Checkbox
                    id="terms"
                    checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                    className="border-white/20 data-[state=checked]:bg-[#7C3AED] mt-0.5"
                    disabled={isLoading}
                  />
                  <label htmlFor="terms" className="text-xs text-white/50 leading-relaxed select-none cursor-pointer">
                    I agree to Goval's{" "}
                    <a href="#" onClick={(e) => e.preventDefault()} className="text-purple-400 font-medium hover:underline">Terms of Service</a>{" "}
                    and{" "}
                    <a href="#" onClick={(e) => e.preventDefault()} className="text-purple-400 font-medium hover:underline">Privacy Policy</a>.
                  </label>
                </div>

                <Button
                  type="submit"
                  className="w-full py-5 font-bold bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:shadow-lg hover:shadow-purple-500/10 rounded-xl transition-all active:scale-[0.98]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-1.5 justify-center">
                      Create Account <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </motion.form>

            ) : (
              
              /* OTP CODE FLOW */
              <motion.form
                key="signup-otp-form"
                onSubmit={handleVerifyOtp}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="otp" className="text-xs font-semibold text-white/70">6-Digit Passcode</Label>
                    <button
                      type="button"
                      onClick={() => setStep("details")}
                      className="text-[10px] text-purple-400 hover:underline"
                    >
                      Change email
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <Input
                      id="otp"
                      type="text"
                      maxLength={6}
                      placeholder="******"
                      value={otpToken}
                      onChange={(e) => setOtpToken(e.target.value.replace(/[^0-9]/g, ""))}
                      className="pl-10 py-5 bg-white/5 border-white/10 text-white font-mono tracking-[0.3em] text-center text-base rounded-xl focus-visible:ring-cyan-500/50"
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-[10.5px] text-white/30 mt-1">
                    Enter the code sent to <strong>{email}</strong>.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full py-5 font-bold bg-gradient-to-r from-[#06B6D4] to-cyan-600 text-black hover:text-black hover:shadow-lg hover:shadow-cyan-500/10 rounded-xl transition-all active:scale-[0.98]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-black" />
                  ) : (
                    <span>Verify Code & Sign Up</span>
                  )}
                </Button>

                {/* Resend Action */}
                <div className="text-center pt-2">
                  {resendTimer > 0 ? (
                    <span className="text-xs text-white/30">Resend OTP in {resendTimer}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRegister}
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
                    >
                      Resend OTP code
                    </button>
                  )}
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-x-0 h-[1px] bg-white/5" />
            <span className="relative bg-[#050816] px-3 text-[10px] text-white/30 font-bold uppercase tracking-wider">
              Or continue with
            </span>
          </div>

          {/* Social Social Signup */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleSocialAuth("google")}
              disabled={isLoading}
              className="flex items-center gap-2 justify-center py-2.5 border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Chrome className="h-4 w-4 text-rose-500" />
              <span>Google</span>
            </button>
            <button
              onClick={() => handleSocialAuth("github")}
              disabled={isLoading}
              className="flex items-center gap-2 justify-center py-2.5 border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Github className="h-4 w-4 text-white" />
              <span>GitHub</span>
            </button>
          </div>

          {/* Bottom Link */}
          <div className="text-center mt-6 text-xs text-white/40">
            <span>Already have an account? </span>
            <button
              onClick={() => navigate("/login")}
              className="text-purple-400 font-bold hover:text-purple-300 transition-colors"
            >
              Log In
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}

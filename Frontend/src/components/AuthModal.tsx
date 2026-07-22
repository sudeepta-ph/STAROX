import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, Eye, EyeOff, Loader2, Github, Check, AtSign } from "lucide-react";
import { useSignIn, useSignUp } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/lib/authStore";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: Mode;
}

type Mode = "signin" | "signup" | "forgot_password" | "verify_reset" | "verify_signup";

const AuthModal = ({ isOpen, onClose, initialMode = "signin" }: AuthModalProps) => {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Username and Password Confirm States
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    if (!val) {
      setUsernameError("Username required");
    } else if (val.length < 4) {
      setUsernameError("Minimum 4 characters");
    } else if (val.length > 64) {
      setUsernameError("Maximum 64 characters");
    } else if (!/^[a-zA-Z0-9_]+$/.test(val)) {
      setUsernameError("Only supported characters");
    } else {
      setUsernameError(null);
    }
  };

  // Verification codes
  const [code, setCode] = useState("");

  const { isLoaded: isSignInLoaded, signIn, setActive: setActiveSignIn } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp();

  const clearForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setUsername("");
    setConfirmPassword("");
    setUsernameError(null);
    setCode("");
    setError(null);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
  };

  const { user } = useAuthStore();

  useEffect(() => {
    if (user && isOpen) {
      onClose();
    }
  }, [user, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    clearForm();
  }, [isOpen, initialMode]);

  const handleClerkError = (err: any) => {
    console.error("Clerk error details:", err);
    if (err && err.errors && err.errors.length > 0) {
      const firstErr = err.errors[0];
      
      // Custom overrides for requested validation messages
      if (firstErr.code === "form_identifier_exists") {
        if (firstErr.meta?.paramName === "username") {
          setError("Username already taken");
          return;
        }
        if (firstErr.meta?.paramName === "email_address") {
          setError("Email already exists");
          return;
        }
      }
      if (firstErr.code === "form_character_limit_under") {
        if (firstErr.meta?.paramName === "username") {
          setError("Username too short");
          return;
        }
      }
      if (firstErr.code === "form_character_limit_over") {
        if (firstErr.meta?.paramName === "username") {
          setError("Username too long");
          return;
        }
      }
      if (firstErr.code === "form_identifier_format_invalid") {
        if (firstErr.meta?.paramName === "username") {
          setError("Invalid username");
          return;
        }
      }
      if (firstErr.code === "password_weak" || firstErr.code === "form_password_length_too_short") {
        setError("Weak password");
        return;
      }
      
      setError(firstErr.longMessage || firstErr.message);
    } else if (err && err.message) {
      setError(err.message);
    } else {
      setError("An unexpected authentication error occurred.");
    }
  };

  const handleOAuth = async (provider: "google" | "github" | "apple") => {
    if (!isSignInLoaded) return;
    setLoading(true);
    setError(null);
    try {
      const strategy = `oauth_${provider}` as const;
      console.log(`[Clerk OAuth] Redirecting user for ${provider} OAuth...`);
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err: any) {
      console.error(`[Clerk OAuth] Exception caught during OAuth for ${provider}:`, err);
      handleClerkError(err);
      setLoading(false);
      throw err;
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!isSignUpLoaded) return;

        // Validation Checks
        if (!username) {
          setError("Username required");
          setLoading(false);
          return;
        }
        if (usernameError) {
          setError(usernameError);
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }

        const names = name.trim().split(" ");
        const firstName = names[0] || "";
        const lastName = names.slice(1).join(" ") || "";

        console.log("[Clerk Signup] Calling signUp.create() with fields:", {
          emailAddress: email,
          username: username,
          firstName,
          lastName
        });
        const createdUser = await signUp.create({
          emailAddress: email,
          username,
          password,
          firstName,
          lastName,
        });
        console.log("[Clerk Signup] signUp.create() response:", createdUser);

        console.log("[Clerk Signup] Calling signUp.prepareEmailAddressVerification({ strategy: 'email_code' })");
        const verificationPrep = await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        console.log("[Clerk Signup] prepareEmailAddressVerification() response:", verificationPrep);
        
        setMode("verify_signup");
      } else if (mode === "signin") {
        if (!isSignInLoaded) return;
        console.log("[Clerk Signin] Calling signIn.create() for email:", email);
        const completeSignIn = await signIn.create({
          identifier: email,
          password,
        });
        console.log("[Clerk Signin] signIn.create() response:", completeSignIn);

        if (completeSignIn.status === "complete") {
          console.log("[Clerk Signin] Sign in completed successfully.");
          await setActiveSignIn({ session: completeSignIn.createdSessionId });
          onClose();
          navigate("/dashboard");
        } else {
          console.warn("[Clerk Signin] Sign in incomplete status:", completeSignIn.status);
          setError(`Sign in status: ${completeSignIn.status}. Additional steps required.`);
        }
      }
    } catch (err: any) {
      console.error("[Clerk Auth] Exception caught during handleEmailAuth:", err);
      handleClerkError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded) return;
    setError(null);
    setLoading(true);

    try {
      console.log("[Clerk Signup] Calling signUp.attemptEmailAddressVerification({ code }) with code:", code);
      const verification = await signUp.attemptEmailAddressVerification({
        code,
      });

      console.log("[Clerk Signup] attemptEmailAddressVerification() raw response:", verification);
      console.log("[Clerk Signup] verification.status:", verification.status);
      console.log("[Clerk Signup] verification.createdSessionId:", verification.createdSessionId);

      if (verification.status === "complete") {
        console.log("[Clerk Signup] Verification complete. Setting active session...");
        await setActiveSignUp({ session: verification.createdSessionId });
        onClose();
        navigate("/dashboard");
      } else {
        const errorMsg = `Sign up incomplete. Status: ${verification.status}. Unverified fields: ${JSON.stringify(verification.unverifiedFields)}`;
        console.warn("[Clerk Signup] Verification status not complete:", verification);
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error("[Clerk Signup] Exception caught during attemptEmailAddressVerification:", err);
      handleClerkError(err);
      throw err; // Propagate exception
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded) return;
    setError(null);
    setLoading(true);

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setMode("verify_reset");
    } catch (err) {
      handleClerkError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded) return;
    setError(null);
    setLoading(true);

    try {
      console.log("[Clerk ResetPassword] Calling signIn.attemptFirstFactor()");
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });
      console.log("[Clerk ResetPassword] attemptFirstFactor() response:", result);

      if (result.status === "complete") {
        console.log("[Clerk ResetPassword] Password reset complete. Setting active session...");
        await setActiveSignIn({ session: result.createdSessionId });
        onClose();
        navigate("/dashboard");
      } else {
        const errorMsg = `Password reset incomplete. Status: ${result.status}`;
        console.warn("[Clerk ResetPassword] Status is not complete:", result);
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error("[Clerk ResetPassword] Exception caught during handleResetPassword:", err);
      handleClerkError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-md"
          >
            <div className="glass-card p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-display font-bold text-foreground">
                    {mode === "signin" && "Welcome back"}
                    {mode === "signup" && "Create account"}
                    {mode === "forgot_password" && "Reset password"}
                    {mode === "verify_reset" && "Verify reset code"}
                    {mode === "verify_signup" && "Verify your email"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {mode === "signin" && "Sign in to your Starox workspace"}
                    {mode === "signup" && "Start building with AI intelligence"}
                    {mode === "forgot_password" && "Enter your email to receive a password reset code"}
                    {mode === "verify_reset" && "Enter the code and your new password"}
                    {mode === "verify_signup" && "Enter the 6-digit code sent to your email"}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2.5 mb-5"
                >
                  {error}
                </motion.div>
              )}

              {/* Social Login Section (Only visible for Sign In / Sign Up modes) */}
              {(mode === "signin" || mode === "signup") && (
                <>
                  <div className="flex flex-col gap-2 mb-4">
                    <button
                      onClick={() => handleOAuth("google")}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border/50 bg-surface text-sm text-foreground hover:bg-surface-hover transition-colors disabled:opacity-50"
                    >
                      {/* Google SVG icon */}
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </button>
                    <button
                      onClick={() => handleOAuth("github")}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border/50 bg-surface text-sm text-foreground hover:bg-surface-hover transition-colors disabled:opacity-50"
                    >
                      <Github className="w-4 h-4" />
                      Continue with GitHub
                    </button>
                    <button
                      onClick={() => handleOAuth("apple")}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border/50 bg-surface text-sm text-foreground hover:bg-surface-hover transition-colors disabled:opacity-50"
                    >
                      {/* Apple SVG icon */}
                      <svg className="w-4 h-4 fill-current text-foreground" viewBox="0 0 24 24">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.18.67-2.9 1.49-.62.7-1.16 1.83-1.01 2.96 1.1.09 2.21-.55 2.92-1.39" />
                      </svg>
                      Continue with Apple
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px bg-border/50" />
                    <span className="text-xs text-muted-foreground">or continue with email</span>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>
                </>
              )}

              {/* email+password forms */}
              {(mode === "signin" || mode === "signup") && (
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  {mode === "signup" && (
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={mode === "signup" ? "email" : "text"}
                      placeholder={mode === "signup" ? "Email address" : "Email or Username"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>

                  {mode === "signup" && (
                    <div className="space-y-1">
                      <div className="relative">
                        <AtSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Username"
                          value={username}
                          onChange={(e) => handleUsernameChange(e.target.value)}
                          required
                          className={`w-full pl-10 pr-4 py-3 rounded-xl bg-surface border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none transition-colors ${
                            usernameError ? "border-red-400/50 focus:border-red-400" : "border-border/50 focus:border-primary/50"
                          }`}
                        />
                      </div>
                      {usernameError && (
                        <p className="text-[11px] text-red-400 px-1">{usernameError}</p>
                      )}
                    </div>
                  )}

                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-surface border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {mode === "signup" && (
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-surface border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                  )}

                  {mode === "signin" && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => switchMode("forgot_password")}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl gradient-starox text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {mode === "signin" ? "Sign In" : "Continue"}
                  </button>
                </form>
              )}

              {/* Sign up Verification flow */}
              {mode === "verify_signup" && (
                <form onSubmit={handleVerifySignUp} className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="6-digit verification code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                      maxLength={6}
                      className="w-full px-4 py-3 rounded-xl bg-surface border border-border/50 text-sm text-foreground text-center tracking-widest placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl gradient-starox text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Verify Email
                  </button>
                  <p className="text-center text-xs text-muted-foreground">
                    Didn't receive a code?{" "}
                    <button
                      type="button"
                      onClick={async () => {
                        if (signUp) await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
                      }}
                      className="text-primary hover:underline font-medium"
                    >
                      Resend Code
                    </button>
                  </p>
                </form>
              )}

              {/* Forgot password: request code flow */}
              {mode === "forgot_password" && (
                <form onSubmit={handleSendResetCode} className="space-y-4">
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl gradient-starox text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Send Reset Code
                  </button>
                  <p className="text-center text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => switchMode("signin")}
                      className="text-primary hover:underline font-medium"
                    >
                      Back to Sign In
                    </button>
                  </p>
                </form>
              )}

              {/* Forgot password: verify and reset flow */}
              {mode === "verify_reset" && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Verification code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-surface border border-border/50 text-sm text-foreground text-center tracking-widest placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="New password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-surface border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl gradient-starox text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Reset Password
                  </button>
                </form>
              )}

              {/* Switch mode links */}
              {(mode === "signin" || mode === "signup") && (
                <p className="text-center text-xs text-muted-foreground mt-5">
                  {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button
                    onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
                    className="text-primary hover:underline font-medium"
                  >
                    {mode === "signin" ? "Sign up" : "Sign in"}
                  </button>
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default AuthModal;

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Eye,
  EyeOff,
  Loader2,
  MessageCircle,
  Phone,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

type PendingOp =
  | { mode: "login"; username: string; password: string }
  | { mode: "register"; username: string; password: string };

type FormError = string | null;

type RegMode = "username" | "phone";

const COUNTRY_CODES = [
  { code: "+1", label: "🇺🇸 +1 (US/Canada)" },
  { code: "+7", label: "🇷🇺 +7 (Russia)" },
  { code: "+20", label: "🇪🇬 +20 (Egypt)" },
  { code: "+27", label: "🇿🇦 +27 (South Africa)" },
  { code: "+31", label: "🇳🇱 +31 (Netherlands)" },
  { code: "+33", label: "🇫🇷 +33 (France)" },
  { code: "+34", label: "🇪🇸 +34 (Spain)" },
  { code: "+39", label: "🇮🇹 +39 (Italy)" },
  { code: "+44", label: "🇬🇧 +44 (UK)" },
  { code: "+49", label: "🇩🇪 +49 (Germany)" },
  { code: "+52", label: "🇲🇽 +52 (Mexico)" },
  { code: "+55", label: "🇧🇷 +55 (Brazil)" },
  { code: "+61", label: "🇦🇺 +61 (Australia)" },
  { code: "+62", label: "🇮🇩 +62 (Indonesia)" },
  { code: "+63", label: "🇵🇭 +63 (Philippines)" },
  { code: "+64", label: "🇳🇿 +64 (New Zealand)" },
  { code: "+81", label: "🇯🇵 +81 (Japan)" },
  { code: "+82", label: "🇰🇷 +82 (South Korea)" },
  { code: "+86", label: "🇨🇳 +86 (China)" },
  { code: "+90", label: "🇹🇷 +90 (Turkey)" },
  { code: "+91", label: "🇮🇳 +91 (India)" },
  { code: "+92", label: "🇵🇰 +92 (Pakistan)" },
  { code: "+234", label: "🇳🇬 +234 (Nigeria)" },
  { code: "+254", label: "🇰🇪 +254 (Kenya)" },
  { code: "+880", label: "🇧🇩 +880 (Bangladesh)" },
  { code: "+966", label: "🇸🇦 +966 (Saudi Arabia)" },
  { code: "+971", label: "🇦🇪 +971 (UAE)" },
];

export function LoginPage() {
  const { login, clear, identity, loginStatus } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();

  // Login tab state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<FormError>(null);

  // Register tab state
  const [regMode, setRegMode] = useState<RegMode>("username");
  const [regUsername, setRegUsername] = useState("");
  const [regCountryCode, setRegCountryCode] = useState("+1");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regError, setRegError] = useState<FormError>(null);

  // Pending credential operation (set before II popup opens)
  const [pendingOp, setPendingOp] = useState<PendingOp | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const pendingOpRef = useRef<PendingOp | null>(null);
  pendingOpRef.current = pendingOp;

  // Keep mutable refs so the effect doesn't need to re-run when these change
  const clearRef = useRef(clear);
  clearRef.current = clear;
  const isVerifyingRef = useRef(isVerifying);
  isVerifyingRef.current = isVerifying;

  const isLoggingIn = loginStatus === "logging-in";
  const isBusy = isLoggingIn || isVerifying;

  // After II login succeeds and actor is ready, execute the pending credential op
  useEffect(() => {
    const op = pendingOpRef.current;
    if (!identity || !actor || actorFetching || !op || isVerifyingRef.current)
      return;

    let cancelled = false;
    setIsVerifying(true);

    (async () => {
      try {
        if (op.mode === "login") {
          const ok = await actor.loginWithCredentials(op.username, op.password);
          if (cancelled) return;
          if (!ok) {
            setLoginError("Invalid username or password. Please try again.");
            await clearRef.current();
            setPendingOp(null);
          }
          // If ok === true, App.tsx will see identity truthy and navigate away
        } else {
          // register
          await actor.registerWithCredentials(op.username, op.password);
          if (cancelled) return;
          // Success — App.tsx handles navigation
          setPendingOp(null);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        if (op.mode === "login") {
          setLoginError(
            message.includes("not found") ? "Account not found." : message,
          );
          await clearRef.current();
        } else {
          setRegError(
            message.toLowerCase().includes("taken") ||
              message.toLowerCase().includes("exist")
              ? "That username is already taken."
              : message,
          );
          await clearRef.current();
        }
        setPendingOp(null);
      } finally {
        if (!cancelled) setIsVerifying(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [identity, actor, actorFetching]);

  // --- Handlers ---

  const handleLogin = () => {
    setLoginError(null);
    const username = loginUsername.trim();
    if (!username) {
      setLoginError("Username or phone number is required.");
      return;
    }
    if (!loginPassword) {
      setLoginError("Password is required.");
      return;
    }

    setPendingOp({ mode: "login", username, password: loginPassword });
    login();
  };

  const handleRegister = () => {
    setRegError(null);

    let username = "";
    if (regMode === "username") {
      username = regUsername.trim();
      if (!username) {
        setRegError("Username is required.");
        return;
      }
      if (username.length < 3) {
        setRegError("Username must be at least 3 characters.");
        return;
      }
    } else {
      // phone mode
      const digits = regPhone.replace(/[\s\-().]/g, "");
      if (!digits || digits.length < 7) {
        setRegError("Phone number must be at least 7 digits.");
        return;
      }
      if (!/^\d+$/.test(digits)) {
        setRegError("Phone number must contain only digits.");
        return;
      }
      username = `${regCountryCode}${digits}`;
    }

    if (!regPassword) {
      setRegError("Password is required.");
      return;
    }
    if (regPassword.length < 6) {
      setRegError("Password must be at least 6 characters.");
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError("Passwords do not match.");
      return;
    }

    setPendingOp({ mode: "register", username, password: regPassword });
    login();
  };

  const features = [
    {
      icon: Users,
      label: "Connect with Friends",
      desc: "Build your network and stay in touch",
    },
    {
      icon: MessageCircle,
      label: "Share Your Story",
      desc: "Post updates, photos, and thoughts",
    },
    {
      icon: Bell,
      label: "Stay Informed",
      desc: "Never miss a notification or update",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Panel — Brand */}
      <div className="relative flex flex-col justify-center items-center md:items-start px-8 py-12 md:py-0 md:w-1/2 lg:w-3/5 overflow-hidden">
        {/* Background gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.32 0.18 268) 0%, oklch(0.48 0.22 250) 50%, oklch(0.56 0.18 220) 100%)",
          }}
        />
        {/* Decorative circles */}
        <div
          className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full opacity-20"
          style={{ background: "oklch(0.75 0.2 220)" }}
        />
        <div
          className="absolute bottom-[-60px] left-[-60px] w-60 h-60 rounded-full opacity-15"
          style={{ background: "oklch(0.65 0.22 260)" }}
        />

        <div className="relative z-10 max-w-lg mx-auto md:mx-0 md:pl-8 lg:pl-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/assets/generated/sconnect-logo-transparent.dim_200x200.png"
                alt="S Connect logo"
                className="w-12 h-12 object-contain"
              />
              <span className="text-3xl font-display font-bold text-white tracking-tight">
                S Connect
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-white leading-tight mb-4">
              Connect with the world around you
            </h1>
            <p className="text-lg text-white/80 font-body mb-10">
              Share moments, build connections, and be part of a community that
              matters.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.1, duration: 0.5 }}
                className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4"
              >
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm font-display">
                    {f.label}
                  </p>
                  <p className="text-white/70 text-xs font-body mt-0.5">
                    {f.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Auth */}
      <div className="flex flex-col justify-center items-center px-8 py-12 md:w-1/2 lg:w-2/5 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="bg-card rounded-2xl p-8 card-shadow">
            {/* Logo */}
            <div className="text-center mb-6">
              <img
                src="/assets/generated/sconnect-logo-transparent.dim_200x200.png"
                alt="S Connect logo"
                className="w-14 h-14 mx-auto mb-3 object-contain"
              />
              <h2 className="text-2xl font-display font-bold text-foreground">
                Welcome to SocialSpace
              </h2>
              <p className="text-muted-foreground text-sm font-body mt-1">
                Sign in or create your account
              </p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid grid-cols-2 w-full mb-5 rounded-xl">
                <TabsTrigger
                  value="login"
                  className="rounded-lg text-sm font-semibold"
                >
                  Log In
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="rounded-lg text-sm font-semibold"
                >
                  Create Account
                </TabsTrigger>
              </TabsList>

              {/* ── Login Tab ── */}
              <TabsContent value="login">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLogin();
                  }}
                  className="space-y-4"
                  noValidate
                >
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="login-username"
                      className="text-sm font-medium"
                    >
                      Username or Phone Number
                    </Label>
                    <Input
                      id="login-username"
                      type="text"
                      placeholder="username or +1234567890"
                      autoComplete="username"
                      value={loginUsername}
                      onChange={(e) => {
                        setLoginUsername(e.target.value);
                        setLoginError(null);
                      }}
                      disabled={isBusy}
                      className="h-11 rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">
                      You can log in with your phone number as username.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="login-password"
                      className="text-sm font-medium"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          setLoginError(null);
                        }}
                        disabled={isBusy}
                        className="h-11 rounded-xl pr-10"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowLoginPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={
                          showLoginPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showLoginPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {loginError && (
                      <motion.p
                        key="login-err"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-sm text-destructive font-medium"
                        role="alert"
                      >
                        {loginError}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <Button
                    type="submit"
                    disabled={isBusy}
                    className="w-full h-11 text-base font-semibold rounded-xl mt-1"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
                      color: "white",
                    }}
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isLoggingIn ? "Opening sign-in…" : "Verifying…"}
                      </>
                    ) : (
                      "Log In"
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* ── Register Tab ── */}
              <TabsContent value="register">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleRegister();
                  }}
                  className="space-y-4"
                  noValidate
                >
                  {/* Mode toggle */}
                  <div className="flex rounded-xl overflow-hidden border border-border">
                    <button
                      type="button"
                      onClick={() => {
                        setRegMode("username");
                        setRegError(null);
                      }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold transition-colors ${
                        regMode === "username"
                          ? "text-white"
                          : "text-muted-foreground hover:text-foreground bg-transparent"
                      }`}
                      style={
                        regMode === "username"
                          ? {
                              background:
                                "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
                            }
                          : {}
                      }
                    >
                      <Users className="w-3.5 h-3.5" />
                      Username
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRegMode("phone");
                        setRegError(null);
                      }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold transition-colors ${
                        regMode === "phone"
                          ? "text-white"
                          : "text-muted-foreground hover:text-foreground bg-transparent"
                      }`}
                      style={
                        regMode === "phone"
                          ? {
                              background:
                                "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
                            }
                          : {}
                      }
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Phone Number
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {regMode === "username" ? (
                      <motion.div
                        key="username-field"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-1.5"
                      >
                        <Label
                          htmlFor="reg-username"
                          className="text-sm font-medium"
                        >
                          Username
                        </Label>
                        <Input
                          id="reg-username"
                          type="text"
                          placeholder="choose_a_username"
                          autoComplete="username"
                          value={regUsername}
                          onChange={(e) => {
                            setRegUsername(e.target.value);
                            setRegError(null);
                          }}
                          disabled={isBusy}
                          className="h-11 rounded-xl"
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="phone-field"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-1.5"
                      >
                        <Label className="text-sm font-medium">
                          Phone Number
                        </Label>
                        <div className="flex gap-2">
                          <select
                            value={regCountryCode}
                            onChange={(e) => {
                              setRegCountryCode(e.target.value);
                              setRegError(null);
                            }}
                            disabled={isBusy}
                            className="h-11 rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 min-w-0 w-36 flex-shrink-0"
                          >
                            {COUNTRY_CODES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                          <Input
                            type="tel"
                            placeholder="7001234567"
                            autoComplete="tel-national"
                            value={regPhone}
                            onChange={(e) => {
                              setRegPhone(e.target.value);
                              setRegError(null);
                            }}
                            disabled={isBusy}
                            className="h-11 rounded-xl flex-1 min-w-0"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Enter digits only — no spaces or dashes needed.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="reg-password"
                      className="text-sm font-medium"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showRegPassword ? "text" : "password"}
                        placeholder="min. 6 characters"
                        autoComplete="new-password"
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          setRegError(null);
                        }}
                        disabled={isBusy}
                        className="h-11 rounded-xl pr-10"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowRegPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={
                          showRegPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showRegPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="reg-confirm"
                      className="text-sm font-medium"
                    >
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="reg-confirm"
                        type={showRegConfirm ? "text" : "password"}
                        placeholder="repeat your password"
                        autoComplete="new-password"
                        value={regConfirm}
                        onChange={(e) => {
                          setRegConfirm(e.target.value);
                          setRegError(null);
                        }}
                        disabled={isBusy}
                        className="h-11 rounded-xl pr-10"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowRegConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={
                          showRegConfirm ? "Hide password" : "Show password"
                        }
                      >
                        {showRegConfirm ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {regError && (
                      <motion.p
                        key="reg-err"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-sm text-destructive font-medium"
                        role="alert"
                      >
                        {regError}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <Button
                    type="submit"
                    disabled={isBusy}
                    className="w-full h-11 text-base font-semibold rounded-xl mt-1"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
                      color: "white",
                    }}
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isLoggingIn ? "Opening sign-in…" : "Creating account…"}
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-5 pt-4 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                Secured by{" "}
                <span className="font-semibold text-foreground/70">
                  Internet Identity
                </span>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

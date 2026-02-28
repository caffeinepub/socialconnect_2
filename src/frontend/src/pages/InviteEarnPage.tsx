import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Copy,
  Gift,
  Link2,
  Share2,
  Star,
  Trophy,
  UserPlus,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useGetMyReferralCode, useGetReferralStats } from "../hooks/useQueries";

const GOAL = 10;

export function InviteEarnPage() {
  const { data: referralCode, isLoading: codeLoading } = useGetMyReferralCode();
  const { data: stats, isLoading: statsLoading } = useGetReferralStats();

  const isLoading = codeLoading || statsLoading;

  const code = referralCode ?? stats?.referralCode ?? "";
  const totalReferrals = Number(stats?.totalReferrals ?? 0n);
  const verifiedReferrals = Number(stats?.verifiedReferrals ?? 0n);
  const balance = Number(stats?.balance ?? 0n);
  const progressPct = Math.min((verifiedReferrals / GOAL) * 100, 100);
  const rewardEarned = verifiedReferrals >= GOAL;

  const shareUrl = code
    ? `${window.location.origin}?ref=${code}`
    : window.location.origin;

  // Celebrate when reward is earned
  useEffect(() => {
    if (rewardEarned && balance > 0) {
      toast.success(`🎉 Congratulations! You've earned ₹${balance}!`, {
        duration: 5000,
      });
    }
  }, [rewardEarned, balance]);

  const handleCopyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Referral code copied!");
    } catch {
      toast.error("Could not copy — please copy manually.");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied!");
    } catch {
      toast.error("Could not copy — please copy manually.");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on S Connect!",
          text: "Sign up using my referral link and join S Connect — a great social community!",
          url: shareUrl,
        });
      } catch {
        // User cancelled or share failed — silently ignore
      }
    } else {
      await handleCopyLink();
    }
  };

  const steps = [
    {
      icon: Share2,
      title: "Share your link",
      desc: "Send your unique referral link to friends",
    },
    {
      icon: UserPlus,
      title: "Friend joins & verifies",
      desc: "They sign up and complete their profile",
    },
    {
      icon: Trophy,
      title: "Earn ₹100 reward",
      desc: "Reach 10 verified referrals to claim your prize",
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.65 0.22 48), oklch(0.72 0.20 62))",
            }}
          >
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground leading-tight">
              Invite &amp; Earn
            </h1>
            <p className="text-sm text-muted-foreground font-body">
              Invite 10 friends who join &amp; verify — earn{" "}
              <span className="font-semibold text-foreground">₹100</span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Reward Banner */}
      {rewardEarned && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.38 0.14 148), oklch(0.46 0.18 152))",
          }}
        >
          <Star className="w-8 h-8 text-yellow-300 flex-shrink-0 fill-yellow-300" />
          <div>
            <p className="font-display font-bold text-white text-lg">
              🎉 Reward Earned!
            </p>
            <p className="text-white/80 text-sm">
              You've earned{" "}
              <span className="font-bold text-white">₹{balance}</span> for
              inviting {verifiedReferrals} verified friends.
            </p>
          </div>
        </motion.div>
      )}

      {/* Referral Code Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="bg-card rounded-2xl p-5 shadow-sm border border-border"
      >
        <h2 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
          <Copy className="w-4 h-4" style={{ color: "oklch(0.55 0.18 262)" }} />
          Your Referral Code
        </h2>

        {isLoading ? (
          <Skeleton className="h-14 w-full rounded-xl" />
        ) : (
          <div className="flex items-center gap-3">
            <div
              className="flex-1 font-mono text-xl font-bold tracking-widest rounded-xl px-5 py-3.5 text-center select-all"
              style={{
                background: "oklch(0.18 0.04 262 / 0.5)",
                color: "oklch(0.75 0.18 262)",
                border: "1.5px dashed oklch(0.55 0.18 262 / 0.5)",
                letterSpacing: "0.18em",
              }}
            >
              {code || "Loading..."}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyCode}
              disabled={!code}
              className="h-12 w-12 rounded-xl flex-shrink-0"
              aria-label="Copy referral code"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        )}
      </motion.div>

      {/* Share Link Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-card rounded-2xl p-5 shadow-sm border border-border"
      >
        <h2 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
          <Link2
            className="w-4 h-4"
            style={{ color: "oklch(0.55 0.18 262)" }}
          />
          Share Your Link
        </h2>

        {isLoading ? (
          <Skeleton className="h-12 w-full rounded-xl" />
        ) : (
          <>
            <div
              className="rounded-xl px-4 py-3 text-sm font-mono text-muted-foreground truncate mb-3"
              style={{
                background: "oklch(0.18 0.03 262 / 0.4)",
                border: "1px solid oklch(0.35 0.06 262 / 0.4)",
              }}
            >
              {shareUrl}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2 rounded-xl h-10"
                onClick={handleCopyLink}
              >
                <Copy className="w-4 h-4" />
                Copy Link
              </Button>
              <Button
                className="flex-1 gap-2 rounded-xl h-10 text-white"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
                }}
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
          </>
        )}
      </motion.div>

      {/* Progress Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="bg-card rounded-2xl p-5 shadow-sm border border-border"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
            <Trophy
              className="w-4 h-4"
              style={{ color: "oklch(0.65 0.22 48)" }}
            />
            Your Referral Progress
          </h2>
          {!isLoading && (
            <Badge
              variant={rewardEarned ? "default" : "secondary"}
              className="font-mono text-sm px-3 py-1 rounded-full"
              style={
                rewardEarned
                  ? {
                      background:
                        "linear-gradient(135deg, oklch(0.38 0.14 148), oklch(0.46 0.18 152))",
                      color: "white",
                    }
                  : undefined
              }
            >
              {rewardEarned ? "🏆 Complete!" : `${verifiedReferrals}/${GOAL}`}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <>
            <div className="mb-2 flex justify-between text-sm text-muted-foreground">
              <span>
                <span className="font-bold text-foreground">
                  {verifiedReferrals}
                </span>{" "}
                / {GOAL} verified referrals
              </span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <Progress
              value={progressPct}
              className="h-3 rounded-full"
              style={
                {
                  "--progress-foreground": rewardEarned
                    ? "oklch(0.55 0.18 148)"
                    : "oklch(0.55 0.18 262)",
                } as React.CSSProperties
              }
            />

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div
                className="rounded-xl p-3 text-center"
                style={{
                  background: "oklch(0.18 0.03 262 / 0.4)",
                  border: "1px solid oklch(0.35 0.06 262 / 0.3)",
                }}
              >
                <p
                  className="text-2xl font-display font-bold"
                  style={{ color: "oklch(0.7 0.18 262)" }}
                >
                  {totalReferrals}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total Signups
                </p>
              </div>
              <div
                className="rounded-xl p-3 text-center"
                style={{
                  background: "oklch(0.18 0.03 148 / 0.4)",
                  border: "1px solid oklch(0.35 0.06 148 / 0.3)",
                }}
              >
                <p
                  className="text-2xl font-display font-bold"
                  style={{ color: "oklch(0.65 0.18 148)" }}
                >
                  {verifiedReferrals}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Verified</p>
              </div>
            </div>

            {!rewardEarned && (
              <p className="text-sm text-muted-foreground mt-3 text-center">
                {GOAL - verifiedReferrals} more verified{" "}
                {GOAL - verifiedReferrals === 1 ? "friend" : "friends"} needed
                to earn{" "}
                <span className="font-semibold text-foreground">₹100</span>
              </p>
            )}
          </>
        )}
      </motion.div>

      {/* Balance Card */}
      {!isLoading && balance > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.65 0.22 48 / 0.15), oklch(0.72 0.20 62 / 0.15))",
            border: "1px solid oklch(0.65 0.22 48 / 0.35)",
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.65 0.22 48), oklch(0.72 0.20 62))",
            }}
          >
            <span className="text-xl font-bold text-white">₹</span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Your Balance</p>
            <p className="text-3xl font-display font-bold text-foreground">
              ₹{balance}
            </p>
          </div>
        </motion.div>
      )}

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="bg-card rounded-2xl p-5 shadow-sm border border-border"
      >
        <h2 className="font-display font-semibold text-foreground mb-4">
          How it works
        </h2>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={step.title} className="flex items-start gap-4">
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background:
                      i === 2
                        ? "linear-gradient(135deg, oklch(0.65 0.22 48), oklch(0.72 0.20 62))"
                        : "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
                  }}
                >
                  <step.icon className="w-4 h-4 text-white" />
                </div>
                {i < steps.length - 1 && (
                  <div
                    className="w-0.5 h-4 rounded-full"
                    style={{ background: "oklch(0.35 0.06 262 / 0.5)" }}
                  />
                )}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold font-mono px-1.5 py-0.5 rounded-md"
                    style={{
                      background: "oklch(0.25 0.06 262 / 0.5)",
                      color: "oklch(0.65 0.16 262)",
                    }}
                  >
                    Step {i + 1}
                  </span>
                  <p className="font-semibold text-sm text-foreground">
                    {step.title}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-4 rounded-xl p-4 flex items-center gap-3"
          style={{
            background: "oklch(0.22 0.06 262 / 0.3)",
            border: "1px solid oklch(0.45 0.12 262 / 0.3)",
          }}
        >
          <CheckCircle2
            className="w-5 h-5 flex-shrink-0"
            style={{ color: "oklch(0.65 0.18 148)" }}
          />
          <p className="text-sm text-muted-foreground">
            A referral is counted as{" "}
            <span className="font-semibold text-foreground">verified</span> once
            the invited user creates an account <em>and</em> completes their
            profile setup.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

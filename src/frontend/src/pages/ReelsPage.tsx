import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Film,
  Loader2,
  Pause,
  Play,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob, type Reel, type UserProfile } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCreateReel,
  useDeleteReel,
  useGetAllReels,
} from "../hooks/useQueries";
import { useUserProfileCache } from "../hooks/useUserProfileCache";

function getInitials(name: string | undefined | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Upload Reel Panel ─────────────────────────────────────────────────────

function UploadReelPanel({ onDone }: { onDone: () => void }) {
  const createReel = useCreateReel();
  const [title, setTitle] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!title.trim() || !videoFile) return;
    setUploading(true);
    try {
      const bytes = new Uint8Array(await videoFile.arrayBuffer());
      const blob = ExternalBlob.fromBytes(bytes);
      await createReel.mutateAsync({ title: title.trim(), video: blob });
      toast.success("Reel uploaded!");
      setTitle("");
      setVideoFile(null);
      onDone();
    } catch {
      toast.error("Failed to upload reel");
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-card rounded-2xl card-shadow p-5 space-y-4 mb-4"
    >
      <div className="flex items-center justify-between">
        <p className="font-display font-bold text-base">Upload New Reel</p>
        <button
          type="button"
          onClick={onDone}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        <Label className="font-semibold">Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your reel a title…"
          className="rounded-xl"
          maxLength={80}
        />
      </div>
      <div>
        <Label className="font-semibold mb-2 block">Video</Label>
        {videoFile ? (
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-xl">
            <span className="text-sm font-semibold text-primary truncate flex-1">
              {videoFile.name}
            </span>
            <button
              type="button"
              onClick={() => setVideoFile(null)}
              className="ml-2 text-muted-foreground hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="w-full h-28 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
          >
            <Film className="w-7 h-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Click to select a video file
            </p>
          </button>
        )}
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="sr-only"
          onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <Button
        onClick={handleUpload}
        disabled={uploading || !title.trim() || !videoFile}
        className="w-full rounded-xl gap-2 font-semibold"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
          color: "white",
        }}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Post Reel
          </>
        )}
      </Button>
    </motion.div>
  );
}

// ── Single Reel Card ──────────────────────────────────────────────────────

interface ReelCardProps {
  reel: Reel;
  isOwner: boolean;
  onDelete: (id: bigint) => void;
  isDeleting: boolean;
}

function ReelCard({ reel, isOwner, onDelete, isDeleting }: ReelCardProps) {
  const { getProfile } = useUserProfileCache();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getProfile(reel.creatorId).then(setProfile);
  }, [reel.creatorId, getProfile]);

  // IntersectionObserver autoplay
  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
          setPlaying(true);
        } else {
          video.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.6 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const avatarUrl = profile?.avatar?.getDirectURL();
  const initials = getInitials(profile?.displayName);
  const videoUrl = reel.video.getDirectURL();

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl card-shadow overflow-hidden"
    >
      {/* Video player */}
      <div className="relative bg-black aspect-[9/16] max-h-[60vh] sm:aspect-video sm:max-h-none">
        <video
          ref={videoRef}
          src={videoUrl}
          loop
          muted={muted}
          playsInline
          className="w-full h-full object-cover"
          onClick={togglePlay}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") togglePlay();
          }}
        />

        {/* Play/pause overlay */}
        <AnimatePresence>
          {!playing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls overlay */}
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            {muted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            {playing ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Delete button */}
        {isOwner && (
          <button
            type="button"
            onClick={() => onDelete(reel.id)}
            disabled={isDeleting}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500/80 transition-colors"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex items-center gap-3">
        <Avatar className="h-9 w-9 flex-shrink-0">
          {avatarUrl && <AvatarImage src={avatarUrl} />}
          <AvatarFallback
            className="text-white text-xs font-display font-semibold"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
            }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm text-foreground truncate">
            {reel.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {profile?.displayName ??
              `${reel.creatorId.toString().slice(0, 12)}…`}
          </p>
        </div>
        <Film className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
    </motion.div>
  );
}

// ── Reels Page ────────────────────────────────────────────────────────────

export function ReelsPage() {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal();
  const { data: reels = [], isLoading } = useGetAllReels();
  const deleteReel = useDeleteReel();
  const [showUpload, setShowUpload] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const myPrincipalStr = myPrincipal?.toString();

  const sortedReels = [...reels].sort((a, b) =>
    Number(b.timestamp - a.timestamp),
  );

  const handleDelete = useCallback(
    async (id: bigint) => {
      setDeleting(id.toString());
      try {
        await deleteReel.mutateAsync(id);
        toast.success("Reel deleted");
      } catch {
        toast.error("Failed to delete reel");
      } finally {
        setDeleting(null);
      }
    },
    [deleteReel],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Film
              className="w-5 h-5"
              style={{ color: "oklch(0.45 0.18 262)" }}
            />
            Reels
          </h1>
          <p className="text-sm text-muted-foreground">
            Short videos from the community
          </p>
        </div>
        <Button
          onClick={() => setShowUpload(!showUpload)}
          className="rounded-xl gap-2 font-semibold"
          style={{
            background: showUpload
              ? undefined
              : "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
            color: showUpload ? undefined : "white",
          }}
          variant={showUpload ? "outline" : "default"}
        >
          {showUpload ? (
            <>
              <X className="w-4 h-4" />
              Cancel
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload
            </>
          )}
        </Button>
      </div>

      {/* Upload panel */}
      <AnimatePresence>
        {showUpload && <UploadReelPanel onDone={() => setShowUpload(false)} />}
      </AnimatePresence>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-card rounded-2xl overflow-hidden card-shadow"
            >
              <div className="aspect-video bg-secondary animate-pulse" />
              <div className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="w-32 h-3.5 rounded bg-secondary animate-pulse" />
                  <div className="w-20 h-3 rounded bg-secondary animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sortedReels.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl card-shadow p-12 text-center"
        >
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "oklch(0.94 0.04 250)" }}
          >
            <Film
              className="w-8 h-8"
              style={{ color: "oklch(0.45 0.18 262)" }}
            />
          </div>
          <p className="font-display font-bold text-lg text-foreground">
            No reels yet
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Be the first to share a short video with the community!
          </p>
          <Button
            onClick={() => setShowUpload(true)}
            className="mt-4 rounded-xl gap-2 font-semibold"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
              color: "white",
            }}
          >
            <Upload className="w-4 h-4" />
            Upload First Reel
          </Button>
        </motion.div>
      )}

      {/* Reels grid */}
      {!isLoading && sortedReels.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sortedReels.map((reel) => (
            <ReelCard
              key={reel.id.toString()}
              reel={reel}
              isOwner={reel.creatorId.toString() === myPrincipalStr}
              onDelete={handleDelete}
              isDeleting={deleting === reel.id.toString()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

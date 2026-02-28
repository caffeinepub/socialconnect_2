import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Image, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import type { UserProfile } from "../backend";
import { useCreatePost } from "../hooks/useQueries";
import { UserAvatar } from "./UserAvatar";

interface PostComposerProps {
  currentProfile: UserProfile | null;
}

export function PostComposer({ currentProfile }: PostComposerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createPost = useCreatePost();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!content.trim() && !imageFile) return;

    let blob: ExternalBlob | null = null;
    if (imageFile) {
      const bytes = new Uint8Array(await imageFile.arrayBuffer());
      blob = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) => {
        setUploadProgress(pct);
      });
    }

    try {
      await createPost.mutateAsync({ content: content.trim(), image: blob });
      setContent("");
      removeImage();
      setIsExpanded(false);
      setUploadProgress(0);
      toast.success("Post shared!");
    } catch {
      toast.error("Failed to create post");
      setUploadProgress(0);
    }
  };

  const canPost =
    (content.trim().length > 0 || imageFile !== null) && !createPost.isPending;

  return (
    <div className="post-card p-4">
      {/* Collapsed state */}
      {!isExpanded && (
        <div className="flex items-center gap-3">
          <UserAvatar profile={currentProfile} size="md" />
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className={cn(
              "flex-1 text-left px-4 py-2.5 rounded-full text-sm font-body",
              "bg-muted/70 hover:bg-muted text-muted-foreground transition-colors",
            )}
          >
            What&apos;s on your mind,{" "}
            {currentProfile?.displayName?.split(" ")[0] ?? "there"}?
          </button>
        </div>
      )}

      {/* Expanded state */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start gap-3 mb-3">
              <UserAvatar profile={currentProfile} size="md" />
              <div className="flex-1">
                <p className="font-semibold text-sm font-display text-foreground">
                  {currentProfile?.displayName ?? "You"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  setContent("");
                  removeImage();
                }}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="resize-none border-0 text-base p-0 focus-visible:ring-0 min-h-[80px] bg-transparent font-body"
              rows={3}
              autoFocus
              maxLength={1000}
            />

            {/* Image preview */}
            {imagePreview && (
              <div className="relative mt-3 rounded-xl overflow-hidden border border-border/50">
                <img
                  src={imagePreview}
                  alt="Upload preview"
                  className="w-full max-h-[300px] object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-foreground/80 hover:bg-foreground text-background flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Upload progress */}
            {createPost.isPending &&
              uploadProgress > 0 &&
              uploadProgress < 100 && (
                <div className="mt-3">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${uploadProgress}%`,
                        background:
                          "linear-gradient(90deg, oklch(0.42 0.18 265), oklch(0.58 0.16 220))",
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
              <div className="flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="sr-only"
                  id="post-image-upload"
                />
                <label
                  htmlFor="post-image-upload"
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors",
                    "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Image className="w-4 h-4" />
                  Photo
                </label>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {content.length}/1000
                </span>
                <Button
                  onClick={handleSubmit}
                  disabled={!canPost}
                  className="rounded-xl px-5 font-semibold"
                  style={{
                    background: canPost
                      ? "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))"
                      : undefined,
                    color: canPost ? "white" : undefined,
                  }}
                >
                  {createPost.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    "Share"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

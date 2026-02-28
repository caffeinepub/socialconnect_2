import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Principal } from "@icp-sdk/core/principal";
import {
  ChevronDown,
  ChevronUp,
  Heart,
  MessageCircle,
  Send,
  Share2,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend";
import type { Comment, Post } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddComment,
  useAddEmojiReaction,
  useCheckCallerHasLiked,
  useDeleteComment,
  useDeletePost,
  useGetCommentsByPost,
  useGetEmojiReactions,
  useGetLikesCount,
  useLikeOrUnlikePost,
} from "../hooks/useQueries";
import { useUserProfileCache } from "../hooks/useUserProfileCache";
import { formatRelativeTime } from "../utils/formatTime";
import { UserAvatar } from "./UserAvatar";

interface PostCardProps {
  post: Post;
  onDelete?: () => void;
}

function CommentItem({
  comment,
  currentPrincipal,
  postId,
}: {
  comment: Comment;
  currentPrincipal: string | null;
  postId: bigint;
}) {
  const { getProfile } = useUserProfileCache();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const deleteComment = useDeleteComment();

  useEffect(() => {
    getProfile(comment.author).then(setProfile);
  }, [comment.author, getProfile]);

  const isOwn = currentPrincipal === comment.author.toString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2 group"
    >
      <UserAvatar
        profile={profile}
        size="sm"
        className="flex-shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="bg-muted/60 rounded-2xl px-3 py-2 inline-block max-w-full">
          <p className="text-xs font-semibold text-foreground font-display">
            {profile?.displayName ?? "Unknown User"}
          </p>
          <p className="text-sm text-foreground font-body leading-snug break-words">
            {comment.content}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-1 px-1">
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(comment.timestamp)}
          </span>
          {isOwn && (
            <button
              type="button"
              onClick={() => {
                deleteComment.mutate(
                  { commentId: comment.id, postId },
                  { onError: () => toast.error("Failed to delete comment") },
                );
              }}
              className="text-xs text-destructive/60 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"] as const;

export function PostCard({ post, onDelete }: PostCardProps) {
  const { identity } = useInternetIdentity();
  const { getProfile } = useUserProfileCache();
  const [authorProfile, setAuthorProfile] = useState<UserProfile | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  const { data: likesCount = 0n } = useGetLikesCount(post.id);
  const { data: hasLiked = false } = useCheckCallerHasLiked(post.id);
  const likeOrUnlike = useLikeOrUnlikePost();
  const { data: comments = [], isLoading: commentsLoading } =
    useGetCommentsByPost(post.id);
  const addComment = useAddComment();
  const deletePost = useDeletePost();
  const { data: emojiReactions = [] } = useGetEmojiReactions(post.id);
  const addEmojiReaction = useAddEmojiReaction();

  const currentPrincipal = identity?.getPrincipal().toString() ?? null;
  const isOwn = currentPrincipal === post.author.toString();
  const imageUrl = post.image?.getDirectURL();

  useEffect(() => {
    getProfile(post.author).then(setAuthorProfile);
  }, [post.author, getProfile]);

  const handleLike = () => {
    if (!identity) {
      toast.error("Sign in to like posts");
      return;
    }
    likeOrUnlike.mutate(post.id, {
      onError: () => toast.error("Failed to update like"),
    });
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !identity) return;
    const text = commentText.trim();
    setCommentText("");
    try {
      await addComment.mutateAsync({ postId: post.id, content: text });
    } catch {
      toast.error("Failed to post comment");
      setCommentText(text);
    }
  };

  const handleDelete = () => {
    deletePost.mutate(post.id, {
      onSuccess: () => {
        toast.success("Post deleted");
        onDelete?.();
      },
      onError: () => toast.error("Failed to delete post"),
    });
  };

  const handleShare = async () => {
    const authorName =
      authorProfile?.displayName ?? post.author.toString().slice(0, 8);
    const shareText = `${authorName}: ${post.content}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        toast.success("Post copied to clipboard!");
      } else {
        const preview =
          shareText.length > 80 ? `${shareText.slice(0, 80)}…` : shareText;
        toast.info(`Share: ${preview}`);
      }
    } catch {
      const preview =
        shareText.length > 80 ? `${shareText.slice(0, 80)}…` : shareText;
      toast.info(`Share: ${preview}`);
    }
  };

  const handleEmojiReaction = (emoji: string) => {
    if (!identity) {
      toast.error("Sign in to react to posts");
      return;
    }
    addEmojiReaction.mutate(
      { postId: post.id, emoji },
      { onError: () => toast.error("Failed to add reaction") },
    );
  };

  // Build a map of emoji -> count from reaction data
  const reactionMap = new Map<string, bigint>(emojiReactions);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="post-card"
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <UserAvatar profile={authorProfile} size="md" />
          <div>
            <p className="font-semibold text-sm font-display text-foreground">
              {authorProfile?.displayName ?? (
                <span className="inline-block w-24 h-4 bg-muted rounded animate-pulse-gentle" />
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(post.timestamp)}
            </p>
          </div>
        </div>
        {isOwn && (
          <button
            type="button"
            onClick={handleDelete}
            className="text-muted-foreground/50 hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10"
            title="Delete post"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <p className="px-4 pb-3 text-sm md:text-base font-body text-foreground leading-relaxed whitespace-pre-wrap break-words">
          {post.content}
        </p>
      )}

      {/* Image */}
      {imageUrl && (
        <div className="overflow-hidden mx-4 mb-3 rounded-xl border border-border/50">
          <img
            src={imageUrl}
            alt="Post"
            className="w-full object-cover max-h-[480px]"
            loading="lazy"
          />
        </div>
      )}

      {/* Emoji Reactions Bar */}
      <div className="px-4 pb-2 flex items-center gap-1.5 flex-wrap">
        {EMOJI_REACTIONS.map((emoji) => {
          const count = reactionMap.get(emoji) ?? 0n;
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => handleEmojiReaction(emoji)}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm transition-all duration-150 active:scale-95 select-none",
                "border border-border/50 hover:border-border hover:bg-muted/80",
                count > 0n
                  ? "bg-muted/60 shadow-sm"
                  : "bg-transparent opacity-60 hover:opacity-100",
              )}
              title={`React with ${emoji}`}
            >
              <span className="leading-none">{emoji}</span>
              {count > 0n && (
                <span className="text-xs font-medium text-muted-foreground leading-none tabular-nums">
                  {count.toString()}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="px-4 py-1.5 flex items-center gap-3 border-t border-border/60">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Heart
            className={cn(
              "w-3.5 h-3.5",
              hasLiked ? "fill-current text-rose-500" : "",
            )}
          />
          {likesCount.toString()}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageCircle className="w-3.5 h-3.5" />
          {comments.length}
        </span>
      </div>

      {/* Action row */}
      <div className="px-2 pb-1 flex border-t border-border/60">
        <button
          type="button"
          onClick={handleLike}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-150",
            "hover:bg-muted/80 active:scale-95",
            hasLiked ? "text-rose-500" : "text-muted-foreground",
          )}
        >
          <Heart
            className="w-4 h-4"
            strokeWidth={hasLiked ? 0 : 1.5}
            fill={hasLiked ? "currentColor" : "none"}
          />
          {hasLiked ? "Liked" : "Like"}
        </button>
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted/80 rounded-lg transition-all duration-150 active:scale-95"
        >
          <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
          Comment
          {showComments ? (
            <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
          )}
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted/80 rounded-lg transition-all duration-150 active:scale-95"
        >
          <Share2 className="w-4 h-4" strokeWidth={1.5} />
          Share
        </button>
      </div>

      {/* Comments section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/60"
          >
            <div className="px-4 py-3 space-y-3">
              {commentsLoading && (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex gap-2">
                      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                      <Skeleton className="h-12 flex-1 rounded-2xl" />
                    </div>
                  ))}
                </div>
              )}
              {!commentsLoading && comments.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No comments yet. Be the first!
                </p>
              )}
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id.toString()}
                  comment={comment}
                  currentPrincipal={currentPrincipal}
                  postId={post.id}
                />
              ))}

              {identity && (
                <form onSubmit={handleComment} className="flex gap-2 mt-2">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="resize-none min-h-0 rounded-2xl text-sm py-2 px-3 flex-1"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleComment(e as unknown as React.FormEvent);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="rounded-xl h-9 w-9 flex-shrink-0 mt-auto"
                    disabled={!commentText.trim() || addComment.isPending}
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
                      color: "white",
                    }}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

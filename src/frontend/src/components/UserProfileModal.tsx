import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { Principal } from "@icp-sdk/core/principal";
import {
  Briefcase,
  MessageCircle,
  ShoppingBag,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  RequestStatus,
  useFollowUser,
  useGetFollowers,
  useGetFollowing,
  useGetFriends,
  useGetPostsByUser,
  useGetStoreListingsByUser,
  useSendFriendRequest,
} from "../hooks/useQueries";
import { useUserProfileCache } from "../hooks/useUserProfileCache";
import { formatRelativeTime } from "../utils/formatTime";
import { UserAvatar } from "./UserAvatar";

interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
  principal: Principal | null;
  onMessage?: (principal: Principal) => void;
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <span className="font-bold text-lg font-display text-foreground leading-tight">
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function UserProfileModal({
  open,
  onClose,
  principal,
  onMessage,
}: UserProfileModalProps) {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const { getProfile } = useUserProfileCache();
  const sendFriendRequest = useSendFriendRequest();
  const followUser = useFollowUser();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [friendStatus, setFriendStatus] = useState<RequestStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [optimisticFriendStatus, setOptimisticFriendStatus] =
    useState<RequestStatus | null>(null);
  const [optimisticFollowing, setOptimisticFollowing] = useState(false);

  const { data: friends = [] } = useGetFriends(principal);
  const { data: followers = [] } = useGetFollowers(principal);
  const { data: following = [] } = useGetFollowing(principal);
  const { data: posts = [], isLoading: postsLoading } =
    useGetPostsByUser(principal);
  const { data: listings = [], isLoading: listingsLoading } =
    useGetStoreListingsByUser(principal);

  const myPrincipal = identity?.getPrincipal();
  const { data: myFollowing = [] } = useGetFollowing(myPrincipal ?? null);

  // Load profile and friend status when modal opens
  useEffect(() => {
    if (!open || !principal) {
      setProfile(null);
      setFriendStatus(null);
      setOptimisticFriendStatus(null);
      setOptimisticFollowing(false);
      return;
    }

    setProfileLoading(true);
    getProfile(principal)
      .then((p) => setProfile(p))
      .finally(() => setProfileLoading(false));

    if (
      actor &&
      myPrincipal &&
      principal.toString() !== myPrincipal.toString()
    ) {
      setStatusLoading(true);
      (actor as any)
        .checkFriendRequestStatus(principal)
        .then((status: RequestStatus | null) => {
          setFriendStatus(status);
          setOptimisticFriendStatus(status);
        })
        .catch(() => {
          setFriendStatus(null);
          setOptimisticFriendStatus(null);
        })
        .finally(() => setStatusLoading(false));
    }
  }, [open, principal, getProfile, actor, myPrincipal]);

  // Sync following state
  useEffect(() => {
    if (!principal) return;
    const isFollowing = myFollowing.some(
      (p) => p.toString() === principal.toString(),
    );
    setOptimisticFollowing(isFollowing);
  }, [myFollowing, principal]);

  const isOwnProfile =
    principal && myPrincipal
      ? principal.toString() === myPrincipal.toString()
      : false;

  const isFriend = friends.some(
    (p) => p.toString() === myPrincipal?.toString(),
  );
  const effectiveStatus = isFriend
    ? RequestStatus.accepted
    : (optimisticFriendStatus ?? friendStatus);

  const isPending = effectiveStatus === RequestStatus.pending;
  const isAccepted = effectiveStatus === RequestStatus.accepted;

  const handleAddFriend = () => {
    if (!principal) return;
    setOptimisticFriendStatus(RequestStatus.pending);
    sendFriendRequest.mutate(principal, {
      onSuccess: () => toast.success("Friend request sent!"),
      onError: () => {
        toast.error("Failed to send friend request");
        setOptimisticFriendStatus(null);
      },
    });
  };

  const handleFollow = () => {
    if (!principal) return;
    setOptimisticFollowing(true);
    followUser.mutate(principal, {
      onSuccess: () => toast.success("Now following!"),
      onError: () => {
        toast.error("Failed to follow user");
        setOptimisticFollowing(false);
      },
    });
  };

  const handleMessage = () => {
    if (!principal || !onMessage) return;
    onMessage(principal);
    onClose();
  };

  const sortedPosts = [...posts].sort((a, b) => {
    const tA = Number(a.timestamp / 1_000_000n);
    const tB = Number(b.timestamp / 1_000_000n);
    return tB - tA;
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="p-0 overflow-hidden max-w-lg w-full rounded-2xl"
        style={{ maxHeight: "90vh" }}
      >
        {/* Hidden title for accessibility */}
        <DialogHeader className="sr-only">
          <DialogTitle>{profile?.displayName ?? "User Profile"}</DialogTitle>
        </DialogHeader>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-50 w-7 h-7 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <ScrollArea style={{ maxHeight: "90vh" }}>
          {/* Cover photo */}
          <div
            className="relative h-32 w-full flex-shrink-0"
            style={{
              background: profile?.coverPhoto
                ? undefined
                : "linear-gradient(135deg, oklch(0.38 0.18 268), oklch(0.55 0.20 240))",
            }}
          >
            {profile?.coverPhoto && (
              <img
                src={profile.coverPhoto.getDirectURL()}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Avatar + info */}
          <div className="px-5 pb-5">
            <div className="relative -mt-10 mb-3">
              <div className="w-20 h-20 rounded-full ring-4 ring-card overflow-hidden bg-muted">
                {profileLoading ? (
                  <Skeleton className="w-20 h-20 rounded-full" />
                ) : (
                  <UserAvatar profile={profile} size="xl" />
                )}
              </div>
            </div>

            {profileLoading ? (
              <div className="space-y-2 mb-4">
                <Skeleton className="w-40 h-5 rounded" />
                <Skeleton className="w-64 h-4 rounded" />
              </div>
            ) : (
              <div className="mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display font-bold text-xl text-foreground leading-tight">
                    {profile?.displayName ?? "Unknown User"}
                  </h2>
                  {profile?.isProfessional && (
                    <Badge
                      className="text-xs font-semibold gap-1 px-2 py-0.5 rounded-full"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.55 0.22 255), oklch(0.42 0.18 268))",
                        color: "white",
                        border: "none",
                      }}
                    >
                      <Briefcase className="w-3 h-3" />
                      Pro
                    </Badge>
                  )}
                </div>
                {profile?.bio && (
                  <p className="text-sm text-muted-foreground mt-1 leading-snug">
                    {profile.bio}
                  </p>
                )}
              </div>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-5 py-3 border-y border-border/60 mb-4">
              <StatBox label="Posts" value={posts.length} />
              <div className="w-px h-8 bg-border/60" />
              <StatBox label="Friends" value={friends.length} />
              <div className="w-px h-8 bg-border/60" />
              <StatBox label="Followers" value={followers.length} />
              <div className="w-px h-8 bg-border/60" />
              <StatBox label="Following" value={following.length} />
            </div>

            {/* Action buttons */}
            {!isOwnProfile && (
              <div className="flex gap-2 mb-5 flex-wrap">
                {/* Follow button */}
                <Button
                  size="sm"
                  variant={optimisticFollowing ? "outline" : "outline"}
                  disabled={optimisticFollowing}
                  className="flex-1 h-9 rounded-xl text-sm font-semibold gap-1.5"
                  onClick={handleFollow}
                >
                  <UserCheck className="w-4 h-4" />
                  {optimisticFollowing ? "Following" : "Follow"}
                </Button>

                {/* Friend button */}
                {isAccepted ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled
                    className="flex-1 h-9 rounded-xl text-sm font-semibold text-muted-foreground gap-1.5"
                  >
                    <UserCheck className="w-4 h-4" />
                    Friends
                  </Button>
                ) : isPending ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled
                    className="flex-1 h-9 rounded-xl text-sm font-semibold text-muted-foreground"
                  >
                    {statusLoading ? "..." : "Pending"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="flex-1 h-9 rounded-xl text-sm font-semibold gap-1.5"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
                      color: "white",
                    }}
                    onClick={handleAddFriend}
                    disabled={sendFriendRequest.isPending}
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Friend
                  </Button>
                )}

                {/* Message button */}
                {onMessage && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-9 rounded-xl text-sm font-semibold gap-1.5"
                    onClick={handleMessage}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Message
                  </Button>
                )}
              </div>
            )}

            {/* Recent Posts */}
            <section>
              <h3 className="font-display font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <span>Posts</span>
                <span className="text-xs font-normal text-muted-foreground">
                  ({posts.length})
                </span>
              </h3>

              {postsLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="w-full h-16 rounded-xl" />
                  ))}
                </div>
              ) : sortedPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No posts yet
                </p>
              ) : (
                <div className="space-y-2">
                  {sortedPosts.slice(0, 5).map((post) => (
                    <motion.div
                      key={post.id.toString()}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-muted/40 rounded-xl border border-border/40"
                    >
                      {post.content && (
                        <p className="text-sm text-foreground leading-snug line-clamp-3">
                          {post.content}
                        </p>
                      )}
                      {post.image && (
                        <img
                          src={post.image.getDirectURL()}
                          alt="Post"
                          className="w-full rounded-lg mt-2 max-h-40 object-cover"
                          loading="lazy"
                        />
                      )}
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {formatRelativeTime(post.timestamp)}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>

            {/* Store Listings */}
            <section className="mt-5">
              <h3 className="font-display font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                <span>Shop</span>
                <span className="text-xs font-normal text-muted-foreground">
                  ({listings.length})
                </span>
              </h3>

              {listingsLoading ? (
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="w-full h-28 rounded-xl" />
                  ))}
                </div>
              ) : listings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No listings yet
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {listings.map((listing) => {
                    const imgUrl = listing.image?.getDirectURL();
                    return (
                      <motion.div
                        key={listing.id.toString()}
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card rounded-xl border border-border/50 overflow-hidden"
                      >
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={listing.title}
                            className="w-full h-24 object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-24 bg-muted/60 flex items-center justify-center">
                            <ShoppingBag className="w-8 h-8 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="p-2">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {listing.title}
                          </p>
                          <p
                            className="text-xs font-bold mt-0.5"
                            style={{ color: "oklch(0.45 0.18 262)" }}
                          >
                            {listing.price}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Footer padding */}
            <div className="h-4" />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Principal } from "@icp-sdk/core/principal";
import { Loader2, Rss, Search, UserCheck, UserPlus, UserX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend";
import { PostCard } from "../components/PostCard";
import { PostComposer } from "../components/PostComposer";
import { UserAvatar } from "../components/UserAvatar";
import { UserProfileModal } from "../components/UserProfileModal";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { RequestStatus } from "../hooks/useQueries";
import {
  useFollowUser,
  useGetAllPosts,
  useGetFollowing,
  useSendFriendRequest,
} from "../hooks/useQueries";
import { useUserProfileCache } from "../hooks/useUserProfileCache";

interface FeedPageProps {
  currentProfile: UserProfile | null;
  onMessageUser?: (principal: Principal) => void;
}

function PostSkeleton() {
  return (
    <div className="post-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="w-32 h-3.5 rounded" />
          <Skeleton className="w-20 h-3 rounded" />
        </div>
      </div>
      <Skeleton className="w-full h-4 rounded" />
      <Skeleton className="w-4/5 h-4 rounded" />
      <Skeleton className="w-full h-40 rounded-xl" />
    </div>
  );
}

interface SearchResult {
  principal: Principal;
  profile: UserProfile;
  friendStatus: RequestStatus | null;
  isFollowing: boolean;
}

interface SearchResultCardProps {
  result: SearchResult;
  onSendFriendRequest: (principal: Principal) => void;
  onFollow: (principal: Principal) => void;
  onViewProfile: (principal: Principal) => void;
}

function SearchResultCard({
  result,
  onSendFriendRequest,
  onFollow,
  onViewProfile,
}: SearchResultCardProps) {
  const [optimisticFriendStatus, setOptimisticFriendStatus] =
    useState<RequestStatus | null>(result.friendStatus);
  const [optimisticFollowing, setOptimisticFollowing] = useState(
    result.isFollowing,
  );

  const handleAddFriend = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOptimisticFriendStatus(RequestStatus.pending);
    onSendFriendRequest(result.principal);
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOptimisticFollowing(true);
    onFollow(result.principal);
  };

  const isPending = optimisticFriendStatus === RequestStatus.pending;
  const isAccepted = optimisticFriendStatus === RequestStatus.accepted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 rounded-xl transition-colors cursor-pointer"
      onClick={() => onViewProfile(result.principal)}
    >
      <UserAvatar profile={result.profile} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm font-display truncate leading-tight hover:underline">
          {result.profile.displayName}
        </p>
        {result.profile.bio && (
          <p className="text-xs text-muted-foreground truncate leading-tight">
            {result.profile.bio}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Follow button */}
        <Button
          size="sm"
          variant={optimisticFollowing ? "ghost" : "outline"}
          disabled={optimisticFollowing}
          className="h-7 px-2.5 rounded-lg text-xs font-semibold"
          onClick={handleFollow}
        >
          {optimisticFollowing ? (
            <>
              <UserCheck className="w-3 h-3 mr-1" />
              Following
            </>
          ) : (
            "Follow"
          )}
        </Button>

        {/* Friend button */}
        {isAccepted ? (
          <Button
            size="sm"
            variant="ghost"
            disabled
            className="h-7 px-2.5 rounded-lg text-xs font-semibold text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <UserCheck className="w-3 h-3 mr-1" />
            Friends
          </Button>
        ) : isPending ? (
          <Button
            size="sm"
            variant="ghost"
            disabled
            className="h-7 px-2.5 rounded-lg text-xs font-semibold text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            Pending
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-7 px-2.5 rounded-lg text-xs font-semibold"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
              color: "white",
            }}
            onClick={handleAddFriend}
          >
            <UserPlus className="w-3 h-3 mr-1" />
            Add
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function FeedSearchBar({
  myPrincipal,
  onMessage,
}: {
  myPrincipal: Principal | undefined;
  onMessage?: (principal: Principal) => void;
}) {
  const { actor } = useActor();
  const { getProfile } = useUserProfileCache();
  const sendFriendRequest = useSendFriendRequest();
  const followUser = useFollowUser();

  const { data: following = [] } = useGetFollowing(myPrincipal ?? null);
  const followingSet = useMemo(
    () => new Set(following.map((p) => p.toString())),
    [following],
  );

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [profileModalPrincipal, setProfileModalPrincipal] =
    useState<Principal | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(
    async (searchQuery: string) => {
      if (!actor || !searchQuery.trim()) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const allUsers = await actor.getAllUsers();
        const candidates: Principal[] = [];
        for (const principal of allUsers) {
          const key = principal.toString();
          if (key === myPrincipal?.toString()) continue;
          candidates.push(principal);
        }

        // Fetch profiles in parallel
        const profileResults = await Promise.all(
          candidates.map(async (principal) => {
            const profile = await getProfile(principal);
            return { principal, profile };
          }),
        );

        // Filter by display name
        const lowerQuery = searchQuery.toLowerCase();
        const matched = profileResults.filter(({ profile }) =>
          profile?.displayName.toLowerCase().includes(lowerQuery),
        );

        // Fetch friend request status in parallel
        const withStatus = await Promise.all(
          matched.map(async ({ principal, profile }) => {
            let status: RequestStatus | null = null;
            try {
              status = await (actor as any).checkFriendRequestStatus(principal);
            } catch {
              // ignore
            }
            return {
              principal,
              profile: profile!,
              friendStatus: status,
              isFollowing: followingSet.has(principal.toString()),
            };
          }),
        );

        setResults(withStatus);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [actor, myPrincipal, followingSet, getProfile],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      setIsOpen(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      doSearch(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSendFriendRequest = (principal: Principal) => {
    sendFriendRequest.mutate(principal, {
      onSuccess: () => toast.success("Friend request sent!"),
      onError: () => toast.error("Failed to send friend request"),
    });
  };

  const handleFollow = (principal: Principal) => {
    followUser.mutate(principal, {
      onSuccess: () => toast.success("Now following!"),
      onError: () => toast.error("Failed to follow user"),
    });
  };

  const handleViewProfile = (principal: Principal) => {
    setIsOpen(false);
    setProfileModalPrincipal(principal);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search people to add or follow..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim()) setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim() && results.length > 0) setIsOpen(true);
          }}
          className="pl-9 pr-9 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-primary/40"
        />
        {isSearching ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        ) : query ? (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
          >
            <UserX className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      <AnimatePresence>
        {isOpen && query.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-card border border-border/60 rounded-2xl card-shadow overflow-hidden"
          >
            {!isSearching && results.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm font-semibold text-foreground font-display">
                  No users found
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try a different name
                </p>
              </div>
            ) : (
              <div className="p-1.5 space-y-0.5 max-h-80 overflow-y-auto">
                {results.map((result) => (
                  <SearchResultCard
                    key={result.principal.toString()}
                    result={result}
                    onSendFriendRequest={handleSendFriendRequest}
                    onFollow={handleFollow}
                    onViewProfile={handleViewProfile}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* User profile modal */}
      <UserProfileModal
        open={!!profileModalPrincipal}
        onClose={() => setProfileModalPrincipal(null)}
        principal={profileModalPrincipal}
        onMessage={onMessage}
      />
    </div>
  );
}

export function FeedPage({ currentProfile, onMessageUser }: FeedPageProps) {
  const { identity } = useInternetIdentity();
  const { data: posts, isLoading } = useGetAllPosts();
  const myPrincipal = identity?.getPrincipal();

  const sortedPosts = useMemo(() => {
    if (!posts) return [];
    return [...posts].sort((a, b) => {
      const tA = Number(a.timestamp / 1_000_000n);
      const tB = Number(b.timestamp / 1_000_000n);
      return tB - tA;
    });
  }, [posts]);

  return (
    <div className="space-y-3">
      {/* Friend search bar */}
      <FeedSearchBar myPrincipal={myPrincipal} onMessage={onMessageUser} />

      <PostComposer currentProfile={currentProfile} />

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && sortedPosts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="post-card p-12 text-center"
        >
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "oklch(0.94 0.04 250)" }}
          >
            <Rss
              className="w-8 h-8"
              style={{ color: "oklch(0.45 0.18 262)" }}
            />
          </div>
          <h3 className="font-display font-semibold text-foreground mb-2">
            Your feed is empty
          </h3>
          <p className="text-sm text-muted-foreground">
            Be the first to share something! Use the composer above to create
            your first post.
          </p>
        </motion.div>
      )}

      <div className="space-y-3">
        {sortedPosts.map((post) => (
          <PostCard key={post.id.toString()} post={post} />
        ))}
      </div>
    </div>
  );
}

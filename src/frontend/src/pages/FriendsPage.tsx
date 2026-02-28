import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Principal } from "@icp-sdk/core/principal";
import {
  Check,
  Loader2,
  Search,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  Video,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend";
import { UserAvatar } from "../components/UserAvatar";
import {
  CalleeCallModal,
  IncomingCallBanner,
  VideoCallModal,
} from "../components/VideoCallModal";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { RequestStatus } from "../hooks/useQueries";
import {
  useGetFriends,
  useGetPendingFriendRequests,
  useRespondToFriendRequest,
  useSendFriendRequest,
} from "../hooks/useQueries";
import { useUserProfileCache } from "../hooks/useUserProfileCache";

function FriendRequestCard({
  fromPrincipal,
  onRespond,
}: {
  fromPrincipal: Principal;
  onRespond: (accept: boolean) => void;
}) {
  const { getProfile } = useUserProfileCache();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getProfile(fromPrincipal).then(setProfile);
  }, [fromPrincipal, getProfile]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-3 bg-card rounded-xl card-shadow"
    >
      <UserAvatar profile={profile} size="md" />
      <div className="flex-1 min-w-0">
        {profile ? (
          <>
            <p className="font-semibold text-sm font-display truncate">
              {profile.displayName}
            </p>
            {profile.bio && (
              <p className="text-xs text-muted-foreground truncate">
                {profile.bio}
              </p>
            )}
          </>
        ) : (
          <div className="space-y-1">
            <Skeleton className="w-28 h-3.5 rounded" />
            <Skeleton className="w-20 h-3 rounded" />
          </div>
        )}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button
          size="sm"
          className="h-8 px-3 rounded-lg text-xs font-semibold"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
            color: "white",
          }}
          onClick={() => onRespond(true)}
        >
          <Check className="w-3.5 h-3.5 mr-1" />
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 rounded-lg text-xs font-semibold"
          onClick={() => onRespond(false)}
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Decline
        </Button>
      </div>
    </motion.div>
  );
}

function FriendCard({
  principal,
  onVideoCall,
}: {
  principal: Principal;
  onVideoCall: (principal: Principal, profile: UserProfile | null) => void;
}) {
  const { getProfile } = useUserProfileCache();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getProfile(principal).then(setProfile);
  }, [principal, getProfile]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3 p-3 bg-card rounded-xl card-shadow"
    >
      <div className="relative">
        <UserAvatar profile={profile} size="md" />
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 online-dot rounded-full border-2 border-card" />
      </div>
      <div className="flex-1 min-w-0">
        {profile ? (
          <>
            <p className="font-semibold text-sm font-display truncate">
              {profile.displayName}
            </p>
            {profile.bio && (
              <p className="text-xs text-muted-foreground truncate">
                {profile.bio}
              </p>
            )}
          </>
        ) : (
          <div className="space-y-1">
            <Skeleton className="w-28 h-3.5 rounded" />
            <Skeleton className="w-20 h-3 rounded" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:border-primary/40"
          onClick={() => onVideoCall(principal, profile)}
          title="Video Call"
        >
          <Video
            className="w-4 h-4"
            style={{ color: "oklch(0.45 0.18 262)" }}
          />
        </Button>
        <UserCheck className="w-4 h-4 text-muted-foreground" />
      </div>
    </motion.div>
  );
}

interface FindResult {
  principal: Principal;
  profile: UserProfile;
  status: RequestStatus | null;
}

function FindFriendCard({
  result,
  onSendRequest,
}: {
  result: FindResult;
  onSendRequest: (principal: Principal) => void;
}) {
  const [optimisticStatus, setOptimisticStatus] =
    useState<RequestStatus | null>(result.status);

  const handleAdd = () => {
    setOptimisticStatus(RequestStatus.pending);
    onSendRequest(result.principal);
  };

  const isPending = optimisticStatus === RequestStatus.pending;
  const isAccepted = optimisticStatus === RequestStatus.accepted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center gap-3 p-3 bg-card rounded-xl card-shadow"
    >
      <UserAvatar profile={result.profile} size="md" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm font-display truncate">
          {result.profile.displayName}
        </p>
        {result.profile.bio && (
          <p className="text-xs text-muted-foreground truncate">
            {result.profile.bio}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">
        {isAccepted ? (
          <Button
            size="sm"
            variant="ghost"
            disabled
            className="h-8 px-3 rounded-lg text-xs font-semibold text-muted-foreground"
          >
            <UserCheck className="w-3.5 h-3.5 mr-1" />
            Friends
          </Button>
        ) : isPending ? (
          <Button
            size="sm"
            variant="ghost"
            disabled
            className="h-8 px-3 rounded-lg text-xs font-semibold text-muted-foreground"
          >
            Pending
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-8 px-3 rounded-lg text-xs font-semibold"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
              color: "white",
            }}
            onClick={handleAdd}
          >
            <UserPlus className="w-3.5 h-3.5 mr-1" />
            Add Friend
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function FindFriendsTab({
  myPrincipal,
  friends,
}: {
  myPrincipal: Principal | undefined;
  friends: Principal[];
}) {
  const { actor } = useActor();
  const { getProfile } = useUserProfileCache();
  const sendFriendRequest = useSendFriendRequest();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FindResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const friendSet = new Set(friends.map((p) => p.toString()));

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
          if (key === myPrincipal?.toString() || friendSet.has(key)) continue;
          candidates.push(principal);
        }

        // Fetch profiles in parallel
        const profileResults = await Promise.all(
          candidates.map(async (principal) => {
            const profile = await getProfile(principal);
            return { principal, profile };
          }),
        );

        // Filter by display name (or include users with no profile as fallback)
        const lowerQuery = searchQuery.toLowerCase();
        const matched = profileResults.filter(({ profile, principal }) => {
          const name = profile?.displayName ?? principal.toString();
          return name.toLowerCase().includes(lowerQuery);
        });

        const withStatus = await Promise.all(
          matched.map(async ({ principal, profile }) => {
            let status: RequestStatus | null = null;
            try {
              status = await (actor as any).checkFriendRequestStatus(principal);
            } catch {
              // ignore
            }
            // Provide a fallback profile for users who haven't set one up yet
            const resolvedProfile: UserProfile = profile ?? {
              displayName: `User (${principal.toString().slice(0, 8)}...)`,
              bio: "",
              isProfessional: false,
            };
            return { principal, profile: resolvedProfile, status };
          }),
        );

        setResults(withStatus);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [actor, myPrincipal, friendSet, getProfile],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
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

  const handleSendRequest = (principal: Principal) => {
    sendFriendRequest.mutate(principal, {
      onSuccess: () => {
        toast.success("Friend request sent!");
      },
      onError: () => {
        toast.error("Failed to send friend request");
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-primary/40"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {!query.trim() && (
        <div className="text-center py-12">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: "oklch(0.94 0.04 250)" }}
          >
            <Search
              className="w-7 h-7"
              style={{ color: "oklch(0.45 0.18 262)" }}
            />
          </div>
          <p className="font-semibold text-foreground font-display">
            Find new friends
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Search by name to find friends
          </p>
        </div>
      )}

      {query.trim() && !isSearching && results.length === 0 && (
        <div className="text-center py-12">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: "oklch(0.94 0.04 250)" }}
          >
            <UserX
              className="w-7 h-7"
              style={{ color: "oklch(0.45 0.18 262)" }}
            />
          </div>
          <p className="font-semibold text-foreground font-display">
            No users found
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Try a different name
          </p>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        <div className="space-y-3">
          {results.map((result) => (
            <FindFriendCard
              key={result.principal.toString()}
              result={result}
              onSendRequest={handleSendRequest}
            />
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}

interface IncomingCall {
  callId: string;
  callerPrincipal: Principal;
  callerProfile: UserProfile | null;
}

export function FriendsPage() {
  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const { getProfile } = useUserProfileCache();
  const { data: pendingRequests = [], isLoading: requestsLoading } =
    useGetPendingFriendRequests();
  const { data: friends = [], isLoading: friendsLoading } = useGetFriends(
    identity?.getPrincipal() ?? null,
  );
  const respondToRequest = useRespondToFriendRequest();

  // Outgoing call state
  const [activeCall, setActiveCall] = useState<{
    friendPrincipal: Principal;
    friendProfile: UserProfile | null;
  } | null>(null);

  // Incoming call state
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeIncomingCall, setActiveIncomingCall] =
    useState<IncomingCall | null>(null);

  const myPrincipal = identity?.getPrincipal();

  // Poll for incoming calls from friends
  useEffect(() => {
    if (!actor || !myPrincipal || friends.length === 0) return;

    const checkIncoming = async () => {
      for (const friendPrincipal of friends) {
        const callId = `${friendPrincipal.toString()}-${myPrincipal.toString()}`;
        try {
          const offer = await (actor as any).getCallOffer(callId);
          if (offer) {
            const profile = await getProfile(friendPrincipal);
            setIncomingCall({
              callId,
              callerPrincipal: friendPrincipal,
              callerProfile: profile,
            });
            return;
          }
        } catch {
          // ignore
        }
      }
    };

    checkIncoming();
    const interval = setInterval(checkIncoming, 3000);
    return () => clearInterval(interval);
  }, [actor, myPrincipal, friends, getProfile]);

  const handleVideoCall = (
    principal: Principal,
    profile: UserProfile | null,
  ) => {
    setActiveCall({ friendPrincipal: principal, friendProfile: profile });
  };

  const handleAcceptCall = () => {
    if (incomingCall) {
      setActiveIncomingCall(incomingCall);
      setIncomingCall(null);
    }
  };

  const handleDeclineCall = async () => {
    if (incomingCall && actor) {
      try {
        await (actor as any).endCall(incomingCall.callId);
      } catch {
        // ignore
      }
    }
    setIncomingCall(null);
  };

  const handleRespond = (from: Principal, accept: boolean) => {
    respondToRequest.mutate(
      { from, accept },
      {
        onSuccess: () => {
          toast.success(
            accept ? "Friend request accepted!" : "Friend request declined",
          );
        },
        onError: () => {
          toast.error("Failed to respond to friend request");
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-display font-bold text-foreground">
          Friends
        </h1>
        <p className="text-sm text-muted-foreground">Manage your connections</p>
      </div>

      <Tabs defaultValue="requests">
        <TabsList className="w-full rounded-xl bg-muted/60">
          <TabsTrigger
            value="requests"
            className="flex-1 rounded-lg gap-1.5 text-xs sm:text-sm"
          >
            <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>Requests</span>
            {pendingRequests.length > 0 && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ background: "oklch(0.62 0.24 25)" }}
              >
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="friends"
            className="flex-1 rounded-lg gap-1.5 text-xs sm:text-sm"
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>Friends</span>
            {friends.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({friends.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="find"
            className="flex-1 rounded-lg gap-1.5 text-xs sm:text-sm"
          >
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>Find</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4 space-y-3">
          {requestsLoading && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl card-shadow"
                >
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="w-32 h-3.5 rounded" />
                    <Skeleton className="w-20 h-3 rounded" />
                  </div>
                  <Skeleton className="w-20 h-8 rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {!requestsLoading && pendingRequests.length === 0 && (
            <div className="text-center py-12">
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: "oklch(0.94 0.04 250)" }}
              >
                <UserX
                  className="w-7 h-7"
                  style={{ color: "oklch(0.45 0.18 262)" }}
                />
              </div>
              <p className="font-semibold text-foreground font-display">
                No pending requests
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                You&apos;re all caught up!
              </p>
            </div>
          )}

          {pendingRequests.map((req) => (
            <FriendRequestCard
              key={req.from.toString()}
              fromPrincipal={req.from}
              onRespond={(accept) => handleRespond(req.from, accept)}
            />
          ))}
        </TabsContent>

        <TabsContent value="friends" className="mt-4 space-y-3">
          {friendsLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl card-shadow"
                >
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="w-32 h-3.5 rounded" />
                    <Skeleton className="w-20 h-3 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!friendsLoading && friends.length === 0 && (
            <div className="text-center py-12">
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: "oklch(0.94 0.04 250)" }}
              >
                <Users
                  className="w-7 h-7"
                  style={{ color: "oklch(0.45 0.18 262)" }}
                />
              </div>
              <p className="font-semibold text-foreground font-display">
                No friends yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Start connecting by accepting friend requests.
              </p>
            </div>
          )}

          {friends.map((principal) => (
            <FriendCard
              key={principal.toString()}
              principal={principal}
              onVideoCall={handleVideoCall}
            />
          ))}
        </TabsContent>

        <TabsContent value="find" className="mt-4">
          <FindFriendsTab myPrincipal={myPrincipal} friends={friends} />
        </TabsContent>
      </Tabs>

      {/* Outgoing video call */}
      {activeCall && (
        <VideoCallModal
          friendPrincipal={activeCall.friendPrincipal}
          friendProfile={activeCall.friendProfile}
          onClose={() => setActiveCall(null)}
        />
      )}

      {/* Accepted incoming call */}
      {activeIncomingCall && (
        <CalleeCallModal
          callerPrincipal={activeIncomingCall.callerPrincipal}
          callerProfile={activeIncomingCall.callerProfile}
          incomingCallId={activeIncomingCall.callId}
          onClose={() => setActiveIncomingCall(null)}
        />
      )}

      {/* Incoming call notification */}
      <AnimatePresence>
        {incomingCall && (
          <IncomingCallBanner
            callerPrincipal={incomingCall.callerPrincipal}
            callerProfile={incomingCall.callerProfile}
            callId={incomingCall.callId}
            onAccept={handleAcceptCall}
            onDecline={handleDeclineCall}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Principal } from "@icp-sdk/core/principal";
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  Search,
  Send,
  Users,
  Video,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Group, UserProfile } from "../backend";
import {
  CalleeCallModal,
  IncomingCallBanner,
  VideoCallModal,
} from "../components/VideoCallModal";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetConversation,
  useGetConversations,
  useGetGroupMessages,
  useGetMyGroups,
  useMarkConversationRead,
  useSendGroupMessage,
  useSendMessage,
} from "../hooks/useQueries";
import { useUserProfileCache } from "../hooks/useUserProfileCache";

function getInitials(name: string | undefined | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTime(timestamp: bigint): string {
  const ms = Number(timestamp / 1_000_000n);
  const d = new Date(ms);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ── Contact List Item ──────────────────────────────────────────────────────

interface ContactItemProps {
  principal: Principal;
  isActive: boolean;
  onClick: () => void;
}

function ContactItem({ principal, isActive, onClick }: ContactItemProps) {
  const { getProfile } = useUserProfileCache();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getProfile(principal).then(setProfile);
  }, [principal, getProfile]);

  const avatarUrl = profile?.avatar?.getDirectURL();
  const initials = getInitials(profile?.displayName);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 transition-all duration-150 hover:bg-primary/5 text-left",
        isActive ? "bg-primary/10 border-r-2 border-primary" : "",
      )}
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        {avatarUrl && (
          <AvatarImage src={avatarUrl} alt={profile?.displayName} />
        )}
        <AvatarFallback
          className="text-white text-sm font-display font-semibold"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
          }}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-semibold text-sm truncate font-display",
            isActive ? "text-primary" : "text-foreground",
          )}
        >
          {profile?.displayName ?? `${principal.toString().slice(0, 12)}...`}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {principal.toString().slice(0, 20)}...
        </p>
      </div>
    </button>
  );
}

// ── Group Contact Item ─────────────────────────────────────────────────────

interface GroupContactItemProps {
  group: Group;
  isActive: boolean;
  onClick: () => void;
}

function GroupContactItem({ group, isActive, onClick }: GroupContactItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 transition-all duration-150 hover:bg-primary/5 text-left",
        isActive ? "bg-primary/10 border-r-2 border-primary" : "",
      )}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.55 0.18 165), oklch(0.65 0.16 150))",
        }}
      >
        <Users className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-semibold text-sm truncate font-display",
            isActive ? "text-primary" : "text-foreground",
          )}
        >
          {group.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {group.memberIds.length} members
        </p>
      </div>
    </button>
  );
}

// ── Group Thread ───────────────────────────────────────────────────────────

interface GroupThreadProps {
  group: Group;
  myPrincipal: Principal;
  onBack: () => void;
}

function GroupThread({ group, myPrincipal, onBack }: GroupThreadProps) {
  const { data: messages = [], isLoading } = useGetGroupMessages(group.id);
  const sendMessage = useSendGroupMessage();
  const { getProfile } = useUserProfileCache();
  const [message, setMessage] = useState("");
  const [profiles, setProfiles] = useState<Record<string, UserProfile | null>>(
    {},
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const myPrincipalStr = myPrincipal.toString();

  useEffect(() => {
    const senders = [...new Set(messages.map((m) => m.senderId.toString()))];
    const missing = senders.filter((s) => !profiles[s]);
    if (missing.length === 0) return;
    Promise.all(
      missing.map(async (s) => {
        const principal = messages.find(
          (m) => m.senderId.toString() === s,
        )?.senderId;
        if (!principal) return;
        const profile = await getProfile(principal);
        setProfiles((prev) => ({ ...prev, [s]: profile }));
      }),
    );
  }, [messages, getProfile, profiles]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  });

  const handleSend = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setMessage("");
    try {
      await sendMessage.mutateAsync({ groupId: group.id, content: trimmed });
    } catch {
      // silent
    }
    textareaRef.current?.focus();
  }, [message, group.id, sendMessage]);

  const sortedMessages = [...messages].sort((a, b) =>
    Number(a.timestamp - b.timestamp),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-border/40 flex-shrink-0"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.38 0.18 268), oklch(0.48 0.20 255))",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="md:hidden text-white/80 hover:text-white transition-colors p-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.2)" }}
        >
          <Users className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm text-white truncate">
            {group.name}
          </p>
          <p className="text-xs text-white/70">
            {group.memberIds.length} members
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ minHeight: 0 }}
      >
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  i % 2 === 0 ? "justify-end" : "justify-start",
                )}
              >
                <Skeleton
                  className={cn(
                    "h-10 rounded-2xl",
                    i % 2 === 0 ? "w-48" : "w-40",
                  )}
                />
              </div>
            ))}
          </div>
        )}

        {!isLoading && sortedMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "oklch(0.94 0.04 250)" }}
            >
              <Users
                className="w-7 h-7"
                style={{ color: "oklch(0.45 0.18 262)" }}
              />
            </div>
            <p className="font-display font-semibold text-foreground">
              No messages yet
            </p>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Start the group conversation!
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {sortedMessages.map((msg) => {
            const isMine = msg.senderId.toString() === myPrincipalStr;
            const senderProfile = profiles[msg.senderId.toString()];
            return (
              <motion.div
                key={msg.id.toString()}
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.18 }}
                className={cn(
                  "flex gap-2",
                  isMine ? "justify-end" : "justify-start",
                )}
              >
                {!isMine && (
                  <Avatar className="w-6 h-6 flex-shrink-0 mt-1">
                    {senderProfile?.avatar?.getDirectURL() && (
                      <AvatarImage src={senderProfile.avatar.getDirectURL()} />
                    )}
                    <AvatarFallback
                      className="text-white text-[9px] font-semibold"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
                      }}
                    >
                      {getInitials(senderProfile?.displayName)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                    isMine
                      ? "rounded-br-md text-white"
                      : "rounded-bl-md bg-card text-foreground border border-border/50",
                  )}
                  style={
                    isMine
                      ? {
                          background:
                            "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
                        }
                      : undefined
                  }
                >
                  {!isMine && (
                    <p className="text-[10px] font-semibold mb-0.5 opacity-70">
                      {senderProfile?.displayName ??
                        msg.senderId.toString().slice(0, 8)}
                    </p>
                  )}
                  <p>{msg.content}</p>
                  <p
                    className={cn(
                      "text-[10px] mt-1 text-right",
                      isMine ? "text-white/60" : "text-muted-foreground",
                    )}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Compose area */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-border/40 bg-background">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            className="flex-1 resize-none rounded-2xl min-h-[44px] max-h-[120px] py-2.5 text-sm"
            style={{ lineHeight: "1.5" }}
          />
          <Button
            type="button"
            onClick={handleSend}
            disabled={!message.trim() || sendMessage.isPending}
            size="icon"
            className="rounded-2xl h-11 w-11 flex-shrink-0"
            style={{
              background: message.trim()
                ? "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))"
                : undefined,
              color: "white",
            }}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Conversation Thread ────────────────────────────────────────────────────

interface ConversationThreadProps {
  otherUser: Principal;
  onBack: () => void;
  onStartCall: (type: "audio" | "video") => void;
}

function ConversationThread({
  otherUser,
  onBack,
  onStartCall,
}: ConversationThreadProps) {
  const { identity } = useInternetIdentity();
  const { getProfile } = useUserProfileCache();
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: messages = [], isLoading } = useGetConversation(otherUser);
  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead();

  const myPrincipalStr = identity?.getPrincipal().toString();

  useEffect(() => {
    getProfile(otherUser).then(setOtherProfile);
  }, [otherUser, getProfile]);

  // Mark as read when opened
  const markReadMutate = markRead.mutate;
  useEffect(() => {
    markReadMutate(otherUser);
  }, [otherUser, markReadMutate]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  });

  const handleSend = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setMessage("");
    try {
      await sendMessage.mutateAsync({ to: otherUser, content: trimmed });
    } catch {
      // silently fail
    }
    textareaRef.current?.focus();
  }, [message, otherUser, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const avatarUrl = otherProfile?.avatar?.getDirectURL();
  const initials = getInitials(otherProfile?.displayName);

  const sortedMessages = [...messages].sort((a, b) =>
    Number(a.timestamp - b.timestamp),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-border/40 flex-shrink-0"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.38 0.18 268), oklch(0.48 0.20 255))",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="md:hidden text-white/80 hover:text-white transition-colors p-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Avatar className="h-9 w-9 flex-shrink-0">
          {avatarUrl && <AvatarImage src={avatarUrl} />}
          <AvatarFallback className="bg-white/20 text-white text-sm font-display font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm text-white">
            {otherProfile?.displayName ??
              `${otherUser.toString().slice(0, 12)}...`}
          </p>
          {otherProfile?.bio && (
            <p className="text-xs text-white/70 truncate max-w-[160px]">
              {otherProfile.bio}
            </p>
          )}
        </div>

        {/* Call buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => onStartCall("audio")}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
            title="Audio Call"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onStartCall("video")}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
            title="Video Call"
          >
            <Video className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ minHeight: 0 }}
      >
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  i % 2 === 0 ? "justify-end" : "justify-start",
                )}
              >
                <Skeleton
                  className={cn(
                    "h-10 rounded-2xl",
                    i % 2 === 0 ? "w-48" : "w-40",
                  )}
                />
              </div>
            ))}
          </div>
        )}

        {!isLoading && sortedMessages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full gap-3 py-12"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "oklch(0.94 0.04 250)" }}
            >
              <MessageCircle
                className="w-7 h-7"
                style={{ color: "oklch(0.45 0.18 262)" }}
              />
            </div>
            <p className="font-display font-semibold text-foreground">
              Start the conversation
            </p>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Say hello to {otherProfile?.displayName ?? "this person"} —
              they're waiting to hear from you!
            </p>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {sortedMessages.map((msg) => {
            const isMine = msg.senderId.toString() === myPrincipalStr;
            return (
              <motion.div
                key={msg.id.toString()}
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.18 }}
                className={cn("flex", isMine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                    isMine
                      ? "rounded-br-md text-white"
                      : "rounded-bl-md bg-card text-foreground border border-border/50",
                  )}
                  style={
                    isMine
                      ? {
                          background:
                            "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
                        }
                      : undefined
                  }
                >
                  <p>{msg.content}</p>
                  <p
                    className={cn(
                      "text-[10px] mt-1 text-right",
                      isMine ? "text-white/60" : "text-muted-foreground",
                    )}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Compose area */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-border/40 bg-background">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            className="flex-1 resize-none rounded-2xl min-h-[44px] max-h-[120px] py-2.5 text-sm"
            style={{ lineHeight: "1.5" }}
          />
          <Button
            type="button"
            onClick={handleSend}
            disabled={!message.trim() || sendMessage.isPending}
            size="icon"
            className="rounded-2xl h-11 w-11 flex-shrink-0"
            style={{
              background: message.trim()
                ? "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))"
                : undefined,
              color: "white",
            }}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick call buttons at bottom */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
          <button
            type="button"
            onClick={() => onStartCall("audio")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <Phone className="w-3.5 h-3.5" />
            Audio Call
          </button>
          <button
            type="button"
            onClick={() => onStartCall("video")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <Video className="w-3.5 h-3.5" />
            Video Call
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Messages Page ──────────────────────────────────────────────────────────

type ActiveThread =
  | { type: "dm"; principal: Principal }
  | { type: "group"; group: Group };

interface IncomingCall {
  callId: string;
  callerPrincipal: Principal;
  callerProfile: UserProfile | null;
  isVideo: boolean;
}

interface MessagesPageProps {
  initialContact?: Principal;
}

export function MessagesPage({ initialContact }: MessagesPageProps) {
  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const { getProfile } = useUserProfileCache();
  const myPrincipal = identity?.getPrincipal();

  const { data: conversations = [], isLoading: convLoading } =
    useGetConversations();
  const { data: groups = [] } = useGetMyGroups();

  const [activeThread, setActiveThread] = useState<ActiveThread | null>(
    initialContact ? { type: "dm", principal: initialContact } : null,
  );
  const [search, setSearch] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "thread">(
    initialContact ? "thread" : "list",
  );

  // Call states
  const [activeOutgoingCall, setActiveOutgoingCall] = useState<{
    principal: Principal;
    profile: UserProfile | null;
    isVideo: boolean;
  } | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeIncomingCall, setActiveIncomingCall] =
    useState<IncomingCall | null>(null);

  // Poll for incoming calls from conversation partners
  useEffect(() => {
    if (!actor || !myPrincipal || conversations.length === 0) return;

    const checkIncoming = async () => {
      for (const contactPrincipal of conversations) {
        const callId = `${contactPrincipal.toString()}-${myPrincipal.toString()}`;
        try {
          const offer = await (actor as any).getCallOffer(callId);
          if (offer) {
            const profile = await getProfile(contactPrincipal);
            setIncomingCall({
              callId,
              callerPrincipal: contactPrincipal,
              callerProfile: profile,
              isVideo: true,
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
  }, [actor, myPrincipal, conversations, getProfile]);

  useEffect(() => {
    if (initialContact) {
      setActiveThread({ type: "dm", principal: initialContact });
      setMobileView("thread");
    }
  }, [initialContact]);

  const handleSelectDM = (principal: Principal) => {
    setActiveThread({ type: "dm", principal });
    setMobileView("thread");
  };

  const handleSelectGroup = (group: Group) => {
    setActiveThread({ type: "group", group });
    setMobileView("thread");
  };

  const handleBack = () => {
    setMobileView("list");
  };

  const handleStartCall = (type: "audio" | "video") => {
    if (!activeThread || activeThread.type !== "dm") return;
    const principal = activeThread.principal;
    getProfile(principal).then((profile) => {
      setActiveOutgoingCall({
        principal,
        profile,
        isVideo: type === "video",
      });
    });
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

  // Merge: if initialContact isn't in conversations yet, include it
  const allContacts: Principal[] = (() => {
    if (!initialContact) return conversations;
    const exists = conversations.some(
      (c) => c.toString() === initialContact.toString(),
    );
    return exists ? conversations : [initialContact, ...conversations];
  })();

  const activeContactStr =
    activeThread?.type === "dm" ? activeThread.principal.toString() : null;
  const activeGroupId =
    activeThread?.type === "group" ? activeThread.group.id.toString() : null;

  return (
    <div className="bg-card rounded-2xl card-shadow overflow-hidden flex flex-col md:flex-row h-[calc(100vh-200px)] min-h-[500px]">
      {/* Contact list */}
      <aside
        className={cn(
          "flex-shrink-0 border-r border-border/40 flex flex-col",
          "md:w-64 lg:w-72",
          mobileView === "thread" ? "hidden md:flex" : "flex w-full",
        )}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/40">
          <h2 className="font-display font-bold text-base text-foreground flex items-center gap-2">
            <MessageCircle
              className="w-4 h-4"
              style={{ color: "oklch(0.45 0.18 262)" }}
            />
            Messages
          </h2>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border/40">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-8 pr-3 py-2 text-sm bg-muted/50 rounded-xl border-0 outline-none focus:bg-muted transition-colors placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {convLoading && (
            <div className="space-y-1 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-2">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="w-32 h-3.5 rounded" />
                    <Skeleton className="w-24 h-3 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Direct messages */}
          {!convLoading && allContacts.length === 0 && groups.length === 0 && (
            <div className="py-12 text-center px-4">
              <MessageCircle
                className="w-8 h-8 mx-auto mb-3"
                style={{ color: "oklch(0.65 0.08 260)" }}
              />
              <p className="text-sm font-semibold text-foreground">
                No conversations yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Message a seller from the Shop to start chatting
              </p>
            </div>
          )}

          {allContacts.length > 0 && (
            <>
              <div className="px-4 py-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Direct Messages
                </p>
              </div>
              {allContacts.map((principal) => (
                <ContactItem
                  key={principal.toString()}
                  principal={principal}
                  isActive={activeContactStr === principal.toString()}
                  onClick={() => handleSelectDM(principal)}
                />
              ))}
            </>
          )}

          {/* Groups */}
          {groups.length > 0 && (
            <>
              <div className="px-4 py-1.5 mt-2 border-t border-border/30 pt-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Groups
                </p>
              </div>
              {groups.map((group) => (
                <GroupContactItem
                  key={group.id.toString()}
                  group={group}
                  isActive={activeGroupId === group.id.toString()}
                  onClick={() => handleSelectGroup(group)}
                />
              ))}
            </>
          )}
        </ScrollArea>
      </aside>

      {/* Thread panel */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0",
          mobileView === "list" ? "hidden md:flex" : "flex",
        )}
      >
        {activeThread ? (
          activeThread.type === "dm" ? (
            <ConversationThread
              key={activeThread.principal.toString()}
              otherUser={activeThread.principal}
              onBack={handleBack}
              onStartCall={handleStartCall}
            />
          ) : (
            myPrincipal && (
              <GroupThread
                key={activeThread.group.id.toString()}
                group={activeThread.group}
                myPrincipal={myPrincipal}
                onBack={handleBack}
              />
            )
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.90 0.04 265), oklch(0.94 0.03 250))",
              }}
            >
              <MessageCircle
                className="w-10 h-10"
                style={{ color: "oklch(0.45 0.18 262)" }}
              />
            </motion.div>
            <div>
              <p className="font-display font-bold text-lg text-foreground">
                Your Messages
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Select a conversation to read messages, or click "Message" on a
                seller's profile in the Shop.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Outgoing call */}
      {activeOutgoingCall && (
        <VideoCallModal
          friendPrincipal={activeOutgoingCall.principal}
          friendProfile={activeOutgoingCall.profile}
          onClose={() => setActiveOutgoingCall(null)}
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

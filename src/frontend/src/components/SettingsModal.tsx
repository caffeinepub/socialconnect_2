import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Principal } from "@icp-sdk/core/principal";
import {
  Briefcase,
  ExternalLink,
  Film,
  Key,
  Loader2,
  MessageSquare,
  Monitor,
  Moon,
  Plus,
  Sun,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob, type Group, type UserProfile } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddGroupMember,
  useCreateGroup,
  useCreateReel,
  useDeleteGroup,
  useDeleteReel,
  useGetAllReels,
  useGetCallerUserProfile,
  useGetFriends,
  useGetGroupMessages,
  useGetMyGroups,
  useSaveProfile,
  useSendGroupMessage,
} from "../hooks/useQueries";
import type { Theme } from "../hooks/useTheme";
import { useUserProfileCache } from "../hooks/useUserProfileCache";
import { useThemeContext } from "./ThemeProvider";

function getInitials(name: string | undefined | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTime(timestamp: bigint): string {
  const ms = Number(timestamp / 1_000_000n);
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Theme Tab ─────────────────────────────────────────────────────────────

function ThemeTab() {
  const { theme, setTheme } = useThemeContext();

  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="w-5 h-5" /> },
    { value: "dark", label: "Dark", icon: <Moon className="w-5 h-5" /> },
    { value: "system", label: "System", icon: <Monitor className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display font-semibold text-base mb-1">
          Appearance
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose your preferred theme
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {options.map(({ value, label, icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={cn(
              "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all",
              theme === value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-secondary/50",
            )}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                theme === value ? "text-white" : "text-muted-foreground",
              )}
              style={
                theme === value
                  ? {
                      background:
                        "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
                    }
                  : undefined
              }
            >
              {icon}
            </div>
            <span
              className={cn(
                "text-sm font-semibold",
                theme === value ? "text-primary" : "text-foreground",
              )}
            >
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Account Tab ───────────────────────────────────────────────────────────

function AccountTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display font-semibold text-base mb-1">
          Account Security
        </h3>
        <p className="text-sm text-muted-foreground">
          Manage your authentication credentials
        </p>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
              }}
            >
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm font-display">
                Change Password
              </p>
              <p className="text-xs text-muted-foreground">
                Update your Internet Identity credentials
              </p>
            </div>
          </div>
          <Separator />
          <p className="text-sm text-muted-foreground leading-relaxed">
            SocialConnect uses Internet Identity for secure, passwordless
            authentication. To change your identity credentials or manage
            recovery devices, visit the Internet Identity dashboard.
          </p>
          <a
            href="https://identity.ic0.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-2 font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Internet Identity Dashboard
            </Button>
          </a>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.55 0.22 25), oklch(0.65 0.20 15))",
              }}
            >
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm font-display">
                Forgot Password / Recovery
              </p>
              <p className="text-xs text-muted-foreground">
                Recover access to your account
              </p>
            </div>
          </div>
          <Separator />
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you&apos;ve lost access to your Internet Identity, you can
            recover it using a recovery phrase or hardware key you previously
            added.
          </p>
          <a
            href="https://identity.ic0.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-2 font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Recover Account
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Group Chat Thread ─────────────────────────────────────────────────────

interface GroupThreadProps {
  group: Group;
  myPrincipal: Principal;
  onBack: () => void;
}

function GroupThread({ group, myPrincipal, onBack }: GroupThreadProps) {
  const { data: messages = [] } = useGetGroupMessages(group.id);
  const sendMessage = useSendGroupMessage();
  const addMember = useAddGroupMember();
  const { data: friends = [] } = useGetFriends(myPrincipal);
  const { getProfile } = useUserProfileCache();
  const [message, setMessage] = useState("");
  const [profiles, setProfiles] = useState<Record<string, UserProfile | null>>(
    {},
  );
  const [showAddMember, setShowAddMember] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const myPrincipalStr = myPrincipal.toString();
  const isCreator = group.creatorId.toString() === myPrincipalStr;

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

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setMessage("");
    try {
      await sendMessage.mutateAsync({ groupId: group.id, content: trimmed });
    } catch {
      // silent
    }
  };

  const handleAddMember = async (principal: Principal) => {
    try {
      await addMember.mutateAsync({ groupId: group.id, member: principal });
      toast.success("Member added!");
    } catch {
      toast.error("Failed to add member");
    }
  };

  const sortedMessages = [...messages].sort((a, b) =>
    Number(a.timestamp - b.timestamp),
  );
  const memberSet = new Set(group.memberIds.map((m) => m.toString()));
  const eligibleFriends = friends.filter((f) => !memberSet.has(f.toString()));

  return (
    <div className="flex flex-col h-full">
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
          className="text-white/80 hover:text-white transition-colors p-1"
        >
          ← Back
        </button>
        <Users className="w-5 h-5 text-white" />
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm text-white truncate">
            {group.name}
          </p>
          <p className="text-xs text-white/70">
            {group.memberIds.length} members
          </p>
        </div>
        {isCreator && (
          <button
            type="button"
            onClick={() => setShowAddMember(!showAddMember)}
            className="text-white/80 hover:text-white transition-colors p-1"
          >
            <UserCheck className="w-4 h-4" />
          </button>
        )}
      </div>

      {showAddMember && eligibleFriends.length > 0 && (
        <div className="px-4 py-2 border-b border-border/40 bg-secondary/30">
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            Add friends to group:
          </p>
          <div className="flex flex-wrap gap-2">
            {eligibleFriends.map((f) => (
              <AddMemberChip
                key={f.toString()}
                principal={f}
                onAdd={handleAddMember}
              />
            ))}
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
        style={{ minHeight: 0 }}
      >
        {sortedMessages.map((msg) => {
          const isMine = msg.senderId.toString() === myPrincipalStr;
          const senderProfile = profiles[msg.senderId.toString()];
          return (
            <div
              key={msg.id.toString()}
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
                    className="text-white text-[9px]"
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
                  "max-w-[72%] px-3 py-2 rounded-2xl text-sm leading-relaxed",
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
                    "text-[10px] mt-0.5 text-right",
                    isMine ? "text-white/60" : "text-muted-foreground",
                  )}
                >
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-shrink-0 px-4 py-3 border-t border-border/40 bg-background">
        <div className="flex items-end gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 resize-none rounded-2xl min-h-[40px] max-h-[100px] py-2 text-sm"
          />
          <Button
            type="button"
            onClick={handleSend}
            disabled={!message.trim() || sendMessage.isPending}
            size="icon"
            className="rounded-2xl h-10 w-10 flex-shrink-0"
            style={{
              background: message.trim()
                ? "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))"
                : undefined,
              color: "white",
            }}
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddMemberChip({
  principal,
  onAdd,
}: { principal: Principal; onAdd: (p: Principal) => void }) {
  const { getProfile } = useUserProfileCache();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getProfile(principal).then(setProfile);
  }, [principal, getProfile]);

  return (
    <button
      type="button"
      onClick={() => onAdd(principal)}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
    >
      <Plus className="w-3 h-3" />
      {profile?.displayName ?? principal.toString().slice(0, 10)}
    </button>
  );
}

// ── Groups Tab ────────────────────────────────────────────────────────────

function GroupsTab({ myPrincipal }: { myPrincipal: Principal }) {
  const { data: groups = [], isLoading } = useGetMyGroups();
  const createGroup = useCreateGroup();
  const deleteGroup = useDeleteGroup();
  const [newGroupName, setNewGroupName] = useState("");
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const isCreator = (group: Group) =>
    group.creatorId.toString() === myPrincipal.toString();

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await createGroup.mutateAsync(newGroupName.trim());
      setNewGroupName("");
      toast.success("Group created!");
    } catch {
      toast.error("Failed to create group");
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    setDeleting(group.id.toString());
    try {
      await deleteGroup.mutateAsync(group.id);
      toast.success("Group deleted");
      if (activeGroup?.id === group.id) setActiveGroup(null);
    } catch {
      toast.error("Failed to delete group");
    } finally {
      setDeleting(null);
    }
  };

  if (activeGroup) {
    return (
      <GroupThread
        group={activeGroup}
        myPrincipal={myPrincipal}
        onBack={() => setActiveGroup(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display font-semibold text-base mb-1">Groups</h3>
        <p className="text-sm text-muted-foreground">
          Create and manage your group chats
        </p>
      </div>

      {/* Create group */}
      <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-3">
        <p className="font-semibold text-sm font-display">Create New Group</p>
        <div className="flex gap-2">
          <Input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Group name…"
            className="rounded-xl flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateGroup();
            }}
          />
          <Button
            onClick={handleCreateGroup}
            disabled={createGroup.isPending || !newGroupName.trim()}
            className="rounded-xl gap-1.5 font-semibold"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
              color: "white",
            }}
          >
            {createGroup.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Create
          </Button>
        </div>
      </div>

      {/* Groups list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-14 rounded-xl bg-secondary/40 animate-pulse"
            />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-10">
          <Users className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
          <p className="font-semibold text-foreground font-display">
            No groups yet
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Create a group to start chatting
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <button
              key={group.id.toString()}
              type="button"
              className="w-full flex items-center gap-3 p-3 bg-card rounded-xl card-shadow hover:bg-secondary/30 transition-colors cursor-pointer text-left"
              onClick={() => setActiveGroup(group)}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
                }}
              >
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm font-display truncate">
                  {group.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {group.memberIds.length} members
                </p>
              </div>
              {isCreator(group) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteGroup(group);
                  }}
                  disabled={deleting === group.id.toString()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                >
                  {deleting === group.id.toString() ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Reels Tab ─────────────────────────────────────────────────────────────

function ReelsTab({ myPrincipal }: { myPrincipal: Principal }) {
  const { data: reels = [], isLoading } = useGetAllReels();
  const createReel = useCreateReel();
  const deleteReel = useDeleteReel();
  const [title, setTitle] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { getProfile } = useUserProfileCache();
  const [profiles, setProfiles] = useState<Record<string, UserProfile | null>>(
    {},
  );

  const myPrincipalStr = myPrincipal.toString();

  useEffect(() => {
    const creators = [...new Set(reels.map((r) => r.creatorId.toString()))];
    const missing = creators.filter((c) => !profiles[c]);
    if (missing.length === 0) return;
    Promise.all(
      missing.map(async (c) => {
        const principal = reels.find(
          (r) => r.creatorId.toString() === c,
        )?.creatorId;
        if (!principal) return;
        const profile = await getProfile(principal);
        setProfiles((prev) => ({ ...prev, [c]: profile }));
      }),
    );
  }, [reels, getProfile, profiles]);

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
    } catch {
      toast.error("Failed to upload reel");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: bigint) => {
    setDeleting(id.toString());
    try {
      await deleteReel.mutateAsync(id);
      toast.success("Reel deleted");
    } catch {
      toast.error("Failed to delete reel");
    } finally {
      setDeleting(null);
    }
  };

  const sortedReels = [...reels].sort((a, b) =>
    Number(b.timestamp - a.timestamp),
  );

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display font-semibold text-base mb-1">Reels</h3>
        <p className="text-sm text-muted-foreground">
          Upload and manage short videos
        </p>
      </div>

      {/* Upload */}
      <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-3">
        <p className="font-semibold text-sm font-display">Upload a Reel</p>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Reel title…"
          className="rounded-xl"
        />
        <div>
          {videoFile ? (
            <div className="flex items-center justify-between p-2 bg-primary/10 rounded-xl">
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
              className="w-full h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <Film className="w-5 h-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Click to select video
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
              Upload Reel
            </>
          )}
        </Button>
      </div>

      {/* Reels list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-secondary/40 animate-pulse"
            />
          ))}
        </div>
      ) : sortedReels.length === 0 ? (
        <div className="text-center py-10">
          <Film className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
          <p className="font-semibold text-foreground font-display">
            No reels yet
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a short video to get started
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedReels.map((reel) => {
            const isOwner = reel.creatorId.toString() === myPrincipalStr;
            const creator = profiles[reel.creatorId.toString()];
            const videoUrl = reel.video.getDirectURL();
            return (
              <div
                key={reel.id.toString()}
                className="flex items-center gap-3 p-3 bg-card rounded-xl card-shadow"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                  <video
                    src={videoUrl}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm font-display truncate">
                    {reel.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {creator?.displayName ??
                      reel.creatorId.toString().slice(0, 12)}
                  </p>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => handleDelete(reel.id)}
                    disabled={deleting === reel.id.toString()}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                  >
                    {deleting === reel.id.toString() ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Professional Tab ──────────────────────────────────────────────────────

function ProfessionalTab() {
  const { data: profile } = useGetCallerUserProfile();
  const saveProfile = useSaveProfile();
  const [isProfessional, setIsProfessional] = useState(
    profile?.isProfessional ?? false,
  );
  const [professionalTitle, setProfessionalTitle] = useState(
    profile?.professionalTitle ?? "",
  );

  useEffect(() => {
    if (profile) {
      setIsProfessional(profile.isProfessional ?? false);
      setProfessionalTitle(profile.professionalTitle ?? "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    try {
      await saveProfile.mutateAsync({
        ...profile,
        isProfessional,
        professionalTitle: professionalTitle.trim() || undefined,
      });
      toast.success("Professional profile updated!");
    } catch {
      toast.error("Failed to update profile");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display font-semibold text-base mb-1">
          Professional Profile
        </h3>
        <p className="text-sm text-muted-foreground">
          Professional mode adds your title prominently and gives your profile a
          more formal appearance.
        </p>
      </div>

      <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
              }}
            >
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm font-display">
                Professional Mode
              </p>
              <p className="text-xs text-muted-foreground">
                Enable professional profile appearance
              </p>
            </div>
          </div>
          <Switch
            checked={isProfessional}
            onCheckedChange={setIsProfessional}
          />
        </div>

        <AnimatePresence>
          {isProfessional && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Separator className="mb-4" />
              <div className="space-y-2">
                <Label className="font-semibold">Professional Title</Label>
                <Input
                  value={professionalTitle}
                  onChange={(e) => setProfessionalTitle(e.target.value)}
                  placeholder="e.g. Software Engineer at Acme Corp"
                  maxLength={80}
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  This will appear prominently on your profile
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isProfessional && (
        <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-2">
          <p className="font-semibold text-sm font-display text-primary flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Professional Profile Preview
          </p>
          <p className="text-xs text-muted-foreground">
            Your profile will display a professional badge and your title
            prominently under your name.
          </p>
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={saveProfile.isPending || !profile}
        className="w-full rounded-xl font-semibold"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
          color: "white",
        }}
      >
        {saveProfile.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save Changes"
        )}
      </Button>
    </div>
  );
}

// ── Settings Modal ────────────────────────────────────────────────────────

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: string;
}

export function SettingsModal({
  open,
  onClose,
  defaultTab = "theme",
}: SettingsModalProps) {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal() ?? null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] rounded-2xl flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0 flex-shrink-0">
          <DialogTitle className="font-display text-xl">Settings</DialogTitle>
        </DialogHeader>

        <Tabs
          defaultValue={defaultTab}
          className="flex-1 flex flex-col min-h-0 mt-4"
        >
          <TabsList className="mx-6 rounded-xl bg-muted/60 flex-shrink-0">
            <TabsTrigger
              value="theme"
              className="flex-1 rounded-lg text-xs sm:text-sm gap-1"
            >
              <Sun className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Theme</span>
            </TabsTrigger>
            <TabsTrigger
              value="account"
              className="flex-1 rounded-lg text-xs sm:text-sm gap-1"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger
              value="groups"
              className="flex-1 rounded-lg text-xs sm:text-sm gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Groups</span>
            </TabsTrigger>
            <TabsTrigger
              value="reels"
              className="flex-1 rounded-lg text-xs sm:text-sm gap-1"
            >
              <Film className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reels</span>
            </TabsTrigger>
            <TabsTrigger
              value="professional"
              className="flex-1 rounded-lg text-xs sm:text-sm gap-1"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pro</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-5">
              <TabsContent value="theme" className="mt-0">
                <ThemeTab />
              </TabsContent>
              <TabsContent value="account" className="mt-0">
                <AccountTab />
              </TabsContent>
              <TabsContent value="groups" className="mt-0 h-[calc(60vh-8rem)]">
                {myPrincipal && <GroupsTab myPrincipal={myPrincipal} />}
              </TabsContent>
              <TabsContent value="reels" className="mt-0">
                {myPrincipal && <ReelsTab myPrincipal={myPrincipal} />}
              </TabsContent>
              <TabsContent value="professional" className="mt-0">
                <ProfessionalTab />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

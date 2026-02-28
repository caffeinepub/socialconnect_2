import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import type { Principal } from "@icp-sdk/core/principal";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Film,
  Gift,
  Home,
  Loader2,
  LogOut,
  MessageCircle,
  Monitor,
  Moon,
  Settings,
  ShoppingBag,
  Sun,
  User,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { LoginPage } from "./components/LoginPage";
import { ProfileSetupModal } from "./components/ProfileSetupModal";
import { SettingsModal } from "./components/SettingsModal";
import { useThemeContext } from "./components/ThemeProvider";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useGetMyUsername,
  useGetNotifications,
  useGetUnreadMessageCount,
} from "./hooks/useQueries";
import { FeedPage } from "./pages/FeedPage";
import { FriendsPage } from "./pages/FriendsPage";
import { InviteEarnPage } from "./pages/InviteEarnPage";
import { MessagesPage } from "./pages/MessagesPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReelsPage } from "./pages/ReelsPage";
import { ShopPage } from "./pages/ShopPage";

type Page =
  | "feed"
  | "friends"
  | "notifications"
  | "profile"
  | "shop"
  | "messages"
  | "reels"
  | "invite";

function getInitials(name: string | undefined | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const navItems = [
  { id: "feed" as Page, icon: Home, label: "Feed" },
  { id: "friends" as Page, icon: Users, label: "Friends" },
  { id: "shop" as Page, icon: ShoppingBag, label: "Shop" },
  { id: "messages" as Page, icon: MessageCircle, label: "Messages" },
  { id: "reels" as Page, icon: Film, label: "Reels" },
  { id: "notifications" as Page, icon: Bell, label: "Notifs" },
  { id: "invite" as Page, icon: Gift, label: "Invite" },
  { id: "profile" as Page, icon: User, label: "Profile" },
];

export default function App() {
  const { identity, clear, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;
  const [activePage, setActivePage] = useState<Page>("feed");
  const [messagesInitialContact, setMessagesInitialContact] =
    useState<Principal | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { theme, setTheme } = useThemeContext();

  const {
    data: profile,
    isLoading: profileLoading,
    isFetched: profileFetched,
  } = useGetCallerUserProfile();

  const { data: myUsername } = useGetMyUsername();

  const { data: notifications = [] } = useGetNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const { data: unreadMessageCountRaw = 0n } = useGetUnreadMessageCount();
  const unreadMessageCount = Number(unreadMessageCountRaw);

  const handleMessageSeller = (seller: Principal) => {
    setMessagesInitialContact(seller);
    setActivePage("messages");
  };

  const showProfileSetup =
    isAuthenticated && !profileLoading && profileFetched && profile === null;

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    setActivePage("feed");
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/assets/uploads/Gemini_Generated_Image_rdewperdewperdew-1.png"
            alt="S Connect logo"
            className="w-12 h-12 object-contain"
          />
          <Loader2
            className="w-5 h-5 animate-spin"
            style={{ color: "oklch(0.45 0.18 262)" }}
          />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <Toaster />
      </>
    );
  }

  const avatarUrl = profile?.avatar?.getDirectURL();
  const displayLabel = profile?.displayName || myUsername || "User";
  const initials = getInitials(displayLabel);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster richColors position="top-center" />

      {/* Settings Modal */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Profile Setup Modal */}
      <ProfileSetupModal open={showProfileSetup} defaultUsername={myUsername} />

      {/* Top Navbar */}
      <header
        className="sticky top-0 z-40 shadow-nav"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.38 0.18 268), oklch(0.48 0.20 255))",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/uploads/Gemini_Generated_Image_rdewperdewperdew-1.png"
              alt="S Connect logo"
              className="w-8 h-8 object-contain"
            />
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ id, icon: Icon, label }) => (
              <button
                type="button"
                key={id}
                onClick={() => setActivePage(id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150",
                  activePage === id
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10",
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
                {id === "notifications" && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 badge-notification text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
                {id === "messages" && unreadMessageCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 badge-notification text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Profile menu */}
          <div className="flex items-center gap-3">
            {/* Mobile notification badge */}
            <div className="md:hidden relative">
              <button
                type="button"
                onClick={() => setActivePage("notifications")}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 badge-notification text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="focus:outline-none">
                  <Avatar className="h-8 w-8 border-2 border-white/30 hover:border-white/60 transition-colors cursor-pointer">
                    {avatarUrl && (
                      <AvatarImage src={avatarUrl} alt={profile?.displayName} />
                    )}
                    <AvatarFallback className="avatar-initials text-white text-xs font-display font-semibold">
                      {profileLoading ? "..." : initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <div className="px-3 py-2 border-b border-border">
                  <p className="font-semibold text-sm font-display">
                    {displayLabel}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {myUsername ??
                      identity.getPrincipal().toString().slice(0, 20)}
                    ...
                  </p>
                </div>
                <DropdownMenuItem
                  onClick={() => setActivePage("profile")}
                  className="gap-2 mt-1"
                >
                  <User className="w-4 h-4" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSettingsOpen(true)}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Theme quick-select */}
                <div className="px-2 py-1.5">
                  <p className="text-xs text-muted-foreground font-semibold mb-1.5 px-1">
                    Theme
                  </p>
                  <div className="flex gap-1">
                    {(["light", "dark", "system"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTheme(t)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all",
                          theme === t
                            ? "text-white"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                        )}
                        style={
                          theme === t
                            ? {
                                background:
                                  "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
                              }
                            : undefined
                        }
                      >
                        {t === "light" ? (
                          <Sun className="w-3 h-3" />
                        ) : t === "dark" ? (
                          <Moon className="w-3 h-3" />
                        ) : (
                          <Monitor className="w-3 h-3" />
                        )}
                        {t === "light" ? "L" : t === "dark" ? "D" : "S"}
                      </button>
                    ))}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 pb-24 md:pb-6">
        <div className="md:grid md:grid-cols-[240px_1fr] md:gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block">
            <div className="sticky top-20 space-y-1">
              {navItems.map(({ id, icon: Icon, label }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setActivePage(id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 text-left",
                    activePage === id
                      ? "text-white shadow-card"
                      : "text-foreground hover:bg-card hover:shadow-xs",
                  )}
                  style={
                    activePage === id
                      ? {
                          background:
                            "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
                        }
                      : undefined
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {label}
                  {id === "notifications" && unreadCount > 0 && (
                    <span className="ml-auto badge-notification text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  {id === "messages" && unreadMessageCount > 0 && (
                    <span className="ml-auto badge-notification text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                    </span>
                  )}
                </button>
              ))}

              {/* User card in sidebar */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-3 px-3 py-2">
                  <Avatar className="h-9 w-9">
                    {avatarUrl && <AvatarImage src={avatarUrl} />}
                    <AvatarFallback className="avatar-initials text-white text-xs font-display font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm font-display truncate">
                      {displayLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      View profile
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-foreground hover:bg-card transition-colors mt-1"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors mt-1"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </aside>

          {/* Page Content */}
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {activePage === "feed" && (
                  <FeedPage
                    currentProfile={profile ?? null}
                    onMessageUser={handleMessageSeller}
                  />
                )}
                {activePage === "friends" && <FriendsPage />}
                {activePage === "shop" && (
                  <ShopPage onMessageSeller={handleMessageSeller} />
                )}
                {activePage === "messages" && (
                  <MessagesPage
                    initialContact={messagesInitialContact ?? undefined}
                  />
                )}
                {activePage === "reels" && <ReelsPage />}
                {activePage === "notifications" && <NotificationsPage />}
                {activePage === "invite" && <InviteEarnPage />}
                {activePage === "profile" && (
                  <ProfilePage onOpenSettings={() => setSettingsOpen(true)} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/40 bg-background">
        <div className="flex items-center justify-around h-16 px-1">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button
              type="button"
              key={id}
              onClick={() => setActivePage(id)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all duration-150 flex-1",
                activePage === id ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon
                className="w-5 h-5"
                style={
                  activePage === id
                    ? { color: "oklch(0.45 0.18 262)" }
                    : undefined
                }
              />
              <span
                className={cn(
                  "text-[9px] font-semibold",
                  activePage === id && "font-bold",
                )}
                style={
                  activePage === id
                    ? { color: "oklch(0.45 0.18 262)" }
                    : undefined
                }
              >
                {label}
              </span>
              {id === "notifications" && unreadCount > 0 && (
                <span className="absolute top-1 right-1/4 badge-notification text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {id === "messages" && unreadMessageCount > 0 && (
                <span className="absolute top-1 right-1/4 badge-notification text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                </span>
              )}
              {activePage === id && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-1 w-1 h-1 rounded-full"
                  style={{ background: "oklch(0.45 0.18 262)" }}
                />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <footer className="hidden md:block text-center py-4 text-xs text-muted-foreground border-t border-border/40 bg-background">
        © {new Date().getFullYear()} SocialSpace. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}

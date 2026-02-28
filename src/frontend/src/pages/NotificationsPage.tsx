import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Bell, BellOff, Check } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import type { Notification } from "../hooks/useQueries";
import {
  useGetNotifications,
  useMarkNotificationAsRead,
} from "../hooks/useQueries";
import { formatRelativeTime } from "../utils/formatTime";

function NotificationItem({ notification }: { notification: Notification }) {
  const markAsRead = useMarkNotificationAsRead();

  const handleClick = () => {
    if (!notification.read) {
      markAsRead.mutate(notification.id, {
        onError: () => toast.error("Failed to mark as read"),
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl transition-all cursor-pointer",
        !notification.read
          ? "bg-card card-shadow hover:card-shadow-hover border border-primary/20"
          : "bg-card/60 hover:bg-card hover:card-shadow border border-transparent",
      )}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
          !notification.read ? "text-white" : "bg-muted",
        )}
        style={
          !notification.read
            ? {
                background:
                  "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
              }
            : undefined
        }
      >
        <Bell
          className={cn(
            "w-4 h-4",
            !notification.read ? "text-white" : "text-muted-foreground",
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-body leading-snug",
            !notification.read
              ? "text-foreground font-medium"
              : "text-muted-foreground",
          )}
        >
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatRelativeTime(notification.timestamp)}
        </p>
      </div>
      {!notification.read && (
        <div className="flex-shrink-0 flex items-center gap-1">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: "oklch(0.45 0.18 262)" }}
          />
        </div>
      )}
      {notification.read && (
        <Check className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0 mt-1" />
      )}
    </motion.div>
  );
}

export function NotificationsPage() {
  const { data: notifications = [], isLoading } = useGetNotifications();

  const unreadCount = notifications.filter((n) => !n.read).length;
  const sortedNotifications = [...notifications].sort((a, b) => {
    const tA = Number(a.timestamp / 1_000_000n);
    const tB = Number(b.timestamp / 1_000_000n);
    return tB - tA;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <span
            className="text-xs font-bold px-2 py-1 rounded-full text-white"
            style={{ background: "oklch(0.62 0.24 25)" }}
          >
            {unreadCount} new
          </span>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-4 bg-card rounded-xl card-shadow"
            >
              <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="w-3/4 h-3.5 rounded" />
                <Skeleton className="w-1/3 h-3 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && notifications.length === 0 && (
        <div className="text-center py-16">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "oklch(0.94 0.04 250)" }}
          >
            <BellOff
              className="w-8 h-8"
              style={{ color: "oklch(0.45 0.18 262)" }}
            />
          </div>
          <p className="font-display font-semibold text-foreground">
            No notifications yet
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Interactions with your posts will appear here.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {sortedNotifications.map((notification) => (
          <NotificationItem
            key={notification.id.toString()}
            notification={notification}
          />
        ))}
      </div>
    </div>
  );
}

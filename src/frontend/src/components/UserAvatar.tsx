import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { UserProfile } from "../backend";

interface UserAvatarProps {
  profile: UserProfile | null | undefined;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-20 w-20 text-xl",
};

function getInitials(name: string | undefined | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({
  profile,
  size = "md",
  className,
}: UserAvatarProps) {
  const avatarUrl = profile?.avatar?.getDirectURL();
  const initials = getInitials(profile?.displayName);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl && (
        <AvatarImage src={avatarUrl} alt={profile?.displayName ?? "User"} />
      )}
      <AvatarFallback className="avatar-initials text-white font-display font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

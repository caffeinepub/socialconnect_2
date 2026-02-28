import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Principal } from "@icp-sdk/core/principal";
import {
  Briefcase,
  Camera,
  Edit3,
  FileText,
  ImagePlus,
  Loader2,
  Package,
  Settings,
  ShoppingBag,
  Tag,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { Suspense, lazy, useEffect } from "react";
import { toast } from "sonner";
import { ExternalBlob, type UserProfile } from "../backend";
import { PostCard } from "../components/PostCard";
import { UserAvatar } from "../components/UserAvatar";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import type { StoreListing } from "../hooks/useQueries";
import {
  useCreateStoreListing,
  useDeleteStoreListing,
  useGetCallerUserProfile,
  useGetFollowers,
  useGetFollowing,
  useGetFriends,
  useGetMyUsername,
  useGetPostsByUser,
  useGetStoreListingsByUser,
  useSaveProfile,
} from "../hooks/useQueries";
import { useUserProfileCache } from "../hooks/useUserProfileCache";

function FriendItem({ principal }: { principal: Principal }) {
  const { getProfile } = useUserProfileCache();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getProfile(principal).then(setProfile);
  }, [principal, getProfile]);

  return (
    <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors">
      <UserAvatar profile={profile} size="md" />
      <div className="min-w-0">
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
          <div className="space-y-1.5">
            <Skeleton className="w-24 h-3.5 rounded" />
            <Skeleton className="w-16 h-3 rounded" />
          </div>
        )}
      </div>
      <UserCheck className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
    </div>
  );
}

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
}

function EditProfileModal({
  open,
  onClose,
  currentProfile,
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(currentProfile.displayName);
  const [bio, setBio] = useState(currentProfile.bio);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isProfessional, setIsProfessional] = useState(
    currentProfile.isProfessional ?? false,
  );
  const [professionalTitle, setProfessionalTitle] = useState(
    currentProfile.professionalTitle ?? "",
  );
  const saveProfile = useSaveProfile();
  const { actor } = useActor();
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    setCoverFile(file);
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }
    try {
      let avatar = currentProfile.avatar;
      let coverPhoto = currentProfile.coverPhoto;

      if (avatarFile) {
        const bytes = new Uint8Array(await avatarFile.arrayBuffer());
        avatar = ExternalBlob.fromBytes(bytes);
      }
      if (coverFile) {
        const bytes = new Uint8Array(await coverFile.arrayBuffer());
        coverPhoto = ExternalBlob.fromBytes(bytes);
      }

      await saveProfile.mutateAsync({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatar,
        coverPhoto,
        isProfessional,
        professionalTitle: professionalTitle.trim() || undefined,
      });

      // Mark account as verified for referral tracking (silently)
      try {
        if (actor) {
          await actor.markAccountVerified();
        }
      } catch {
        // Silently swallow
      }

      // cleanup
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      if (coverPreview) URL.revokeObjectURL(coverPreview);

      toast.success("Profile updated!");
      onClose();
    } catch {
      toast.error("Failed to update profile");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Cover photo */}
          <div>
            <Label className="font-semibold mb-2 block">Cover Photo</Label>
            <button
              type="button"
              className={cn(
                "relative w-full h-28 rounded-xl overflow-hidden cursor-pointer group",
                "hover:opacity-90 transition-opacity",
              )}
              style={{
                background: coverPreview
                  ? undefined
                  : "linear-gradient(135deg, oklch(0.42 0.18 265) 0%, oklch(0.58 0.16 220) 100%)",
              }}
              onClick={() => coverRef.current?.click()}
            >
              {(coverPreview || currentProfile.coverPhoto?.getDirectURL()) && (
                <img
                  src={
                    coverPreview ?? currentProfile.coverPhoto!.getDirectURL()
                  }
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <input
                ref={coverRef}
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="sr-only"
              />
            </button>
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="relative cursor-pointer group"
              onClick={() => avatarRef.current?.click()}
            >
              <UserAvatar
                profile={
                  avatarPreview
                    ? {
                        ...currentProfile,
                        avatar: ExternalBlob.fromURL(avatarPreview),
                      }
                    : currentProfile
                }
                size="xl"
              />
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="sr-only"
              />
            </button>
            <div>
              <p className="font-semibold text-sm font-display">
                Profile Photo
              </p>
              <p className="text-xs text-muted-foreground">Click to change</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-name" className="font-semibold">
              Display Name
            </Label>
            <Input
              id="edit-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-bio" className="font-semibold">
              Bio
            </Label>
            <Textarea
              id="edit-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              rows={3}
              className="rounded-xl resize-none"
              placeholder="Tell us about yourself..."
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/200
            </p>
          </div>

          {/* Professional mode */}
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
            <div>
              <p className="font-semibold text-sm font-display">
                Professional Mode
              </p>
              <p className="text-xs text-muted-foreground">
                Display professional title on your profile
              </p>
            </div>
            <Switch
              checked={isProfessional}
              onCheckedChange={setIsProfessional}
            />
          </div>

          {isProfessional && (
            <div className="space-y-2">
              <Label htmlFor="edit-prof-title" className="font-semibold">
                Professional Title
              </Label>
              <Input
                id="edit-prof-title"
                value={professionalTitle}
                onChange={(e) => setProfessionalTitle(e.target.value)}
                maxLength={80}
                className="rounded-xl"
                placeholder="e.g. Software Engineer at Acme Corp"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveProfile.isPending || !displayName.trim()}
            className="rounded-xl font-semibold"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
              color: "white",
            }}
          >
            {saveProfile.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Shop Listing Card (Profile) ───────────────────────────────────────────

interface ProfileListingCardProps {
  listing: StoreListing;
  isOwner: boolean;
}

function ProfileListingCard({ listing, isOwner }: ProfileListingCardProps) {
  const deleteListingMutation = useDeleteStoreListing();
  const [deleting, setDeleting] = useState(false);
  const imageUrl = listing.image?.getDirectURL();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteListingMutation.mutateAsync(listing.id);
      toast.success("Item removed");
    } catch {
      toast.error("Failed to remove item");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl card-shadow overflow-hidden hover:card-shadow-hover transition-shadow group"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary/50">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package
              className="w-10 h-10"
              style={{ color: "oklch(0.65 0.08 260)" }}
            />
          </div>
        )}
        <div className="absolute bottom-2 left-2">
          <Badge
            className="font-bold text-white shadow-sm text-xs"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.55 0.22 235))",
              border: "none",
            }}
          >
            {listing.price}
          </Badge>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
          >
            {deleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="font-display font-semibold text-sm text-foreground line-clamp-1">
          {listing.title}
        </p>
        {listing.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {listing.description}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ── Add Item Modal (Profile) ──────────────────────────────────────────────

interface ProfileAddItemModalProps {
  open: boolean;
  onClose: () => void;
}

function ProfileAddItemModal({ open, onClose }: ProfileAddItemModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const imageRef = useRef<HTMLInputElement>(null);
  const createListing = useCreateStoreListing();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!price.trim()) {
      toast.error("Price is required");
      return;
    }
    try {
      let image: ExternalBlob | null = null;
      if (imageFile) {
        const bytes = new Uint8Array(await imageFile.arrayBuffer());
        image =
          ExternalBlob.fromBytes(bytes).withUploadProgress(setUploadProgress);
      }
      await createListing.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        price: price.trim(),
        image,
      });
      toast.success("Item listed!");
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setTitle("");
      setDescription("");
      setPrice("");
      setImageFile(null);
      setImagePreview(null);
      setUploadProgress(0);
      onClose();
    } catch {
      toast.error("Failed to list item");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" /> Add Item to Shop
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="font-semibold mb-2 block">Product Image</Label>
            {imagePreview ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Product"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (imagePreview) URL.revokeObjectURL(imagePreview);
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageRef.current?.click()}
                className="w-full h-32 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <ImagePlus
                  className="w-6 h-6"
                  style={{ color: "oklch(0.45 0.18 262)" }}
                />
                <p className="text-sm text-muted-foreground">Upload image</p>
              </button>
            )}
            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="sr-only"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-item-title" className="font-semibold">
              Title *
            </Label>
            <Input
              id="p-item-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Item name"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-item-desc" className="font-semibold">
              Description
            </Label>
            <Textarea
              id="p-item-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="Describe your item..."
              className="rounded-xl resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-item-price" className="font-semibold">
              Price *
            </Label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="p-item-price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. $25.00"
                className="rounded-xl pl-9"
              />
            </div>
          </div>
          {createListing.isPending && uploadProgress > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Uploading... {uploadProgress}%
              </p>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${uploadProgress}%`,
                    background:
                      "linear-gradient(90deg, oklch(0.42 0.18 265), oklch(0.62 0.2 220))",
                  }}
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createListing.isPending || !title.trim() || !price.trim()}
            className="rounded-xl font-semibold"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
              color: "white",
            }}
          >
            {createListing.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Listing...
              </>
            ) : (
              "List Item"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ProfilePageProps {
  onOpenSettings?: () => void;
}

export function ProfilePage({ onOpenSettings }: ProfilePageProps) {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal() ?? null;
  const { data: profile, isLoading: profileLoading } =
    useGetCallerUserProfile();
  const { data: myUsername } = useGetMyUsername();
  const { data: posts = [], isLoading: postsLoading } =
    useGetPostsByUser(myPrincipal);
  const { data: friends = [], isLoading: friendsLoading } =
    useGetFriends(myPrincipal);
  const { data: followers = [], isLoading: followersLoading } =
    useGetFollowers(myPrincipal);
  const { data: following = [] } = useGetFollowing(myPrincipal);
  const [editOpen, setEditOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);

  const { data: storeListings = [], isLoading: listingsLoading } =
    useGetStoreListingsByUser(myPrincipal);

  const sortedPosts = [...posts].sort((a, b) => {
    const tA = Number(a.timestamp / 1_000_000n);
    const tB = Number(b.timestamp / 1_000_000n);
    return tB - tA;
  });

  const coverUrl = profile?.coverPhoto?.getDirectURL();
  const displayName = profile?.displayName || myUsername || "User";

  return (
    <div className="space-y-4">
      {/* Profile header card */}
      <div className="bg-card rounded-2xl card-shadow overflow-hidden">
        {/* Cover photo */}
        <div
          className="relative h-36 md:h-48"
          style={{
            background: coverUrl
              ? undefined
              : "linear-gradient(135deg, oklch(0.42 0.18 265) 0%, oklch(0.58 0.16 220) 100%)",
          }}
        >
          {coverUrl && (
            <img
              src={coverUrl}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Profile info */}
        <div className="px-4 pb-4">
          <div className="flex items-end justify-between -mt-8 mb-3">
            {profileLoading ? (
              <Skeleton className="w-20 h-20 rounded-full border-4 border-card" />
            ) : (
              <div className="ring-4 ring-card rounded-full">
                <UserAvatar profile={profile ?? null} size="xl" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-2 font-semibold"
                onClick={() => setEditOpen(true)}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Profile
              </Button>
              {onOpenSettings && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-2 font-semibold"
                  onClick={onOpenSettings}
                >
                  <Settings className="w-3.5 h-3.5" />
                  Settings
                </Button>
              )}
            </div>
          </div>

          {profileLoading ? (
            <div className="space-y-2">
              <Skeleton className="w-40 h-5 rounded" />
              <Skeleton className="w-56 h-4 rounded" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-display font-bold text-foreground">
                  {displayName}
                </h2>
                {profile?.isProfessional && (
                  <Badge
                    className="text-xs font-semibold gap-1"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
                      color: "white",
                      border: "none",
                    }}
                  >
                    <Briefcase className="w-3 h-3" />
                    Pro
                  </Badge>
                )}
              </div>
              {profile?.isProfessional && profile.professionalTitle && (
                <p className="text-sm font-semibold text-primary mt-0.5 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  {profile.professionalTitle}
                </p>
              )}
              {profile?.bio && (
                <p className="text-sm font-body text-muted-foreground mt-1 leading-relaxed">
                  {profile.bio}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
                <span className="text-sm font-semibold text-foreground">
                  <span className="font-display">{posts.length}</span>
                  <span className="text-muted-foreground font-body ml-1">
                    posts
                  </span>
                </span>
                <span className="text-sm font-semibold text-foreground">
                  <span className="font-display">{friends.length}</span>
                  <span className="text-muted-foreground font-body ml-1">
                    friends
                  </span>
                </span>
                <span className="text-sm font-semibold text-foreground">
                  <span className="font-display">{followers.length}</span>
                  <span className="text-muted-foreground font-body ml-1">
                    followers
                  </span>
                </span>
                <span className="text-sm font-semibold text-foreground">
                  <span className="font-display">{following.length}</span>
                  <span className="text-muted-foreground font-body ml-1">
                    following
                  </span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts">
        <TabsList className="w-full rounded-xl bg-muted/60">
          <TabsTrigger
            value="posts"
            className="flex-1 rounded-lg gap-1.5 text-xs sm:text-sm"
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden xs:inline">Posts</span>
            <span className="xs:hidden">Posts</span>
          </TabsTrigger>
          <TabsTrigger
            value="shop"
            className="flex-1 rounded-lg gap-1.5 text-xs sm:text-sm"
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>Shop</span>
          </TabsTrigger>
          <TabsTrigger
            value="friends"
            className="flex-1 rounded-lg gap-1.5 text-xs sm:text-sm"
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>Friends</span>
          </TabsTrigger>
          <TabsTrigger
            value="followers"
            className="flex-1 rounded-lg gap-1.5 text-xs sm:text-sm"
          >
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>Followers</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4 space-y-3">
          {postsLoading && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="post-card p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="w-32 h-3.5 rounded" />
                      <Skeleton className="w-20 h-3 rounded" />
                    </div>
                  </div>
                  <Skeleton className="w-full h-4 rounded" />
                  <Skeleton className="w-4/5 h-4 rounded" />
                </div>
              ))}
            </div>
          )}

          {!postsLoading && sortedPosts.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="post-card p-10 text-center"
            >
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: "oklch(0.94 0.04 250)" }}
              >
                <FileText
                  className="w-7 h-7"
                  style={{ color: "oklch(0.45 0.18 262)" }}
                />
              </div>
              <p className="font-display font-semibold text-foreground">
                No posts yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Share something from the feed!
              </p>
            </motion.div>
          )}

          {sortedPosts.map((post) => (
            <PostCard key={post.id.toString()} post={post} />
          ))}
        </TabsContent>

        <TabsContent value="shop" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {storeListings.length} item{storeListings.length !== 1 ? "s" : ""}{" "}
              listed
            </p>
            <Button
              onClick={() => setAddItemOpen(true)}
              size="sm"
              className="rounded-xl font-semibold gap-1.5"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
                color: "white",
              }}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Add Item
            </Button>
          </div>

          {listingsLoading && (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-card rounded-2xl overflow-hidden card-shadow"
                >
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="w-3/4 h-3.5 rounded" />
                    <Skeleton className="w-full h-3 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!listingsLoading && storeListings.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="post-card p-10 text-center"
            >
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: "oklch(0.94 0.04 250)" }}
              >
                <ShoppingBag
                  className="w-7 h-7"
                  style={{ color: "oklch(0.45 0.18 262)" }}
                />
              </div>
              <p className="font-display font-semibold text-foreground">
                Nothing listed yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Add items to start selling!
              </p>
            </motion.div>
          )}

          {!listingsLoading && storeListings.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {storeListings.map((listing) => (
                <ProfileListingCard
                  key={listing.id.toString()}
                  listing={listing}
                  isOwner={true}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="friends" className="mt-4 space-y-3">
          {friendsLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl"
                >
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="w-28 h-3.5 rounded" />
                    <Skeleton className="w-20 h-3 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!friendsLoading && friends.length === 0 && (
            <div className="text-center py-10">
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: "oklch(0.94 0.04 250)" }}
              >
                <Users
                  className="w-7 h-7"
                  style={{ color: "oklch(0.45 0.18 262)" }}
                />
              </div>
              <p className="font-display font-semibold text-foreground">
                No friends yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Connect with people!
              </p>
            </div>
          )}

          {friends.map((principal) => (
            <FriendItem key={principal.toString()} principal={principal} />
          ))}
        </TabsContent>

        <TabsContent value="followers" className="mt-4 space-y-3">
          {followersLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl"
                >
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="w-28 h-3.5 rounded" />
                    <Skeleton className="w-20 h-3 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!followersLoading && followers.length === 0 && (
            <div className="text-center py-10">
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: "oklch(0.94 0.04 250)" }}
              >
                <UserPlus
                  className="w-7 h-7"
                  style={{ color: "oklch(0.45 0.18 262)" }}
                />
              </div>
              <p className="font-display font-semibold text-foreground">
                No followers yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Share posts to grow your audience!
              </p>
            </div>
          )}

          {followers.map((principal) => (
            <FriendItem key={principal.toString()} principal={principal} />
          ))}
        </TabsContent>
      </Tabs>

      {/* Edit Profile Modal */}
      {editOpen && (
        <EditProfileModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          currentProfile={
            profile ?? {
              displayName: myUsername ?? "",
              bio: "",
              isProfessional: false,
            }
          }
        />
      )}

      {/* Add Item Modal */}
      <ProfileAddItemModal
        open={addItemOpen}
        onClose={() => setAddItemOpen(false)}
      />
    </div>
  );
}

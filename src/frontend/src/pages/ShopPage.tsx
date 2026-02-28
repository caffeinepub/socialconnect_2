import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { Principal } from "@icp-sdk/core/principal";
import {
  ImagePlus,
  Loader2,
  MessageCircle,
  Package,
  ShoppingBag,
  Store,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import { ExternalBlob, type UserProfile } from "../backend";
import { UserAvatar } from "../components/UserAvatar";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import type { StoreListing } from "../hooks/useQueries";
import {
  useCreateStoreListing,
  useDeleteStoreListing,
  useGetAllStoreListings,
  useGetStoreListingsByUser,
} from "../hooks/useQueries";
import { useUserProfileCache } from "../hooks/useUserProfileCache";

// ── Add Item Modal ────────────────────────────────────────────────────────

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
}

function AddItemModal({ open, onClose }: AddItemModalProps) {
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

      toast.success("Item listed successfully!");
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setTitle("");
      setDescription("");
      setPrice("");
      setImageFile(null);
      setImagePreview(null);
      setUploadProgress(0);
      onClose();
    } catch {
      toast.error("Failed to create listing");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Add Item to Shop
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Image upload */}
          <div>
            <Label className="font-semibold mb-2 block">Product Image</Label>
            {imagePreview ? (
              <div className="relative w-full h-48 rounded-xl overflow-hidden">
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
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageRef.current?.click()}
                className="w-full h-36 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <ImagePlus
                  className="w-7 h-7"
                  style={{ color: "oklch(0.45 0.18 262)" }}
                />
                <p className="text-sm text-muted-foreground">
                  Click to upload image
                </p>
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
            <Label htmlFor="item-title" className="font-semibold">
              Title *
            </Label>
            <Input
              id="item-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="e.g. Vintage Camera, Handmade Bracelet"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-desc" className="font-semibold">
              Description
            </Label>
            <Textarea
              id="item-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Describe your item..."
              className="rounded-xl resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-price" className="font-semibold">
              Price *
            </Label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="item-price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. $25.00 or Free"
                className="rounded-xl pl-9"
              />
            </div>
          </div>

          {createListing.isPending && uploadProgress > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Uploading image... {uploadProgress}%
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
              <>
                <ShoppingBag className="mr-2 h-4 w-4" />
                List Item
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Listing Card ──────────────────────────────────────────────────────────

interface ListingCardProps {
  listing: StoreListing;
  isOwner: boolean;
  onDelete?: () => void;
  onOpenSellerProfile: (seller: Principal) => void;
}

// ── Seller Profile Modal ──────────────────────────────────────────────────

interface SellerProfileModalProps {
  seller: Principal;
  open: boolean;
  onClose: () => void;
  onMessage: (seller: Principal) => void;
}

function SellerProfileModal({
  seller,
  open,
  onClose,
  onMessage,
}: SellerProfileModalProps) {
  const { getProfile } = useUserProfileCache();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { data: listings = [], isLoading: listingsLoading } =
    useGetStoreListingsByUser(open ? seller : null);

  useEffect(() => {
    if (open) {
      getProfile(seller).then(setProfile);
    }
  }, [seller, open, getProfile]);

  const avatarUrl = profile?.avatar?.getDirectURL();
  const coverUrl = profile?.coverPhoto?.getDirectURL();

  const getInitials = (name: string | undefined | null) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Cover + Avatar */}
        <div className="relative flex-shrink-0">
          <div
            className="h-28 w-full"
            style={{
              background: coverUrl
                ? undefined
                : "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.58 0.16 220))",
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
          <div className="absolute -bottom-10 left-5">
            <Avatar className="h-20 w-20 border-4 border-card shadow-lg">
              {avatarUrl && <AvatarImage src={avatarUrl} />}
              <AvatarFallback
                className="text-white text-xl font-display font-bold"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
                }}
              >
                {getInitials(profile?.displayName)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Profile info */}
        <div className="pt-12 px-5 pb-4 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display font-bold text-lg text-foreground">
                {profile?.displayName ?? `${seller.toString().slice(0, 16)}...`}
              </h2>
              {profile?.bio && (
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed max-w-xs">
                  {profile.bio}
                </p>
              )}
            </div>
            <Button
              onClick={() => {
                onClose();
                onMessage(seller);
              }}
              size="sm"
              className="rounded-xl font-semibold gap-1.5 flex-shrink-0 mt-1"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
                color: "white",
              }}
            >
              <MessageCircle className="w-4 h-4" />
              Message
            </Button>
          </div>
        </div>

        {/* Divider + listings */}
        <div className="flex-shrink-0 px-5 pb-2">
          <div className="flex items-center gap-2">
            <Store
              className="w-4 h-4"
              style={{ color: "oklch(0.45 0.18 262)" }}
            />
            <span className="font-display font-semibold text-sm text-foreground">
              Store Listings
            </span>
            <Badge variant="secondary" className="text-xs">
              {listings.length}
            </Badge>
          </div>
        </div>

        <ScrollArea className="flex-1 px-5 pb-5">
          {listingsLoading && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-square w-full rounded-xl" />
                  <Skeleton className="h-3.5 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              ))}
            </div>
          )}

          {!listingsLoading && listings.length === 0 && (
            <div className="py-8 text-center">
              <Package
                className="w-8 h-8 mx-auto mb-2"
                style={{ color: "oklch(0.65 0.08 260)" }}
              />
              <p className="text-sm text-muted-foreground">
                No listings yet from this seller
              </p>
            </div>
          )}

          {!listingsLoading && listings.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              {listings.map((listing) => {
                const imgUrl = listing.image?.getDirectURL();
                return (
                  <div
                    key={listing.id.toString()}
                    className="bg-secondary/30 rounded-xl overflow-hidden border border-border/30"
                  >
                    <div className="aspect-square overflow-hidden bg-muted/50">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package
                            className="w-8 h-8"
                            style={{ color: "oklch(0.65 0.08 260)" }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 space-y-1">
                      <p className="font-display font-semibold text-xs text-foreground line-clamp-1">
                        {listing.title}
                      </p>
                      <Badge
                        className="font-bold text-white text-[10px]"
                        style={{
                          background:
                            "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.55 0.22 235))",
                          border: "none",
                        }}
                      >
                        {listing.price}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="px-5 pb-4 flex-shrink-0 border-t border-border/40 pt-3">
          <Button
            variant="outline"
            onClick={onClose}
            size="sm"
            className="rounded-xl w-full"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Seller Name (clickable) ────────────────────────────────────────────────

interface SellerNameProps {
  seller: Principal;
  onOpenProfile: (seller: Principal) => void;
}

function SellerName({ seller, onOpenProfile }: SellerNameProps) {
  const { getProfile } = useUserProfileCache();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getProfile(seller).then(setProfile);
  }, [seller, getProfile]);

  return (
    <button
      type="button"
      onClick={() => onOpenProfile(seller)}
      className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-left group"
    >
      <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
        <UserAvatar profile={profile} size="sm" />
      </div>
      <span className="text-xs text-muted-foreground truncate group-hover:text-primary transition-colors">
        {profile?.displayName ?? `${seller.toString().slice(0, 12)}...`}
      </span>
      <User className="w-2.5 h-2.5 text-muted-foreground/50 group-hover:text-primary/60 transition-colors flex-shrink-0" />
    </button>
  );
}

function ListingCard({
  listing,
  isOwner,
  onDelete,
  onOpenSellerProfile,
}: ListingCardProps) {
  const deleteListingMutation = useDeleteStoreListing();
  const [deleting, setDeleting] = useState(false);

  const imageUrl = listing.image?.getDirectURL();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteListingMutation.mutateAsync(listing.id);
      toast.success("Item removed");
      onDelete?.();
    } catch {
      toast.error("Failed to remove item");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl card-shadow overflow-hidden hover:card-shadow-hover transition-shadow group"
    >
      {/* Product image */}
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
              className="w-12 h-12"
              style={{ color: "oklch(0.65 0.08 260)" }}
            />
          </div>
        )}

        {/* Price badge */}
        <div className="absolute bottom-2 left-2">
          <Badge
            className="font-bold text-white shadow-sm"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.55 0.22 235))",
              border: "none",
            }}
          >
            {listing.price}
          </Badge>
        </div>

        {/* Delete button (owner only) */}
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

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <p className="font-display font-semibold text-sm text-foreground line-clamp-1">
          {listing.title}
        </p>
        {listing.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {listing.description}
          </p>
        )}
        <SellerName
          seller={listing.seller}
          onOpenProfile={onOpenSellerProfile}
        />
      </div>
    </motion.div>
  );
}

// ── Shop Page ─────────────────────────────────────────────────────────────

interface ShopPageProps {
  onMessageSeller?: (seller: Principal) => void;
}

export function ShopPage({ onMessageSeller }: ShopPageProps) {
  const { identity } = useInternetIdentity();
  const { data: listings = [], isLoading } = useGetAllStoreListings();
  const [addOpen, setAddOpen] = useState(false);
  const [sellerProfileOpen, setSellerProfileOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<Principal | null>(null);

  const myPrincipal = identity?.getPrincipal();

  const handleOpenSellerProfile = (seller: Principal) => {
    setSelectedSeller(seller);
    setSellerProfileOpen(true);
  };

  const handleMessage = (seller: Principal) => {
    setSellerProfileOpen(false);
    onMessageSeller?.(seller);
  };

  const sortedListings = [...listings].sort((a, b) => {
    return Number(b.timestamp - a.timestamp);
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <ShoppingBag
              className="w-5 h-5"
              style={{ color: "oklch(0.45 0.18 262)" }}
            />
            Marketplace
          </h1>
          <p className="text-sm text-muted-foreground">
            Buy and sell with your community
          </p>
        </div>
        {identity && (
          <Button
            onClick={() => setAddOpen(true)}
            size="sm"
            className="rounded-xl font-semibold gap-1.5"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
              color: "white",
            }}
          >
            <ShoppingBag className="w-4 h-4" />
            Sell Item
          </Button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-card rounded-2xl overflow-hidden card-shadow"
            >
              <Skeleton className="aspect-square w-full" />
              <div className="p-3 space-y-2">
                <Skeleton className="w-3/4 h-3.5 rounded" />
                <Skeleton className="w-full h-3 rounded" />
                <Skeleton className="w-1/2 h-3 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sortedListings.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-16 text-center"
        >
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "oklch(0.94 0.04 250)" }}
          >
            <ShoppingBag
              className="w-8 h-8"
              style={{ color: "oklch(0.45 0.18 262)" }}
            />
          </div>
          <p className="font-display font-semibold text-foreground text-lg">
            No listings yet
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Be the first to list something in the community marketplace!
          </p>
          {identity && (
            <Button
              onClick={() => setAddOpen(true)}
              className="mt-4 rounded-xl font-semibold"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.42 0.18 265), oklch(0.52 0.18 250))",
                color: "white",
              }}
            >
              List your first item
            </Button>
          )}
        </motion.div>
      )}

      {/* Listings grid */}
      {!isLoading && sortedListings.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {sortedListings.map((listing) => (
            <ListingCard
              key={listing.id.toString()}
              listing={listing}
              isOwner={myPrincipal?.toString() === listing.seller.toString()}
              onOpenSellerProfile={handleOpenSellerProfile}
            />
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      <AddItemModal open={addOpen} onClose={() => setAddOpen(false)} />

      {/* Seller Profile Modal */}
      {selectedSeller && (
        <SellerProfileModal
          seller={selectedSeller}
          open={sellerProfileOpen}
          onClose={() => setSellerProfileOpen(false)}
          onMessage={handleMessage}
        />
      )}
    </div>
  );
}

import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Comment,
  ExternalBlob,
  Group,
  GroupMessage,
  Post,
  Reel,
  UserProfile,
} from "../backend";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

// ── Legacy type stubs (kept for backwards compat with older pages) ─────────
export interface StoreListing {
  id: bigint;
  title: string;
  description: string;
  price: string;
  image?: ExternalBlob;
  sellerId: Principal;
  seller: Principal;
  timestamp: bigint;
}

export interface Notification {
  id: bigint;
  message: string;
  read: boolean;
  timestamp: bigint;
}

export interface FriendRequest {
  from: Principal;
  timestamp: bigint;
}

export enum RequestStatus {
  pending = "pending",
  accepted = "accepted",
  declined = "declined",
}

// ── Profile ───────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetUserProfile(principal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["userProfile", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return null;
      return actor.getUserProfile(principal);
    },
    enabled: !!actor && !actorFetching && !!principal,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// ── Posts ─────────────────────────────────────────────────────────────────

export function useGetAllPosts() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Post[]>({
    queryKey: ["allPosts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPosts();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetPostsByUser(principal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Post[]>({
    queryKey: ["postsByUser", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return [];
      return actor.getPostsByUser(principal);
    },
    enabled: !!actor && !actorFetching && !!principal,
  });
}

export function useCreatePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      content,
      image,
    }: { content: string; image: ExternalBlob | null }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.createPost(content, image);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allPosts"] });
      queryClient.invalidateQueries({ queryKey: ["postsByUser"] });
    },
  });
}

export function useDeletePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error("Actor not available");

      await (actor as any).deletePost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allPosts"] });
      queryClient.invalidateQueries({ queryKey: ["postsByUser"] });
    },
  });
}

// ── Likes ─────────────────────────────────────────────────────────────────

export function useGetLikesCount(postId: bigint) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["likesCount", postId.toString()],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getLikesCount(postId);
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useCheckCallerHasLiked(postId: bigint) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<boolean>({
    queryKey: [
      "hasLiked",
      postId.toString(),
      identity?.getPrincipal().toString(),
    ],
    queryFn: async () => {
      if (!actor || !identity) return false;
      try {
        return await (actor as any).checkCallerHasLiked(postId);
      } catch {
        return false;
      }
    },
    enabled: !!actor && !actorFetching && !!identity,
  });
}

export function useLikeOrUnlikePost() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      await actor.likeOrUnlikePost(postId);
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({
        queryKey: ["likesCount", postId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "hasLiked",
          postId.toString(),
          identity?.getPrincipal().toString(),
        ],
      });
    },
  });
}

// ── Comments ──────────────────────────────────────────────────────────────

export function useGetCommentsByPost(postId: bigint) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Comment[]>({
    queryKey: ["comments", postId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCommentsByPost(postId);
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useAddComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      content,
    }: { postId: bigint; content: string }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.addComment(postId, content);
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", postId.toString()],
      });
    },
  });
}

export function useDeleteComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      commentId,
      postId: _postId,
    }: { commentId: bigint; postId: bigint }) => {
      if (!actor) throw new Error("Actor not available");

      await (actor as any).deleteComment(commentId);
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", postId.toString()],
      });
    },
  });
}

// ── Friends ───────────────────────────────────────────────────────────────

export function useGetPendingFriendRequests() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<FriendRequest[]>({
    queryKey: ["pendingFriendRequests"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await (actor as any).getPendingFriendRequests();
      } catch {
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!identity,
  });
}

export function useGetFriends(principal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Principal[]>({
    queryKey: ["friends", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return [];
      return actor.getFriends(principal);
    },
    enabled: !!actor && !actorFetching && !!principal,
  });
}

export function useSendFriendRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (to: Principal) => {
      if (!actor) throw new Error("Actor not available");
      await actor.sendFriendRequest(to);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendRequestStatus"] });
    },
  });
}

export function useRespondToFriendRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      from,
      accept,
    }: { from: Principal; accept: boolean }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.respondToFriendRequest(from, accept);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingFriendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });
}

export function useCheckFriendRequestStatus(principal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<RequestStatus | null>({
    queryKey: ["friendRequestStatus", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return null;
      try {
        return await (actor as any).checkFriendRequestStatus(principal);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !actorFetching && !!principal && !!identity,
    staleTime: 30 * 1000,
  });
}

// ── Store Listings ────────────────────────────────────────────────────────

export function useGetAllStoreListings() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<StoreListing[]>({
    queryKey: ["allStoreListings"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return (await (actor as any).getAllStoreListings()) as StoreListing[];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetStoreListingsByUser(principal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<StoreListing[]>({
    queryKey: ["storeListingsByUser", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return [];
      try {
        return (await (actor as any).getStoreListingsByUser(
          principal,
        )) as StoreListing[];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!principal,
  });
}

export function useCreateStoreListing() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      description,
      price,
      image,
    }: {
      title: string;
      description: string;
      price: string;
      image: ExternalBlob | null;
    }) => {
      if (!actor) throw new Error("Actor not available");

      await (actor as any).createStoreListing(title, description, price, image);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allStoreListings"] });
      queryClient.invalidateQueries({ queryKey: ["storeListingsByUser"] });
    },
  });
}

export function useDeleteStoreListing() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: bigint) => {
      if (!actor) throw new Error("Actor not available");

      await (actor as any).deleteStoreListing(listingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allStoreListings"] });
      queryClient.invalidateQueries({ queryKey: ["storeListingsByUser"] });
    },
  });
}

// ── Follow / Followers ────────────────────────────────────────────────────

export function useGetFollowers(principal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Principal[]>({
    queryKey: ["followers", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return [];
      return actor.getFollowers(principal);
    },
    enabled: !!actor && !actorFetching && !!principal,
  });
}

export function useGetFollowing(principal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Principal[]>({
    queryKey: ["following", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return [];
      return actor.getFollowing(principal);
    },
    enabled: !!actor && !actorFetching && !!principal,
  });
}

export function useFollowUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error("Actor not available");
      await actor.followUser(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["following"] });
      queryClient.invalidateQueries({ queryKey: ["followers"] });
    },
  });
}

export function useUnfollowUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error("Actor not available");
      await actor.unfollowUser(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["following"] });
      queryClient.invalidateQueries({ queryKey: ["followers"] });
    },
  });
}

// ── Messaging ─────────────────────────────────────────────────────────────

export function useGetConversations() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<Principal[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getConversations();
    },
    enabled: !!actor && !actorFetching && !!identity,
    refetchInterval: 10000,
  });
}

export function useGetConversation(otherUser: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<import("../backend.d").DirectMessage[]>({
    queryKey: ["conversation", otherUser?.toString()],
    queryFn: async () => {
      if (!actor || !otherUser) return [];
      return actor.getConversation(otherUser);
    },
    enabled: !!actor && !actorFetching && !!identity && !!otherUser,
    refetchInterval: 3000,
  });
}

export function useSendMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ to, content }: { to: Principal; content: string }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.sendMessage(to, content);
    },
    onSuccess: (_, { to }) => {
      queryClient.invalidateQueries({
        queryKey: ["conversation", to.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useMarkConversationRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (otherUser: Principal) => {
      if (!actor) throw new Error("Actor not available");
      await actor.markConversationRead(otherUser);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unreadMessageCount"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useGetUnreadMessageCount() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<bigint>({
    queryKey: ["unreadMessageCount"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getUnreadMessageCount();
    },
    enabled: !!actor && !actorFetching && !!identity,
    refetchInterval: 5000,
  });
}

// ── Notifications ─────────────────────────────────────────────────────────

export function useGetNotifications() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await (actor as any).getNotifications();
      } catch {
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!identity,
    refetchInterval: 30000,
  });
}

export function useMarkNotificationAsRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      try {
        await (actor as any).markNotificationAsRead(notificationId);
      } catch {
        // ignore if method doesn't exist
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// ── Groups ────────────────────────────────────────────────────────────────

export function useGetMyGroups() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<Group[]>({
    queryKey: ["myGroups"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyGroups();
    },
    enabled: !!actor && !actorFetching && !!identity,
  });
}

export function useGetGroupById(id: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Group | null>({
    queryKey: ["groupById", id?.toString()],
    queryFn: async () => {
      if (!actor || id === null) return null;
      return actor.getGroupById(id);
    },
    enabled: !!actor && !actorFetching && id !== null,
  });
}

export function useGetGroupMessages(groupId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<GroupMessage[]>({
    queryKey: ["groupMessages", groupId?.toString()],
    queryFn: async () => {
      if (!actor || groupId === null) return [];
      return actor.getGroupMessages(groupId);
    },
    enabled: !!actor && !actorFetching && !!identity && groupId !== null,
    refetchInterval: 3000,
  });
}

export function useCreateGroup() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createGroup(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myGroups"] });
    },
  });
}

export function useAddGroupMember() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      member,
    }: { groupId: bigint; member: Principal }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.addGroupMember(groupId, member);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myGroups"] });
      queryClient.invalidateQueries({ queryKey: ["groupById"] });
    },
  });
}

export function useRemoveGroupMember() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      member,
    }: { groupId: bigint; member: Principal }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.removeGroupMember(groupId, member);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myGroups"] });
      queryClient.invalidateQueries({ queryKey: ["groupById"] });
    },
  });
}

export function useDeleteGroup() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteGroup(groupId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myGroups"] });
    },
  });
}

export function useSendGroupMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      content,
    }: { groupId: bigint; content: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.sendGroupMessage(groupId, content);
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({
        queryKey: ["groupMessages", groupId.toString()],
      });
    },
  });
}

// ── Reels ─────────────────────────────────────────────────────────────────

export function useGetAllReels() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Reel[]>({
    queryKey: ["allReels"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllReels();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetReelsByUser(user: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Reel[]>({
    queryKey: ["reelsByUser", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return [];
      return actor.getReelsByUser(user);
    },
    enabled: !!actor && !actorFetching && !!user,
  });
}

export function useCreateReel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      video,
    }: { title: string; video: ExternalBlob }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createReel(title, video);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allReels"] });
      queryClient.invalidateQueries({ queryKey: ["reelsByUser"] });
    },
  });
}

export function useDeleteReel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteReel(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allReels"] });
      queryClient.invalidateQueries({ queryKey: ["reelsByUser"] });
    },
  });
}

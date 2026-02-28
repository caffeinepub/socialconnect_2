import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Reel {
    id: bigint;
    title: string;
    video: ExternalBlob;
    creatorId: Principal;
    timestamp: Time;
}
export interface DirectMessage {
    id: bigint;
    content: string;
    read: boolean;
    timestamp: Time;
    recipientId: Principal;
    senderId: Principal;
}
export interface WebRTCOffer {
    sdp: string;
    callee: Principal;
    caller: Principal;
}
export interface WebRTCAnswer {
    sdp: string;
    callee: Principal;
    caller: Principal;
}
export type Time = bigint;
export interface GroupMessage {
    id: bigint;
    content: string;
    groupId: bigint;
    timestamp: Time;
    senderId: Principal;
}
export interface ReferralStats {
    referralCode: string;
    balance: bigint;
    totalReferrals: bigint;
    verifiedReferrals: bigint;
}
export interface Group {
    id: bigint;
    name: string;
    createdAt: Time;
    creatorId: Principal;
    memberIds: Array<Principal>;
}
export interface Comment {
    id: bigint;
    content: string;
    author: Principal;
    timestamp: Time;
    postId: bigint;
}
export interface StoreListing {
    id: bigint;
    title: string;
    description: string;
    seller: Principal;
    timestamp: Time;
    image?: ExternalBlob;
    price: string;
}
export interface Post {
    id: bigint;
    content: string;
    author: Principal;
    timestamp: Time;
    image?: ExternalBlob;
}
export interface Notification {
    id: bigint;
    read: boolean;
    recipient: Principal;
    message: string;
    timestamp: Time;
}
export interface UserProfile {
    bio: string;
    displayName: string;
    coverPhoto?: ExternalBlob;
    isProfessional: boolean;
    professionalTitle?: string;
    avatar?: ExternalBlob;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addComment(postId: bigint, content: string): Promise<void>;
    addEmojiReaction(postId: bigint, emoji: string): Promise<void>;
    addGroupMember(groupId: bigint, memberId: Principal): Promise<void>;
    addICECandidate(callId: string, candidate: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    checkCallerHasLiked(postId: bigint): Promise<boolean>;
    checkFriendRequestStatus(user: Principal): Promise<string | null>;
    checkUsernameAvailable(username: string): Promise<boolean>;
    createGroup(name: string): Promise<bigint>;
    createPost(content: string, image: ExternalBlob | null): Promise<void>;
    createReel(title: string, video: ExternalBlob): Promise<bigint>;
    createStoreListing(title: string, description: string, price: string, image: ExternalBlob | null): Promise<void>;
    deleteComment(commentId: bigint): Promise<void>;
    deleteGroup(groupId: bigint): Promise<void>;
    deletePost(postId: bigint): Promise<void>;
    deleteReel(id: bigint): Promise<void>;
    deleteStoreListing(id: bigint): Promise<void>;
    endCall(callId: string): Promise<void>;
    followUser(user: Principal): Promise<void>;
    getAllPosts(): Promise<Array<Post>>;
    getAllReels(): Promise<Array<Reel>>;
    getAllStoreListings(): Promise<Array<StoreListing>>;
    getAllUsers(): Promise<Array<Principal>>;
    getCallAnswer(callId: string): Promise<WebRTCAnswer | null>;
    getCallOffer(callId: string): Promise<WebRTCOffer | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCommentsByPost(postId: bigint): Promise<Array<Comment>>;
    getConversation(otherUser: Principal): Promise<Array<DirectMessage>>;
    getConversations(): Promise<Array<Principal>>;
    getEmojiReactions(postId: bigint): Promise<Array<[string, bigint]>>;
    getFollowers(user: Principal): Promise<Array<Principal>>;
    getFollowing(user: Principal): Promise<Array<Principal>>;
    getFriends(user: Principal): Promise<Array<Principal>>;
    getGroupById(groupId: bigint): Promise<Group | null>;
    getGroupMessages(groupId: bigint): Promise<Array<GroupMessage>>;
    getICECandidates(callId: string, forPrincipal: Principal): Promise<Array<string>>;
    getLikesCount(postId: bigint): Promise<bigint>;
    getMyBalance(): Promise<bigint>;
    getMyGroups(): Promise<Array<Group>>;
    getMyReferralCode(): Promise<string>;
    getMyUsername(): Promise<string | null>;
    getNotifications(): Promise<Array<Notification>>;
    getPendingFriendRequests(): Promise<Array<{
        from: Principal;
        timestamp: Time;
    }>>;
    getPostsByUser(user: Principal): Promise<Array<Post>>;
    getReelsByUser(user: Principal): Promise<Array<Reel>>;
    getReferralStats(): Promise<ReferralStats>;
    getStoreListingsByUser(user: Principal): Promise<Array<StoreListing>>;
    getUnreadMessageCount(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    likeOrUnlikePost(postId: bigint): Promise<void>;
    loginWithCredentials(username: string, password: string): Promise<boolean>;
    markAccountVerified(): Promise<void>;
    markConversationRead(otherUser: Principal): Promise<void>;
    markNotificationAsRead(id: bigint): Promise<void>;
    redeemReferralCode(code: string): Promise<void>;
    registerWithCredentials(username: string, password: string): Promise<void>;
    removeEmojiReaction(postId: bigint, emoji: string): Promise<void>;
    removeGroupMember(groupId: bigint, memberId: Principal): Promise<void>;
    respondToFriendRequest(from: Principal, accept: boolean): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendFriendRequest(to: Principal): Promise<void>;
    sendGroupMessage(groupId: bigint, content: string): Promise<bigint>;
    sendMessage(recipientId: Principal, content: string): Promise<bigint>;
    storeCallAnswer(callId: string, sdp: string): Promise<void>;
    storeCallOffer(callId: string, sdp: string, callee: Principal): Promise<void>;
    unfollowUser(user: Principal): Promise<void>;
}

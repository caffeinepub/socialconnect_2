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
export type Time = bigint;
export interface GroupMessage {
    id: bigint;
    content: string;
    groupId: bigint;
    timestamp: Time;
    senderId: Principal;
}
export interface Comment {
    id: bigint;
    content: string;
    author: Principal;
    timestamp: Time;
    postId: bigint;
}
export interface Post {
    id: bigint;
    content: string;
    author: Principal;
    timestamp: Time;
    image?: ExternalBlob;
}
export interface Group {
    id: bigint;
    name: string;
    createdAt: Time;
    creatorId: Principal;
    memberIds: Array<Principal>;
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
    addGroupMember(groupId: bigint, member: Principal): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    checkUsernameAvailable(username: string): Promise<boolean>;
    createGroup(name: string): Promise<bigint>;
    createPost(content: string, image: ExternalBlob | null): Promise<void>;
    createReel(title: string, video: ExternalBlob): Promise<bigint>;
    deleteGroup(groupId: bigint): Promise<void>;
    deleteReel(id: bigint): Promise<void>;
    followUser(user: Principal): Promise<void>;
    getAllPosts(): Promise<Array<Post>>;
    getAllReels(): Promise<Array<Reel>>;
    getAllUsers(): Promise<Array<Principal>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCommentsByPost(postId: bigint): Promise<Array<Comment>>;
    getConversation(otherUser: Principal): Promise<Array<DirectMessage>>;
    getConversations(): Promise<Array<Principal>>;
    getFollowers(user: Principal): Promise<Array<Principal>>;
    getFollowing(user: Principal): Promise<Array<Principal>>;
    getFriends(user: Principal): Promise<Array<Principal>>;
    getGroupById(id: bigint): Promise<Group | null>;
    getGroupMessages(groupId: bigint): Promise<Array<GroupMessage>>;
    getLikesCount(postId: bigint): Promise<bigint>;
    getMyGroups(): Promise<Array<Group>>;
    getMyUsername(): Promise<string | null>;
    getPostsByUser(user: Principal): Promise<Array<Post>>;
    getReelsByUser(user: Principal): Promise<Array<Reel>>;
    getUnreadMessageCount(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    likeOrUnlikePost(postId: bigint): Promise<void>;
    loginWithCredentials(username: string, password: string): Promise<boolean>;
    markConversationRead(otherUser: Principal): Promise<void>;
    registerWithCredentials(username: string, password: string): Promise<void>;
    removeGroupMember(groupId: bigint, member: Principal): Promise<void>;
    respondToFriendRequest(from: Principal, accept: boolean): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendFriendRequest(to: Principal): Promise<void>;
    sendGroupMessage(groupId: bigint, content: string): Promise<bigint>;
    sendMessage(to: Principal, content: string): Promise<void>;
    unfollowUser(user: Principal): Promise<void>;
}

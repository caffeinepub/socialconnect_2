import Map "mo:core/Map";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

import Iter "mo:core/Iter";


actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  // Types
  type UserProfile = {
    displayName : Text;
    bio : Text;
    avatar : ?Storage.ExternalBlob;
    coverPhoto : ?Storage.ExternalBlob;
    professionalTitle : ?Text;
    isProfessional : Bool;
  };

  type Post = {
    id : Nat;
    content : Text;
    image : ?Storage.ExternalBlob;
    timestamp : Time.Time;
    author : Principal;
  };

  type Comment = {
    id : Nat;
    postId : Nat;
    content : Text;
    timestamp : Time.Time;
    author : Principal;
  };

  type Notification = {
    id : Nat;
    recipient : Principal;
    message : Text;
    timestamp : Time.Time;
    read : Bool;
  };

  type FriendRequest = {
    from : Principal;
    to : Principal;
    status : RequestStatus;
    timestamp : Time.Time;
  };

  type RequestStatus = {
    #pending;
    #accepted;
    #declined;
  };

  type StoreListing = {
    id : Nat;
    title : Text;
    description : Text;
    price : Text;
    image : ?Storage.ExternalBlob;
    seller : Principal;
    timestamp : Time.Time;
  };

  type WebRTCOffer = {
    sdp : Text;
    caller : Principal;
    callee : Principal;
  };

  type WebRTCAnswer = {
    sdp : Text;
    callee : Principal;
    caller : Principal;
  };

  type ICECandidate = {
    candidate : Text;
    tenant : Principal;
  };

  type VideoCall = {
    offer : WebRTCOffer;
    answer : ?WebRTCAnswer;
    candidates : [ICECandidate];
  };

  type DirectMessage = {
    id : Nat;
    senderId : Principal;
    recipientId : Principal;
    content : Text;
    timestamp : Time.Time;
    read : Bool;
  };

  type Group = {
    id : Nat;
    name : Text;
    creatorId : Principal;
    memberIds : [Principal];
    createdAt : Time.Time;
  };

  type GroupMessage = {
    id : Nat;
    groupId : Nat;
    senderId : Principal;
    content : Text;
    timestamp : Time.Time;
  };

  type Reel = {
    id : Nat;
    title : Text;
    video : Storage.ExternalBlob;
    creatorId : Principal;
    timestamp : Time.Time;
  };

  type UserCredential = {
    username : Text;
    passwordHash : Text;
    principalId : Principal;
  };

  type ReferralStats = {
    referralCode : Text;
    totalReferrals : Nat;
    verifiedReferrals : Nat;
    balance : Nat;
  };

  // New type for emoji reactions
  type EmojiReactions = Map.Map<Text, Set.Set<Principal>>;

  // State variables
  let userProfiles = Map.empty<Principal, UserProfile>();
  var nextPostId = 0;
  let posts = Map.empty<Nat, Post>();
  var nextCommentId = 0;
  let comments = Map.empty<Nat, Comment>();
  let likes = Map.empty<Nat, Set.Set<Principal>>();
  var nextNotificationId = 0;
  let notifications = Map.empty<Nat, Notification>();
  let friendRequests = Map.empty<Principal, Map.Map<Principal, RequestStatus>>();
  let followers = Map.empty<Principal, Set.Set<Principal>>();
  let following = Map.empty<Principal, Set.Set<Principal>>();
  var nextListingId = 0;
  let storeListings = Map.empty<Nat, StoreListing>();
  let videoCalls = Map.empty<Text, VideoCall>();
  var nextMessageId = 0;
  let directMessages = Map.empty<Nat, DirectMessage>();
  var nextGroupId = 0;
  let groups = Map.empty<Nat, Group>();
  var nextGroupMessageId = 0;
  let groupMessages = Map.empty<Nat, GroupMessage>();
  var nextReelId = 0;
  let reels = Map.empty<Nat, Reel>();
  let usernameToCredential = Map.empty<Text, UserCredential>();
  let principalToUsername = Map.empty<Principal, Text>();

  // New emoji reactions state
  let emojiReactions = Map.empty<Nat, EmojiReactions>();

  // Referral system state
  var nextReferralCode = 1;
  let referralCodeToReferrer = Map.empty<Text, Principal>();
  let referralStats = Map.empty<Principal, ReferralStats>();
  let userToReferrer = Map.empty<Principal, Principal>();
  let verifiedUsers = Set.empty<Principal>();

  // Credential System Functions
  public shared ({ caller }) func registerWithCredentials(username : Text, password : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can register credentials");
    };
    // Check username existence
    switch (usernameToCredential.get(username)) {
      case (?_) { Runtime.trap("Username already taken") };
      case (null) {
        // Check if principal already has a username
        switch (principalToUsername.get(caller)) {
          case (?_) { Runtime.trap("This principal already has a username") };
          case (null) {
            let credential = {
              username;
              passwordHash = password;
              principalId = caller;
            };
            usernameToCredential.add(username, credential);
            principalToUsername.add(caller, username);

            // Create default user profile if none exists yet
            switch (userProfiles.get(caller)) {
              case (null) {
                let defaultProfile = {
                  displayName = username;
                  bio = "";
                  avatar = null;
                  coverPhoto = null;
                  professionalTitle = null;
                  isProfessional = false;
                };
                userProfiles.add(caller, defaultProfile);
              };
              case (?_) {};
            };
          };
        };
      };
    };
  };

  public query ({ caller }) func loginWithCredentials(username : Text, password : Text) : async Bool {
    switch (usernameToCredential.get(username)) {
      case (null) { false };
      case (?credential) { credential.passwordHash == password };
    };
  };

  public query ({ caller }) func getMyUsername() : async ?Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view their username");
    };
    principalToUsername.get(caller);
  };

  public query ({ caller }) func checkUsernameAvailable(username : Text) : async Bool {
    switch (usernameToCredential.get(username)) {
      case (null) { true };
      case (?_) { false };
    };
  };

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getAllUsers() : async [Principal] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view all users");
    };
    userProfiles.keys().toArray();
  };

  // Posts
  public shared ({ caller }) func createPost(content : Text, image : ?Storage.ExternalBlob) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create posts");
    };
    let postId = nextPostId;
    nextPostId += 1;
    let post = {
      id = postId;
      content;
      image;
      timestamp = Time.now();
      author = caller;
    };
    posts.add(postId, post);
  };

  public query ({ caller }) func getAllPosts() : async [Post] {
    posts.values().toArray();
  };

  public query ({ caller }) func getPostsByUser(user : Principal) : async [Post] {
    posts.values().toArray().filter(func(p : Post) : Bool { p.author == user });
  };

  public shared ({ caller }) func likeOrUnlikePost(postId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can like posts");
    };
    switch (likes.get(postId)) {
      case (null) {
        let newSet = Set.empty<Principal>();
        newSet.add(caller);
        likes.add(postId, newSet);
      };
      case (?likeSet) {
        if (likeSet.contains(caller)) {
          likeSet.remove(caller);
        } else {
          likeSet.add(caller);
        };
      };
    };
  };

  public query ({ caller }) func getLikesCount(postId : Nat) : async Nat {
    switch (likes.get(postId)) {
      case (null) { 0 };
      case (?likeSet) { likeSet.size() };
    };
  };

  // Comments
  public shared ({ caller }) func addComment(postId : Nat, content : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can add comments");
    };
    let commentId = nextCommentId;
    nextCommentId += 1;
    let comment = {
      id = commentId;
      postId;
      content;
      timestamp = Time.now();
      author = caller;
    };
    comments.add(commentId, comment);
  };

  public shared ({ caller }) func deleteComment(commentId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete comments");
    };
    let comment = switch (comments.get(commentId)) {
      case (null) { Runtime.trap("Comment not found") };
      case (?comment) { comment };
    };
    if (comment.author != caller) {
      Runtime.trap("Unauthorized: Only the comment author can delete this comment");
    };
    comments.remove(commentId);
  };

  public shared ({ caller }) func deletePost(postId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete posts");
    };
    let post = switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?post) { post };
    };
    if (post.author != caller and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only the post author or admin can delete this post");
    };
    posts.remove(postId);

    // Remove all comments for this post
    let entries = comments.entries().toArray();
    for ((id, comment) in entries.values()) {
      if (comment.postId == postId) {
        comments.remove(id);
      };
    };
  };

  public query ({ caller }) func getCommentsByPost(postId : Nat) : async [Comment] {
    comments.values().toArray().filter(func(c : Comment) : Bool { c.postId == postId });
  };

  public query ({ caller }) func checkCallerHasLiked(postId : Nat) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can check like status");
    };
    switch (likes.get(postId)) {
      case (null) { false };
      case (?likeSet) { likeSet.contains(caller) };
    };
  };

  // Emoji reactions
  public shared ({ caller }) func addEmojiReaction(postId : Nat, emoji : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can add emoji reactions");
    };
    var postEmojiReactions = switch (emojiReactions.get(postId)) {
      case (null) { Map.empty<Text, Set.Set<Principal>>() };
      case (?reactions) { reactions };
    };

    let currentUsers = switch (postEmojiReactions.get(emoji)) {
      case (null) { Set.empty<Principal>() };
      case (?users) { users };
    };

    if (currentUsers.contains(caller)) {
      currentUsers.remove(caller);
    } else {
      currentUsers.add(caller);
    };

    postEmojiReactions.add(emoji, currentUsers);
    emojiReactions.add(postId, postEmojiReactions);
  };

  public shared ({ caller }) func removeEmojiReaction(postId : Nat, emoji : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can remove emoji reactions");
    };
    switch (emojiReactions.get(postId)) {
      case (null) { Runtime.trap("No reactions for this post") };
      case (?postEmojiReactions) {
        switch (postEmojiReactions.get(emoji)) {
          case (null) { Runtime.trap("No users for this emoji") };
          case (?users) {
            users.remove(caller);
            postEmojiReactions.add(emoji, users);
            emojiReactions.add(postId, postEmojiReactions);
          };
        };
      };
    };
  };

  public query ({ caller }) func getEmojiReactions(postId : Nat) : async [(Text, Nat)] {
    switch (emojiReactions.get(postId)) {
      case (null) { [] };
      case (?postEmojiReactions) {
        postEmojiReactions.entries().toArray().map(
          func((emoji, users)) { (emoji, users.size()) }
        );
      };
    };
  };

  // Friends & Followers
  public query ({ caller }) func getFriends(user : Principal) : async [Principal] {
    switch (friendRequests.get(user)) {
      case (null) { [] };
      case (?requests) {
        requests.entries().toArray().filter(func((p : Principal, status : RequestStatus)) : Bool {
          status == #accepted
        }).map(func((p : Principal, _ : RequestStatus)) : Principal { p });
      };
    };
  };

  public shared ({ caller }) func sendFriendRequest(to : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can send friend requests");
    };
    if (to == caller) {
      Runtime.trap("Cannot send friend request to yourself");
    };
    let userRequests = switch (friendRequests.get(caller)) {
      case (null) { Map.empty<Principal, RequestStatus>() };
      case (?requests) { requests };
    };
    userRequests.add(to, #pending);

    var toRequests = switch (friendRequests.get(to)) {
      case (null) { Map.empty<Principal, RequestStatus>() };
      case (?requests) { requests };
    };
    toRequests.add(caller, #pending);

    friendRequests.add(caller, userRequests);
    friendRequests.add(to, toRequests);
  };

  public shared ({ caller }) func respondToFriendRequest(from : Principal, accept : Bool) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can respond to friend requests");
    };
    let requests = switch (friendRequests.get(caller)) {
      case (null) { Runtime.trap("No friend requests found") };
      case (?reqs) { reqs };
    };

    switch (requests.get(from)) {
      case (null) { Runtime.trap("No pending friend request from this user") };
      case (?status) {
        switch (status) {
          case (#pending) {
            requests.add(from, if (accept) { #accepted } else { #declined });
            let fromRequests = switch (friendRequests.get(from)) {
              case (null) { Map.empty<Principal, RequestStatus>() };
              case (?reqs) { reqs };
            };
            fromRequests.add(caller, if (accept) { #accepted } else { #declined });
            friendRequests.add(from, fromRequests);
          };
          case (_) { Runtime.trap("Friend request already processed") };
        };
      };
    };
  };

  public query ({ caller }) func getPendingFriendRequests() : async [{ from : Principal; timestamp : Time.Time }] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view friend requests");
    };
    switch (friendRequests.get(caller)) {
      case (null) { [] };
      case (?requests) {
        requests.entries().toArray().filter(func((p : Principal, status : RequestStatus)) : Bool {
          status == #pending
        }).map(func((p : Principal, _ : RequestStatus)) : { from : Principal; timestamp : Time.Time } {
          { from = p; timestamp = Time.now() };
        });
      };
    };
  };

  public query ({ caller }) func checkFriendRequestStatus(user : Principal) : async ?Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can check friend request status");
    };
    switch (friendRequests.get(caller)) {
      case (null) { null };
      case (?requests) {
        switch (requests.get(user)) {
          case (null) { null };
          case (?#pending) { ?"pending" };
          case (?#accepted) { ?"accepted" };
          case (?#declined) { ?"declined" };
        };
      };
    };
  };

  public query ({ caller }) func getFollowers(user : Principal) : async [Principal] {
    switch (followers.get(user)) {
      case (null) { [] };
      case (?followersSet) { followersSet.toArray() };
    };
  };

  public shared ({ caller }) func followUser(user : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can follow others");
    };

    if (user == caller) {
      Runtime.trap("Cannot follow yourself");
    };

    // Update followers of the target user
    let targetFollowers = switch (followers.get(user)) {
      case (null) { Set.empty<Principal>() };
      case (?existingSet) { existingSet };
    };
    targetFollowers.add(caller);
    followers.add(user, targetFollowers);

    // Update following of the caller
    let callerFollowing = switch (following.get(caller)) {
      case (null) { Set.empty<Principal>() };
      case (?existingSet) { existingSet };
    };
    callerFollowing.add(user);
    following.add(caller, callerFollowing);
  };

  public shared ({ caller }) func unfollowUser(user : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can unfollow others");
    };

    // Remove from followers of the target user
    switch (followers.get(user)) {
      case (?followersSet) {
        followersSet.remove(caller);
      };
      case (null) {};
    };

    // Remove from following of the caller
    switch (following.get(caller)) {
      case (?followingSet) {
        followingSet.remove(user);
      };
      case (null) {};
    };
  };

  public query ({ caller }) func getFollowing(user : Principal) : async [Principal] {
    switch (following.get(user)) {
      case (null) { [] };
      case (?followingSet) { followingSet.toArray() };
    };
  };

  // Store Listings
  public shared ({ caller }) func createStoreListing(title : Text, description : Text, price : Text, image : ?Storage.ExternalBlob) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create store listings");
    };
    let listingId = nextListingId;
    nextListingId += 1;
    let listing = {
      id = listingId;
      title;
      description;
      price;
      image;
      seller = caller;
      timestamp = Time.now();
    };
    storeListings.add(listingId, listing);
  };

  public query ({ caller }) func getAllStoreListings() : async [StoreListing] {
    storeListings.values().toArray();
  };

  public query ({ caller }) func getStoreListingsByUser(user : Principal) : async [StoreListing] {
    storeListings.values().toArray().filter(func(l : StoreListing) : Bool { l.seller == user });
  };

  public shared ({ caller }) func deleteStoreListing(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete store listings");
    };
    switch (storeListings.get(id)) {
      case (null) { Runtime.trap("Listing not found") };
      case (?listing) {
        if (listing.seller != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the seller or admin can delete this listing");
        };
        storeListings.remove(id);
      };
    };
  };

  // Notifications
  public query ({ caller }) func getNotifications() : async [Notification] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get notifications");
    };
    notifications.values().toArray().filter(func(n : Notification) : Bool { n.recipient == caller });
  };

  public shared ({ caller }) func markNotificationAsRead(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can mark notifications as read");
    };
    switch (notifications.get(id)) {
      case (?notification) {
        if (notification.recipient != caller) {
          Runtime.trap("Unauthorized: Only recipient can mark this notification as read");
        };
        notifications.add(id, { notification with read = true });
      };
      case (null) {};
    };
  };

  // Direct Messaging
  public shared ({ caller }) func sendMessage(recipientId : Principal, content : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };
    let messageId = nextMessageId;
    nextMessageId += 1;
    let message = {
      id = messageId;
      senderId = caller;
      recipientId;
      content;
      timestamp = Time.now();
      read = false;
    };
    directMessages.add(messageId, message);
    messageId;
  };

  public query ({ caller }) func getConversation(otherUser : Principal) : async [DirectMessage] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view conversations");
    };
    directMessages.values().toArray().filter(func(msg : DirectMessage) : Bool {
      (msg.senderId == caller and msg.recipientId == otherUser) or
      (msg.senderId == otherUser and msg.recipientId == caller)
    });
  };

  public query ({ caller }) func getConversations() : async [Principal] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view conversations");
    };
    let conversationSet = Set.empty<Principal>();
    for (msg in directMessages.values()) {
      if (msg.senderId == caller) {
        conversationSet.add(msg.recipientId);
      } else if (msg.recipientId == caller) {
        conversationSet.add(msg.senderId);
      };
    };
    conversationSet.toArray();
  };

  public shared ({ caller }) func markConversationRead(otherUser : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can mark conversations as read");
    };
    for ((id, msg) in directMessages.entries()) {
      if (msg.senderId == otherUser and msg.recipientId == caller and not msg.read) {
        directMessages.add(id, { msg with read = true });
      };
    };
  };

  public query ({ caller }) func getUnreadMessageCount() : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view unread message count");
    };
    var count = 0;
    for (msg in directMessages.values()) {
      if (msg.recipientId == caller and not msg.read) {
        count += 1;
      };
    };
    count;
  };

  // Groups
  public shared ({ caller }) func createGroup(name : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create groups");
    };
    let groupId = nextGroupId;
    nextGroupId += 1;
    let group = {
      id = groupId;
      name;
      creatorId = caller;
      memberIds = [caller];
      createdAt = Time.now();
    };
    groups.add(groupId, group);
    groupId;
  };

  public query ({ caller }) func getMyGroups() : async [Group] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view their groups");
    };
    groups.values().toArray().filter(func(g : Group) : Bool {
      g.memberIds.any(func(m : Principal) : Bool { m == caller })
    });
  };

  public query ({ caller }) func getGroupById(groupId : Nat) : async ?Group {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view groups");
    };
    switch (groups.get(groupId)) {
      case (null) { null };
      case (?group) {
        if (not group.memberIds.any(func(m : Principal) : Bool { m == caller })) {
          Runtime.trap("Unauthorized: Only group members can view this group");
        };
        ?group;
      };
    };
  };

  public shared ({ caller }) func addGroupMember(groupId : Nat, memberId : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can add group members");
    };
    switch (groups.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        if (group.creatorId != caller) {
          Runtime.trap("Unauthorized: Only the group creator can add members");
        };
        if (group.memberIds.any(func(m : Principal) : Bool { m == memberId })) {
          Runtime.trap("User is already a member");
        };
        let newMembers = group.memberIds.concat([memberId]);
        groups.add(groupId, { group with memberIds = newMembers });
      };
    };
  };

  public shared ({ caller }) func removeGroupMember(groupId : Nat, memberId : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can remove group members");
    };
    switch (groups.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        if (group.creatorId != caller) {
          Runtime.trap("Unauthorized: Only the group creator can remove members");
        };
        let newMembers = group.memberIds.filter(func(m : Principal) : Bool { m != memberId });
        groups.add(groupId, { group with memberIds = newMembers });
      };
    };
  };

  public shared ({ caller }) func deleteGroup(groupId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete groups");
    };
    switch (groups.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        if (group.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the group creator or admin can delete this group");
        };
        groups.remove(groupId);
      };
    };
  };

  public shared ({ caller }) func sendGroupMessage(groupId : Nat, content : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can send group messages");
    };
    switch (groups.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        if (not group.memberIds.any(func(m : Principal) : Bool { m == caller })) {
          Runtime.trap("Unauthorized: Only group members can send messages");
        };
        let messageId = nextGroupMessageId;
        nextGroupMessageId += 1;
        let message = {
          id = messageId;
          groupId;
          senderId = caller;
          content;
          timestamp = Time.now();
        };
        groupMessages.add(messageId, message);
        messageId;
      };
    };
  };

  public query ({ caller }) func getGroupMessages(groupId : Nat) : async [GroupMessage] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can read group messages");
    };
    switch (groups.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        if (not group.memberIds.any(func(m : Principal) : Bool { m == caller })) {
          Runtime.trap("Unauthorized: Only group members can read messages");
        };
        groupMessages.values().toArray().filter(func(msg : GroupMessage) : Bool { msg.groupId == groupId });
      };
    };
  };

  // Reels
  public shared ({ caller }) func createReel(title : Text, video : Storage.ExternalBlob) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create reels");
    };
    let reelId = nextReelId;
    nextReelId += 1;
    let reel = {
      id = reelId;
      title;
      video;
      creatorId = caller;
      timestamp = Time.now();
    };
    reels.add(reelId, reel);
    reelId;
  };

  public query ({ caller }) func getAllReels() : async [Reel] {
    reels.values().toArray();
  };

  public query ({ caller }) func getReelsByUser(user : Principal) : async [Reel] {
    reels.values().toArray().filter(func(r : Reel) : Bool { r.creatorId == user });
  };

  public shared ({ caller }) func deleteReel(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete reels");
    };
    switch (reels.get(id)) {
      case (null) { Runtime.trap("Reel not found") };
      case (?reel) {
        if (reel.creatorId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the creator or admin can delete this reel");
        };
        reels.remove(id);
      };
    };
  };

  // WebRTC Signaling
  public shared ({ caller }) func storeCallOffer(callId : Text, sdp : Text, callee : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can store call offers");
    };
    let offer = {
      sdp;
      caller;
      callee;
    };
    let videoCall = {
      offer;
      answer = null;
      candidates = [];
    };
    videoCalls.add(callId, videoCall);
  };

  public query ({ caller }) func getCallOffer(callId : Text) : async ?WebRTCOffer {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get call offers");
    };
    switch (videoCalls.get(callId)) {
      case (null) { null };
      case (?call) {
        if (call.offer.caller != caller and call.offer.callee != caller) {
          Runtime.trap("Unauthorized: Only call participants can view this offer");
        };
        ?call.offer;
      };
    };
  };

  public shared ({ caller }) func storeCallAnswer(callId : Text, sdp : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can store call answers");
    };
    switch (videoCalls.get(callId)) {
      case (null) { Runtime.trap("Call not found") };
      case (?call) {
        if (call.offer.callee != caller) {
          Runtime.trap("Unauthorized: Only the callee can answer this call");
        };
        let answer = {
          sdp;
          callee = caller;
          caller = call.offer.caller;
        };
        videoCalls.add(callId, { call with answer = ?answer });
      };
    };
  };

  public query ({ caller }) func getCallAnswer(callId : Text) : async ?WebRTCAnswer {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get call answers");
    };
    switch (videoCalls.get(callId)) {
      case (null) { null };
      case (?call) {
        if (call.offer.caller != caller and call.offer.callee != caller) {
          Runtime.trap("Unauthorized: Only call participants can view this answer");
        };
        call.answer;
      };
    };
  };

  public shared ({ caller }) func addICECandidate(callId : Text, candidate : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can add ICE candidates");
    };
    switch (videoCalls.get(callId)) {
      case (null) { Runtime.trap("Call not found") };
      case (?call) {
        if (call.offer.caller != caller and call.offer.callee != caller) {
          Runtime.trap("Unauthorized: Only call participants can add ICE candidates");
        };
        let iceCandidate = {
          candidate;
          tenant = caller;
        };
        let newCandidates = call.candidates.concat([iceCandidate]);
        videoCalls.add(callId, { call with candidates = newCandidates });
      };
    };
  };

  public query ({ caller }) func getICECandidates(callId : Text, forPrincipal : Principal) : async [Text] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get ICE candidates");
    };
    switch (videoCalls.get(callId)) {
      case (null) { [] };
      case (?call) {
        if (call.offer.caller != caller and call.offer.callee != caller) {
          Runtime.trap("Unauthorized: Only call participants can view ICE candidates");
        };
        call.candidates.filter(func(c : ICECandidate) : Bool { c.tenant == forPrincipal }).map(func(c : ICECandidate) : Text { c.candidate });
      };
    };
  };

  public shared ({ caller }) func endCall(callId : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can end calls");
    };
    switch (videoCalls.get(callId)) {
      case (null) { Runtime.trap("Call not found") };
      case (?call) {
        if (call.offer.caller != caller and call.offer.callee != caller) {
          Runtime.trap("Unauthorized: Only call participants can end this call");
        };
        videoCalls.remove(callId);
      };
    };
  };

  // Referral System Functions
  public shared ({ caller }) func getMyReferralCode() : async Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get referral codes");
    };

    let existingCode = referralStats.get(caller);
    switch (existingCode) {
      case (?stats) {
        stats.referralCode;
      };
      case (null) {
        // Generate new referral code
        let newCode = nextReferralCode.toText();
        nextReferralCode += 1;

        let newStats = {
          referralCode = newCode;
          totalReferrals = 0;
          verifiedReferrals = 0;
          balance = 0;
        };
        referralStats.add(caller, newStats);
        referralCodeToReferrer.add(newCode, caller);
        newCode;
      };
    };
  };

  public shared ({ caller }) func redeemReferralCode(code : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can redeem referral codes");
    };

    // Check if user already has a referrer
    switch (userToReferrer.get(caller)) {
      case (?_) { Runtime.trap("User already has a referrer") };
      case (null) {};
    };

    // Validate referral code and get referrer
    let referrer = switch (referralCodeToReferrer.get(code)) {
      case (null) { Runtime.trap("Invalid referral code") };
      case (?ref) {
        if (ref == caller) {
          Runtime.trap("Cannot use your own referral code");
        };
        ref;
      };
    };

    // Link user to referrer
    userToReferrer.add(caller, referrer);

    // Update referrer's stats
    switch (referralStats.get(referrer)) {
      case (?stats) {
        let updatedStats = {
          referralCode = stats.referralCode;
          totalReferrals = stats.totalReferrals + 1;
          verifiedReferrals = stats.verifiedReferrals;
          balance = stats.balance;
        };
        referralStats.add(referrer, updatedStats);
      };
      case (null) {
        // This shouldn't happen if referral code exists, but handle it
        Runtime.trap("Referrer stats not found");
      };
    };
  };

  // Called by user after completing profile
  public shared ({ caller }) func markAccountVerified() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can mark account as verified");
    };

    // Check if already verified
    if (verifiedUsers.contains(caller)) {
      Runtime.trap("Account already verified");
    };

    // Mark user as verified
    verifiedUsers.add(caller);

    // Check if user has a referrer
    switch (userToReferrer.get(caller)) {
      case (null) {
        // No referrer, nothing more to do
      };
      case (?referrer) {
        // Update referrer's verified referral count
        switch (referralStats.get(referrer)) {
          case (?stats) {
            let newVerifiedCount = stats.verifiedReferrals + 1;
            var newBalance = stats.balance;

            // Check milestone: 10 verified referrals = 100 Rs reward
            if (newVerifiedCount % 10 == 0) {
              newBalance += 100;
            };

            let updatedStats = {
              referralCode = stats.referralCode;
              totalReferrals = stats.totalReferrals;
              verifiedReferrals = newVerifiedCount;
              balance = newBalance;
            };
            referralStats.add(referrer, updatedStats);
          };
          case (null) {
            // Referrer should have stats, but handle gracefully
          };
        };
      };
    };
  };

  public query ({ caller }) func getReferralStats() : async ReferralStats {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get referral stats");
    };
    switch (referralStats.get(caller)) {
      case (?stats) { stats };
      case (null) {
        // Return default stats if user hasn't generated a referral code yet
        {
          referralCode = "";
          totalReferrals = 0;
          verifiedReferrals = 0;
          balance = 0;
        };
      };
    };
  };

  public query ({ caller }) func getMyBalance() : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get balance");
    };
    switch (referralStats.get(caller)) {
      case (?stats) { stats.balance };
      case (null) { 0 };
    };
  };
};

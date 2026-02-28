import Map "mo:core/Map";
import Set "mo:core/Set";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import List "mo:core/List";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Runtime "mo:core/Runtime";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

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

  // New UserCredential type
  type UserCredential = {
    username : Text;
    passwordHash : Text;
    principalId : Principal;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();
  let posts = Map.empty<Nat, Post>();
  var nextPostId = 0;
  let comments = Map.empty<Nat, Comment>();
  var nextCommentId = 0;
  let likes = Map.empty<Nat, Set.Set<Principal>>();
  let notifications = Map.empty<Nat, Notification>();
  var nextNotificationId = 0;
  let friendRequests = Map.empty<Principal, Map.Map<Principal, RequestStatus>>();
  let followers = Map.empty<Principal, Set.Set<Principal>>();
  let following = Map.empty<Principal, Set.Set<Principal>>();
  let storeListings = Map.empty<Nat, StoreListing>();
  var nextListingId = 0;
  let videoCalls = Map.empty<Text, VideoCall>();
  let directMessages = Map.empty<Nat, DirectMessage>();
  var nextMessageId = 0;

  // New state for groups, group messages, and reels
  let groups = Map.empty<Nat, Group>();
  var nextGroupId = 0;
  let groupMessages = Map.empty<Nat, GroupMessage>();
  var nextGroupMessageId = 0;
  let reels = Map.empty<Nat, Reel>();
  var nextReelId = 0;

  // New maps for credentials
  let usernameToCredential = Map.empty<Text, UserCredential>();
  let principalToUsername = Map.empty<Principal, Text>();

  func compareTime(a : Time.Time, b : Time.Time) : Order.Order {
    if (a < b) { #less } else if (a > b) { #greater } else { #equal };
  };

  module Post {
    public func compareByTimestamp(a : Post, b : Post) : Order.Order {
      compareTime(a.timestamp, b.timestamp);
    };
  };

  module StoreListing {
    public func compareByTimestamp(a : StoreListing, b : StoreListing) : Order.Order {
      compareTime(a.timestamp, b.timestamp);
    };
  };

  module DirectMessage {
    public func compareByTimestamp(a : DirectMessage, b : DirectMessage) : Order.Order {
      compareTime(a.timestamp, b.timestamp);
    };
  };

  module GroupMessage {
    public func compareByTimestamp(a : GroupMessage, b : GroupMessage) : Order.Order {
      compareTime(a.timestamp, b.timestamp);
    };
  };

  module Reel {
    public func compareByTimestampDescending(a : Reel, b : Reel) : Order.Order {
      compareTime(b.timestamp, a.timestamp);
    };
  };

  // Credential System Functions

  public shared ({ caller }) func registerWithCredentials(username : Text, password : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can register credentials");
    };
    // Check if username exists
    switch (usernameToCredential.get(username)) {
      case (?_) { Runtime.trap("Username already taken") };
      case (null) {
        // Check if principal already has a username
        switch (principalToUsername.get(caller)) {
          case (?_) { Runtime.trap("This principal already has a username") };
          case (null) {
            let credential : UserCredential = {
              username;
              passwordHash = password;
              principalId = caller;
            };
            usernameToCredential.add(username, credential);
            principalToUsername.add(caller, username);
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
    let post : Post = {
      id = postId;
      content;
      image;
      timestamp = Time.now();
      author = caller;
    };
    posts.add(postId, post);
  };

  public query ({ caller }) func getAllPosts() : async [Post] {
    posts.values().toArray().sort(Post.compareByTimestamp);
  };

  public query ({ caller }) func getPostsByUser(user : Principal) : async [Post] {
    posts.values().toArray().filter(func(p) { p.author == user });
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
    let comment : Comment = {
      id = commentId;
      postId;
      content;
      timestamp = Time.now();
      author = caller;
    };
    comments.add(commentId, comment);
  };

  public query ({ caller }) func getCommentsByPost(postId : Nat) : async [Comment] {
    comments.values().toArray().filter(func(c) { c.postId == postId });
  };

  // Friends & Followers

  public query ({ caller }) func getFriends(user : Principal) : async [Principal] {
    switch (friendRequests.get(user)) {
      case (null) { [] };
      case (?requests) {
        requests.entries().toArray().filter(func((_, status)) { status == #accepted }).map(func((principal, _)) { principal });
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

  // Direct Messaging

  public shared ({ caller }) func sendMessage(to : Principal, content : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };

    let messageId = nextMessageId;
    nextMessageId += 1;

    let message : DirectMessage = {
      id = messageId;
      senderId = caller;
      recipientId = to;
      content;
      timestamp = Time.now();
      read = false;
    };

    directMessages.add(messageId, message);
  };

  public query ({ caller }) func getConversation(otherUser : Principal) : async [DirectMessage] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view conversations");
    };

    let conversation = List.empty<DirectMessage>();

    for ((_, message) in directMessages.entries()) {
      if ((message.senderId == caller and message.recipientId == otherUser) or (message.senderId == otherUser and message.recipientId == caller)) {
        conversation.add(message);
      };
    };

    let conversationArray = conversation.toArray().sort(DirectMessage.compareByTimestamp);
    conversationArray;
  };

  public query ({ caller }) func getConversations() : async [Principal] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view their conversations");
    };

    let contacts = Set.empty<Principal>();

    for ((_, message) in directMessages.entries()) {
      if (message.senderId == caller) {
        contacts.add(message.recipientId);
      } else if (message.recipientId == caller) {
        contacts.add(message.senderId);
      };
    };

    contacts.toArray();
  };

  public shared ({ caller }) func markConversationRead(otherUser : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can mark conversations as read");
    };

    for ((id, message) in directMessages.entries()) {
      if (message.senderId == otherUser and message.recipientId == caller and not message.read) {
        directMessages.add(id, { message with read = true });
      };
    };
  };

  public query ({ caller }) func getUnreadMessageCount() : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view their unread message count");
    };

    var count = 0;
    for ((_, message) in directMessages.entries()) {
      if (message.recipientId == caller and not message.read) {
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
    let group : Group = {
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
      Runtime.trap("Unauthorized: Only users can view groups");
    };
    let groupsArray = groups.values().toArray();
    groupsArray.filter(func(g) { g.memberIds.any(func(m) { m == caller }) });
  };

  public query ({ caller }) func getGroupById(id : Nat) : async ?Group {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view groups");
    };
    switch (groups.get(id)) {
      case (null) { null };
      case (?group) {
        // Only group members can view group details
        if (not group.memberIds.any(func(m) { m == caller })) {
          Runtime.trap("Unauthorized: Only group members can view group details");
        };
        ?group;
      };
    };
  };

  public shared ({ caller }) func addGroupMember(groupId : Nat, member : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can add group members");
    };
    switch (groups.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        if (group.creatorId != caller) {
          Runtime.trap("Unauthorized: Only group creator can add members");
        };
        let currentMembers = group.memberIds;
        if (currentMembers.any(func(m) { m == member })) {
          Runtime.trap("User is already a group member");
        };
        let updatedMembers = currentMembers.concat([member]);
        groups.add(groupId, { group with memberIds = updatedMembers });
      };
    };
  };

  public shared ({ caller }) func removeGroupMember(groupId : Nat, member : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can remove group members");
    };
    switch (groups.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        if (group.creatorId != caller and caller != member) {
          Runtime.trap("Unauthorized: Only group creator or self can remove member");
        };
        if (not group.memberIds.any(func(m) { m == member })) {
          Runtime.trap("User is not a group member");
        };
        let updatedMembers = group.memberIds.filter(func(m) { m != member });
        if (updatedMembers.size() == 0) {
          Runtime.trap("Group must have at least one member");
        };
        groups.add(groupId, { group with memberIds = updatedMembers });
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
        if (group.creatorId != caller) {
          Runtime.trap("Unauthorized: Only group creator can delete group");
        };
        groups.remove(groupId);
      };
    };
  };

  // Group Messages

  public shared ({ caller }) func sendGroupMessage(groupId : Nat, content : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can send group messages");
    };
    switch (groups.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        if (not group.memberIds.any(func(m) { m == caller })) {
          Runtime.trap("Unauthorized: Only group members can send messages");
        };
        let messageId = nextGroupMessageId;
        nextGroupMessageId += 1;
        let message : GroupMessage = {
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
        if (not group.memberIds.any(func(m) { m == caller })) {
          Runtime.trap("Unauthorized: Only group members can read messages");
        };
        let messagesArray = groupMessages.values().toArray().filter(func(msg) { msg.groupId == groupId });
        messagesArray.sort(GroupMessage.compareByTimestamp);
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
    let reel : Reel = {
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
    reels.values().toArray().sort(Reel.compareByTimestampDescending);
  };

  public query ({ caller }) func getReelsByUser(user : Principal) : async [Reel] {
    reels.values().toArray().filter(func(r) { r.creatorId == user });
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
};

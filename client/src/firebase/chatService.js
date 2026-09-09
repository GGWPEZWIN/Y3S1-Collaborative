// src/firebase/chatService.js

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  increment,
  arrayUnion,
} from "firebase/firestore";

import { db } from "./config";
import { uploadToCloudinary } from "./cloudinaryService";

/* =========================================================
   DIRECT CHAT ID
========================================================= */

function directChatId(uidA, uidB) {
  return [uidA, uidB]
    .filter(Boolean)
    .sort()
    .join("_");
}

/* =========================================================
   CREATE / GET DIRECT CHAT
========================================================= */

export async function createOrGetDirectChat(
  currentUser,
  friend
) {
  if (!currentUser?.uid) {
    throw new Error("Current user is required.");
  }

  if (!friend?.uid) {
    throw new Error("Friend is required.");
  }

  const chatId = directChatId(
    currentUser.uid,
    friend.uid
  );

  const chatRef = doc(
    db,
    "chats",
    chatId
  );

  const snap = await getDoc(chatRef);

  if (!snap.exists()) {
    await setDoc(chatRef, {
      type: "direct",

      members: [
        currentUser.uid,
        friend.uid,
      ],

      memberNames: {
        [currentUser.uid]:
          currentUser.displayName ||
          currentUser.name ||
          "",

        [friend.uid]:
          friend.name ||
          friend.displayName ||
          "",
      },

      memberPhotos: {
        [currentUser.uid]:
          currentUser.profile_photo_url ||
          currentUser.photoURL ||
          "",

        [friend.uid]:
          friend.profile_photo_url ||
          friend.photoURL ||
          "",
      },

      name: null,

      createdBy:
        currentUser.uid,

      created_at:
        serverTimestamp(),

      lastMessage: "",

      lastMessageAt:
        serverTimestamp(),

      mutedBy: [],

      pinnedBy: [],

      unreadCounts: {
        [currentUser.uid]: 0,
        [friend.uid]: 0,
      },

      lastMessageHiddenFor: [],
    });
  }

  return chatId;
}

/* =========================================================
   CREATE GROUP CHAT
========================================================= */

export async function createGroupChat(
  currentUser,
  groupName,
  friends
) {
  if (!currentUser?.uid) {
    throw new Error(
      "Current user is required."
    );
  }

  const trimmedName =
    groupName?.trim();

  if (!trimmedName) {
    throw new Error(
      "Group name can't be empty."
    );
  }

  const safeFriends =
    Array.isArray(friends)
      ? friends
      : [];

  /*
   * Prevent duplicate member UIDs.
   */

  const members = [
    currentUser.uid,
    ...safeFriends.map(
      (friend) => friend?.uid
    ),
  ].filter(
    (uid, index, array) =>
      uid &&
      array.indexOf(uid) === index
  );

  /*
   * Store display names.
   */

  const memberNames = {
    [currentUser.uid]:
      currentUser.displayName ||
      currentUser.name ||
      "",
  };

  safeFriends.forEach(
    (friend) => {
      if (friend?.uid) {
        memberNames[friend.uid] =
          friend.name ||
          friend.displayName ||
          "";
      }
    }
  );

  /*
   * Store profile photos.
   */

  const memberPhotos = {
    [currentUser.uid]:
      currentUser.profile_photo_url ||
      currentUser.photoURL ||
      "",
  };

  safeFriends.forEach(
    (friend) => {
      if (friend?.uid) {
        memberPhotos[friend.uid] =
          friend.profile_photo_url ||
          friend.photoURL ||
          "";
      }
    }
  );

  /*
   * Start unread count at 0.
   */

  const unreadCounts = {};

  members.forEach((uid) => {
    unreadCounts[uid] = 0;
  });

  /*
   * Create permanent group.
   */

  const docRef = await addDoc(
    collection(db, "chats"),
    {
      type: "group",

      members,

      memberNames,

      memberPhotos,

      name: trimmedName,

      createdBy:
        currentUser.uid,

      admins: [
        currentUser.uid,
      ],

      created_at:
        serverTimestamp(),

      lastMessage: "",

      lastMessageAt:
        serverTimestamp(),

      mutedBy: [],

      pinnedBy: [],

      unreadCounts,

      lastMessageHiddenFor: [],
    }
  );

  return docRef.id;
}

/* =========================================================
   GET SINGLE CHAT
========================================================= */

export async function getChat(chatId) {
  if (!chatId) {
    throw new Error(
      "Chat ID is required."
    );
  }

  const chatRef = doc(
    db,
    "chats",
    chatId
  );

  const snap =
    await getDoc(chatRef);

  if (!snap.exists()) {
    return null;
  }

  return {
    id: snap.id,
    ...snap.data(),
  };
}

/* =========================================================
   LIVE USER CHATS
========================================================= */

export function listenToUserChats(
  uid,
  callback,
  onError
) {
  if (!uid) {
    callback?.([]);
    return () => {};
  }

  /*
   * Only query chats where the user is a member.
   *
   * Sorting is done locally so Firestore does not
   * require a composite index.
   */

  const q = query(
    collection(db, "chats"),
    where(
      "members",
      "array-contains",
      uid
    )
  );

  return onSnapshot(
    q,
    (snap) => {
      const chats = snap.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .sort((a, b) => {
          const aTime =
            a.lastMessageAt
              ?.toMillis?.() ||
            a.lastMessageAt
              ?.seconds *
              1000 ||
            0;

          const bTime =
            b.lastMessageAt
              ?.toMillis?.() ||
            b.lastMessageAt
              ?.seconds *
              1000 ||
            0;

          return bTime - aTime;
        });

      callback?.(chats);
    },
    (error) => {
      console.error(
        "listenToUserChats Firestore error:",
        error
      );

      callback?.([]);

      onError?.(error);
    }
  );
}

/* =========================================================
   SEND TEXT MESSAGE
========================================================= */

export async function sendMessage(
  chatId,
  sender,
  text
) {
  const trimmed =
    String(text || "").trim();

  if (!trimmed) {
    return;
  }

  if (!sender?.uid) {
    throw new Error(
      "Sender is required."
    );
  }

  const chatRef = doc(
    db,
    "chats",
    chatId
  );

  const chatSnap =
    await getDoc(chatRef);

  if (!chatSnap.exists()) {
    throw new Error(
      "Chat does not exist."
    );
  }

  const chat =
    chatSnap.data();

  if (
    !(chat.members || []).includes(
      sender.uid
    )
  ) {
    throw new Error(
      "You are not a member of this chat."
    );
  }

  const recipients =
    (chat.members || []).filter(
      (uid) =>
        uid !== sender.uid
    );

  const messageRef = doc(
    collection(
      db,
      "chats",
      chatId,
      "messages"
    )
  );

  const batch =
    writeBatch(db);

  batch.set(
    messageRef,
    {
      senderId:
        sender.uid,

      senderName:
        sender.displayName ||
        sender.name ||
        "",

      type: "text",

      text: trimmed,

      created_at:
        serverTimestamp(),

      deletedFor: [],

      deletedForEveryone:
        false,

      readBy: [
        sender.uid,
      ],
    }
  );

  const chatUpdate = {
    lastMessage:
      trimmed,

    lastMessageAt:
      serverTimestamp(),

    lastMessageHiddenFor: [],
  };

  recipients.forEach(
    (uid) => {
      chatUpdate[
        `unreadCounts.${uid}`
      ] = increment(1);
    }
  );

  batch.update(
    chatRef,
    chatUpdate
  );

  await batch.commit();
}

/* =========================================================
   SEND CLOUDINARY MEDIA MESSAGE
========================================================= */

async function sendCloudinaryMediaMessage(
  chatId,
  sender,
  file,
  expectedType
) {
  if (!file) {
    throw new Error(
      `${expectedType} file is required.`
    );
  }

  if (!sender?.uid) {
    throw new Error(
      "Sender is required."
    );
  }

  /*
   * Upload to Cloudinary.
   *
   * cloudinaryService.js now returns mediaType.
   */

  const media =
    await uploadToCloudinary(
      file,
      expectedType
    );

  if (
    media.mediaType !==
    expectedType
  ) {
    throw new Error(
      `Expected a ${expectedType} file.`
    );
  }

  const chatRef = doc(
    db,
    "chats",
    chatId
  );

  const chatSnap =
    await getDoc(chatRef);

  if (!chatSnap.exists()) {
    throw new Error(
      "Chat does not exist."
    );
  }

  const chat =
    chatSnap.data();

  if (
    !(chat.members || []).includes(
      sender.uid
    )
  ) {
    throw new Error(
      "You are not a member of this chat."
    );
  }

  const recipients =
    (chat.members || []).filter(
      (uid) =>
        uid !== sender.uid
    );

  const messageRef = doc(
    collection(
      db,
      "chats",
      chatId,
      "messages"
    )
  );

  const batch =
    writeBatch(db);

  const messageData = {
    senderId:
      sender.uid,

    senderName:
      sender.displayName ||
      sender.name ||
      "",

    type: expectedType,

    mediaUrl:
      media.url,

    cloudinaryPublicId:
      media.publicId || "",

    cloudinaryResourceType:
      media.resourceType || "",

    format:
      media.format || "",

    bytes:
      media.bytes ||
      file.size ||
      0,

    created_at:
      serverTimestamp(),

    deletedFor: [],

    deletedForEveryone:
      false,

    readBy: [
      sender.uid,
    ],
  };

  /*
   * Store type-specific URLs.
   */

  if (expectedType === "image") {
    messageData.imageUrl =
      media.url;
  }

  if (expectedType === "video") {
    messageData.videoUrl =
      media.url;
  }

  if (expectedType === "audio") {
    /*
     * IMPORTANT:
     *
     * media.url is the browser-friendly MP3
     * URL returned by cloudinaryService.js.
     */

    messageData.audioUrl =
      media.url;

    messageData.audioOriginalUrl =
      media.originalUrl ||
      media.secure_url ||
      media.url;

    messageData.browserAudioUrl =
      media.browserAudioUrl ||
      media.url;

    messageData.duration =
      media.duration || 0;
  }

  batch.set(
    messageRef,
    messageData
  );

  const chatUpdate = {
    lastMessageHiddenFor: [],

    lastMessage:
      expectedType === "image"
        ? "📷 Photo"
        : expectedType === "video"
          ? "🎥 Video"
          : "🎤 Voice message",

    lastMessageAt:
      serverTimestamp(),
  };

  recipients.forEach(
    (uid) => {
      chatUpdate[
        `unreadCounts.${uid}`
      ] = increment(1);
    }
  );

  batch.update(
    chatRef,
    chatUpdate
  );

  await batch.commit();

  return messageRef.id;
}

/* =========================================================
   SEND IMAGE
========================================================= */

export function sendImageMessage(
  chatId,
  sender,
  file
) {
  return sendCloudinaryMediaMessage(
    chatId,
    sender,
    file,
    "image"
  );
}

/* =========================================================
   SEND VIDEO
========================================================= */

export function sendVideoMessage(
  chatId,
  sender,
  file
) {
  return sendCloudinaryMediaMessage(
    chatId,
    sender,
    file,
    "video"
  );
}

/* =========================================================
   SEND VOICE MESSAGE
   STORES REAL DURATION
========================================================= */

export async function sendVoiceMessage(
  chatId,
  sender,
  blob,
  duration = 0
) {
  if (!blob) {
    throw new Error(
      "Voice recording is required."
    );
  }

  if (!sender?.uid) {
    throw new Error(
      "Sender is required."
    );
  }

  /*
   * Upload specifically as voice.
   *
   * cloudinaryService.js detects the Blob MIME
   * type and returns mediaType = "audio".
   */

  const media =
    await uploadToCloudinary(
      blob,
      "voice"
    );

  if (
    media.mediaType !==
    "audio"
  ) {
    throw new Error(
      "The recorded file is not recognised as audio."
    );
  }

  const chatRef = doc(
    db,
    "chats",
    chatId
  );

  const chatSnap =
    await getDoc(chatRef);

  if (!chatSnap.exists()) {
    throw new Error(
      "Chat does not exist."
    );
  }

  const chat =
    chatSnap.data();

  /*
   * Make sure sender belongs
   * to this chat.
   */

  if (
    !(chat.members || []).includes(
      sender.uid
    )
  ) {
    throw new Error(
      "You are not a member of this chat."
    );
  }

  const recipients =
    (chat.members || []).filter(
      (uid) =>
        uid !== sender.uid
    );

  /*
   * Convert duration to a safe
   * number of seconds.
   */

  let safeDuration =
    Number(duration);

  if (
    !Number.isFinite(
      safeDuration
    ) ||
    safeDuration < 0
  ) {
    safeDuration = 0;
  }

  /*
   * Keep decimals internally if available,
   * but do not allow absurd values.
   */

  safeDuration =
    Math.min(
      safeDuration,
      24 * 60 * 60
    );

  const messageRef = doc(
    collection(
      db,
      "chats",
      chatId,
      "messages"
    )
  );

  const browserAudioUrl =
    media.browserAudioUrl ||
    media.url ||
    "";

  const originalAudioUrl =
    media.originalUrl ||
    media.secure_url ||
    media.url ||
    "";

  const messageData = {
    senderId:
      sender.uid,

    senderName:
      sender.displayName ||
      sender.name ||
      "",

    type: "audio",

    /*
     * Browser-ready MP3 URL.
     */
    audioUrl:
      browserAudioUrl,

    /*
     * Keep explicit browser URL too.
     */
    browserAudioUrl,

    /*
     * Keep original Cloudinary URL
     * for debugging/future use.
     */
    audioOriginalUrl:
      originalAudioUrl,

    mediaUrl:
      browserAudioUrl,

    cloudinaryPublicId:
      media.publicId || "",

    cloudinaryResourceType:
      media.resourceType ||
      "video",

    format:
      media.format || "",

    bytes:
      media.bytes ||
      blob.size ||
      0,

    /*
     * Real recording duration.
     */
    duration:
      safeDuration,

    created_at:
      serverTimestamp(),

    deletedFor: [],

    deletedForEveryone:
      false,

    readBy: [
      sender.uid,
    ],
  };

  const batch =
    writeBatch(db);

  batch.set(
    messageRef,
    messageData
  );

  const chatUpdate = {
    lastMessage:
      "🎤 Voice message",

    lastMessageAt:
      serverTimestamp(),

    lastMessageHiddenFor: [],
  };

  recipients.forEach(
    (uid) => {
      chatUpdate[
        `unreadCounts.${uid}`
      ] = increment(1);
    }
  );

  batch.update(
    chatRef,
    chatUpdate
  );

  await batch.commit();

  return messageRef.id;
}

/* =========================================================
   LISTEN TO MESSAGES
========================================================= */

export function listenToMessages(
  chatId,
  callback,
  onError
) {
  if (!chatId) {
    callback?.([]);
    return () => {};
  }

  /*
   * Do not use orderBy here.
   *
   * Local sorting prevents missing-index problems
   * and works even when older messages use slightly
   * different timestamp fields.
   */

  const messagesRef =
    collection(
      db,
      "chats",
      chatId,
      "messages"
    );

  return onSnapshot(
    messagesRef,
    (snapshot) => {
      const list =
        snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .sort((a, b) => {
            const getTime = (
              message
            ) => {
              const timestamp =
                message.created_at ||
                message.createdAt ||
                message.timestamp ||
                message.sentAt;

              if (
                timestamp?.toMillis
              ) {
                return timestamp.toMillis();
              }

              if (
                timestamp?.seconds
              ) {
                return (
                  timestamp.seconds *
                  1000
                );
              }

              if (
                typeof timestamp ===
                "number"
              ) {
                return timestamp;
              }

              return 0;
            };

            return (
              getTime(a) -
              getTime(b)
            );
          });

      callback?.(list);
    },
    (error) => {
      console.error(
        "listenToMessages error:",
        error
      );

      callback?.([]);

      onError?.(error);
    }
  );
}

/* =========================================================
   MARK MESSAGES AS READ / SEEN
========================================================= */

export async function markMessagesAsRead(
  chatId,
  uid
) {
  if (!chatId || !uid) {
    return;
  }

  const messagesRef =
    collection(
      db,
      "chats",
      chatId,
      "messages"
    );

  const snapshot =
    await getDocs(
      messagesRef
    );

  if (snapshot.empty) {
    return;
  }

  const batch =
    writeBatch(db);

  let changed = false;

  snapshot.forEach(
    (messageDoc) => {
      const data =
        messageDoc.data();

      /*
       * Do not need to mark your own
       * messages as newly read.
       */

      if (
        data.senderId === uid
      ) {
        return;
      }

      const readBy =
        Array.isArray(
          data.readBy
        )
          ? data.readBy
          : [];

      if (
        !readBy.includes(uid)
      ) {
        batch.update(
          messageDoc.ref,
          {
            readBy:
              arrayUnion(uid),
          }
        );

        changed = true;
      }
    }
  );

  if (changed) {
    await batch.commit();
  }

  /*
   * Reset this user's unread count.
   */

  try {
    await updateDoc(
      doc(
        db,
        "chats",
        chatId
      ),
      {
        [`unreadCounts.${uid}`]: 0,
      }
    );
  } catch (error) {
    console.warn(
      "Unable to reset unread count:",
      error
    );
  }
}

/* =========================================================
   DELETE MESSAGE FOR ME
========================================================= */

export async function deleteMessageForMe(
  chatId,
  messageId,
  uid
) {
  if (
    !chatId ||
    !messageId ||
    !uid
  ) {
    throw new Error(
      "Chat ID, message ID and user ID are required."
    );
  }

  const messageRef = doc(
    db,
    "chats",
    chatId,
    "messages",
    messageId
  );

  const messageSnap =
    await getDoc(
      messageRef
    );

  if (!messageSnap.exists()) {
    throw new Error(
      "Message does not exist."
    );
  }

  const message =
    messageSnap.data();

  const deletedFor =
    Array.isArray(
      message.deletedFor
    )
      ? message.deletedFor
      : [];

  if (
    !deletedFor.includes(uid)
  ) {
    await updateDoc(
      messageRef,
      {
        deletedFor:
          arrayUnion(uid),
      }
    );
  }

  /*
   * Hide the latest message preview for this user
   * if this message is currently the chat preview.
   */

  try {
    const chatRef = doc(
      db,
      "chats",
      chatId
    );

    const chatSnap =
      await getDoc(chatRef);

    if (chatSnap.exists()) {
      const chat =
        chatSnap.data();

      const hiddenFor =
        Array.isArray(
          chat.lastMessageHiddenFor
        )
          ? chat.lastMessageHiddenFor
          : [];

      if (
        chat.lastMessage ===
          message.text ||
        (
          message.type ===
            "audio" &&
          chat.lastMessage ===
            "🎤 Voice message"
        ) ||
        (
          message.type ===
            "image" &&
          chat.lastMessage ===
            "📷 Photo"
        ) ||
        (
          message.type ===
            "video" &&
          chat.lastMessage ===
            "🎥 Video"
        )
      ) {
        if (
          !hiddenFor.includes(uid)
        ) {
          await updateDoc(
            chatRef,
            {
              lastMessageHiddenFor:
                arrayUnion(uid),
            }
          );
        }
      }
    }
  } catch (error) {
    console.warn(
      "Unable to update chat preview:",
      error
    );
  }
}

/* =========================================================
   DELETE MESSAGE FOR EVERYONE
========================================================= */

export async function deleteMessageForEveryone(
  chatId,
  messageId,
  uid
) {
  if (
    !chatId ||
    !messageId ||
    !uid
  ) {
    throw new Error(
      "Chat ID, message ID and user ID are required."
    );
  }

  const messageRef = doc(
    db,
    "chats",
    chatId,
    "messages",
    messageId
  );

  const messageSnap =
    await getDoc(
      messageRef
    );

  if (!messageSnap.exists()) {
    throw new Error(
      "Message does not exist."
    );
  }

  const message =
    messageSnap.data();

  /*
   * Only the original sender can delete
   * the message for everyone.
   */

  if (
    message.senderId !== uid
  ) {
    throw new Error(
      "You can only delete your own message for everyone."
    );
  }

  /*
   * Tombstone instead of physically deleting
   * the Firestore document.
   *
   * This allows everyone in the chat to see
   * that a message was deleted.
   */

  await updateDoc(
    messageRef,
    {
      deletedForEveryone:
        true,

      type: "deleted",

      text:
        "This message was deleted for everyone",

      imageUrl: null,

      videoUrl: null,

      audioUrl: null,

      browserAudioUrl: null,

      audioOriginalUrl: null,

      mediaUrl: null,

      duration: 0,
    }
  );

  /*
   * Update latest chat preview if necessary.
   */

  try {
    const chatRef = doc(
      db,
      "chats",
      chatId
    );

    const chatSnap =
      await getDoc(
        chatRef
      );

    if (
      chatSnap.exists()
    ) {
      const chat =
        chatSnap.data();

      if (
        chat.lastMessage ===
          message.text ||
        (
          message.type ===
            "audio" &&
          chat.lastMessage ===
            "🎤 Voice message"
        ) ||
        (
          message.type ===
            "image" &&
          chat.lastMessage ===
            "📷 Photo"
        ) ||
        (
          message.type ===
            "video" &&
          chat.lastMessage ===
            "🎥 Video"
        )
      ) {
        await updateDoc(
          chatRef,
          {
            lastMessage:
              "This message was deleted for everyone",

            lastMessageAt:
              serverTimestamp(),

            lastMessageHiddenFor:
              [],
          }
        );
      }
    }
  } catch (error) {
    console.warn(
      "Unable to update deleted message preview:",
      error
    );
  }
}

/* =========================================================
   TOGGLE MUTE CHAT
========================================================= */

export async function toggleMuteChat(
  chatId,
  uid,
  muted
) {
  if (
    !chatId ||
    !uid
  ) {
    return;
  }

  const chatRef = doc(
    db,
    "chats",
    chatId
  );

  if (muted) {
    await updateDoc(
      chatRef,
      {
        mutedBy:
          arrayUnion(uid),
      }
    );

    return;
  }

  const chatSnap =
    await getDoc(
      chatRef
    );

  if (!chatSnap.exists()) {
    return;
  }

  const chat =
    chatSnap.data();

  const mutedBy =
    Array.isArray(
      chat.mutedBy
    )
      ? chat.mutedBy
      : [];

  await updateDoc(
    chatRef,
    {
      mutedBy:
        mutedBy.filter(
          (id) =>
            id !== uid
        ),
    }
  );
}

/* =========================================================
   PIN / UNPIN CHAT
========================================================= */

export async function togglePinChat(
  chatId,
  uid,
  pinned
) {
  if (
    !chatId ||
    !uid
  ) {
    return;
  }

  const chatRef = doc(
    db,
    "chats",
    chatId
  );

  if (pinned) {
    await updateDoc(
      chatRef,
      {
        pinnedBy:
          arrayUnion(uid),
      }
    );

    return;
  }

  const snap =
    await getDoc(chatRef);

  if (!snap.exists()) {
    return;
  }

  const chat =
    snap.data();

  const pinnedBy =
    Array.isArray(
      chat.pinnedBy
    )
      ? chat.pinnedBy
      : [];

  await updateDoc(
    chatRef,
    {
      pinnedBy:
        pinnedBy.filter(
          (id) =>
            id !== uid
        ),
    }
  );
}

/* =========================================================
   DELETE CONVERSATION FOR USER
========================================================= */

export async function deleteConversation(
  chatId,
  uid
) {
  if (
    !chatId ||
    !uid
  ) {
    return;
  }

  const chatRef = doc(
    db,
    "chats",
    chatId
  );

  const chatSnap =
    await getDoc(
      chatRef
    );

  if (!chatSnap.exists()) {
    return;
  }

  const chat =
    chatSnap.data();

  /*
   * We do not delete the entire chat document.
   *
   * The conversation should remain available to
   * other participants.
   *
   * Instead, hide the latest preview for this user.
   */

  const hiddenFor =
    Array.isArray(
      chat.lastMessageHiddenFor
    )
      ? chat.lastMessageHiddenFor
      : [];

  if (
    !hiddenFor.includes(uid)
  ) {
    await updateDoc(
      chatRef,
      {
        lastMessageHiddenFor:
          arrayUnion(uid),
      }
    );
  }
}

/* =========================================================
   RENAME GROUP
========================================================= */

export async function renameGroup(
  chatId,
  newName,
  uid
) {
  const trimmedName =
    newName?.trim();

  if (!trimmedName) {
    throw new Error(
      "Group name can't be empty."
    );
  }

  const chatRef = doc(
    db,
    "chats",
    chatId
  );

  const snap =
    await getDoc(chatRef);

  if (!snap.exists()) {
    throw new Error(
      "Group does not exist."
    );
  }

  const chat =
    snap.data();

  if (
    chat.type !== "group"
  ) {
    throw new Error(
      "This chat is not a group."
    );
  }

  const isAdmin =
    (chat.admins || []).includes(
      uid
    );

  if (!isAdmin) {
    throw new Error(
      "Only group admins can rename the group."
    );
  }

  await updateDoc(
    chatRef,
    {
      name: trimmedName,
    }
  );
}

/* =========================================================
   ADD MEMBER TO GROUP
========================================================= */

export async function addMemberToGroup(
  chatId,
  chat,
  member,
  uid
) {
  if (
    !chatId ||
    !member?.uid ||
    !uid
  ) {
    throw new Error(
      "Group and member information are required."
    );
  }

  const isAdmin =
    (chat?.admins || []).includes(
      uid
    );

  if (!isAdmin) {
    throw new Error(
      "Only group admins can add members."
    );
  }

  if (
    (chat.members || []).includes(
      member.uid
    )
  ) {
    throw new Error(
      "This user is already in the group."
    );
  }

  const members = [
    ...(chat.members || []),
    member.uid,
  ];

  const memberNames = {
    ...(chat.memberNames || {}),
    [member.uid]:
      member.name ||
      member.displayName ||
      "",
  };

  const memberPhotos = {
    ...(chat.memberPhotos || {}),
    [member.uid]:
      member.profile_photo_url ||
      member.photoURL ||
      "",
  };

  const unreadCounts = {
    ...(chat.unreadCounts || {}),
    [member.uid]: 0,
  };

  await updateDoc(
    doc(
      db,
      "chats",
      chatId
    ),
    {
      members,

      memberNames,

      memberPhotos,

      unreadCounts,
    }
  );
}

/* =========================================================
   REMOVE MEMBER FROM GROUP
========================================================= */

export async function removeMemberFromGroup(
  chatId,
  chat,
  memberUid,
  currentUid
) {
  if (
    !chatId ||
    !memberUid ||
    !currentUid
  ) {
    throw new Error(
      "Group and member information are required."
    );
  }

  const isAdmin =
    (chat?.admins || []).includes(
      currentUid
    );

  if (!isAdmin) {
    throw new Error(
      "Only group admins can remove members."
    );
  }

  if (
    memberUid ===
    chat.createdBy
  ) {
    throw new Error(
      "The group creator cannot be removed."
    );
  }

  const members =
    (chat.members || []).filter(
      (uid) =>
        uid !== memberUid
    );

  const memberNames = {
    ...(chat.memberNames || {}),
  };

  const memberPhotos = {
    ...(chat.memberPhotos || {}),
  };

  const unreadCounts = {
    ...(chat.unreadCounts || {}),
  };

  delete memberNames[
    memberUid
  ];

  delete memberPhotos[
    memberUid
  ];

  delete unreadCounts[
    memberUid
  ];

  const admins =
    (chat.admins || []).filter(
      (uid) =>
        uid !== memberUid
    );

  await updateDoc(
    doc(
      db,
      "chats",
      chatId
    ),
    {
      members,

      memberNames,

      memberPhotos,

      unreadCounts,

      admins,
    }
  );
}

/* =========================================================
   PROMOTE MEMBER TO ADMIN
========================================================= */

export async function promoteGroupAdmin(
  chatId,
  chat,
  memberUid,
  currentUid
) {
  if (
    !chatId ||
    !memberUid ||
    !currentUid
  ) {
    throw new Error(
      "Group and member information are required."
    );
  }

  if (
    !(chat.admins || []).includes(
      currentUid
    )
  ) {
    throw new Error(
      "Only group admins can promote members."
    );
  }

  if (
    !(chat.members || []).includes(
      memberUid
    )
  ) {
    throw new Error(
      "User is not a member of this group."
    );
  }

  if (
    (chat.admins || []).includes(
      memberUid
    )
  ) {
    return;
  }

  await updateDoc(
    doc(
      db,
      "chats",
      chatId
    ),
    {
      admins:
        arrayUnion(memberUid),
    }
  );
}

/* =========================================================
   DEMOTE ADMIN
========================================================= */

export async function demoteGroupAdmin(
  chatId,
  chat,
  memberUid,
  currentUid
) {
  if (
    !chatId ||
    !memberUid ||
    !currentUid
  ) {
    throw new Error(
      "Group and member information are required."
    );
  }

  if (
    !(chat.admins || []).includes(
      currentUid
    )
  ) {
    throw new Error(
      "Only group admins can demote admins."
    );
  }

  if (
    memberUid ===
    chat.createdBy
  ) {
    throw new Error(
      "The group creator cannot be demoted."
    );
  }

  const admins =
    (chat.admins || []).filter(
      (uid) =>
        uid !== memberUid
    );

  await updateDoc(
    doc(
      db,
      "chats",
      chatId
    ),
    {
      admins,
    }
  );
}

/* =========================================================
   LEAVE GROUP
========================================================= */

export async function leaveGroup(
  chatId,
  chat,
  myUid
) {
  if (
    !chatId ||
    !myUid
  ) {
    throw new Error(
      "Group and user information are required."
    );
  }

  if (
    chat?.type !== "group"
  ) {
    throw new Error(
      "This chat is not a group."
    );
  }

  const members =
    Array.isArray(chat.members)
      ? chat.members
      : [];

  if (
    !members.includes(myUid)
  ) {
    throw new Error(
      "You are not a member of this group."
    );
  }

  /*
   * ----------------------------------------------------------
   * CREATOR LEAVING
   * ----------------------------------------------------------
   *
   * If the creator is the last member, clean up the group
   * instead of physically deleting the Firestore document.
   *
   * If other members remain, ownership transfers to:
   *
   * 1. an existing admin, or
   * 2. the first remaining member.
   */

  if (
    chat.createdBy === myUid
  ) {
    const remainingMembers =
      members.filter(
        (uid) =>
          uid !== myUid
      );

    /*
     * Creator is the last member.
     */

    if (
      remainingMembers.length ===
      0
    ) {
      await updateDoc(
        doc(
          db,
          "chats",
          chatId
        ),
        {
          members: [],

          memberNames: {},

          memberPhotos: {},

          unreadCounts: {},

          admins: [],

          pinnedBy: [],

          createdBy: null,

          lastMessage:
            "Group closed",
        }
      );

      return {
        deleted: true,
      };
    }

    /*
     * Select new owner.
     */

    const remainingAdmins =
      (chat.admins || [])
        .filter(
          (uid) =>
            uid !== myUid &&
            remainingMembers.includes(
              uid
            )
        );

    const newOwner =
      remainingAdmins[0] ||
      remainingMembers[0];

    /*
     * Keep other admins and guarantee
     * the new owner is an admin.
     */

    const nextAdmins = Array.from(
      new Set([
        ...remainingAdmins,
        newOwner,
      ])
    );

    const memberNames = {
      ...(chat.memberNames || {}),
    };

    const memberPhotos = {
      ...(chat.memberPhotos || {}),
    };

    const unreadCounts = {
      ...(chat.unreadCounts || {}),
    };

    delete memberNames[
      myUid
    ];

    delete memberPhotos[
      myUid
    ];

    delete unreadCounts[
      myUid
    ];

    await updateDoc(
      doc(
        db,
        "chats",
        chatId
      ),
      {
        members:
          remainingMembers,

        memberNames,

        memberPhotos,

        unreadCounts,

        admins:
          nextAdmins,

        createdBy:
          newOwner,
      }
    );

    return {
      transferredTo:
        newOwner,
    };
  }

  /*
   * ----------------------------------------------------------
   * NORMAL MEMBER LEAVING
   * ----------------------------------------------------------
   */

  await removeMemberFromGroup(
    chatId,
    chat,
    myUid,
    myUid
  );

  return {
    left: true,
  };
}

/* =========================================================
   GET GROUP MEMBERS
========================================================= */

export function getGroupMembers(
  chat
) {
  if (!chat) {
    return [];
  }

  const members =
    Array.isArray(chat.members)
      ? chat.members
      : [];

  return members.map(
    (uid) => ({
      uid,

      name:
        chat.memberNames?.[uid] ||
        "User",

      photo:
        chat.memberPhotos?.[uid] ||
        "",

      isAdmin:
        (chat.admins || []).includes(
          uid
        ),

      isCreator:
        chat.createdBy ===
        uid,
    })
  );
}

/* =========================================================
   EXPORT DEFAULT
========================================================= */

export default {
  createOrGetDirectChat,
  createGroupChat,
  getChat,
  listenToUserChats,
  sendMessage,
  sendImageMessage,
  sendVideoMessage,
  sendVoiceMessage,
  listenToMessages,
  markMessagesAsRead,
  deleteMessageForMe,
  deleteMessageForEveryone,
  toggleMuteChat,
  togglePinChat,
  deleteConversation,
  renameGroup,
  addMemberToGroup,
  removeMemberFromGroup,
  promoteGroupAdmin,
  demoteGroupAdmin,
  leaveGroup,
  getGroupMembers,
};
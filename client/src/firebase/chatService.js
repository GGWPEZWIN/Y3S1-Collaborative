import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  increment,
  arrayUnion,
} from "firebase/firestore";

import { db } from "./config";
import { uploadToCloudinary } from "./cloudinaryService";

function directChatId(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

export async function createOrGetDirectChat(currentUser, friend) {
  const chatId = directChatId(currentUser.uid, friend.uid);
  const ref = doc(db, "chats", chatId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      type: "direct",
      members: [currentUser.uid, friend.uid],

      memberNames: {
        [currentUser.uid]:
          currentUser.displayName || currentUser.name || "",
        [friend.uid]:
          friend.name || friend.displayName || "",
      },

      name: null,
      createdBy: currentUser.uid,

      created_at: serverTimestamp(),

      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      lastMessageHiddenFor: [],

      mutedBy: [],
      pinnedBy: [],

      unreadCounts: {
        [currentUser.uid]: 0,
        [friend.uid]: 0,
      },
    });
  }

  return chatId;
}


// =========================================================
// CREATE GROUP CHAT
// =========================================================

export async function createGroupChat(
  currentUser,
  groupName,
  friends
) {
  const name = groupName?.trim();

  if (!name) {
    throw new Error("Group name can't be empty.");
  }

  const safeFriends = Array.isArray(friends)
    ? friends
    : [];

  const members = [
    currentUser.uid,
    ...safeFriends.map((f) => f.uid),
  ].filter(
    (uid, index, arr) =>
      uid && arr.indexOf(uid) === index
  );

  const memberNames = {
    [currentUser.uid]:
      currentUser.displayName ||
      currentUser.name ||
      "",
  };

  const memberPhotos = {
    [currentUser.uid]:
      currentUser.photoURL ||
      currentUser.profile_photo_url ||
      "",
  };

  const unreadCounts = {};

  members.forEach((uid) => {
    unreadCounts[uid] = 0;
  });

  safeFriends.forEach((friend) => {
    if (!friend?.uid) return;

    memberNames[friend.uid] =
      friend.name ||
      friend.displayName ||
      "";

    memberPhotos[friend.uid] =
      friend.profile_photo_url ||
      friend.photoURL ||
      "";
  });

  const ref = await addDoc(
    collection(db, "chats"),
    {
      type: "group",

      members,

      memberNames,

      memberPhotos,

      name,

      createdBy: currentUser.uid,

      admins: [currentUser.uid],

      created_at: serverTimestamp(),

      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      lastMessageHiddenFor: [],

      mutedBy: [],
      pinnedBy: [],

      unreadCounts,
    }
  );

  return ref.id;
}


// =========================================================
// GET CHAT
// =========================================================

export async function getChat(chatId) {
  if (!chatId) {
    throw new Error("Chat ID is required.");
  }

  const snap = await getDoc(
    doc(db, "chats", chatId)
  );

  return snap.exists()
    ? {
        id: snap.id,
        ...snap.data(),
      }
    : null;
}


// =========================================================
// LISTEN TO USER CHATS
// =========================================================

export function listenToUserChats(
  uid,
  callback,
  onError
) {
  if (!uid) {
    callback?.([]);
    return () => {};
  }

  const q = query(
    collection(db, "chats"),
    where("members", "array-contains", uid)
  );

  return onSnapshot(
    q,
    (snap) => {
      const chats = snap.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .sort((a, b) => {
          const aTime =
            a.lastMessageAt?.toMillis?.() ||
            a.lastMessageAt?.seconds ||
            0;

          const bTime =
            b.lastMessageAt?.toMillis?.() ||
            b.lastMessageAt?.seconds ||
            0;

          return bTime - aTime;
        });

      callback?.(chats);
    },
    (error) => {
      console.error(
        "listenToUserChats error:",
        error
      );

      callback?.([]);

      onError?.(error);
    }
  );
}


// =========================================================
// SEND MESSAGE DOCUMENT
// =========================================================

async function sendMessageDocument(
  chatId,
  sender,
  messageData,
  preview
) {
  const chatRef = doc(
    db,
    "chats",
    chatId
  );

  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    throw new Error("Chat does not exist.");
  }

  const chat = chatSnap.data();

  const recipients = (
    chat.members || []
  ).filter(
    (uid) => uid !== sender.uid
  );

  const messageRef = doc(
    collection(
      db,
      "chats",
      chatId,
      "messages"
    )
  );

  const batch = writeBatch(db);

  batch.set(messageRef, {
    senderId: sender.uid,

    senderName:
      sender.displayName ||
      sender.name ||
      "",

    ...messageData,

    created_at: serverTimestamp(),
  });

  const chatUpdate = {
    lastMessage: preview,

    lastMessageAt:
      serverTimestamp(),

    lastMessageHiddenFor: [],
  };

  recipients.forEach((uid) => {
    chatUpdate[
      `unreadCounts.${uid}`
    ] = increment(1);
  });

  batch.update(
    chatRef,
    chatUpdate
  );

  await batch.commit();
}


// =========================================================
// SEND TEXT MESSAGE
// =========================================================

export async function sendMessage(
  chatId,
  sender,
  text
) {
  const trimmed = text?.trim();

  if (!trimmed) return;

  await sendMessageDocument(
    chatId,
    sender,
    {
      type: "text",
      text: trimmed,
    },
    trimmed
  );
}


// =========================================================
// SEND CLOUDINARY MEDIA
// =========================================================

async function sendCloudinaryMediaMessage(
  chatId,
  sender,
  file,
  type
) {
  if (!file) {
    throw new Error(
      `${type} file is required.`
    );
  }

  const media =
    await uploadToCloudinary(
      file,
      `greentrip/chat/${chatId}`
    );

  if (media.mediaType !== type) {
    throw new Error(
      `Expected a ${type} file.`
    );
  }

  const messageData = {
    type,

    mediaUrl: media.url,

    cloudinaryPublicId:
      media.publicId || "",

    cloudinaryResourceType:
      media.resourceType || "",

    format:
      media.format || "",

    bytes:
      media.bytes || file.size,
  };

  if (type === "image") {
    messageData.imageUrl =
      media.url;
  }

  if (type === "video") {
    messageData.videoUrl =
      media.url;
  }

  if (type === "audio") {
    messageData.audioUrl =
      media.url;
  }

  const preview =
    type === "image"
      ? "📷 Photo"
      : type === "video"
      ? "🎥 Video"
      : "🎤 Voice message";

  await sendMessageDocument(
    chatId,
    sender,
    messageData,
    preview
  );
}


// =========================================================
// MEDIA EXPORTS
// =========================================================

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

export function sendVoiceMessage(
  chatId,
  sender,
  blob
) {
  return sendCloudinaryMediaMessage(
    chatId,
    sender,
    blob,
    "audio"
  );
}


// =========================================================
// MESSAGE PREVIEW
// =========================================================

function messagePreview(message) {
  if (!message) return "";

  if (message.type === "image") {
    return "📷 Photo";
  }

  if (message.type === "video") {
    return "🎥 Video";
  }

  if (
    message.type === "audio" ||
    message.type === "voice"
  ) {
    return "🎤 Voice message";
  }

  return message.text || "";
}


// =========================================================
// REFRESH CHAT PREVIEW
// =========================================================

async function refreshChatPreview(
  chatId
) {
  const snap = await getDocs(
    collection(
      db,
      "chats",
      chatId,
      "messages"
    )
  );

  const messages = snap.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
    }))
    .sort((a, b) => {
      const aTime =
        a.created_at?.toMillis?.() ||
        a.created_at?.seconds ||
        0;

      const bTime =
        b.created_at?.toMillis?.() ||
        b.created_at?.seconds ||
        0;

      return bTime - aTime;
    });

  const latest =
    messages[0] || null;

  const preview =
    latest?.deletedForEveryone
      ? "This message was deleted for everyone"
      : messagePreview(latest);

  await setDoc(
    doc(db, "chats", chatId),
    {
      lastMessage: preview,

      lastMessageAt:
        latest?.created_at ||
        serverTimestamp(),

      lastMessageHiddenFor: [],
    },
    {
      merge: true,
    }
  );
}


// =========================================================
// DELETE FOR ME
// =========================================================

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
      "Message information is missing."
    );
  }

  const messageRef = doc(
    db,
    "chats",
    chatId,
    "messages",
    messageId
  );

  const snap =
    await getDoc(messageRef);

  if (!snap.exists()) return;

  const message = snap.data();

  // The original message stays in Firestore.
  // Only this user's UID is added.
  await updateDoc(
    messageRef,
    {
      deletedFor:
        arrayUnion(uid),
    }
  );

  // Hide the chat-list preview for this user
  // if this message is currently the latest preview.
  const chatRef = doc(
    db,
    "chats",
    chatId
  );

  const chatSnap =
    await getDoc(chatRef);

  if (chatSnap.exists()) {
    const chat = chatSnap.data();

    const preview =
      messagePreview(message);

    if (
      chat.lastMessage === preview
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


// =========================================================
// DELETE FOR EVERYONE
// =========================================================

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
      "Message information is missing."
    );
  }

  const messageRef = doc(
    db,
    "chats",
    chatId,
    "messages",
    messageId
  );

  const snap =
    await getDoc(messageRef);

  if (!snap.exists()) return;

  const message = snap.data();

  if (
    message.senderId !== uid
  ) {
    throw new Error(
      "Only the sender can delete this message for everyone."
    );
  }

  // Keep the Firestore document as a
  // tombstone so EVERYONE can see the
  // deleted message box.
  await updateDoc(
    messageRef,
    {
      deletedForEveryone: true,

      type: "deleted",

      text:
        "This message was deleted for everyone",

      imageUrl: null,

      videoUrl: null,

      audioUrl: null,

      mediaUrl: null,
    }
  );

  await refreshChatPreview(
    chatId
  );
}


// =========================================================
// MARK MESSAGES AS READ / SEEN
// =========================================================

export async function markMessagesAsRead(
  chatId,
  uid
) {
  if (!chatId || !uid) return;

  const snap = await getDocs(
    collection(
      db,
      "chats",
      chatId,
      "messages"
    )
  );

  const unread = snap.docs.filter(
    (d) => {
      const data = d.data();

      return (
        data.senderId !== uid &&
        !data.deletedForEveryone &&
        !data.readBy?.includes(uid)
      );
    }
  );

  if (unread.length) {
    const batch =
      writeBatch(db);

    unread.forEach((d) => {
      batch.update(
        d.ref,
        {
          readBy:
            arrayUnion(uid),
        }
      );
    });

    await batch.commit();
  }

  await markChatAsRead(
    chatId,
    uid
  );
}


// =========================================================
// RESET UNREAD COUNT
// =========================================================

export async function markChatAsRead(
  chatId,
  uid
) {
  await setDoc(
    doc(db, "chats", chatId),
    {
      [`unreadCounts.${uid}`]: 0,
    },
    {
      merge: true,
    }
  );
}


// =========================================================
// LISTEN TO MESSAGES
// =========================================================

export function listenToMessages(
  chatId,
  callback,
  onError
) {
  const q = query(
    collection(
      db,
      "chats",
      chatId,
      "messages"
    ),
    orderBy(
      "created_at",
      "asc"
    )
  );

  return onSnapshot(
    q,
    (snap) => {
      callback?.(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
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


// =========================================================
// MUTE CHAT
// =========================================================

export async function toggleMuteChat(
  chatId,
  uid,
  currentlyMuted
) {
  const ref = doc(
    db,
    "chats",
    chatId
  );

  const snap =
    await getDoc(ref);

  if (!snap.exists()) {
    throw new Error(
      "Chat does not exist."
    );
  }

  const mutedBy =
    snap.data().mutedBy || [];

  const next =
    currentlyMuted
      ? mutedBy.filter(
          (id) => id !== uid
        )
      : mutedBy.includes(uid)
      ? mutedBy
      : [...mutedBy, uid];

  await setDoc(
    ref,
    {
      mutedBy: next,
    },
    {
      merge: true,
    }
  );
}


// =========================================================
// PIN CHAT
// =========================================================

export async function togglePinChat(
  chatId,
  uid,
  currentlyPinned
) {
  const ref = doc(
    db,
    "chats",
    chatId
  );

  const snap =
    await getDoc(ref);

  if (!snap.exists()) {
    throw new Error(
      "Chat does not exist."
    );
  }

  const pinnedBy =
    snap.data().pinnedBy || [];

  const next =
    currentlyPinned
      ? pinnedBy.filter(
          (id) => id !== uid
        )
      : pinnedBy.includes(uid)
      ? pinnedBy
      : [...pinnedBy, uid];

  await setDoc(
    ref,
    {
      pinnedBy: next,
    },
    {
      merge: true,
    }
  );
}


// =========================================================
// DELETE CONVERSATION
// =========================================================

export async function deleteConversation(
  chatId
) {
  const snap = await getDocs(
    collection(
      db,
      "chats",
      chatId,
      "messages"
    )
  );

  const batch =
    writeBatch(db);

  snap.docs.forEach((d) => {
    batch.delete(d.ref);
  });

  batch.set(
    doc(db, "chats", chatId),
    {
      lastMessage: "",

      lastMessageAt:
        serverTimestamp(),

      lastMessageHiddenFor: [],
    },
    {
      merge: true,
    }
  );

  await batch.commit();
}


// =========================================================
// RENAME GROUP
// =========================================================

export async function renameGroup(
  chatId,
  newName
) {
  const name = newName?.trim();

  if (!name) {
    throw new Error(
      "Group name can't be empty."
    );
  }

  await setDoc(
    doc(db, "chats", chatId),
    {
      name,
    },
    {
      merge: true,
    }
  );
}


// =========================================================
// ADD GROUP MEMBERS
// =========================================================

export async function addMembersToGroup(
  chatId,
  chat,
  friends
) {
  const members = [
    ...(chat.members || []),
  ];

  const memberNames = {
    ...(chat.memberNames || {}),
  };

  const memberPhotos = {
    ...(chat.memberPhotos || {}),
  };

  const unreadCounts = {
    ...(chat.unreadCounts || {}),
  };

  (
    Array.isArray(friends)
      ? friends
      : []
  ).forEach((friend) => {
    if (
      !friend?.uid ||
      members.includes(friend.uid)
    ) {
      return;
    }

    members.push(friend.uid);

    memberNames[friend.uid] =
      friend.name ||
      friend.displayName ||
      "";

    memberPhotos[friend.uid] =
      friend.profile_photo_url ||
      friend.photoURL ||
      "";

    unreadCounts[friend.uid] = 0;
  });

  await setDoc(
    doc(db, "chats", chatId),
    {
      members,

      memberNames,

      memberPhotos,

      unreadCounts,
    },
    {
      merge: true,
    }
  );
}


// =========================================================
// REMOVE GROUP MEMBER
// =========================================================

export async function removeMemberFromGroup(
  chatId,
  chat,
  memberUid
) {
  const members =
    (chat.members || []).filter(
      (uid) => uid !== memberUid
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

  const admins =
    (chat.admins || []).filter(
      (uid) => uid !== memberUid
    );

  const pinnedBy =
    (chat.pinnedBy || []).filter(
      (uid) => uid !== memberUid
    );

  delete memberNames[
    memberUid
  ];

  delete memberPhotos[
    memberUid
  ];

  delete unreadCounts[
    memberUid
  ];

  await setDoc(
    doc(db, "chats", chatId),
    {
      members,

      memberNames,

      memberPhotos,

      unreadCounts,

      admins,

      pinnedBy,
    },
    {
      merge: true,
    }
  );
}


// =========================================================
// LEAVE GROUP
// =========================================================

export async function leaveGroup(
  chatId,
  chat,
  myUid
) {
  if (
    chat?.createdBy === myUid
  ) {
    throw new Error(
      "The group creator cannot leave the group. Transfer ownership first."
    );
  }

  await removeMemberFromGroup(
    chatId,
    chat,
    myUid
  );
}


// =========================================================
// PROMOTE GROUP ADMIN
// =========================================================

export async function promoteGroupAdmin(
  chatId,
  chat,
  memberUid
) {
  if (!memberUid) {
    throw new Error(
      "Member UID is required."
    );
  }

  const admins = [
    ...(chat.admins || []),
  ];

  if (
    !admins.includes(memberUid)
  ) {
    admins.push(memberUid);
  }

  await setDoc(
    doc(db, "chats", chatId),
    {
      admins,
    },
    {
      merge: true,
    }
  );
}


// =========================================================
// REMOVE GROUP ADMIN
// =========================================================

export async function removeGroupAdmin(
  chatId,
  chat,
  memberUid
) {
  const admins =
    (chat.admins || []).filter(
      (uid) => uid !== memberUid
    );

  await setDoc(
    doc(db, "chats", chatId),
    {
      admins,
    },
    {
      merge: true,
    }
  );
}


// =========================================================
// CHECK GROUP ADMIN
// =========================================================

export function isGroupAdmin(
  chat,
  uid
) {
  return (
    !!chat &&
    !!uid &&
    (
      chat.createdBy === uid ||
      (chat.admins || []).includes(uid)
    )
  );
}


// =========================================================
// GET GROUP MEMBERS
// =========================================================

export function getGroupMembers(
  chat
) {
  if (!chat) return [];

  const names =
    chat.memberNames || {};

  const admins =
    chat.admins || [];

  return (
    chat.members || []
  ).map((uid) => ({
    uid,

    name:
      names[uid] ||
      "Unknown User",

    isAdmin:
      chat.createdBy === uid ||
      admins.includes(uid),

    isCreator:
      chat.createdBy === uid,
  }));
}
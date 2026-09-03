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
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  increment,
} from "firebase/firestore";

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import { db, storage as configuredStorage } from "./config";

const storage = configuredStorage || getStorage();

/* =========================================================
   DIRECT CHAT ID
========================================================= */

function directChatId(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

/* =========================================================
   CREATE / GET DIRECT CHAT
========================================================= */

export async function createOrGetDirectChat(currentUser, friend) {
  const chatId = directChatId(currentUser.uid, friend.uid);

  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);

  if (!snap.exists()) {
    await setDoc(chatRef, {
      type: "direct",

      members: [currentUser.uid, friend.uid],

      memberNames: {
        [currentUser.uid]: currentUser.displayName || "",
        [friend.uid]: friend.name || "",
      },

      name: null,

      createdBy: currentUser.uid,

      created_at: serverTimestamp(),

      lastMessage: "",

      lastMessageAt: serverTimestamp(),

      mutedBy: [],

      // IMPORTANT:
      // Tracks unread messages separately for every user.
      unreadCounts: {
        [currentUser.uid]: 0,
        [friend.uid]: 0,
      },
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
  const members = [
    currentUser.uid,
    ...friends.map((f) => f.uid),
  ];

  const memberNames = {
    [currentUser.uid]: currentUser.displayName || "",
  };

  friends.forEach((f) => {
    memberNames[f.uid] = f.name || "";
  });

  const unreadCounts = {};

  members.forEach((uid) => {
    unreadCounts[uid] = 0;
  });

  const docRef = await addDoc(collection(db, "chats"), {
    type: "group",

    members,

    memberNames,

    name: groupName.trim(),

    createdBy: currentUser.uid,

    created_at: serverTimestamp(),

    lastMessage: "",

    lastMessageAt: serverTimestamp(),

    mutedBy: [],

    unreadCounts,
  });

  return docRef.id;
}

/* =========================================================
   LIVE USER CHATS
========================================================= */

export function listenToUserChats(uid, callback) {
  const q = query(
    collection(db, "chats"),
    where("members", "array-contains", uid),
    orderBy("lastMessageAt", "desc")
  );

  return onSnapshot(q, (snap) => {
    const chats = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    callback(chats);
  });
}

/* =========================================================
   SEND TEXT MESSAGE
========================================================= */

export async function sendMessage(chatId, sender, text) {
  const trimmed = text.trim();

  if (!trimmed) return;

  const chatRef = doc(db, "chats", chatId);

  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    throw new Error("Chat does not exist.");
  }

  const chat = chatSnap.data();

  const recipients = (chat.members || []).filter(
    (uid) => uid !== sender.uid
  );

  const messageRef = doc(
    collection(db, "chats", chatId, "messages")
  );

  const batch = writeBatch(db);

  batch.set(messageRef, {
    senderId: sender.uid,
    senderName: sender.displayName || "",
    type: "text",
    text: trimmed,
    created_at: serverTimestamp(),
  });

  const chatUpdate = {
    lastMessage: trimmed,
    lastMessageAt: serverTimestamp(),
  };

  recipients.forEach((uid) => {
    chatUpdate[`unreadCounts.${uid}`] = increment(1);
  });

  batch.update(chatRef, chatUpdate);

  await batch.commit();
}

/* =========================================================
   SEND IMAGE MESSAGE
========================================================= */

export async function sendImageMessage(chatId, sender, file) {
  const path = `chats/${chatId}/images/${Date.now()}_${file.name}`;

  const fileRef = storageRef(storage, path);

  await uploadBytes(fileRef, file);

  const url = await getDownloadURL(fileRef);

  const chatRef = doc(db, "chats", chatId);

  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    throw new Error("Chat does not exist.");
  }

  const chat = chatSnap.data();

  const recipients = (chat.members || []).filter(
    (uid) => uid !== sender.uid
  );

  const messageRef = doc(
    collection(db, "chats", chatId, "messages")
  );

  const batch = writeBatch(db);

  batch.set(messageRef, {
    senderId: sender.uid,
    senderName: sender.displayName || "",
    type: "image",
    imageUrl: url,
    created_at: serverTimestamp(),
  });

  const chatUpdate = {
    lastMessage: "📷 Photo",
    lastMessageAt: serverTimestamp(),
  };

  recipients.forEach((uid) => {
    chatUpdate[`unreadCounts.${uid}`] = increment(1);
  });

  batch.update(chatRef, chatUpdate);

  await batch.commit();
}

/* =========================================================
   SEND VOICE MESSAGE
========================================================= */

export async function sendVoiceMessage(chatId, sender, blob) {
  const path = `chats/${chatId}/voice/${Date.now()}.webm`;

  const fileRef = storageRef(storage, path);

  await uploadBytes(fileRef, blob);

  const url = await getDownloadURL(fileRef);

  const chatRef = doc(db, "chats", chatId);

  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    throw new Error("Chat does not exist.");
  }

  const chat = chatSnap.data();

  const recipients = (chat.members || []).filter(
    (uid) => uid !== sender.uid
  );

  const messageRef = doc(
    collection(db, "chats", chatId, "messages")
  );

  const batch = writeBatch(db);

  batch.set(messageRef, {
    senderId: sender.uid,
    senderName: sender.displayName || "",
    type: "voice",
    audioUrl: url,
    created_at: serverTimestamp(),
  });

  const chatUpdate = {
    lastMessage: "🎤 Voice message",
    lastMessageAt: serverTimestamp(),
  };

  recipients.forEach((uid) => {
    chatUpdate[`unreadCounts.${uid}`] = increment(1);
  });

  batch.update(chatRef, chatUpdate);

  await batch.commit();
}

/* =========================================================
   MARK CHAT AS READ
========================================================= */

export async function markChatAsRead(chatId, uid) {
  const chatRef = doc(db, "chats", chatId);

  await setDoc(
    chatRef,
    {
      [`unreadCounts.${uid}`]: 0,
    },
    {
      merge: true,
    }
  );
}

/* =========================================================
   LIVE CHAT MESSAGES
========================================================= */

export function listenToMessages(chatId, callback) {
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("created_at", "asc")
  );

  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    callback(messages);
  });
}

/* =========================================================
   MUTE CHAT
========================================================= */

export async function toggleMuteChat(
  chatId,
  uid,
  currentlyMuted
) {
  const chatRef = doc(db, "chats", chatId);

  const snap = await getDoc(chatRef);

  const mutedBy = snap.exists()
    ? snap.data().mutedBy || []
    : [];

  const next = currentlyMuted
    ? mutedBy.filter((id) => id !== uid)
    : [...mutedBy, uid];

  await setDoc(
    chatRef,
    {
      mutedBy: next,
    },
    {
      merge: true,
    }
  );
}

/* =========================================================
   DELETE CONVERSATION
========================================================= */

export async function deleteConversation(chatId) {
  const messagesSnap = await getDocs(
    collection(db, "chats", chatId, "messages")
  );

  const batch = writeBatch(db);

  messagesSnap.docs.forEach((d) => {
    batch.delete(d.ref);
  });

  batch.set(
    doc(db, "chats", chatId),
    {
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
    },
    {
      merge: true,
    }
  );

  await batch.commit();
}

/* =========================================================
   RENAME GROUP
========================================================= */

export async function renameGroup(chatId, newName) {
  const trimmed = newName.trim();

  if (!trimmed) {
    throw new Error("Group name can't be empty.");
  }

  await setDoc(
    doc(db, "chats", chatId),
    {
      name: trimmed,
    },
    {
      merge: true,
    }
  );
}

/* =========================================================
   ADD MEMBERS TO GROUP
========================================================= */

export async function addMembersToGroup(
  chatId,
  chat,
  friends
) {
  const newMembers = [...chat.members];

  const newMemberNames = {
    ...chat.memberNames,
  };

  const newUnreadCounts = {
    ...(chat.unreadCounts || {}),
  };

  friends.forEach((f) => {
    if (!newMembers.includes(f.uid)) {
      newMembers.push(f.uid);

      newMemberNames[f.uid] = f.name || "";

      newUnreadCounts[f.uid] = 0;
    }
  });

  await setDoc(
    doc(db, "chats", chatId),
    {
      members: newMembers,
      memberNames: newMemberNames,
      unreadCounts: newUnreadCounts,
    },
    {
      merge: true,
    }
  );
}

/* =========================================================
   REMOVE MEMBER FROM GROUP
========================================================= */

export async function removeMemberFromGroup(
  chatId,
  chat,
  memberUid
) {
  const newMembers = chat.members.filter(
    (m) => m !== memberUid
  );

  const newMemberNames = {
    ...chat.memberNames,
  };

  delete newMemberNames[memberUid];

  const newUnreadCounts = {
    ...(chat.unreadCounts || {}),
  };

  delete newUnreadCounts[memberUid];

  await setDoc(
    doc(db, "chats", chatId),
    {
      members: newMembers,
      memberNames: newMemberNames,
      unreadCounts: newUnreadCounts,
    },
    {
      merge: true,
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
  await removeMemberFromGroup(
    chatId,
    chat,
    myUid
  );
}
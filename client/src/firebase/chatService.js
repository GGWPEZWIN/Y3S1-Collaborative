import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage as configuredStorage } from "./config";

// Falls back to a default Storage instance if config.js doesn't export one yet —
// if you see a Storage-related error, make sure config.js does:
//   export const storage = getStorage(app);
const storage = configuredStorage || getStorage();

/** Deterministic ID for a 1:1 chat so re-opening it never creates duplicates. */
function directChatId(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

/**
 * Gets an existing direct chat between two users, or creates it if it
 * doesn't exist yet. Returns the chat ID.
 */
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
    });
  }

  return chatId;
}

/**
 * Creates a new group chat with the given friends (array of {uid, name}).
 * The current user is automatically included. Returns the new chat ID.
 */
export async function createGroupChat(currentUser, groupName, friends) {
  const members = [currentUser.uid, ...friends.map((f) => f.uid)];
  const memberNames = { [currentUser.uid]: currentUser.displayName || "" };
  friends.forEach((f) => {
    memberNames[f.uid] = f.name || "";
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
  });

  return docRef.id;
}

/**
 * Live subscription to all chats the current user is a member of,
 * most recently active first.
 */
export function listenToUserChats(uid, callback) {
  const q = query(
    collection(db, "chats"),
    where("members", "array-contains", uid),
    orderBy("lastMessageAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const chats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(chats);
  });
}

/** Sends a plain text message and bumps the chat's lastMessage/lastMessageAt preview. */
export async function sendMessage(chatId, sender, text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId: sender.uid,
    senderName: sender.displayName || "",
    type: "text",
    text: trimmed,
    created_at: serverTimestamp(),
  });

  await setDoc(
    doc(db, "chats", chatId),
    { lastMessage: trimmed, lastMessageAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Uploads an image to Storage and sends it as a message.
 * `file` is a File object, typically from an <input type="file"> change event.
 */
export async function sendImageMessage(chatId, sender, file) {
  const path = `chats/${chatId}/images/${Date.now()}_${file.name}`;
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);

  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId: sender.uid,
    senderName: sender.displayName || "",
    type: "image",
    imageUrl: url,
    created_at: serverTimestamp(),
  });

  await setDoc(
    doc(db, "chats", chatId),
    { lastMessage: "📷 Photo", lastMessageAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Uploads a recorded voice clip to Storage and sends it as a message.
 * `blob` is typically the output of a MediaRecorder's `onstop` handler.
 */
export async function sendVoiceMessage(chatId, sender, blob) {
  const path = `chats/${chatId}/voice/${Date.now()}.webm`;
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, blob);
  const url = await getDownloadURL(fileRef);

  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId: sender.uid,
    senderName: sender.displayName || "",
    type: "voice",
    audioUrl: url,
    created_at: serverTimestamp(),
  });

  await setDoc(
    doc(db, "chats", chatId),
    { lastMessage: "🎤 Voice message", lastMessageAt: serverTimestamp() },
    { merge: true }
  );
}

/** Live subscription to a chat's messages, oldest first. */
export function listenToMessages(chatId, callback) {
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("created_at", "asc"));
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(messages);
  });
}

/**
 * Toggles mute for the given user on this chat. Muted chats are stored
 * as a `mutedBy` array of uids on the chat doc — check
 * `chat.mutedBy?.includes(myUid)` to know if the current user has it muted.
 */
export async function toggleMuteChat(chatId, uid, currentlyMuted) {
  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);
  const mutedBy = snap.exists() ? snap.data().mutedBy || [] : [];

  const next = currentlyMuted ? mutedBy.filter((id) => id !== uid) : [...mutedBy, uid];

  await setDoc(chatRef, { mutedBy: next }, { merge: true });
}

/**
 * Deletes every message in this conversation and resets its preview.
 * This clears the conversation for BOTH participants — there's no
 * per-user "hide for me" concept in this data model, so pair this with
 * a confirm() prompt in the UI before calling it.
 */
export async function deleteConversation(chatId) {
  const messagesSnap = await getDocs(collection(db, "chats", chatId, "messages"));
  const batch = writeBatch(db);
  messagesSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.set(doc(db, "chats", chatId), { lastMessage: "", lastMessageAt: serverTimestamp() }, { merge: true });
  await batch.commit();
}

/** Renames a group chat. */
export async function renameGroup(chatId, newName) {
  const trimmed = newName.trim();
  if (!trimmed) throw new Error("Group name can't be empty.");
  await setDoc(doc(db, "chats", chatId), { name: trimmed }, { merge: true });
}

/** Adds friends (array of {uid, name}) to an existing group. */
export async function addMembersToGroup(chatId, chat, friends) {
  const newMembers = [...chat.members];
  const newMemberNames = { ...chat.memberNames };

  friends.forEach((f) => {
    if (!newMembers.includes(f.uid)) {
      newMembers.push(f.uid);
      newMemberNames[f.uid] = f.name || "";
    }
  });

  await setDoc(
    doc(db, "chats", chatId),
    { members: newMembers, memberNames: newMemberNames },
    { merge: true }
  );
}

/** Removes a member from a group. Only meant to be called by the group creator. */
export async function removeMemberFromGroup(chatId, chat, memberUid) {
  const newMembers = chat.members.filter((m) => m !== memberUid);
  const newMemberNames = { ...chat.memberNames };
  delete newMemberNames[memberUid];

  await setDoc(
    doc(db, "chats", chatId),
    { members: newMembers, memberNames: newMemberNames },
    { merge: true }
  );
}

/** Current user leaves a group themselves. */
export async function leaveGroup(chatId, chat, myUid) {
  await removeMemberFromGroup(chatId, chat, myUid);
}
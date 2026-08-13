import {
  collection,
  doc,
  addDoc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

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

/** Sends a message and bumps the chat's lastMessage/lastMessageAt preview. */
export async function sendMessage(chatId, sender, text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId: sender.uid,
    senderName: sender.displayName || "",
    text: trimmed,
    created_at: serverTimestamp(),
  });

  await setDoc(
    doc(db, "chats", chatId),
    { lastMessage: trimmed, lastMessageAt: serverTimestamp() },
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
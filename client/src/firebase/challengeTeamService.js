import {
  collection,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";

import { db, auth } from "./config";

const TEAM_COLLECTION = "challengeTeams";
const INVITE_COLLECTION = "challengeTeamInvites";
const CHALLENGE_COLLECTION = "challenges";

// ============================================================
// CURRENT USER
// ============================================================

function currentUid() {
  const uid = auth?.currentUser?.uid;

  if (!uid) {
    throw new Error("Please log in first.");
  }

  return uid;
}

// ============================================================
// HELPERS
// ============================================================

function cleanId(value) {
  return value == null ? "" : String(value);
}

function normalizeChallenge(id, data) {
  const d = data || {};

  const title =
    d.title ||
    d.name ||
    d.challengeName ||
    "Untitled Challenge";

  const description =
    d.description ||
    d.details ||
    d.desc ||
    "Complete this sustainability challenge together.";

  const target = Number(
    d.target ??
      d.goal ??
      d.targetValue ??
      d.pointsTarget ??
      d.requiredPoints ??
      1
  );

  return {
    id,
    ...d,

    title,

    description,

    category:
      d.category ||
      d.type ||
      "Sustainability",

    target:
      Number.isFinite(target) && target > 0
        ? target
        : 1,

    unit:
      d.unit ||
      d.targetUnit ||
      d.ruleUnit ||
      "progress",

    imageUrl:
      d.imageUrl ||
      d.image ||
      d.bannerUrl ||
      "",

    status:
      d.status ||
      (d.published === false
        ? "Draft"
        : "Active"),

    startDate:
      d.startDate ||
      d.start_at ||
      null,

    endDate:
      d.endDate ||
      d.end_at ||
      d.deadline ||
      null,
  };
}

function isChallengeAvailable(challenge) {
  const status = String(
    challenge?.status || ""
  ).toLowerCase();

  if (challenge?.published === false) {
    return false;
  }

  if (
    [
      "draft",
      "deleted",
      "inactive",
    ].includes(status)
  ) {
    return false;
  }

  return true;
}

// ============================================================
// GET AVAILABLE CHALLENGES
// ============================================================

export async function getAvailableChallenges() {
  const snap = await getDocs(
    collection(
      db,
      CHALLENGE_COLLECTION
    )
  );

  return snap.docs
    .map((item) =>
      normalizeChallenge(
        item.id,
        item.data()
      )
    )
    .filter(isChallengeAvailable);
}

// ============================================================
// REAL-TIME CHALLENGE LISTENER
// ============================================================

export function listenToAvailableChallenges(
  callback
) {
  return onSnapshot(
    collection(
      db,
      CHALLENGE_COLLECTION
    ),

    (snap) => {
      const challenges = snap.docs
        .map((item) =>
          normalizeChallenge(
            item.id,
            item.data()
          )
        )
        .filter(isChallengeAvailable);

      callback(challenges);
    },

    (error) => {
      console.error(
        "Challenge listener failed:",
        error
      );

      callback([]);
    }
  );
}

// ============================================================
// GET ONE CHALLENGE
// ============================================================

export async function getChallengeById(
  challengeId
) {
  if (!challengeId) {
    return null;
  }

  const snap = await getDoc(
    doc(
      db,
      CHALLENGE_COLLECTION,
      challengeId
    )
  );

  if (!snap.exists()) {
    return null;
  }

  return normalizeChallenge(
    snap.id,
    snap.data()
  );
}

// ============================================================
// MY CHALLENGE TEAMS
// ============================================================

export function listenToMyChallengeTeams(
  uid,
  callback
) {
  if (!uid) {
    return () => {};
  }

  const q = query(
    collection(
      db,
      TEAM_COLLECTION
    ),
    where(
      "memberIds",
      "array-contains",
      uid
    )
  );

  return onSnapshot(
    q,

    (snap) => {
      const teams = snap.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      );

      teams.sort((a, b) => {
        const aTime =
          a.updatedAt?.toMillis?.() ||
          a.createdAt?.toMillis?.() ||
          0;

        const bTime =
          b.updatedAt?.toMillis?.() ||
          b.createdAt?.toMillis?.() ||
          0;

        return bTime - aTime;
      });

      callback(teams);
    },

    (error) => {
      console.error(
        "Team listener failed:",
        error
      );

      callback([]);
    }
  );
}

// ============================================================
// CREATE TEMPORARY CHALLENGE TEAM
// ============================================================

export async function createChallengeTeam({
  challenge,
  teamName,
  invitedFriends = [],
}) {
  const uid = currentUid();

  if (!challenge?.id) {
    throw new Error(
      "Please select a challenge."
    );
  }

  if (
    !String(teamName || "").trim()
  ) {
    throw new Error(
      "Please enter a team name."
    );
  }

  const teamRef = doc(
    collection(
      db,
      TEAM_COLLECTION
    )
  );

  const me = auth.currentUser;

  const member = {
    uid,

    name:
      me?.displayName ||
      me?.email?.split("@")[0] ||
      "You",

    email:
      me?.email || "",

    photoURL:
      me?.photoURL || "",

    progress: 0,

    completed: false,

    joinedAt:
      serverTimestamp(),
  };

  const invitedIds =
    invitedFriends
      .map((friend) =>
        cleanId(
          friend?.uid ||
          friend?.id
        )
      )
      .filter(Boolean)
      .filter(
        (id) => id !== uid
      );

  const memberIds = [
    uid,
    ...invitedIds,
  ];

  await setDoc(teamRef, {
    teamId: teamRef.id,

    challengeId:
      challenge.id,

    challengeTitle:
      challenge.title,

    challengeTarget:
      challenge.target || 1,

    challengeUnit:
      challenge.unit ||
      "progress",

    teamName:
      String(teamName).trim(),

    createdBy: uid,

    memberIds,

    members: [member],

    status: "Active",

    completedMemberIds: [],

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),
  });

  // ==========================================================
  // CREATE FRIEND INVITATIONS
  // ==========================================================

  for (
    const friend of invitedFriends
  ) {
    const friendUid = cleanId(
      friend?.uid ||
      friend?.id
    );

    if (
      !friendUid ||
      friendUid === uid
    ) {
      continue;
    }

    const inviteRef = doc(
      collection(
        db,
        INVITE_COLLECTION
      )
    );

    await setDoc(inviteRef, {
      inviteId:
        inviteRef.id,

      teamId:
        teamRef.id,

      challengeId:
        challenge.id,

      challengeTitle:
        challenge.title,

      teamName:
        String(teamName).trim(),

      fromUid: uid,

      fromName:
        me?.displayName ||
        me?.email?.split("@")[0] ||
        "You",

      toUid:
        friendUid,

      toName:
        friend?.name ||
        friend?.displayName ||
        "",

      toEmail:
        friend?.email ||
        "",

      toProfilePhotoUrl:
        friend?.profile_photo_url ||
        "",

      status:
        "pending",

      createdAt:
        serverTimestamp(),
    });
  }

  return teamRef.id;
}

// ============================================================
// TEAM INVITATIONS
// ============================================================

export function listenToMyTeamInvites(
  uid,
  callback
) {
  if (!uid) {
    return () => {};
  }

  const q = query(
    collection(
      db,
      INVITE_COLLECTION
    ),

    where(
      "toUid",
      "==",
      uid
    ),

    where(
      "status",
      "==",
      "pending"
    )
  );

  return onSnapshot(
    q,

    (snap) => {
      callback(
        snap.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        )
      );
    },

    (error) => {
      console.error(
        "Team invite listener failed:",
        error
      );

      callback([]);
    }
  );
}

// ============================================================
// ACCEPT TEAM INVITATION
// ============================================================

export async function acceptChallengeTeamInvite(
  invite
) {
  const uid = currentUid();

  if (invite?.toUid !== uid) {
    throw new Error(
      "This invitation is not for your account."
    );
  }

  const teamRef = doc(
    db,
    TEAM_COLLECTION,
    invite.teamId
  );

  const inviteRef = doc(
    db,
    INVITE_COLLECTION,
    invite.id
  );

  const teamSnap =
    await getDoc(teamRef);

  if (!teamSnap.exists()) {
    throw new Error(
      "This challenge team no longer exists."
    );
  }

  const team =
    teamSnap.data();

  const me =
    auth.currentUser;

  if (
    team.status === "Completed"
  ) {
    throw new Error(
      "This challenge team has already completed the challenge."
    );
  }

  const alreadyMember =
    Array.isArray(
      team.memberIds
    )
      ? team.memberIds.includes(uid)
      : false;

  if (!alreadyMember) {
    const newMember = {
      uid,

      name:
        me?.displayName ||
        me?.email?.split("@")[0] ||
        invite.toName ||
        "Member",

      email:
        me?.email ||
        invite.toEmail ||
        "",

      photoURL:
        me?.photoURL ||
        invite.toProfilePhotoUrl ||
        "",

      progress: 0,

      completed: false,

      joinedAt:
        new Date(),
    };

    await updateDoc(
      teamRef,
      {
        memberIds:
          arrayUnion(uid),

        members:
          arrayUnion(newMember),

        updatedAt:
          serverTimestamp(),
      }
    );
  }

  await updateDoc(
    inviteRef,
    {
      status:
        "accepted",

      respondedAt:
        serverTimestamp(),
    }
  );
}

// ============================================================
// DECLINE TEAM INVITATION
// ============================================================

export async function declineChallengeTeamInvite(
  invite
) {
  const uid = currentUid();

  if (invite?.toUid !== uid) {
    throw new Error(
      "This invitation is not for your account."
    );
  }

  await updateDoc(
    doc(
      db,
      INVITE_COLLECTION,
      invite.id
    ),

    {
      status:
        "declined",

      respondedAt:
        serverTimestamp(),
    }
  );
}

// ============================================================
// UPDATE MY TEAM PROGRESS
// ============================================================

export async function updateMyTeamProgress(
  teamId,
  progress
) {
  const uid = currentUid();

  const safeProgress =
    Math.max(
      0,
      Number(progress) || 0
    );

  const teamRef = doc(
    db,
    TEAM_COLLECTION,
    teamId
  );

  const snap =
    await getDoc(teamRef);

  if (!snap.exists()) {
    throw new Error(
      "Challenge team not found."
    );
  }

  const team =
    snap.data();

  if (
    !team.memberIds?.includes(uid)
  ) {
    throw new Error(
      "You are not a member of this team."
    );
  }

  if (
    team.status === "Completed"
  ) {
    return {
      completed: true,
      teamCompleted: true,
    };
  }

  const members =
    Array.isArray(team.members)
      ? [...team.members]
      : [];

  const target =
    Math.max(
      Number(
        team.challengeTarget
      ) || 1,
      1
    );

  const nextMembers =
    members.map((member) => {
      if (member.uid !== uid) {
        return member;
      }

      return {
        ...member,

        progress:
          safeProgress,

        completed:
          safeProgress >= target,
      };
    });

  const completedMemberIds =
    nextMembers
      .filter(
        (member) =>
          member.completed === true
      )
      .map(
        (member) =>
          member.uid
      );

  const allCompleted =
    nextMembers.length > 0 &&
    nextMembers.every(
      (member) =>
        member.completed === true
    );

  await updateDoc(
    teamRef,
    {
      members:
        nextMembers,

      completedMemberIds,

      status:
        allCompleted
          ? "Completed"
          : "Active",

      completedAt:
        allCompleted
          ? serverTimestamp()
          : null,

      updatedAt:
        serverTimestamp(),
    }
  );

  return {
    completed:
      nextMembers.some(
        (member) =>
          member.uid === uid &&
          member.completed === true
      ),

    teamCompleted:
      allCompleted,
  };
}

// ============================================================
// LEAVE TEAM
// ============================================================

export async function leaveChallengeTeam(
  teamId
) {
  const uid = currentUid();

  const teamRef = doc(
    db,
    TEAM_COLLECTION,
    teamId
  );

  const snap =
    await getDoc(teamRef);

  if (!snap.exists()) {
    return;
  }

  const team =
    snap.data();

  if (
    team.createdBy === uid
  ) {
    throw new Error(
      "The team creator cannot leave the team. Delete the team instead."
    );
  }

  const nextMembers =
    (team.members || [])
      .filter(
        (member) =>
          member.uid !== uid
      );

  const nextMemberIds =
    (team.memberIds || [])
      .filter(
        (memberId) =>
          memberId !== uid
      );

  await updateDoc(
    teamRef,
    {
      members:
        nextMembers,

      memberIds:
        nextMemberIds,

      completedMemberIds:
        (
          team.completedMemberIds ||
          []
        ).filter(
          (id) =>
            id !== uid
        ),

      updatedAt:
        serverTimestamp(),
    }
  );
}

// ============================================================
// DELETE TEAM
// ============================================================

export async function deleteChallengeTeam(
  teamId
) {
  const uid = currentUid();

  const teamRef = doc(
    db,
    TEAM_COLLECTION,
    teamId
  );

  const snap =
    await getDoc(teamRef);

  if (!snap.exists()) {
    return;
  }

  if (
    snap.data().createdBy !== uid
  ) {
    throw new Error(
      "Only the team creator can delete this team."
    );
  }

  await deleteDoc(teamRef);
}

// ============================================================
// GET ONE TEAM
// ============================================================

export async function getChallengeTeam(
  teamId
) {
  if (!teamId) {
    return null;
  }

  const snap =
    await getDoc(
      doc(
        db,
        TEAM_COLLECTION,
        teamId
      )
    );

  return snap.exists()
    ? {
        id: snap.id,
        ...snap.data(),
      }
    : null;
}
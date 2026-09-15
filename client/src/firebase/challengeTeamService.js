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
  Timestamp,
  arrayUnion,
  increment,
  runTransaction,
  addDoc,
} from "firebase/firestore";

import { db, auth } from "./config";
import { uploadToCloudinary } from "./cloudinaryService";
import {
  awardAchievement,
  checkAchievementsAfterProgressChange,
} from "./achievementService";

const TEAM_COLLECTION = "challengeTeams";
const INVITE_COLLECTION = "challengeTeamInvites";
const CHALLENGE_COLLECTION = "challenges";
const NOTIFICATION_COLLECTION = "notifications";
const INVITATION_EXPIRY_HOURS = 12;
const INVITATION_EXPIRY_MS = INVITATION_EXPIRY_HOURS * 60 * 60 * 1000;

export const CHALLENGE_MODE = {
  TEAM: "team",
  PARTNER: "partner",
};

export const TEAM_REQUIREMENT_TYPES = [
  "photo",
  "location",
];

export const TEAM_STATUS = {
  WAITING: "WaitingForMembers",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ENDED: "Ended",
};

function currentUid() {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error("Please log in first.");
  return uid;
}

function cleanId(value) {
  return value == null ? "" : String(value);
}

function toDate(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeRequirementType(value) {
  const type = String(value || "").toLowerCase().trim();

  if (
    type === "location" ||
    type === "gps" ||
    type === "geolocation"
  ) {
    return "location";
  }

  return "photo";
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

  const requirementType = normalizeRequirementType(
    d.requirementType ??
      d.teamRequirementType ??
      d.teamRequirement?.type
  );

  const requirementDescription =
    d.requirementDescription ||
    d.teamRequirementDescription ||
    d.teamRequirement?.description ||
    (requirementType === "location"
      ? "Allow GreenTrip to access your location to verify your participation."
      : "Take and submit a photo as proof that you completed the challenge.");

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
      (d.published === false ? "Draft" : "Active"),
    startDate:
      d.startDate ||
      d.start_at ||
      null,
    endDate:
      d.endDate ||
      d.end_at ||
      d.deadline ||
      null,
    requirementType,
    requirementDescription,
  };
}

function isChallengeAvailable(challenge) {
  const status = String(challenge?.status || "").toLowerCase();

  if (challenge?.published === false) return false;

  if (
    ["draft", "deleted", "inactive"].includes(status)
  ) {
    return false;
  }

  const end = toDate(challenge?.endDate);
  if (end && end.getTime() < Date.now()) return false;

  return true;
}

function isTeamMember(team, uid) {
  return Boolean(
    uid &&
      Array.isArray(team?.memberIds) &&
      team.memberIds.includes(uid)
  );
}

function acceptedMembers(team) {
  return Array.isArray(team?.members)
    ? team.members.filter((member) => member?.uid)
    : [];
}

function isTeamStarted(team) {
  return team?.status === TEAM_STATUS.ACTIVE;
}

function isTeamFinished(team) {
  return (
    team?.status === TEAM_STATUS.COMPLETED ||
    team?.status === TEAM_STATUS.ENDED
  );
}

function hasRequirementCompleted(member) {
  return (
    member?.completed === true ||
    member?.requirementStatus === "completed"
  );
}

function getChallengeEndDate(team) {
  return toDate(
    team?.challengeEndDate ||
      team?.endDate
  );
}

function getInviteExpiryDate(invite) {
  if (invite?.expiresAt) {
    return toDate(invite.expiresAt);
  }

  const createdAt = toDate(invite?.createdAt);
  return createdAt
    ? new Date(createdAt.getTime() + INVITATION_EXPIRY_MS)
    : null;
}

function isInviteExpired(invite) {
  const expiresAt = getInviteExpiryDate(invite);
  return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
}

async function createNotification(
  uid,
  {
    title,
    message,
    type = "challenge",
    teamId = "",
    challengeId = "",
  }
) {
  if (!uid) return null;

  const notificationRef = doc(
    collection(
      db,
      "users",
      uid,
      NOTIFICATION_COLLECTION
    )
  );

  await setDoc(notificationRef, {
    notificationId: notificationRef.id,
    userId: uid,
    fromUid: auth?.currentUser?.uid || "",
    title: title || "GreenTrip Notification",
    message: message || "",
    type,
    teamId,
    challengeId,
    isRead: false,
    createdAt: serverTimestamp(),
  });

  return notificationRef.id;
}

async function processMemberAchievement(team, memberUid) {
  if (!team?.id || !memberUid) {
    return { processed: false, newlyAwarded: [] };
  }

  if (!hasRequirementCompleted(
    acceptedMembers(team).find(
      (member) => member.uid === memberUid
    )
  )) {
    return { processed: false, newlyAwarded: [] };
  }

  const teamRef = doc(
    db,
    TEAM_COLLECTION,
    team.id
  );

  const userRef = doc(
    db,
    "users",
    memberUid
  );

  let shouldProcess = false;

  await runTransaction(
    db,
    async (transaction) => {
      const [teamSnap, userSnap] = await Promise.all([
        transaction.get(teamRef),
        transaction.get(userRef),
      ]);

      if (!teamSnap.exists()) return;

      const currentTeam = teamSnap.data();

      if (!isTeamFinished(currentTeam)) return;

      const alreadyProcessed =
        Array.isArray(
          currentTeam.achievementProcessedMemberIds
        ) &&
        currentTeam.achievementProcessedMemberIds.includes(
          memberUid
        );

      if (alreadyProcessed) return;

      const currentMember =
        acceptedMembers(currentTeam).find(
          (member) => member.uid === memberUid
        );

      if (!hasRequirementCompleted(currentMember)) {
        return;
      }

      transaction.update(teamRef, {
        achievementProcessedMemberIds:
          arrayUnion(memberUid),
        updatedAt: serverTimestamp(),
      });

      const currentCount = Number(
        userSnap.exists()
          ? userSnap.data()?.challenges_completed || 0
          : 0
      );

      transaction.set(
        userRef,
        {
          challenges_completed: currentCount + 1,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      shouldProcess = true;
    }
  );

  if (!shouldProcess) {
    return { processed: false, newlyAwarded: [] };
  }

  try {
    const newlyAwarded = [];

    if (team.challengeAchievementId) {
      const achievementSnap = await getDoc(
        doc(
          db,
          "achievements",
          team.challengeAchievementId
        )
      );

      if (achievementSnap.exists()) {
        const achievement = {
          id: achievementSnap.id,
          ...achievementSnap.data(),
        };

        if (achievement.status === "published") {
          const awardResult = await awardAchievement(
            memberUid,
            achievement
          );

          if (awardResult?.awarded === true) {
            newlyAwarded.push(achievement);
          }
        }
      }
    }

    const result =
      await checkAchievementsAfterProgressChange(
        memberUid
      );

    const genericAwards =
      result?.newlyAwarded || [];

    genericAwards.forEach((achievement) => {
      if (
        !newlyAwarded.some(
          (item) => item.id === achievement.id
        )
      ) {
        newlyAwarded.push(achievement);
      }
    });

    return {
      processed: true,
      newlyAwarded,
    };
  } catch (error) {
    console.error(
      "Challenge achievement check failed:",
      error
    );

    return {
      processed: true,
      newlyAwarded: [],
    };
  }
}

// ============================================================
// CHALLENGES
// ============================================================

export async function getAvailableChallenges() {
  const snap = await getDocs(
    collection(db, CHALLENGE_COLLECTION)
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

export function listenToAvailableChallenges(
  callback
) {
  return onSnapshot(
    collection(db, CHALLENGE_COLLECTION),
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

export async function getChallengeById(
  challengeId
) {
  if (!challengeId) return null;

  const snap = await getDoc(
    doc(
      db,
      CHALLENGE_COLLECTION,
      challengeId
    )
  );

  if (!snap.exists()) return null;

  return normalizeChallenge(
    snap.id,
    snap.data()
  );
}

// ============================================================
// MY TEAMS
// ============================================================

export function listenToMyChallengeTeams(
  uid,
  callback
) {
  if (!uid) return () => {};

  const q = query(
    collection(db, TEAM_COLLECTION),
    where(
      "memberIds",
      "array-contains",
      uid
    )
  );

  return onSnapshot(
    q,
    (snap) => {
      const teams = snap.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .sort((a, b) => {
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
// CREATE TEAM
// ============================================================
// Display name saved on discoverable teams.
function fromNameForTeam(user) {
  return (
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "GreenTrip User"
  );
}


export async function createChallengeTeam({
  challenge,
  teamName,
  invitedFriends = [],
  mode = CHALLENGE_MODE.TEAM,
  teamState = "",
}) {

  const uid = currentUid();

  if (!challenge?.id) {
    throw new Error(
      "Please select a challenge first."
    );
  }

  if (!String(teamName || "").trim()) {
    throw new Error(
      "Please enter a team name."
    );
  }

  const challengeMode =
    mode === CHALLENGE_MODE.PARTNER
      ? CHALLENGE_MODE.PARTNER
      : CHALLENGE_MODE.TEAM;

  const uniqueInvitedFriends =
    (Array.isArray(invitedFriends)
      ? invitedFriends
      : []
    )
      .map((friend) => ({
        ...friend,
        uid: cleanId(
          friend?.uid ||
            friend?.id
        ),
      }))
      .filter(
        (friend) =>
          friend.uid &&
          friend.uid !== uid
      )
      .filter(
        (friend, index, array) =>
          array.findIndex(
            (item) =>
              item.uid === friend.uid
          ) === index
      );

  // Create Team can be public: the creator may invite friends directly
  // or leave the team open so other users can request to join.
  // Challenge Partner remains invite-only and requires exactly one friend.
  if (
    challengeMode === CHALLENGE_MODE.PARTNER &&
    uniqueInvitedFriends.length !== 1
  ) {
    throw new Error(
      "A Challenge Partner invitation can include only one friend."
    );
  }

  if (
    challengeMode === CHALLENGE_MODE.TEAM &&
    uniqueInvitedFriends.length < 2
  ) {
    throw new Error(
      "A Create Team challenge requires at least 2 invited friends."
    );
  }

  const freshChallenge =
    await getChallengeById(
      challenge.id
    );

  const selectedChallenge =
    freshChallenge || challenge;

  const teamRef = doc(
    collection(db, TEAM_COLLECTION)
  );

  const me = auth.currentUser;
  const creatorName = fromNameForTeam(me);

  const creatorMember = {
    uid,
    name:
      me?.displayName ||
      me?.email?.split("@")[0] ||
      "You",
    email: me?.email || "",
    photoURL: me?.photoURL || "",
    progress: 0,
    completed: false,
    requirementStatus: "pending",
    proof: null,
    joinedAt: new Date(),
  };

  // IMPORTANT:
  // Only the creator is a member at creation time.
  // Invited friends are NOT inserted into memberIds until
  // they explicitly accept the invitation.
  await setDoc(teamRef, {
    teamId: teamRef.id,
    challengeId: selectedChallenge.id,
    challengeTitle:
      selectedChallenge.title,
    challengeDescription:
      selectedChallenge.description || "",
    challengeTarget:
      selectedChallenge.target || 1,
    challengeUnit:
      selectedChallenge.unit || "progress",
    requirementType:
      selectedChallenge.requirementType ||
      "photo",
    requirementDescription:
      selectedChallenge.requirementDescription ||
      "Take and submit a photo as proof that you completed the challenge.",
    challengeEndDate:
      selectedChallenge.endDate || null,
    challengeAchievementId:
      selectedChallenge.challengeAchievementId ||
      selectedChallenge.achievementId ||
      "",
    teamName:
      String(teamName).trim(),
    teamState: String(teamState || "").trim(),
    creatorName,
    challengeMode,
    isDiscoverable: challengeMode === CHALLENGE_MODE.TEAM,
    createdBy: uid,

    memberIds: [uid],
    members: [creatorMember],

    invitedFriendIds:
      uniqueInvitedFriends.map(
        (friend) => friend.uid
      ),

    status: TEAM_STATUS.WAITING,

    startedAt: null,
    completedAt: null,
    endedAt: null,

    completedMemberIds: [],
    achievementProcessedMemberIds: [],
    endNotificationSentTo: [],

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const fromName = creatorName;

  for (
    const friend of uniqueInvitedFriends
  ) {
    const inviteRef = doc(
      collection(
        db,
        INVITE_COLLECTION
      )
    );

    await setDoc(inviteRef, {
      inviteId: inviteRef.id,
      teamId: teamRef.id,
      challengeId:
        selectedChallenge.id,
      challengeTitle:
        selectedChallenge.title,
      teamName:
        String(teamName).trim(),
      teamState: String(teamState || "").trim(),
      challengeMode,

      fromUid: uid,
      fromName,

      toUid: friend.uid,
      toName:
        friend?.name ||
        friend?.displayName ||
        "",
      toEmail:
        friend?.email || "",
      toProfilePhotoUrl:
        friend?.profile_photo_url ||
        friend?.profilePhotoUrl ||
        friend?.photoURL ||
        "",

      status: "pending",
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + INVITATION_EXPIRY_MS),
    });

    await createNotification(
      friend.uid,
      {
        title:
          challengeMode === CHALLENGE_MODE.PARTNER
            ? "Challenge Partner Invitation"
            : "Challenge Team Invitation",
        message:
          challengeMode === CHALLENGE_MODE.PARTNER
            ? `${fromName} invited you to be their challenge partner for "${selectedChallenge.title}".`
            : `${fromName} invited you to join "${String(
                teamName
              ).trim()}" for the challenge "${selectedChallenge.title}".`,
        type:
          challengeMode === CHALLENGE_MODE.PARTNER
            ? "challenge-partner-invite"
            : "challenge-team-invite",
        teamId: teamRef.id,
        challengeId:
          selectedChallenge.id,
      }
    );
  }

  return teamRef.id;
}

// ============================================================
// INVITATIONS
// ============================================================

export async function expireChallengeTeamInvite(invite) {
  if (!invite?.id || invite.status !== "pending") return false;

  if (!isInviteExpired(invite)) return false;

  const inviteRef = doc(db, INVITE_COLLECTION, invite.id);
  let didExpire = false;
  let currentInvite = null;

  await runTransaction(db, async (transaction) => {
    const inviteSnap = await transaction.get(inviteRef);

    if (!inviteSnap.exists()) return;

    const current = {
      id: inviteSnap.id,
      ...inviteSnap.data(),
    };

    if (current.status !== "pending") return;
    if (!isInviteExpired(current)) return;

    transaction.update(inviteRef, {
      status: "expired",
      respondedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    didExpire = true;
    currentInvite = current;
  });

  // Only the client that successfully changed pending -> expired
  // sends the notifications. This prevents duplicate notifications
  // if both sender and recipient have the page open.
  if (!didExpire) return false;

  const effectiveInvite = currentInvite || invite;

  await createNotification(effectiveInvite.toUid, {
    title: "Challenge Invitation Expired",
    message: `Your invitation to join "${effectiveInvite.teamName || "the challenge team"}" has expired because it was not accepted within ${INVITATION_EXPIRY_HOURS} hours.`,
    type: "challenge-team-invite-expired",
    teamId: effectiveInvite.teamId || "",
    challengeId: effectiveInvite.challengeId || "",
  });

  if (effectiveInvite.fromUid) {
    await createNotification(effectiveInvite.fromUid, {
      title: "Challenge Invitation Expired",
      message: `${effectiveInvite.toName || "A friend"} did not accept the invitation to "${effectiveInvite.teamName || "your team"}" within ${INVITATION_EXPIRY_HOURS} hours. You can invite another friend.`,
      type: "challenge-team-invite-expired-creator",
      teamId: effectiveInvite.teamId || "",
      challengeId: effectiveInvite.challengeId || "",
    });
  }

  return true;
}

export async function expirePendingChallengeTeamInvites(uid) {
  if (!uid) return 0;

  const q = query(
    collection(db, INVITE_COLLECTION),
    where("toUid", "==", uid),
    where("status", "==", "pending")
  );

  const snap = await getDocs(q);
  let expiredCount = 0;

  for (const inviteDoc of snap.docs) {
    const invite = { id: inviteDoc.id, ...inviteDoc.data() };
    if (await expireChallengeTeamInvite(invite)) {
      expiredCount += 1;
    }
  }

  return expiredCount;
}

export function listenToMyTeamInvites(uid, callback) {
  if (!uid) return () => {};

  const q = query(
    collection(db, INVITE_COLLECTION),
    where("toUid", "==", uid),
    where("status", "==", "pending")
  );

  return onSnapshot(
    q,
    async (snap) => {
      const rawInvites = snap.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      const activeInvites = [];

      for (const invite of rawInvites) {
        if (isInviteExpired(invite)) {
          try {
            await expireChallengeTeamInvite(invite);
          } catch (error) {
            console.error("Failed to expire challenge invitation:", error);
          }
          continue;
        }
        activeInvites.push(invite);
      }

      callback(activeInvites);
    },
    (error) => {
      console.error("Team invite listener failed:", error);
      callback([]);
    }
  );
}

export function listenToMySentTeamInvites(uid, callback) {
  if (!uid) return () => {};

  const q = query(
    collection(db, INVITE_COLLECTION),
    where("fromUid", "==", uid)
  );

  return onSnapshot(
    q,
    async (snap) => {
      const pendingInvites = snap.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((invite) => invite.status === "pending");

      const activeInvites = [];
      for (const invite of pendingInvites) {
        if (isInviteExpired(invite)) {
          try {
            await expireChallengeTeamInvite(invite);
          } catch (error) {
            console.error("Failed to expire sent challenge invitation:", error);
          }
          continue;
        }
        activeInvites.push(invite);
      }

      callback(activeInvites);
    },
    (error) => {
      console.error("Sent team invite listener failed:", error);
      callback([]);
    }
  );
}

export async function cancelChallengeTeamInvite(invite) {
  const uid = currentUid();

  if (!invite?.id) {
    throw new Error("Invitation not found.");
  }

  if (invite.fromUid !== uid) {
    throw new Error("Only the team creator can cancel this invitation.");
  }

  const inviteRef = doc(db, INVITE_COLLECTION, invite.id);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) {
    throw new Error("This invitation no longer exists.");
  }

  const inviteData = inviteSnap.data();

  if (inviteData.fromUid !== uid) {
    throw new Error("Only the team creator can cancel this invitation.");
  }

  if (inviteData.status !== "pending") {
    throw new Error("Only a pending invitation can be cancelled.");
  }

  if (isInviteExpired({ id: invite.id, ...inviteData })) {
    await updateDoc(inviteRef, {
      status: "expired",
      respondedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    throw new Error("This invitation has already expired.");
  }

  await updateDoc(inviteRef, {
    status: "cancelled",
    respondedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await createNotification(inviteData.toUid, {
    title: "Challenge Invitation Cancelled",
    message: `${inviteData.fromName || "The team creator"} cancelled your invitation to join "${inviteData.teamName || "the challenge team"}".`,
    type: "challenge-team-invite-cancelled",
    teamId: inviteData.teamId || "",
    challengeId: inviteData.challengeId || "",
  });
}

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

  const me = auth.currentUser;
  let invitationExpiredDuringTransaction = false;

  await runTransaction(
    db,
    async (transaction) => {
      const [
        teamSnap,
        inviteSnap,
      ] = await Promise.all([
        transaction.get(teamRef),
        transaction.get(inviteRef),
      ]);

      if (!teamSnap.exists()) {
        throw new Error(
          "This invitation's team has been deleted. You can no longer join this team."
        );
      }

      if (!inviteSnap.exists()) {
        throw new Error(
          "This invitation no longer exists."
        );
      }

      const team = teamSnap.data();
      const inviteData =
        inviteSnap.data();

      if (inviteData.teamId !== invite.teamId) {
        throw new Error(
          "This invitation is linked to a different team."
        );
      }

      if (
        !Array.isArray(team.invitedFriendIds) ||
        !team.invitedFriendIds.includes(uid)
      ) {
        throw new Error(
          "You are not listed as an invited member of this team."
        );
      }

      if (
        inviteData.toUid !== uid
      ) {
        throw new Error(
          "This invitation is not for your account."
        );
      }

      if (
        inviteData.status !==
        "pending"
      ) {
        throw new Error(
          "This invitation has already been answered."
        );
      }

      if (isInviteExpired({ id: invite.id, ...inviteData })) {
        transaction.update(inviteRef, {
          status: "expired",
          respondedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        invitationExpiredDuringTransaction = true;
        return;
      }

      if (
        isTeamFinished(team)
      ) {
        throw new Error(
          "This challenge team has already ended."
        );
      }

      const endDate =
        getChallengeEndDate(team);

      if (
        endDate &&
        endDate.getTime() <=
          Date.now()
      ) {
        throw new Error(
          "This challenge has already ended."
        );
      }

      const alreadyMember =
        Array.isArray(
          team.memberIds
        ) &&
        team.memberIds.includes(uid);

      if (!alreadyMember) {
        const newMember = {
          uid,
          name:
            me?.displayName ||
            me?.email?.split("@")[0] ||
            inviteData.toName ||
            "Member",
          email:
            me?.email ||
            inviteData.toEmail ||
            "",
          photoURL:
            me?.photoURL ||
            inviteData.toProfilePhotoUrl ||
            "",
          progress: 0,
          completed: false,
          requirementStatus:
            "pending",
          proof: null,
          joinedAt: new Date(),
        };

        transaction.update(
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

      transaction.update(
        inviteRef,
        {
          status: "accepted",
          respondedAt:
            serverTimestamp(),
        }
      );
    }
  );

  if (invitationExpiredDuringTransaction) {
    await createNotification(uid, {
      title: "Challenge Invitation Expired",
      message: `Your invitation to join "${invite.teamName || "the challenge team"}" has expired because it was not accepted within ${INVITATION_EXPIRY_HOURS} hours.`,
      type: "challenge-team-invite-expired",
      teamId: invite.teamId || "",
      challengeId: invite.challengeId || "",
    });

    if (invite.fromUid) {
      await createNotification(invite.fromUid, {
        title: "Challenge Invitation Expired",
        message: `${invite.toName || "A friend"} did not accept the invitation to "${invite.teamName || "your team"}" within ${INVITATION_EXPIRY_HOURS} hours. You can invite another friend.`,
        type: "challenge-team-invite-expired-creator",
        teamId: invite.teamId || "",
        challengeId: invite.challengeId || "",
      });
    }

    throw new Error(
      `This invitation has expired after ${INVITATION_EXPIRY_HOURS} hours.`
    );
  }

  // Tell the creator that the friend accepted.
  try {
    const team = await getChallengeTeam(
      invite.teamId
    );

    if (team?.createdBy) {
      const memberName =
        me?.displayName ||
        me?.email?.split("@")[0] ||
        invite.toName ||
        "A friend";

      await createNotification(
        team.createdBy,
        {
          title:
            "Team Invitation Accepted",
          message:
            `${memberName} accepted your invitation to "${team.teamName}".`,
          type:
            "challenge-team-accepted",
          teamId:
            invite.teamId,
          challengeId:
            invite.challengeId || "",
        }
      );
    }
  } catch (error) {
    console.warn(
      "Could not create acceptance notification:",
      error
    );
  }
}

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
      status: "declined",
      respondedAt:
        serverTimestamp(),
    }
  );
}

// ============================================================
// START TEAM CHALLENGE
// ============================================================

export async function startChallengeTeam(
  teamId
) {
  const uid = currentUid();

  const teamRef = doc(
    db,
    TEAM_COLLECTION,
    teamId
  );

  let startedTeam = null;

  await runTransaction(
    db,
    async (transaction) => {
      const snap =
        await transaction.get(teamRef);

      if (!snap.exists()) {
        throw new Error(
          "Challenge team not found."
        );
      }

      const team = snap.data();

      if (team.createdBy !== uid) {
        throw new Error(
          "Only the team creator can start the challenge."
        );
      }

      if (
        team.status !==
        TEAM_STATUS.WAITING
      ) {
        if (
          team.status ===
          TEAM_STATUS.ACTIVE
        ) {
          return;
        }

        throw new Error(
          "This team can no longer be started."
        );
      }

      const invitedCount = Array.isArray(team.invitedFriendIds)
        ? team.invitedFriendIds.length
        : 0;
      const requiredInviteCount =
        team.challengeMode === CHALLENGE_MODE.PARTNER ? 1 : 2;

      if (invitedCount < requiredInviteCount) {
        throw new Error(
          team.challengeMode === CHALLENGE_MODE.PARTNER
            ? "Select exactly 1 challenge partner before starting."
            : "Select at least 2 friends to invite before starting the team challenge."
        );
      }

      const endDate =
        getChallengeEndDate(team);

      if (
        endDate &&
        endDate.getTime() <=
          Date.now()
      ) {
        throw new Error(
          "This challenge has already ended."
        );
      }

      transaction.update(
        teamRef,
        {
          status:
            TEAM_STATUS.ACTIVE,
          startedAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        }
      );

      startedTeam = {
        ...team,
        id: teamId,
        status:
          TEAM_STATUS.ACTIVE,
      };
    }
  );

  return {
    started: true,
    team: startedTeam,
  };
}

// ============================================================
// SUBMIT PHOTO / GPS REQUIREMENT
// ============================================================

export async function submitChallengeRequirement(
  teamId,
  proof
) {
  const uid = currentUid();

  const teamRef = doc(
    db,
    TEAM_COLLECTION,
    teamId
  );

  const teamSnap =
    await getDoc(teamRef);

  if (!teamSnap.exists()) {
    throw new Error(
      "Challenge team not found."
    );
  }

  const team = teamSnap.data();

  if (!isTeamMember(team, uid)) {
    throw new Error(
      "You are not a member of this team."
    );
  }

  if (!isTeamStarted(team)) {
    throw new Error(
      "The challenge has not started yet."
    );
  }

  if (isTeamFinished(team)) {
    throw new Error(
      "This challenge has already ended."
    );
  }

  const endDate =
    getChallengeEndDate(team);

  if (
    endDate &&
    endDate.getTime() <=
      Date.now()
  ) {
    await endChallengeTeam(teamId);

    throw new Error(
      "This challenge has ended."
    );
  }

  const requirementType =
    normalizeRequirementType(
      team.requirementType
    );

  let proofData;

  if (
    requirementType === "photo"
  ) {
    if (!proof?.file) {
      throw new Error(
        "Please take or select a photo as proof."
      );
    }

    const media =
      await uploadToCloudinary(
        proof.file,
        `greentrip/challenges/${team.challengeId}/${teamId}`
      );

    if (
      media?.mediaType !==
      "image"
    ) {
      throw new Error(
        "Only an image can be used as challenge proof."
      );
    }

    proofData = {
      type: "photo",
      url: media.url,
      publicId:
        media.publicId || "",
      submittedAt:
        new Date(),
    };
  } else {
    const latitude =
      Number(proof?.latitude);
    const longitude =
      Number(proof?.longitude);
    const accuracy =
      Number(proof?.accuracy);

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new Error(
        "Your location could not be verified. Please allow location access and try again."
      );
    }

    proofData = {
      type: "location",
      latitude,
      longitude,
      accuracy:
        Number.isFinite(accuracy)
          ? accuracy
          : null,
      submittedAt:
        new Date(),
    };
  }

  let result = null;

  await runTransaction(
    db,
    async (transaction) => {
      const freshSnap =
        await transaction.get(
          teamRef
        );

      if (!freshSnap.exists()) {
        throw new Error(
          "Challenge team not found."
        );
      }

      const freshTeam =
        freshSnap.data();

      if (
        !isTeamMember(
          freshTeam,
          uid
        )
      ) {
        throw new Error(
          "You are not a member of this team."
        );
      }

      if (
        freshTeam.status !==
        TEAM_STATUS.ACTIVE
      ) {
        throw new Error(
          "The challenge is no longer active."
        );
      }

      const members =
        acceptedMembers(
          freshTeam
        );

      const currentMember =
        members.find(
          (member) =>
            member.uid === uid
        );

      if (
        hasRequirementCompleted(
          currentMember
        )
      ) {
        result = {
          alreadyCompleted: true,
          teamCompleted:
            freshTeam.status ===
            TEAM_STATUS.COMPLETED,
        };
        return;
      }

      const nextMembers =
        members.map(
          (member) =>
            member.uid === uid
              ? {
                  ...member,
                  progress: 100,
                  completed: true,
                  requirementStatus:
                    "completed",
                  proof: proofData,
                }
              : member
        );

      const allCompleted =
        nextMembers.length >= 2 &&
        nextMembers.every(
          (member) =>
            hasRequirementCompleted(
              member
            )
        );

      transaction.update(
        teamRef,
        {
          members:
            nextMembers,
          completedMemberIds:
            nextMembers
              .filter(
                (member) =>
                  hasRequirementCompleted(
                    member
                  )
              )
              .map(
                (member) =>
                  member.uid
              ),
          status: allCompleted
            ? TEAM_STATUS.COMPLETED
            : TEAM_STATUS.ACTIVE,
          completedAt:
            allCompleted
              ? serverTimestamp()
              : null,
          updatedAt:
            serverTimestamp(),
        }
      );

      result = {
        alreadyCompleted: false,
        memberCompleted: true,
        teamCompleted:
          allCompleted,
        completedMemberIds:
          nextMembers
            .filter(
              (member) =>
                hasRequirementCompleted(
                  member
                )
            )
            .map(
              (member) =>
                member.uid
            ),
      };
    }
  );

  const latestTeam =
    await getChallengeTeam(
      teamId
    );

  if (
    latestTeam &&
    latestTeam.status ===
      TEAM_STATUS.COMPLETED
  ) {
    for (
      const member of
        acceptedMembers(
          latestTeam
        )
    ) {
      await processMemberAchievement(
        latestTeam,
        member.uid
      );
    }
  }

  return {
    ...result,
    team:
      latestTeam || null,
  };
}

// ============================================================
// END EXPIRED TEAM
// ============================================================

export async function endChallengeTeam(
  teamId
) {
  const uid = currentUid();

  const teamRef = doc(
    db,
    TEAM_COLLECTION,
    teamId
  );

  let ended = false;

  await runTransaction(
    db,
    async (transaction) => {
      const snap =
        await transaction.get(
          teamRef
        );

      if (!snap.exists()) {
        return;
      }

      const team = snap.data();

      if (
        !isTeamMember(
          team,
          uid
        )
      ) {
        throw new Error(
          "You are not a member of this team."
        );
      }

      if (
        team.status ===
        TEAM_STATUS.COMPLETED ||
        team.status ===
        TEAM_STATUS.ENDED
      ) {
        return;
      }

      const endDate =
        getChallengeEndDate(team);

      if (
        !endDate ||
        endDate.getTime() >
          Date.now()
      ) {
        return;
      }

      const members =
        acceptedMembers(team);

      const completedIds =
        members
          .filter(
            (member) =>
              hasRequirementCompleted(
                member
              )
          )
          .map(
            (member) =>
              member.uid
          );

      transaction.update(
        teamRef,
        {
          status:
            TEAM_STATUS.ENDED,
          completedMemberIds:
            completedIds,
          endedAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        }
      );

      ended = true;
    }
  );

  if (!ended) {
    return {
      ended: false,
      team:
        await getChallengeTeam(
          teamId
        ),
    };
  }

  const latestTeam =
    await getChallengeTeam(
      teamId
    );

  if (!latestTeam) {
    return {
      ended: true,
      team: null,
    };
  }

  // Award achievements only to members who actually
  // satisfied the requirement.
  for (
    const member of
      acceptedMembers(
        latestTeam
      )
  ) {
    if (
      hasRequirementCompleted(
        member
      )
    ) {
      await processMemberAchievement(
        latestTeam,
        member.uid
      );
    }
  }

  // Everyone who did NOT complete receives a persistent
  // "challenge ended" notification.
  for (
    const member of
      acceptedMembers(
        latestTeam
      )
  ) {
    if (
      hasRequirementCompleted(
        member
      )
    ) {
      continue;
    }

    const alreadyNotified =
      Array.isArray(
        latestTeam.endNotificationSentTo
      ) &&
      latestTeam.endNotificationSentTo.includes(
        member.uid
      );

    if (
      alreadyNotified
    ) {
      continue;
    }

    await createNotification(
      member.uid,
      {
        title:
          "Challenge Ended",
        message:
          `The challenge "${latestTeam.challengeTitle}" has ended. You did not complete the required ${latestTeam.requirementType === "location" ? "location verification" : "photo proof"}, so no challenge achievement was awarded.`,
        type:
          "challenge-ended",
        teamId:
          teamId,
        challengeId:
          latestTeam.challengeId ||
          "",
      }
    );

    try {
      await updateDoc(
        teamRef,
        {
          endNotificationSentTo:
            arrayUnion(
              member.uid
            ),
          updatedAt:
            serverTimestamp(),
        }
      );
    } catch (error) {
      console.warn(
        "Could not mark challenge notification as sent:",
        error
      );
    }
  }

  return {
    ended: true,
    team:
      await getChallengeTeam(
        teamId
      ),
  };
}

// ============================================================
// CHECK TEAM DEADLINE
// ============================================================

export async function checkChallengeTeamDeadline(
  teamId
) {
  const team =
    await getChallengeTeam(
      teamId
    );

  if (!team) return null;

  const endDate =
    getChallengeEndDate(team);

  if (
    endDate &&
    endDate.getTime() <=
      Date.now() &&
    !isTeamFinished(team)
  ) {
    const result =
      await endChallengeTeam(
        teamId
      );

    return (
      result?.team || null
    );
  }

  return team;
}

// ============================================================
// LEGACY MANUAL PROGRESS
// ============================================================
// Kept for compatibility with older imports.
// New UI should use submitChallengeRequirement().

export async function updateMyTeamProgress(
  teamId,
  progress
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
    throw new Error(
      "Challenge team not found."
    );
  }

  const team = snap.data();

  if (!isTeamMember(team, uid)) {
    throw new Error(
      "You are not a member of this team."
    );
  }

  throw new Error(
    "Manual progress is disabled. Complete the challenge requirement using the proof button."
  );
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

  if (!snap.exists()) return;

  const team = snap.data();

  if (team.createdBy === uid) {
    throw new Error(
      "The team creator cannot leave the team. Delete the team instead."
    );
  }

  if (
    team.status ===
      TEAM_STATUS.COMPLETED ||
    team.status ===
      TEAM_STATUS.ENDED
  ) {
    throw new Error(
      "You cannot leave a finished challenge team."
    );
  }

  const nextMembers =
    (team.members || []).filter(
      (member) =>
        member.uid !== uid
    );

  const nextMemberIds =
    (team.memberIds || []).filter(
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
// FIND TEAM / JOIN REQUESTS
// ============================================================

export const MALAYSIA_STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Penang",
  "Perak",
  "Perlis",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "Kuala Lumpur",
  "Labuan",
  "Putrajaya",
];

const JOIN_REQUEST_COLLECTION = "challengeTeamJoinRequests";

function getJoinRequestId(teamId, uid) {
  return `${cleanId(teamId)}_${cleanId(uid)}`;
}

function getJoinRequestExpiryDate(request) {
  if (request?.expiresAt) return toDate(request.expiresAt);
  const createdAt = toDate(request?.createdAt);
  return createdAt
    ? new Date(createdAt.getTime() + INVITATION_EXPIRY_MS)
    : null;
}

function isJoinRequestExpired(request) {
  const expiresAt = getJoinRequestExpiryDate(request);
  return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
}

export function listenToDiscoverableChallengeTeams(callback) {
  return onSnapshot(
    query(
      collection(db, TEAM_COLLECTION),
      where("status", "==", TEAM_STATUS.WAITING),
      where("isDiscoverable", "==", true),
      where("challengeMode", "==", CHALLENGE_MODE.TEAM)
    ),
    (snap) => {
      const teams = snap.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((team) => {
          const mode = team.challengeMode || CHALLENGE_MODE.TEAM;
          return (
            mode === CHALLENGE_MODE.TEAM &&
            team.isDiscoverable !== false
          );
        })
        .sort((a, b) => {
          const aTime =
            a.createdAt?.toMillis?.() ||
            a.updatedAt?.toMillis?.() ||
            0;
          const bTime =
            b.createdAt?.toMillis?.() ||
            b.updatedAt?.toMillis?.() ||
            0;
          return bTime - aTime;
        });

      callback(teams);
    },
    (error) => {
      console.error("Discoverable team listener failed:", error);
      callback([]);
    }
  );
}

export async function requestToJoinChallengeTeam(team) {
  const uid = currentUid();

  if (!team?.id) {
    throw new Error("Team not found.");
  }

  const teamRef = doc(db, TEAM_COLLECTION, team.id);
  const requestRef = doc(
    db,
    JOIN_REQUEST_COLLECTION,
    getJoinRequestId(team.id, uid)
  );

  const me = auth.currentUser;

  await runTransaction(db, async (transaction) => {
    const [teamSnap, requestSnap] = await Promise.all([
      transaction.get(teamRef),
      transaction.get(requestRef),
    ]);

    if (!teamSnap.exists()) {
      throw new Error("This team no longer exists.");
    }

    const currentTeam = teamSnap.data();
    const mode = currentTeam.challengeMode || CHALLENGE_MODE.TEAM;

    if (mode !== CHALLENGE_MODE.TEAM) {
      throw new Error("This team does not accept public join requests.");
    }

    if (currentTeam.status !== TEAM_STATUS.WAITING) {
      throw new Error("This team is no longer accepting members.");
    }

    if (currentTeam.createdBy === uid) {
      throw new Error("You are already the creator of this team.");
    }

    if (Array.isArray(currentTeam.memberIds) && currentTeam.memberIds.includes(uid)) {
      throw new Error("You are already a member of this team.");
    }

    if (requestSnap.exists()) {
      const oldRequest = requestSnap.data();
      if (oldRequest.status === "pending" && !isJoinRequestExpired(oldRequest)) {
        throw new Error("You already have a pending request for this team.");
      }
    }

    const requesterName = fromNameForTeam(me);

    transaction.set(requestRef, {
      requestId: requestRef.id,
      teamId: team.id,
      challengeId: currentTeam.challengeId || "",
      challengeTitle: currentTeam.challengeTitle || "",
      teamName: currentTeam.teamName || "",
      teamState: currentTeam.teamState || "",
      requesterUid: uid,
      requesterName,
      requesterEmail: me?.email || "",
      requesterPhotoURL: me?.photoURL || "",
      toUid: currentTeam.createdBy,
      status: "pending",
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + INVITATION_EXPIRY_MS),
    });
  });

  await createNotification(team.createdBy, {
    title: "New Team Join Request",
    message: `${fromNameForTeam(me)} wants to join your team "${team.teamName || "Challenge Team"}".`,
    type: "challenge-team-join-request",
    teamId: team.id,
    challengeId: team.challengeId || "",
  });

  return requestRef.id;
}

export function listenToMyTeamJoinRequests(uid, callback) {
  if (!uid) return () => {};

  return onSnapshot(
    query(
      collection(db, JOIN_REQUEST_COLLECTION),
      where("requesterUid", "==", uid)
    ),
    async (snap) => {
      const requests = [];

      for (const item of snap.docs) {
        const request = { id: item.id, ...item.data() };
        if (request.status === "pending" && isJoinRequestExpired(request)) {
          try {
            await updateDoc(item.ref, {
              status: "expired",
              respondedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (error) {
            console.warn("Could not expire join request:", error);
          }
          continue;
        }
        requests.push(request);
      }

      requests.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      callback(requests);
    },
    (error) => {
      console.error("My join request listener failed:", error);
      callback([]);
    }
  );
}

export function listenToIncomingTeamJoinRequests(uid, callback) {
  if (!uid) return () => {};

  return onSnapshot(
    query(
      collection(db, JOIN_REQUEST_COLLECTION),
      where("toUid", "==", uid),
      where("status", "==", "pending")
    ),
    async (snap) => {
      const requests = [];

      for (const item of snap.docs) {
        const request = { id: item.id, ...item.data() };
        if (isJoinRequestExpired(request)) {
          try {
            await updateDoc(item.ref, {
              status: "expired",
              respondedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (error) {
            console.warn("Could not expire incoming join request:", error);
          }
          continue;
        }
        requests.push(request);
      }

      requests.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      callback(requests);
    },
    (error) => {
      console.error("Incoming join request listener failed:", error);
      callback([]);
    }
  );
}

export async function cancelTeamJoinRequest(request) {
  const uid = currentUid();

  if (!request?.id) throw new Error("Join request not found.");
  if (request.requesterUid !== uid) {
    throw new Error("Only the requester can cancel this request.");
  }

  const requestRef = doc(db, JOIN_REQUEST_COLLECTION, request.id);
  const snap = await getDoc(requestRef);

  if (!snap.exists()) throw new Error("This join request no longer exists.");

  const data = snap.data();
  if (data.requesterUid !== uid) {
    throw new Error("Only the requester can cancel this request.");
  }
  if (data.status !== "pending") {
    throw new Error("Only a pending request can be cancelled.");
  }

  if (isJoinRequestExpired({ id: request.id, ...data })) {
    await updateDoc(requestRef, {
      status: "expired",
      respondedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    throw new Error("This join request has expired.");
  }

  await updateDoc(requestRef, {
    status: "cancelled",
    respondedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function acceptTeamJoinRequest(request) {
  const uid = currentUid();

  if (!request?.id) throw new Error("Join request not found.");

  const requestRef = doc(db, JOIN_REQUEST_COLLECTION, request.id);
  const teamRef = doc(db, TEAM_COLLECTION, request.teamId);
  const me = auth.currentUser;
  let accepted = false;

  await runTransaction(db, async (transaction) => {
    const [requestSnap, teamSnap] = await Promise.all([
      transaction.get(requestRef),
      transaction.get(teamRef),
    ]);

    if (!requestSnap.exists()) throw new Error("This join request no longer exists.");
    if (!teamSnap.exists()) throw new Error("This team no longer exists.");

    const requestData = requestSnap.data();
    const team = teamSnap.data();

    if (requestData.toUid !== uid || team.createdBy !== uid) {
      throw new Error("Only the team creator can accept this request.");
    }

    if (requestData.status !== "pending") {
      throw new Error("This join request has already been answered.");
    }

    if (isJoinRequestExpired({ id: request.id, ...requestData })) {
      transaction.update(requestRef, {
        status: "expired",
        respondedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      throw new Error(`This join request has expired after ${INVITATION_EXPIRY_HOURS} hours.`);
    }

    if (team.status !== TEAM_STATUS.WAITING) {
      throw new Error("This team is no longer accepting members.");
    }

    const requesterUid = requestData.requesterUid;
    const alreadyMember = Array.isArray(team.memberIds) && team.memberIds.includes(requesterUid);

    if (!alreadyMember) {
      const newMember = {
        uid: requesterUid,
        name: requestData.requesterName || "Member",
        email: requestData.requesterEmail || "",
        photoURL: requestData.requesterPhotoURL || "",
        progress: 0,
        completed: false,
        requirementStatus: "pending",
        proof: null,
        joinedAt: new Date(),
      };

      transaction.update(teamRef, {
        memberIds: arrayUnion(requesterUid),
        members: arrayUnion(newMember),
        updatedAt: serverTimestamp(),
      });
    }

    transaction.update(requestRef, {
      status: "accepted",
      respondedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    accepted = true;
  });

  if (accepted) {
    await createNotification(request.requesterUid, {
      title: "Join Request Accepted",
      message: `Your request to join "${request.teamName || "the challenge team"}" was accepted. You are now a team member.`,
      type: "challenge-team-join-accepted",
      teamId: request.teamId || "",
      challengeId: request.challengeId || "",
    });
  }

  return accepted;
}

export async function declineTeamJoinRequest(request) {
  const uid = currentUid();

  if (!request?.id) throw new Error("Join request not found.");

  const requestRef = doc(db, JOIN_REQUEST_COLLECTION, request.id);
  const snap = await getDoc(requestRef);
  if (!snap.exists()) throw new Error("This join request no longer exists.");

  const data = snap.data();
  if (data.toUid !== uid) throw new Error("Only the team creator can decline this request.");
  if (data.status !== "pending") throw new Error("Only a pending request can be declined.");

  await updateDoc(requestRef, {
    status: "declined",
    respondedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await createNotification(request.requesterUid, {
    title: "Join Request Declined",
    message: `Your request to join "${request.teamName || "the challenge team"}" was declined.`,
    type: "challenge-team-join-declined",
    teamId: request.teamId || "",
    challengeId: request.challengeId || "",
  });
}

// ============================================================
// DELETE TEAM
// ============================================================

export async function deleteChallengeTeam(
  teamId
) {
  const uid = currentUid();

  if (!teamId) {
    throw new Error("Team ID is required.");
  }

  const teamRef = doc(
    db,
    TEAM_COLLECTION,
    teamId
  );

  const snap = await getDoc(teamRef);

  if (!snap.exists()) {
    throw new Error(
      "This challenge team has already been deleted."
    );
  }

  const team = snap.data();

  if (team.createdBy !== uid) {
    throw new Error(
      "Only the team creator can delete this team."
    );
  }

  if (
    team.status !== TEAM_STATUS.WAITING &&
    team.status !== TEAM_STATUS.ACTIVE
  ) {
    throw new Error(
      "Only a pending or active challenge team can be deleted."
    );
  }

  // Cancel all pending invitations created for this team.
  const inviteQuery = query(
    collection(db, INVITE_COLLECTION),
    where("teamId", "==", teamId),
    where("fromUid", "==", uid),
    where("status", "==", "pending")
  );

  const invites = await getDocs(inviteQuery);

  await Promise.all(
    invites.docs.map(async (inviteDoc) => {
      const invite = inviteDoc.data();

      await updateDoc(
        inviteDoc.ref,
        {
          status: "cancelled",
          respondedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      if (invite?.toUid) {
        try {
          await createNotification(
            invite.toUid,
            {
              title: "Challenge Team Deleted",
              message:
                `${invite.fromName || "The team creator"} deleted "${invite.teamName || "the challenge team"}". Your invitation has been cancelled, so you can no longer join this team.`,
              type: "challenge-team-deleted",
              teamId: invite.teamId || teamId,
              challengeId: invite.challengeId || "",
            }
          );
        } catch (notificationError) {
          console.warn(
            "Could not notify invitee about deleted team:",
            notificationError
          );
        }
      }
    })
  );

  // Notify friends who already accepted and joined the waiting team.
  const acceptedMemberIds = Array.isArray(team.memberIds)
    ? team.memberIds.filter(
        (memberUid) =>
          memberUid && memberUid !== uid
      )
    : [];

  await Promise.all(
    acceptedMemberIds.map(async (memberUid) => {
      try {
        await createNotification(
          memberUid,
          {
            title: "Challenge Team Deleted",
            message:
              `${team.creatorName || "The team creator"} deleted "${team.teamName || "the challenge team"}". This challenge team is no longer available.`,
            type: "challenge-team-deleted",
            teamId,
            challengeId: team.challengeId || "",
          }
        );
      } catch (notificationError) {
        console.warn(
          "Could not notify accepted member about deleted team:",
          notificationError
        );
      }
    })
  );

  // Delete the waiting team.
  await deleteDoc(teamRef);

  return true;
}

// ============================================================
// GET ONE TEAM
// ============================================================

export async function getChallengeTeam(
  teamId
) {
  if (!teamId) return null;

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

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  TEAM_REQUIREMENT_TYPES,
  TEAM_STATUS,
  CHALLENGE_MODE,
  MALAYSIA_STATES,
  listenToDiscoverableChallengeTeams,
  requestToJoinChallengeTeam,
  listenToMyTeamJoinRequests,
  listenToIncomingTeamJoinRequests,
  cancelTeamJoinRequest,
  acceptTeamJoinRequest,
  declineTeamJoinRequest,
  getAvailableChallenges,
  listenToAvailableChallenges,
  getChallengeById,
  listenToMyChallengeTeams,
  createChallengeTeam,
  listenToMyTeamInvites,
  listenToMySentTeamInvites,
  expireChallengeTeamInvite,
  expirePendingChallengeTeamInvites,
  cancelChallengeTeamInvite,
  acceptChallengeTeamInvite,
  declineChallengeTeamInvite,
  startChallengeTeam,
  submitChallengeRequirement,
  endChallengeTeam,
  checkChallengeTeamDeadline,
  updateMyTeamProgress,
  leaveChallengeTeam,
  deleteChallengeTeam,
  getChallengeTeam,
};

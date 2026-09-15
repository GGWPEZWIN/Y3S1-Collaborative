// The modern JSX transform does not need the React import:
// import React, { useEffect, useMemo, useRef, useState } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  MapPin,
  Search,
  // Target, 
  Trophy,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import Layout from "../../../shared/components/Layout";
import { useCurrentUser } from "../../../firebase/useCurrentUser";
import {
  TEAM_STATUS,
  CHALLENGE_MODE,
  MALAYSIA_STATES,
  listenToAvailableChallenges,
  listenToMyChallengeTeams,
  listenToMyTeamInvites,
  listenToMySentTeamInvites,
  listenToDiscoverableChallengeTeams,
  listenToMyTeamJoinRequests,
  listenToIncomingTeamJoinRequests,
  requestToJoinChallengeTeam,
  cancelTeamJoinRequest,
  acceptTeamJoinRequest,
  declineTeamJoinRequest,
  cancelChallengeTeamInvite,
  deleteChallengeTeam,
  createChallengeTeam,
  acceptChallengeTeamInvite,
  declineChallengeTeamInvite,
  startChallengeTeam,
  submitChallengeRequirement,
  checkChallengeTeamDeadline,
} from "../../../firebase/challengeTeamService";
import { listenToFriends } from "../../../firebase/friendService";
import ChallengeSelection from "./ChallengeSelection";

function formatDate(value) {
  if (!value) return "";

  const date = value?.toDate ? value.toDate() : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "";

  const date = value?.toDate ? value.toDate() : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRequirementLabel(type) {
  return type === "location" ? "Location Verification" : "Photo Proof";
}

function getRequirementIcon(type, size = 18) {
  return type === "location" ? (
    <MapPin size={size} />
  ) : (
    <Camera size={size} />
  );
}

function getProfileState(profile, authUser) {
  return (
    profile?.state ||
    profile?.malaysiaState ||
    profile?.location?.state ||
    authUser?.state ||
    authUser?.malaysiaState ||
    ""
  );
}

function Avatar({ member, size = 42 }) {
  const name = member?.name || member?.displayName || "U";

  const photo =
    member?.photoURL ||
    member?.profile_photo_url ||
    member?.profilePhotoUrl ||
    "";

  const fallback = (
    <div
      className="challenge-avatar-fallback"
      style={{
        ...styles.avatarFallback,
        width: size,
        height: size,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );

  if (!photo) return fallback;

  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        flexShrink: 0,
      }}
    >
      <img
        src={photo}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
        }}
        onError={(event) => {
          event.currentTarget.style.display = "none";

          const fallbackNode =
            event.currentTarget.parentElement?.querySelector(
              ".challenge-avatar-fallback"
            );

          if (fallbackNode) {
            fallbackNode.style.display = "flex";
          }
        }}
      />

      <div
        className="challenge-avatar-fallback"
        style={{
          display: "none",
          position: "absolute",
          inset: 0,
        }}
      >
        {fallback}
      </div>
    </div>
  );
}

/*
 * SUPERSEDED BY ChallengeSelection.
 *
 * Kept for reference. Nothing renders this, and its styles
 * (challengeCard, challengeCardTop, challengeIcon, challengeTitle,
 * challengeDescription, challengeMeta, metaItem, categoryPill,
 * challengeDate, challengeGrid) are commented out at the bottom
 * of the styles object. Restoring this component means restoring
 * those keys and the Target import too.
 *
 * function ChallengeCard({ challenge, selected, onSelect }) {
 *   const requirementType = challenge.requirementType || "photo";
 *
 *   return (
 *     <button
 *       type="button"
 *       onClick={() => onSelect(challenge)}
 *       style={{
 *         ...styles.challengeCard,
 *         borderColor: selected ? "#16a34a" : "#e5e7eb",
 *         boxShadow: selected ? "0 0 0 2px #bbf7d0" : "none",
 *       }}
 *     >
 *       <div style={styles.challengeCardTop}>
 *         <div style={styles.challengeIcon}>
 *           <Trophy size={20} />
 *         </div>
 *
 *         {selected && <CheckCircle2 size={22} color="#16a34a" />}
 *       </div>
 *
 *       <div style={styles.challengeTitle}>{challenge.title}</div>
 *
 *       <div style={styles.challengeDescription}>
 *         {challenge.description}
 *       </div>
 *
 *       <div style={styles.challengeMeta}>
 *         <span style={styles.metaItem}>
 *           <Target size={14} />
 *           {challenge.target} {challenge.unit}
 *         </span>
 *
 *         {challenge.category && (
 *           <span style={styles.categoryPill}>{challenge.category}</span>
 *         )}
 *       </div>
 *
 *       <div style={styles.requirementPill}>
 *         {getRequirementIcon(requirementType, 14)}
 *         {getRequirementLabel(requirementType)}
 *       </div>
 *
 *       {challenge.endDate && (
 *         <div style={styles.challengeDate}>
 *           <CalendarDays size={14} />
 *           Ends {formatDate(challenge.endDate)}
 *         </div>
 *       )}
 *     </button>
 *   );
 * }
 */

function RequirementButton({ team, currentMember, onSubmit }) {
  const fileRef = useRef(null);

  const requirementType = team.requirementType || "photo";

  const completed =
    currentMember?.completed === true ||
    currentMember?.requirementStatus === "completed";

  const [busy, setBusy] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);

  if (completed) {
    return (
      <div style={styles.proofCompleted}>
        <CheckCircle2 size={18} />

        Requirement completed

        {currentMember?.proof?.submittedAt && (
          <span style={styles.proofTime}>
            {formatDateTime(currentMember.proof.submittedAt)}
          </span>
        )}
      </div>
    );
  }

  async function handlePhoto(event) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      onSubmit({
        error: "Please select an image file.",
      });

      return;
    }

    try {
      setBusy(true);

      await onSubmit({
        file,
      });
    } finally {
      setBusy(false);
    }
  }

  function handleLocation() {
    if (!navigator.geolocation) {
      onSubmit({
        error: "Location services are not supported by this browser.",
      });

      return;
    }

    setLocationBusy(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await onSubmit({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        } finally {
          setLocationBusy(false);
        }
      },
      (error) => {
        setLocationBusy(false);

        onSubmit({
          error:
            error.code === 1
              ? "Location permission was denied. Please allow location access and try again."
              : "Unable to access your location. Please try again.",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  return (
    <div style={styles.requirementActionBox}>
      <div style={styles.requirementActionTitle}>
        {getRequirementIcon(requirementType, 19)}
        {getRequirementLabel(requirementType)}
      </div>

      <div style={styles.requirementDescription}>
        {team.requirementDescription ||
          (requirementType === "location"
            ? "Allow GreenTrip to access your current location to verify your participation."
            : "Take and submit a photo as proof that you completed the challenge.")}
      </div>

      {requirementType === "photo" ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            style={{ display: "none" }}
          />

          <button
            type="button"
            style={styles.btnFilled}
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Camera size={16} />
            {busy ? "Uploading proof..." : "Take / Upload Photo"}
          </button>
        </>
      ) : (
        <button
          type="button"
          style={styles.btnFilled}
          disabled={locationBusy}
          onClick={handleLocation}
        >
          <MapPin size={16} />
          {locationBusy ? "Checking Location..." : "Verify My Location"}
        </button>
      )}
    </div>
  );
}

function TeamCard({
  team,
  currentUid,
  onStart,
  onSubmitRequirement,
  pendingInvites,
  onCancelInvite,
  onDeleteTeam,
  incomingRequests,
  onAcceptJoinRequest,
  onDeclineJoinRequest,
}) {
  const members = Array.isArray(team.members) ? team.members : [];

  const completedCount = members.filter(
    (member) =>
      member.completed === true ||
      member.requirementStatus === "completed"
  ).length;

  const acceptedCount = members.length;

  const teamPct = acceptedCount
    ? Math.round((completedCount / acceptedCount) * 100)
    : 0;

  const currentMember = members.find(
    (member) => member.uid === currentUid
  );

  const isCreator = team.createdBy === currentUid;

  // Unused: the UI counts accepted members, not sent invitations.
  // const invitedCount = Array.isArray(team.invitedFriendIds)
  //   ? team.invitedFriendIds.length
  //   : 0;

  /*
   * IMPORTANT:
   *
   * Starting is based on ACCEPTED MEMBERS.
   * Invitations do not count as members until accepted.
   *
   * Normal Team:
   * Creator + at least 1 accepted member = can start.
   *
   * Challenge Partner:
   * Creator + exactly 1 accepted partner = can start.
   */
  const canStart =
    isCreator &&
    team.status === TEAM_STATUS.WAITING &&
    (team.challengeMode === CHALLENGE_MODE.PARTNER
      ? acceptedCount === 2
      : acceptedCount >= 2);

  const canDelete =
    isCreator &&
    (team.status === TEAM_STATUS.WAITING ||
      team.status === TEAM_STATUS.ACTIVE);

  const isWaiting = team.status === TEAM_STATUS.WAITING;

  const isActive = team.status === TEAM_STATUS.ACTIVE;

  const isFinished =
    team.status === TEAM_STATUS.COMPLETED ||
    team.status === TEAM_STATUS.ENDED;

  const requirementType = team.requirementType || "photo";

  const teamJoinRequests =
    incomingRequests?.filter(
      (request) => request.teamId === team.id
    ) || [];

  return (
    <div style={styles.teamCard}>
      <div
        style={{
          ...styles.teamTopBar,
          background:
            team.status === TEAM_STATUS.COMPLETED
              ? "#16a34a"
              : team.status === TEAM_STATUS.ENDED
              ? "#6b7280"
              : "#22c55e",
        }}
      />

      <div style={styles.teamBody}>
        <div style={styles.teamHeadRow}>
          <div>
            <div style={styles.teamName}>
              {team.teamName}
            </div>

            <div style={styles.teamChallenge}>
              Challenge: {team.challengeTitle}
            </div>

            {team.teamState && (
              <div style={styles.teamState}>
                <MapPin size={13} />
                {team.teamState}
              </div>
            )}
          </div>

          <span
            style={{
              ...styles.statusPill,
              ...(team.status === TEAM_STATUS.COMPLETED
                ? styles.statusCompleted
                : team.status === TEAM_STATUS.ENDED
                ? styles.statusEnded
                : isWaiting
                ? styles.statusWaiting
                : styles.statusActive),
            }}
          >
            {isWaiting
              ? "Waiting for Members"
              : team.status || "Active"}
          </span>
        </div>

        <div style={styles.requirementSummary}>
          <div style={styles.requirementSummaryIcon}>
            {getRequirementIcon(requirementType, 19)}
          </div>

          <div>
            <div style={styles.requirementSummaryTitle}>
              Required: {getRequirementLabel(requirementType)}
            </div>

            <div style={styles.requirementSummaryText}>
              {team.requirementDescription ||
                "Complete the challenge requirement to receive eligibility."}
            </div>
          </div>
        </div>

        <div style={styles.progressSection}>
          <div style={styles.progressHeadRow}>
            <span style={styles.progressLabel}>
              Team Progress
            </span>

            <span style={styles.progressPts}>
              {completedCount} / {acceptedCount} completed
            </span>
          </div>

          <div style={styles.progressTrack}>
            <div
              style={{
                ...styles.progressFill,
                width: `${teamPct}%`,
              }}
            />
          </div>

          <div style={styles.progressCaption}>
            {teamPct}% of accepted members have completed the
            requirement.
          </div>
        </div>

        {isWaiting && (
          <div style={styles.waitingBanner}>
            <Clock3 size={18} />

            <div>
              <strong>
                {canStart
                  ? "Ready to start"
                  : team.challengeMode === CHALLENGE_MODE.PARTNER
                  ? "Waiting for your partner to accept"
                  : "Waiting for at least one member to accept"}
              </strong>

              <div>
                {acceptedCount} accepted member
                {acceptedCount !== 1 ? "s" : ""}.{" "}

                {canStart
                  ? "The creator can start the challenge."
                  : "The challenge cannot start until at least 2 people are accepted members."}
              </div>
            </div>
          </div>
        )}

        {isActive && currentMember && (
          <RequirementButton
            team={team}
            currentMember={currentMember}
            onSubmit={(payload) =>
              onSubmitRequirement(team, payload)
            }
          />
        )}

        <div style={styles.membersSection}>
          <div style={styles.membersLabel}>
            Accepted Team Members
          </div>

          {members.map((member) => {
            const completed =
              member.completed === true ||
              member.requirementStatus === "completed";

            return (
              <div
                key={member.uid}
                style={styles.memberRow}
              >
                <Avatar member={member} />

                <div style={styles.memberBarWrap}>
                  <div style={styles.memberNameRow}>
                    <span style={styles.memberName}>
                      {member.name || "Member"}

                      {member.uid === currentUid && (
                        <span style={styles.youPill}>
                          You
                        </span>
                      )}
                    </span>

                    {completed ? (
                      <span style={styles.completedText}>
                        <CheckCircle2 size={14} />
                        Done
                      </span>
                    ) : (
                      <span style={styles.memberProgress}>
                        0%
                      </span>
                    )}
                  </div>

                  <div style={styles.progressTrack}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: completed ? "100%" : "0%",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isWaiting &&
          isCreator &&
          pendingInvites?.length > 0 && (
            <div style={styles.pendingInviteSection}>
              <div style={styles.membersLabel}>
                Pending Invitations
              </div>

              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  style={styles.pendingInviteRow}
                >
                  <div>
                    <div style={styles.pendingInviteName}>
                      {invite.toName ||
                        invite.toEmail ||
                        "Friend"}
                    </div>

                    <div style={styles.pendingInviteMeta}>
                      Invitation expires after 12 hours
                    </div>
                  </div>

                  <button
                    type="button"
                    style={styles.cancelInviteBtn}
                    onClick={() =>
                      onCancelInvite?.(invite)
                    }
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}

        {isWaiting &&
          isCreator &&
          teamJoinRequests.length > 0 && (
            <div style={styles.pendingInviteSection}>
              <div style={styles.membersLabel}>
                Join Requests
              </div>

              {teamJoinRequests.map((request) => (
                <div
                  key={request.id}
                  style={styles.pendingInviteRow}
                >
                  <div style={styles.requestPerson}>
                    <Avatar
                      member={{
                        name: request.requesterName,
                        photoURL:
                          request.requesterPhotoURL,
                      }}
                      size={34}
                    />

                    <div>
                      <div style={styles.pendingInviteName}>
                        {request.requesterName ||
                          "User"}
                      </div>

                      <div style={styles.pendingInviteMeta}>
                        {request.requesterEmail ||
                          "Wants to join your team"}
                      </div>
                    </div>
                  </div>

                  <div style={styles.inviteActions}>
                    <button
                      type="button"
                      style={styles.btnFilledSmall}
                      onClick={() =>
                        onAcceptJoinRequest(request)
                      }
                    >
                      Accept
                    </button>

                    <button
                      type="button"
                      style={styles.btnOutlineSmall}
                      onClick={() =>
                        onDeclineJoinRequest(request)
                      }
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        <div style={styles.actionsRow}>
          {canStart && (
            <button
              type="button"
              style={styles.btnFilled}
              onClick={() => onStart(team)}
            >
              <ArrowRight size={16} />
              Start Challenge
            </button>
          )}

          {isWaiting &&
            !canStart &&
            isCreator && (
              <div style={styles.disabledStartText}>
                {team.challengeMode ===
                CHALLENGE_MODE.PARTNER
                  ? "Your challenge partner must accept the invitation before you can start."
                  : "At least one invited friend must accept, or a user must be accepted from Find a Team, before you can start."}
              </div>
            )}

          {isActive &&
            currentMember &&
            (currentMember.completed === true ||
              currentMember.requirementStatus ===
                "completed") && (
              <div style={styles.doneActionText}>
                <CheckCircle2 size={16} />
                Your requirement is complete.
              </div>
            )}

          {canDelete && (
            <button
              type="button"
              style={styles.deleteTeamBtn}
              onClick={() => onDeleteTeam?.(team)}
            >
              Delete Team
            </button>
          )}

        </div>

        {team.status === TEAM_STATUS.COMPLETED && (
          <div style={styles.completedBanner}>
            <Trophy size={18} />
            Everyone completed the requirement. All accepted
            members are eligible for the challenge achievement.
          </div>
        )}

        {team.status === TEAM_STATUS.ENDED && (
          <div style={styles.endedBanner}>
            <Clock3 size={18} />

            <div>
              <strong>Challenge ended</strong>

              <div>
                Only members who completed the requirement
                before the deadline receive achievement
                eligibility.
              </div>
            </div>
          </div>
        )}

        {isFinished && team.endedAt && (
          <div style={styles.finishedTime}>
            Ended: {formatDateTime(team.endedAt)}
          </div>
        )}
      </div>
    </div>
  );
}

function DiscoverTeamCard({
  team,
  requestStatus,
  onJoin,
}) {
  const members = Array.isArray(team.members)
    ? team.members
    : [];

  const isPending = requestStatus === "pending";
  const isAccepted = requestStatus === "accepted";
  const isDeclined = requestStatus === "declined";

  return (
    <div style={styles.discoverCard}>
      <div style={styles.discoverTop}>
        <div>
          <div style={styles.teamName}>
            {team.teamName || "Challenge Team"}
          </div>

          <div style={styles.teamChallenge}>
            {team.challengeTitle ||
              "Sustainability Challenge"}
          </div>
        </div>

        {team.teamState && (
          <span style={styles.statePill}>
            <MapPin size={13} />
            {team.teamState}
          </span>
        )}
      </div>

      <div style={styles.discoverMetaRow}>
        <span>
          <Users size={14} />
          {members.length} member
          {members.length !== 1 ? "s" : ""}
        </span>

        <span>
          <Trophy size={14} />
          {team.challengeTitle || "Challenge"}
        </span>

        {team.challengeEndDate && (
          <span>
            <CalendarDays size={14} />
            Ends {formatDate(team.challengeEndDate)}
          </span>
        )}
      </div>

      <div style={styles.creatorRow}>
        <Avatar
          member={{
            name: team.creatorName || "Team Creator",
          }}
          size={32}
        />

        <div>
          <span style={styles.creatorLabel}>
            Created by
          </span>

          <strong>
            {team.creatorName || "GreenTrip User"}
          </strong>
        </div>
      </div>

      <div style={styles.discoverFooter}>
        <span style={styles.requirementPill}>
          {getRequirementIcon(
            team.requirementType || "photo",
            13
          )}
          {getRequirementLabel(
            team.requirementType || "photo"
          )}
        </span>

        <button
          type="button"
          style={styles.btnFilled}
          disabled={isPending || isAccepted}
          onClick={() => onJoin(team)}
        >
          {isPending
            ? "Request Pending"
            : isAccepted
            ? "Joined"
            : isDeclined
            ? "Request Again"
            : "Request to Join"}
        </button>
      </div>
    </div>
  );
}

export default function ChallengeTeam({
  onNavigate,
}) {
  const {
    authUser,
    profile,
    loading: userLoading,
  } = useCurrentUser();

  const [tab, setTab] = useState("My Teams");

  /*
   * Challenge Partner is intentionally NOT a top-level tab.
   *
   * It is a creation mode inside the single Create tab.
   */
  const [createMode, setCreateMode] = useState(
    CHALLENGE_MODE.TEAM
  );

  const [challenges, setChallenges] = useState([]);
  const [teams, setTeams] = useState([]);
  const [discoverableTeams, setDiscoverableTeams] =
    useState([]);
  const [friends, setFriends] = useState([]);
  const [invites, setInvites] = useState([]);
  const [sentInvites, setSentInvites] = useState([]);
  const [myJoinRequests, setMyJoinRequests] =
    useState([]);
  const [
    incomingJoinRequests,
    setIncomingJoinRequests,
  ] = useState([]);

  const [selectedChallenge, setSelectedChallenge] =
    useState(null);

  const [teamName, setTeamName] = useState("");

  // null = the user has not touched the dropdown yet, so the
  // profile state is used. "" = the user explicitly cleared it.
  // Derived below instead of synced in an effect.
  const [teamState, setTeamState] = useState(null);

  const [selectedFriends, setSelectedFriends] =
    useState([]);

  const [friendSearch, setFriendSearch] = useState("");

  // Dead state: the Create panel renders off tab === "Create",
  // so this was set in three places and never read. Every
  // setShowCreate call site below is commented out to match.
  // const [showCreate, setShowCreate] = useState(false);

  const [
    showChallengeSelection,
    setShowChallengeSelection,
  ] = useState(false);

  const [teamSearch, setTeamSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");

  // Removed: setLoading(false) ran synchronously in the effect
  // body (cascading-render error) and never ran at all on the
  // signed-out path, so the page hung on "Loading...". userLoading
  // already covers auth and the listeners fill their own arrays.
  // const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ============================================================
  // SUBSCRIPTIONS
  // ============================================================
  // No loading state here: the listeners populate their arrays
  // as data arrives, and userLoading already covers auth.
  // ============================================================

  useEffect(() => {
    if (!authUser?.uid) return undefined;

    const unsubs = [
      listenToAvailableChallenges(setChallenges),

      listenToMyChallengeTeams(
        authUser.uid,
        setTeams
      ),

      listenToMyTeamInvites(
        authUser.uid,
        setInvites
      ),

      listenToMySentTeamInvites(
        authUser.uid,
        setSentInvites
      ),

      listenToDiscoverableChallengeTeams(
        setDiscoverableTeams
      ),

      listenToFriends(
        authUser.uid,
        setFriends
      ),

      listenToMyTeamJoinRequests(
        authUser.uid,
        setMyJoinRequests
      ),

      listenToIncomingTeamJoinRequests(
        authUser.uid,
        setIncomingJoinRequests
      ),
    ];

    // setLoading(false);

    return () =>
      unsubs.forEach(
        (unsubscribe) => unsubscribe?.()
      );
  }, [authUser?.uid]);

  // ============================================================
  // DEADLINE CHECKS
  // ============================================================
  // Keyed on the ids of unfinished teams, not on the teams array
  // itself. checkChallengeTeamDeadline writes to the team doc,
  // which re-emits from the listener: depending on the array
  // identity would loop.
  // ============================================================

  const pendingDeadlineIds = useMemo(
    () =>
      teams
        .filter(
          (team) =>
            team.id &&
            team.status !== TEAM_STATUS.COMPLETED &&
            team.status !== TEAM_STATUS.ENDED
        )
        .map((team) => team.id)
        .sort()
        .join(","),
    [teams]
  );

  useEffect(() => {
    if (!pendingDeadlineIds) return undefined;

    let cancelled = false;

    (async () => {
      for (const teamId of pendingDeadlineIds.split(",")) {
        if (cancelled) return;

        try {
          await checkChallengeTeamDeadline(teamId);
        } catch (deadlineError) {
          console.warn(
            "Challenge deadline check failed:",
            deadlineError
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingDeadlineIds]);

  // ============================================================
  // TEAM STATE
  // ============================================================
  // Derived, not synced. The previous version called
  // setTeamState inside an effect body, which is a cascading
  // render: React re-rendered once for the effect and again for
  // the state write. Depending on teamState also meant clearing
  // the dropdown immediately rewrote the profile value back.
  //
  // Previously:
  // const statePrefilled = useRef(false);
  //
  // useEffect(() => {
  //   if (statePrefilled.current) return;
  //   const detected = getProfileState(profile, authUser);
  //   if (detected) {
  //     setTeamState(detected);
  //     statePrefilled.current = true;
  //   }
  // }, [profile, authUser]);
  // ============================================================

  const detectedState = getProfileState(
    profile,
    authUser
  );

  const effectiveTeamState =
    teamState === null ? detectedState : teamState;

  const filteredDiscoverableTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();

    return discoverableTeams.filter((team) => {
      if (team.createdBy === authUser?.uid) {
        return false;
      }

      if (
        stateFilter &&
        team.teamState !== stateFilter
      ) {
        return false;
      }

      if (!q) return true;

      const haystack = [
        team.teamName,
        team.challengeTitle,
        team.creatorName,
        team.teamState,
        team.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [
    discoverableTeams,
    teamSearch,
    stateFilter,
    authUser?.uid,
  ]);

  const activeTeams = useMemo(
    () =>
      teams.filter(
        (team) =>
          team.status === TEAM_STATUS.WAITING ||
          team.status === TEAM_STATUS.ACTIVE
      ),
    [teams]
  );

  const completedTeams = useMemo(
    () =>
      teams.filter(
        (team) =>
          team.status === TEAM_STATUS.COMPLETED ||
          team.status === TEAM_STATUS.ENDED
      ),
    [teams]
  );

  const summary = useMemo(
    () => ({
      active: activeTeams.length,
      completed: completedTeams.length,
      discoverable:
        filteredDiscoverableTeams.length,
    }),
    [
      activeTeams.length,
      completedTeams.length,
      filteredDiscoverableTeams.length,
    ]
  );

  const myRequestStatus = useMemo(() => {
    const map = new Map();

    myJoinRequests.forEach((request) => {
      map.set(
        request.teamId,
        request.status
      );
    });

    return map;
  }, [myJoinRequests]);

  const pendingJoinRequests = useMemo(
    () =>
      myJoinRequests.filter(
        (request) => request.status === "pending"
      ),
    [myJoinRequests]
  );

  const filteredFriends = useMemo(() => {
    const q = friendSearch.trim().toLowerCase();

    if (!q) return friends;

    return friends.filter((friend) => {
      const name = String(
        friend.name ||
          friend.displayName ||
          ""
      ).toLowerCase();

      const email = String(
        friend.email || ""
      ).toLowerCase();

      return (
        name.includes(q) ||
        email.includes(q)
      );
    });
  }, [friends, friendSearch]);

  function resetCreateForm() {
    setTeamName("");

    // Back to null so the profile state is picked up again.
    setTeamState(null);

    setSelectedFriends([]);
    setSelectedChallenge(null);
    setFriendSearch("");
    // setShowCreate(false);
    setShowChallengeSelection(false);
    setCreateMode(CHALLENGE_MODE.TEAM);
  }

  async function handleCreateTeam() {
    setError("");
    setSuccess("");

    if (!selectedChallenge) {
      setError("Select a challenge first.");
      return;
    }

    if (!teamName.trim()) {
      setError("Enter a team name.");
      return;
    }

    if (!effectiveTeamState) {
      setError(
        "Select the Malaysia state for your team."
      );
      return;
    }

    if (
      createMode === CHALLENGE_MODE.PARTNER &&
      selectedFriends.length !== 1
    ) {
      setError(
        "Challenge Partner requires exactly one friend."
      );
      return;
    }

    /*
     * Normal Create Team:
     *
     * 0 direct invitations is allowed.
     * Other users can discover the team and request
     * to join through Find a Team.
     *
     * If friends are selected, any number may be invited.
     */
    try {
      setSaving(true);

      await createChallengeTeam({
        challenge: selectedChallenge,
        teamName,
        teamState: effectiveTeamState,
        invitedFriends: selectedFriends,
        mode: createMode,
      });

      setSuccess(
        createMode === CHALLENGE_MODE.PARTNER
          ? "Challenge partner invitation sent. It expires after 12 hours."
          : selectedFriends.length > 0
          ? "Team created. Your invitations were sent. The team is also available for join requests."
          : "Team created. Other GreenTrip users can now find it and request to join."
      );

      resetCreateForm();

      setTab("My Teams");
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to create the team."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleJoinTeam(team) {
    try {
      setError("");
      setSuccess("");

      await requestToJoinChallengeTeam(team);

      setSuccess(
        `Join request sent to ${
          team.creatorName || "the team creator"
        }. The request expires after 12 hours.`
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to send join request."
      );
    }
  }

  async function handleAcceptJoinRequest(
    request
  ) {
    try {
      setError("");

      await acceptTeamJoinRequest(request);

      setSuccess(
        `${
          request.requesterName || "The user"
        } joined your team.`
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to accept join request."
      );
    }
  }

  async function handleDeclineJoinRequest(
    request
  ) {
    try {
      setError("");

      await declineTeamJoinRequest(request);

      setSuccess("Join request declined.");
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to decline join request."
      );
    }
  }

  async function handleCancelJoinRequest(
    request
  ) {
    try {
      setError("");

      await cancelTeamJoinRequest(request);

      setSuccess("Join request cancelled.");
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to cancel join request."
      );
    }
  }

  async function handleAcceptInvite(invite) {
    try {
      setError("");

      await acceptChallengeTeamInvite(
        invite
      );

      setSuccess(
        `You joined ${
          invite.teamName
        }. The creator can start the challenge once at least 2 members have accepted.`
      );

      setTab("My Teams");
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to accept invitation."
      );
    }
  }

  async function handleDeclineInvite(invite) {
    try {
      setError("");

      await declineChallengeTeamInvite(
        invite
      );

      setSuccess("Invitation declined.");
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to decline invitation."
      );
    }
  }

  async function handleCancelInvite(invite) {
    if (
      !window.confirm(
        `Cancel the invitation sent to ${
          invite.toName ||
          invite.toEmail ||
          "this friend"
        }?`
      )
    ) {
      return;
    }

    try {
      setError("");

      await cancelChallengeTeamInvite(
        invite
      );

      setSuccess("Invitation cancelled.");
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to cancel invitation."
      );
    }
  }

  async function handleDeleteTeam(team) {
    if (
      !window.confirm(
        `Delete "${
          team.teamName || "this team"
        }"? Pending invitations will be cancelled, and any accepted members will be notified that the team was deleted.`
      )
    ) {
      return;
    }

    try {
      setError("");

      await deleteChallengeTeam(team.id);

      setSuccess(
        `"${team.teamName || "The challenge team"}" has been deleted. Pending invitations were cancelled and accepted members were notified.`
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to delete the team."
      );
    }
  }

  async function handleStart(team) {
    try {
      setError("");

      await startChallengeTeam(team.id);

      setSuccess(
        "Challenge started. Each accepted member must complete the required proof."
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to start the challenge."
      );
    }
  }

  async function handleSubmitRequirement(
    team,
    payload
  ) {
    if (payload?.error) {
      setError(payload.error);
      return;
    }

    try {
      setError("");

      const result =
        await submitChallengeRequirement(
          team.id,
          payload
        );

      setSuccess(
        result.teamCompleted
          ? "Everyone completed the requirement. The team challenge is completed."
          : "Your requirement is verified. Waiting for the remaining team members."
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to submit the challenge requirement."
      );
    }
  }

  if (userLoading /* || loading */) {
    return (
      <Layout
        active="community"
        user={profile || authUser}
        onNavigate={onNavigate}
      >
        <div style={styles.loading}>
          Loading Challenge Teams...
        </div>
      </Layout>
    );
  }

  if (!authUser) {
    return (
      <Layout
        active="community"
        onNavigate={onNavigate}
      >
        <div style={styles.loading}>
          <div style={styles.signedOutBox}>
            <Users size={30} />

            <strong>You're not logged in</strong>

            <span>
              Log in to create a challenge team or join one.
            </span>

            <button
              type="button"
              style={styles.btnFilled}
              onClick={() => onNavigate?.("/login")}
            >
              Go to Login
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      active="community"
      user={profile || authUser}
      onNavigate={onNavigate}
    >
      <div style={styles.content}>
        <button
          type="button"
          onClick={() =>
            onNavigate?.("/community")
          }
          style={styles.backBtn}
        >
          <ChevronLeft size={16} />
          Back
        </button>

        <div style={styles.headRow}>
          <div>
            <h1 style={styles.pageTitle}>
              Challenge Teams
            </h1>

            <p style={styles.pageSubtitle}>
              Find a team created by other
              GreenTrip users, request to join,
              or create your own team for others
              to discover.
            </p>
          </div>
        </div>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {success && (
          <div style={styles.success}>
            {success}
          </div>
        )}

        {invites.length > 0 && (
          <div style={styles.inviteBox}>
            <div style={styles.inviteHeader}>
              <div style={styles.inviteHeaderLeft}>
                <div style={styles.inviteHeaderIcon}>
                  <Users size={19} />
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={styles.sectionTitle}>
                    Challenge Invitations
                  </div>

                  <div style={styles.sectionSubtitle}>
                    You have {invites.length} pending invitation
                    {invites.length !== 1 ? "s" : ""} to join a challenge team.
                  </div>
                </div>
              </div>

              <span style={styles.inviteCount}>
                {invites.length}
              </span>
            </div>

            <div style={styles.inviteList}>
              {invites.map((invite) => {
                const inviterName =
                  invite.fromName || "A friend";

                const initials =
                  inviterName
                    .trim()
                    .split(/\s+/)
                    .map((part) => part.charAt(0))
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "FR";

                const isPartner =
                  invite.challengeMode ===
                  CHALLENGE_MODE.PARTNER;

                return (
                  <div
                    key={invite.id}
                    style={styles.inviteCard}
                  >
                    <div style={styles.inviteCardTop}>
                      <div style={styles.inviteIdentity}>
                        <div style={styles.inviteAvatar}>
                          {initials}
                        </div>

                        <div style={styles.inviteMain}>
                          <div style={styles.inviteBadge}>
                            {isPartner ? (
                              <UserPlus size={12} />
                            ) : (
                              <Users size={12} />
                            )}

                            {isPartner
                              ? "Challenge Partner"
                              : "Challenge Team"}
                          </div>

                          <div style={styles.inviteTeam}>
                            {invite.teamName ||
                              "Challenge Team"}
                          </div>

                          <div style={styles.inviteChallenge}>
                            <strong
                              style={styles.inviteFrom}
                            >
                              {inviterName}
                            </strong>{" "}
                            invited you to join this challenge.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      style={
                        styles.inviteChallengePanel
                      }
                    >
                      <div
                        style={
                          styles.inviteChallengeIcon
                        }
                      >
                        <Trophy size={17} />
                      </div>

                      <div
                        style={
                          styles.inviteChallengeInfo
                        }
                      >
                        <span
                          style={
                            styles.inviteChallengeLabel
                          }
                        >
                          Challenge
                        </span>

                        <strong
                          style={
                            styles.inviteChallengeTitle
                          }
                        >
                          {invite.challengeTitle ||
                            "Available Challenge"}
                        </strong>
                      </div>

                      <div
                        style={styles.inviteExpiry}
                      >
                        <Clock3 size={14} />
                        <span>
                          Expires in 12 hours
                        </span>
                      </div>
                    </div>

                    <div
                      style={styles.inviteCardFooter}
                    >
                      <span
                        style={styles.inviteHint}
                      >
                        {isPartner
                          ? "Accept to become this user's challenge partner."
                          : "Accept to become an accepted team member."}
                      </span>

                      <div
                        style={styles.inviteActions}
                      >
                        <button
                          type="button"
                          style={
                            styles.btnOutlineSmall
                          }
                          onClick={() =>
                            handleDeclineInvite(
                              invite
                            )
                          }
                        >
                          Decline
                        </button>

                        <button
                          type="button"
                          style={
                            styles.btnFilledSmall
                          }
                          onClick={() =>
                            handleAcceptInvite(
                              invite
                            )
                          }
                        >
                          <CheckCircle2 size={15} />
                          Accept & Join
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryHeadRow}>
              <span>My Active Teams</span>
              <Users size={18} />
            </div>

            <div style={styles.summaryValue}>
              {summary.active}
            </div>

            <div style={styles.summarySub}>
              Waiting or currently active
            </div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryHeadRow}>
              <span>Findable Teams</span>
              <Search size={18} />
            </div>

            <div style={styles.summaryValue}>
              {summary.discoverable}
            </div>

            <div style={styles.summarySub}>
              Open for join requests
            </div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryHeadRow}>
              <span>Completed Teams</span>
              <Trophy size={18} />
            </div>

            <div style={styles.summaryValue}>
              {summary.completed}
            </div>

            <div style={styles.summarySub}>
              Finished challenges
            </div>
          </div>
        </div>

        {/* ======================================================
            MAIN NAVIGATION
            ======================================================

            Challenge Partner is NOT a separate top-level tab.

            Create contains:
              - Create Team
              - Challenge Partner
        */}
        <div style={styles.tabBar}>
          {[
            "My Teams",
            "Find a Team",
            "Create",
            "Completed",
          ].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setTab(item);

                if (item === "Create") {
                  setCreateMode(
                    CHALLENGE_MODE.TEAM
                  );

                  // setShowCreate(true);

                  setShowChallengeSelection(
                    false
                  );
                }
              }}
              style={{
                ...styles.tabBtn,
                background:
                  tab === item
                    ? "#fff"
                    : "transparent",
                boxShadow:
                  tab === item
                    ? "0 1px 2px rgba(0,0,0,0.08)"
                    : "none",
                color:
                  tab === item
                    ? "#111827"
                    : "#6b7280",
              }}
            >
              {item}
            </button>
          ))}
        </div>

        {/* ======================================================
            FIND A TEAM
            ====================================================== */}
        {tab === "Find a Team" && (
          <div>
            <div style={styles.findHeader}>
              <div>
                <h2
                  style={
                    styles.sectionHeading
                  }
                >
                  Find a Team
                </h2>

                <p
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Browse open teams, search by
                  name or challenge, and filter
                  by Malaysian state.
                </p>
              </div>
            </div>

            <div style={styles.filterBar}>
              <div
                style={styles.friendSearch}
              >
                <Search
                  size={17}
                  color="#9ca3af"
                />

                <input
                  value={teamSearch}
                  onChange={(event) =>
                    setTeamSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search team name, challenge, creator or state..."
                  style={
                    styles.searchInput
                  }
                />
              </div>

              <select
                value={stateFilter}
                onChange={(event) =>
                  setStateFilter(
                    event.target.value
                  )
                }
                style={styles.stateSelect}
              >
                <option value="">
                  All Malaysia states
                </option>

                {MALAYSIA_STATES.map(
                  (state) => (
                    <option
                      key={state}
                      value={state}
                    >
                      {state}
                    </option>
                  )
                )}
              </select>
            </div>

            <div style={styles.findCount}>
              {filteredDiscoverableTeams.length}{" "}
              team
              {filteredDiscoverableTeams.length !==
              1
                ? "s"
                : ""}{" "}
              found
            </div>

            {filteredDiscoverableTeams.length ===
            0 ? (
              <div style={styles.empty}>
                <Search size={30} />

                <strong>
                  No teams found
                </strong>

                <span>
                  Try another search or state
                  filter, or create a team and
                  let other users discover it.
                </span>

                <button
                  type="button"
                  style={styles.btnFilled}
                  onClick={() => {
                    setTab("Create");
                    // setShowCreate(true);
                    setCreateMode(
                      CHALLENGE_MODE.TEAM
                    );
                  }}
                >
                  Create a Team
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div
                style={
                  styles.discoverGrid
                }
              >
                {filteredDiscoverableTeams.map(
                  (team) => (
                    <DiscoverTeamCard
                      key={team.id}
                      team={team}
                      requestStatus={myRequestStatus.get(
                        team.id
                      )}
                      onJoin={
                        handleJoinTeam
                      }
                    />
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================
            MY TEAMS
            ====================================================== */}
        {tab === "My Teams" && (
          <div style={styles.teamList}>
            <div style={styles.myTeamsIntro}>
              <div>
                <h2
                  style={
                    styles.sectionHeading
                  }
                >
                  My Teams
                </h2>

                <p
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Teams you created and teams
                  you joined are shown here.
                </p>
              </div>
            </div>

            {pendingJoinRequests.length > 0 && (
              <div
                style={
                  styles.myRequestBox
                }
              >
                <div style={styles.sectionTitle}>
                  My Join Requests
                </div>

                {pendingJoinRequests.map((request) => (
                  <div
                    key={request.id}
                    style={
                      styles.myRequestRow
                    }
                  >
                    <div>
                      <strong>
                        {request.teamName}
                      </strong>

                      <div
                        style={
                          styles.pendingInviteMeta
                        }
                      >
                        Waiting for approval, expires after
                        12 hours
                      </div>
                    </div>

                    <button
                      type="button"
                      style={
                        styles.cancelInviteBtn
                      }
                      onClick={() =>
                        handleCancelJoinRequest(
                          request
                        )
                      }
                    >
                      Cancel Request
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTeams.length === 0 ? (
              <div style={styles.empty}>
                <Users size={30} />

                <strong>
                  No active teams yet
                </strong>

                <span>
                  Find a team created by
                  someone else or create your
                  own.
                </span>

                <button
                  type="button"
                  style={styles.btnFilled}
                  onClick={() =>
                    setTab("Find a Team")
                  }
                >
                  Find a Team
                  <Search size={16} />
                </button>
              </div>
            ) : (
              activeTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  currentUid={authUser.uid}
                  onStart={handleStart}
                  onSubmitRequirement={
                    handleSubmitRequirement
                  }
                  pendingInvites={sentInvites.filter(
                    (invite) =>
                      invite.teamId ===
                      team.id
                  )}
                  onCancelInvite={
                    handleCancelInvite
                  }
                  onDeleteTeam={
                    handleDeleteTeam
                  }
                  incomingRequests={
                    incomingJoinRequests
                  }
                  onAcceptJoinRequest={
                    handleAcceptJoinRequest
                  }
                  onDeclineJoinRequest={
                    handleDeclineJoinRequest
                  }
                />
              ))
            )}
          </div>
        )}

        {/* ======================================================
            COMPLETED
            ====================================================== */}
        {tab === "Completed" && (
          <div style={styles.teamList}>
            {completedTeams.length === 0 ? (
              <div style={styles.empty}>
                <Trophy size={30} />

                <strong>
                  No finished team challenges
                  yet.
                </strong>

                <span>
                  Complete a challenge
                  together to see the result
                  here.
                </span>
              </div>
            ) : (
              completedTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  currentUid={authUser.uid}
                  onStart={handleStart}
                  onSubmitRequirement={
                    handleSubmitRequirement
                  }
                  pendingInvites={[]}
                  onCancelInvite={
                    handleCancelInvite
                  }
                  onDeleteTeam={
                    handleDeleteTeam
                  }
                  incomingRequests={[]}
                  onAcceptJoinRequest={
                    handleAcceptJoinRequest
                  }
                  onDeclineJoinRequest={
                    handleDeclineJoinRequest
                  }
                />
              ))
            )}
          </div>
        )}

        {/* ======================================================
            CREATE

            ONE creation area with TWO MODES:
              1. Create Team
              2. Challenge Partner

            No separate Challenge Partner top tab.
        ====================================================== */}
        {tab === "Create" && (
          <div style={styles.createPanel}>
            <div
              style={
                styles.createPanelHeader
              }
            >
              <div>
                <h2
                  style={styles.panelTitle}
                >
                  {createMode ===
                  CHALLENGE_MODE.PARTNER
                    ? "Challenge a Partner"
                    : "Create a Challenge Team"}
                </h2>

                <p
                  style={
                    styles.sectionSubtitle
                  }
                >
                  {createMode ===
                  CHALLENGE_MODE.PARTNER
                    ? "Choose a challenge and invite exactly one friend. The challenge can only start after your partner accepts."
                    : "Create a team with at least 2 members. Invite friends directly, or let other GreenTrip users find your team and request to join."}
                </p>
              </div>

              <button
                type="button"
                style={styles.closeBtn}
                onClick={() => {
                  resetCreateForm();
                  setTab("My Teams");
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Creation mode selector */}
            <div
              style={styles.modeSelector}
            >
              <button
                type="button"
                style={{
                  ...styles.modeOption,
                  ...(createMode ===
                  CHALLENGE_MODE.TEAM
                    ? styles.modeOptionActive
                    : {}),
                }}
                onClick={() => {
                  setCreateMode(
                    CHALLENGE_MODE.TEAM
                  );
                  setSelectedFriends([]);
                  setError("");
                }}
              >
                <Users size={17} />
                <strong>
                  Create Team
                </strong>
              </button>

              <button
                type="button"
                style={{
                  ...styles.modeOption,
                  ...(createMode ===
                  CHALLENGE_MODE.PARTNER
                    ? styles.modeOptionActive
                    : {}),
                }}
                onClick={() => {
                  setCreateMode(
                    CHALLENGE_MODE.PARTNER
                  );

                  setSelectedFriends(
                    (current) =>
                      current.slice(0, 1)
                  );

                  setError("");
                }}
              >
                <UserPlus size={17} />

                <strong>
                  Challenge Partner
                </strong>
              </button>
            </div>

            <div style={styles.stepLabel}>
              1. Select a challenge
            </div>

            {!selectedChallenge ? (
              <button
                type="button"
                style={
                  styles.chooseChallengeBtn
                }
                onClick={() =>
                  setShowChallengeSelection(
                    true
                  )
                }
              >
                <div
                  style={
                    styles.chooseChallengeIcon
                  }
                >
                  <Search size={20} />
                </div>

                <div
                  style={{
                    flex: 1,
                    textAlign: "left",
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      color: "#111827",
                    }}
                  >
                    Choose a challenge
                  </strong>

                  <span
                    style={{
                      display: "block",
                      color: "#6b7280",
                      fontSize: 13,
                      marginTop: 3,
                    }}
                  >
                    Search and select a
                    published challenge.
                  </span>
                </div>

                <ArrowRight
                  size={18}
                  color="#16a34a"
                />
              </button>
            ) : (
              <div
                style={
                  styles.selectedChallengeInfo
                }
              >
                <div>
                  <div
                    style={
                      styles.selectedChallengeTitle
                    }
                  >
                    Selected:{" "}
                    {selectedChallenge.title}
                  </div>

                  <div
                    style={
                      styles.selectedChallengeRequirement
                    }
                  >
                    {getRequirementIcon(
                      selectedChallenge.requirementType ||
                        "photo",
                      16
                    )}

                    Requirement:{" "}
                    {getRequirementLabel(
                      selectedChallenge.requirementType ||
                        "photo"
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  style={
                    styles.changeChallengeBtn
                  }
                  onClick={() =>
                    setShowChallengeSelection(
                      true
                    )
                  }
                >
                  <Search size={15} />
                  Change Challenge
                </button>
              </div>
            )}

            {showChallengeSelection && (
              <div style={{ marginTop: 16 }}>
                <ChallengeSelection
                  challenges={challenges}
                  selectedChallenge={
                    selectedChallenge
                  }
                  onSelect={(challenge) => {
                    setSelectedChallenge(challenge);
                    setShowChallengeSelection(false);
                  }}
                  onBack={() =>
                    setShowChallengeSelection(
                      false
                    )
                  }
                  modeLabel={
                    createMode ===
                    CHALLENGE_MODE.PARTNER
                      ? "Challenge Partner"
                      : "Team Challenge"
                  }
                />
              </div>
            )}

            {selectedChallenge &&
              !showChallengeSelection && (
                <>
                  <div
                    style={styles.stepLabel}
                  >
                    2. Name your team
                  </div>

                  <input
                    value={teamName}
                    onChange={(event) =>
                      setTeamName(
                        event.target.value
                      )
                    }
                    placeholder={`e.g. ${selectedChallenge.title} Warriors`}
                    style={styles.input}
                  />

                  <div
                    style={styles.stepLabel}
                  >
                    3. Malaysia state
                  </div>

                  <select
                    value={effectiveTeamState}
                    onChange={(event) =>
                      setTeamState(
                        event.target.value
                      )
                    }
                    style={
                      styles.stateSelectFull
                    }
                  >
                    <option value="">
                      Select your team state
                    </option>

                    {MALAYSIA_STATES.map(
                      (state) => (
                        <option
                          key={state}
                          value={state}
                        >
                          {state}
                        </option>
                      )
                    )}
                  </select>

                  <div
                    style={styles.stepLabel}
                  >
                    {createMode ===
                    CHALLENGE_MODE.PARTNER
                      ? "4. Choose your partner"
                      : "4. Invite friends"}
                  </div>

                  <div
                    style={
                      styles.minimumNotice
                    }
                  >
                    {createMode ===
                    CHALLENGE_MODE.PARTNER ? (
                      <>
                        <UserPlus size={16} />
                        Choose exactly one
                        friend. Their
                        invitation expires
                        after 12 hours.
                      </>
                    ) : (
                      <>
                        <Users size={16} />
                        Optional: invite as many
                        friends as you like. The team
                        still needs at least 2 accepted
                        members before the challenge
                        can start.
                      </>
                    )}
                  </div>

                  <div
                    style={
                      styles.friendSearch
                    }
                  >
                    <Search
                      size={17}
                      color="#9ca3af"
                    />

                    <input
                      value={friendSearch}
                      onChange={(event) =>
                        setFriendSearch(
                          event.target.value
                        )
                      }
                      placeholder="Search your friends..."
                      style={
                        styles.searchInput
                      }
                    />
                  </div>

                  <div
                    style={
                      styles.friendList
                    }
                  >
                    {filteredFriends.length ===
                    0 ? (
                      <div
                        style={
                          styles.emptySmall
                        }
                      >
                        No friends found. Add
                        and accept a friend
                        first.
                      </div>
                    ) : (
                      filteredFriends.map(
                        (friend) => {
                          const friendId =
                            friend.uid ||
                            friend.id;

                          const selected =
                            selectedFriends.some(
                              (item) =>
                                (item.uid ||
                                  item.id) ===
                                friendId
                            );

                          return (
                            <button
                              key={friendId}
                              type="button"
                              onClick={() =>
                                setSelectedFriends(
                                  (current) =>
                                    createMode ===
                                    CHALLENGE_MODE.PARTNER
                                      ? selected
                                        ? []
                                        : [friend]
                                      : selected
                                      ? current.filter(
                                          (
                                            item
                                          ) =>
                                            (item.uid ||
                                              item.id) !==
                                            friendId
                                        )
                                      : [
                                          ...current,
                                          friend,
                                        ]
                                )
                              }
                              style={{
                                ...styles.friendRow,
                                background:
                                  selected
                                    ? "#f0fdf4"
                                    : "#fff",
                                borderColor:
                                  selected
                                    ? "#86efac"
                                    : "#e5e7eb",
                              }}
                            >
                              <Avatar
                                member={friend}
                              />

                              <div
                                style={
                                  styles.friendInfo
                                }
                              >
                                <div
                                  style={
                                    styles.friendName
                                  }
                                >
                                  {friend.name ||
                                    friend.displayName ||
                                    "Friend"}
                                </div>

                                <div
                                  style={
                                    styles.friendEmail
                                  }
                                >
                                  {friend.email ||
                                    ""}
                                </div>
                              </div>

                              {selected ? (
                                <CheckCircle2
                                  size={21}
                                  color="#16a34a"
                                />
                              ) : (
                                <UserPlus
                                  size={19}
                                  color="#6b7280"
                                />
                              )}
                            </button>
                          );
                        }
                      )
                    )}
                  </div>

                  <div
                    style={
                      styles.createFooter
                    }
                  >
                    <div>
                      <strong>
                        {selectedFriends.length}
                      </strong>{" "}
                      {createMode ===
                      CHALLENGE_MODE.PARTNER
                        ? "partner selected"
                        : `friend${
                            selectedFriends.length ===
                            1
                              ? ""
                              : "s"
                          } invited`}
                    </div>

                    <button
                      type="button"
                      style={{
                        ...styles.createBtn,
                        opacity: saving
                          ? 0.6
                          : 1,
                      }}
                      disabled={saving}
                      onClick={
                        handleCreateTeam
                      }
                    >
                      {saving
                        ? "Creating..."
                        : createMode ===
                          CHALLENGE_MODE.PARTNER
                        ? "Send Partner Invitation"
                        : "Create Team"}
                    </button>
                  </div>
                </>
              )}
          </div>
        )}
      </div>
    </Layout>
  );
}

const styles = {
  sectionHeading: {
    margin: 0,
    color: "#111827",
    fontSize: 20,
    fontWeight: 800,
  },

  findHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 14,
  },

  filterBar: {
    display: "grid",
    gridTemplateColumns:
      "1fr 220px",
    gap: 10,
    marginBottom: 10,
  },

  stateSelect: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: 11,
    background: "#fff",
    padding: "11px 12px",
    fontSize: 14,
    color: "#374151",
    outline: "none",
  },

  stateSelectFull: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: 11,
    background: "#fff",
    padding: "11px 13px",
    fontSize: 14,
    color: "#374151",
    outline: "none",
  },

  findCount: {
    color: "#6b7280",
    fontSize: 13,
    marginBottom: 12,
  },

  discoverGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 14,
  },

  discoverCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 18,
  },

  discoverTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },

  statePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: "#f0fdf4",
    color: "#166534",
    borderRadius: 999,
    padding: "5px 9px",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  discoverMetaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    color: "#6b7280",
    fontSize: 12.5,
    marginTop: 13,
  },

  creatorRow: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    marginTop: 15,
    paddingTop: 13,
    borderTop: "1px solid #f3f4f6",
  },

  creatorLabel: {
    display: "block",
    color: "#9ca3af",
    fontSize: 11.5,
    marginBottom: 1,
  },

  discoverFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 15,
  },

  myRequestBox: {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 15,
    marginBottom: 16,
  },

  myRequestRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 10,
    marginTop: 10,
    borderTop: "1px solid #e5e7eb",
  },

  content: {
    padding: "28px 32px 48px",
    maxWidth: 1180,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },

  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "transparent",
    border: "none",
    color: "#374151",
    fontSize: 14.5,
    fontWeight: 500,
    cursor: "pointer",
    padding: 0,
    marginBottom: 16,
  },

  headRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 20,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: 800,
    margin: 0,
    color: "#111827",
  },

  pageSubtitle: {
    color: "#6b7280",
    marginTop: 6,
    marginBottom: 24,
    fontSize: 14.5,
    maxWidth: 780,
    lineHeight: 1.55,
  },

  createBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },

  myTeamsIntro: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 2,
  },

  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    borderRadius: 12,
    padding: "12px 16px",
    position: "fixed",
    left: "50%",
    bottom: 24,
    transform: "translateX(-50%)",
    zIndex: 99999,
    width: "min(560px, calc(100vw - 32px))",
    boxSizing: "border-box",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
    fontSize: 14,
    lineHeight: 1.45,
    fontWeight: 600,
  },

  success: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    borderRadius: 12,
    padding: "11px 14px",
    marginBottom: 16,
  },

  inviteBox: {
    background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
    border: "1px solid #dbe4ee",
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
  },

  inviteHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },

  inviteHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },

  inviteHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: "#eaf7ee",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  inviteCount: {
    minWidth: 30,
    height: 30,
    padding: "0 9px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 13,
    flexShrink: 0,
  },

  inviteList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  inviteCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
  },

  inviteCardTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  },

  inviteIdentity: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
    width: "100%",
  },

  inviteAvatar: {
    width: 46,
    height: 46,
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#15803d",
    border: "3px solid #f0fdf4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 800,
    flexShrink: 0,
  },

  inviteMain: {
    minWidth: 0,
    flex: 1,
  },

  inviteBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    borderRadius: 999,
    padding: "4px 9px",
    fontSize: 11.5,
    fontWeight: 700,
    marginBottom: 7,
  },

  inviteTeam: {
    fontWeight: 800,
    color: "#111827",
    fontSize: 16,
    lineHeight: 1.3,
  },

  inviteChallenge: {
    fontSize: "13px",
    color: "#6b7280",
    marginTop: 5,
    lineHeight: 1.45,
  },

  inviteFrom: {
    color: "#374151",
  },

  inviteChallengePanel: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    background: "#f8fafc",
    border: "1px solid #eef2f7",
    borderRadius: 12,
    padding: "11px 12px",
    marginTop: 14,
  },

  inviteChallengeIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    background: "#fff7ed",
    color: "#ea580c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  inviteChallengeInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
    flex: 1,
  },

  inviteChallengeLabel: {
    fontSize: 10.5,
    color: "#9ca3af",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },

  inviteChallengeTitle: {
    fontSize: 13.5,
    color: "#111827",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  inviteExpiry: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    color: "#92400e",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 999,
    padding: "5px 8px",
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },

  inviteCardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    marginTop: 14,
    paddingTop: 12,
    borderTop: "1px solid #f3f4f6",
  },

  inviteHint: {
    color: "#9ca3af",
    fontSize: 11.5,
    lineHeight: 1.4,
    flex: 1,
  },

  inviteActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },

  btnFilledSmall: {
    border: "none",
    borderRadius: 999,
    background: "#16a34a",
    color: "#fff",
    padding: "9px 14px",
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    boxShadow: "0 2px 6px rgba(22, 163, 74, 0.18)",
  },

  btnOutlineSmall: {
    border: "1px solid #d1d5db",
    borderRadius: 999,
    background: "#fff",
    color: "#374151",
    padding: "9px 14px",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: 16,
    marginBottom: 24,
  },

  summaryCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 20,
  },

  summaryHeadRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "#374151",
    fontSize: 14,
  },

  summaryValue: {
    fontSize: 30,
    fontWeight: 800,
    color: "#111827",
    marginTop: 8,
  },

  summarySub: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 4,
  },

  tabBar: {
    display: "inline-flex",
    background: "#e5e7eb",
    borderRadius: 999,
    padding: 4,
    gap: 4,
    marginBottom: 24,
  },

  tabBtn: {
    border: "none",
    borderRadius: 999,
    padding: "9px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },

  teamList: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },

  teamCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    overflow: "hidden",
  },

  teamTopBar: {
    height: 7,
    width: "100%",
  },

  teamBody: {
    padding: 28,
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },

  teamHeadRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
  },

  teamName: {
    fontSize: 21,
    fontWeight: 800,
    color: "#111827",
  },

  teamChallenge: {
    color: "#6b7280",
    fontSize: 14,
    marginTop: 7,
  },

  teamState: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    color: "#15803d",
    fontSize: 13,
    fontWeight: 700,
    marginTop: 9,
  },

  statusPill: {
    borderRadius: 999,
    padding: "8px 13px",
    fontSize: 12.5,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  statusWaiting: {
    background: "#fef3c7",
    color: "#92400e",
  },

  statusActive: {
    background: "#dbeafe",
    color: "#1d4ed8",
  },

  statusCompleted: {
    background: "#dcfce7",
    color: "#166534",
  },

  statusEnded: {
    background: "#f3f4f6",
    color: "#4b5563",
  },

  requirementSummary: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 16,
  },

  requirementSummaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    background: "#dcfce7",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  requirementSummaryTitle: {
    fontWeight: 750,
    color: "#111827",
    fontSize: 14,
  },

  requirementSummaryText: {
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 1.45,
    marginTop: 3,
  },

  progressSection: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  progressHeadRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  progressLabel: {
    fontSize: 15,
    fontWeight: 600,
    color: "#111827",
  },

  progressPts: {
    fontSize: 14,
    fontWeight: 700,
    color: "#16a34a",
  },

  progressTrack: {
    width: "100%",
    height: 9,
    background: "#f3f4f6",
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    background: "#16a34a",
    borderRadius: 999,
    transition:
      "width 0.25s ease",
  },

  progressCaption: {
    fontSize: 13,
    color: "#9ca3af",
  },

  waitingBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    background: "#fffbeb",
    border: "1px solid #fde68a",
    color: "#92400e",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 13.5,
    lineHeight: 1.45,
  },

  requirementActionBox: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 14,
    padding: 16,
  },

  requirementActionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#166534",
    fontWeight: 800,
    fontSize: 15,
  },

  requirementDescription: {
    color: "#4b5563",
    fontSize: 13.5,
    lineHeight: 1.5,
    margin: "10px 0 13px",
  },

  proofCompleted: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
    color: "#15803d",
    background: "#dcfce7",
    borderRadius: 10,
    padding: "10px 12px",
    fontWeight: 700,
    fontSize: 13.5,
  },

  proofTime: {
    color: "#6b7280",
    fontWeight: 500,
    marginLeft: 4,
  },

  membersSection: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  membersLabel: {
    fontSize: 15,
    fontWeight: 600,
    color: "#111827",
  },

  memberRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },

  memberBarWrap: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  memberNameRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  memberName: {
    fontSize: 14.5,
    fontWeight: 600,
    color: "#111827",
    display: "flex",
    alignItems: "center",
    gap: 7,
  },

  youPill: {
    fontSize: 10.5,
    background: "#dcfce7",
    color: "#15803d",
    padding: "2px 7px",
    borderRadius: 999,
    fontWeight: 700,
  },

  memberProgress: {
    fontSize: 13.5,
    fontWeight: 600,
    color: "#9ca3af",
  },

  completedText: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 13,
    fontWeight: 700,
    color: "#16a34a",
  },

  actionsRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },

  btnOutline: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 999,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
    cursor: "pointer",
  },

  btnFilled: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    background: "#16a34a",
    border: "none",
    borderRadius: 999,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 700,
    color: "#fff",
    cursor: "pointer",
  },

  disabledStartText: {
    color: "#92400e",
    fontSize: 13,
    background: "#fffbeb",
    padding: "8px 11px",
    borderRadius: 9,
  },

  doneActionText: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: "#15803d",
    background: "#f0fdf4",
    padding: "9px 12px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
  },

  completedBanner: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 13.5,
    fontWeight: 600,
  },

  endedBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: 9,
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    color: "#4b5563",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 13.5,
    lineHeight: 1.45,
  },

  finishedTime: {
    color: "#9ca3af",
    fontSize: 12.5,
  },

  pendingInviteSection: {
    marginTop: 18,
    paddingTop: 16,
    borderTop: "1px solid #e5e7eb",
  },

  pendingInviteRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    padding: "10px 12px",
    marginTop: 8,
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    background: "#f9fafb",
  },

  pendingInviteName: {
    fontWeight: 700,
    color: "#111827",
  },

  pendingInviteMeta: {
    marginTop: 3,
    fontSize: 12,
    color: "#6b7280",
  },

  requestPerson: {
    display: "flex",
    alignItems: "center",
    gap: 9,
  },

  cancelInviteBtn: {
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#b91c1c",
    borderRadius: 8,
    padding: "8px 10px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  deleteTeamBtn: {
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#b91c1c",
    borderRadius: 999,
    padding: "10px 16px",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
  },

  empty: {
    minHeight: 220,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    color: "#9ca3af",
    textAlign: "center",
    border: "1px dashed #e5e7eb",
    borderRadius: 16,
    padding: 30,
  },

  signedOutBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    color: "#6b7280",
    textAlign: "center",
  },

  createPanel: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 24,
    marginBottom: 32,
  },

  createPanelHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 20,
    marginBottom: 22,
  },

  panelTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 20,
    fontWeight: 800,
  },

  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    border: "1px solid #e5e7eb",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  stepLabel: {
    fontSize: 14,
    fontWeight: 800,
    color: "#111827",
    margin: "20px 0 12px",
  },

  requirementPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    color: "#166534",
    background: "#dcfce7",
    borderRadius: 999,
    padding: "5px 9px",
    fontSize: 12,
    fontWeight: 700,
  },

  modeSelector: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: 4,
    background: "#f3f4f6",
    borderRadius: 11,
    marginBottom: 22,
  },

  modeOption: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    textAlign: "center",
    border: "none",
    background: "transparent",
    borderRadius: 8,
    padding: "9px 14px",
    cursor: "pointer",
    color: "#6b7280",
    fontSize: 13.5,
  },

  modeOptionActive: {
    background: "#fff",
    color: "#166534",
    boxShadow:
      "0 1px 3px rgba(0,0,0,0.08)",
  },

  selectedChallengeInfo: {
    marginTop: 18,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 13,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  selectedChallengeTitle: {
    fontWeight: 750,
    color: "#111827",
  },

  selectedChallengeRequirement: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    color: "#15803d",
    fontWeight: 700,
    fontSize: 13,
    marginTop: 4,
  },

  minimumNotice: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    borderRadius: 10,
    padding: "9px 11px",
    fontSize: 13,
    marginBottom: 10,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: 11,
    padding: "11px 13px",
    fontSize: 14,
    outline: "none",
  },

  friendList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 12,
    maxHeight: 240,
    overflowY: "auto",
  },

  friendRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    textAlign: "left",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 10,
    cursor: "pointer",
  },

  friendInfo: {
    flex: 1,
    minWidth: 0,
  },

  friendName: {
    fontWeight: 650,
    color: "#111827",
  },

  friendEmail: {
    fontSize: 12.5,
    color: "#9ca3af",
    marginTop: 2,
  },

  createFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginTop: 22,
    paddingTop: 18,
    borderTop: "1px solid #f3f4f6",
    color: "#6b7280",
    fontSize: 13.5,
  },

  chooseChallengeBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 12,
    border: "1px dashed #86efac",
    background: "#f0fdf4",
    borderRadius: 14,
    padding: 14,
    cursor: "pointer",
    textAlign: "left",
  },

  chooseChallengeIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    background: "#dcfce7",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  changeChallengeBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "1px solid #bbf7d0",
    background: "#fff",
    color: "#166534",
    borderRadius: 9,
    padding: "8px 11px",
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  sectionTitle: {
    color: "#111827",
    fontWeight: 750,
    fontSize: 15,
  },

  sectionSubtitle: {
    color: "#6b7280",
    fontSize: 13.5,
    marginTop: 4,
    lineHeight: 1.45,
  },

  emptySmall: {
    padding: 20,
    textAlign: "center",
    color: "#9ca3af",
    gridColumn: "1 / -1",
  },

  avatarFallback: {
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    flexShrink: 0,
  },

  loading: {
    minHeight: "60vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280",
  },

  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    padding: "11px 0",
    fontSize: 14,
  },

  friendSearch: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #d1d5db",
    borderRadius: 11,
    padding: "0 12px",
    background: "#fff",
    flex: 1,
  },

  // ==========================================================
  // UNUSED STYLE KEYS
  // ==========================================================
  // Kept for reference. Nothing references these: findBtn and
  // smallFindBtn were replaced by btnFilled, optionalText and
  // inviteActionsSmall were never wired up, and the challenge*
  // group belongs to the commented-out ChallengeCard near the
  // top of this file. Uncomment a key before using it again.
  // ==========================================================

  // findBtn: {
  //   display: "flex",
  //   alignItems: "center",
  //   gap: 7,
  //   background: "#16a34a",
  //   color: "#fff",
  //   border: "none",
  //   borderRadius: 10,
  //   padding: "10px 16px",
  //   fontSize: 14,
  //   fontWeight: 700,
  //   cursor: "pointer",
  // },

  // smallFindBtn: {
  //   display: "inline-flex",
  //   alignItems: "center",
  //   gap: 6,
  //   background: "#fff",
  //   color: "#166534",
  //   border: "1px solid #bbf7d0",
  //   borderRadius: 9,
  //   padding: "8px 12px",
  //   fontSize: 13,
  //   fontWeight: 700,
  //   cursor: "pointer",
  // },

  // optionalText: {
  //   color: "#9ca3af",
  //   fontWeight: 500,
  //   fontSize: 12,
  // },

  // inviteActionsSmall: {
  //   display: "flex",
  //   gap: 8,
  // },

  // challengeGrid: {
  //   display: "grid",
  //   gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  //   gap: 14,
  // },

  // challengeCard: {
  //   textAlign: "left",
  //   background: "#fff",
  //   border: "1px solid #e5e7eb",
  //   borderRadius: 15,
  //   padding: 17,
  //   cursor: "pointer",
  // },

  // challengeCardTop: {
  //   display: "flex",
  //   justifyContent: "space-between",
  //   alignItems: "center",
  //   marginBottom: 12,
  // },

  // challengeIcon: {
  //   width: 38,
  //   height: 38,
  //   borderRadius: 11,
  //   background: "#f0fdf4",
  //   color: "#16a34a",
  //   display: "flex",
  //   alignItems: "center",
  //   justifyContent: "center",
  // },

  // challengeTitle: {
  //   color: "#111827",
  //   fontWeight: 750,
  //   fontSize: 16,
  // },

  // challengeDescription: {
  //   color: "#6b7280",
  //   fontSize: 13.5,
  //   lineHeight: 1.5,
  //   marginTop: 6,
  //   minHeight: 42,
  // },

  // challengeMeta: {
  //   display: "flex",
  //   alignItems: "center",
  //   gap: 10,
  //   marginTop: 13,
  //   fontSize: 12.5,
  //   color: "#374151",
  //   flexWrap: "wrap",
  // },

  // metaItem: {
  //   display: "inline-flex",
  //   alignItems: "center",
  //   gap: 4,
  // },

  // categoryPill: {
  //   background: "#f3f4f6",
  //   borderRadius: 999,
  //   padding: "4px 9px",
  //   fontWeight: 600,
  // },

  // challengeDate: {
  //   display: "flex",
  //   alignItems: "center",
  //   gap: 5,
  //   marginTop: 9,
  //   color: "#9ca3af",
  //   fontSize: 12.5,
  // },
};

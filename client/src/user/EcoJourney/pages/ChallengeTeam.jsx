import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  Users,
  Trophy,
  UserPlus,
  MessageCircle,
  CheckCircle2,
  Clock3,
  X,
  Search,
  Target,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import Layout from "../../../shared/components/Layout";
import { useCurrentUser } from "../../../firebase/useCurrentUser";
import {
  listenToAvailableChallenges,
  listenToMyChallengeTeams,
  listenToMyTeamInvites,
  createChallengeTeam,
  acceptChallengeTeamInvite,
  declineChallengeTeamInvite,
  updateMyTeamProgress,
} from "../../../firebase/challengeTeamService";
import { listenToFriends } from "../../../firebase/friendService";

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

function Avatar({ member, size = 42 }) {
  const name = member?.name || member?.displayName || "U";
  const photo =
    member?.photoURL ||
    member?.profile_photo_url ||
    member?.profilePhotoUrl ||
    "";

  return photo ? (
    <img
      src={photo}
      alt={name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
      }}
      onError={(event) => {
        event.currentTarget.style.display = "none";
        event.currentTarget.nextSibling.style.display = "flex";
      }}
    />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#dcfce7",
        color: "#15803d",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        flexShrink: 0,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function ChallengeCard({ challenge, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(challenge)}
      style={{
        ...styles.challengeCard,
        borderColor: selected ? "#16a34a" : "#e5e7eb",
        boxShadow: selected ? "0 0 0 2px #bbf7d0" : "none",
      }}
    >
      <div style={styles.challengeCardTop}>
        <div style={styles.challengeIcon}>
          <Trophy size={20} />
        </div>
        {selected && <CheckCircle2 size={22} color="#16a34a" />}
      </div>

      <div style={styles.challengeTitle}>{challenge.title}</div>
      <div style={styles.challengeDescription}>{challenge.description}</div>

      <div style={styles.challengeMeta}>
        <span>
          <Target size={14} />
          {challenge.target} {challenge.unit}
        </span>
        {challenge.category && <span>{challenge.category}</span>}
      </div>

      {challenge.endDate && (
        <div style={styles.challengeDate}>
          <CalendarDays size={14} />
          Ends {formatDate(challenge.endDate)}
        </div>
      )}
    </button>
  );
}

function TeamCard({ team, onProgress, onChat }) {
  const members = Array.isArray(team.members) ? team.members : [];
  const target = Number(team.challengeTarget || 1);
  const completed = members.filter((m) => m.completed).length;
  const pct = members.length
    ? Math.round((completed / members.length) * 100)
    : 0;

  return (
    <div style={styles.teamCard}>
      <div style={styles.teamTopBar} />

      <div style={styles.teamBody}>
        <div style={styles.teamHeadRow}>
          <div>
            <div style={styles.teamName}>{team.teamName}</div>
            <div style={styles.teamChallenge}>
              Challenge: {team.challengeTitle}
            </div>
          </div>

          <span
            style={{
              ...styles.statusPill,
              background: team.status === "Completed" ? "#e0e7ff" : "#dcfce7",
              color: team.status === "Completed" ? "#4338ca" : "#15803d",
            }}
          >
            {team.status || "Active"}
          </span>
        </div>

        <div style={styles.progressSection}>
          <div style={styles.progressHeadRow}>
            <span style={styles.progressLabel}>Team Progress</span>
            <span style={styles.progressPts}>
              {completed} / {members.length} members
            </span>
          </div>

          <div style={styles.progressTrack}>
            <div
              style={{
                ...styles.progressFill,
                width: `${pct}%`,
              }}
            />
          </div>

          <div style={styles.progressCaption}>
            {pct}% of the team has completed the challenge
          </div>
        </div>

        <div style={styles.membersSection}>
          <div style={styles.membersLabel}>Team Members</div>

          {members.map((member) => {
            const memberProgress = Number(member.progress || 0);
            const memberPct = Math.min(
              100,
              Math.round((memberProgress / target) * 100)
            );

            return (
              <div key={member.uid} style={styles.memberRow}>
                <Avatar member={member} />

                <div style={styles.memberBarWrap}>
                  <div style={styles.memberNameRow}>
                    <span style={styles.memberName}>
                      {member.name || member.displayName || "Member"}
                    </span>

                    {member.completed ? (
                      <span style={styles.completedText}>
                        <CheckCircle2 size={14} />
                        Completed
                      </span>
                    ) : (
                      <span style={styles.memberProgress}>
                        {memberPct}%
                      </span>
                    )}
                  </div>

                  <div style={styles.progressTrack}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${memberPct}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={styles.actionsRow}>
          {team.status !== "Completed" && (
            <button
              type="button"
              style={styles.btnFilled}
              onClick={() => onProgress(team)}
            >
              <CheckCircle2 size={16} />
              Update My Progress
            </button>
          )}

          <button
            type="button"
            style={styles.btnOutline}
            onClick={() => onChat(team)}
          >
            <MessageCircle size={16} />
            Team Chat
          </button>
        </div>

        {team.status === "Completed" && (
          <div style={styles.completedBanner}>
            <Trophy size={18} />
            Everyone completed this challenge together. Team achievement
            eligibility has been reached.
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChallengeTeam({ onNavigate }) {
  const { authUser, profile, loading: userLoading } = useCurrentUser();

  const [tab, setTab] = useState("My Teams");
  const [challenges, setChallenges] = useState([]);
  const [teams, setTeams] = useState([]);
  const [friends, setFriends] = useState([]);
  const [invites, setInvites] = useState([]);

  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [teamName, setTeamName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!authUser?.uid) return undefined;

    const unsubChallenges = listenToAvailableChallenges(setChallenges);
    const unsubTeams = listenToMyChallengeTeams(authUser.uid, setTeams);
    const unsubInvites = listenToMyTeamInvites(authUser.uid, setInvites);

    const unsubFriends = listenToFriends(authUser.uid, setFriends);

    setLoading(false);

    return () => {
      unsubChallenges?.();
      unsubTeams?.();
      unsubInvites?.();
      unsubFriends?.();
    };
  }, [authUser?.uid]);

  const filteredFriends = useMemo(() => {
    const q = friendSearch.trim().toLowerCase();

    if (!q) return friends;

    return friends.filter((friend) => {
      const name = String(friend.name || friend.displayName || "").toLowerCase();
      const email = String(friend.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [friends, friendSearch]);

  const summary = useMemo(() => {
    const active = teams.filter((team) => team.status !== "Completed").length;
    const completed = teams.filter((team) => team.status === "Completed").length;

    return {
      active,
      completed,
      total: teams.length,
    };
  }, [teams]);

  function toggleFriend(friend) {
    const uid = friend.uid || friend.id;
    if (!uid) return;

    setSelectedFriends((current) =>
      current.some((item) => (item.uid || item.id) === uid)
        ? current.filter((item) => (item.uid || item.id) !== uid)
        : [...current, friend]
    );
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

    try {
      setSaving(true);

      await createChallengeTeam({
        challenge: selectedChallenge,
        teamName,
        invitedFriends: selectedFriends,
      });

      setSuccess(
        selectedFriends.length
          ? "Team created and invitations sent."
          : "Team created successfully."
      );

      setTeamName("");
      setSelectedFriends([]);
      setSelectedChallenge(null);
      setShowCreate(false);
      setTab("My Teams");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to create the team.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAccept(invite) {
    try {
      setError("");
      await acceptChallengeTeamInvite(invite);
      setSuccess(`You joined ${invite.teamName}.`);
      setTab("My Teams");
    } catch (err) {
      setError(err?.message || "Unable to accept invitation.");
    }
  }

  async function handleDecline(invite) {
    try {
      setError("");
      await declineChallengeTeamInvite(invite);
    } catch (err) {
      setError(err?.message || "Unable to decline invitation.");
    }
  }

  async function handleProgress(team) {
    const currentMember = (team.members || []).find(
      (member) => member.uid === authUser?.uid
    );

    const current = Number(currentMember?.progress || 0);
    const target = Number(team.challengeTarget || 1);

    const input = window.prompt(
      `Enter your progress (${team.challengeUnit || "progress"}). Target: ${target}`,
      String(current)
    );

    if (input === null) return;

    try {
      const result = await updateMyTeamProgress(team.id, Number(input));

      setSuccess(
        result.teamCompleted
          ? "Everyone has completed the challenge! The team is now completed."
          : result.completed
            ? "Your challenge progress is completed."
            : "Your team progress has been updated."
      );
    } catch (err) {
      setError(err?.message || "Unable to update progress.");
    }
  }

  function handleChat(team) {
    // Reuse the existing chat route. The teamId is passed so the chat module
    // can later create/find the challenge-specific group chat.
    onNavigate?.("/community/chat", team.id);
  }

  if (userLoading || loading) {
    return (
      <Layout active="community" user={profile || authUser} onNavigate={onNavigate}>
        <div style={styles.loading}>Loading Challenge Teams…</div>
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
          onClick={() => onNavigate?.("/community")}
          style={styles.backBtn}
        >
          <ChevronLeft size={16} />
          Back
        </button>

        <div style={styles.headRow}>
          <div>
            <h1 style={styles.pageTitle}>Challenge Team Mode</h1>
            <p style={styles.pageSubtitle}>
              Choose a challenge, invite friends, and complete it together.
            </p>
          </div>

          <button
            type="button"
            style={styles.createBtn}
            onClick={() => {
              setShowCreate(true);
              setError("");
              setSuccess("");
            }}
          >
            <UserPlus size={16} />
            Start Team
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        {invites.length > 0 && (
          <div style={styles.inviteBox}>
            <div style={styles.inviteHeader}>
              <div>
                <div style={styles.sectionTitle}>Team Invitations</div>
                <div style={styles.sectionSubtitle}>
                  Friends invited you to join these temporary challenge teams.
                </div>
              </div>
              <span style={styles.inviteCount}>{invites.length}</span>
            </div>

            {invites.map((invite) => (
              <div key={invite.id} style={styles.inviteRow}>
                <div>
                  <div style={styles.inviteTeam}>{invite.teamName}</div>
                  <div style={styles.inviteChallenge}>
                    {invite.fromName || "A friend"} invited you to{" "}
                    {invite.challengeTitle}
                  </div>
                </div>

                <div style={styles.inviteActions}>
                  <button
                    type="button"
                    style={styles.btnFilledSmall}
                    onClick={() => handleAccept(invite)}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    style={styles.btnOutlineSmall}
                    onClick={() => handleDecline(invite)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryHeadRow}>
              <span>Active Teams</span>
              <Users size={18} color="#2563eb" />
            </div>
            <div style={styles.summaryValue}>{summary.active}</div>
            <div style={styles.summarySub}>Current temporary teams</div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryHeadRow}>
              <span>Completed Teams</span>
              <Trophy size={18} color="#16a34a" />
            </div>
            <div style={styles.summaryValue}>{summary.completed}</div>
            <div style={styles.summarySub}>Challenges completed together</div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryHeadRow}>
              <span>Available Challenges</span>
              <Target size={18} color="#f97316" />
            </div>
            <div style={styles.summaryValue}>{challenges.length}</div>
            <div style={styles.summarySub}>Published challenges</div>
          </div>
        </div>

        <div style={styles.tabBar}>
          {["My Teams", "Choose Challenge", "Completed"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              style={{
                ...styles.tabBtn,
                background: tab === item ? "#fff" : "transparent",
                boxShadow:
                  tab === item
                    ? "0 1px 2px rgba(0,0,0,0.08)"
                    : "none",
                color: tab === item ? "#111827" : "#6b7280",
              }}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === "My Teams" && (
          <div style={styles.teamList}>
            {teams.filter((team) => team.status !== "Completed").length === 0 ? (
              <div style={styles.empty}>
                <Users size={30} />
                <strong>No active teams yet</strong>
                <span>Select a challenge and invite your friends to start one.</span>
                <button
                  type="button"
                  style={styles.btnFilled}
                  onClick={() => {
                    setTab("Choose Challenge");
                    setShowCreate(true);
                  }}
                >
                  Choose a Challenge
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              teams
                .filter((team) => team.status !== "Completed")
                .map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    onProgress={handleProgress}
                    onChat={handleChat}
                  />
                ))
            )}
          </div>
        )}

        {tab === "Completed" && (
          <div style={styles.teamList}>
            {teams.filter((team) => team.status === "Completed").length === 0 ? (
              <div style={styles.empty}>
                <Trophy size={30} />
                <strong>No completed team challenges yet.</strong>
                <span>Finish a challenge with your whole team to see it here.</span>
              </div>
            ) : (
              teams
                .filter((team) => team.status === "Completed")
                .map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    onProgress={handleProgress}
                    onChat={handleChat}
                  />
                ))
            )}
          </div>
        )}

        {(tab === "Choose Challenge" || showCreate) && (
          <div style={styles.createPanel}>
            <div style={styles.createPanelHeader}>
              <div>
                <h2 style={styles.panelTitle}>Start a Temporary Team</h2>
                <p style={styles.sectionSubtitle}>
                  Select one published challenge. This team is created only
                  for that challenge.
                </p>
              </div>

              <button
                type="button"
                style={styles.closeBtn}
                onClick={() => setShowCreate(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={styles.stepLabel}>1. Select a challenge</div>

            <div style={styles.challengeGrid}>
              {challenges.length === 0 ? (
                <div style={styles.emptySmall}>
                  No published challenges are available yet.
                </div>
              ) : (
                challenges.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    selected={selectedChallenge?.id === challenge.id}
                    onSelect={setSelectedChallenge}
                  />
                ))
              )}
            </div>

            {selectedChallenge && (
              <>
                <div style={styles.stepLabel}>2. Name your team</div>

                <input
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  placeholder={`e.g. ${selectedChallenge.title} Warriors`}
                  style={styles.input}
                />

                <div style={styles.stepLabel}>3. Invite friends</div>

                <div style={styles.friendSearch}>
                  <Search size={17} color="#9ca3af" />
                  <input
                    value={friendSearch}
                    onChange={(event) => setFriendSearch(event.target.value)}
                    placeholder="Search your friends..."
                    style={styles.searchInput}
                  />
                </div>

                <div style={styles.selectedFriendRow}>
                  {selectedFriends.map((friend) => (
                    <button
                      type="button"
                      key={friend.uid || friend.id}
                      style={styles.selectedFriend}
                      onClick={() => toggleFriend(friend)}
                    >
                      <Avatar member={friend} size={30} />
                      {friend.name || friend.displayName || "Friend"}
                      <X size={14} />
                    </button>
                  ))}
                </div>

                <div style={styles.friendList}>
                  {filteredFriends.length === 0 ? (
                    <div style={styles.emptySmall}>
                      No friends found. Your Friends module needs to have at
                      least one accepted friend first.
                    </div>
                  ) : (
                    filteredFriends.map((friend) => {
                      const friendId = friend.uid || friend.id;
                      const selected = selectedFriends.some(
                        (item) => (item.uid || item.id) === friendId
                      );

                      return (
                        <button
                          type="button"
                          key={friendId}
                          onClick={() => toggleFriend(friend)}
                          style={{
                            ...styles.friendRow,
                            background: selected ? "#f0fdf4" : "#fff",
                            borderColor: selected ? "#86efac" : "#e5e7eb",
                          }}
                        >
                          <Avatar member={friend} />

                          <div style={styles.friendInfo}>
                            <div style={styles.friendName}>
                              {friend.name || friend.displayName || "Friend"}
                            </div>
                            <div style={styles.friendEmail}>
                              {friend.email || ""}
                            </div>
                          </div>

                          {selected ? (
                            <CheckCircle2 size={21} color="#16a34a" />
                          ) : (
                            <UserPlus size={19} color="#6b7280" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                <div style={styles.createFooter}>
                  <div>
                    <strong>{selectedFriends.length}</strong> friend
                    {selectedFriends.length !== 1 ? "s" : ""} selected
                  </div>

                  <button
                    type="button"
                    style={{
                      ...styles.createBtn,
                      opacity: saving ? 0.6 : 1,
                    }}
                    disabled={saving}
                    onClick={handleCreateTeam}
                  >
                    {saving ? "Creating…" : "Create Team & Invite"}
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
  content: {
    padding: "28px 32px 48px",
    maxWidth: 1180,
    width: "100%",
    margin: "0 auto",
    textAlign: "left",
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
  },
  createBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    borderRadius: 12,
    padding: "11px 14px",
    marginBottom: 16,
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
    background: "#fff",
    border: "1px solid #dbeafe",
    borderRadius: 16,
    padding: 20,
    marginBottom: 22,
  },
  inviteHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  inviteCount: {
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    background: "#dbeafe",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },
  inviteRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "14px 0",
    borderTop: "1px solid #f3f4f6",
  },
  inviteTeam: {
    fontWeight: 700,
    color: "#111827",
  },
  inviteChallenge: {
    fontSize: 13.5,
    color: "#6b7280",
    marginTop: 4,
  },
  inviteActions: {
    display: "flex",
    gap: 8,
    flexShrink: 0,
  },
  btnFilledSmall: {
    border: "none",
    borderRadius: 999,
    background: "#111827",
    color: "#fff",
    padding: "8px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnOutlineSmall: {
    border: "1px solid #e5e7eb",
    borderRadius: 999,
    background: "#fff",
    color: "#374151",
    padding: "8px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
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
    gap: 20,
    paddingBottom: 32,
  },
  teamCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    overflow: "hidden",
  },
  teamTopBar: {
    height: 6,
    background: "#22c55e",
  },
  teamBody: {
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 22,
  },
  teamHeadRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 20,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
  },
  teamChallenge: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  statusPill: {
    fontSize: 12.5,
    fontWeight: 600,
    padding: "5px 12px",
    borderRadius: 999,
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
    height: 8,
    background: "#f3f4f6",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "#111827",
    borderRadius: 999,
    transition: "width 0.2s ease",
  },
  progressCaption: {
    fontSize: 13,
    color: "#9ca3af",
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
  },
  memberProgress: {
    fontSize: 13.5,
    fontWeight: 600,
    color: "#16a34a",
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
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#111827",
    border: "none",
    borderRadius: 999,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    cursor: "pointer",
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
  empty: {
    minHeight: 220,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    color: "#9ca3af",
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
  challengeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  },
  challengeCard: {
    textAlign: "left",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 15,
    padding: 17,
    cursor: "pointer",
  },
  challengeCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  challengeIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    background: "#f0fdf4",
    color: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  challengeTitle: {
    color: "#111827",
    fontWeight: 750,
    fontSize: 16,
  },
  challengeDescription: {
    color: "#6b7280",
    fontSize: 13.5,
    lineHeight: 1.5,
    marginTop: 6,
    minHeight: 42,
  },
  challengeMeta: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 13,
    fontSize: 12.5,
    color: "#374151",
  },
  challengeMeta: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 13,
    fontSize: 12.5,
    color: "#374151",
  },
  challengeMetaSpan: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  challengeDate: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    marginTop: 9,
    color: "#9ca3af",
    fontSize: 12.5,
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
  friendSearch: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #d1d5db",
    borderRadius: 11,
    padding: "0 12px",
  },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    padding: "11px 0",
    fontSize: 14,
  },
  selectedFriendRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    minHeight: 4,
  },
  selectedFriend: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
    borderRadius: 999,
    padding: "4px 9px 4px 5px",
    cursor: "pointer",
    color: "#166534",
    fontWeight: 600,
  },
  friendList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 12,
    maxHeight: 280,
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
  sectionTitle: {
    color: "#111827",
    fontWeight: 750,
    fontSize: 15,
  },
  sectionSubtitle: {
    color: "#6b7280",
    fontSize: 13.5,
    marginTop: 4,
  },
  emptySmall: {
    padding: 30,
    textAlign: "center",
    color: "#9ca3af",
    gridColumn: "1 / -1",
  },
  loading: {
    minHeight: "60vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280",
  },
};

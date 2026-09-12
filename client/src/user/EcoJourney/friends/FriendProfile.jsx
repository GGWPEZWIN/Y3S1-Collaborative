import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Leaf,
  Plane,
  Trophy,
  Recycle,
  Target,
  MessageCircle,
  Trash2,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import Layout from "../../../shared/components/Layout";
import { db } from "../../../firebase/config";
import { useCurrentUser } from "../../../firebase/useCurrentUser";
import { createOrGetDirectChat } from "../../../firebase/chatService";
import { removeFriend } from "../../../firebase/friendService";

function getDateValue(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatMemberSince(value) {
  const date = getDateValue(value);
  if (!date) return "GreenTrip member";
  return date.toLocaleDateString("en-MY", {
    month: "long",
    year: "numeric",
  });
}

function getLevel(score) {
  const points = Math.max(0, Number(score) || 0);
  if (points >= 6300) return 10;
  if (points >= 5200) return 9;
  if (points >= 4200) return 8;
  if (points >= 3300) return 7;
  if (points >= 2500) return 6;
  if (points >= 1800) return 5;
  if (points >= 1200) return 4;
  if (points >= 700) return 3;
  if (points >= 300) return 2;
  return 1;
}

function Avatar({ name, photoURL, size = 92 }) {
  const [failed, setFailed] = useState(false);
  const initial = (name || "U").charAt(0).toUpperCase();

  if (!photoURL || failed) {
    return (
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
          fontSize: size * 0.38,
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={photoURL}
      alt={name || "Friend"}
      onError={() => setFailed(true)}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
      }}
    />
  );
}

export default function FriendProfile({ friendUid, onNavigate }) {
  const { authUser, profile, loading } = useCurrentUser();
  const [friend, setFriend] = useState(null);
  const [isFriend, setIsFriend] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFriend() {
      if (!friendUid || !authUser?.uid) return;

      try {
        const [userSnap, friendSnap] = await Promise.all([
          getDoc(doc(db, "users", friendUid)),
          getDoc(doc(db, "users", authUser.uid, "friends", friendUid)),
        ]);

        if (cancelled) return;

        if (!userSnap.exists()) {
          setError("This user could not be found.");
          return;
        }

        setFriend({
          uid: userSnap.id,
          ...userSnap.data(),
        });
        setIsFriend(friendSnap.exists());
      } catch (err) {
        if (!cancelled) {
          console.error("Unable to load friend profile:", err);
          setError(err?.message || "Unable to load this profile.");
        }
      }
    }

    loadFriend();

    return () => {
      cancelled = true;
    };
  }, [friendUid, authUser?.uid]);

  const accumulatedEcoScore = useMemo(() => {
    if (!friend) return 0;

    return Math.max(
      0,
      Number(
        friend.ecoScore ??
          friend.eco_points ??
          friend.ecoPoints ??
          friend.lifetimeEcoPoints ??
          friend.eco_score ??
          0
      ) || 0
    );
  }, [friend]);

  const completedTrips = Math.max(
    0,
    Number(
      friend?.tripsCompleted ??
        friend?.completedTrips ??
        friend?.totalTrips ??
        friend?.trips_completed ??
        0
    ) || 0
  );

  const badges = Math.max(
    0,
    Number(
      friend?.badges_earned ??
        friend?.badgesEarned ??
        friend?.achievementsCount ??
        0
    ) || 0
  );

  const carbonSaved = Math.max(
    0,
    Number(
      friend?.carbon_saved ??
        friend?.carbonSaved ??
        0
    ) || 0
  );

  const challengesCompleted = Math.max(
    0,
    Number(
      friend?.challenges_completed ??
        friend?.challengesCompleted ??
        0
    ) || 0
  );

  const level =
    Number(friend?.sustainabilityLevel) ||
    Number(friend?.level) ||
    getLevel(accumulatedEcoScore);

  const displayName =
    friend?.name ||
    friend?.displayName ||
    friend?.username ||
    "GreenTrip User";

  const photoURL =
    friend?.profile_photo_url ||
    friend?.profilePhotoUrl ||
    friend?.photoURL ||
    "";

  async function handleMessage() {
    if (!authUser?.uid || !friend?.uid) return;

    setBusy(true);
    setError("");

    try {
      const chatId = await createOrGetDirectChat(
        {
          uid: authUser.uid,
          displayName: profile?.name || authUser.displayName,
          name: profile?.name || authUser.displayName,
          profile_photo_url:
            profile?.profile_photo_url ||
            authUser.photoURL ||
            "",
          photoURL: authUser.photoURL || "",
        },
        {
          uid: friend.uid,
          name: displayName,
          displayName,
          profile_photo_url: photoURL,
          photoURL,
        }
      );

      onNavigate("/community/chat/room", chatId);
    } catch (err) {
      console.error("Unable to open direct chat:", err);
      setError(err?.message || "Unable to open the chat.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteFriend() {
    if (!authUser?.uid || !friend?.uid) return;

    const confirmed = window.confirm(
      `You sure delete ${displayName} from your friends?`
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");

    try {
      await removeFriend(authUser.uid, friend.uid);
      onNavigate("/community/friends");
    } catch (err) {
      console.error("Unable to delete friend:", err);
      setError(err?.message || "Unable to delete this friend.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !friend) {
    return (
      <Layout>
        <div style={styles.page}>
          <button
            type="button"
            onClick={() => onNavigate("/community/friends")}
            style={styles.backButton}
          >
            <ArrowLeft size={18} /> Back to Friends
          </button>
          {error ? (
            <div style={styles.error}>{error}</div>
          ) : (
            <div style={styles.loading}>Loading friend profile...</div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={styles.page}>
        <button
          type="button"
          onClick={() => window.history.length > 1
            ? window.history.back()
            : onNavigate("/community/friends")}
          style={styles.backButton}
        >
          <ArrowLeft size={18} /> Back
        </button>

        {error && <div style={styles.error}>{error}</div>}

        <section style={styles.profileCard}>
          <div style={styles.hero}>
            <Avatar name={displayName} photoURL={photoURL} size={104} />

            <div style={styles.identity}>
              <h1 style={styles.name}>{displayName}</h1>
              <div style={styles.levelPill}>
                <Leaf size={15} />
                Sustainability Level {level}
              </div>
              {friend.bio && <p style={styles.bio}>{friend.bio}</p>}
              <div style={styles.memberSince}>
                Member since {formatMemberSince(
                  friend.createdAt ||
                    friend.created_at ||
                    friend.registeredAt
                )}
              </div>
            </div>
          </div>

          <div style={styles.statsGrid}>
            <Stat icon={<Leaf size={19} />} label="Eco Score" value={accumulatedEcoScore} />
            <Stat icon={<Plane size={19} />} label="Completed Trips" value={completedTrips} />
            <Stat icon={<Trophy size={19} />} label="Achievements" value={badges} />
            <Stat icon={<Recycle size={19} />} label="Carbon Saved" value={`${carbonSaved} kg`} />
            <Stat icon={<Target size={19} />} label="Challenges Completed" value={challengesCompleted} />
          </div>

          <div style={styles.actions}>
            {isFriend && (
              <button
                type="button"
                onClick={handleMessage}
                disabled={busy}
                style={styles.messageButton}
              >
                <MessageCircle size={17} />
                {busy ? "Opening..." : "Message"}
              </button>
            )}

            {isFriend && (
              <button
                type="button"
                onClick={handleDeleteFriend}
                disabled={busy}
                style={styles.deleteButton}
              >
                <Trash2 size={17} />
                Delete Friend
              </button>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statIcon}>{icon}</div>
      <div>
        <div style={styles.statValue}>{value}</div>
        <div style={styles.statLabel}>{label}</div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 1040,
    margin: "0 auto",
    padding: "28px 24px 50px",
  },
  backButton: {
    border: "none",
    background: "transparent",
    color: "#374151",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: 0,
    cursor: "pointer",
    fontWeight: 700,
    marginBottom: 18,
  },
  profileCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    padding: 28,
    boxShadow: "0 8px 25px rgba(15,23,42,.05)",
  },
  hero: {
    display: "flex",
    alignItems: "center",
    gap: 22,
    flexWrap: "wrap",
  },
  identity: {
    minWidth: 0,
  },
  name: {
    margin: 0,
    color: "#111827",
    fontSize: 28,
    fontWeight: 850,
  },
  levelPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    marginTop: 9,
    padding: "6px 10px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontWeight: 750,
    fontSize: 13,
  },
  bio: {
    margin: "12px 0 0",
    color: "#4b5563",
    maxWidth: 650,
    lineHeight: 1.55,
  },
  memberSince: {
    marginTop: 9,
    color: "#9ca3af",
    fontSize: 13,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))",
    gap: 12,
    marginTop: 28,
  },
  stat: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 15,
    display: "flex",
    alignItems: "center",
    gap: 11,
    background: "#fafafa",
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    background: "#dcfce7",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statValue: {
    color: "#111827",
    fontWeight: 850,
    fontSize: 19,
  },
  statLabel: {
    color: "#6b7280",
    fontSize: 12.5,
    marginTop: 2,
  },
  actions: {
    display: "flex",
    gap: 10,
    marginTop: 24,
    flexWrap: "wrap",
  },
  messageButton: {
    border: "none",
    background: "#16a34a",
    color: "#fff",
    borderRadius: 11,
    padding: "11px 16px",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    fontWeight: 750,
    cursor: "pointer",
  },
  deleteButton: {
    border: "1px solid #fecaca",
    background: "#fff",
    color: "#b91c1c",
    borderRadius: 11,
    padding: "11px 16px",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    fontWeight: 750,
    cursor: "pointer",
  },
  loading: {
    padding: 40,
    textAlign: "center",
    color: "#6b7280",
  },
  error: {
    marginBottom: 16,
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#b91c1c",
    borderRadius: 12,
    padding: 12,
  },
};

import React, {
  useEffect,
  useState,
} from "react";

import {
  Award,
  ChevronLeft,
} from "lucide-react";

import Layout from "../../../shared/components/Layout";

// IMPORTANT:
// Your actual shared file is lowercase.
import AchievementCard from "../../../shared/components/achievementCard";

import { useCurrentUser } from "../../../firebase/useCurrentUser";

import {
  listenToPublishedAchievements,
} from "../../../firebase/achievementService";


export default function AchievementsPage({
  onNavigate,
}) {

  const {
    authUser,
    profile,
    loading,
  } = useCurrentUser();


  const [
    achievements,
    setAchievements,
  ] = useState([]);


  // ============================================================
  // GET ALL PUBLISHED ADMIN ACHIEVEMENTS
  // ============================================================

  useEffect(() => {

    const unsubscribe =
      listenToPublishedAchievements(
        (list) => {
          setAchievements(list);
        }
      );

    return unsubscribe;

  }, []);


  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        Loading...
      </div>
    );
  }


  // ============================================================
  // LOGIN CHECK
  // ============================================================

  if (!authUser || !profile) {
    return (
      <div style={styles.loadingPage}>

        <p>
          You're not logged in.
        </p>

        <button
          type="button"
          onClick={() =>
            onNavigate?.("/login")
          }
        >
          Go to Login
        </button>

      </div>
    );
  }


  // ============================================================
  // USER PROGRESS
  // ============================================================

  const userProgress = {

    trips_completed:
      Number(
        profile.trips_completed ??
          profile.completed_trips ??
          0
      ),

    eco_score:
      Number(
        profile.eco_score ?? 0
      ),

    carbon_saved:
      Number(
        profile.carbon_saved ?? 0
      ),

    challenges_completed:
      Number(
        profile.challenges_completed ??
          0
      ),

    community_posts:
      Number(
        profile.community_posts ?? 0
      ),

    waste_reduced:
      Number(
        profile.waste_reduced ?? 0
      ),

  };


  // ============================================================
  // CALCULATE STATUS
  // ============================================================

  const achievementsWithStatus =
    achievements.map(
      (achievement) => {

        const ruleType =
          achievement.ruleType ||
          "trips_completed";


        const target = Math.max(
          Number(
            achievement.ruleTarget
          ) || 1,
          1
        );


        const progress =
          userProgress[ruleType] ?? 0;


        return {

          ...achievement,

          unlocked:
            progress >= target,

          progress,

          ruleTarget:
            target,

          ruleUnit:
            achievement.ruleUnit || "",

        };
      }
    );


  // ============================================================
  // SORT
  // UNLOCKED FIRST
  // NEWEST SECOND
  // ============================================================

  const sortedAchievements =
    [...achievementsWithStatus]
      .sort((a, b) => {

        if (
          a.unlocked &&
          !b.unlocked
        ) {
          return -1;
        }

        if (
          !a.unlocked &&
          b.unlocked
        ) {
          return 1;
        }

        const dateA =
          a.createdAt?.toMillis?.() || 0;

        const dateB =
          b.createdAt?.toMillis?.() || 0;

        return dateB - dateA;

      });


  const unlockedCount =
    sortedAchievements.filter(
      (achievement) =>
        achievement.unlocked
    ).length;


  // ============================================================
  // USER FOR LAYOUT
  // ============================================================

  const user = {

    name: profile.name,

    ecoScore:
      profile.eco_score ?? 0,

    profile_photo_url:
      profile.profile_photo_url || "",

  };


  // ============================================================
  // PAGE
  // ============================================================

  return (
    <Layout
      active="community"
      user={user}
      onNavigate={onNavigate}
    >

      <div style={styles.content}>

        {/* ======================================================
            BACK
            ====================================================== */}

        <button
          type="button"
          onClick={() =>
            onNavigate?.("/community")
          }
          style={styles.backButton}
        >
          <ChevronLeft size={18} />
          Back to Community
        </button>


        {/* ======================================================
            HEADER
            ====================================================== */}

        <div style={styles.header}>

          <div>

            <h1 style={styles.title}>
              Achievements
            </h1>

            <p style={styles.subtitle}>
              View all your available
              achievements and track your
              progress.
            </p>

          </div>


          <div style={styles.count}>
            {unlockedCount}/
            {sortedAchievements.length}
          </div>

        </div>


        {/* ======================================================
            ALL ACHIEVEMENTS
            ====================================================== */}

        {sortedAchievements.length ===
        0 ? (

          <div style={styles.empty}>

            <div style={styles.emptyIcon}>
              <Award size={28} />
            </div>

            <div style={styles.emptyTitle}>
              No achievements available yet
            </div>

            <div style={styles.emptyText}>
              Check back later for new
              achievements.
            </div>

          </div>

        ) : (

          <div style={styles.grid}>

            {sortedAchievements.map(
              (achievement) => (

                <AchievementCard

                  key={
                    achievement.id
                  }

                  title={
                    achievement.title
                  }

                  description={
                    achievement.description
                  }

                  category={
                    achievement.category
                  }

                  icon={
                    achievement.icon
                  }

                  iconUrl={
                    achievement.iconUrl ||
                    ""
                  }

                  points={
                    achievement.points
                  }

                  unlocked={
                    achievement.unlocked
                  }

                  progress={
                    achievement.progress
                  }

                  ruleTarget={
                    achievement.ruleTarget
                  }

                  ruleUnit={
                    achievement.ruleUnit
                  }

                />

              )
            )}

          </div>

        )}

      </div>

    </Layout>
  );
}


/* ================================================================
   STYLES
   ================================================================ */

const styles = {

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280",
  },

  content: {
    padding: "28px 32px",
    maxWidth: 1180,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },

  backButton: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    border: "none",
    background: "transparent",
    color: "#374151",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
    marginBottom: 20,
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    color: "#111827",
  },

  subtitle: {
    marginTop: 6,
    color: "#6b7280",
    fontSize: 14.5,
  },

  count: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#f0fdf4",
    color: "#15803d",
    fontSize: 13,
    fontWeight: 800,
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: 16,
  },

  empty: {
    background: "#fff",
    border:
      "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 50,
    textAlign: "center",
  },

  emptyIcon: {
    width: 56,
    height: 56,
    margin: "0 auto 12px",
    borderRadius: 14,
    background: "#f3f4f6",
    color: "#9ca3af",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    color: "#374151",
    fontWeight: 700,
    fontSize: 15,
  },

  emptyText: {
    marginTop: 5,
    color: "#9ca3af",
    fontSize: 13,
  },

};
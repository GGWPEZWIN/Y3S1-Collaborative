import { useCallback, useEffect, useState } from "react";

import useAuthUser from "./user/Waste&Resources/hooks/useAuthUser";

import Login from "./user/Home/pages/Login";
import Register from "./user/Home/pages/Register";
import Profile from "./user/Home/pages/Profile";
import MainDashboard from "./user/Home/pages/MainDashboard";

import CommunityPage from "./user/EcoJourney/pages/CommunityPage";
import TravelHistory from "./user/EcoJourney/pages/TravelHistory";
import ProgressTracker from "./user/EcoJourney/pages/ProgressTracker";
import Friends from "./user/EcoJourney/friends/Friends";

import ChatList from "./user/EcoJourney/chat/ChatList";
import ChatRoom from "./user/EcoJourney/chat/ChatRoom";
import GroupInfo from "./user/EcoJourney/chat/GroupInfo";

import ChallengeTeam from "./user/EcoJourney/pages/ChallengeTeam";

import ChallengesPage from "./user/Challenges/pages/ChallengesPage";
import ChallengeDetails from "./user/Challenges/pages/ChallengeDetails";
import ChallengeLeaderboard from "./user/Challenges/pages/ChallengeLeaderboard";

import Waste from "./user/Waste&Resources/pages/WastePage";

// IMPORTANT: Eco Report Card
import EcoReportCard from "./user/EcoJourney/pages/EcoReportCard";

// Admin
import AdminDashboard from "./admin/AdminDashboard";
import RequireAdmin from "./admin/RequireAdmin";

// Routes accessible without login
const PUBLIC_ROUTES = [
  "/login",
  "/register",
];


// ============================================================
// READ HASH ROUTE
// ============================================================

function parseHash() {
  const raw =
    window.location.hash.slice(1) ||
    "/login";

  const [path, queryString] =
    raw.split("?");

  const id = queryString
    ? new URLSearchParams(queryString).get("id")
    : null;

  return {
    path: path || "/login",
    id,
  };
}


// ============================================================
// COMING SOON
// ============================================================

function ComingSoon({
  label,
  onNavigate,
  backTo = "/dashboard",
}) {
  return (
    <div
      style={{
        padding: 48,
        textAlign: "center",
      }}
    >
      <h2>
        {label} is coming soon
      </h2>

      <button
        onClick={() =>
          onNavigate(backTo)
        }
      >
        Back
      </button>
    </div>
  );
}


// ============================================================
// APP
// ============================================================

export default function App() {
  const [location, setLocation] =
    useState(parseHash);

  const { status } =
    useAuthUser();

  const {
    path: route,
    id: selectedId,
  } = location;


  // ==========================================================
  // LISTEN TO HASH CHANGES
  // ==========================================================

  useEffect(() => {
    const onHashChange = () => {
      setLocation(parseHash());
    };

    window.addEventListener(
      "hashchange",
      onHashChange
    );

    return () => {
      window.removeEventListener(
        "hashchange",
        onHashChange
      );
    };
  }, []);


  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const navigate = useCallback(
    (path, id) => {
      const next =
        id !== undefined &&
        id !== null
          ? `${path}?id=${encodeURIComponent(id)}`
          : path;

      window.location.hash = next;

      setLocation(parseHash());
    },
    []
  );


  // ==========================================================
  // WAIT FOR FIREBASE AUTH
  // ==========================================================

  if (status === "loading") {
    return (
      <div
        style={{
          padding: 48,
          textAlign: "center",
        }}
      >
        Loading…
      </div>
    );
  }


  // ==========================================================
  // SIGNED OUT
  // ==========================================================

  if (
    status === "signedOut" &&
    !PUBLIC_ROUTES.includes(route)
  ) {
    return (
      <Login
        onNavigate={navigate}
      />
    );
  }


  // ==========================================================
  // ROUTES
  // ==========================================================

  switch (route) {

    // --------------------------------------------------------
    // AUTH
    // --------------------------------------------------------

    case "/login":
      return (
        <Login
          onNavigate={navigate}
        />
      );

    case "/register":
      return (
        <Register
          onNavigate={navigate}
        />
      );

    case "/profile":
      return (
        <Profile
          onNavigate={navigate}
        />
      );


    // --------------------------------------------------------
    // ADMIN
    // --------------------------------------------------------

    case "/admin":
      return (
        <RequireAdmin
          onNavigate={navigate}
        >
          <AdminDashboard
            onNavigate={navigate}
          />
        </RequireAdmin>
      );


    // --------------------------------------------------------
    // DASHBOARD
    // --------------------------------------------------------

    case "/dashboard":
      return (
        <MainDashboard
          onNavigate={navigate}
        />
      );


    // --------------------------------------------------------
    // COMMUNITY
    // --------------------------------------------------------

    case "/community":
      return (
        <CommunityPage
          onNavigate={navigate}
        />
      );


    // --------------------------------------------------------
    // TRAVEL HISTORY
    // --------------------------------------------------------

    case "/community/history":
      return (
        <TravelHistory
          onNavigate={navigate}
          onBack={() =>
            navigate("/community")
          }
        />
      );


    // --------------------------------------------------------
    // ECO REPORT CARD
    // --------------------------------------------------------

    case "/community/report":
      return (
        <EcoReportCard
          onNavigate={navigate}
          tripId={selectedId}
        />
      );


    // --------------------------------------------------------
    // PROGRESS
    // --------------------------------------------------------

    case "/community/progress":
      return (
        <ProgressTracker
          onNavigate={navigate}
          onBack={() =>
            navigate("/community")
          }
        />
      );


    // --------------------------------------------------------
    // FRIENDS
    // --------------------------------------------------------

    case "/community/friends":
      return (
        <Friends
          onNavigate={navigate}
        />
      );


    // --------------------------------------------------------
    // CHAT
    // --------------------------------------------------------

    case "/community/chat":
      return (
        <ChatList
          onNavigate={navigate}
        />
      );

    case "/community/chat/room":
      return (
        <ChatRoom
          chatId={selectedId}
          onNavigate={navigate}
        />
      );

    case "/community/chat/info":
      return (
        <GroupInfo
          chatId={selectedId}
          onNavigate={navigate}
        />
      );


    // --------------------------------------------------------
    // COMMUNITY CHALLENGES
    // --------------------------------------------------------

    case "/community/challenges":
      return (
        <ChallengeTeam
          onNavigate={navigate}
        />
      );


    // --------------------------------------------------------
    // CHALLENGES
    // --------------------------------------------------------

    case "/challenges":
      return (
        <ChallengesPage
          onNavigate={navigate}
        />
      );

    case "/challenges/details":
      return (
        <ChallengeDetails
          onNavigate={navigate}
          challengeId={selectedId}
        />
      );

    case "/challenges/leaderboard":
      return (
        <ChallengeLeaderboard
          onNavigate={navigate}
        />
      );


    // --------------------------------------------------------
    // OTHER
    // --------------------------------------------------------

    case "/itinerary":
      return (
        <ComingSoon
          label="Itinerary"
          onNavigate={navigate}
        />
      );

    case "/recommendations":
      return (
        <ComingSoon
          label="Recommendations"
          onNavigate={navigate}
        />
      );

    case "/certification":
      return (
        <ComingSoon
          label="Certification"
          onNavigate={navigate}
        />
      );

    case "/waste":
      return (
        <Waste
          onNavigate={navigate}
        />
      );


    // --------------------------------------------------------
    // DEFAULT
    // --------------------------------------------------------

    default:
      return (
        <Login
          onNavigate={navigate}
        />
      );
  }
}
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

import EcoReportCard from "./user/EcoJourney/pages/EcoReportCard";
import AchievementsPage from "./user/EcoJourney/pages/AchievementsPage";

// Itinerary (Module 1)
import ItineraryPage from "./user/Itinerary/pages/ItineraryPage";
import CreateItinerary from "./user/Itinerary/pages/CreateItinerary";
import ItineraryDetails from "./user/Itinerary/pages/ItineraryDetails";

// Admin
import AdminDashboard from "./admin/AdminDashboard";
import RequireAdmin from "./admin/RequireAdmin";

// Routes accessible without login
const PUBLIC_ROUTES = ["/login", "/register"];

// ============================================================
// READ HASH ROUTE
// ============================================================
function parseHash() {
  const raw = window.location.hash.slice(1) || "/login";
  const normalized = raw.startsWith("/") ? raw : `/${raw}`;

  const [path, queryString = ""] = normalized.split("?");
  const params = new URLSearchParams(queryString);

  return {
    path: path || "/login",
    id: params.get("id") || null,
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
      <h2>{label} is coming soon</h2>

      <button
        type="button"
        onClick={() => onNavigate(backTo)}
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
  const [location, setLocation] = useState(parseHash);
  const { status } = useAuthUser();

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

    window.addEventListener("hashchange", onHashChange);

    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  // ==========================================================
  // NAVIGATION
  // ==========================================================
  const navigate = useCallback((path, id) => {
    const cleanPath = String(path || "/login").split("?")[0];

    const next =
      id !== undefined && id !== null && id !== ""
        ? `${cleanPath}?id=${encodeURIComponent(id)}`
        : cleanPath;

    const nextHash = `#${next}`;

    if (window.location.hash !== nextHash) {
      window.location.hash = next;
    }

    // Update immediately as well as through hashchange.
    // This prevents a momentary blank/default route when
    // navigating between chat screens.
    setLocation(parseHash());
  }, []);

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
    return <Login onNavigate={navigate} />;
  }

  // ==========================================================
  // ROUTES
  // ==========================================================
  switch (route) {
    // --------------------------------------------------------
    // AUTH
    // --------------------------------------------------------
    case "/login":
      return <Login onNavigate={navigate} />;

    case "/register":
      return <Register onNavigate={navigate} />;

    case "/profile":
      return <Profile onNavigate={navigate} />;

    // --------------------------------------------------------
    // ADMIN
    // --------------------------------------------------------
    case "/admin":
      return (
        <RequireAdmin onNavigate={navigate}>
          <AdminDashboard onNavigate={navigate} />
        </RequireAdmin>
      );

    // --------------------------------------------------------
    // DASHBOARD
    // --------------------------------------------------------
    case "/dashboard":
      return <MainDashboard onNavigate={navigate} />;

    // --------------------------------------------------------
    // COMMUNITY
    // --------------------------------------------------------
    case "/community":
      return <CommunityPage onNavigate={navigate} />;

    case "/community/history":
      return (
        <TravelHistory
          onNavigate={navigate}
          onBack={() => navigate("/community")}
        />
      );

    case "/community/progress":
      return (
        <ProgressTracker
          onNavigate={navigate}
          onBack={() => navigate("/community")}
        />
      );

    case "/community/achievements":
      return <AchievementsPage onNavigate={navigate} />;

    case "/community/friends":
      return <Friends onNavigate={navigate} />;

    case "/community/chat":
      return <ChatList onNavigate={navigate} />;

    // --------------------------------------------------------
    // CHAT ROOM
    // --------------------------------------------------------
    case "/community/chat/room":
      if (!selectedId) {
        return (
          <ComingSoon
            label="Chat"
            onNavigate={navigate}
            backTo="/community/chat"
          />
        );
      }

      return (
        <ChatRoom
          chatId={selectedId}
          onNavigate={navigate}
        />
      );

    // --------------------------------------------------------
    // GROUP INFO
    // --------------------------------------------------------
    case "/community/chat/info":
      if (!selectedId) {
        return (
          <ComingSoon
            label="Group Info"
            onNavigate={navigate}
            backTo="/community/chat"
          />
        );
      }

      return (
        <GroupInfo
          chatId={selectedId}
          onNavigate={navigate}
        />
      );

    // --------------------------------------------------------
    // ECO REPORT
    // --------------------------------------------------------
    case "/community/reports":
  return (
    <EcoReportCard
      onNavigate={navigate}
      onBack={() => navigate("/community")}
    />
  );

case "/community/report":
  return (
    <EcoReportCard
      onNavigate={navigate}
      tripId={selectedId}
    />
  );

    // --------------------------------------------------------
    // COMMUNITY CHALLENGES
    // --------------------------------------------------------
    case "/community/challenges":
      return <ChallengeTeam onNavigate={navigate} />;

    // --------------------------------------------------------
    // CHALLENGES
    // --------------------------------------------------------
    case "/challenges":
      return <ChallengesPage onNavigate={navigate} />;

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
        <ItineraryPage
          onNavigate={navigate}
        />
      );

    case "/itinerary/create":
      return (
        <CreateItinerary
          onNavigate={navigate}
        />
      );

    case "/itinerary/edit":
      return (
        <CreateItinerary
          onNavigate={navigate}
          editItineraryId={selectedId}
        />
      );

    case "/itinerary/details":
      return (
        <ItineraryDetails
          itineraryId={selectedId}
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
      return <Waste onNavigate={navigate} />;

    // --------------------------------------------------------
    // DEFAULT
    // --------------------------------------------------------
    default:
      return <Login onNavigate={navigate} />;
  }
}

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
import GreenRecommendationPage from "./user/AIRecommendation/pages/GreenRecommendationPage";

// Admin module — file is named "Adminlogin.jsx" (lowercase "l") on disk,
// import name kept capitalized (AdminLogin) purely for readability here.
import AdminDashboard from "./admin/AdminDashboard";
import RequireAdmin from "./admin/RequireAdmin";

/* Routes reachable without a signed-in user. Everything else is gated. */
const PUBLIC_ROUTES = ["/login", "/register", "/admin-login"];

/**
 * Location lives in the URL hash so it survives a refresh and the browser
 * back button. Format:  #/community/chat/room?id=abc123
 */
function parseHash() {
  const raw = window.location.hash.slice(1) || "/login";
  const [path, queryString] = raw.split("?");
  const id = queryString ? new URLSearchParams(queryString).get("id") : null;
  return { path: path || "/login", id };
}

// Placeholder page
function ComingSoon({ label, onNavigate, backTo = "/dashboard" }) {
  return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <h2>{label} is coming soon</h2>
      <button onClick={() => onNavigate(backTo)}>Back</button>
    </div>
  );
}

export default function App() {
  const [location, setLocation] = useState(parseHash);
  const { status } = useAuthUser();

  const { path: route, id: selectedId } = location;

  // Subscribing to an external system (the browser history) and setting
  // state from its callback — the correct use of an effect.
  useEffect(() => {
    const onHashChange = () => setLocation(parseHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // navigate(path, id) — the id is written into the hash so a refresh on a
  // chat room or challenge detail page still knows which record to load.
  const navigate = useCallback((path, id) => {
    const next = id !== undefined && id !== null
      ? `${path}?id=${encodeURIComponent(id)}`
      : path;
    // Assigning the hash fires hashchange, which updates state above.
    // Set state directly too, in case the hash is unchanged.
    window.location.hash = next;
    setLocation(parseHash());
  }, []);

  // Firebase restores the session asynchronously. Rendering routes before it
  // resolves would bounce a signed-in user to login on every refresh.
  if (status === "loading") {
    return <div style={{ padding: 48, textAlign: "center" }}>Loading…</div>;
  }

  // NOTE: this guard runs before the switch below, so any route meant to be
  // reachable while signed out (admin login included) MUST be listed in
  // PUBLIC_ROUTES above, or it'll get silently bounced back to <Login>
  // every time — that was the original bug with /admin-login.
  if (status === "signedOut" && !PUBLIC_ROUTES.includes(route)) {
    return <Login onNavigate={navigate} />;
  }

  switch (route) {
    // ===========================
    // Auth
    // ===========================
    case "/login":
      return <Login onNavigate={navigate} />;
    case "/register":
      return <Register onNavigate={navigate} />;
    case "/profile":
      return <Profile onNavigate={navigate} />;

    // ===========================
    // Admin
    // ===========================
    case "/admin-login":
      return <AdminLogin onNavigate={navigate} />;

    case "/admin":
      // RequireAdmin re-checks the signed-in user's role === "admin" doc
      // server-side-of-truth (Firestore), not just "did they pass through
      // AdminLogin" — someone could type #/admin directly in the URL bar.
      return (
        <RequireAdmin onNavigate={navigate}>
          <AdminDashboard onNavigate={navigate} />
        </RequireAdmin>
      );

    // ===========================
    // Dashboard
    // ===========================
    case "/dashboard":
      return <MainDashboard onNavigate={navigate} />;

    // ===========================
    // Community
    // ===========================
    case "/community":
      return <CommunityPage onNavigate={navigate} />;

    case "/community/history":
      return <TravelHistory onNavigate={navigate} onBack={() => navigate("/community")} />;

    case "/community/progress":
      return <ProgressTracker onNavigate={navigate} onBack={() => navigate("/community")} />;

    case "/community/friends":
      return <Friends onNavigate={navigate} />;

    case "/community/chat":
      return <ChatList onNavigate={navigate} />;

    case "/community/chat/room":
      return <ChatRoom chatId={selectedId} onNavigate={navigate} />;

    case "/community/chat/info":
      return <GroupInfo chatId={selectedId} onNavigate={navigate} />;

    case "/community/report":
      return <ComingSoon label="Eco-Report Card" onNavigate={navigate} backTo="/community" />;
    case "/community/challenges":
      return <ChallengeTeam onNavigate={navigate} />;

    // ===========================
    // Challenges Module
    // ===========================
    case "/challenges":
      return <ChallengesPage onNavigate={navigate} />;

    case "/challenges/details":
      return <ChallengeDetails onNavigate={navigate} challengeId={selectedId} />;

    case "/challenges/leaderboard":
      return <ChallengeLeaderboard onNavigate={navigate} />;

    // ===========================
    // Other Modules
    // ===========================
    case "/itinerary":
      return <ComingSoon label="Itinerary" onNavigate={navigate} />;
    case "/recommendations":
      return <GreenRecommendationPage onNavigate={navigate} />;
    case "/certification":
      return <ComingSoon label="Certification" onNavigate={navigate} />;
    case "/waste":
      return <Waste onNavigate={navigate} />;

    default:
      return <Login onNavigate={navigate} />;
  }
}
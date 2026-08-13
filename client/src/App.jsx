import React, { useState } from "react";

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
  const [route, setRoute] = useState("/login");
  const [selectedChallengeId, setSelectedChallengeId] = useState(null);
  const [selectedChatId, setSelectedChatId] = useState(null);

  // navigate(path, id) — id is stored into whichever slot the destination
  // route needs. Harmless to set both; each page only reads the one it uses.
  const navigate = (path, id) => {
    if (id !== undefined) {
      setSelectedChallengeId(id);
      setSelectedChatId(id);
    }
    setRoute(path);
  };

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
      return <ChatRoom chatId={selectedChatId} onNavigate={navigate} />;

    case "/community/chat/info":
      return <GroupInfo chatId={selectedChatId} onNavigate={navigate} />;

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
      return <ChallengeDetails onNavigate={navigate} challengeId={selectedChallengeId} />;

    case "/challenges/leaderboard":
      return <ChallengeLeaderboard onNavigate={navigate} />;

    // ===========================
    // Other Modules
    // ===========================
    case "/itinerary":
      return <ComingSoon label="Itinerary" onNavigate={navigate} />;
    case "/recommendations":
      return <ComingSoon label="Recommendations" onNavigate={navigate} />;
    case "/certification":
      return <ComingSoon label="Certification" onNavigate={navigate} />;
    case "/waste":
      return <ComingSoon label="Waste" onNavigate={navigate} />;

    default:
      return <Login onNavigate={navigate} />;
  }
}
import React, { useState } from "react";

import MainDashboard from "./user/Home/pages/MainDashboard";

import CommunityPage from "./user/EcoJourney/pages/CommunityPage";
import TravelHistory from "./user/EcoJourney/pages/TravelHistory";
import ProgressTracker from "./user/EcoJourney/pages/ProgressTracker";
import Friends from "./user/EcoJourney/pages/Friends";
import ChatGroups from "./user/EcoJourney/pages/ChatGroups";
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

/**
 * App
 *
 * Simple state-based router (no react-router dependency). "route" is a
 * path string like "/dashboard" or "/community/history"; navigate()
 * updates it and every page receives onNavigate to change it further.
 *
 * navigate() also accepts an optional second argument: an id to remember
 * alongside the route change. Used so that clicking a specific challenge
 * card carries its id through to the details page, instead of every card
 * landing on the same hardcoded details view.
 */
export default function App() {
  const [route, setRoute] = useState("/dashboard");
  const [selectedChallengeId, setSelectedChallengeId] = useState(null);

  const navigate = (path, id) => {
    if (id !== undefined) setSelectedChallengeId(id);
    setRoute(path);
  };

  switch (route) {
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
      return <ChatGroups onNavigate={navigate} />;
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
      return <MainDashboard onNavigate={navigate} />;
  }
}
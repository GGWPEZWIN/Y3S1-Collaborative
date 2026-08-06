import React, { useState } from "react";

import MainDashboard from "./user/Home/pages/MainDashboard";
import CommunityPage from "./user/EcoJourney/pages/CommunityPage";
import TravelHistory from "./user/EcoJourney/pages/TravelHistory";
import ProgressTracker from "./user/EcoJourney/pages/ProgressTracker";
import Friends from "./user/EcoJourney/pages/Friends";
import ChatGroups from "./user/EcoJourney/pages/ChatGroups";
import ChallengeTeam from "./user/EcoJourney/pages/ChallengeTeam";

// Placeholder for pages not built yet — Itinerary, Recommendations,
// Challenges, Certification, Waste, and the remaining Community sub-pages
// (Friends, Chat & Groups, Eco-Report Card, Challenge Team). Swap each in
// as its own page gets built.
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
 */
export default function App() {
  const [route, setRoute] = useState("/dashboard");
  const navigate = (path) => setRoute(path);

  switch (route) {
    case "/dashboard":
      return <MainDashboard onNavigate={navigate} />;

    case "/community":
      return <CommunityPage onNavigate={navigate} />;

    case "/community/history":
      return <TravelHistory onBack={() => navigate("/community")} />;

    case "/community/progress":
      return <ProgressTracker onBack={() => navigate("/community")} />;

    case "/community/friends":
      return <Friends onNavigate={navigate} />;
    case "/community/chat":
      return <ChatGroups onNavigate={navigate} />;
    case "/community/report":
      return <ComingSoon label="Eco-Report Card" onNavigate={navigate} backTo="/community" />;
    case "/community/challenges":
      return <ChallengeTeam onNavigate={navigate} />;

    case "/itinerary":
      return <ComingSoon label="Itinerary" onNavigate={navigate} />;
    case "/recommendations":
      return <ComingSoon label="Recommendations" onNavigate={navigate} />;
    case "/challenges":
      return <ComingSoon label="Challenges" onNavigate={navigate} />;
    case "/certification":
      return <ComingSoon label="Certification" onNavigate={navigate} />;
    case "/waste":
      return <ComingSoon label="Waste" onNavigate={navigate} />;

    default:
      return <MainDashboard onNavigate={navigate} />;
  }
}
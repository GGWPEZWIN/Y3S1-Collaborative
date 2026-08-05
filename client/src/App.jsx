import React, { useState } from "react";

import MainDashboard from "./user/Home/pages/MainDashboard";
import CommunityPage from "./user/EcoJourney/pages/CommunityPage";
import TravelHistory from "./user/EcoJourney/pages/TravelHistory";

// Placeholder for pages not built yet
function ComingSoon({ label, onNavigate }) {
  return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <h2>{label} is coming soon</h2>

      <button onClick={() => onNavigate("/dashboard")}>
        Back to Dashboard
      </button>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState("/dashboard");

  const navigate = (path) => {
    setRoute(path);
  };

  switch (route) {
    case "/dashboard":
      return <MainDashboard onNavigate={navigate} />;

    case "/community":
      return <CommunityPage onNavigate={navigate} />;

    case "/community/history":
      return (
        <TravelHistory
          onNavigate={navigate}
          onBack={() => navigate("/community")}
        />
      );

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

    case "/challenges":
      return (
        <ComingSoon
          label="Challenges"
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
        <ComingSoon
          label="Waste"
          onNavigate={navigate}
        />
      );

    default:
      return <MainDashboard onNavigate={navigate} />;
  }
}
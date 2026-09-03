import { useState } from "react";
import Layout from "../../../shared/components/Layout";
import {
  mockGreenRecommendation,
  mockItinerary,
} from "../data/mockModule2Data";
import ItinerarySummary from "../components/ItinerarySummary";
import TransportationComparison from "../components/TransportationComparison";
import RouteInformationPanel from "../components/RouteInformationPanel";
import NavigationPreview from "../components/NavigationPreview";
import "../styles/aiRecommendation.css";

const TABS = [
  { id: "recommendation", label: "Trip Recommendation" },
  { id: "compare", label: "Compare Transport" },
  { id: "navigation", label: "Navigation Preview" },
];

const RECOMMENDED_MODE = "public_transit";

export default function GreenRecommendationPage({ onNavigate }) {
  const [view, setView] = useState("recommendation");
  const [selectedMode, setSelectedMode] = useState(RECOMMENDED_MODE);
  const [navIndex, setNavIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const stops = mockGreenRecommendation.recommendedDestinationOrder;
  const lastIndex = stops.length - 1;

  function showRecommendation() {
    setView("recommendation");
  }

  function showCompare() {
    setView("compare");
  }

  function showNavigation() {
    setView("navigation");
  }

  function handleNextDestination() {
    if (paused || navIndex >= lastIndex) return;
    setNavIndex((index) => Math.min(index + 1, lastIndex));
  }

  return (
    <Layout active="recommendations" onNavigate={onNavigate}>
      <div className="m2-page">
        <header className="m2-header">
          <div className="m2-title-row">
            <h1 className="m2-title">AI Green Recommendation</h1>
            <span className="m2-badge">Frontend Prototype</span>
          </div>
        </header>

        <p className="m2-notice" role="note">
          Demonstration data is being used while Module 1 and live route
          services are under development.
        </p>

        <div className="m2-tabs" role="tablist" aria-label="Module 2 views">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`m2-tab-${tab.id}`}
              aria-selected={view === tab.id}
              aria-controls={`m2-panel-${tab.id}`}
              className="m2-tab"
              onClick={() => setView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          id={`m2-panel-${view}`}
          role="tabpanel"
          aria-labelledby={`m2-tab-${view}`}
        >
          {view === "recommendation" ? (
            <>
              <ItinerarySummary
                itinerary={mockItinerary}
                recommendation={mockGreenRecommendation}
                onCompare={showCompare}
                onPreview={showNavigation}
              />
              <div style={{ marginTop: 16 }}>
                <RouteInformationPanel
                  segments={mockGreenRecommendation.routeSegments}
                />
              </div>
            </>
          ) : null}

          {view === "compare" ? (
            <TransportationComparison
              options={mockGreenRecommendation.transportationOptions}
              selectedMode={selectedMode}
              onSelect={setSelectedMode}
              onUseRecommended={() => setSelectedMode(RECOMMENDED_MODE)}
              onBack={showRecommendation}
            />
          ) : null}

          {view === "navigation" ? (
            <NavigationPreview
              stops={stops}
              segments={mockGreenRecommendation.routeSegments}
              currentIndex={navIndex}
              paused={paused}
              onPause={() => setPaused(true)}
              onResume={() => setPaused(false)}
              onNext={handleNextDestination}
              onBack={showRecommendation}
            />
          ) : null}
        </div>
      </div>
    </Layout>
  );
}

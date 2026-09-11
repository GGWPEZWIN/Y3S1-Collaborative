import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  CheckCircle2,
  MapPin,
  Search,
  Target,
  Trophy,
} from "lucide-react";

function formatDate(value) {
  if (!value) return "";
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getRequirementLabel(type) {
  return type === "location" ? "Location Verification" : "Photo Proof";
}

function getRequirementIcon(type, size = 16) {
  return type === "location" ? <MapPin size={size} /> : <Camera size={size} />;
}

function ChallengeCard({ challenge, selected, onSelect }) {
  const requirementType = challenge.requirementType || "photo";

  return (
    <button
      type="button"
      onClick={() => onSelect(challenge)}
      style={{
        border: `1px solid ${selected ? "#16a34a" : "#e5e7eb"}`,
        boxShadow: selected ? "0 0 0 2px #bbf7d0" : "none",
        background: "#fff",
        borderRadius: 15,
        padding: 17,
        textAlign: "left",
        cursor: "pointer",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: "#f0fdf4", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Trophy size={20} />
        </div>
        {selected && <CheckCircle2 size={22} color="#16a34a" />}
      </div>
      <div style={{ color: "#111827", fontWeight: 750, fontSize: 16 }}>{challenge.title}</div>
      <div style={{ color: "#6b7280", fontSize: 13.5, lineHeight: 1.5, marginTop: 6, minHeight: 42 }}>
        {challenge.description}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 13, fontSize: 12.5, color: "#374151", flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Target size={14} /> {challenge.target} {challenge.unit}
        </span>
        {challenge.category && (
          <span style={{ background: "#f3f4f6", borderRadius: 999, padding: "4px 9px", fontWeight: 600 }}>
            {challenge.category}
          </span>
        )}
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#166534", background: "#dcfce7", borderRadius: 999, padding: "5px 9px", fontSize: 12, fontWeight: 700, marginTop: 10 }}>
        {getRequirementIcon(requirementType, 14)} {getRequirementLabel(requirementType)}
      </div>
      {challenge.endDate && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 9, color: "#9ca3af", fontSize: 12.5 }}>
          <CalendarDays size={14} /> Ends {formatDate(challenge.endDate)}
        </div>
      )}
    </button>
  );
}

export default function ChallengeSelection({
  challenges = [],
  selectedChallenge,
  onSelect,
  onBack,
  modeLabel = "Challenge",
}) {
  const [search, setSearch] = useState("");

  const filteredChallenges = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return challenges;
    return challenges.filter((challenge) => {
      const haystack = [
        challenge.title,
        challenge.description,
        challenge.category,
        challenge.unit,
        challenge.requirementType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [challenges, search]);

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
        <div>
          <button
            type="button"
            onClick={onBack}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: "transparent", color: "#374151", padding: 0, cursor: "pointer", fontWeight: 650, marginBottom: 12 }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h2 style={{ margin: 0, color: "#111827", fontSize: 22, fontWeight: 800 }}>
            Choose a {modeLabel}
          </h2>
          <p style={{ color: "#6b7280", fontSize: 13.5, lineHeight: 1.5, margin: "6px 0 0" }}>
            Select the challenge you want to complete. The same challenge selection is used for Create Team and Challenge Partner.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #d1d5db", borderRadius: 11, padding: "0 12px", background: "#fff", marginBottom: 14 }}>
        <Search size={17} color="#9ca3af" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search challenges by name, category or requirement..."
          style={{ flex: 1, border: "none", outline: "none", padding: "11px 0", fontSize: 14 }}
        />
      </div>

      <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>
        {filteredChallenges.length} challenge{filteredChallenges.length === 1 ? "" : "s"} available
      </div>

      {filteredChallenges.length === 0 ? (
        <div style={{ minHeight: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#9ca3af", border: "1px dashed #e5e7eb", borderRadius: 15, padding: 25, textAlign: "center" }}>
          <Search size={30} />
          <strong>No challenges found</strong>
          <span>Try another search.</span>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
          {filteredChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              selected={selectedChallenge?.id === challenge.id}
              onSelect={(value) => {
                onSelect(value);
                onBack?.();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

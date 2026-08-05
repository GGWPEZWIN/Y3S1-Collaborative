// Stub service — replace each function body with real Firestore / API calls.

export async function getUser() {
  return { name: "Keshi", ecoScore: 8750 };
}

export async function getSummaryStats() {
  return [
    { label: "Eco Score", value: "8,750", note: "Rank #5", progress: 72, sub: "Level 8 - 250 to next" },
    { label: "Carbon Saved", value: "234.5 kg", sub: "▼ 23.4kg this month", subColor: "#16a34a" },
    { label: "Trips Completed", value: "1", sub: "+ 2 this month" },
    { label: "Badges Earned", value: "4", sub: "Eco Pioneer" },
  ];
}

export async function getActiveTrips() {
  return [
    { title: "Penang Heritage & Nature Trip", dateRange: "7/15/2026 - 7/18/2026", score: 92, co2: 45.3, destinations: 2, highlighted: true },
    { title: "Borneo Wildlife Adventure", dateRange: "8/1/2026 - 8/5/2026", score: 88, co2: 125.7, destinations: 0, highlighted: false },
  ];
}

export async function getFeaturedChallenges() {
  return [
    { title: "KL Car Free Weekend", desc: "Complete a full weekend in ...", difficulty: "Medium", points: 50, joined: 2847 },
    { title: "Pasar Malam Plastic-Free", desc: "Visit a night market with your ...", difficulty: "Easy", points: 30, joined: 5234 },
    { title: "Borneo Wildlife Guardian", desc: "Participate in a conservation ...", difficulty: "Hard", points: 100, joined: 892 },
  ];
}

export async function getRecentAchievements() {
  return [
    { emoji: "♻️", title: "Zero Waste Warrior", tag: "Waste", date: "5/15/2026" },
    { emoji: "🌱", title: "Eco Pioneer", tag: "General", date: "20/4/2026" },
    { emoji: "🚆", title: "KL Transit Guru", tag: "Transport", date: "8/5/2026" },
  ];
}

export async function getCurrentUser() {
  return { name: "Keshi", ecoScore: 8750 };
}

export async function getTravelHistorySummary() {
  return {
    tripsCompleted: 14,
    avgEcoScore: 87,
    totalCarbonKg: 312,
    badgesEarned: 7,
  };
}

export async function getTravelHistory() {
  return [
    {
      id: "trip-1",
      title: "Penang Heritage & Nature Trip",
      dateRange: "7/15/2026 - 7/18/2026",
      ecoScore: 92,
      carbonKg: 45.3,
      status: "Completed",
      reportUrl: "#",
    },
    {
      id: "trip-2",
      title: "Borneo Wildlife Adventure",
      dateRange: "8/1/2026 - 8/5/2026",
      ecoScore: 88,
      carbonKg: 125.7,
      status: "Upcoming",
      reportUrl: "#",
    },
  ];
}
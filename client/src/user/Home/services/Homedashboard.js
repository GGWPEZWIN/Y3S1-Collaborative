// homeDashboardService.js
// Mock data layer for the "Welcome back" main dashboard (Home/maindashboard.jsx).
// Every function returns a Promise so swapping in a real API later is a
// drop-in change — no call sites need to change shape.

const MOCK_DELAY = 250;
const delay = (data) => new Promise((resolve) => setTimeout(() => resolve(data), MOCK_DELAY));

const USER = {
  name: "Keshi",
  ecoScore: 8750,
};

const SUMMARY_STATS = [
  {
    label: "Eco Score",
    value: "8,750",
    note: "Rank #5",
    progress: 0.68, // level 8 fill
    sub: "Level 8 - 250 to next",
  },
  {
    label: "Carbon Saved",
    value: "234.5 kg",
    sub: "▼ 23.4kg this month",
    subColor: "#16a34a",
  },
  {
    label: "Trips Completed",
    value: "1",
    sub: "+ 2 this month",
  },
  {
    label: "Badges Earned",
    value: "4",
    sub: "Eco Pioneer",
  },
];

const ACTIVE_TRIPS = [
  {
    title: "Penang Heritage & Nature Trip",
    dateRange: "7/15/2026 - 7/18/2026",
    score: 92,
    carbonKg: 45.3,
    destinations: 2,
  },
  {
    title: "Borneo Wildlife Adventure",
    dateRange: "8/1/2026 - 8/5/2026",
    score: 88,
    carbonKg: 125.7,
    destinations: 0,
  },
];

const FEATURED_CHALLENGES = [
  {
    title: "KL Car Free Weekend",
    description: "Complete a full weekend in ...",
    difficulty: "Medium",
    points: 50,
    joined: 2847,
  },
  {
    title: "Pasar Malam Plastic-Free",
    description: "Visit a night market with your ...",
    difficulty: "Easy",
    points: 30,
    joined: 5234,
  },
  {
    title: "Borneo Wildlife Guardian",
    description: "Participate in a conservation ...",
    difficulty: "Hard",
    points: 100,
    joined: 892,
  },
];

const RECENT_ACHIEVEMENTS = [
  { icon: "♻️", title: "Zero Waste Warrior", category: "Waste", dateEarned: "5/15/2026" },
  { icon: "🌱", title: "Eco Pioneer", category: "General", dateEarned: "4/20/2026" },
  { icon: "🚆", title: "KL Transit Guru", category: "Transport", dateEarned: "8/5/2026" },
];

export function getUser() {
  return delay(USER);
}

export function getSummaryStats() {
  return delay(SUMMARY_STATS);
}

export function getActiveTrips() {
  return delay(ACTIVE_TRIPS);
}

export function getFeaturedChallenges() {
  return delay(FEATURED_CHALLENGES);
}

export function getRecentAchievements() {
  return delay(RECENT_ACHIEVEMENTS);
}
import React from "react";
import {
  Leaf,
  TrendingUp,
  Calendar,
  Users,
  MessageCircle,
  BarChart2,
  FileText,
  Medal,
  ChevronRight,
  Award,
  Navigation,
  Zap,
  Trash2,
  Home,
  Map,
} from "lucide-react";

import Layout from "../../../shared/components/Layout";
import StatCard from "../../../shared/components/StatCard";
import AchievementCard from "../../../shared/components/AchievementCard";

export default function CommunityPage({ onNavigate }) {

  const user = {
    name: "Keshi",
    ecoScore: 8750,
  };

  const stats = [
    {
      label: "Eco Score",
      icon: Leaf,
      iconColor: "#22c55e",
      value: "8,750",
      sub: "Level 8",
      progress: 0.72,
    },
    {
      label: "Global Rank",
      icon: TrendingUp,
      iconColor: "#3b82f6",
      value: "5",
      sub: "▲ 12 this week",
      subColor: "#16a34a",
    },
    {
      label: "Trips Completed",
      icon: Calendar,
      iconColor: "#7c3aed",
      value: "12",
      sub: "Completed journeys",
    },
    {
      label: "Badges Earned",
      icon: Award,
      iconColor: "#f97316",
      value: "4",
      sub: "Achievements",
    },
  ];

  const achievements = [
    {
      icon:"♻️",
      title:"Zero Waste Warrior",
      category:"Waste",
      dateEarned:"15 May 2026"
    },
    {
      icon:"🌱",
      title:"Eco Pioneer",
      category:"General",
      dateEarned:"20 Apr 2026"
    },
    {
      icon:"🚆",
      title:"KL Transit Guru",
      category:"Transport",
      dateEarned:"8 May 2026"
    }
  ];

  return (
    <Layout active="community" user={user} onNavigate={onNavigate}>
      <div style={{padding:"28px 32px",maxWidth:1180,margin:"0 auto"}}>

        <h1 style={{fontSize:28,fontWeight:800}}>
          Eco Journey & Community
        </h1>

        <p style={{color:"#6b7280",marginBottom:24}}>
          Connect with fellow eco-travelers and track your sustainability journey.
        </p>

        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(4,1fr)",
          gap:16
        }}>
          {stats.map(stat=>(
            <StatCard
              key={stat.label}
              icon={stat.icon}
              iconColor={stat.iconColor}
              label={stat.label}
              value={stat.value}
              sub={stat.sub}
              subColor={stat.subColor}
              progress={stat.progress}
            />
          ))}
        </div>

        <div style={{
          marginTop:30,
          background:"#fff",
          border:"1px solid #e5e7eb",
          borderRadius:14,
          padding:20
        }}>
          <h2>Community Features</h2>

          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(3,1fr)",
            gap:16,
            marginTop:20
          }}>

            {[
              ["Travel History",Calendar],
              ["Friends",Users],
              ["Chat & Groups",MessageCircle],
              ["Progress Tracker",BarChart2],
              ["Eco Report Card",FileText],
              ["Challenge Team",Medal]
            ].map(([title,Icon])=>(
              <div key={title}
                style={{
                  border:"1px solid #e5e7eb",
                  borderRadius:12,
                  padding:18
                }}>
                <Icon color="#22c55e"/>
                <h3>{title}</h3>
                <button style={{
                  marginTop:12,
                  padding:"8px 16px",
                  cursor:"pointer"
                }}>
                  View
                </button>
              </div>
            ))}

          </div>
        </div>

        <div style={{
          marginTop:30,
          background:"#fff",
          border:"1px solid #e5e7eb",
          borderRadius:14,
          padding:20
        }}>

          <div style={{
            display:"flex",
            justifyContent:"space-between"
          }}>
            <h2>Recent Achievements</h2>
            <span style={{display:"flex",alignItems:"center"}}>
              View More <ChevronRight size={16}/>
            </span>
          </div>

          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(3,1fr)",
            gap:16,
            marginTop:16
          }}>
            {achievements.map(a=>(
              <AchievementCard
                key={a.title}
                {...a}
              />
            ))}
          </div>

        </div>

      </div>
    </Layout>
  );
}
import React, { useState, useEffect } from "react";
import Layout from "../../../shared/components/Layout";
import { useCurrentUser } from "../../../firebase/useCurrentUser";

import { db } from "../../../firebase/config";
import { doc, updateDoc, increment, getDoc } from "firebase/firestore";

import {
  ArrowLeft,
  MapPin,
  Award,
  TrendingDown,
  Users,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Share2,
  Upload,
  Camera,
  Navigation,
  X,
  AlertCircle,
} from "lucide-react";

const DEFAULT_IMAGE_URL =
  "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80";

const CHALLENGES_DATA = {
  1: {
    id: 1,
    title: "KL Car-Free Weekend",
    description:
      "Complete a full weekend in Kuala Lumpur using only public transport, walking, or cycling. Reduce urban congestion and emissions while exploring the city.",
    difficulty: "Medium",
    tag: "Low-Carbon Transit",
    location: "Kuala Lumpur",
    points: 50,
    carbonKg: 12.5,
    participants: 2847,
    imageUrl:
      "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&q=80",
    organizer: "KL City Council & GreenTrip",
    duration: "2 Days (Weekend)",
    allowedVerification: ["image", "gps"],
    badge: { name: "Transit Pioneer", icon: "🚌" },
    rules: [
      "Must take place within Kuala Lumpur central transit zones.",
      "Photo proof of transit ticket/ride or GPS check-in required.",
      "Carbon savings automatically credited to your Eco Profile upon approval.",
    ],
  },
  2: {
    id: 2,
    title: "Pasar Malam Plastic-Free",
    description:
      "Visit a night market with your own containers and avoid all single-use plastics completely. Say no to disposable bags, cups, and plastic cutlery.",
    difficulty: "Easy",
    tag: "Zero-Plastic",
    location: "National",
    points: 30,
    carbonKg: null,
    participants: 5234,
    imageUrl:
      "https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&q=80",
    organizer: "Zero Waste Malaysia",
    duration: "1 Day",
    allowedVerification: ["image"],
    badge: { name: "Zero Waste Hero", icon: "♻️" },
    rules: [
      "Applicable to any registered night market across Malaysia.",
      "Upload a photo showing your food haul inside reusable containers or tiffins.",
      "Must decline all single-use plastic bags and disposable cutlery.",
    ],
  },
  3: {
    id: 3,
    title: "George Town Heritage Walk",
    description:
      "Ditch the car and explore Penang's UNESCO Heritage site entirely on foot or by bicycle for a day. Experience historic landmarks with zero tailpipe emissions.",
    difficulty: "Easy",
    tag: "Low-Carbon Transit",
    location: "Penang",
    points: 40,
    carbonKg: 8.2,
    participants: 1932,
    imageUrl:
      "https://images.unsplash.com/photo-1599423528441-2a07d3b5b62b?w=800&q=80",
    organizer: "Penang Heritage Trust & GreenTrip",
    duration: "1 Day",
    allowedVerification: ["gps", "image"],
    badge: { name: "Heritage Strider", icon: "🏛️" },
    rules: [
      "Check in via GPS within the George Town UNESCO World Heritage Zone.",
      "Alternatively, upload a photo of your walking or cycling trip at a heritage landmark.",
      "No motorized private transport permitted during the challenge period.",
    ],
  },
  4: {
    id: 4,
    title: "Kinabalu Reforestation",
    description:
      "Join local rangers to plant 5 native tree saplings at the base of Mount Kinabalu to restore tropical forest cover and preserve local biodiversity.",
    difficulty: "Hard",
    tag: "Reforestation",
    location: "Sabah",
    points: 150,
    carbonKg: 45.0,
    participants: 412,
    imageUrl:
      "https://images.unsplash.com/photo-1511497584788-876760111969?w=800&q=80",
    organizer: "Sabah Parks & Forestry Department",
    duration: "1 Day",
    allowedVerification: ["image", "gps"],
    badge: { name: "Forest Defender", icon: "🌳" },
    rules: [
      "Must be performed in coordination with registered park authorities or NGO drives.",
      "Upload photo proof of planted saplings or GPS check-in at the park site.",
      "Adhere strictly to official safety and planting instructions provided by rangers.",
    ],
  },
  5: {
    id: 5,
    title: "Melaka River Cleanup",
    description:
      "Participate in the weekend volunteer drive to collect and sort plastic waste along the Melaka River, preventing ocean pollution and protecting aquatic life.",
    difficulty: "Medium",
    tag: "Zero-Plastic",
    location: "Melaka",
    points: 80,
    carbonKg: null,
    participants: 845,
    imageUrl:
      "https://images.unsplash.com/photo-1618477461853-cf6ed80fbfc9?w=800&q=80",
    organizer: "Melaka River Development Corp & EcoVolunteers",
    duration: "1 Day",
    allowedVerification: ["image", "gps"],
    badge: { name: "River Guardian", icon: "🌊" },
    rules: [
      "Collect at least 1 bag of recyclable/plastic waste along designated river stretches.",
      "Sort collected waste into designated recycling bins provided at the site.",
      "Upload photo proof of collected waste or perform a GPS check-in.",
    ],
  },
  6: {
    id: 6,
    title: "Bako Coastal Conservation",
    description:
      "Help clear washed-up debris and plant mangroves along the Sarawak coastline at Bako National Park to bolster coastal defenses and sequester carbon.",
    difficulty: "Hard",
    tag: "Reforestation",
    location: "Sarawak",
    points: 120,
    carbonKg: 25.5,
    participants: 320,
    imageUrl:
      "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&q=80",
    organizer: "Sarawak Forestry Corporation",
    duration: "1 Day",
    allowedVerification: ["image", "gps"],
    badge: { name: "Coastal Protector", icon: "🏝️" },
    rules: [
      "Follow ranger safety guidelines when working along tidal coastal areas.",
      "Upload a photo of your mangrove planting or marine debris collection effort.",
      "Ensure all trash collected is logged with the park entrance station.",
    ],
  },
};

export default function ChallengeDetails({ challengeId = 1, onNavigate }) {
  const { authUser, profile, loading } = useCurrentUser();
  const [dbChallenge, setDbChallenge] = useState(null);

  useEffect(() => {
    const fetchChallengeFromDatabase = async () => {
      try {
        const challengeDocRef = doc(db, "challenges", String(challengeId));
        const challengeSnap = await getDoc(challengeDocRef);
        if (challengeSnap.exists()) {
          const data = challengeSnap.data();
          setDbChallenge({
            id: data.id || challengeSnap.id,
            ...data,
            imageUrl: data.imageUrl || DEFAULT_IMAGE_URL,
            participants:
              data.participants !== undefined && data.participants !== null
                ? Number(data.participants) || 0
                : 0,
            allowedVerification: data.allowedVerification || ["image"],
            rules: data.rules || [],
          });
        }
      } catch (error) {
        console.error("Error fetching challenge from Firestore:", error);
      }
    };

    if (challengeId) {
      fetchChallengeFromDatabase();
    }
  }, [challengeId]);

  const rawChallenge =
    dbChallenge || CHALLENGES_DATA[challengeId] || CHALLENGES_DATA[1];

  const challenge = {
    ...rawChallenge,
    imageUrl: rawChallenge?.imageUrl || DEFAULT_IMAGE_URL,
    participants:
      rawChallenge?.participants !== undefined && rawChallenge?.participants !== null
        ? Number(rawChallenge.participants) || 0
        : 0,
  };

  const [joined, setJoined] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const [activeTab, setActiveTab] = useState(
    challenge.allowedVerification[0] || "image"
  );
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);

  useEffect(() => {
    if (challenge?.allowedVerification) {
      setActiveTab(challenge.allowedVerification[0]);
    }
  }, [challengeId]);

  useEffect(() => {
    const profileChallenge =
      profile?.user_challenges?.[challenge.id] ||
      profile?.userChallenges?.[challenge.id];

    if (profileChallenge) {
      setJoined(profileChallenge.joined || profileChallenge.progress > 0 || false);
      setCompleted(
        profileChallenge.completed || profileChallenge.progress >= 100 || false
      );
      setImagePreview(profileChallenge.uploadedImage || null);
      if (profileChallenge.gpsVerified) {
        setGpsStatus({
          success: true,
          message: `Check-in verified at ${challenge.location}`,
        });
      } else {
        setGpsStatus(null);
      }
    } else {
      setJoined(false);
      setCompleted(false);
      setImagePreview(null);
      setGpsStatus(null);
    }
  }, [challenge.id, profile]);

  const saveCompletionToFirestore = async (
    pointsEarned,
    imgData = null,
    gpsDone = false
  ) => {
    if (!authUser?.uid) return;

    try {
      const userRef = doc(db, "users", authUser.uid);

      await updateDoc(userRef, {
        eco_score: increment(pointsEarned),
        [`user_challenges.${challenge.id}`]: {
          joined: true,
          completed: true,
          progress: 100,
          completedAt: new Date().toISOString(),
          uploadedImage: imgData || imagePreview || null,
          gpsVerified: gpsDone || (gpsStatus?.success ?? false),
        },
      });
    } catch (err) {
      console.error("Error saving challenge completion to Firestore:", err);
    }
  };

  const handleJoin = async () => {
    setJoined(true);

    if (authUser?.uid) {
      try {
        const userRef = doc(db, "users", authUser.uid);
        await updateDoc(userRef, {
          [`user_challenges.${challenge.id}`]: {
            joined: true,
            completed: false,
            progress: 50,
          },
        });
      } catch (err) {
        console.error("Error saving join state to Firestore:", err);
      }
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
  };

  const handleSubmitPhotoProof = () => {
    if (!imagePreview) return;
    setIsSubmitting(true);

    setTimeout(async () => {
      setIsSubmitting(false);
      setCompleted(true);
      setShowToast(true);

      await saveCompletionToFirestore(challenge.points, imagePreview, false);
    }, 1200);
  };

  const handleGpsCheckIn = () => {
    setGpsLoading(true);
    setGpsStatus(null);

    const completeGpsVerification = async (message) => {
      setGpsLoading(false);
      setGpsStatus({
        success: true,
        message: message,
      });
      setCompleted(true);
      setShowToast(true);

      await saveCompletionToFirestore(challenge.points, imagePreview, true);
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          completeGpsVerification(
            `Check-in verified! Coordinates: (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
          );
        },
        () => {
          completeGpsVerification(`Check-in verified at ${challenge.location}!`);
        },
        { timeout: 8000 }
      );
    } else {
      setTimeout(() => {
        completeGpsVerification(`Check-in verified at ${challenge.location}!`);
      }, 1000);
    }
  };

  const handleNavigateToCompleted = () => {
    window.location.hash = "#completed";
    onNavigate?.("/challenges");
  };
  
  const baseParticipants = Number(challenge.participants) || 0;
  const currentParticipants = baseParticipants + (joined ? 1 : 0);

  if (loading || (authUser && !profile)) {
    return (
      <div style={styles.loadingPage}>
        <p style={styles.loadingText}>Loading challenge and profile details...</p>
      </div>
    );
  }

  const user = {
    ...profile,
    name: profile.name,
    eco_score: profile.eco_score ?? profile.ecoScore ?? 0,
    ecoScore: profile.eco_score ?? profile.ecoScore ?? 0,
  };

  const handleShareStory = async () => {
    setIsGeneratingShare(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d");

      const bgGradient = ctx.createLinearGradient(0, 0, 1080, 1920);
      bgGradient.addColorStop(0, "#022c22");
      bgGradient.addColorStop(1, "#020617");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, 1080, 1920);

      const orb1 = ctx.createRadialGradient(200, 300, 0, 200, 300, 600);
      orb1.addColorStop(0, "rgba(16, 185, 129, 0.15)"); 
      orb1.addColorStop(1, "rgba(16, 185, 129, 0)");
      ctx.fillStyle = orb1;
      ctx.fillRect(0, 0, 1080, 1920);

      const orb2 = ctx.createRadialGradient(900, 1500, 0, 900, 1500, 800);
      orb2.addColorStop(0, "rgba(56, 189, 248, 0.12)"); 
      orb2.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = orb2;
      ctx.fillRect(0, 0, 1080, 1920);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 1080; i += 60) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1920); ctx.stroke();
      }
      for (let j = 0; j < 1920; j += 60) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(1080, j); ctx.stroke();
      }

      const cardY = 320;
      const cardH = 1220;
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 60;
      ctx.shadowOffsetY = 20;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(80, cardY, 920, cardH, 48);
      } else {
        ctx.rect(80, cardY, 920, cardH);
      }
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.shadowColor = "transparent";

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(410, cardY + 70, 260, 60, 30);
      } else {
        ctx.rect(410, cardY + 70, 260, 60);
      }
      ctx.fillStyle = "#dcfce7";
      ctx.fill();
      
      ctx.fillStyle = "#15803d";
      ctx.font = "bold 24px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("VERIFIED", 540, cardY + 110);

      ctx.fillStyle = "#64748b";
      ctx.font = "600 28px system-ui, sans-serif";
      ctx.letterSpacing = "4px";
      ctx.fillText("IMPACT DRIVEN BY", 540, cardY + 230);

      ctx.fillStyle = "#0f172a";
      ctx.font = "900 72px system-ui, sans-serif";
      ctx.letterSpacing = "0px";
      const userName = (user?.name || "Eco Warrior").toUpperCase();
      ctx.fillText(userName, 540, cardY + 320);

      ctx.beginPath();
      ctx.moveTo(340, cardY + 410);
      ctx.lineTo(740, cardY + 410);
      ctx.strokeStyle = "#f1f5f9";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = "#10b981";
      ctx.font = "800 68px system-ui, sans-serif";
      const words = challenge.title.split(" ");
      let line = "";
      let y = cardY + 540;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 750 && n > 0) {
          ctx.fillText(line, 540, y);
          line = words[n] + " ";
          y += 85;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 540, y);

      y += 120;
      const metricY = y;
      
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(140, metricY, 380, 240, 32);
      else ctx.rect(140, metricY, 380, 240);
      ctx.fillStyle = "#f8fafc";
      ctx.fill();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#10b981";
      ctx.font = "900 80px system-ui, sans-serif";
      ctx.fillText(`+${challenge.points}`, 330, metricY + 120);
      ctx.fillStyle = "#64748b";
      ctx.font = "700 28px system-ui, sans-serif";
      ctx.fillText("POINTS", 330, metricY + 175);

      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(560, metricY, 380, 240, 32);
      else ctx.rect(560, metricY, 380, 240);
      ctx.fillStyle = "#f8fafc";
      ctx.fill();
      ctx.stroke();

      if (challenge.carbonKg) {
        ctx.fillStyle = "#0ea5e9";
        ctx.font = "900 76px system-ui, sans-serif";
        ctx.fillText(`${challenge.carbonKg} KG`, 750, metricY + 120);
        ctx.fillStyle = "#64748b";
        ctx.font = "700 28px system-ui, sans-serif";
        ctx.fillText("CO₂ REDUCED", 750, metricY + 175);
      } else {
        ctx.fillStyle = "#0ea5e9";
        ctx.font = "900 80px system-ui, sans-serif";
        ctx.fillText(`100%`, 750, metricY + 120);
        ctx.fillStyle = "#64748b";
        ctx.font = "700 28px system-ui, sans-serif";
        ctx.fillText("CLEARED", 750, metricY + 175);
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = "800 44px system-ui, sans-serif";
      ctx.letterSpacing = "4px";
      ctx.fillText("GREENTRIP", 540, 1700);

      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "500 26px system-ui, sans-serif";
      ctx.letterSpacing = "0px";
      ctx.fillText("Make an impact at greentrip.app", 540, 1750);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const link = document.createElement("a");
      link.download = `GreenTrip_Story_${challenge.id}.jpg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error generating share image:", err);
      alert("Oops! Could not generate the image. Please try again.");
    } finally {
      setIsGeneratingShare(false);
    }
  };

  return (
    <Layout active="challenges" user={user} onNavigate={onNavigate}>
      <div style={styles.content}>
        <button
          type="button"
          onClick={() => onNavigate?.("/challenges")}
          style={styles.backButton}
        >
          <ArrowLeft size={16} /> Back to Challenges
        </button>

        <div style={styles.heroCard}>
          <img
            src={challenge.imageUrl || DEFAULT_IMAGE_URL}
            alt={challenge.title}
            style={styles.heroImage}
            onError={(e) => {
              e.currentTarget.src = DEFAULT_IMAGE_URL;
            }}
          />
          <div style={styles.heroOverlay}>
            <div style={styles.badgeRow}>
              <span style={styles.tagBadge}>{challenge.tag}</span>
              {challenge.badge && (
                <span style={styles.badgeRewardTag}>
                  <Award size={12} /> {challenge.badge.icon} {challenge.badge.name} Badge
                </span>
              )}
              <span style={styles.locationBadge}>
                <MapPin size={12} /> {challenge.location}
              </span>
            </div>
            <h1 style={styles.heroTitle}>{challenge.title}</h1>
            <p style={styles.heroSubtitle}>Organized by {challenge.organizer}</p>
          </div>
        </div>

        <div style={styles.twoColGrid}>
          <div style={styles.mainCol}>
            <div style={styles.card}>
              <h2 style={styles.sectionHeader}>Overview</h2>
              <p style={styles.descriptionText}>{challenge.description}</p>

              <div style={styles.quickStatsRow}>
                <div style={styles.quickStatBox}>
                  <Award size={18} color="#16a34a" />
                  <div>
                    <div style={styles.quickStatValue}>+{challenge.points} pts</div>
                    <div style={styles.quickStatLabel}>Reward Points</div>
                  </div>
                </div>

                {challenge.carbonKg && (
                  <div style={styles.quickStatBox}>
                    <TrendingDown size={18} color="#2563eb" />
                    <div>
                      <div style={styles.quickStatValue}>{challenge.carbonKg} kg</div>
                      <div style={styles.quickStatLabel}>Est. CO₂ Savings</div>
                    </div>
                  </div>
                )}

                <div style={styles.quickStatBox}>
                  <Users size={18} color="#7c3aed" />
                  <div>
                    <div style={styles.quickStatValue}>
                      {currentParticipants.toLocaleString()}
                    </div>
                    <div style={styles.quickStatLabel}>Participants</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ ...styles.card, marginTop: 20 }}>
              <div style={styles.rowHeader}>
                <h2 style={styles.sectionHeader}>Verification & Proof</h2>
                {completed && (
                  <span style={styles.verifiedBadge}>
                    <CheckCircle2 size={14} /> Verified & Completed
                  </span>
                )}
              </div>

              {!joined ? (
                <div style={styles.lockedBox}>
                  <AlertCircle size={20} color="#f59e0b" />
                  <span>
                    Join this challenge to unlock{" "}
                    {challenge.allowedVerification.includes("image") &&
                    challenge.allowedVerification.includes("gps")
                      ? "Image Upload & GPS Check-In"
                      : challenge.allowedVerification.includes("gps")
                      ? "GPS Check-In"
                      : "Image Upload"}{" "}
                    verification.
                  </span>
                </div>
              ) : completed ? (
                <div style={styles.completedProofBox}>
                  <CheckCircle2 size={36} color="#16a34a" />
                  <div style={{ textAlign: "center" }}>
                    <div style={styles.completedProofTitle}>
                      Challenge Verified & Completed!
                    </div>
                    <div style={styles.completedProofSub}>
                      You earned <strong>+{challenge.points} Eco Points</strong>
                      {challenge.badge ? ` and the "${challenge.badge.name}" badge!` : "."}
                    </div>
                  </div>

                  {imagePreview && (
                    <div style={styles.uploadedPreviewContainer}>
                      <span style={styles.uploadedPreviewLabel}>
                        Submitted Photo Proof:
                      </span>
                      <img
                        src={imagePreview}
                        alt="Submitted proof"
                        style={styles.uploadedProofImg}
                      />
                    </div>
                  )}

                  {gpsStatus && (
                    <div style={styles.gpsSuccessBadge}>
                      <Navigation size={14} /> {gpsStatus.message}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {challenge.allowedVerification.length > 1 && (
                    <div style={styles.tabContainer}>
                      {challenge.allowedVerification.includes("image") && (
                        <button
                          type="button"
                          style={{
                            ...styles.tabBtn,
                            ...(activeTab === "image" ? styles.tabBtnActive : {}),
                          }}
                          onClick={() => setActiveTab("image")}
                        >
                          <Camera size={16} /> Upload Photo Proof
                        </button>
                      )}
                      {challenge.allowedVerification.includes("gps") && (
                        <button
                          type="button"
                          style={{
                            ...styles.tabBtn,
                            ...(activeTab === "gps" ? styles.tabBtnActive : {}),
                          }}
                          onClick={() => setActiveTab("gps")}
                        >
                          <Navigation size={16} /> GPS Check-In
                        </button>
                      )}
                    </div>
                  )}

                  {activeTab === "image" && (
                    <div style={styles.verificationBody}>
                      <p style={styles.methodDescription}>
                        Upload a clear photo verifying your participation in{" "}
                        <strong>{challenge.title}</strong>.
                      </p>

                      {!imagePreview ? (
                        <label style={styles.dropZone}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            style={{ display: "none" }}
                          />
                          <Upload size={32} color="#9ca3af" />
                          <span style={styles.dropZoneText}>
                            Click to upload or drag photo here
                          </span>
                          <span style={styles.dropZoneSubtext}>
                            PNG, JPG, or WEBP up to 10MB
                          </span>
                        </label>
                      ) : (
                        <div style={styles.previewBox}>
                          <img
                            src={imagePreview}
                            alt="Preview"
                            style={styles.previewImg}
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            style={styles.removeImgBtn}
                            title="Remove photo"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={!imagePreview || isSubmitting}
                        onClick={handleSubmitPhotoProof}
                        style={{
                          ...styles.submitBtn,
                          ...(!imagePreview || isSubmitting
                            ? styles.submitBtnDisabled
                            : {}),
                        }}
                      >
                        {isSubmitting ? "Verifying Photo..." : "Submit Photo Proof"}
                      </button>
                    </div>
                  )}

                  {activeTab === "gps" && (
                    <div style={styles.verificationBody}>
                      <p style={styles.methodDescription}>
                        Verify your presence at <strong>{challenge.location}</strong> using device geolocation.
                      </p>

                      <div style={styles.gpsCard}>
                        <Navigation size={32} color="#2563eb" />
                        <div>
                          <div style={styles.gpsTitle}>Location Check-In</div>
                          <div style={styles.gpsSub}>
                            Target Zone: {challenge.location}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={gpsLoading}
                        onClick={handleGpsCheckIn}
                        style={styles.gpsSubmitBtn}
                      >
                        <Navigation size={16} />
                        {gpsLoading ? "Acquiring GPS Location..." : "Check In via GPS"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ ...styles.card, marginTop: 20 }}>
              <h2 style={styles.sectionHeader}>Rules & Guidelines</h2>
              <ul style={styles.rulesList}>
                {challenge.rules.map((rule, idx) => (
                  <li key={idx} style={styles.ruleItem}>
                    <ShieldCheck size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div style={styles.sideCol}>
            <div style={{ ...styles.card, position: "sticky", top: 20 }}>
              <div style={styles.actionCardHeader}>
                <Clock size={16} color="#6b7280" />
                <span>Duration: {challenge.duration}</span>
              </div>

              {completed ? (
                <div style={styles.completedBox}>
                  <CheckCircle2 size={32} color="#16a34a" />
                  <div style={styles.completedBoxTitle}>Challenge Completed!</div>
                  <div style={styles.completedBoxSub}>
                    You earned <strong>+{challenge.points} pts</strong>
                  </div>
                </div>
              ) : joined ? (
                <button type="button" style={styles.inProgressActionBtn} disabled>
                  <Clock size={16} /> Challenge In Progress
                </button>
              ) : (
                <button type="button" onClick={handleJoin} style={styles.joinActionBtn}>
                  Join Challenge
                </button>
              )}

              <button
                type="button"
                style={{
                  ...styles.shareBtn,
                  ...(isGeneratingShare ? { opacity: 0.7, cursor: "not-allowed" } : {})
                }}
                onClick={handleShareStory}
                disabled={isGeneratingShare}
              >
                <Share2 size={15} /> 
                {isGeneratingShare ? "Generating Story..." : "Share to IG Story"}
              </button>
            </div>
          </div>
        </div>

        {showToast && (
          <div style={styles.toastNotification}>
            <div style={styles.toastHeader}>
              <CheckCircle2 size={20} color="#16a34a" />
              <span style={styles.toastTitle}>Challenge Completed!</span>
            </div>
            <p style={styles.toastText}>
              You have successfully completed this challenge and earned {challenge.points} Eco Points!
            </p>
            <button
              onClick={handleNavigateToCompleted}
              style={styles.toastLinkBtn}
            >
              View in Completed Challenges
            </button>
            <button onClick={() => setShowToast(false)} style={styles.toastCloseBtn}>
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}

const styles = {
  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#f9fafb",
  },
  loadingText: {
    color: "#6b7280",
  },
  content: {
    padding: "28px 32px",
    maxWidth: 1180,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
    position: "relative",
  },
  backButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    border: "none",
    color: "#4b5563",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 16,
    padding: 0,
  },
  heroCard: {
    position: "relative",
    height: 260,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  heroOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.1) 100%)",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
  },
  badgeRow: {
    display: "flex",
    gap: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  tagBadge: {
    background: "#2563eb",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 999,
  },
  badgeRewardTag: {
    background: "#f59e0b",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  locationBadge: {
    background: "rgba(255,255,255,0.2)",
    backdropFilter: "blur(4px)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: 800,
    margin: 0,
  },
  heroSubtitle: {
    color: "#e5e7eb",
    fontSize: 14,
    marginTop: 4,
  },
  twoColGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 320px",
    gap: 20,
  },
  mainCol: {},
  sideCol: {},
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 12px 0",
  },
  descriptionText: {
    color: "#4b5563",
    fontSize: 14.5,
    lineHeight: 1.6,
  },
  quickStatsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTop: "1px solid #f3f4f6",
  },
  quickStatBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#f9fafb",
    padding: 12,
    borderRadius: 10,
  },
  quickStatValue: {
    fontWeight: 800,
    fontSize: 15,
    color: "#111827",
  },
  quickStatLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  rowHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  verifiedBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: "#dcfce7",
    color: "#15803d",
    fontSize: 12.5,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 999,
  },
  lockedBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#fef3c7",
    color: "#92400e",
    padding: "14px 16px",
    borderRadius: 10,
    fontSize: 13.5,
    fontWeight: 500,
    marginTop: 10,
  },
  tabContainer: {
    display: "flex",
    gap: 10,
    marginTop: 12,
    marginBottom: 16,
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 10,
  },
  tabBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    color: "#6b7280",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  tabBtnActive: {
    background: "#f0fdf4",
    color: "#16a34a",
  },
  verificationBody: {
    marginTop: 10,
  },
  methodDescription: {
    fontSize: 13.5,
    color: "#4b5563",
    marginBottom: 14,
  },
  dropZone: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    border: "2px dashed #d1d5db",
    borderRadius: 12,
    padding: "30px 20px",
    background: "#f9fafb",
    cursor: "pointer",
    transition: "border-color 0.2s ease",
  },
  dropZoneText: {
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
    marginTop: 8,
  },
  dropZoneSubtext: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  previewBox: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    maxHeight: 220,
    border: "1px solid #e5e7eb",
  },
  previewImg: {
    width: "100%",
    height: "100%",
    maxHeight: 220,
    objectFit: "cover",
    display: "block",
  },
  removeImgBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    background: "rgba(0,0,0,0.6)",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    width: 28,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  submitBtn: {
    width: "100%",
    marginTop: 14,
    padding: "12px 0",
    borderRadius: 10,
    border: "none",
    background: "#16a34a",
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
  submitBtnDisabled: {
    background: "#9ca3af",
    cursor: "not-allowed",
  },
  gpsCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  gpsTitle: {
    fontWeight: 700,
    fontSize: 15,
    color: "#1e40af",
  },
  gpsSub: {
    fontSize: 13,
    color: "#3b82f6",
    marginTop: 2,
  },
  gpsSubmitBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "12px 0",
    borderRadius: 10,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
  completedProofBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 12,
    padding: 24,
    marginTop: 10,
  },
  completedProofTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: "#166534",
  },
  completedProofSub: {
    fontSize: 13.5,
    color: "#15803d",
    marginTop: 4,
  },
  uploadedPreviewContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  uploadedPreviewLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#166534",
  },
  uploadedProofImg: {
    width: 120,
    height: 90,
    borderRadius: 8,
    objectFit: "cover",
    border: "2px solid #86efac",
  },
  gpsSuccessBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12.5,
    fontWeight: 600,
    color: "#1d4ed8",
    background: "#dbeafe",
    padding: "6px 14px",
    borderRadius: 999,
    marginTop: 4,
  },
  rulesList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  ruleItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    fontSize: 13.5,
    color: "#4b5563",
    lineHeight: 1.5,
  },
  actionCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13.5,
    color: "#4b5563",
    fontWeight: 600,
    marginBottom: 16,
  },
  joinActionBtn: {
    width: "100%",
    padding: "12px 0",
    borderRadius: 10,
    border: "none",
    background: "#16a34a",
    color: "#fff",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
  },
  inProgressActionBtn: {
    width: "100%",
    padding: "12px 0",
    borderRadius: 10,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  completedBox: {
    textAlign: "center",
    padding: "16px 0",
    background: "#f0fdf4",
    borderRadius: 10,
    border: "1px solid #bbf7d0",
  },
  completedBoxTitle: {
    fontWeight: 800,
    fontSize: 16,
    color: "#166534",
    marginTop: 8,
  },
  completedBoxSub: {
    fontSize: 13,
    color: "#15803d",
    marginTop: 4,
  },
  shareBtn: {
    width: "100%",
    marginTop: 10,
    padding: "10px 0",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    fontWeight: 600,
    fontSize: 13.5,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  toastNotification: {
    position: "fixed",
    bottom: 24,
    right: 24,
    background: "#fff",
    border: "2px solid #bbf7d0",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
    zIndex: 1000,
    width: 320,
    animation: "slideIn 0.3s ease-out forwards",
  },
  toastHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  toastTitle: {
    fontWeight: 700,
    color: "#166534",
    fontSize: 16,
  },
  toastText: {
    color: "#4b5563",
    fontSize: 13.5,
    marginBottom: 16,
    lineHeight: 1.4,
  },
  toastLinkBtn: {
    width: "100%",
    padding: "10px 0",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 14,
  },
  toastCloseBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#9ca3af",
  },
};
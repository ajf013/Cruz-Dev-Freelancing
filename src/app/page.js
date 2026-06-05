"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { 
  Laptop, 
  Palette, 
  Video, 
  Sparkles, 
  ArrowRight, 
  Code, 
  CheckCircle, 
  Layers, 
  Terminal,
  ExternalLink,
  Star,
  User,
  Award
} from "lucide-react";
import Chatbot from "../components/Chatbot";
import { PRICING_CONFIG } from "../config/pricing";

const PORTFOLIO_ITEMS = [
  {
    id: 1,
    title: "Synapse Analytics Platform",
    category: "Websites",
    desc: "A futuristic SaaS dashboard showcasing clean analytics, custom charts, and a glowing glassmorphism dashboard layout.",
    img: "/showcase-website.png",
    tech: ["Next.js", "Vanilla CSS", "React Chartjs", "Vercel"],
  },
  {
    id: 2,
    title: "Synthwave Nebula 2049",
    category: "Posters",
    desc: "A vibrant electronic music festival marketing poster utilizing cyberpunk themes, soundwave graphics, and neon accents.",
    img: "/showcase-poster.png",
    tech: ["Photoshop", "Vector Illustration", "Graphic Design"],
  },
  {
    id: 3,
    title: "Easy PWA Video Guide",
    category: "Thumbnails",
    desc: "A high-CTR click-worthy YouTube video thumbnail designed to capture viewer focus with glowing titles and 3D pointer details.",
    img: "/showcase-thumbnail.png",
    tech: ["Canva", "Thumbnail design", "A/B Testing"],
  },
  {
    id: 4,
    title: "Nocturne Photography Studio",
    category: "Websites",
    desc: "A sleek, dark portfolio landing page built for photographers, displaying clean layouts, photo galleries, and subtle purple neon glowing borders.",
    img: "/showcase-website-2.png",
    tech: ["React", "CSS Modules", "Intersection Observer"],
  },
  {
    id: 5,
    title: "Celestial Odyssey Sci-Fi Movie",
    category: "Posters",
    desc: "A space exploration movie art poster in a classic 80s aesthetic, displaying a retro rocket launching into a glowing nebula.",
    img: "/showcase-poster-2.png",
    tech: ["Illustrator", "Texture Mapping", "Print Layout"],
  },
  {
    id: 6,
    title: "10X Crypto Trading Secrets",
    category: "Thumbnails",
    desc: "A high-contrast YouTube video thumbnail focusing on cryptocurrency secrets, incorporating bright green charting details and mobile layout graphics.",
    img: "/showcase-thumbnail-2.png",
    tech: ["Graphic Design", "C4D Render", "Visual Contrast"],
  },
  {
    id: 7,
    title: "Azure Solutions Architect Certification Training",
    category: "MCT & Azure",
    desc: "An intensive exam prep workshop covering secure subnets, VPN gateways, load balancing, databases, and governance models for AZ-305.",
    img: "/showcase-advisory.png",
    tech: ["MCT Guidance", "Azure Portal", "Cert Prep", "Live Lab"],
  }
];

const SERVICES = [
  {
    name: "Websites",
    icon: <Laptop size={24} color={PRICING_CONFIG.Websites.iconColor} />,
    price: PRICING_CONFIG.Websites.displayMinPrice,
    features: PRICING_CONFIG.Websites.features,
  },
  {
    name: "Posters",
    icon: <Palette size={24} color={PRICING_CONFIG.Posters.iconColor} />,
    price: PRICING_CONFIG.Posters.displayMinPrice,
    features: PRICING_CONFIG.Posters.features,
  },
  {
    name: "Thumbnails",
    icon: <Video size={24} color={PRICING_CONFIG.Thumbnails.iconColor} />,
    price: PRICING_CONFIG.Thumbnails.displayMinPrice,
    features: PRICING_CONFIG.Thumbnails.features,
  },
  {
    name: "Azure Training & Consulting",
    icon: <Award size={24} color={PRICING_CONFIG.Advisory.iconColor} />,
    price: PRICING_CONFIG.Advisory.displayMinPrice,
    features: PRICING_CONFIG.Advisory.features,
  }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("All");
  const [reviews, setReviews] = useState([]);
  const [reviewName, setReviewName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
        }
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -50px 0px" });

    const animatedElements = document.querySelectorAll(".reveal, .reveal-left, .reveal-right, .scale-up");
    animatedElements.forEach((el) => observer.observe(el));

    return () => {
      animatedElements.forEach((el) => observer.unobserve(el));
    };
  }, [activeTab, reviews]);

  const fetchReviews = async () => {
    try {
      const res = await fetch("/api/reviews");
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (err) {
      console.error("Failed to load reviews", err);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) return;
    setIsSubmittingReview(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: reviewName,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReviews((prev) => [data.review, ...prev]);
        setReviewName("");
        setReviewComment("");
        setReviewRating(5);
        setReviewSuccess(true);
        setTimeout(() => setReviewSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const filteredPortfolio = activeTab === "All" 
    ? PORTFOLIO_ITEMS 
    : PORTFOLIO_ITEMS.filter(item => item.category === activeTab);

  const handleOpenChat = () => {
    window.dispatchEvent(new CustomEvent("open-booking-chat"));
  };

  return (
    <div style={styles.page}>
      {/* Navigation Bar */}
      <header style={styles.header} className="glass">
        <div style={styles.navContainer}>
          <div style={styles.logoRow}>
            <div style={styles.logoGlow}>
              <Image 
                src="/logo.png" 
                alt="Cruz Dev Logo" 
                width={36} 
                height={36} 
                style={styles.logoImage}
              />
            </div>
            <span style={styles.brandName}>CRUZ DEV</span>
          </div>
          <nav style={styles.nav}>
            <a href="#portfolio" style={styles.navLink}>Portfolio</a>
            <a href="#services" style={styles.navLink}>Services</a>
            <button onClick={handleOpenChat} style={styles.navBookBtn}>
              Book Now
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section style={styles.heroSection}>
        <div className="container" style={styles.heroContainer}>
          <div style={styles.badgeRow}>
            <div style={styles.heroBadge} className="fade-in-up">
              <Sparkles size={14} color="#06b6d4" />
              <span>Available for Freelance Projects</span>
            </div>
          </div>
          <h1 style={styles.heroTitle} className="fade-in-up hero-title-delay animate-shimmer">
            We build websites, posters, & thumbnails that <span className="gradient-accent">convert.</span>
          </h1>
          <p style={styles.heroSubtitle} className="fade-in-up hero-desc-delay">
            Custom-tailored web development, high-impact branding posters, and click-maximizing video thumbnails designed to accelerate your brand.
          </p>
          <div style={styles.heroActions} className="fade-in-up hero-btn-delay">
            <button onClick={handleOpenChat} className="btn-primary btn-shine">
              <span>Book Project</span>
              <ArrowRight size={18} />
            </button>
            <a href="#portfolio" className="btn-secondary">
              <span>View Portfolio</span>
            </a>
          </div>
        </div>
      </section>

      {/* Showcase / Portfolio Section */}
      <section id="portfolio" style={styles.section}>
        <div className="container">
          <div style={styles.sectionHeader} className="reveal">
            <h2 style={styles.sectionTitle}>Featured Showcase</h2>
            <p style={styles.sectionSubtitle}>Recent works coded and designed for international clients.</p>
          </div>

          {/* Category Filter Tabs */}
          <div style={styles.tabsContainer} className="reveal delay-1">
            {["All", "Websites", "Posters", "Thumbnails", "MCT & Azure"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={activeTab === tab ? styles.activeTabBtn : styles.tabBtn}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Portfolio Grid */}
          <div style={styles.portfolioGrid}>
            {filteredPortfolio.map((item, idx) => (
              <article 
                key={item.id} 
                style={styles.portfolioCard} 
                className={`glass glass-hover scale-up delay-${(idx % 3) + 1}`}
              >
                <div style={styles.imageContainer}>
                  <img
                    src={item.img}
                    alt={item.title}
                    style={styles.showcaseImage}
                  />
                  <span style={styles.categoryTag(item.category)}>{item.category}</span>
                </div>
                <div style={styles.cardContent}>
                  <h3 style={styles.cardTitle}>{item.title}</h3>
                  <p style={styles.cardDesc}>{item.desc}</p>
                  <div style={styles.techRow}>
                    {item.tech.map((t, idx) => (
                      <span key={idx} style={styles.techBadge}>{t}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Services & Booking Pricing Section */}
      <section id="services" style={styles.sectionBg}>
        <div className="container">
          <div style={styles.sectionHeader} className="reveal">
            <h2 style={styles.sectionTitle}>Services & Packaging</h2>
            <p style={styles.sectionSubtitle}>Select a package and book immediately via our automated booking assistant.</p>
          </div>

          <div style={styles.servicesGrid}>
            {SERVICES.map((srv, idx) => (
              <div key={idx} style={styles.serviceCard} className={`glass scale-up delay-${idx + 1}`}>
                <div style={styles.serviceHeader}>
                  <div style={styles.serviceIcon}>{srv.icon}</div>
                  <h3 style={styles.serviceName}>{srv.name}</h3>
                </div>
                <div style={styles.servicePrice}>
                  <span style={styles.priceLabel}>Starting from</span>
                  <div style={styles.priceAmount}>{srv.price}</div>
                </div>
                <ul style={styles.featureList}>
                  {srv.features.map((feat, fIdx) => (
                    <li key={fIdx} style={styles.featureItem}>
                      <CheckCircle size={16} color="#06b6d4" style={{ flexShrink: 0 }} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={handleOpenChat} style={styles.serviceBookBtn} className="btn-shine">
                  Book {srv.name} Service
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Guarantee Section */}
      <section style={styles.section}>
        <div className="container" style={styles.trustBox}>
          <div style={styles.trustGrid} className="glass reveal">
            <div style={styles.trustText} className="reveal-left delay-1">
              <h2 style={styles.trustTitle}>Fully Resilient Billing & Support</h2>
              <p style={styles.trustDesc}>
                We support frictionless payouts via any active UPI app (BHIM, GPay, PhonePe, Paytm) by scanning our dynamic booking QR codes. Provide your UTR Reference ID and get instant confirmation.
              </p>
            </div>
            <div style={styles.trustBadges} className="reveal-right delay-2">
              <div style={styles.trustBadgeItem}>
                <CheckCircle size={20} color="#06b6d4" />
                <span>100% Satisfaction Guarantee</span>
              </div>
              <div style={styles.trustBadgeItem}>
                <CheckCircle size={20} color="#06b6d4" />
                <span>Delivery within 24-72 hours</span>
              </div>
              <div style={styles.trustBadgeItem}>
                <CheckCircle size={20} color="#06b6d4" />
                <span>Secure Azure DB Integrations</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Reviews Section */}
      <section id="reviews" style={styles.sectionBg}>
        <div className="container">
          <div style={styles.sectionHeader} className="reveal">
            <h2 style={styles.sectionTitle}>Client Reviews</h2>
            <p style={styles.sectionSubtitle}>Hear directly from clients about their experiences, both good and bad.</p>
          </div>

          <div style={styles.reviewsLayout}>
            {/* Reviews List */}
            <div style={styles.reviewsList}>
              {reviews.length === 0 ? (
                <div style={styles.emptyReviews}>No reviews submitted yet. Be the first!</div>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} style={styles.reviewCard} className="glass">
                    <div style={styles.reviewHeader}>
                      <div style={styles.reviewerAvatar}>
                        <User size={16} color="#c0bacc" />
                      </div>
                      <div>
                        <div style={styles.reviewerName}>{rev.name}</div>
                        <div style={styles.reviewDate}>
                          {new Date(rev.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </div>
                      </div>
                    </div>
                    <div style={styles.ratingRow}>
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          fill={i < rev.rating ? "#eab308" : "none"}
                          color={i < rev.rating ? "#eab308" : "rgba(255,255,255,0.15)"}
                        />
                      ))}
                    </div>
                    <p style={styles.reviewText}>{rev.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Submit Review Form */}
            <div style={styles.reviewFormContainer} className="glass">
              <h3 style={styles.formTitle}>Leave a Review</h3>
              <p style={styles.formSubtitle}>Share your honest feedback about our services.</p>
              
              <form onSubmit={handleReviewSubmit} style={styles.reviewForm}>
                <label style={styles.formLabel}>
                  Your Name
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    style={styles.formInput}
                  />
                </label>

                <div style={styles.ratingInputLabel}>
                  Rating
                  <div style={styles.starsInputRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        style={styles.starInputBtn}
                        title={`${star} Star${star > 1 ? "s" : ""}`}
                      >
                        <Star
                          size={22}
                          fill={star <= reviewRating ? "#eab308" : "none"}
                          color={star <= reviewRating ? "#eab308" : "rgba(255,255,255,0.3)"}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <label style={styles.formLabel}>
                  Your Comments
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe your experience working with us, good or bad..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    style={styles.formTextarea}
                  />
                </label>

                {reviewSuccess && (
                  <div style={styles.reviewSuccessMsg}>
                    <CheckCircle size={14} /> Review submitted successfully! Thank you.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  style={styles.submitReviewBtn}
                >
                  {isSubmittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div className="container" style={styles.footerContainer}>
          <p style={styles.footerCopyright}>© {new Date().getFullYear()} Cruz Dev.</p>
          <div style={styles.footerLinks}>
            <a href="#portfolio" style={styles.footerLink}>Portfolio</a>
            <a href="#services" style={styles.footerLink}>Pricing</a>
            <button onClick={handleOpenChat} style={styles.footerContactBtn}>
              Contact
            </button>
          </div>
        </div>
      </footer>

      {/* Booking Assistant Chatbot */}
      <Chatbot />
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    zIndex: 1,
  },
  header: {
    position: "fixed",
    top: "16px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "calc(100% - 32px)",
    maxWidth: "1200px",
    zIndex: 100,
    borderRadius: "14px",
    boxShadow: "0 4px 30px rgba(0, 0, 0, 0.3)",
  },
  navContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoGlow: {
    padding: "2px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    borderRadius: "50%",
  },
  brandName: {
    fontFamily: "var(--font-outfit)",
    fontWeight: "800",
    fontSize: "1.1rem",
    letterSpacing: "1.5px",
    color: "#fff",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: "24px",
  },
  navLink: {
    fontSize: "0.85rem",
    fontWeight: "500",
    color: "#c0bacc",
    transition: "color 0.2s",
  },
  navBookBtn: {
    background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
    border: "none",
    color: "#fff",
    padding: "8px 18px",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "0.82rem",
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(147, 51, 234, 0.3)",
    transition: "transform 0.2s",
  },
  heroSection: {
    padding: "160px 0 100px 0",
    position: "relative",
    overflow: "hidden",
    textAlign: "center",
  },
  heroContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "24px",
    maxWidth: "800px",
  },
  badgeRow: {
    display: "flex",
    justifyContent: "center",
  },
  heroBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(6, 182, 212, 0.08)",
    border: "1px solid rgba(6, 182, 212, 0.2)",
    color: "#06b6d4",
    padding: "6px 16px",
    borderRadius: "20px",
    fontSize: "0.8rem",
    fontWeight: "600",
  },
  heroTitle: {
    fontFamily: "var(--font-outfit)",
    fontSize: "3.5rem",
    fontWeight: "800",
    lineHeight: "1.15",
    color: "#fff",
    letterSpacing: "-1px",
  },
  heroSubtitle: {
    fontSize: "1.1rem",
    color: "#c0bacc",
    lineHeight: "1.6",
    maxWidth: "640px",
  },
  heroActions: {
    display: "flex",
    gap: "16px",
    marginTop: "8px",
  },
  section: {
    padding: "80px 0",
  },
  sectionBg: {
    padding: "80px 0",
    background: "rgba(255,255,255,0.01)",
    borderTop: "1px solid rgba(255,255,255,0.02)",
    borderBottom: "1px solid rgba(255,255,255,0.02)",
  },
  sectionHeader: {
    textAlign: "center",
    marginBottom: "48px",
  },
  sectionTitle: {
    fontFamily: "var(--font-outfit)",
    fontSize: "2.25rem",
    fontWeight: "700",
    color: "#fff",
    marginBottom: "12px",
  },
  sectionSubtitle: {
    fontSize: "0.95rem",
    color: "#c0bacc",
  },
  tabsContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    marginBottom: "40px",
  },
  tabBtn: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#c0bacc",
    padding: "8px 20px",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "500",
    transition: "var(--transition-smooth)",
  },
  activeTabBtn: {
    background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
    border: "none",
    color: "#fff",
    padding: "8px 20px",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "600",
    boxShadow: "0 4px 10px rgba(147, 51, 234, 0.3)",
  },
  portfolioGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "30px",
  },
  portfolioCard: {
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    paddingTop: "56.25%", // 16:9 ratio
    overflow: "hidden",
  },
  showcaseImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  categoryTag: (category) => {
    const isWeb = category === "Websites";
    const isPoster = category === "Posters";
    const isMct = category === "MCT & Azure";
    return {
      position: "absolute",
      top: "12px",
      left: "12px",
      fontSize: "0.75rem",
      fontWeight: "700",
      padding: "4px 10px",
      borderRadius: "6px",
      background: isWeb ? "#06b6d4" : isPoster ? "#9333ea" : isMct ? "#10b981" : "#ec4899",
      color: isWeb ? "#08070d" : "#fff",
    };
  },
  cardContent: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    flex: 1,
  },
  cardTitle: {
    fontFamily: "var(--font-outfit)",
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#fff",
  },
  cardDesc: {
    fontSize: "0.85rem",
    color: "#c0bacc",
    lineHeight: "1.5",
    flex: 1,
  },
  techRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginTop: "8px",
  },
  techBadge: {
    fontSize: "0.7rem",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "3px 8px",
    borderRadius: "4px",
    color: "#c0bacc",
  },
  servicesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "30px",
  },
  serviceCard: {
    padding: "36px 30px",
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  serviceHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
  },
  serviceIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.04)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  serviceName: {
    fontFamily: "var(--font-outfit)",
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#fff",
  },
  servicePrice: {
    marginBottom: "24px",
  },
  priceLabel: {
    fontSize: "0.78rem",
    color: "#8c82a0",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  priceAmount: {
    fontSize: "2rem",
    fontWeight: "800",
    color: "#fff",
    marginTop: "4px",
    fontFamily: "var(--font-outfit)",
  },
  featureList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    listStyle: "none",
    flex: 1,
    marginBottom: "36px",
  },
  featureItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    fontSize: "0.85rem",
    color: "#c0bacc",
    lineHeight: "1.4",
  },
  serviceBookBtn: {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#fff",
    padding: "12px",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "var(--transition-smooth)",
  },
  trustBox: {
    padding: "40px",
    borderRadius: "16px",
  },
  trustGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "30px",
    alignItems: "center",
  },
  trustTitle: {
    fontFamily: "var(--font-outfit)",
    fontSize: "1.75rem",
    fontWeight: "700",
    color: "#fff",
    marginBottom: "12px",
  },
  trustDesc: {
    fontSize: "0.9rem",
    color: "#c0bacc",
    lineHeight: "1.6",
  },
  trustBadges: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  trustBadgeItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "0.9rem",
    color: "#fff",
    fontWeight: "500",
  },
  footer: {
    marginTop: "auto",
    padding: "40px 0",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    background: "#050409",
  },
  footerContainer: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
  },
  footerCopyright: {
    fontSize: "0.8rem",
    color: "#8c82a0",
  },
  footerLinks: {
    display: "flex",
    alignItems: "center",
    gap: "24px",
  },
  footerLink: {
    fontSize: "0.8rem",
    color: "#8c82a0",
    textDecoration: "none",
  },
  footerContactBtn: {
    background: "none",
    border: "none",
    color: "#8c82a0",
    cursor: "pointer",
    fontSize: "0.8rem",
  },
  reviewsLayout: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "40px",
    alignItems: "start",
    marginTop: "20px",
  },
  reviewsList: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    maxHeight: "550px",
    overflowY: "auto",
    paddingRight: "10px",
  },
  emptyReviews: {
    textAlign: "center",
    color: "#8c82a0",
    padding: "40px 0",
    fontSize: "0.9rem",
  },
  reviewCard: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  reviewHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  reviewerAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  reviewerName: {
    fontWeight: "600",
    fontSize: "0.9rem",
    color: "#fff",
  },
  reviewDate: {
    fontSize: "0.72rem",
    color: "#8c82a0",
    marginTop: "2px",
  },
  ratingRow: {
    display: "flex",
    gap: "2px",
  },
  reviewText: {
    fontSize: "0.85rem",
    color: "#c0bacc",
    lineHeight: "1.5",
  },
  reviewFormContainer: {
    padding: "30px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  formTitle: {
    fontFamily: "var(--font-outfit)",
    fontSize: "1.3rem",
    fontWeight: "600",
    color: "#fff",
  },
  formSubtitle: {
    fontSize: "0.82rem",
    color: "#8c82a0",
  },
  reviewForm: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "100%",
  },
  formLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "0.82rem",
    color: "#c0bacc",
    fontWeight: "500",
  },
  formInput: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#fff",
    fontSize: "0.85rem",
    outline: "none",
  },
  formTextarea: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#fff",
    fontSize: "0.85rem",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
  ratingInputLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "0.82rem",
    color: "#c0bacc",
    fontWeight: "500",
  },
  starsInputRow: {
    display: "flex",
    gap: "6px",
  },
  starInputBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "2px",
    transition: "transform 0.1s ease",
  },
  reviewSuccessMsg: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#06b6d4",
    background: "rgba(6, 182, 212, 0.08)",
    padding: "10px",
    borderRadius: "6px",
    fontSize: "0.78rem",
  },
  submitReviewBtn: {
    background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(147, 51, 234, 0.3)",
    transition: "transform 0.2s",
  },
};

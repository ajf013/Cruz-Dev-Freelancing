// Centralized pricing config for Cruz Dev services
// Edit the prices, names, and descriptions here. They will update both the landing page cards and the chatbot checkout automatically!

export const PRICING_CONFIG = {
  Websites: {
    displayMinPrice: "₹1,000", // Price displayed on the main page card
    iconColor: "#06b6d4",
    features: [
      "Custom React / Next.js architecture",
      "Fully responsive and mobile-optimized",
      "PWA installation enabled",
      "SEO semantic coding structures",
      "Dynamic contact forms / databases"
    ],
    packages: [
      { name: "Single Landing Page", price: 1000, desc: "High-converting single-page site with smooth scrolls." },
      { name: "Complete SEO Website", price: 10000, desc: "Optimized multi-page site built for Google search rankings on top result #1." },
      { name: "PWA Enabled Web App", price: 5000, desc: "Offline caching, lightning performance, installable app." },
      { name: "Web App with Payment Gateway", price: 15000, desc: "Stripe, PayPal, or UPI scanning checkout integration." },
      { name: "E-Commerce Web Store", price: 25000, desc: "Product catalogue, checkout cart flow, and invoicing dashboard." }
    ]
  },
  Posters: {
    displayMinPrice: "500", // Price displayed on the main page card
    iconColor: "#a855f7",
    features: [
      "Cyberpunk, minimalist, or vector styles",
      "High-resolution vector assets",
      "Ready-to-print source formats",
      "Social media banner optimizations",
      "Unlimited initial drafts"
    ],
    packages: [
      { name: "Social Media Banner", price: 500, desc: "Custom graphic banner for IG/LinkedIn/Twitter." },
      { name: "Marketing Event Poster", price: 600, desc: "High-impact visual poster for advertising." },
      { name: "Product Promo Banner", price: 700, desc: "Professional product ad banner for web or print marketing." },
      { name: "Corporate Event Poster", price: 800, desc: "Polished corporate marketing graphics and slide decks." },
      { name: "Premium Vector Poster", price: 900, desc: "Infinite scaling vector art, print-ready format." }
    ]
  },
  Thumbnails: {
    displayMinPrice: "400", // Price displayed on the main page card
    iconColor: "#ec4899",
    features: [
      "Bold typography and custom styling",
      "High CTR saturation levels",
      "Optimized for mobile & TV screens",
      "Photoshop & vector source files",
      "Delivered in under 24 hours"
    ],
    packages: [
      { name: "Single High-CTR Thumbnail", price: 500, desc: "A/B tested styling for maximum click-through rates." },
      { name: "Pack of 5 Thumbnails", price: 6000, desc: "Five high-quality custom video thumbnails." },
      { name: "Pack of 10 Thumbnails", price: 7000, desc: "Ten premium thumbnails, PSD source files included." },
      { name: "Branded YouTube Creator Kit", price: 8000, desc: "Channel banner art, avatar icon, and 3 custom video thumbnails." }
    ]
  },
  Advisory: {
    displayMinPrice: "₹5,000+", // Price displayed on the main page card
    iconColor: "#10b981", // Emerald green representing mentoring & Azure cloud
    features: [
      "Official MCT (Microsoft Certified Trainer) guidance",
      "Tailored mentorship for Azure certification exams",
      "Interactive guest lectures & training sessions",
      "Cloud resource creation directly on your own tenant",
      "Architecture design & deployment assistance"
    ],
    packages: [
      { name: "Certification Exam Prep", price: 2500, desc: "Study plans, materials, and mentoring for AZ-900 / AZ-104 / AZ-305." },
      { name: "Guest Lecture / Workshop Session", price: 5000, desc: "2-hour guest lecture or workshop on cloud architecture & concepts." },
      { name: "Azure Architecture Setup (Client Portal)", price: 6500, desc: "We guide you live to build and configure resources on your own Azure portal." },
      { name: "Azure Managed Deployment (Host Portal)", price: 8500, desc: "We build, deploy, and host the required resources on your behalf on our portal." }
    ]
  }
};

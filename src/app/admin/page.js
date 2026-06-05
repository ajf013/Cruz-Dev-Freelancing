"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { 
  Lock, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  Layers, 
  ExternalLink,
  MessageCircle,
  AlertCircle,
  X
} from "lucide-react";

export default function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeTab, setActiveTab] = useState("bookings"); // bookings, chats
  const [selectedChat, setSelectedChat] = useState(null); // specific chat for log modal
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // Azure AD configurations
  const [azureAdEnabled, setAzureAdEnabled] = useState(false);
  const [oauthConfig, setOauthConfig] = useState({ clientId: "", tenantId: "" });

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const resBookings = await fetch("/api/booking?admin=true");
      if (resBookings.ok) {
        setBookings(await resBookings.json());
      }
      const resChats = await fetch("/api/chat-session?admin=true");
      if (resChats.ok) {
        setChats(await resChats.json());
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const verifyAndLoadPassword = async (pw) => {
    setLoading(true);
    setLoginError("");
    try {
      const resBookings = await fetch(`/api/booking?admin=true&password=${pw}`);
      const resChats = await fetch(`/api/chat-session?admin=true&password=${pw}`);

      if (resBookings.ok || resChats.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem("admin_password", pw);
        if (resBookings.ok) setBookings(await resBookings.json());
        if (resChats.ok) setChats(await resChats.json());
      } else {
        setLoginError("Invalid admin credentials or access denied.");
        sessionStorage.removeItem("admin_password");
      }
    } catch (err) {
      setLoginError("Network connection error verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const refreshDashboardData = async () => {
    if (password) {
      await verifyAndLoadPassword(password);
    } else {
      await loadDashboardData();
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      setCheckingAuth(true);
      try {
        const res = await fetch("/api/auth/check");
        if (res.ok) {
          const data = await res.json();
          setAzureAdEnabled(data.azureAdEnabled);
          setOauthConfig({ clientId: data.clientId, tenantId: data.tenantId });

          if (data.authenticated) {
            setIsAuthenticated(true);
            // Load dashboard data without password (uses cookie)
            const resB = await fetch("/api/booking?admin=true");
            if (resB.ok) setBookings(await resB.json());
            const resC = await fetch("/api/chat-session?admin=true");
            if (resC.ok) setChats(await resC.json());
          } else {
            // Check fallback password in sessionStorage
            const savedPassword = sessionStorage.getItem("admin_password");
            if (savedPassword) {
              setPassword(savedPassword);
              await verifyAndLoadPassword(savedPassword);
            }
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();

    // Check redirect error parameters
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get("error");
      if (errorParam) {
        if (errorParam === "unauthorized") {
          setLoginError("Access denied: Your Microsoft email is not authorized as Admin.");
        } else if (errorParam === "oauth_denied") {
          setLoginError("Microsoft login was cancelled or denied.");
        } else {
          setLoginError(`Authentication failed: ${errorParam.replace(/_/g, " ")}`);
        }
      }
    }
  }, []);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    verifyAndLoadPassword(password);
  };

  const handleMicrosoftLogin = () => {
    const { clientId, tenantId } = oauthConfig;
    if (!clientId) {
      alert("Azure AD Client ID is missing. Check your configuration.");
      return;
    }
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/callback`);
    const scope = encodeURIComponent("openid profile email User.Read");
    const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}&response_mode=query`;
    window.location.href = authUrl;
  };

  const handleUpdateStatus = async (bookingId, newStatus) => {
    setStatusMessage("");
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          bookingId,
          status: newStatus,
          password
        }),
      });

      if (res.ok) {
        // Refresh bookings list
        refreshDashboardData();
        setStatusMessage(`Successfully set order ${bookingId.slice(-4)} to ${newStatus}. Client notified!`);
        setTimeout(() => setStatusMessage(""), 4000);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update order status.");
      }
    } catch (err) {
      alert("Error updating order status.");
    }
  };

  const handleDeleteChat = async (sessionId) => {
    if (!confirm("Are you sure you want to delete this chat session log? This will remove the conversation record from Azure Cosmos DB.")) return;
    try {
      const res = await fetch(`/api/chat-session?id=${sessionId}&password=${password}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setChats((prev) => prev.filter((c) => c.id !== sessionId));
        setStatusMessage("Chat session deleted successfully.");
        setTimeout(() => setStatusMessage(""), 3000);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete chat session.");
      }
    } catch (err) {
      alert("Error deleting chat session.");
    }
  };

  const handleEndChat = async (chat) => {
    if (!confirm(`Are you sure you want to end this chat session with ${chat.clientName || "Anonymous Guest"}? This will reset the chat widget on their screen.`)) return;
    try {
      // If it's a placed order, we also want to mark the booking as closed
      if (chat.isOrderPlaced && chat.bookingData && chat.bookingData.id) {
        await fetch("/api/booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_status",
            bookingId: chat.bookingData.id,
            status: "closed",
            password
          }),
        });
      }

      // Delete the chat session from the database so the client polls and gets a 404, causing it to reset
      const res = await fetch(`/api/chat-session?id=${chat.id}&password=${password}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setChats((prev) => prev.filter((c) => c.id !== chat.id));
        setStatusMessage("Chat session ended and closed successfully.");
        setTimeout(() => setStatusMessage(""), 4000);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to end chat session.");
      }
    } catch (err) {
      console.error(err);
      alert("Error ending chat session.");
    }
  };

  if (checkingAuth) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginGlowRow}>
          <div style={styles.glow1}></div>
          <div style={styles.glow2}></div>
        </div>

        <div style={styles.loginCard} className="glass">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "24px" }}>
            <RefreshCw size={36} color="#06b6d4" className="spin" />
            <h2 style={{ fontFamily: "var(--font-outfit)", color: "#fff", fontSize: "1.2rem", fontWeight: "600" }}>Checking Credentials...</h2>
            <p style={{ fontSize: "0.85rem", color: "#a098b0" }}>Securing admin database parameters</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginGlowRow}>
          <div style={styles.glow1}></div>
          <div style={styles.glow2}></div>
        </div>

        <div style={styles.loginCard} className="glass">
          <div style={styles.lockIconContainer}>
            <Lock size={32} color="#06b6d4" />
          </div>
          <h1 style={styles.loginTitle}>Cruz Dev Admin</h1>
          <p style={styles.loginSubtitle}>Access control database dashboard</p>

          {azureAdEnabled ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", alignItems: "center" }}>
              <button 
                onClick={handleMicrosoftLogin} 
                style={styles.microsoftLoginBtn}
                disabled={loading}
              >
                <svg width="20" height="20" viewBox="0 0 23 23" style={{ marginRight: "12px" }}>
                  <rect x="0" y="0" width="11" height="11" fill="#F25022" />
                  <rect x="12" y="0" width="11" height="11" fill="#7FBA00" />
                  <rect x="0" y="12" width="11" height="11" fill="#00A1F1" />
                  <rect x="12" y="12" width="11" height="11" fill="#FFB900" />
                </svg>
                <span>{loading ? "Redirecting..." : "Sign in with Microsoft"}</span>
              </button>

              <div style={styles.loginDivider}>
                <span style={styles.dividerLine}></span>
                <span style={styles.dividerText}>OR SECURE PASS</span>
                <span style={styles.dividerLine}></span>
              </div>

              <form onSubmit={handleLoginSubmit} style={styles.loginForm}>
                <input
                  type="password"
                  placeholder="Enter Passcode Fallback"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.loginInput}
                  required
                />
                {loginError && (
                  <div style={styles.errorBanner}>
                    <AlertCircle size={14} />
                    <span>{loginError}</span>
                  </div>
                )}
                <button type="submit" disabled={loading} style={styles.loginBtn}>
                  {loading ? "Verifying..." : "Unlock with Password"}
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleLoginSubmit} style={styles.loginForm}>
              <input
                type="password"
                placeholder="Enter Admin Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.loginInput}
                required
              />
              {loginError && (
                <div style={styles.errorBanner}>
                  <AlertCircle size={14} />
                  <span>{loginError}</span>
                </div>
              )}
              <button type="submit" disabled={loading} style={styles.loginBtn}>
                {loading ? "Verifying..." : "Unlock Dashboard"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.adminPage}>
      {/* Background glow ambient layers */}
      <div style={styles.glowLayer1}></div>
      <div style={styles.glowLayer2}></div>

      <div className="container" style={styles.dashboardContainer}>
        {/* Dashboard Header */}
        <header style={styles.header}>
          <div>
            <div style={styles.logoRow}>
              <Image 
                src="/logo.png" 
                alt="Cruz Dev Logo" 
                width={36} 
                height={36} 
                style={styles.logoImage}
              />
              <span style={styles.logoText}>CRUZ DEV ADMIN</span>
            </div>
            <p style={styles.headerSubtitle}>Order management dashboard & real-time webhook updates</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={refreshDashboardData} style={styles.refreshBtn}>
              <RefreshCw size={16} />
              <span>Refresh Orders</span>
            </button>
            <button 
              onClick={() => {
                sessionStorage.removeItem("admin_password");
                if (azureAdEnabled) {
                  window.location.href = "/api/auth/logout";
                } else {
                  setIsAuthenticated(false);
                  setBookings([]);
                  setChats([]);
                }
              }} 
              style={styles.logoutBtn}
            >
              Lock Panel
            </button>
          </div>
        </header>

        {statusMessage && (
          <div style={styles.toastBanner}>
            <CheckCircle size={16} color="#22c55e" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Bookings & Chats Statistics Bar */}
        <section style={styles.statsRow}>
          <div style={styles.statItem} className="glass">
            <span style={styles.statLabel}>Total Bookings</span>
            <span style={styles.statVal}>{bookings.length}</span>
          </div>
          <div style={styles.statItem} className="glass">
            <span style={styles.statLabel}>Active Live Chats</span>
            <span style={styles.statVal}>
              {chats.filter(c => !c.isOrderPlaced).length}
            </span>
          </div>
          <div style={styles.statItem} className="glass">
            <span style={styles.statLabel}>Total Saved Chats</span>
            <span style={styles.statVal}>{chats.length}</span>
          </div>
          <div style={styles.statItem} className="glass">
            <span style={styles.statLabel}>Closed Orders</span>
            <span style={styles.statVal}>
              {bookings.filter(b => b.status === "closed").length}
            </span>
          </div>
        </section>

        {/* Tab Navigation */}
        <div style={styles.tabsRow}>
          <button 
            onClick={() => setActiveTab("bookings")}
            style={activeTab === "bookings" ? styles.activeTabBtn : styles.tabBtn}
          >
            Project Bookings ({bookings.length})
          </button>
          <button 
            onClick={() => setActiveTab("chats")}
            style={activeTab === "chats" ? styles.activeTabBtn : styles.tabBtn}
          >
            Live Chat Queue ({chats.length})
          </button>
        </div>

        {/* Active Tab Content List */}
        <div style={styles.tableWrapper} className="glass">
          {activeTab === "bookings" ? (
            bookings.length === 0 ? (
              <div style={styles.noData}>No client bookings registered in database.</div>
            ) : (
              <div style={styles.cardList}>
                {bookings.map((item) => (
                  <div key={item.id} style={styles.bookingCard} className="glass">
                    <div style={styles.cardHeader}>
                      <div>
                        <span style={styles.cardOrderId}>ORDER ID: #{item.id.slice(-6).toUpperCase()}</span>
                        <h3 style={styles.cardClientName}>{item.clientName}</h3>
                        <div style={styles.clientMetaRow}>
                          <span>{item.clientEmail}</span>
                          {item.whatsapp && (
                            <>
                              <span>•</span>
                              <span>+{item.whatsapp}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div>
                        <span style={styles.statusBadge(item.status || "unknown")}>{(item.status || "unknown").toUpperCase()}</span>
                      </div>
                    </div>

                    <div style={styles.cardDetails}>
                      <div style={styles.detailsColumn}>
                        <span style={styles.detailTitle}>Selected Package</span>
                        <p style={styles.detailValue}>{item.packageName} ({item.serviceType})</p>
                      </div>
                      <div style={styles.detailsColumn}>
                        <span style={styles.detailTitle}>Amount</span>
                        <p style={styles.detailValue}>
                          Total: <strong>₹{item.price.toLocaleString("en-IN")}</strong> / 
                          Deposit: <strong>₹{(item.price / 2).toLocaleString("en-IN")}</strong>
                        </p>
                      </div>
                    </div>

                    <div style={styles.requirementsBox}>
                      <span style={styles.detailTitle}>Project Requirements Brief</span>
                      <p style={styles.requirementsText}>{item.projectDetails}</p>
                    </div>

                    <div style={styles.paymentInfoRow}>
                      <div>
                        <span style={styles.detailTitle}>Deposit UTR (50%)</span>
                        <p style={styles.utrValue}>{item.depositUtr}</p>
                      </div>
                      <div>
                        <span style={styles.detailTitle}>Balance UTR (50%)</span>
                        <p style={styles.utrValue}>{item.remainingUtr || "Pending..."}</p>
                      </div>
                    </div>

                    {/* Booking Controls */}
                    <div style={styles.cardActions}>
                      {item.status === "deposit_paid" && (
                        <button 
                          onClick={() => handleUpdateStatus(item.id, "ready_to_deliver")}
                          style={styles.readyBtn}
                        >
                          Set Ready for Delivery (Request Final 50%)
                        </button>
                      )}
                      {item.status === "fully_paid" && (
                        <button 
                          onClick={() => handleUpdateStatus(item.id, "closed")}
                          style={styles.closeBtn}
                        >
                          Deliver Project & Close Chat
                        </button>
                      )}
                      {item.status === "closed" && (
                        <span style={styles.completedMessage}>
                          <CheckCircle size={16} /> Closed & Completed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            chats.length === 0 ? (
              <div style={styles.noData}>No active or stored chat sessions found on Azure.</div>
            ) : (
              <div style={styles.cardList}>
                {chats.map((item) => (
                  <div key={item.id} style={styles.bookingCard} className="glass">
                    <div style={styles.cardHeader}>
                      <div>
                        <span style={styles.cardOrderId}>CHAT SESSION: #{item.id.slice(-6).toUpperCase()}</span>
                        <h3 style={styles.cardClientName}>{item.clientName || "Anonymous Guest"}</h3>
                        <div style={styles.clientMetaRow}>
                          <span>{item.realEmail || "Email not entered yet"}</span>
                          <span>•</span>
                          <span>Last Activity Step: {item.step}</span>
                        </div>
                      </div>
                      <div>
                        <span style={item.isOrderPlaced ? styles.chatPlacedBadge : styles.chatBrowsingBadge}>
                          {item.isOrderPlaced ? "ORDER PLACED" : "GUEST BROWSING"}
                        </span>
                      </div>
                    </div>

                    <div style={styles.cardDetails}>
                      <div style={styles.detailsColumn}>
                        <span style={styles.detailTitle}>Last Sync Timestamp</span>
                        <p style={styles.detailValue}>{new Date(item.updatedAt).toLocaleString("en-IN")}</p>
                      </div>
                      <div style={styles.detailsColumn}>
                        <span style={styles.detailTitle}>Log Details</span>
                        <p style={styles.detailValue}>
                          {item.messages.length} exchanges • {item.messages.filter(m => !m.isBot).length} user entries
                        </p>
                      </div>
                    </div>

                    {item.bookingData && item.bookingData.packageName && (
                      <div style={styles.requirementsBox}>
                        <span style={styles.detailTitle}>Browsing Package Cart Details</span>
                        <p style={styles.requirementsText}>
                          {item.bookingData.packageName} ({item.bookingData.serviceType}) — Price: ₹{item.bookingData.price ? parseFloat(item.bookingData.price).toLocaleString("en-IN") : "0"}
                        </p>
                      </div>
                    )}

                    <div style={styles.cardActions}>
                      <button 
                        onClick={() => setSelectedChat(item)}
                        style={styles.readyBtn}
                      >
                        Open Conversation Log
                      </button>
                      <button 
                        onClick={() => handleEndChat(item)}
                        style={styles.endChatBtn}
                      >
                        End Chat
                      </button>
                      <button 
                        onClick={() => handleDeleteChat(item.id)}
                        style={styles.deleteChatBtn}
                      >
                        Delete Log
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Transcript Log Modal Pop-Up overlay */}
      {selectedChat && (
        <div style={styles.modalOverlay} onClick={() => setSelectedChat(null)}>
          <div style={styles.modalContent} className="glass" onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Conversation Log</h3>
                <p style={styles.modalSubtitle}>Session ID: #{selectedChat.id.toUpperCase()}</p>
                <p style={styles.modalClientMeta}>Client: {selectedChat.clientName} ({selectedChat.realEmail || "no email"})</p>
              </div>
              <button onClick={() => setSelectedChat(null)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>
            
            <div style={styles.modalMessagesBody}>
              {selectedChat.messages.length === 0 ? (
                <div style={styles.noData}>No messages exchanged in this session.</div>
              ) : (
                selectedChat.messages.map((msg, index) => (
                  <div key={index} style={styles.messageRow(msg.isBot)}>
                    <div style={styles.messageBubble(msg.isBot)}>
                      <div style={styles.messageText}>{msg.text}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  loginPage: {
    minHeight: "100vh",
    width: "100%",
    backgroundColor: "#08070d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    fontFamily: "var(--font-jakarta), sans-serif",
  },
  loginGlowRow: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  },
  glow1: {
    position: "absolute",
    width: "40vw",
    height: "40vw",
    top: "-10%",
    left: "-10%",
    background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
    filter: "blur(130px)",
    opacity: 0.3,
  },
  glow2: {
    position: "absolute",
    width: "40vw",
    height: "40vw",
    bottom: "-10%",
    right: "-10%",
    background: "radial-gradient(circle, var(--secondary) 0%, transparent 70%)",
    filter: "blur(130px)",
    opacity: 0.3,
  },
  loginCard: {
    width: "400px",
    padding: "36px",
    textAlign: "center",
    position: "relative",
    zIndex: 1,
    borderRadius: "16px",
  },
  lockIconContainer: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "rgba(6, 182, 212, 0.08)",
    border: "1px solid rgba(6, 182, 212, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px auto",
  },
  loginTitle: {
    fontFamily: "var(--font-outfit)",
    fontSize: "1.75rem",
    fontWeight: "700",
    color: "#fff",
    marginBottom: "4px",
    letterSpacing: "-0.5px",
  },
  loginSubtitle: {
    fontSize: "0.85rem",
    color: "#a098b0",
    marginBottom: "24px",
  },
  loginForm: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  loginInput: {
    width: "100%",
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    padding: "12px",
    color: "#fff",
    textAlign: "center",
    fontSize: "1rem",
    outline: "none",
    letterSpacing: "4px",
  },
  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(239, 68, 68, 0.1)",
    padding: "10px",
    borderRadius: "6px",
    color: "#ef4444",
    fontSize: "0.8rem",
    textAlign: "left",
  },
  loginBtn: {
    background: "linear-gradient(135deg, #06b6d4 0%, #9333ea 100%)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "0.95rem",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 15px rgba(6, 182, 212, 0.3)",
  },
  adminPage: {
    minHeight: "100vh",
    width: "100%",
    backgroundColor: "#05040a",
    color: "#f3f0fa",
    fontFamily: "var(--font-jakarta), sans-serif",
    position: "relative",
    padding: "36px 0 60px 0",
    overflowX: "hidden",
  },
  glowLayer1: {
    position: "fixed",
    width: "50vw",
    height: "50vw",
    top: "-20%",
    left: "-20%",
    background: "radial-gradient(circle, var(--primary) 0%, transparent 75%)",
    filter: "blur(150px)",
    opacity: 0.2,
    pointerEvents: "none",
  },
  glowLayer2: {
    position: "fixed",
    width: "50vw",
    height: "50vw",
    bottom: "-20%",
    right: "-20%",
    background: "radial-gradient(circle, var(--secondary) 0%, transparent 75%)",
    filter: "blur(150px)",
    opacity: 0.15,
    pointerEvents: "none",
  },
  dashboardContainer: {
    maxWidth: "1100px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "32px",
    flexWrap: "wrap",
    gap: "16px",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logoImage: {
    borderRadius: "50%",
  },
  logoText: {
    fontFamily: "var(--font-outfit)",
    fontSize: "1.5rem",
    fontWeight: "800",
    letterSpacing: "-0.5px",
    color: "#fff",
    background: "linear-gradient(to right, #fff, #9333ea)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  headerSubtitle: {
    fontSize: "0.85rem",
    color: "#a098b0",
    marginTop: "4px",
  },
  headerActions: {
    display: "flex",
    gap: "12px",
  },
  refreshBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    padding: "10px 16px",
    borderRadius: "8px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "500",
  },
  logoutBtn: {
    background: "none",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    padding: "10px 16px",
    borderRadius: "8px",
    color: "#ef4444",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "500",
  },
  toastBanner: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(34, 197, 94, 0.1)",
    border: "1px solid rgba(34, 197, 94, 0.2)",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "24px",
    fontSize: "0.85rem",
    color: "#4ade80",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "36px",
  },
  statItem: {
    padding: "20px",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  statLabel: {
    fontSize: "0.8rem",
    color: "#a098b0",
    fontWeight: "500",
  },
  statVal: {
    fontSize: "1.75rem",
    fontWeight: "700",
    color: "#fff",
  },
  tableWrapper: {
    borderRadius: "16px",
    padding: "24px",
  },
  noData: {
    textAlign: "center",
    padding: "48px 0",
    color: "#a098b0",
    fontSize: "0.95rem",
  },
  cardList: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  bookingCard: {
    padding: "24px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    paddingBottom: "16px",
    marginBottom: "16px",
    flexWrap: "wrap",
    gap: "12px",
  },
  cardOrderId: {
    fontFamily: "monospace",
    fontSize: "0.75rem",
    color: "var(--secondary)",
    fontWeight: "600",
    background: "rgba(6, 182, 212, 0.08)",
    padding: "2px 8px",
    borderRadius: "4px",
  },
  cardClientName: {
    fontFamily: "var(--font-outfit)",
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#fff",
    marginTop: "8px",
  },
  clientMetaRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    fontSize: "0.8rem",
    color: "#a098b0",
    marginTop: "4px",
    flexWrap: "wrap",
  },
  whatsappLink: {
    color: "#22c55e",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  statusBadge: (status) => {
    let bg = "rgba(255,255,255,0.05)";
    let border = "rgba(255,255,255,0.1)";
    let color = "#a098b0";

    if (status === "deposit_paid") {
      bg = "rgba(147, 51, 234, 0.08)";
      border = "rgba(147, 51, 234, 0.2)";
      color = "#c084fc";
    } else if (status === "ready_to_deliver") {
      bg = "rgba(6, 182, 212, 0.08)";
      border = "rgba(6, 182, 212, 0.2)";
      color = "#22d3ee";
    } else if (status === "fully_paid") {
      bg = "rgba(34, 197, 94, 0.08)";
      border = "rgba(34, 197, 94, 0.2)";
      color = "#4ade80";
    }

    return {
      background: bg,
      border: `1px solid ${border}`,
      color,
      fontSize: "0.75rem",
      fontWeight: "700",
      padding: "4px 10px",
      borderRadius: "20px",
      letterSpacing: "0.5px",
    };
  },
  cardDetails: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginBottom: "16px",
  },
  detailsColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  detailTitle: {
    fontSize: "0.75rem",
    color: "#a098b0",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  detailValue: {
    fontSize: "0.9rem",
    color: "#e2daf0",
  },
  requirementsBox: {
    background: "rgba(0,0,0,0.2)",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "16px",
    border: "1px solid rgba(255,255,255,0.04)",
  },
  requirementsText: {
    fontSize: "0.85rem",
    color: "#c0bacc",
    lineHeight: "1.4",
    marginTop: "4px",
  },
  paymentInfoRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginBottom: "20px",
  },
  utrValue: {
    fontFamily: "monospace",
    fontSize: "0.85rem",
    color: "#fff",
    background: "rgba(255,255,255,0.02)",
    padding: "4px 8px",
    borderRadius: "4px",
    display: "inline-block",
    marginTop: "4px",
  },
  cardActions: {
    display: "flex",
    justifyContent: "flex-end",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    paddingTop: "16px",
  },
  readyBtn: {
    background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(6, 182, 212, 0.2)",
  },
  closeBtn: {
    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(34, 197, 94, 0.2)",
  },
  completedMessage: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.85rem",
    color: "#4ade80",
    fontWeight: "600",
  },
  tabsRow: {
    display: "flex",
    gap: "12px",
    marginBottom: "24px",
  },
  tabBtn: {
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    color: "#c0bacc",
    padding: "10px 20px",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s, border-color 0.2s",
  },
  activeTabBtn: {
    background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
    border: "none",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(147, 51, 234, 0.3)",
  },
  chatPlacedBadge: {
    background: "rgba(34, 197, 94, 0.08)",
    border: "1px solid rgba(34, 197, 94, 0.2)",
    color: "#4ade80",
    fontSize: "0.7rem",
    fontWeight: "700",
    padding: "4px 8px",
    borderRadius: "20px",
  },
  chatBrowsingBadge: {
    background: "rgba(6, 182, 212, 0.08)",
    border: "1px solid rgba(6, 182, 212, 0.2)",
    color: "#22d3ee",
    fontSize: "0.7rem",
    fontWeight: "700",
    padding: "4px 8px",
    borderRadius: "20px",
  },
  endChatBtn: {
    background: "rgba(244, 63, 94, 0.15)",
    border: "1px solid rgba(244, 63, 94, 0.3)",
    color: "#fb7185",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
    marginLeft: "8px",
    transition: "background 0.2s, border-color 0.2s",
  },
  deleteChatBtn: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    color: "#f87171",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
    marginLeft: "8px",
    transition: "background 0.2s",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    width: "500px",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    borderRadius: "16px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    boxShadow: "0 24px 50px rgba(0, 0, 0, 0.5)",
  },
  modalHeader: {
    padding: "20px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modalTitle: {
    fontFamily: "var(--font-outfit)",
    fontSize: "1.2rem",
    fontWeight: "600",
    color: "#fff",
  },
  modalSubtitle: {
    fontSize: "0.75rem",
    color: "var(--secondary)",
    fontFamily: "monospace",
    marginTop: "2px",
  },
  modalClientMeta: {
    fontSize: "0.8rem",
    color: "#a098b0",
    marginTop: "4px",
  },
  modalCloseBtn: {
    background: "none",
    border: "none",
    color: "#a098b0",
    cursor: "pointer",
    padding: "4px",
  },
  modalMessagesBody: {
    padding: "20px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    flex: 1,
    background: "#0c0b12",
  },
  messageRow: (isBot) => ({
    display: "flex",
    justifyContent: isBot ? "flex-start" : "flex-end",
    width: "100%",
  }),
  messageBubble: (isBot) => ({
    maxWidth: "80%",
    padding: "10px 14px",
    borderRadius: isBot ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
    background: isBot ? "rgba(255, 255, 255, 0.05)" : "linear-gradient(135deg, #9333ea 0%, #a855f7 100%)",
    border: isBot ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
    color: "#fff",
    fontSize: "0.85rem",
    lineHeight: "1.4",
  }),
  microsoftLoginBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff",
    color: "#111",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "0.95rem",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 15px rgba(255, 255, 255, 0.1)",
    transition: "background 0.2s, transform 0.1s",
    marginTop: "8px",
    width: "100%",
  },
  loginDivider: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    margin: "8px 0",
    gap: "10px",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "rgba(255, 255, 255, 0.1)",
  },
  dividerText: {
    fontSize: "0.7rem",
    color: "#a098b0",
    fontWeight: "600",
    letterSpacing: "1.5px",
  },
};

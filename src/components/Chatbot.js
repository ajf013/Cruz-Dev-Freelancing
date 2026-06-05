"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Sparkles, Check, Phone } from "lucide-react";
import UpiPayment from "./UpiPayment";
import { PRICING_CONFIG } from "../config/pricing";

const PACKAGES = {
  Websites: PRICING_CONFIG.Websites.packages,
  Posters: PRICING_CONFIG.Posters.packages,
  Thumbnails: PRICING_CONFIG.Thumbnails.packages,
  "Azure Training & Consulting": PRICING_CONFIG.Advisory.packages,
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState("init"); // init, category, package, name, email, whatsapp, desc, confirm, payment, success, in_progress, final_payment, completed
  const [bookingData, setBookingData] = useState({
    id: "",
    serviceType: "",
    packageName: "",
    price: 0,
    clientName: "",
    clientEmail: "",
    whatsapp: "",
    projectDetails: "",
    depositUtr: "",
    remainingUtr: "",
    status: ""
  });
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // 1. Load chat history and booking state from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem("cruzdev_chat_messages");
    const savedStep = localStorage.getItem("cruzdev_chat_step");
    const savedBooking = localStorage.getItem("cruzdev_chat_booking");

    if (savedMessages && savedStep && savedBooking) {
      setMessages(JSON.parse(savedMessages));
      setStep(savedStep);
      setBookingData(JSON.parse(savedBooking));
    }
  }, []);

  // 2. Persist chat history and booking state in localStorage whenever they change
  useEffect(() => {
    if (step !== "init") {
      localStorage.setItem("cruzdev_chat_messages", JSON.stringify(messages));
      localStorage.setItem("cruzdev_chat_step", step);
      localStorage.setItem("cruzdev_chat_booking", JSON.stringify(bookingData));
    }
  }, [messages, step, bookingData]);

  // 3. Trigger welcome if chat is opened and has no messages
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      triggerWelcome();
    }
  }, [isOpen, messages]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-booking-chat", handleOpen);
    return () => window.removeEventListener("open-booking-chat", handleOpen);
  }, []);

  // Sync session ID and active conversation transcript to Azure Cosmos DB
  useEffect(() => {
    let sId = localStorage.getItem("cruzdev_chat_session_id");
    if (!sId) {
      sId = `session-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      localStorage.setItem("cruzdev_chat_session_id", sId);
    }
  }, []);

  useEffect(() => {
    const sId = localStorage.getItem("cruzdev_chat_session_id");
    if (!sId || messages.length === 0) return;

    // Debounce updates by 400ms to group rapid automated typing responses
    const syncTimeout = setTimeout(() => {
      const orderPlaced = step === "in_progress" || step === "final_payment" || step === "completed";
      fetch("/api/chat-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sId,
          messages,
          step,
          bookingData,
          clientName: bookingData.clientName,
          realEmail: bookingData.clientEmail,
          isOrderPlaced: orderPlaced
        })
      }).catch(err => console.error("Chat sync failed:", err));
    }, 400);

    return () => clearTimeout(syncTimeout);
  }, [messages, step, bookingData]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll active guest chat session state to check if admin ended/deleted the session
  useEffect(() => {
    const sId = typeof window !== "undefined" ? localStorage.getItem("cruzdev_chat_session_id") : null;
    if (sId && !bookingData.id && messages.length > 0) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/chat-session?id=${sId}`);
          if (res.status === 404) {
            // Chat session was deleted/ended by admin
            localStorage.removeItem("cruzdev_chat_messages");
            localStorage.removeItem("cruzdev_chat_step");
            localStorage.removeItem("cruzdev_chat_booking");
            localStorage.removeItem("cruzdev_chat_session_id");
            setMessages([]);
            setStep("init");
            setBookingData({
              id: "",
              serviceType: "",
              packageName: "",
              price: 0,
              clientName: "",
              clientEmail: "",
              whatsapp: "",
              projectDetails: "",
              depositUtr: "",
              remainingUtr: "",
              status: ""
            });
            addMessage("🌟 This chat session has been closed by the admin. Let me know if you need any other assistance!", true);
          }
        } catch (err) {
          console.error("Error checking active chat status:", err);
        }
      }, 8000);

      return () => clearInterval(interval);
    }
  }, [bookingData.id, messages.length]);

  // 4. Set up polling to check order status updates from admin
  useEffect(() => {
    if (bookingData.id && (step === "in_progress" || step === "final_payment" || step === "completed")) {
      // Poll every 8 seconds
      pollIntervalRef.current = setInterval(checkOrderStatus, 8000);
      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    }
  }, [bookingData.id, step]);

  const checkOrderStatus = async () => {
    if (!bookingData.id) return;
    try {
      const res = await fetch(`/api/booking?id=${bookingData.id}`);
      if (res.ok) {
        const serverData = await res.json();
        
        // Admin closed the booking: reset chatbot
        if (serverData.status === "closed") {
          localStorage.removeItem("cruzdev_chat_messages");
          localStorage.removeItem("cruzdev_chat_step");
          localStorage.removeItem("cruzdev_chat_booking");
          localStorage.removeItem("cruzdev_chat_session_id");
          setMessages([]);
          setStep("init");
          setBookingData({
            id: "",
            serviceType: "",
            packageName: "",
            price: 0,
            clientName: "",
            clientEmail: "",
            whatsapp: "",
            projectDetails: "",
            depositUtr: "",
            remainingUtr: "",
            status: ""
          });
          addMessage("🌟 Your previous order has been closed and successfully delivered by the admin. Let me know if you need to book another service today!", true);
          return;
        }

        // If status changed to ready_to_deliver and we are still in_progress
        if (serverData.status === "ready_to_deliver" && step === "in_progress") {
          setBookingData(serverData);
          setStep("final_payment");
          addMessage("🎉 Good news! Francisco has completed your project! 🚀", true);
          setTimeout(() => {
            addMessage(`Please complete the remaining 50% payment of ₹${(serverData.price / 2).toLocaleString("en-IN")} here to unlock your final delivered assets.`, true);
          }, 800);
        }

        // If status changed to fully_paid (e.g. verified on server) and we are not completed
        if (serverData.status === "fully_paid" && step !== "completed") {
          setBookingData(serverData);
          setStep("completed");
          addMessage("✅ We verified your final payment! Your order status is now fully_paid. Francisco will deliver your final source files right away! 🌟", true);
        }
      }
    } catch (err) {
      console.error("Error polling order status:", err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addMessage = (text, isBot = true, extra = null) => {
    setMessages((prev) => [...prev, { text, isBot, extra, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
  };

  const triggerWelcome = () => {
    addMessage("Hello there! I am the Cruz Dev Booking Assistant. 🌟", true);
    setTimeout(() => {
      addMessage("I can help you book web development, custom posters, click-worthy thumbnails, or Azure training & cloud advisory. What service are you interested in today?", true, {
        type: "buttons",
        options: ["Websites", "Posters", "Thumbnails", "Azure Training & Consulting"]
      });
      setStep("category");
    }, 600);
  };

  const handleButtonClick = (option, type) => {
    if (type === "category") {
      addMessage(option, false);
      setBookingData((prev) => ({ ...prev, serviceType: option }));
      
      const pkgs = PACKAGES[option];
      setTimeout(() => {
        addMessage(`Excellent Choice! Here are our available packages for ${option}. Select one that fits your goal:`, true, {
          type: "packages",
          options: pkgs
        });
        setStep("package");
      }, 500);
    } else if (type === "package") {
      const selected = PACKAGES[bookingData.serviceType].find(p => p.name === option);
      addMessage(`${selected.name} (₹${selected.price.toLocaleString("en-IN")})`, false);
      setBookingData((prev) => ({ ...prev, packageName: selected.name, price: selected.price }));

      setTimeout(() => {
        addMessage("Perfect. What is your name so we can register the project?", true);
        setStep("name");
      }, 500);
    } else if (type === "confirm") {
      if (option === "Yes, Proceed to Payment") {
        addMessage(`Generating secure UPI QR code for the 50% deposit: ₹${(bookingData.price / 2).toLocaleString("en-IN")}...`, true);
        setStep("payment");
      } else {
        addMessage("Let's restart the booking script.", false);
        setBookingData({
          id: "",
          serviceType: "",
          packageName: "",
          price: 0,
          clientName: "",
          clientEmail: "",
          whatsapp: "",
          projectDetails: "",
          depositUtr: "",
          remainingUtr: "",
          status: ""
        });
        setTimeout(() => {
          triggerWelcome();
        }, 500);
      }
    }
  };

  const handleSendText = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const val = inputValue.trim();
    addMessage(val, false);
    setInputValue("");

    if (step === "name") {
      setBookingData((prev) => ({ ...prev, clientName: val }));
      setTimeout(() => {
        addMessage(`Great to meet you, ${val}! What email address should we send updates to?`, true);
        setStep("email");
      }, 500);
    } else if (step === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        setTimeout(() => {
          addMessage("That email address looks invalid. Please enter a valid email.", true);
        }, 300);
        return;
      }

      addMessage("Verifying email domain validity...", true);

      try {
        const res = await fetch("/api/validate-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: val })
        });
        const data = await res.json();
        
        if (!res.ok || !data.valid) {
          setTimeout(() => {
            addMessage(`⚠️ I couldn't verify the email domain (e.g. "${val.split("@")[1]}"). It might have typos or no active mail servers. Please enter a valid, active email address.`, true);
          }, 300);
          return;
        }
      } catch (err) {
        console.error("DNS validation failed, letting it pass as fallback", err);
      }

      setBookingData((prev) => ({ ...prev, clientEmail: val }));
      
      // Determine dynamic brief question based on serviceType
      let briefQuestion = "Perfect. Lastly, please provide a short brief of your project requirements (e.g. page styling, reference URLs, files).";
      const sType = bookingData.serviceType || "";
      if (sType.toLowerCase() === "websites") {
        briefQuestion = "Perfect. Lastly, please provide a short brief of your website requirements (e.g. number of pages, desired features, layout style, reference sites).";
      } else if (sType.toLowerCase() === "posters") {
        briefQuestion = "Perfect. Lastly, please provide a short brief of your poster requirements (e.g. dimensions, color preferences, key headings/text, cyberpunk/corporate style).";
      } else if (sType.toLowerCase() === "thumbnails") {
        briefQuestion = "Perfect. Lastly, please provide a short brief of your thumbnail requirements (e.g. video topic, title overlay text, visual style, CTR inspiration references).";
      } else if (sType.toLowerCase() === "advisory") {
        briefQuestion = "Perfect. Lastly, please provide a short brief of your advisory requirements (e.g. Azure exam codes AZ-XXX, cloud resources to setup, guest lecture topics, timing).";
      }

      setTimeout(() => {
        addMessage(briefQuestion, true);
        setStep("desc");
      }, 500);
    } else if (step === "desc") {
      setBookingData((prev) => ({ ...prev, projectDetails: val }));
      
      const nextBooking = { ...bookingData, projectDetails: val };
      const upfront = nextBooking.price / 2;
      setTimeout(() => {
        addMessage("Awesome! Let's double check your booking summary:", true);
        setTimeout(() => {
          addMessage(
            `Service: ${nextBooking.packageName}\nTotal Cost: ₹${nextBooking.price.toLocaleString("en-IN")}\nUpfront Deposit (50%): ₹${upfront.toLocaleString("en-IN")}\nEmail: ${nextBooking.clientEmail}\nRequirements: ${val}`,
            true,
            {
              type: "confirm",
              options: ["Yes, Proceed to Payment", "No, Start Over"]
            }
          );
          setStep("confirm");
        }, 400);
      }, 500);
    }
  };

  const handlePaymentSuccess = (utrId) => {
    // 50% Deposit Payment Success
    if (step === "payment") {
      setBookingData((prev) => ({ ...prev, depositUtr: utrId, status: "deposit_paid" }));
      
      // Hit fetch endpoint to check if record was created and sync ID
      setTimeout(async () => {
        try {
          // Send request to register booking
          const res = await fetch("/api/booking", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...bookingData,
              utr: utrId,
              status: "deposit_paid"
            })
          });
          const data = await res.json();
          if (res.ok && data.booking) {
            setBookingData(data.booking);
          }
        } catch (err) {
          console.error(err);
        }
      }, 100);

      setStep("in_progress");
      addMessage(`Deposit payment UTR submitted: ${utrId}`, false);
      setTimeout(() => {
        addMessage(`🚀 Upfront Deposit Paid & Order Placed!`, true);
        addMessage(`Status: [IN PROGRESS]. We will send automated updates directly to your email address (${bookingData.clientEmail || "submitted"}).`, true);
        addMessage(`Once Francisco completes your project, you'll be prompted inside this chat to pay the remaining 50% balance and download the final files.`, true);
      }, 500);
    } 
    // 50% Balance Payment Success
    else if (step === "final_payment") {
      setBookingData((prev) => ({ ...prev, remainingUtr: utrId, status: "fully_paid" }));
      setStep("completed");
      addMessage(`Final balance payment UTR submitted: ${utrId}`, false);
      setTimeout(() => {
        addMessage(`✅ Order Fully Paid! Thank you so much!`, true);
        addMessage(`We have registered your final transaction (UTR: ${utrId}). We will finalize packaging and send the delivery files to your email address shortly.`, true);
      }, 500);
    }
  };

  return (
    <>
      {/* Floating Chat Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={styles.chatBubble}
        className="floating"
        title="Book a Service"
      >
        {isOpen ? <X size={26} /> : <MessageSquare size={26} />}
        {!isOpen && <span style={styles.badge}>Book Me</span>}
      </button>

      {/* Chat Window Container */}
      {isOpen && (
        <div style={styles.chatWindow} className="glass">
          {/* Header */}
          <div style={styles.chatHeader}>
            <div style={styles.headerInfo}>
              <div style={styles.botIcon}>
                <Sparkles size={16} color="#fff" />
              </div>
              <div>
                <div style={styles.botName}>Cruz Dev Agent</div>
                <div style={styles.botStatus}>Online • Response under 1m</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={styles.closeBtn}>
              <X size={18} />
            </button>
          </div>

          {/* Messages Body */}
          <div style={styles.messagesContainer}>
            {messages.map((msg, index) => (
              <div key={index} style={styles.messageRow(msg.isBot)}>
                <div style={styles.messageBubble(msg.isBot)}>
                  <div style={styles.messageText}>{msg.text}</div>
                  <div style={styles.messageTime}>{msg.time}</div>
                </div>

                {/* Extra interactives (buttons, packages) */}
                {msg.extra && msg.extra.type === "buttons" && (
                  <div style={styles.optionsContainer}>
                    {msg.extra.options.map((opt, oIdx) => (
                      <button
                        key={oIdx}
                        onClick={() => handleButtonClick(opt, "category")}
                        style={styles.optionBtn}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {msg.extra && msg.extra.type === "packages" && (
                  <div style={styles.packagesContainer}>
                    {msg.extra.options.map((pkg, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => handleButtonClick(pkg.name, "package")}
                        style={styles.packageCard}
                      >
                        <div style={styles.packageHeader}>
                          <span style={styles.packageName}>{pkg.name}</span>
                          <span style={styles.packagePrice}>₹{pkg.price.toLocaleString("en-IN")}</span>
                        </div>
                        <div style={styles.packageDesc}>{pkg.desc}</div>
                      </button>
                    ))}
                  </div>
                )}

                {msg.extra && msg.extra.type === "confirm" && (
                  <div style={styles.optionsContainer}>
                    {msg.extra.options.map((opt, oIdx) => (
                      <button
                        key={oIdx}
                        onClick={() => handleButtonClick(opt, "confirm")}
                        style={opt.includes("Yes") ? styles.confirmPayBtn : styles.optionBtn}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* RENDER UPI PAYMENT COMPONENT DIRECTLY IN THE CHAT STREAM */}
            {step === "payment" && (
              <div style={styles.paymentBox}>
                <UpiPayment
                  bookingData={bookingData}
                  paymentType="deposit"
                  onPaymentSuccess={handlePaymentSuccess}
                  onCancel={() => {
                    addMessage("Payment cancelled.", true);
                    setStep("confirm");
                    addMessage("Is your summary correct?", true, {
                      type: "confirm",
                      options: ["Yes, Proceed to Payment", "No, Start Over"]
                    });
                  }}
                />
              </div>
            )}

            {step === "final_payment" && (
              <div style={styles.paymentBox}>
                <UpiPayment
                  bookingData={bookingData}
                  paymentType="balance"
                  onPaymentSuccess={handlePaymentSuccess}
                  onCancel={() => {
                    addMessage("Balance payment cancelled. Please complete payment to unlock delivery.", true);
                  }}
                />
              </div>
            )}

            {step === "in_progress" && (
              <div style={styles.progressStatusBox} className="glass">
                <div style={styles.pulseDot}></div>
                <div>
                  <div style={styles.progressLabel}>Status: Project In Progress</div>
                  <div style={styles.progressSub}>50% deposit paid. Francisco is coding and designing. Updates will be posted here and sent via Email!</div>
                </div>
              </div>
            )}

            {step === "completed" && (
              <div style={styles.successStatusBox} className="glass">
                <Check size={16} color="#4ade80" />
                <div>
                  <div style={styles.successLabel}>Status: Fully Paid (100%)</div>
                  <div style={styles.successSub}>Thank you! Project is marked as completed. We are delivering final packages to your email address now.</div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* User Text Form Input (only active during text prompts) */}
          <div style={styles.inputArea}>
            {(step === "name" || step === "email" || step === "desc") ? (
              <form onSubmit={handleSendText} style={styles.inputForm}>
                <input
                  type={step === "email" ? "email" : "text"}
                  placeholder={
                    step === "name"
                      ? "Enter your name..."
                      : step === "email"
                      ? "Enter email address..."
                      : "Describe your project requirements..."
                  }
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  style={styles.textInput}
                  autoFocus
                />
                <button type="submit" style={styles.sendBtn}>
                  <Send size={16} />
                </button>
              </form>
            ) : (
              <div style={styles.footerNote}>
                {step === "in_progress" 
                  ? "Chat is locked while project is In Progress." 
                  : step === "final_payment" 
                  ? "Chat is locked waiting for balance payment." 
                  : step === "completed"
                  ? "Chat is locked waiting for file delivery."
                  : "Choose an option above to continue."}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  chatBubble: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
    border: "none",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(147, 51, 234, 0.4)",
    zIndex: 999,
  },
  badge: {
    position: "absolute",
    top: "-8px",
    right: "-4px",
    background: "#06b6d4",
    color: "#fff",
    fontSize: "0.68rem",
    fontWeight: "700",
    padding: "4px 8px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(6, 182, 212, 0.4)",
  },
  chatWindow: {
    position: "fixed",
    bottom: "96px",
    right: "24px",
    width: "380px",
    height: "540px",
    display: "flex",
    flexDirection: "column",
    zIndex: 999,
    boxShadow: "0 15px 35px rgba(0, 0, 0, 0.5)",
    overflow: "hidden",
    background: "rgba(10, 8, 18, 0.96)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
  },
  chatHeader: {
    padding: "16px",
    background: "rgba(255,255,255,0.03)",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  botIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 10px rgba(6, 182, 212, 0.4)",
  },
  botName: {
    fontSize: "0.9rem",
    fontWeight: "650",
    color: "#fff",
    fontFamily: "var(--font-outfit)",
  },
  botStatus: {
    fontSize: "0.7rem",
    color: "#a855f7",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#a098b0",
    cursor: "pointer",
    padding: "4px",
  },
  messagesContainer: {
    flex: 1,
    padding: "16px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  messageRow: (isBot) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: isBot ? "flex-start" : "flex-end",
    width: "100%",
  }),
  messageBubble: (isBot) => ({
    maxWidth: "80%",
    padding: "10px 14px",
    borderRadius: isBot ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
    background: isBot ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)",
    border: isBot ? "1px solid rgba(255,255,255,0.06)" : "none",
  }),
  messageText: {
    fontSize: "0.85rem",
    color: "#f3f0fa",
    lineHeight: "1.4",
    whiteSpace: "pre-line",
  },
  messageTime: {
    fontSize: "0.6rem",
    color: "rgba(255,255,255,0.3)",
    textAlign: "right",
    marginTop: "4px",
  },
  optionsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "80%",
    marginTop: "8px",
  },
  optionBtn: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    padding: "10px 14px",
    color: "#e2daf0",
    fontSize: "0.82rem",
    textAlign: "left",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  confirmPayBtn: {
    background: "linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)",
    border: "none",
    borderRadius: "10px",
    padding: "10px 14px",
    color: "#fff",
    fontSize: "0.82rem",
    fontWeight: "600",
    textAlign: "left",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(6, 182, 212, 0.3)",
  },
  packagesContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "88%",
    marginTop: "8px",
  },
  packageCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "12px",
    color: "#fff",
    textAlign: "left",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  packageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  packageName: {
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "#fff",
  },
  packagePrice: {
    fontSize: "0.85rem",
    fontWeight: "700",
    color: "#06b6d4",
  },
  packageDesc: {
    fontSize: "0.72rem",
    color: "#c0bacc",
    lineHeight: "1.3",
  },
  paymentBox: {
    width: "100%",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "12px",
    padding: "12px",
    marginTop: "8px",
  },
  progressStatusBox: {
    width: "100%",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid rgba(168, 85, 247, 0.2)",
    background: "rgba(147, 51, 234, 0.04)",
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
    marginTop: "8px",
  },
  pulseDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#a855f7",
    marginTop: "4px",
    boxShadow: "0 0 8px #a855f7",
    animation: "pulse-slow 2s infinite",
  },
  progressLabel: {
    fontSize: "0.82rem",
    fontWeight: "600",
    color: "#c084fc",
  },
  progressSub: {
    fontSize: "0.72rem",
    color: "#c0bacc",
    lineHeight: "1.3",
    marginTop: "2px",
  },
  successStatusBox: {
    width: "100%",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid rgba(34, 197, 94, 0.2)",
    background: "rgba(34, 197, 94, 0.04)",
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
    marginTop: "8px",
  },
  successLabel: {
    fontSize: "0.82rem",
    fontWeight: "600",
    color: "#4ade80",
  },
  successSub: {
    fontSize: "0.72rem",
    color: "#c0bacc",
    lineHeight: "1.3",
    marginTop: "2px",
  },
  inputArea: {
    padding: "16px",
    borderTop: "1px solid rgba(255,255,255,0.07)",
    background: "rgba(0,0,0,0.2)",
  },
  inputForm: {
    display: "flex",
    gap: "8px",
  },
  textInput: {
    flex: 1,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#fff",
    fontSize: "0.85rem",
    outline: "none",
  },
  sendBtn: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    background: "var(--primary)",
    border: "none",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  footerNote: {
    fontSize: "0.72rem",
    color: "#a098b0",
    textAlign: "center",
  },
};

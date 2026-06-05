"use client";

import React, { useState, useEffect, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Smartphone, Copy, CheckCircle, AlertCircle, Loader2, ExternalLink, Clock } from "lucide-react";

export default function UpiPayment({ bookingData, paymentType = "deposit", onPaymentSuccess, onCancel }) {
  const [utr, setUtr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [isExpired, setIsExpired] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const isBalance = paymentType === "balance";
  const upiId = "6379649461@upi"; // Configured developer UPI ID
  const recipientName = "Francisco Cruz";
  const amount = bookingData.price / 2; // Always pay half of the total amount (50% upfront, 50% final)
  
  const noteSuffix = isBalance ? "bal" : "dep";
  const labelText = bookingData.packageName ? bookingData.packageName.toLowerCase().slice(0, 5).replace(/\s/g, "") : "srv";
  
  // Memoize note and URI to recreate on refresh
  const transactionNote = useMemo(() => {
    return `CruzDev-${labelText}-${noteSuffix}-${Date.now().toString().slice(-4)}`;
  }, [refreshKey, labelText, noteSuffix]);

  const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(recipientName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;

  // Countdown timer hook
  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Format time display (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleRegenerate = () => {
    setTimeLeft(300);
    setIsExpired(false);
    setRefreshKey((prev) => prev + 1);
    setError("");
    setUtr("");
  };

  const handleCopyUPI = () => {
    if (isExpired) return;
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isExpired) {
      setError("This payment session has expired. Please refresh the QR code above.");
      return;
    }

    // Validate UTR (exactly 12 digits for standard UPI transaction reference numbers)
    const utrRegex = /^\d{12}$/;
    if (!utrRegex.test(utr)) {
      setError("UTR Reference ID must be exactly 12 numeric digits.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = isBalance
        ? { action: "pay_balance", bookingId: bookingData.id, utr: utr }
        : { ...bookingData, upiNote: transactionNote, utr: utr };

      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        onPaymentSuccess(utr);
      } else {
        setError(data.error || "Failed to log payment. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please check your internet connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>{isBalance ? "Pay Remaining Balance" : "UPI / BHIM QR Payment"}</h3>
      <p style={styles.subtitle}>
        Scan the QR code below using GPay, PhonePe, Paytm, or BHIM to pay the {isBalance ? <strong>remaining 50% balance</strong> : <strong>50% booking deposit</strong>} of <strong>₹{amount.toLocaleString("en-IN")}</strong>.
      </p>

      {/* Expiry Timer banner */}
      {!isExpired ? (
        <div style={styles.timerBox}>
          <Clock size={14} color="#f59e0b" style={styles.timerIcon} />
          <span>QR code expires in: <strong>{formatTime(timeLeft)}</strong></span>
        </div>
      ) : (
        <div style={styles.expiredBox}>
          <AlertCircle size={14} color="#ef4444" />
          <span>Payment Session Expired</span>
        </div>
      )}
      
      {/* QR Code Container */}
      <div style={styles.qrContainer}>
        {isExpired ? (
          <div style={styles.expiredOverlay}>
            <AlertCircle size={36} color="#ef4444" />
            <span style={styles.expiredText}>Expired</span>
            <button type="button" onClick={handleRegenerate} style={styles.regenerateBtn}>
              Refresh QR Code
            </button>
          </div>
        ) : (
          <>
            <QRCodeSVG value={upiUri} size={180} level="M" fgColor="#08070d" />
            <div style={styles.qrLabel}>
              <QrCode size={16} /> Scan to Pay
            </div>
          </>
        )}
      </div>

      {/* Copy UPI ID */}
      <div style={isExpired ? { ...styles.row, opacity: 0.4 } : styles.row}>
        <span style={styles.upiText}>{upiId}</span>
        <button onClick={handleCopyUPI} disabled={isExpired} style={styles.copyBtn} title="Copy UPI ID">
          {copied ? <CheckCircle size={14} color="#06b6d4" /> : <Copy size={14} />}
          <span>{copied ? "Copied" : "Copy ID"}</span>
        </button>
      </div>

      {/* Mobile deep-link redirection */}
      <div style={styles.mobileActions}>
        <a 
          href={isExpired ? "#" : upiUri} 
          onClick={(e) => isExpired && e.preventDefault()}
          style={isExpired ? { ...styles.payMobileBtn, opacity: 0.4, cursor: "not-allowed", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "none" } : styles.payMobileBtn}
        >
          <Smartphone size={16} />
          <span>Pay via Installed UPI App</span>
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Verification Form */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Enter 12-digit UPI Ref / UTR No.
          <input
            type="text"
            placeholder="e.g. 306512345678"
            value={utr}
            onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 12))}
            required
            disabled={isSubmitting || isExpired}
            style={styles.input}
          />
        </label>
        
        {error && (
          <div style={styles.errorContainer}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div style={styles.actions}>
          <button type="button" onClick={onCancel} disabled={isSubmitting} style={styles.cancelBtn}>
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting || isExpired} 
            style={isExpired ? { ...styles.submitBtn, opacity: 0.4, cursor: "not-allowed", background: "rgba(255,255,255,0.05)" } : styles.submitBtn}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Verifying...
              </>
            ) : (
              isBalance ? "Confirm Balance" : "Confirm Booking"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    padding: "8px 0",
  },
  title: {
    fontFamily: "var(--font-outfit)",
    fontSize: "1.25rem",
    fontWeight: "600",
    marginBottom: "8px",
    color: "#fff",
  },
  subtitle: {
    fontSize: "0.85rem",
    color: "#c0bacc",
    textAlign: "center",
    lineHeight: "1.4",
    marginBottom: "16px",
  },
  timerBox: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.82rem",
    color: "#f59e0b",
    background: "rgba(245, 158, 11, 0.08)",
    padding: "6px 14px",
    borderRadius: "12px",
    border: "1px solid rgba(245, 158, 11, 0.2)",
    marginBottom: "14px",
  },
  timerIcon: {
    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
  },
  expiredBox: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.82rem",
    color: "#ef4444",
    background: "rgba(239, 68, 68, 0.08)",
    padding: "6px 14px",
    borderRadius: "12px",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    marginBottom: "14px",
  },
  qrContainer: {
    background: "#fff",
    padding: "16px",
    borderRadius: "12px",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.4)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "12px",
    width: "212px",
    height: "240px",
  },
  qrLabel: {
    fontSize: "0.75rem",
    color: "#08070d",
    fontWeight: "600",
    marginTop: "8px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  expiredOverlay: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    textAlign: "center",
  },
  expiredText: {
    fontSize: "1.1rem",
    color: "#ef4444",
    fontWeight: "700",
    textTransform: "uppercase",
    fontFamily: "var(--font-outfit)",
  },
  regenerateBtn: {
    background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
    border: "none",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "0.75rem",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(147, 51, 234, 0.3)",
    transition: "transform 0.2s",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(255,255,255,0.05)",
    padding: "6px 12px",
    borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.1)",
    marginBottom: "16px",
  },
  upiText: {
    fontSize: "0.8rem",
    color: "#e0d5ff",
    fontFamily: "monospace",
  },
  copyBtn: {
    background: "none",
    border: "none",
    color: "#c0bacc",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "0.75rem",
    padding: "2px 4px",
  },
  mobileActions: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    marginBottom: "20px",
  },
  payMobileBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: "600",
    textDecoration: "none",
    width: "100%",
    boxShadow: "0 4px 10px rgba(6, 182, 212, 0.3)",
    transition: "transform 0.2s",
  },
  form: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontSize: "0.8rem",
    color: "#c0bacc",
  },
  input: {
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "8px",
    padding: "10px",
    color: "#fff",
    fontSize: "0.9rem",
    fontFamily: "monospace",
    textAlign: "center",
    letterSpacing: "2px",
    outline: "none",
  },
  errorContainer: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#ef4444",
    background: "rgba(239, 68, 68, 0.1)",
    padding: "8px",
    borderRadius: "6px",
    fontSize: "0.75rem",
  },
  actions: {
    display: "flex",
    gap: "8px",
    marginTop: "4px",
  },
  cancelBtn: {
    flex: 1,
    background: "rgba(255,255,255,0.05)",
    color: "#c0bacc",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    padding: "10px",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  submitBtn: {
    flex: 2,
    background: "linear-gradient(135deg, #9333ea 0%, #a855f7 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "10px",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
};


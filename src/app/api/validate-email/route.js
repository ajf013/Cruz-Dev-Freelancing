import { promises as dnsPromises } from "dns";

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email || !email.includes("@")) {
      return Response.json({ valid: false, reason: "Invalid syntax" });
    }

    const domain = email.split("@")[1];

    // Try resolving MX records first (mail exchange servers)
    try {
      const mxRecords = await dnsPromises.resolveMx(domain);
      if (mxRecords && mxRecords.length > 0) {
        return Response.json({ valid: true });
      }
    } catch (err) {
      // Fallback: try resolving A/AAAA records (IP mapping) in case there's no explicit MX record but direct routing
      try {
        const aRecords = await dnsPromises.resolve4(domain);
        if (aRecords && aRecords.length > 0) {
          return Response.json({ valid: true });
        }
      } catch (aErr) {
        // Both resolve checks failed: domain doesn't exist or is not configured for mail routing
        return Response.json({ 
          valid: false, 
          reason: `Domain '${domain}' is not configured for receiving email` 
        });
      }
    }

    return Response.json({ 
      valid: false, 
      reason: `Domain '${domain}' has no active mail exchange (MX) server configurations` 
    });

  } catch (error) {
    console.error("DNS Email verification error:", error);
    return Response.json({ valid: false, reason: "Internal validation error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createSessionToken } from "../../../../config/auth-helper";

export async function GET(request) {
  const adminPath = process.env.ADMIN_PATH || "/admin";
  const errorRedirect = (errType) => {
    return NextResponse.redirect(new URL(`${adminPath}?error=${errType}`, request.url));
  };

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      console.error("OAuth Authorization Error:", error, errorDescription);
      return errorRedirect("oauth_denied");
    }

    if (!code) {
      return errorRedirect("missing_code");
    }

    const clientId = process.env.AZURE_AD_CLIENT_ID;
    const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
    const tenantId = process.env.AZURE_AD_TENANT_ID || "common";

    if (!clientId || !clientSecret) {
      console.error("Microsoft Entra ID is not fully configured in environment variables.");
      return errorRedirect("misconfigured");
    }

    // Determine the dynamic redirect URI matching what was sent in the login redirect
    const host = request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const redirectUri = `${protocol}://${host}/api/auth/callback`;

    // Swap Authorization Code for Access/ID Token
    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("code", code);
    params.append("redirect_uri", redirectUri);
    params.append("grant_type", "authorization_code");
    params.append("scope", "openid profile email User.Read");

    const tokenRes = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("Microsoft token trade failed:", errorText);
      return errorRedirect("token_trade_failed");
    }

    const tokenData = await tokenRes.json();
    const idToken = tokenData.id_token;

    if (!idToken) {
      console.error("No id_token returned by Microsoft Entra ID.");
      return errorRedirect("missing_id_token");
    }

    // Decode ID Token (pure JavaScript decoding without external dependencies)
    const tokenParts = idToken.split(".");
    if (tokenParts.length < 2) {
      return errorRedirect("invalid_id_token");
    }

    const payloadJson = Buffer.from(tokenParts[1], "base64").toString("utf-8");
    const payload = JSON.parse(payloadJson);

    const email = (payload.email || payload.preferred_username || payload.unique_name || "").toLowerCase();

    if (!email) {
      console.error("Could not retrieve email from token claims:", payload);
      return errorRedirect("no_email_claim");
    }

    // Verify if the email matches the allowed ADMIN_EMAIL
    const allowedAdminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
    
    if (!allowedAdminEmail) {
      console.error("ADMIN_EMAIL is not defined in environment variables.");
      return errorRedirect("no_admin_configured");
    }

    if (email !== allowedAdminEmail) {
      console.warn(`Unauthorized login attempt by ${email}. Expected ${allowedAdminEmail}.`);
      return errorRedirect("unauthorized");
    }

    // Generate secure session cookie
    const sessionToken = createSessionToken(email);
    
    const response = NextResponse.redirect(new URL(adminPath, request.url));
    
    // Set cookie
    response.cookies.set("cruzdev_admin_session", sessionToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (err) {
    console.error("Auth Callback Server Error:", err);
    return errorRedirect("server_error");
  }
}

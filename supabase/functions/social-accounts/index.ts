import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SOLANA_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const VALID_PLATFORMS = new Set(["discord", "youtube", "tiktok", "twitter"]);

function isValidWallet(addr: string): boolean {
  return typeof addr === "string" && SOLANA_ADDR_RE.test(addr.trim());
}

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/social-accounts", "");

    const walletParam = url.searchParams.get("wallet_address");

    if (req.method === "GET" && (path === "" || path === "/")) {
      if (!walletParam || !isValidWallet(walletParam)) {
        return errorResponse("Valid wallet_address required", 400);
      }

      const supabase = getServiceClient();
      const { data, error } = await supabase.rpc("get_user_social_accounts", {
        p_wallet_address: walletParam.trim(),
      });

      if (error) throw error;
      return jsonResponse(data || []);
    }

    if (req.method === "POST" && path === "/link") {
      const body = await req.json();
      const { wallet_address, platform, platform_user_id, platform_username, platform_avatar_url } = body;

      if (!wallet_address || !isValidWallet(wallet_address)) {
        return errorResponse("Valid wallet_address required", 400);
      }
      if (!platform || !VALID_PLATFORMS.has(platform)) {
        return errorResponse("Invalid platform. Must be discord, youtube, tiktok, or twitter", 400);
      }
      if (!platform_user_id || typeof platform_user_id !== "string" || platform_user_id.length > 200) {
        return errorResponse("Valid platform_user_id required", 400);
      }

      const supabase = getServiceClient();
      const { data, error } = await supabase.rpc("link_social_account", {
        p_wallet_address: wallet_address.trim(),
        p_platform: platform,
        p_platform_user_id: platform_user_id.trim().slice(0, 200),
        p_platform_username: (platform_username || "").trim().slice(0, 100),
        p_platform_avatar_url: (platform_avatar_url || "").trim().slice(0, 500),
      });

      if (error) throw error;
      if (data?.error) return errorResponse(data.error, 400);

      return jsonResponse({ success: true, account: data });
    }

    if (req.method === "POST" && path === "/unlink") {
      const body = await req.json();
      const { wallet_address, platform } = body;

      if (!wallet_address || !isValidWallet(wallet_address)) {
        return errorResponse("Valid wallet_address required", 400);
      }
      if (!platform || !VALID_PLATFORMS.has(platform)) {
        return errorResponse("Invalid platform", 400);
      }

      const supabase = getServiceClient();
      const { data, error } = await supabase.rpc("unlink_social_account", {
        p_wallet_address: wallet_address.trim(),
        p_platform: platform,
      });

      if (error) throw error;
      if (data?.error) return errorResponse(data.error, 400);

      return jsonResponse({ success: true });
    }

    if (req.method === "GET" && path === "/oauth/discord") {
      const clientId = Deno.env.get("DISCORD_CLIENT_ID");
      if (!clientId) return errorResponse("Discord OAuth not configured", 503);

      const wallet = url.searchParams.get("wallet_address");
      if (!wallet || !isValidWallet(wallet)) {
        return errorResponse("Valid wallet_address required", 400);
      }

      const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/social-accounts/oauth/discord/callback`;
      const state = btoa(JSON.stringify({ wallet: wallet.trim() }));
      const scope = "identify";

      const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;

      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: authUrl },
      });
    }

    if (req.method === "GET" && path === "/oauth/discord/callback") {
      const code = url.searchParams.get("code");
      const stateParam = url.searchParams.get("state");

      if (!code || !stateParam) {
        return new Response(buildCallbackHtml("error", "Missing code or state"), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      let wallet: string;
      try {
        const stateData = JSON.parse(atob(stateParam));
        wallet = stateData.wallet;
      } catch {
        return new Response(buildCallbackHtml("error", "Invalid state"), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      const clientId = Deno.env.get("DISCORD_CLIENT_ID");
      const clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET");
      const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/social-accounts/oauth/discord/callback`;

      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenRes.ok) {
        return new Response(buildCallbackHtml("error", "Failed to exchange token"), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      const tokenData = await tokenRes.json();

      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userRes.ok) {
        return new Response(buildCallbackHtml("error", "Failed to get Discord user info"), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      const discordUser = await userRes.json();
      const avatarUrl = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : "";

      const supabase = getServiceClient();
      await supabase.rpc("link_social_account", {
        p_wallet_address: wallet,
        p_platform: "discord",
        p_platform_user_id: discordUser.id,
        p_platform_username: `${discordUser.username}`,
        p_platform_avatar_url: avatarUrl,
      });

      return new Response(
        buildCallbackHtml("success", `Discord account linked: ${discordUser.username}`),
        { headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    if (req.method === "GET" && path === "/oauth/youtube") {
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      if (!clientId) return errorResponse("YouTube OAuth not configured", 503);

      const wallet = url.searchParams.get("wallet_address");
      if (!wallet || !isValidWallet(wallet)) {
        return errorResponse("Valid wallet_address required", 400);
      }

      const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/social-accounts/oauth/youtube/callback`;
      const state = btoa(JSON.stringify({ wallet: wallet.trim() }));
      const scope = "https://www.googleapis.com/auth/youtube.readonly";

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}&access_type=offline`;

      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: authUrl },
      });
    }

    if (req.method === "GET" && path === "/oauth/youtube/callback") {
      const code = url.searchParams.get("code");
      const stateParam = url.searchParams.get("state");

      if (!code || !stateParam) {
        return new Response(buildCallbackHtml("error", "Missing code or state"), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      let wallet: string;
      try {
        const stateData = JSON.parse(atob(stateParam));
        wallet = stateData.wallet;
      } catch {
        return new Response(buildCallbackHtml("error", "Invalid state"), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
      const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/social-accounts/oauth/youtube/callback`;

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenRes.ok) {
        return new Response(buildCallbackHtml("error", "Failed to exchange token"), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      const tokenData = await tokenRes.json();

      const channelRes = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
      );

      if (!channelRes.ok) {
        return new Response(buildCallbackHtml("error", "Failed to get YouTube channel info"), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      const channelData = await channelRes.json();
      const channel = channelData.items?.[0];

      if (!channel) {
        return new Response(buildCallbackHtml("error", "No YouTube channel found"), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      const supabase = getServiceClient();
      await supabase.rpc("link_social_account", {
        p_wallet_address: wallet,
        p_platform: "youtube",
        p_platform_user_id: channel.id,
        p_platform_username: channel.snippet.title,
        p_platform_avatar_url: channel.snippet.thumbnails?.default?.url || "",
      });

      return new Response(
        buildCallbackHtml("success", `YouTube channel linked: ${channel.snippet.title}`),
        { headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    if (req.method === "GET" && path === "/oauth/tiktok") {
      const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY");
      if (!clientKey) return errorResponse("TikTok OAuth not configured", 503);

      const wallet = url.searchParams.get("wallet_address");
      if (!wallet || !isValidWallet(wallet)) {
        return errorResponse("Valid wallet_address required", 400);
      }

      const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/social-accounts/oauth/tiktok/callback`;
      const state = btoa(JSON.stringify({ wallet: wallet.trim() }));
      const scope = "user.info.basic";

      const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&response_type=code&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: authUrl },
      });
    }

    if (req.method === "GET" && path === "/oauth/tiktok/callback") {
      const code = url.searchParams.get("code");
      const stateParam = url.searchParams.get("state");

      if (!code || !stateParam) {
        return new Response(buildCallbackHtml("error", "Missing code or state"), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      let wallet: string;
      try {
        const stateData = JSON.parse(atob(stateParam));
        wallet = stateData.wallet;
      } catch {
        return new Response(buildCallbackHtml("error", "Invalid state"), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY");
      const clientSecret = Deno.env.get("TIKTOK_CLIENT_SECRET");
      const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/social-accounts/oauth/tiktok/callback`;

      const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: clientKey!,
          client_secret: clientSecret!,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenRes.ok) {
        return new Response(buildCallbackHtml("error", "Failed to exchange token"), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      const tokenData = await tokenRes.json();

      const userRes = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
      );

      if (!userRes.ok) {
        return new Response(buildCallbackHtml("error", "Failed to get TikTok user info"), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      const userData = await userRes.json();
      const tiktokUser = userData.data?.user;

      const supabase = getServiceClient();
      await supabase.rpc("link_social_account", {
        p_wallet_address: wallet,
        p_platform: "tiktok",
        p_platform_user_id: tiktokUser?.open_id || tokenData.open_id || "unknown",
        p_platform_username: tiktokUser?.display_name || "TikTok User",
        p_platform_avatar_url: tiktokUser?.avatar_url || "",
      });

      return new Response(
        buildCallbackHtml("success", `TikTok account linked: ${tiktokUser?.display_name || "TikTok User"}`),
        { headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    if (req.method === "GET" && path === "/oauth/twitter") {
      const clientId = Deno.env.get("TWITTER_CLIENT_ID");
      if (!clientId) return errorResponse("X (Twitter) OAuth not configured", 503);

      const wallet = url.searchParams.get("wallet_address");
      if (!wallet || !isValidWallet(wallet)) {
        return errorResponse("Valid wallet_address required", 400);
      }

      const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/social-accounts/oauth/twitter/callback`;
      const state = btoa(JSON.stringify({ wallet: wallet.trim() }));

      const codeVerifier = crypto.randomUUID() + crypto.randomUUID();
      const encoder = new TextEncoder();
      const data = encoder.encode(codeVerifier);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      const stateWithVerifier = btoa(JSON.stringify({ wallet: wallet.trim(), cv: codeVerifier }));

      const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: "tweet.read users.read offline.access",
        state: stateWithVerifier,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });

      const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;

      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: authUrl },
      });
    }

    if (req.method === "GET" && path === "/oauth/twitter/callback") {
      const code = url.searchParams.get("code");
      const stateParam = url.searchParams.get("state");

      if (!code || !stateParam) {
        return new Response(buildCallbackHtml("error", "Missing code or state"), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      let wallet: string;
      let codeVerifier: string;
      try {
        const stateData = JSON.parse(atob(stateParam));
        wallet = stateData.wallet;
        codeVerifier = stateData.cv;
      } catch {
        return new Response(buildCallbackHtml("error", "Invalid state"), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      const clientId = Deno.env.get("TWITTER_CLIENT_ID");
      const clientSecret = Deno.env.get("TWITTER_CLIENT_SECRET");
      const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/social-accounts/oauth/twitter/callback`;

      const basicAuth = btoa(`${clientId}:${clientSecret}`);

      const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        }),
      });

      if (!tokenRes.ok) {
        return new Response(buildCallbackHtml("error", "Failed to exchange token"), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      const tokenData = await tokenRes.json();

      const userRes = await fetch("https://api.x.com/2/users/me?user.fields=profile_image_url", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userRes.ok) {
        return new Response(buildCallbackHtml("error", "Failed to get X user info"), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      const xUserData = await userRes.json();
      const xUser = xUserData.data;

      const supabase = getServiceClient();
      await supabase.rpc("link_social_account", {
        p_wallet_address: wallet,
        p_platform: "twitter",
        p_platform_user_id: xUser?.id || "unknown",
        p_platform_username: xUser?.username ? `@${xUser.username}` : "X User",
        p_platform_avatar_url: xUser?.profile_image_url || "",
      });

      return new Response(
        buildCallbackHtml("success", `X account linked: @${xUser?.username || "unknown"}`),
        { headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    return errorResponse("Not found", 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return errorResponse(message, 500);
  }
});

function buildCallbackHtml(status: "success" | "error", message: string): string {
  const color = status === "success" ? "#00ff88" : "#ff4444";
  const icon = status === "success" ? "&#10003;" : "&#10007;";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PowerSOL - Social Account ${status === "success" ? "Linked" : "Error"}</title>
  <style>
    body { background: #0a0a0a; color: #fff; font-family: monospace; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: rgba(0,0,0,0.9); border: 2px solid ${color}; border-radius: 16px; padding: 40px; text-align: center; max-width: 400px; box-shadow: 0 0 40px ${color}33; }
    .icon { font-size: 48px; color: ${color}; margin-bottom: 16px; }
    .msg { color: ${color}; font-size: 16px; margin-bottom: 24px; }
    .hint { color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <div class="msg">${message}</div>
    <div class="hint">You can close this window and return to PowerSOL.</div>
  </div>
  <script>
    setTimeout(() => { if (window.opener) { window.opener.postMessage({ type: 'social-link-${status}', message: '${message.replace(/'/g, "\\'")}' }, '*'); window.close(); } }, 2000);
  </script>
</body>
</html>`;
}

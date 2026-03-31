export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Returns the login URL.
 * - Local mode (no VITE_OAUTH_PORTAL_URL or localhost): redirects to /login
 * - Manus production mode: redirects to Manus OAuth portal
 */
export const isLocalAuthMode = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  return (
    !oauthPortalUrl ||
    oauthPortalUrl.includes("localhost") ||
    oauthPortalUrl.includes("127.0.0.1")
  );
};

export const getLoginUrl = (returnPath?: string) => {
  if (isLocalAuthMode()) {
    return returnPath ? `/login?return=${encodeURIComponent(returnPath)}` : "/login";
  }

  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);
  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  return url.toString();
};

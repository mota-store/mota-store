export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL for Google OAuth
export const getLoginUrl = () => {
  const redirectUri = `${window.location.origin}`;
  const params = new URLSearchParams({
    redirect_uri: redirectUri,
  });

  return `${window.location.origin}/api/google-oauth/login?${params.toString()}`;
};

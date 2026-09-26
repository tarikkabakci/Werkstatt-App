const sessionMessage = "werkstatt-manager-session-v1";

async function hmac(password: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(sessionMessage));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function expectedSessionToken() {
  const password = process.env.APP_PASSWORD;
  return password ? hmac(password) : null;
}

export function configuredPassword() {
  return process.env.APP_PASSWORD ?? null;
}

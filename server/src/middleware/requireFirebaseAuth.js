import { getAuth } from "firebase-admin/auth";

const AUTH_REQUIRED_BODY = {
  error: {
    code: "AUTH_REQUIRED",
    message: "Authentication is required.",
  },
};

const INVALID_AUTH_TOKEN_BODY = {
  error: {
    code: "INVALID_AUTH_TOKEN",
    message: "Authentication token is invalid or expired.",
  },
};

function readBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== "string") return null;
  const trimmed = authorizationHeader.trim();
  if (!/^Bearer\s+/i.test(trimmed)) return null;
  const token = trimmed.replace(/^Bearer\s+/i, "").trim();
  return token.length > 0 ? token : null;
}

/**
 * Verifies a Firebase ID token for POST /api/routes/compute.
 * Attaches only req.auth.uid. Does not log or return the token.
 */
export async function requireFirebaseAuth(req, res, next) {
  const token = readBearerToken(req.get("authorization"));
  if (!token) {
    res.status(401).json(AUTH_REQUIRED_BODY);
    return;
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded?.uid;
    if (typeof uid !== "string" || uid.trim() === "") {
      res.status(401).json(INVALID_AUTH_TOKEN_BODY);
      return;
    }
    req.auth = { uid };
    next();
  } catch {
    res.status(401).json(INVALID_AUTH_TOKEN_BODY);
  }
}

import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

let oauth2Client = null;

function getClient() {
  if (!env.googleClientId) return null;
  if (!oauth2Client) {
    oauth2Client = new OAuth2Client(env.googleClientId);
  }
  return oauth2Client;
}

/**
 * Verifies a Google Sign-In **ID token** (JWT) from the browser and returns token claims.
 */
export async function verifyGoogleIdToken(idToken) {
  const client = getClient();
  if (!client) {
    throw AppError.badRequest('Google sign-in is not configured on this server');
  }
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: env.googleClientId
    });
    const payload = ticket.getPayload();
    if (!payload) {
      throw AppError.unauthorized('Invalid Google token');
    }
    return payload;
  } catch (e) {
    if (e instanceof AppError) throw e;
    console.error('Google verifyIdToken failed', e);
    throw AppError.unauthorized('Could not verify Google sign-in');
  }
}

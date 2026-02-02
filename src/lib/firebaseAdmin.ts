import 'server-only';
import admin from 'firebase-admin';

function formatPrivateKey(key: string | undefined) {
  if (!key) return undefined;
  
  // 1. Remove surrounding quotes if user accidentally copied them (e.g. "-----BEGIN..." or '-----BEGIN...')
  let cleanKey = key.replace(/^['"]|['"]$/g, '');
  
  // 2. Handle escaped newlines (standard fix for Vercel/Env vars)
  cleanKey = cleanKey.replace(/\\n/g, '\n');

  return cleanKey;
}

if (!admin.apps.length) {
  const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
    throw new Error(
      'Firebase Admin SDK initialization failed: Missing or invalid environment variables. ' +
      'Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}

export const db = admin.firestore();
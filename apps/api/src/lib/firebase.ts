import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';

let firebaseApp: admin.app.App;

export function getFirebaseAdmin(): admin.app.App {
  if (firebaseApp) return firebaseApp;

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    logger.info('Firebase Admin SDK initialized');
    return firebaseApp;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK', { error });
    process.exit(1);
  }
}

export function getFirebaseAuth(): admin.auth.Auth {
  return getFirebaseAdmin().auth();
}

export function getFirebaseMessaging(): admin.messaging.Messaging {
  return getFirebaseAdmin().messaging();
}

// Initialize on module load
getFirebaseAdmin();

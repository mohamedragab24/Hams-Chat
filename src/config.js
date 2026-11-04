'use strict';
// Configuration by environment variable NAME ONLY.
// This file never contains, reads from disk, or logs secret values.
// Set the variables in your deployment environment (e.g. Vercel dashboard),
// never in committed files.
function flag(enabled, reasonEn, reasonAr) {
  return { enabled: Boolean(enabled), reason: `${reasonEn} / ${reasonAr}` };
}

const DATABASE_URL = process.env.DATABASE_URL || '';
const REDIS_URL = process.env.REDIS_URL || '';
const AGORA_APP_ID = process.env.AGORA_APP_ID || '';
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || '';
const SMS_PROVIDER_KEY = process.env.SMS_PROVIDER_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || '';
const GOOGLE_PLAY_KEY = process.env.GOOGLE_PLAY_KEY || '';
const STOREKIT_KEY = process.env.STOREKIT_KEY || '';
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || '';
const FIREBASE_SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';

const mode = DATABASE_URL ? 'database' : 'demo-ephemeral';

module.exports = {
  PORT: Number(process.env.PORT || 3000),
  DATABASE_URL,
  REDIS_URL,
  AGORA_APP_ID,
  FCM_SERVER_KEY,
  SMS_PROVIDER_KEY,
  JWT_SECRET,
  // True only when a real JWT secret is configured; otherwise auth.js uses
  // a clearly labelled demo fallback and the app runs in demo mode.
  hasJwtSecret: Boolean(JWT_SECRET),
  mode,
  demo: mode === 'demo-ephemeral',
  featureFlags: {
    postgres: flag(DATABASE_URL,
      'PostgreSQL enabled (DATABASE_URL is set)',
      'PostgreSQL مفعّلة (DATABASE_URL مضبوط)'),
    redis: flag(REDIS_URL,
      'Redis enabled (REDIS_URL is set)',
      'Redis مفعّلة (REDIS_URL مضبوط)'),
    agora: flag(AGORA_APP_ID,
      'Agora voice enabled (AGORA_APP_ID is set)',
      'Agora مفعّلة (AGORA_APP_ID مضبوط)'),
    fcm: flag(FCM_SERVER_KEY,
      'FCM push enabled (FCM_SERVER_KEY is set)',
      'FCM مفعّلة (FCM_SERVER_KEY مضبوط)'),
    sms: flag(SMS_PROVIDER_KEY,
      'SMS provider enabled (SMS_PROVIDER_KEY is set)',
      'SMS مفعّلة (SMS_PROVIDER_KEY مضبوط)'),
    googlePlay: flag(GOOGLE_PLAY_KEY,
      'Google Play billing enabled (GOOGLE_PLAY_KEY is set)',
      'Google Play مفعّلة (GOOGLE_PLAY_KEY مضبوط)'),
    storeKit: flag(STOREKIT_KEY,
      'StoreKit billing enabled (STOREKIT_KEY is set)',
      'StoreKit مفعّلة (STOREKIT_KEY مضبوط)'),
    firebase: flag(FIREBASE_SERVICE_ACCOUNT_JSON,
      'Firebase Admin enabled (FIREBASE_SERVICE_ACCOUNT_JSON is set)',
      'Firebase Admin مفعّلة (FIREBASE_SERVICE_ACCOUNT_JSON مضبوط)'),
    storage: flag(STORAGE_BUCKET,
      'Object storage enabled (STORAGE_BUCKET is set)',
      'التخزين مفعّل (STORAGE_BUCKET مضبوط)'),
  },
  catalogLimits: {
    maxSizeBytes: Number(process.env.CATALOG_MAX_SIZE_BYTES || 10 * 1024 * 1024),
    maxDurationSec: Number(process.env.CATALOG_MAX_DURATION_SEC || 30),
    maxWidth: Number(process.env.CATALOG_MAX_WIDTH || 1920),
    maxHeight: Number(process.env.CATALOG_MAX_HEIGHT || 1920),
  },
};

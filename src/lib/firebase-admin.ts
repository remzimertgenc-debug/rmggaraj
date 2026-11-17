import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = existsSync(firebaseConfigPath)
  ? (JSON.parse(readFileSync(firebaseConfigPath, 'utf-8')) as { projectId?: string })
  : {};

if (!getApps().length) {
  initializeApp(
    firebaseConfig.projectId ? { projectId: firebaseConfig.projectId } : undefined
  );
}

export const adminAuth = getAuth();

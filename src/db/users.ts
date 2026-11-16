import { db, isDatabaseConfigured } from './index.ts';
import { users } from './schema.ts';

interface InMemoryUser {
  id: number;
  uid: string;
  email: string;
  createdAt: Date;
}

const memoryUsers = new Map<string, InMemoryUser>();
let nextMemoryUserId = 1;

function getOrCreateMemoryUser(uid: string, email: string): InMemoryUser {
  const safeEmail = email || `${uid}@firebase.local`;
  const existing = memoryUsers.get(uid);
  if (existing) {
    existing.email = safeEmail;
    return existing;
  }
  const created: InMemoryUser = {
    id: nextMemoryUserId++,
    uid,
    email: safeEmail,
    createdAt: new Date(),
  };
  memoryUsers.set(uid, created);
  return created;
}

export async function getOrCreateUser(uid: string, email: string) {
  if (!isDatabaseConfigured) {
    return getOrCreateMemoryUser(uid, email);
  }

  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email: email || `${uid}@firebase.local`,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: email || `${uid}@firebase.local`,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.warn('Database user upsert failed — falling back to in-memory store:', error);
    return getOrCreateMemoryUser(uid, email);
  }
}

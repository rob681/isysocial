import { db } from "@isysocial/db";
import type { PrismaClient } from "@isysocial/db";

export interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    agencyId?: string;
    clientProfileId?: string;
    editorProfileId?: string;
    permissions?: string[];
  };
}

export interface Context {
  db: PrismaClient;
  session: Session | null;
}

export function createContext(session: Session | null): Context {
  return {
    db: db as PrismaClient,
    session,
  };
}

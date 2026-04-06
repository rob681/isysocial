// ─── Admin: Cleanup Duplicate Social Network Entries ──────────────────────────
// One-time cleanup: removes "Sin nombre" ClientSocialNetwork entries that are
// duplicates of newer entries with proper names for the same client+network.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@isysocial/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agencyId = user.agencyId as string;

  // Find all client social networks for this agency
  const allNetworks = await db.clientSocialNetwork.findMany({
    where: { client: { agencyId } },
    select: {
      id: true,
      clientId: true,
      network: true,
      accountName: true,
      profilePic: true,
      pageId: true,
      accountId: true,
      isActive: true,
      accessToken: true,
      agencyAccountId: true,
    },
    orderBy: { assignedAt: "desc" },
  });

  // Group by clientId + network
  const groups = new Map<string, typeof allNetworks>();
  for (const sn of allNetworks) {
    const key = `${sn.clientId}-${sn.network}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(sn);
  }

  const toDelete: string[] = [];
  const toUpdate: { id: string; accountName: string; profilePic: string | null }[] = [];

  for (const [key, entries] of groups) {
    if (entries.length <= 1) continue;

    // Find entries WITH names and WITHOUT names
    const withName = entries.filter((e) => e.accountName && e.accountName !== "Sin nombre");
    const withoutName = entries.filter((e) => !e.accountName || e.accountName === "Sin nombre");

    if (withName.length > 0 && withoutName.length > 0) {
      // We have a good entry and a bad one — delete the bad ones
      for (const bad of withoutName) {
        toDelete.push(bad.id);
      }
    } else if (withoutName.length > 1) {
      // Multiple "Sin nombre" for same client+network — keep the one with a token, delete the rest
      const withToken = withoutName.filter((e) => e.accessToken);
      const toKeep = withToken.length > 0 ? withToken[0] : withoutName[0];
      for (const entry of withoutName) {
        if (entry.id !== toKeep!.id) {
          toDelete.push(entry.id);
        }
      }
    }
  }

  // Also update entries that have agencyAccountId but no name — copy name from agency account
  const noNameWithAgency = allNetworks.filter(
    (e) => (!e.accountName || e.accountName === "Sin nombre") && e.agencyAccountId && !toDelete.includes(e.id)
  );

  for (const entry of noNameWithAgency) {
    const agencyAccount = await db.agencySocialAccount.findUnique({
      where: { id: entry.agencyAccountId! },
      select: { accountName: true, profilePic: true },
    });
    if (agencyAccount?.accountName) {
      toUpdate.push({
        id: entry.id,
        accountName: agencyAccount.accountName,
        profilePic: agencyAccount.profilePic,
      });
    }
  }

  // Execute deletions
  if (toDelete.length > 0) {
    await db.clientSocialNetwork.deleteMany({
      where: { id: { in: toDelete } },
    });
  }

  // Execute updates
  for (const update of toUpdate) {
    await db.clientSocialNetwork.update({
      where: { id: update.id },
      data: { accountName: update.accountName, profilePic: update.profilePic },
    });
  }

  return NextResponse.json({
    deleted: toDelete.length,
    updated: toUpdate.length,
    details: {
      deletedIds: toDelete,
      updatedIds: toUpdate.map((u) => u.id),
    },
  });
}

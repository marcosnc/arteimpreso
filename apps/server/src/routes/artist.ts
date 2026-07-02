import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth.js";
import { Role } from "@prisma/client";

const router = Router();

router.get(
  "/sales",
  requireAuth,
  requireRole(Role.ARTIST),
  async (req: AuthRequest, res) => {
    const profile = await prisma.artistProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!profile) {
      res.status(404).json({ error: "Perfil no encontrado" });
      return;
    }

    const orderItems = await prisma.orderItem.findMany({
      where: { artistId: profile.id },
      include: {
        order: { select: { orderNumber: true, status: true, createdAt: true } },
        artwork: { select: { title: true, imageUrl: true } },
        format: { select: { name: true } },
      },
      orderBy: { order: { createdAt: "desc" } },
    });

    const totalSalesCents = orderItems.reduce(
      (s, i) => s + i.unitPriceCents * i.quantity,
      0
    );

    res.json({ items: orderItems, totalSalesCents });
  }
);

router.get(
  "/payouts",
  requireAuth,
  requireRole(Role.ARTIST),
  async (req: AuthRequest, res) => {
    const profile = await prisma.artistProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!profile) {
      res.status(404).json({ error: "Perfil no encontrado" });
      return;
    }

    const payouts = await prisma.artistPayout.findMany({
      where: { artistId: profile.id },
      include: {
        order: { select: { orderNumber: true, status: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const pending = payouts
      .filter((p) => p.status === "PENDING")
      .reduce((s, p) => s + p.amountCents, 0);
    const paid = payouts
      .filter((p) => p.status === "PAID")
      .reduce((s, p) => s + p.amountCents, 0);

    res.json({ payouts, summary: { pendingCents: pending, paidCents: paid } });
  }
);

export default router;

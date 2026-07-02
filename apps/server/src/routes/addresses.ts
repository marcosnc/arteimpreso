import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user!.userId },
    orderBy: { isDefault: "desc" },
  });
  res.json(addresses);
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const address = await prisma.address.create({
    data: { userId: req.user!.userId, ...req.body },
  });
  res.status(201).json(address);
});

export default router;

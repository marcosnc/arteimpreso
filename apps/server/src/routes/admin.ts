import { Router } from "express";
import { z } from "zod";
import {
  OrderStatus,
  ProviderIntegrationType,
  FulfillmentTaskStatus,
} from "@prisma/client";
import { routeParam } from "../lib/params.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth.js";
import { Role } from "@prisma/client";
import { markOrderDelivered } from "../services/fulfillment.js";

const router = Router();

router.use(requireAuth, requireRole(Role.ADMIN));

// --- Proveedores ---
router.get("/providers", async (_req, res) => {
  const providers = await prisma.printProvider.findMany({
    orderBy: { priority: "desc" },
    include: { _count: { select: { fulfillments: true } } },
  });
  res.json(providers);
});

const providerSchema = z.object({
  name: z.string().min(1),
  integrationType: z.enum(["API", "MANUAL"]),
  apiBaseUrl: z.string().url().optional(),
  apiKeyEncrypted: z.string().optional(),
  isActive: z.boolean().default(true),
  priority: z.number().int().default(0),
});

router.post("/providers", async (req, res) => {
  const parsed = providerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const provider = await prisma.printProvider.create({
    data: {
      ...parsed.data,
      integrationType: parsed.data.integrationType as ProviderIntegrationType,
    },
  });
  res.status(201).json(provider);
});

router.patch("/providers/:id", async (req, res) => {
  const parsed = providerSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const provider = await prisma.printProvider.update({
    where: { id: routeParam(req.params.id) },
    data: parsed.data,
  });
  res.json(provider);
});

// --- Tareas de fulfillment manual ---
router.get("/tasks", async (_req, res) => {
  const tasks = await prisma.fulfillmentTask.findMany({
    where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
    include: {
      fulfillment: {
        include: {
          order: {
            select: {
              orderNumber: true,
              status: true,
              totalCents: true,
            },
          },
          provider: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  res.json(tasks);
});

router.patch("/tasks/:id", async (req, res) => {
  const taskId = routeParam(req.params.id);
  const { status, assignedTo } = req.body;
  const task = await prisma.fulfillmentTask.update({
    where: { id: taskId },
    data: {
      status: status as FulfillmentTaskStatus,
      assignedTo,
      completedAt: status === "COMPLETED" ? new Date() : undefined,
    },
    include: { fulfillment: true },
  });
  res.json(task);
});

// --- Gestión de pedidos ---
router.get("/orders", async (_req, res) => {
  const orders = await prisma.order.findMany({
    include: {
      user: { select: { name: true, email: true } },
      fulfillment: { include: { provider: true, tasks: true } },
      items: { include: { artwork: true, format: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
});

router.patch("/orders/:id/status", async (req, res) => {
  const orderId = routeParam(req.params.id);
  const { status, trackingCode, trackingUrl } = req.body;
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status: status as OrderStatus, trackingCode, trackingUrl },
  });

  if (status === "SHIPPED") {
    await prisma.fulfillment.updateMany({
      where: { orderId },
      data: { shippedAt: new Date() },
    });
  }

  if (status === "DELIVERED") {
    await markOrderDelivered(orderId);
  }

  res.json(order);
});

// --- Payouts de artistas ---
router.get("/payouts", async (_req, res) => {
  const payouts = await prisma.artistPayout.findMany({
    where: { status: "PENDING" },
    include: {
      artist: { select: { displayName: true } },
      order: { select: { orderNumber: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  res.json(payouts);
});

router.post("/payouts/:id/mark-paid", async (req, res) => {
  const payout = await prisma.artistPayout.update({
    where: { id: routeParam(req.params.id) },
    data: { status: "PAID", paidAt: new Date() },
  });
  res.json(payout);
});

// --- Formatos de impresión ---
router.get("/formats", async (_req, res) => {
  res.json(await prisma.printFormat.findMany());
});

router.post("/formats", async (req, res) => {
  const { name, widthCm, heightCm, baseCostCents } = req.body;
  const format = await prisma.printFormat.create({
    data: { name, widthCm, heightCm, baseCostCents },
  });
  res.status(201).json(format);
});

export default router;

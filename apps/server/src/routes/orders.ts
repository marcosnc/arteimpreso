import { Router } from "express";
import { z } from "zod";
import { OrderStatus } from "@prisma/client";
import { routeParam } from "../lib/params.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { processPaymentSuccess } from "../services/fulfillment.js";

const router = Router();

function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AI-${date}-${rand}`;
}

const checkoutSchema = z.object({
  addressId: z.string().optional(),
  address: z
    .object({
      street: z.string(),
      city: z.string(),
      state: z.string().optional(),
      postalCode: z.string(),
      country: z.string().default("AR"),
      label: z.string().optional(),
    })
    .optional(),
});

router.post("/checkout", requireAuth, async (req: AuthRequest, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const cart = await prisma.cart.findUnique({
    where: { userId: req.user!.userId },
    include: {
      items: { include: { artwork: true, format: true } },
    },
  });

  if (!cart?.items.length) {
    res.status(400).json({ error: "El carrito está vacío" });
    return;
  }

  let addressId = parsed.data.addressId;
  if (!addressId && parsed.data.address) {
    const addr = await prisma.address.create({
      data: { userId: req.user!.userId, ...parsed.data.address },
    });
    addressId = addr.id;
  }
  if (!addressId) {
    res.status(400).json({ error: "Se requiere una dirección de envío" });
    return;
  }

  let subtotalCents = 0;
  const orderItems: {
    artworkId: string;
    formatId: string;
    quantity: number;
    unitPriceCents: number;
    artistId: string;
  }[] = [];

  for (const item of cart.items) {
    const price = await prisma.artworkFormatPrice.findUnique({
      where: {
        artworkId_formatId: {
          artworkId: item.artworkId,
          formatId: item.formatId,
        },
      },
    });
    if (!price) {
      res.status(400).json({ error: "Precio no encontrado para un item" });
      return;
    }
    if (item.artwork.printLimit !== null) {
      const remaining = item.artwork.printLimit - item.artwork.printsSold;
      if (item.quantity > remaining) {
        res.status(400).json({
          error: `Stock insuficiente para "${item.artwork.title}"`,
        });
        return;
      }
    }
    subtotalCents += price.priceCents * item.quantity;
    orderItems.push({
      artworkId: item.artworkId,
      formatId: item.formatId,
      quantity: item.quantity,
      unitPriceCents: price.priceCents,
      artistId: item.artwork.artistId,
    });
  }

  const shippingCents = 1500;
  const totalCents = subtotalCents + shippingCents;

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId: req.user!.userId,
      addressId,
      subtotalCents,
      shippingCents,
      totalCents,
      items: { create: orderItems },
      payment: {
        create: { amountCents: totalCents },
      },
    },
    include: {
      items: { include: { artwork: true, format: true } },
      payment: true,
      address: true,
    },
  });

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  res.status(201).json(order);
});

router.post("/:id/pay", requireAuth, async (req: AuthRequest, res) => {
  const orderId = routeParam(req.params.id);
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: req.user!.userId },
    include: { payment: true },
  });

  if (!order) {
    res.status(404).json({ error: "Pedido no encontrado" });
    return;
  }
  if (order.status !== OrderStatus.PENDING_PAYMENT) {
    res.status(400).json({ error: "El pedido ya fue procesado" });
    return;
  }

  // Simulación de pago exitoso (en producción: Stripe webhook)
  try {
    await processPaymentSuccess(order.id);
    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: { include: { artwork: true, format: true } },
        fulfillment: { include: { provider: true, tasks: true } },
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Error al procesar pago",
    });
  }
});

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user!.userId },
    include: {
      items: { include: { artwork: true, format: true } },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
});

router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const orderId = routeParam(req.params.id);
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: req.user!.userId },
    include: {
      items: { include: { artwork: true, format: true } },
      payment: true,
      address: true,
      fulfillment: {
        include: { provider: true, tasks: true },
      },
    },
  });
  if (!order) {
    res.status(404).json({ error: "Pedido no encontrado" });
    return;
  }
  res.json(order);
});

router.get("/:id/tracking", requireAuth, async (req: AuthRequest, res) => {
  const orderId = routeParam(req.params.id);
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: req.user!.userId },
    select: {
      orderNumber: true,
      status: true,
      trackingCode: true,
      trackingUrl: true,
      createdAt: true,
      updatedAt: true,
      fulfillment: {
        select: {
          submittedAt: true,
          shippedAt: true,
          deliveredAt: true,
          provider: { select: { name: true } },
        },
      },
    },
  });
  if (!order) {
    res.status(404).json({ error: "Pedido no encontrado" });
    return;
  }

  const timeline = [
    { status: "Pedido creado", at: order.createdAt },
    order.fulfillment?.submittedAt && {
      status: "En producción",
      at: order.fulfillment.submittedAt,
    },
    order.fulfillment?.shippedAt && {
      status: "Enviado",
      at: order.fulfillment.shippedAt,
    },
    order.fulfillment?.deliveredAt && {
      status: "Entregado",
      at: order.fulfillment.deliveredAt,
    },
  ].filter(Boolean);

  res.json({ ...order, timeline });
});

export default router;

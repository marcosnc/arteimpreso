import { Router } from "express";
import { z } from "zod";
import { routeParam } from "../lib/params.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

async function getOrCreateCart(userId: string) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          artwork: { include: { artist: true } },
          format: true,
        },
      },
    },
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            artwork: { include: { artist: true } },
            format: true,
          },
        },
      },
    });
  }
  return cart;
}

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const cart = await getOrCreateCart(req.user!.userId);
  const itemsWithPrice = await Promise.all(
    cart.items.map(async (item) => {
      const price = await prisma.artworkFormatPrice.findUnique({
        where: {
          artworkId_formatId: {
            artworkId: item.artworkId,
            formatId: item.formatId,
          },
        },
      });
      return {
        ...item,
        unitPriceCents: price?.priceCents ?? 0,
        lineTotalCents: (price?.priceCents ?? 0) * item.quantity,
      };
    })
  );
  const subtotal = itemsWithPrice.reduce((s, i) => s + i.lineTotalCents, 0);
  res.json({ ...cart, items: itemsWithPrice, subtotalCents: subtotal });
});

const addSchema = z.object({
  artworkId: z.string(),
  formatId: z.string(),
  quantity: z.number().int().positive().default(1),
});

router.post("/items", requireAuth, async (req: AuthRequest, res) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { artworkId, formatId, quantity } = parsed.data;
  const artwork = await prisma.artwork.findUnique({ where: { id: artworkId } });
  if (!artwork?.isPublished) {
    res.status(404).json({ error: "Obra no disponible" });
    return;
  }

  if (artwork.printLimit !== null) {
    const remaining = artwork.printLimit - artwork.printsSold;
    if (quantity > remaining) {
      res
        .status(400)
        .json({ error: `Solo quedan ${remaining} impresiones disponibles` });
      return;
    }
  }

  const price = await prisma.artworkFormatPrice.findUnique({
    where: { artworkId_formatId: { artworkId, formatId } },
  });
  if (!price?.isAvailable) {
    res.status(400).json({ error: "Formato no disponible para esta obra" });
    return;
  }

  const cart = await getOrCreateCart(req.user!.userId);
  const existing = await prisma.cartItem.findUnique({
    where: {
      cartId_artworkId_formatId: { cartId: cart.id, artworkId, formatId },
    },
  });

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, artworkId, formatId, quantity },
    });
  }

  const updated = await getOrCreateCart(req.user!.userId);
  res.json(updated);
});

router.patch("/items/:id", requireAuth, async (req: AuthRequest, res) => {
  const itemId = routeParam(req.params.id);
  const { quantity } = req.body;
  if (!quantity || quantity < 1) {
    res.status(400).json({ error: "Cantidad inválida" });
    return;
  }
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId: req.user!.userId } },
    include: { artwork: true },
  });
  if (!item) {
    res.status(404).json({ error: "Item no encontrado" });
    return;
  }
  if (item.artwork.printLimit !== null) {
    const remaining = item.artwork.printLimit - item.artwork.printsSold;
    if (quantity > remaining) {
      res.status(400).json({ error: `Solo quedan ${remaining} impresiones` });
      return;
    }
  }
  await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity },
  });
  res.json(await getOrCreateCart(req.user!.userId));
});

router.delete("/items/:id", requireAuth, async (req: AuthRequest, res) => {
  const itemId = routeParam(req.params.id);
  await prisma.cartItem.deleteMany({
    where: { id: itemId, cart: { userId: req.user!.userId } },
  });
  res.json(await getOrCreateCart(req.user!.userId));
});

export default router;

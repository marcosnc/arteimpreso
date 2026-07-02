import { Router } from "express";
import { z } from "zod";
import { routeParam } from "../lib/params.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth.js";
import { Role } from "@prisma/client";

const router = Router();

async function getArtistProfile(userId: string) {
  return prisma.artistProfile.findUnique({ where: { userId } });
}

async function getOwnedArtwork(artworkId: string, userId: string) {
  const profile = await getArtistProfile(userId);
  if (!profile) return null;
  return prisma.artwork.findFirst({
    where: { id: artworkId, artistId: profile.id },
    include: {
      formatPrices: { include: { format: true } },
      _count: { select: { orderItems: true } },
    },
  });
}

router.get("/", async (_req, res) => {
  const artworks = await prisma.artwork.findMany({
    where: { isPublished: true },
    include: {
      artist: { select: { displayName: true } },
      formatPrices: {
        where: { isAvailable: true },
        include: { format: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = artworks.map((a) => ({
    ...a,
    printsRemaining:
      a.printLimit !== null ? Math.max(0, a.printLimit - a.printsSold) : null,
  }));

  res.json(result);
});

router.get("/formats/all", async (_req, res) => {
  const formats = await prisma.printFormat.findMany({
    where: { isActive: true },
    orderBy: { widthCm: "asc" },
  });
  res.json(formats);
});

router.get(
  "/artist/mine",
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
    const artworks = await prisma.artwork.findMany({
      where: { artistId: profile.id },
      include: {
        formatPrices: { include: { format: true } },
        _count: { select: { orderItems: true } },
      },
    });
    res.json(artworks);
  }
);

router.get("/:id", async (req, res) => {
  const artwork = await prisma.artwork.findUnique({
    where: { id: routeParam(req.params.id) },
    include: {
      artist: { select: { displayName: true, bio: true } },
      formatPrices: {
        where: { isAvailable: true },
        include: { format: true },
      },
    },
  });
  if (!artwork) {
    res.status(404).json({ error: "Obra no encontrada" });
    return;
  }
  res.json({
    ...artwork,
    printsRemaining:
      artwork.printLimit !== null
        ? Math.max(0, artwork.printLimit - artwork.printsSold)
        : null,
  });
});

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url(),
  printLimit: z.number().int().positive().nullable().optional(),
  isPublished: z.boolean().optional(),
  formatPrices: z.array(
    z.object({
      formatId: z.string(),
      priceCents: z.number().int().positive(),
    })
  ),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional(),
  printLimit: z.number().int().positive().nullable().optional(),
  isPublished: z.boolean().optional(),
  formatPrices: z
    .array(
      z.object({
        formatId: z.string(),
        priceCents: z.number().int().positive(),
        isAvailable: z.boolean().optional(),
      })
    )
    .optional(),
});

router.post(
  "/",
  requireAuth,
  requireRole(Role.ARTIST),
  async (req: AuthRequest, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const profile = await prisma.artistProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!profile) {
      res.status(400).json({ error: "Perfil de artista no encontrado" });
      return;
    }

    const { formatPrices, ...data } = parsed.data;
    const artwork = await prisma.artwork.create({
      data: {
        ...data,
        artistId: profile.id,
        formatPrices: { create: formatPrices },
      },
      include: { formatPrices: { include: { format: true } } },
    });
    res.status(201).json(artwork);
  }
);

router.patch(
  "/:id",
  requireAuth,
  requireRole(Role.ARTIST),
  async (req: AuthRequest, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const artwork = await getOwnedArtwork(
      routeParam(req.params.id),
      req.user!.userId
    );
    if (!artwork) {
      res.status(404).json({ error: "Obra no encontrada" });
      return;
    }

    const { formatPrices, ...data } = parsed.data;
    const updated = await prisma.$transaction(async (tx) => {
      await tx.artwork.update({
        where: { id: artwork.id },
        data,
      });

      if (formatPrices) {
        for (const fp of formatPrices) {
          await tx.artworkFormatPrice.upsert({
            where: {
              artworkId_formatId: {
                artworkId: artwork.id,
                formatId: fp.formatId,
              },
            },
            update: {
              priceCents: fp.priceCents,
              ...(fp.isAvailable !== undefined
                ? { isAvailable: fp.isAvailable }
                : {}),
            },
            create: {
              artworkId: artwork.id,
              formatId: fp.formatId,
              priceCents: fp.priceCents,
              isAvailable: fp.isAvailable ?? true,
            },
          });
        }
      }

      return tx.artwork.findUnique({
        where: { id: artwork.id },
        include: {
          formatPrices: { include: { format: true } },
          _count: { select: { orderItems: true } },
        },
      });
    });

    res.json(updated);
  }
);

router.delete(
  "/:id",
  requireAuth,
  requireRole(Role.ARTIST),
  async (req: AuthRequest, res) => {
    const artwork = await getOwnedArtwork(
      routeParam(req.params.id),
      req.user!.userId
    );
    if (!artwork) {
      res.status(404).json({ error: "Obra no encontrada" });
      return;
    }

    if (artwork._count.orderItems > 0) {
      res.status(400).json({
        error: "No se puede eliminar una obra con ventas registradas",
      });
      return;
    }

    await prisma.artwork.delete({ where: { id: artwork.id } });
    res.status(204).send();
  }
);

export default router;

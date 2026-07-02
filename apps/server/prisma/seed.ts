import { PrismaClient, Role, ProviderIntegrationType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@arteimpreso.com" },
    update: {},
    create: {
      email: "admin@arteimpreso.com",
      passwordHash,
      name: "Administrador",
      role: Role.ADMIN,
    },
  });

  const artistUser = await prisma.user.upsert({
    where: { email: "artista@arteimpreso.com" },
    update: {},
    create: {
      email: "artista@arteimpreso.com",
      passwordHash,
      name: "María García",
      role: Role.ARTIST,
      artistProfile: {
        create: {
          displayName: "María García",
          bio: "Pintora contemporánea especializada en paisajes urbanos.",
        },
      },
    },
    include: { artistProfile: true },
  });

  const buyer = await prisma.user.upsert({
    where: { email: "comprador@arteimpreso.com" },
    update: {},
    create: {
      email: "comprador@arteimpreso.com",
      passwordHash,
      name: "Juan Pérez",
      role: Role.BUYER,
      cart: { create: {} },
    },
  });

  const formats = await Promise.all([
    prisma.printFormat.upsert({
      where: { name: "A4" },
      update: {},
      create: { name: "A4", widthCm: 21, heightCm: 29.7, baseCostCents: 800 },
    }),
    prisma.printFormat.upsert({
      where: { name: "A3" },
      update: {},
      create: { name: "A3", widthCm: 29.7, heightCm: 42, baseCostCents: 1500 },
    }),
    prisma.printFormat.upsert({
      where: { name: "50x70cm" },
      update: {},
      create: { name: "50x70cm", widthCm: 50, heightCm: 70, baseCostCents: 4500 },
    }),
  ]);

  await prisma.printProvider.upsert({
    where: { id: "seed-provider-api" },
    update: {},
    create: {
      id: "seed-provider-api",
      name: "PrintCo API",
      integrationType: ProviderIntegrationType.API,
      apiBaseUrl: "https://api.printco.example.com",
      priority: 10,
      isActive: true,
    },
  });

  await prisma.printProvider.upsert({
    where: { id: "seed-provider-manual" },
    update: {},
    create: {
      id: "seed-provider-manual",
      name: "Taller Manual Buenos Aires",
      integrationType: ProviderIntegrationType.MANUAL,
      priority: 5,
      isActive: true,
    },
  });

  const artistProfile = artistUser.artistProfile;
  if (artistProfile) {
    const artwork = await prisma.artwork.upsert({
      where: { id: "seed-artwork-1" },
      update: {},
      create: {
        id: "seed-artwork-1",
        artistId: artistProfile.id,
        title: "Atardecer en el Río",
        description: "Óleo digital inspirado en los atardeceres porteños.",
        imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
        printLimit: 100,
        isPublished: true,
      },
    });

    for (const format of formats) {
      const priceMap: Record<string, number> = {
        A4: 2500,
        A3: 4500,
        "50x70cm": 12000,
      };
      await prisma.artworkFormatPrice.upsert({
        where: {
          artworkId_formatId: { artworkId: artwork.id, formatId: format.id },
        },
        update: {},
        create: {
          artworkId: artwork.id,
          formatId: format.id,
          priceCents: priceMap[format.name] ?? 3000,
        },
      });
    }

    await prisma.artwork.upsert({
      where: { id: "seed-artwork-2" },
      update: {},
      create: {
        id: "seed-artwork-2",
        artistId: artistProfile.id,
        title: "Ciudad Nocturna",
        description: "Edición limitada de 50 impresiones.",
        imageUrl: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800",
        printLimit: 50,
        printsSold: 12,
        isPublished: true,
        formatPrices: {
          create: formats.map((f) => ({
            formatId: f.id,
            priceCents: f.name === "50x70cm" ? 15000 : f.name === "A3" ? 5500 : 3000,
          })),
        },
      },
    });
  }

  console.log("Seed completado:");
  console.log("  Admin:    admin@arteimpreso.com / password123");
  console.log("  Artista:  artista@arteimpreso.com / password123");
  console.log("  Comprador: comprador@arteimpreso.com / password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

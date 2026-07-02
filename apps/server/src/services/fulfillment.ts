import {
  OrderStatus,
  ProviderIntegrationType,
  FulfillmentTaskStatus,
  PaymentStatus,
  PayoutStatus,
} from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export async function selectProvider() {
  return prisma.printProvider.findFirst({
    where: { isActive: true },
    orderBy: { priority: "desc" },
  });
}

export async function submitOrderToProvider(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { artwork: true, format: true } },
      address: true,
    },
  });
  if (!order) throw new Error("Pedido no encontrado");

  const provider = await selectProvider();
  if (!provider) throw new Error("No hay proveedores activos");

  const fulfillment = await prisma.fulfillment.create({
    data: {
      orderId,
      providerId: provider.id,
    },
  });

  if (provider.integrationType === ProviderIntegrationType.API) {
    const externalId = await submitViaApi(provider, order);
    await prisma.fulfillment.update({
      where: { id: fulfillment.id },
      data: {
        externalOrderId: externalId,
        submittedAt: new Date(),
      },
    });
    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.IN_PRODUCTION },
    });
  } else {
    await prisma.fulfillmentTask.createMany({
      data: [
        {
          fulfillmentId: fulfillment.id,
          title: "Enviar archivos al proveedor",
          description: `Pedido ${order.orderNumber}: preparar impresiones`,
        },
        {
          fulfillmentId: fulfillment.id,
          title: "Confirmar producción",
        },
        {
          fulfillmentId: fulfillment.id,
          title: "Coordinar envío",
        },
      ],
    });
    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.IN_PRODUCTION },
    });
  }

  return fulfillment;
}

async function submitViaApi(
  provider: { apiBaseUrl: string | null; apiKeyEncrypted: string | null },
  order: {
    orderNumber: string;
    items: { artwork: { imageUrl: string; title: string }; format: { name: string }; quantity: number }[];
    address: { street: string; city: string; postalCode: string; country: string };
  }
): Promise<string> {
  // Placeholder: integración real con API del proveedor
  console.log(
    `[API] Enviando pedido ${order.orderNumber} a ${provider.apiBaseUrl}`,
    order.items.length,
    "items"
  );
  return `EXT-${Date.now()}`;
}

export async function markOrderDelivered(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      fulfillment: true,
    },
  });
  if (!order) throw new Error("Pedido no encontrado");

  await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.DELIVERED },
  });

  if (order.fulfillment) {
    await prisma.fulfillment.update({
      where: { id: order.fulfillment.id },
      data: { deliveredAt: new Date() },
    });
  }

  const artistTotals = new Map<string, number>();
  for (const item of order.items) {
    const current = artistTotals.get(item.artistId) ?? 0;
    artistTotals.set(
      item.artistId,
      current + item.unitPriceCents * item.quantity
    );
  }

  const artistSharePct = (100 - order.platformFeePct) / 100;

  for (const [artistId, grossCents] of artistTotals) {
    const payoutCents = Math.round(grossCents * artistSharePct);
    await prisma.artistPayout.upsert({
      where: { artistId_orderId: { artistId, orderId } },
      update: {},
      create: {
        artistId,
        orderId,
        amountCents: payoutCents,
        status: PayoutStatus.PENDING,
      },
    });
  }
}

export async function processPaymentSuccess(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { artwork: true } } },
  });
  if (!order) throw new Error("Pedido no encontrado");

  for (const item of order.items) {
    const artwork = item.artwork;
    if (artwork.printLimit !== null) {
      const remaining = artwork.printLimit - artwork.printsSold;
      if (item.quantity > remaining) {
        throw new Error(`Stock insuficiente para "${artwork.title}"`);
      }
      await prisma.artwork.update({
        where: { id: artwork.id },
        data: { printsSold: { increment: item.quantity } },
      });
    }
  }

  await prisma.payment.update({
    where: { orderId },
    data: { status: PaymentStatus.COMPLETED, paidAt: new Date() },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.PAID },
  });

  await submitOrderToProvider(orderId);
}

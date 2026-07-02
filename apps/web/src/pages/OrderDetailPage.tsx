import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatPrice } from "../api/client";

interface TimelineEvent {
  status: string;
  at: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  subtotalCents: number;
  shippingCents: number;
  trackingCode: string | null;
  trackingUrl: string | null;
  createdAt: string;
  items: {
    quantity: number;
    unitPriceCents: number;
    artwork: { title: string; imageUrl: string };
    format: { name: string };
  }[];
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  fulfillment?: {
    provider: { name: string };
    submittedAt: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    tasks: { id: string; title: string; status: string }[];
  };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  PAID: "Pagado",
  IN_PRODUCTION: "En producción",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<Order>(`/orders/${id}`),
      api<{ timeline: TimelineEvent[] }>(`/orders/${id}/tracking`),
    ])
      .then(([o, t]) => {
        setOrder(o);
        setTimeline(t.timeline as TimelineEvent[]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="container">Cargando...</div>;
  if (!order) return <div className="container">Pedido no encontrado</div>;

  return (
    <div className="container">
      <Link to="/mis-compras" style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
        ← Volver a mis compras
      </Link>
      <h1 className="page-title" style={{ marginTop: "1rem" }}>
        Pedido {order.orderNumber}
      </h1>
      <p className="page-subtitle">
        Estado: {STATUS_LABELS[order.status] ?? order.status}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", marginBottom: "1rem" }}>
            Seguimiento
          </h2>
          <div className="card" style={{ padding: "1.25rem" }}>
            {timeline.map((event, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "1rem",
                  paddingBottom: "1rem",
                  borderLeft: i < timeline.length - 1 ? "2px solid var(--border)" : "none",
                  marginLeft: "0.5rem",
                  paddingLeft: "1.25rem",
                }}
              >
                <div>
                  <p style={{ fontWeight: 500 }}>{event.status}</p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                    {new Date(event.at).toLocaleString("es-AR")}
                  </p>
                </div>
              </div>
            ))}
            {order.trackingCode && (
              <p style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
                Código de seguimiento: <strong>{order.trackingCode}</strong>
                {order.trackingUrl && (
                  <>
                    {" "}
                    ·{" "}
                    <a href={order.trackingUrl} target="_blank" rel="noreferrer">
                      Rastrear envío
                    </a>
                  </>
                )}
              </p>
            )}
            {order.fulfillment?.provider && (
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                Proveedor: {order.fulfillment.provider.name}
              </p>
            )}
          </div>
        </div>

        <div>
          <h2 style={{ fontFamily: "var(--font-display)", marginBottom: "1rem" }}>
            Detalle
          </h2>
          <div className="card" style={{ padding: "1.25rem" }}>
            {order.items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "1rem",
                  marginBottom: "1rem",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <img
                  src={item.artwork.imageUrl}
                  alt={item.artwork.title}
                  style={{ width: 60, height: 48, objectFit: "cover", borderRadius: 4 }}
                />
                <div>
                  <p style={{ fontWeight: 500 }}>{item.artwork.title}</p>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    {item.format.name} × {item.quantity}
                  </p>
                  <p>{formatPrice(item.unitPriceCents * item.quantity)}</p>
                </div>
              </div>
            ))}
            <div style={{ marginTop: "1rem" }}>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotalCents)}</span>
              </div>
              <div className="summary-row">
                <span>Envío</span>
                <span>{formatPrice(order.shippingCents)}</span>
              </div>
              <div className="summary-row" style={{ fontWeight: 600, marginTop: "0.5rem" }}>
                <span>Total</span>
                <span>{formatPrice(order.totalCents)}</span>
              </div>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "1rem" }}>
              Envío a: {order.address.street}, {order.address.city}{" "}
              {order.address.postalCode}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

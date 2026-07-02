import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatPrice } from "../api/client";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  createdAt: string;
  items: { artwork: { title: string } }[];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  PAID: "Pagado",
  IN_PRODUCTION: "En producción",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING_PAYMENT: "badge-pending",
  PAID: "badge-paid",
  IN_PRODUCTION: "badge-production",
  SHIPPED: "badge-shipped",
  DELIVERED: "badge-delivered",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Order[]>("/orders")
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <h1 className="page-title">Mis compras</h1>
      <p className="page-subtitle">Historial de pedidos y seguimiento</p>

      {loading ? (
        <p>Cargando...</p>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <p>Aún no realizaste ninguna compra.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: "1rem" }}>
            Explorar obras
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/pedido/${order.id}`}
              className="card"
              style={{
                padding: "1.25rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p style={{ fontWeight: 600 }}>{order.orderNumber}</p>
                <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                  {new Date(order.createdAt).toLocaleDateString("es-AR")} ·{" "}
                  {order.items.map((i) => i.artwork.title).join(", ")}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className={`badge ${STATUS_BADGE[order.status] ?? ""}`}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
                <p style={{ fontWeight: 600, marginTop: "0.5rem" }}>
                  {formatPrice(order.totalCents)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

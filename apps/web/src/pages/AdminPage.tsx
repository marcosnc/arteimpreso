import { useEffect, useState } from "react";
import { api, formatPrice } from "../api/client";

interface Provider {
  id: string;
  name: string;
  integrationType: string;
  isActive: boolean;
  priority: number;
}

interface Task {
  id: string;
  title: string;
  status: string;
  fulfillment: {
    order: { orderNumber: string };
    provider: { name: string };
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  user: { name: string; email: string };
}

interface Payout {
  id: string;
  amountCents: number;
  artist: { displayName: string };
  order: { orderNumber: string };
}

export default function AdminPage() {
  const [tab, setTab] = useState<"pedidos" | "proveedores" | "tareas" | "cobros">("pedidos");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  const load = () => {
    api<Provider[]>("/admin/providers").then(setProviders);
    api<Task[]>("/admin/tasks").then(setTasks);
    api<Order[]>("/admin/orders").then(setOrders);
    api<Payout[]>("/admin/payouts").then(setPayouts);
  };

  useEffect(() => {
    load();
  }, []);

  const updateOrderStatus = async (id: string, status: string) => {
    await api(`/admin/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    load();
  };

  const completeTask = async (id: string) => {
    await api(`/admin/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    load();
  };

  const markPayoutPaid = async (id: string) => {
    await api(`/admin/payouts/${id}/mark-paid`, { method: "POST" });
    load();
  };

  return (
    <div className="container">
      <h1 className="page-title">Panel de administración</h1>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        {(
          [
            ["pedidos", "Pedidos"],
            ["proveedores", "Proveedores"],
            ["tareas", "Tareas manuales"],
            ["cobros", "Cobros artistas"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            className={`btn ${tab === key ? "btn-primary" : "btn-outline"}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "pedidos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {orders.map((o) => (
            <div key={o.id} className="card" style={{ padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontWeight: 600 }}>{o.orderNumber}</p>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    {o.user.name} · {formatPrice(o.totalCents)}
                  </p>
                </div>
                <select
                  className="input"
                  style={{ width: "auto" }}
                  value={o.status}
                  onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                >
                  <option value="PAID">Pagado</option>
                  <option value="IN_PRODUCTION">En producción</option>
                  <option value="SHIPPED">Enviado</option>
                  <option value="DELIVERED">Entregado</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "proveedores" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {providers.map((p) => (
            <div key={p.id} className="card" style={{ padding: "1rem" }}>
              <p style={{ fontWeight: 600 }}>{p.name}</p>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                {p.integrationType === "API" ? "Integración API" : "Manual"} · Prioridad{" "}
                {p.priority} · {p.isActive ? "Activo" : "Inactivo"}
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === "tareas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {tasks.length === 0 ? (
            <p className="empty-state">No hay tareas pendientes</p>
          ) : (
            tasks.map((t) => (
              <div key={t.id} className="card" style={{ padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontWeight: 500 }}>{t.title}</p>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    {t.fulfillment.order.orderNumber} · {t.fulfillment.provider.name}
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => completeTask(t.id)}>
                  Completar
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "cobros" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {payouts.length === 0 ? (
            <p className="empty-state">No hay cobros pendientes</p>
          ) : (
            payouts.map((p) => (
              <div key={p.id} className="card" style={{ padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontWeight: 500 }}>{p.artist.displayName}</p>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    Pedido {p.order.orderNumber}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ fontWeight: 600 }}>{formatPrice(p.amountCents)}</span>
                  <button className="btn btn-primary" onClick={() => markPayoutPaid(p.id)}>
                    Marcar pagado
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

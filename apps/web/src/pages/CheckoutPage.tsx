import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatPrice } from "../api/client";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "AR",
    label: "Casa",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const order = await api<{ id: string }>("/orders/checkout", {
        method: "POST",
        body: JSON.stringify({ address }),
      });
      const paid = await api<{ id: string }>(`/orders/${order.id}/pay`, {
        method: "POST",
      });
      navigate(`/pedido/${paid.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error en checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <h1 className="page-title">Checkout</h1>
      <p className="page-subtitle">Ingresá la dirección de envío</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="card" style={{ padding: "1.5rem" }}>
        <div className="form-group">
          <label className="label">Calle y número</label>
          <input
            className="input"
            required
            value={address.street}
            onChange={(e) => setAddress({ ...address, street: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="label">Ciudad</label>
          <input
            className="input"
            required
            value={address.city}
            onChange={(e) => setAddress({ ...address, city: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="label">Provincia</label>
          <input
            className="input"
            value={address.state}
            onChange={(e) => setAddress({ ...address, state: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="label">Código postal</label>
          <input
            className="input"
            required
            value={address.postalCode}
            onChange={(e) =>
              setAddress({ ...address, postalCode: e.target.value })
            }
          />
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
          Envío estimado: {formatPrice(1500)} · Pago simulado (modo desarrollo)
        </p>
        <button type="submit" className="btn btn-primary full-width" disabled={loading}>
          {loading ? "Procesando..." : "Confirmar y pagar"}
        </button>
      </form>
    </div>
  );
}

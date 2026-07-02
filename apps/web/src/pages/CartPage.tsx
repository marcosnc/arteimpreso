import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatPrice } from "../api/client";
import "./CartPage.css";

interface CartItem {
  id: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  artwork: { id: string; title: string; imageUrl: string };
  format: { name: string };
}

interface Cart {
  items: CartItem[];
  subtotalCents: number;
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadCart = () =>
    api<Cart>("/cart")
      .then(setCart)
      .finally(() => setLoading(false));

  useEffect(() => {
    loadCart();
  }, []);

  const updateQty = async (id: string, quantity: number) => {
    await api(`/cart/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
    loadCart();
  };

  const removeItem = async (id: string) => {
    await api(`/cart/items/${id}`, { method: "DELETE" });
    loadCart();
  };

  if (loading) return <div className="container">Cargando carrito...</div>;

  if (!cart?.items.length) {
    return (
      <div className="container">
        <h1 className="page-title">Carrito</h1>
        <div className="empty-state">
          <p>Tu carrito está vacío.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: "1rem" }}>
            Explorar obras
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="page-title">Carrito</h1>
      <div className="cart-layout">
        <div className="cart-items">
          {cart.items.map((item) => (
            <div key={item.id} className="cart-item card">
              <img src={item.artwork.imageUrl} alt={item.artwork.title} />
              <div className="cart-item-info">
                <h3>{item.artwork.title}</h3>
                <p className="format">{item.format.name}</p>
                <p className="unit-price">{formatPrice(item.unitPriceCents)} c/u</p>
              </div>
              <div className="cart-item-actions">
                <input
                  type="number"
                  className="input qty-input"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    updateQty(item.id, Number(e.target.value))
                  }
                />
                <p className="line-total">{formatPrice(item.lineTotalCents)}</p>
                <button
                  className="remove-btn"
                  onClick={() => removeItem(item.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="cart-summary card">
          <h2>Resumen</h2>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(cart.subtotalCents)}</span>
          </div>
          <div className="summary-row muted">
            <span>Envío</span>
            <span>Se calcula en checkout</span>
          </div>
          <button
            className="btn btn-primary full-width"
            onClick={() => navigate("/checkout")}
          >
            Continuar al checkout
          </button>
        </div>
      </div>
    </div>
  );
}

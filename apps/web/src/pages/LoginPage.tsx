import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "BUYER" as "BUYER" | "ARTIST",
    displayName: "",
  });

  if (user) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isRegister) {
        await register(form);
      } else {
        await login(form.email, form.password);
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1 className="page-title">{isRegister ? "Crear cuenta" : "Ingresar"}</h1>
      <p className="page-subtitle">
        {isRegister
          ? "Registrate como comprador o artista"
          : "Accedé a tu cuenta de ArteImpreso"}
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="card" style={{ padding: "1.5rem" }}>
        {isRegister && (
          <>
            <div className="form-group">
              <label className="label">Nombre</label>
              <input
                className="input"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="label">Tipo de cuenta</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as "BUYER" | "ARTIST" })
                }
              >
                <option value="BUYER">Comprador</option>
                <option value="ARTIST">Artista</option>
              </select>
            </div>
            {form.role === "ARTIST" && (
              <div className="form-group">
                <label className="label">Nombre artístico</label>
                <input
                  className="input"
                  value={form.displayName}
                  onChange={(e) =>
                    setForm({ ...form, displayName: e.target.value })
                  }
                />
              </div>
            )}
          </>
        )}
        <div className="form-group">
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="label">Contraseña</label>
          <input
            type="password"
            className="input"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <button type="submit" className="btn btn-primary full-width" disabled={loading}>
          {loading ? "..." : isRegister ? "Registrarse" : "Ingresar"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.875rem" }}>
        {isRegister ? "¿Ya tenés cuenta?" : "¿No tenés cuenta?"}{" "}
        <button
          onClick={() => setIsRegister(!isRegister)}
          style={{ color: "var(--accent)", textDecoration: "underline" }}
        >
          {isRegister ? "Ingresar" : "Registrarse"}
        </button>
      </p>

      {!isRegister && (
        <div
          className="card"
          style={{ padding: "1rem", marginTop: "1.5rem", fontSize: "0.8125rem" }}
        >
          <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Cuentas de demo:</p>
          <p>comprador@arteimpreso.com / password123</p>
          <p>artista@arteimpreso.com / password123</p>
          <p>admin@arteimpreso.com / password123</p>
        </div>
      )}
    </div>
  );
}

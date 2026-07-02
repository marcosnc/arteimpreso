import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Layout.css";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="container header-inner">
          <Link to="/" className="logo">
            Arte<span>Impreso</span>
          </Link>
          <nav className="nav">
            <Link to="/">Catálogo</Link>
            {user && (
              <>
                <Link to="/carrito">Carrito</Link>
                <Link to="/mis-compras">Mis compras</Link>
              </>
            )}
            {user?.role === "ARTIST" && (
              <Link to="/artista">Mi estudio</Link>
            )}
            {user?.role === "ADMIN" && (
              <Link to="/admin">Admin</Link>
            )}
          </nav>
          <div className="header-actions">
            {user ? (
              <>
                <span className="user-name">{user.name}</span>
                <button className="btn btn-outline" onClick={handleLogout}>
                  Salir
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary">
                Ingresar
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container">
          <p>© {new Date().getFullYear()} ArteImpreso — Conectando artistas con amantes del arte.</p>
        </div>
      </footer>
    </div>
  );
}

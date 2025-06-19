// src/components/Header.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Heart, LogInIcon, User, ShoppingCart, Notebook } from "lucide-react";

const Header = () => {
  const styles = {
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0.5rem",
      backgroundColor: "white",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
    },
    brandTitle: {
      fontSize: "1.5rem",
      fontWeight: "bold",
      color: "#cb8a90",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },
    brandIcon: {
      color: "#ffffff",
    },
    navMenu: {
      display: "flex",
      gap: "1rem",
      alignItems: "center",
    },
    navButton: {
      display: "flex",
      alignItems: "center",
      gap: "0.25rem",
      background: "none",
      border: "none",
      color: "#cb8a90",
      cursor: "pointer",
      fontSize: "1rem",
      textDecoration: "none",
    },
    navButtonHover: {
      textDecoration: "underline",
    },
    icon: {
      width: "1rem",
      height: "1rem",
    },
  };

  return (
    <header style={styles.header}>
      <h1 style={styles.brandTitle}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", color: "#cb8a90" }}>
          <Heart style={styles.brandIcon} />
          小高婚禮策劃
        </Link>
      </h1>
      <nav style={styles.navMenu}>
        <Link to="/login" style={styles.navButton}>
          <LogInIcon style={styles.icon} /> 登入
        </Link>
        <Link to="/register" style={styles.navButton}>
          <User style={styles.icon} /> 註冊
        </Link>


        <Link to="/persondata" style={styles.navButton}>
          <User style={styles.icon} /> 個人資料
        </Link>
      </nav>
    </header>
  );
};

export default Header;
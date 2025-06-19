// frontend/src/components/Header.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, LogInIcon, User, ShoppingCart, Notebook } from "lucide-react"; // 確保引入了 LogInIcon 和 User

// 接收新的 props：isLoggedIn, onLogout, onShowLogin, onShowRegister
const Header = ({ isLoggedIn, onLogout, onShowLogin, onShowRegister }) => {
  const navigate = useNavigate();

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
      color: "#ffffff", // 這邊顏色可能要調整，因為背景色是白色，愛心可能不明顯
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
    // 新增的樣式
    authButton: {
      display: "flex",
      alignItems: "center",
      gap: "0.25rem",
      background: "none",
      border: "none",
      color: "#cb8a90",
      cursor: "pointer",
      fontSize: "1rem",
      textDecoration: "none",
      padding: "0.5rem 1rem",
      borderRadius: "9999px", // 圓角
      transition: "background-color 0.3s ease",
    },
    authButtonHover: {
      backgroundColor: "#f0f0f0", // 懸停背景色
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
      <nav>
        <ul style={styles.navMenu}>
          {/* 其他導航連結 */}
          <li><Link to="/" style={styles.navButton}>首頁</Link></li>
          <li><Link to="/service" style={styles.navButton}>服務介紹</Link></li>
          <li><Link to="/process" style={styles.navButton}>設計流程</Link></li>
          {isLoggedIn && ( // 只有在登入時才顯示財務管理和專案列表
            <>
              <li><Link to="/finance" style={styles.navButton}>財務管理</Link></li>
              <li><Link to="/projectall" style={styles.navButton}>專案列表</Link></li>
            </>
          )}

          {isLoggedIn ? (
            // 登入後顯示使用者圖示和登出按鈕
            <>
              <li>
                <button
                  onClick={onLogout}
                  style={{ ...styles.authButton, backgroundColor: '#e0e0e0' }} // 登出按鈕的樣式
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styles.authButtonHover.backgroundColor}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
                >
                  <User style={styles.icon} />
                  登出
                </button>
              </li>
            </>
          ) : (
            // 未登入時顯示登入和註冊按鈕
            <>
              <li>
                <button
                  onClick={onShowLogin}
                  style={styles.authButton}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styles.authButtonHover.backgroundColor}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <LogInIcon style={styles.icon} />
                  登入
                </button>
              </li>
              <li>
                <button
                  onClick={onShowRegister}
                  style={styles.authButton}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styles.authButtonHover.backgroundColor}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Notebook style={styles.icon} />
                  註冊
                </button>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header;
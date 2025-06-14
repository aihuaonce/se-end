import React from "react";
import { Link } from "react-router-dom";
import { Heart, LogInIcon, User, ShoppingCart, Notebook } from "lucide-react";

const Header = () => {
  const styles = {
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "1rem 2rem", // 加大 padding
      backgroundColor: "white",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", // 更明顯的陰影
    },
    brandTitle: {
      fontSize: "1.5rem", // 加大字體
      fontWeight: "bold",
      color: "#cb8a90",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem", // 加大間距
      textShadow: "1px 1px 2px rgba(0, 0, 0, 0.05)", // 可選：文字陰影
    },
    navMenu: {
      display: "flex",
      gap: "1rem", // 加大間距
      alignItems: "center",
    },
    navButton: {
      display: "flex",
      alignItems: "center",
      gap: "0.25rem", // 加大間距
      background: "none",
      border: "none",
      color: "#cb8a90",
      cursor: "pointer",
      fontSize: "1rem", // 加大字體
      textDecoration: "none",
      padding: "0.5rem 1rem", // 加大 padding
      borderRadius: "0.25rem", // 可選：增加圓角
      transition: "background-color 0.2s ease", // 可選：增加 hover 效果
      // 在 JavaScript 的 style object 中不能直接寫 :hover
      // 如果要處理 hover 效果，你需要使用 CSS 類名或 CSS-in-JS 函式庫
    },
  };

  return (
    <header style={styles.header}>
      <h1 style={styles.brandTitle}>
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: styles.brandTitle.gap,
            textDecoration: "none",
            color: "#cb8a90",
          }}
        >
          <Heart size={24} color="#cb8a90" /> {/* 加大圖標 */}
          小高婚禮策劃
        </Link>
      </h1>
      <nav style={styles.navMenu}>
        <Link to="/login" style={styles.navButton}>
          <LogInIcon size={16} /> {/* 加大圖標 */}
          登入
        </Link>
        <Link to="/register" style={styles.navButton}>
          <User size={16} /> {/* 加大圖標 */}
          註冊
        </Link>
        <Link to="/booking" style={styles.navButton}>
          <Notebook size={16} /> {/* 加大圖標 */}
          預約
        </Link>
        <Link to="/persondata" style={styles.navButton}>
          <User size={16} /> {/* 加大圖標 */}
          個人資料
        </Link>
      </nav>
    </header>
  );
};

export default Header;
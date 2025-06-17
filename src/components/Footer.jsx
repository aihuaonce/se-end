import React from "react";

const Footer = () => {
  const styles = {
    footer: {
      textAlign: "center",
      fontSize: "0.875rem", // 加大字體：從 0.625rem 調整到 0.875rem
      color: "#cb8a90",
      padding: "1rem", // 加大 padding 讓頁尾有更多空間
      backgroundColor: "white", // 如果頁尾的背景色不是白色，可以明確設定
    },
  };

  return (
    <footer style={styles.footer}>
      © 2025 小高婚禮策劃 LoveEver After Weddings. All rights reserved.
    </footer>
  );
};

export default Footer;
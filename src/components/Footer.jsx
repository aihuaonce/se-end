// src/components/Footer.jsx
import React from "react";

const Footer = () => {
  const styles = {
    footer: {
      textAlign: "center",
      fontSize: "0.875rem",
      color: "#cb8a90",
      padding: "1.5rem",
    },
  };

  return (
    <footer style={styles.footer}>
      © 2025 小高婚禮策劃 LoveEver After Weddings. All rights reserved.
    </footer>
  );
};

export default Footer;

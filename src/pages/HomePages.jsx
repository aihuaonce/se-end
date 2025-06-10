import React from "react";
import { Heart, LogIn as LogInIcon, User, ShoppingCart } from "lucide-react";
import "../styles/Home.css";
import { Link } from 'react-router-dom';

export default function HomePages() {
  const menu = [
    {
      title: "經典浪漫婚禮",
      description: "精緻佈置 + 現場主持 + 客製流程設計",
      price: "$39,800",
    },
    {
      title: "海島夢幻婚禮",
      description: "海外場地 + 專屬攝影 + 海灘儀式",
      price: "$89,000",
    },
    {
      title: "簡約質感婚禮",
      description: "都會場地 + 時尚布景 + 簡約儀式",
      price: "$28,800",
    },
  ];

  return (
    <div className="wedding-container">


      <main className="main-content">
        <section className="hero-section">
          <h2 className="hero-title">
            用愛打造屬於你的夢想婚禮
          </h2>
          <p className="hero-subtitle">
            精心設計每一場婚禮，只為你的幸福時刻
          </p>
        </section>

        <section className="menu-section">
          {menu.map((item, index) => (
            <div key={index} className="menu-card">
              <h3 className="menu-title">{item.title}</h3>
              <p className="menu-desc">{item.description}</p>
              <p className="menu-price">{item.price}</p>
              <button className="add-button">加入購物車</button>
            </div>
          ))}
        </section>
      </main>


    </div>
  );
}

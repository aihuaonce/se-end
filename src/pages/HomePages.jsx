import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // 加入這行
import "../styles/Home.css";

export default function HomePages() {
  const [project, setProject] = useState([]);
  const navigate = useNavigate(); // 初始化 useNavigate

  useEffect(() => {
    fetch("http://localhost:5713/api/project")
      .then((res) => {
        if (!res.ok) {
          throw new Error("資料載入失敗");
        }
        return res.json();
      })
      .then((data) => {
        setProject(data);
      })
      .catch((err) => {
        console.error("取得資料失敗:", err);
        alert("無法載入婚禮專案資料，請稍後再試");
      });
  }, []);


  const handleSelect = (index) => {
    const selectedProject = project[index];
    navigate(`/create-project/${selectedProject.plan_id}`);
  };

  return (
    <div className="home-page-content">
      <section className="hero-section">
        <h2 className="hero-title">用愛打造屬於你的夢想婚禮</h2>
        <p className="hero-subtitle">精心設計每一場婚禮，只為你的幸福時刻</p>
      </section>

      <section className="menu-section">
        {project.length === 0 ? (
          <p>正在載入專案...</p>
        ) : (
          project.map((item, index) => (
            <div key={item.plan_id || index} className="menu-card">
              <h3 className="menu-title">{item.project_name}</h3>
              <p className="menu-desc">{item.plan_description}</p>
              <p className="menu-price">${item.price}</p>
              <button className="add-button" onClick={() => handleSelect(index)}>
                選擇專案
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

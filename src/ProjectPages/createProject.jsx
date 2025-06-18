import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/createProject.css";

export default function CreateProject() {
  const { plan_id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    client_name: "",
    wedding_date: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5713/api/fullcreate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: formData.client_name,
          wedding_date: formData.wedding_date,
          plan_id: parseInt(plan_id),
        }),
      });

      if (!response.ok) throw new Error("建立專案失敗");

      const data = await response.json();
      const project_id = data.project_id;

      alert("專案建立成功！");
      navigate("/"); // 或 navigate(`/project/${project_id}`) 如果你有該頁面
    } catch (err) {
      console.error(err);
      alert("建立失敗：" + err.message);
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">建立婚禮專案</h2>
      <form onSubmit={handleSubmit} className="project-form">
        <fieldset>
          <legend>基本資料</legend>
          <div className="form-group">
            <input
              name="client_name"
              placeholder="主要聯絡人"
              onChange={handleChange}
              required
            />
            <input
              name="wedding_date"
              type="date"
              onChange={handleChange}
              required
            />
          </div>
        </fieldset>

        <button type="submit" className="submit-button">建立專案</button>
      </form>
    </div>
  );
}

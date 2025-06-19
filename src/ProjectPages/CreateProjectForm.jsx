// src/pages/CreateProjectForm.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/CreateProjectForm.css'; // 你可以創建這個 CSS 文件來美化表單

const CreateProjectForm = () => {
  const { planId } = useParams(); // 從 URL 獲取 planId
  const navigate = useNavigate();

  // 表單狀態，初始化時帶入 planId
  const [formData, setFormData] = useState({
    client_name: '',
    wedding_date: '',
    plan_id: planId || '', // 自動帶入 planId
    groom_name: '',
    bride_name: '',
    phone_num: '',
    wedding_place: '',
    wedding_style: '', // 注意: 你的 project_details 表中 wedding_style 是 INT，這裡需要考慮如何映射或轉換
    // budget_id 不需要在這裡填寫，因為它是 project_budgets 表的 PK，通常是自動生成或在建立專案後再連結
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 如果 planId 透過 URL 改變，更新表單狀態
  useEffect(() => {
    if (planId) {
      setFormData(prev => ({ ...prev, plan_id: planId }));
    }
  }, [planId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 確保日期格式正確，例如 'YYYY-MM-DD'
      const formattedWeddingDate = formData.wedding_date; // 如果你的日期選擇器輸出就是 YYYY-MM-DD，則無需額外處理

      const res = await fetch('http://localhost:5713/api/projects/new', { // 發送到新的後端 API
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_name: formData.client_name,
          wedding_date: formattedWeddingDate,
          plan_id: parseInt(formData.plan_id), // 確保 plan_id 是數字
          groom_name: formData.groom_name,
          bride_name: formData.bride_name,
          phone_num: formData.phone_num ? parseInt(formData.phone_num) : null, // 電話號碼可能是數字
          wedding_place: formData.wedding_place,
          wedding_style: formData.wedding_style, // 假設這裡的 value 能直接對應到資料庫的 INT
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || '新增專案失敗');
      }

      const result = await res.json();
      alert('🎉 專案新增成功！');
      navigate(`/projects/${result.project_id}`); // 導向新建立的專案詳情頁
    } catch (err) {
      console.error('新增專案錯誤:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-project-container">
      <h2>新增婚禮專案</h2>
      <form onSubmit={handleSubmit} className="project-form">
        <div className="form-group">
          <label htmlFor="plan_id">選定套餐 ID:</label>
          <input
            type="text"
            id="plan_id"
            name="plan_id"
            value={formData.plan_id}
            readOnly // 讓這個欄位不能被手動修改
            className="form-control readonly"
          />
        </div>

        <div className="form-group">
          <label htmlFor="client_name">主要聯絡人:</label>
          <input
            type="text"
            id="client_name"
            name="client_name"
            value={formData.client_name}
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label htmlFor="wedding_date">婚禮日期:</label>
          <input
            type="date"
            id="wedding_date"
            name="wedding_date"
            value={formData.wedding_date}
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label htmlFor="groom_name">新郎姓名:</label>
          <input
            type="text"
            id="groom_name"
            name="groom_name"
            value={formData.groom_name}
            onChange={handleChange}
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label htmlFor="bride_name">新娘姓名:</label>
          <input
            type="text"
            id="bride_name"
            name="bride_name"
            value={formData.bride_name}
            onChange={handleChange}
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone_num">聯絡電話:</label>
          <input
            type="tel" // 使用 tel 類型，但後端仍可能需要轉換為 INT
            id="phone_num"
            name="phone_num"
            value={formData.phone_num}
            onChange={handleChange}
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label htmlFor="wedding_place">婚禮地點:</label>
          <input
            type="text"
            id="wedding_place"
            name="wedding_place"
            value={formData.wedding_place}
            onChange={handleChange}
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label htmlFor="wedding_style">婚禮風格:</label>
          {/* 這裡你可以用下拉選單來對應你的 wedding_styles 表或直接輸入 INT */}
          <input
            type="number" // 假設直接輸入對應的 INT ID
            id="wedding_style"
            name="wedding_style"
            value={formData.wedding_style}
            onChange={handleChange}
            className="form-control"
            placeholder="請輸入風格ID (數字)"
          />
        </div>

        {error && <p className="error-message">{error}</p>}

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? '送出中...' : '建立新專案'}
        </button>
        <button type="button" onClick={() => navigate(-1)} className="back-button">
          返回
        </button>
      </form>
    </div>
  );
};

export default CreateProjectForm;
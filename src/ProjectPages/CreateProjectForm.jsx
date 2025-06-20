import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/CreateProjectForm.css'; // 你可以創建這個 CSS 文件來美化表單

const CreateProjectForm = () => {
  const { planId } = useParams(); // 從 URL 獲取 planId
  const navigate = useNavigate();

  // 表單狀態，初始化時帶入 planId
  const [formData, setFormData] = useState({
    wedding_date: '',
    plan_id: planId || '', // 自動帶入 planId
    groom_name: '',
    bride_name: '',
    email: '', // 修正：改為正確的字段名
    phone: '', // 修正：改為後端期望的字段名
    wedding_place: '',
    contact_person: '',
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
      const formattedWeddingDate = formData.wedding_date;

      const res = await fetch('http://localhost:5713/api/projects/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // 修正：使用正確的字段名對應後端期望
          contact_person: formData.contact_person, // 保留聯絡人字段
          groom_name: formData.groom_name,
          bride_name: formData.bride_name,
          email: formData.email, // 現在會正確發送
          phone: formData.phone, // 修正字段名
          wedding_date: formattedWeddingDate,
          plan_id: parseInt(formData.plan_id) || null,
          wedding_place: formData.wedding_place,
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
          <label htmlFor="contact_person">主要聯絡人:</label>
          <input
            type="text"
            id="contact_person"
            name="contact_person"
            value={formData.contact_person}
            onChange={handleChange}
            required
            className="form-control"
            placeholder="請輸入主要聯絡人姓名"
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
            required
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
            required
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">聯絡郵件:</label>
          <input
            type="email" // 修正：使用正確的 input type
            id="email"
            name="email" // 修正：使用正確的字段名
            value={formData.email}
            onChange={handleChange}
            required
            className="form-control"
            placeholder="請輸入電子郵件地址"
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">聯絡電話:</label>
          <input
            type="tel"
            id="phone"
            name="phone" // 修正：改為後端期望的字段名
            value={formData.phone}
            onChange={handleChange}
            required
            className="form-control"
            placeholder="請輸入聯絡電話"
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
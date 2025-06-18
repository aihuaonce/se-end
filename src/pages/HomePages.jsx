import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Home.css";

// 定義後端 API 的 URL
const API_URL = 'http://localhost:5713'; // 確保與後端伺服器端口一致

export default function HomePages() {
  // 狀態名稱從 project 改為 plans，更符合資料內容
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true); // 新增載入狀態
  const [error, setError] = useState(null);   // 新增錯誤狀態

  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => { // 異步獲取方案資料的函數
      setLoading(true); // 開始載入
      setError(null); // 清除先前的錯誤
      try {
        // 修改 fetch URL 指向後端新的 /api/plans 路由
        const res = await fetch(`${API_URL}/api/plans`);

        if (!res.ok) {
          // 嘗試讀取後端返回的錯誤訊息
          const errorBody = await res.json().catch(() => ({ message: '資料載入失敗' }));
          throw new Error(errorBody.message || `HTTP 錯誤：${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        setPlans(data); // 將獲取的方案資料設定到 state
      } catch (err) {
        console.error("取得資料失敗:", err);
        setError(`取得資料失敗: ${err.message}`); // 設定錯誤訊息
        // 如果希望在發生錯誤時彈窗，可以在這裡加 alert
        // alert("無法載入婚禮方案資料，請稍後再試");
      } finally {
        setLoading(false); // 結束載入
      }
    };

    fetchPlans(); // 在組件 mount 時執行 fetch 函數
  }, []); // 空的依賴陣列表示只在組件第一次渲染後執行

  const handleSelect = (index) => {
    // 從 plans 狀態中選擇方案
    const selectedPlan = plans[index];
    // 導航到創建專案頁面，並傳遞選定的方案 ID
    navigate(`/create-project/${selectedPlan.plan_id}`);
  };

  // 根據載入和錯誤狀態來渲染不同內容
  if (loading) {
      return (
        <div className="home-page-content">
            <p>正在載入方案...</p>
        </div>
      );
  }

  if (error) {
      return (
        <div className="home-page-content">
            <p className="text-red-500">錯誤: {error}</p>
        </div>
      );
  }


  return (
    <div className="home-page-content">
      <section className="hero-section">
        <h2 className="hero-title">用愛打造屬於你的夢想婚禮</h2>
        <p className="hero-subtitle">精心設計每一場婚禮，只為你的幸福時刻</p>
      </section>

      <section className="menu-section">
        {/* 檢查 plans 陣列是否為空 */}
        {plans.length === 0 ? (
          <p>目前沒有可選擇的方案。</p> 
        ) : (
          // 遍歷 plans 陣列，渲染每個方案卡片
          plans.map((item) => ( // 使用 item.plan_id 作為唯一的 key
            <div key={item.plan_id} className="menu-card"> {/* 使用 item.plan_id 作為 key */}
              <h3 className="menu-title">{item.plan_name}</h3> {/* 使用 plan_name */}
              <p className="menu-desc">{item.plan_description}</p>
              <p className="menu-price">${item.price}</p>
              {/* 點擊按鈕時，呼叫 handleSelect 並傳遞該方案在陣列中的索引 */}
              <button className="add-button" onClick={() => handleSelect(plans.indexOf(item))}>
                選擇方案 {/* 按鈕文字更明確 */}
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
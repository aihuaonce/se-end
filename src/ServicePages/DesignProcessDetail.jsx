import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiZap } from 'react-icons/fi'; // 引入更多圖標
import moment from 'moment';

function DesignProcessDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 偏好設定數據，用於前端表單和 AI 請求，也用於更新客戶資料庫
  const [preferenceData, setPreferenceData] = useState({
    zodiac: [], // 星座，可選多個
    blood: [],  // 血型，可選多個
    color: '',  // 顏色
    season: [], // 季節，可選多個
    belief: '', // 信仰／禁忌說明
    note: ''    // 偏好需求說明
  });

  const [activeModal, setActiveModal] = useState(null); // 控制模態框顯示
  const [isSavingPreferences, setIsSavingPreferences] = useState(false); // 儲存偏好狀態
  const [isGeneratingAI, setIsGeneratingAI] = useState(false); // AI 生成狀態
  const [notification, setNotification] = useState(null); // 通知訊息狀態
  const [aiResponseContent, setAIResponseContent] = useState(''); // AI 生成的內容

  const options = {
    zodiac: ['牡羊座', '金牛座', '雙子座', '巨蟹座', '獅子座', '處女座', '天秤座', '天蠍座', '射手座', '魔羯座', '水瓶座', '雙魚座'],
    blood: ['A型', 'B型', 'O型', 'AB型'],
    season: ['春', '夏', '秋', '冬']
  };

  // 通知訊息自動消失
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // 獲取客戶資料並初始化偏好設定
  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5713/customers/${id}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "未知錯誤" }));
        throw new Error(errorData.message || '找不到客戶資料');
      }
      const data = await res.json();
      setCustomer(data);

      // 初始化 preferenceData 從客戶資料庫中已有的數據
      setPreferenceData({
        zodiac: data.horoscope ? data.horoscope.split('、') : [], // 假設數據庫存儲為 "星座1、星座2"
        blood: data.blood_type ? data.blood_type.split('、') : [], // 假設數據庫存儲為 "血型1、血型2"
        color: data.favorite_color || '',
        season: data.favorite_season ? data.favorite_season.split('、') : [], // 假設數據庫存儲為 "季節1、季節2"
        belief: data.beliefs_description || '',
        note: data.needs_description || ''
      });

    } catch (err) {
      console.error("獲取客戶資料錯誤:", err);
      setError("無法載入客戶資料：" + err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  // 處理偏好選擇 (checkbox)
  const handlePreferenceChange = (category, value) => {
    setPreferenceData(prev => {
      const current = prev[category] || [];
      const isSelected = current.includes(value);

      let newValues;
      if (isSelected) {
        newValues = current.filter((item) => item !== value);
      } else if (current.length < 2) { // 限制最多選兩個
        newValues = [...current, value];
      } else {
        newValues = current; // 超過限制，不新增
        setNotification({ message: `此類別最多只能選擇兩個選項。`, type: "warning" });
      }
      return { ...prev, [category]: newValues };
    });
  };

  // 儲存客戶偏好到資料庫
  const handleSavePreferences = async () => {
    setIsSavingPreferences(true);
    setNotification(null); // 清除舊通知

    try {
      // 將 preferenceData 轉換為後端 API 期望的格式 (如果數據庫字段名不同)
      const dataToSave = {
        ...customer, // 保留其他客戶信息
        horoscope: preferenceData.zodiac.join('、'), // 將陣列轉換為字串儲存
        blood_type: preferenceData.blood.join('、'),
        favorite_color: preferenceData.color,
        favorite_season: preferenceData.season.join('、'),
        beliefs_description: preferenceData.belief,
        needs_description: preferenceData.note,
      };

      const res = await fetch(`http://localhost:5713/customers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSave)
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || '儲存失敗，請稍後再試');
      }

      setCustomer(result); // 更新客戶本地狀態
      setNotification({ message: '客戶偏好儲存成功！', type: 'success' });
    } catch (err) {
      console.error('儲存偏好錯誤:', err);
      setNotification({ message: err.message || '儲存客戶偏好失敗。', type: 'error' });
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // 呼叫 AI 生成流程
  const handleAIProcessGenerate = async () => {
    setIsGeneratingAI(true);
    setNotification(null); // 清除舊通知
    setAIResponseContent(''); // 清空舊的 AI 回應

    try {
      // 構建傳送給 AI 服務的數據，確保鍵名與後端 aiService.js 期望的一致
      const aiRequestData = {
        horoscope: preferenceData.zodiac.join('、'),
        bloodType: preferenceData.blood.join('、'),
        favoriteColor: preferenceData.color,
        favoriteSeason: preferenceData.season.join('、'),
        beliefsDescription: preferenceData.belief,
        needsDescription: preferenceData.note,
      };

      const res = await fetch(`http://localhost:5713/api/design-process/generate-flow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(aiRequestData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'AI 生成流程失敗，請稍後再試');
      }

      setAIResponseContent(data.result);
      setNotification({ message: 'AI 婚禮流程生成成功！', type: 'success' });

    } catch (err) {
      console.error('AI 流程生成錯誤:', err);
      setNotification({ message: err.message || 'AI 婚禮流程生成失敗。', type: 'error' });
      setAIResponseContent('無法生成流程：' + (err.message || '未知錯誤'));
    } finally {
      setIsGeneratingAI(false);
    }
  };


  if (loading) return <div className="flex justify-center items-center h-screen bg-gray-100"><p className="text-gray-600 text-xl">載入中...</p></div>;
  if (error) return <div className="flex justify-center items-center h-screen bg-gray-100"><p className="text-red-500 text-xl">錯誤：{error}</p></div>;
  if (!customer) return <div className="flex justify-center items-center h-screen bg-gray-100"><p className="text-gray-600 text-xl">查無此客戶。</p></div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 relative">
      {/* 通知訊息 */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-md text-white ${notification.type === 'success' ? 'bg-green-500' : notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}>
          {notification.message}
        </div>
      )}

      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-lg p-6 sm:p-8">
        <div className="flex justify-between items-center mb-6 border-b pb-4 border-slate-200">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-slate-600 hover:text-slate-800 transition-colors duration-200 text-sm sm:text-base"
          >
            <FiArrowLeft className="mr-1 sm:mr-2 text-xl" />
            <span className="font-medium">返回</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-700">流程設計</h1>
          {/* 儲存客戶偏好按鈕 */}
          <button
            onClick={handleSavePreferences}
            className="flex items-center bg-sky-700 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-md shadow hover:bg-sky-800 transition-colors duration-200 disabled:opacity-50 text-sm sm:text-base"
            disabled={isSavingPreferences}
          >
            <FiSave className="mr-1 sm:mr-2" />
            {isSavingPreferences ? '儲存中...' : '儲存客戶偏好'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6 text-gray-700">
          <p className="text-lg font-medium">
            新人姓名：{customer.groom_name} & {customer.bride_name}
          </p>
          <p>Email: {customer.email}</p>
          <p>電話: {customer.phone}</p>
          <p>婚禮日期: {customer.wedding_date ? moment(customer.wedding_date).format('YYYY-MM-DD HH:mm') : '未設定'}</p>
          <p>婚禮地點: {customer.wedding_location || '未設定'}</p>
          <p>Google 表單: {customer.form_link ? <a href={customer.form_link} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline break-all">連結</a> : '未提供'}</p>
          <p>狀態: <span className={`font-semibold ${customer.status === 'open' ? 'text-yellow-700' : 'text-green-700'}`}>{customer.status === 'open' ? '未結案' : '已結案'}</span></p>
        </div>

        <h2 className="text-[#CB8A90] text-xl font-semibold mb-3 border-t pt-4 mt-4 border-slate-200">傾向／嗜好：</h2>
        <div className="flex flex-wrap gap-3 mb-6">
          <button onClick={() => setActiveModal('zodiac')} className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 transition-colors">星座</button>
          <button onClick={() => setActiveModal('blood')} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors">血型</button>
          <button onClick={() => setActiveModal('color')} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">顏色</button>
          <button onClick={() => setActiveModal('season')} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors">季節</button>
        </div>

        <div className="mb-8 text-gray-700 space-y-2 text-lg">
          {preferenceData.zodiac.length > 0 && <p><strong>星座：</strong>{preferenceData.zodiac.join('、')}</p>}
          {preferenceData.blood.length > 0 && <p><strong>血型：</strong>{preferenceData.blood.join('、')}</p>}
          {preferenceData.color && <p><strong>顏色：</strong>{preferenceData.color}</p>}
          {preferenceData.season.length > 0 && <p><strong>季節：</strong>{preferenceData.season.join('、')}</p>}
        </div>

        {activeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
              <h2 className="text-2xl font-bold mb-4 text-slate-700">
                {activeModal === 'zodiac' && '請選擇星座（最多兩個）'}
                {activeModal === 'blood' && '請選擇血型（最多兩個）'}
                {activeModal === 'color' && '請輸入喜歡的顏色'}
                {activeModal === 'season' && '請選擇喜歡的季節（最多兩個）'}
              </h2>

              <div className="mb-6 space-y-2 max-h-60 overflow-y-auto">
                {activeModal === 'color' ? (
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="例如：奶茶色、白+金…"
                    value={preferenceData.color}
                    onChange={(e) =>
                      setPreferenceData({ ...preferenceData, color: e.target.value })
                    }
                  />
                ) : (
                  options[activeModal]?.map((option) => (
                    <label key={option} className="flex items-center cursor-pointer text-gray-700 hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5 text-sky-600 rounded mr-3"
                        checked={preferenceData[activeModal]?.includes(option)}
                        onChange={() => handlePreferenceChange(activeModal, option)}
                      />
                      <span className="text-lg">{option}</span>
                    </label>
                  ))
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setActiveModal(null)}
                  className="bg-gray-300 text-gray-800 px-5 py-2 rounded-md hover:bg-gray-400 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="bg-sky-600 text-white px-5 py-2 rounded-md hover:bg-sky-700 transition-colors"
                >
                  確定
                </button>
              </div>
            </div>
          </div>
        )}

        <h2 className="text-[#CB8A90] text-xl font-semibold mb-3">信仰 / 禁忌說明 (可空)：</h2>
        <div className="mb-6">
          <textarea
            className="w-full border border-gray-300 rounded p-3 resize-y focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-700"
            rows={4}
            placeholder="例如：不可碰酒、不能穿紅色、需安排宗教儀式…"
            value={preferenceData.belief}
            onChange={(e) =>
              setPreferenceData({ ...preferenceData, belief: e.target.value })
            }
          />
        </div>

        <h2 className="text-[#CB8A90] text-xl font-semibold mb-3">偏好 / 需求說明 (可空)：</h2>
        <div className="mb-8">
          <textarea
            className="w-full border border-gray-300 rounded p-3 resize-y focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-700"
            rows={4}
            placeholder="例如：希望浪漫風格、不要主持人、需要中英文雙語婚禮…"
            value={preferenceData.note}
            onChange={(e) =>
              setPreferenceData({ ...preferenceData, note: e.target.value })
            }
          />
        </div>

        {/* AI 一鍵生成流程 按鈕 */}
        <div className="text-center mt-6">
          <button
            className="bg-[#CB8A90] text-white px-8 py-3 rounded-md shadow-lg hover:bg-pink-500 transition-colors duration-200 text-lg font-bold disabled:opacity-50 flex items-center justify-center mx-auto"
            onClick={handleAIProcessGenerate}
            disabled={isGeneratingAI || isSavingPreferences}
          >
            <FiZap className="mr-2 text-xl" />
            {isGeneratingAI ? 'AI 正在生成流程...' : 'AI 一鍵生成流程'}
          </button>
        </div>

        {/* AI 回應顯示區 */}
        {aiResponseContent && (
          <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-lg shadow-inner">
            <h2 className="text-xl font-semibold text-slate-700 mb-4">AI 生成的婚禮流程：</h2>
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: aiResponseContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
            {/* 使用 dangerouslySetInnerHTML 來渲染 AI 回應中的 Markdown，並替換換行符 */}
          </div>
        )}
      </div>
    </div>
  );
}

export default DesignProcessDetail;
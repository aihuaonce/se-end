import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiZap, FiRefreshCw, FiEdit, FiTrash2, FiPlusCircle, FiXCircle } from 'react-icons/fi';
import moment from 'moment';

function DesignProcessDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [preferenceData, setPreferenceData] = useState({
    zodiac: [], blood: [], color: '', season: [], belief: '', note: ''
  });

  const [activeModal, setActiveModal] = useState(null);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [notification, setNotification] = useState(null);
  const [aiResponseTableData, setAIResponseTableData] = useState([]);
  const [hasSavedProcess, setHasSavedProcess] = useState(false);

  // --- [新增] 編輯模式相關 state ---
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState([]);
  const [isSavingProcess, setIsSavingProcess] = useState(false);

  const options = {
    zodiac: ['牡羊座', '金牛座', '雙子座', '巨蟹座', '獅子座', '處女座', '天秤座', '天蠍座', '射手座', '魔羯座', '水瓶座', '雙魚座'],
    blood: ['A型', 'B型', 'O型', 'AB型'],
    season: ['春', '夏', '秋', '冬']
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchSavedProcess = useCallback(async (coupleId) => {
    try {
      const res = await fetch(`http://localhost:5713/api/design-process/${coupleId}`);
      if (res.ok) {
        const result = await res.json();
        // 後端已解析JSON，直接設定
        setAIResponseTableData(result.data || []);
        setHasSavedProcess(true);
      } else {
        setHasSavedProcess(false);
        setAIResponseTableData([]);
      }
    } catch (err) {
      console.error("讀取已儲存的流程時發生網路錯誤:", err);
      setHasSavedProcess(false);
      setAIResponseTableData([]);
    }
  }, []);

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        const customerRes = await fetch(`http://localhost:5713/customers/${id}`);
        if (!customerRes.ok) throw new Error('找不到客戶資料');
        const customerData = await customerRes.json();
        setCustomer(customerData);
        
        setPreferenceData({
          zodiac: customerData.horoscope?.split('、').filter(item => item.trim() && item.trim() !== '未提供') || [],
          blood: customerData.blood_type?.split('、').filter(item => item.trim() && item.trim() !== '未提供') || [],
          color: (customerData.favorite_color?.trim() && customerData.favorite_color.trim() !== '未提供') ? customerData.favorite_color.trim() : '',
          season: customerData.favorite_season?.split('、').filter(item => item.trim() && item.trim() !== '未提供') || [],
          belief: (customerData.beliefs_description?.trim() && customerData.beliefs_description.trim() !== '無') ? customerData.beliefs_description.trim() : '',
          note: (customerData.needs_description?.trim() && customerData.needs_description.trim() !== '無') ? customerData.needs_description.trim() : ''
        });

        await fetchSavedProcess(id);
      } catch (err) {
        console.error("載入頁面資料錯誤:", err);
        setError("無法載入資料：" + err.message);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, [id, fetchSavedProcess]);

  const handlePreferenceChange = useCallback((category, value) => {
    setPreferenceData(prev => {
      const current = prev[category] || [];
      const isSelected = current.includes(value);
      let newValues;
      if (isSelected) {
        newValues = current.filter((item) => item !== value);
      } else if (current.length < 2) {
        newValues = [...current, value];
      } else {
        newValues = current;
        setNotification({ message: `此類別最多只能選擇兩個選項。`, type: "warning" });
      }
      return { ...prev, [category]: newValues };
    });
  }, []);

  const handleSavePreferences = async () => {
    setIsSavingPreferences(true);
    setNotification(null);
    try {
      const dataToSave = {
        ...customer,
        horoscope: preferenceData.zodiac.join('、') || '未提供',
        blood_type: preferenceData.blood.join('、') || '未提供',
        favorite_color: preferenceData.color.trim() || '未提供',
        favorite_season: preferenceData.season.join('、') || '未提供',
        beliefs_description: preferenceData.belief.trim() || '無',
        needs_description: preferenceData.note.trim() || '無',
      };
      const res = await fetch(`http://localhost:5713/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '儲存失敗');
      setCustomer(result);
      setNotification({ message: '客戶偏好儲存成功！', type: 'success' });
    } catch (err) {
      console.error('儲存偏好錯誤:', err);
      setNotification({ message: err.message, type: 'error' });
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const universalParser = useCallback((responseText) => {
    try {
      const startIndex = responseText.indexOf('[');
      const endIndex = responseText.lastIndexOf(']');
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const jsonString = responseText.substring(startIndex, endIndex + 1);
        const parsedData = JSON.parse(jsonString);
        if (Array.isArray(parsedData) && parsedData.length > 0 && '時間' in parsedData[0] && '事件' in parsedData[0] && '備註' in parsedData[0]) {
          return parsedData;
        }
      }
    } catch (e) { /* fallback */ }
    try {
      const codeBlockMatch = responseText.match(/```(?:\w+)?\n([\s\S]*?)```/);
      let contentToParse = codeBlockMatch ? codeBlockMatch[1].trim() : responseText;
      const lines = contentToParse.split('\n').map(line => line.trim()).filter(line => line && line.startsWith('|'));
      if (lines.length < 2) return null;
      const headerLine = lines[0];
      const headerCells = headerLine.split('|').map(h => h.trim()).filter(Boolean);
      const timeIndex = headerCells.findIndex(h => h.includes('時間'));
      const eventIndex = headerCells.findIndex(h => h.includes('事件') || h.includes('流程'));
      const noteIndex = headerCells.findIndex(h => h.includes('備註') || h.includes('建議') || h.includes('內容'));
      if (timeIndex === -1 || eventIndex === -1 || noteIndex === -1) { return null; }
      const dataRows = lines.slice(2);
      const parsedData = dataRows.map(row => {
        const cells = row.split('|').map(cell => cell.trim()).filter(Boolean);
        if (cells.length >= Math.max(timeIndex, eventIndex, noteIndex) + 1) {
          return {
            時間: cells[timeIndex] || '',
            事件: cells[eventIndex] || '',
            備註: cells[noteIndex] || '',
          };
        }
        return null;
      }).filter(Boolean);
      if (parsedData.length > 0) return parsedData;
    } catch (e) { /* fallback */ }
    console.error("所有解析策略均失敗。", { responseText });
    return null;
  }, []);

  const handleAIProcessGenerate = async () => {
    setIsGeneratingAI(true);
    setNotification(null);
    setAIResponseTableData([]);
    setIsEditing(false); // 如果正在編輯，先退出編輯模式
    try {
      const weddingDateTime = (customer && customer.wedding_date && customer.wedding_time)
        ? `${moment(customer.wedding_date).format('YYYY-MM-DD')} ${customer.wedding_time}`
        : '';

      const aiRequestData = {
        coupleId: id,
        weddingDateTime: weddingDateTime,
        horoscope: preferenceData.zodiac.join('、') || '未提供',
        bloodType: preferenceData.blood.join('、') || '未提供',
        favoriteColor: preferenceData.color.trim() || '未提供',
        favoriteSeason: preferenceData.season.join('、') || '未提供',
        beliefsDescription: preferenceData.belief.trim() || '無',
        needsDescription: preferenceData.note.trim() || '無',
      };

      const res = await fetch(`http://localhost:5713/api/design-process/generate-flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiRequestData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'AI 生成失敗');
      
      const parsedData = universalParser(data.result);
      if (parsedData && parsedData.length > 0) {
        setAIResponseTableData(parsedData);
        setHasSavedProcess(true);
        setNotification({ message: 'AI 婚禮流程生成並儲存成功！', type: 'success' });
      } else {
        setHasSavedProcess(false);
        setNotification({ message: 'AI 流程生成成功，但無法解析為有效的流程表。', type: 'warning' });
      }
    } catch (err) {
      console.error('AI 流程生成錯誤:', err);
      setNotification({ message: err.message, type: 'error' });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // --- [新增] 編輯相關的處理函式 ---

  // 進入/退出編輯模式
  const handleEditToggle = () => {
    if (!isEditing) {
      // 進入編輯模式時，深度複製一份資料來編輯，避免影響原始資料
      setEditableData(JSON.parse(JSON.stringify(aiResponseTableData)));
    }
    setIsEditing(!isEditing);
  };

  // 處理表格欄位的變更
  const handleRowChange = (index, field, value) => {
    const updatedData = [...editableData];
    updatedData[index][field] = value;
    setEditableData(updatedData);
  };

  // 新增一列
  const handleAddRow = () => {
    setEditableData([...editableData, { 時間: '', 事件: '', 備註: '' }]);
  };

  // 刪除一列
  const handleDeleteRow = (index) => {
    const updatedData = editableData.filter((_, i) => i !== index);
    setEditableData(updatedData);
  };

  // 儲存編輯後的流程
  const handleSaveChanges = async () => {
    setIsSavingProcess(true);
    setNotification(null);
    try {
        const res = await fetch(`http://localhost:5713/api/design-process/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ processData: editableData })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || '儲存失敗');

        // 儲存成功後，更新主資料、退出編輯模式
        setAIResponseTableData(editableData);
        setIsEditing(false);
        setNotification({ message: '流程儲存成功！', type: 'success' });
    } catch (err) {
        console.error('儲存流程錯誤:', err);
        setNotification({ message: `儲存失敗: ${err.message}`, type: 'error' });
    } finally {
        setIsSavingProcess(false);
    }
  };


  const renderMarkdown = (text) => {
    if (!text) return { __html: '' };
    const html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
    return { __html: html };
  };

  if (loading) return <div className="flex justify-center items-center h-screen bg-gray-100"><p className="text-gray-600 text-xl">載入中...</p></div>;
  if (error) return <div className="flex justify-center items-center h-screen bg-gray-100"><p className="text-red-500 text-xl">錯誤：{error}</p></div>;
  if (!customer) return <div className="flex justify-center items-center h-screen bg-gray-100"><p className="text-gray-600 text-xl">查無此客戶。</p></div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 relative">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-md text-white ${notification.type === 'success' ? 'bg-green-500' : notification.type === 'error' ? 'bg-red-500' : 'bg-orange-500'}`}>
          {notification.message}
        </div>
      )}
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-lg p-6 sm:p-8">
        <div className="flex justify-between items-center mb-6 border-b pb-4 border-slate-200">
          <button onClick={() => navigate(-1)} className="flex items-center text-slate-600 hover:text-slate-800 transition-colors duration-200 text-sm sm:text-base">
            <FiArrowLeft className="mr-1 sm:mr-2 text-xl" />
            <span className="font-medium">返回</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-700">流程設計</h1>
          <button onClick={handleSavePreferences} className="flex items-center bg-sky-700 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-md shadow hover:bg-sky-800 transition-colors duration-200 disabled:opacity-50 text-sm sm:text-base" disabled={isSavingPreferences || isEditing}>
            <FiSave className="mr-1 sm:mr-2" />
            {isSavingPreferences ? '儲存中...' : '儲存客戶偏好'}
          </button>
        </div>

        {/* --- 客戶資訊區塊 --- */}
        <div className="grid grid-cols-1 gap-4 mb-6 text-gray-700">
          <p className="text-lg font-medium">新人姓名：{customer.groom_name} & {customer.bride_name}</p>
          <p>Email: {customer.email}</p>
          <p>電話: {customer.phone}</p>
          <p>婚禮日期: {customer.wedding_date ? moment(customer.wedding_date).format('YYYY-MM-DD HH:mm') : '未設定'}</p>
          <p>婚禮地點: {customer.wedding_location || '未設定'}</p>
          <p>Google 表單: {customer.form_link ? <a href={customer.form_link} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline break-all">連結</a> : '未提供'}</p>
          <p>狀態: <span className={`font-semibold ${customer.status === 'open' ? 'text-yellow-700' : 'text-green-700'}`}>{customer.status === 'open' ? '未結案' : '已結案'}</span></p>
        </div>
        
        {/* --- 偏好設定區塊 --- */}
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
                {activeModal === 'color' ? (<input type="text" className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="例如：奶茶色、白+金…" value={preferenceData.color} onChange={(e) => setPreferenceData({ ...preferenceData, color: e.target.value })}/>) : (options[activeModal]?.map((option) => (<label key={option} className="flex items-center cursor-pointer text-gray-700 hover:bg-gray-50 p-2 rounded"><input type="checkbox" className="form-checkbox h-5 w-5 text-sky-600 rounded mr-3" checked={preferenceData[activeModal]?.includes(option)} onChange={() => handlePreferenceChange(activeModal, option)}/><span className="text-lg">{option}</span></label>)))}
              </div>
              <div className="flex justify-end space-x-3">
                <button onClick={() => setActiveModal(null)} className="bg-gray-300 text-gray-800 px-5 py-2 rounded-md hover:bg-gray-400 transition-colors">取消</button>
                <button onClick={() => setActiveModal(null)} className="bg-sky-600 text-white px-5 py-2 rounded-md hover:bg-sky-700 transition-colors">確定</button>
              </div>
            </div>
          </div>
        )}
        <h2 className="text-[#CB8A90] text-xl font-semibold mb-3">信仰 / 禁忌說明 (可空)：</h2>
        <div className="mb-6"><textarea className="w-full border border-gray-300 rounded p-3 resize-y focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-700" rows={4} placeholder="例如：不可碰酒、不能穿紅色、需安排宗教儀式…" value={preferenceData.belief} onChange={(e) => setPreferenceData({ ...preferenceData, belief: e.target.value })}/></div>
        <h2 className="text-[#CB8A90] text-xl font-semibold mb-3">偏好 / 需求說明 (可空)：</h2>
        <div className="mb-8"><textarea className="w-full border border-gray-300 rounded p-3 resize-y focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-700" rows={4} placeholder="例如：希望浪漫風格、不要主持人、需要中英文雙語婚禮…" value={preferenceData.note} onChange={(e) => setPreferenceData({ ...preferenceData, note: e.target.value })}/></div>
        
        {/* --- AI 生成按鈕 --- */}
        <div className="text-center mt-6">
          <button className="bg-[#CB8A90] text-white px-8 py-3 rounded-md shadow-lg hover:bg-pink-500 transition-colors duration-200 text-lg font-bold disabled:opacity-50 flex items-center justify-center mx-auto" onClick={handleAIProcessGenerate} disabled={isGeneratingAI || isSavingPreferences || isSavingProcess || isEditing}>
            {hasSavedProcess ? <FiRefreshCw className="mr-2 text-xl" /> : <FiZap className="mr-2 text-xl" />}
            {isGeneratingAI ? 'AI 正在生成...' : (hasSavedProcess ? '重新生成並覆蓋' : 'AI 一鍵生成流程')}
          </button>
        </div>

        {/* --- [修改] 流程顯示與編輯區塊 --- */}
        {(Array.isArray(aiResponseTableData) && aiResponseTableData.length > 0) && (
          <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-lg shadow-inner overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-700">
                {isEditing ? '編輯婚禮流程' : '婚禮流程'}
              </h2>
              {!isEditing ? (
                <button onClick={handleEditToggle} className="flex items-center text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors" disabled={isGeneratingAI}>
                  <FiEdit className="mr-1" /> 編輯
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                    <button onClick={handleSaveChanges} disabled={isSavingProcess} className="flex items-center text-sm bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50">
                      <FiSave className="mr-1" /> {isSavingProcess ? '儲存中...' : '儲存變更'}
                    </button>
                    <button onClick={handleEditToggle} disabled={isSavingProcess} className="flex items-center text-sm bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600 transition-colors">
                      <FiXCircle className="mr-1" /> 取消
                    </button>
                </div>
              )}
            </div>

            {/* 表格 */}
            <table className="min-w-full divide-y divide-slate-300 border border-slate-200">
              <thead className="bg-slate-200">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-sm font-semibold text-slate-700 w-1/5">時間</th>
                  <th scope="col" className="px-4 py-2 text-left text-sm font-semibold text-slate-700 w-2/5">事件</th>
                  <th scope="col" className="px-4 py-2 text-left text-sm font-semibold text-slate-700 w-2/5">備註</th>
                  {isEditing && <th scope="col" className="px-2 py-2 text-center text-sm font-semibold text-slate-700 w-[50px]">操作</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {isEditing ? (
                  // --- 編輯模式 ---
                  editableData.map((row, index) => (
                    <tr key={index}>
                      <td className="p-1 align-top"><textarea value={row.時間} onChange={(e) => handleRowChange(index, '時間', e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y" rows={3}/></td>
                      <td className="p-1 align-top"><textarea value={row.事件} onChange={(e) => handleRowChange(index, '事件', e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y" rows={3}/></td>
                      <td className="p-1 align-top"><textarea value={row.備註} onChange={(e) => handleRowChange(index, '備註', e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y" rows={3}/></td>
                      <td className="p-1 text-center align-middle">
                        <button onClick={() => handleDeleteRow(index)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 transition-colors">
                          <FiTrash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  // --- 檢視模式 ---
                  aiResponseTableData.map((row, index) => (
                    <tr key={index} className="hover:bg-slate-100">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-800" dangerouslySetInnerHTML={renderMarkdown(row.時間)} />
                      <td className="px-4 py-3 whitespace-normal text-sm text-slate-800" dangerouslySetInnerHTML={renderMarkdown(row.事件)} />
                      <td className="px-4 py-3 whitespace-normal text-sm text-slate-800" dangerouslySetInnerHTML={renderMarkdown(row.備註)} />
                    </tr>
                  ))
                )}
              </tbody>
            </table>
             {/* 新增按鈕 (僅在編輯模式顯示) */}
             {isEditing && (
                <div className="mt-4">
                    <button onClick={handleAddRow} className="flex items-center text-sm bg-sky-600 text-white px-3 py-1 rounded-md hover:bg-sky-700 transition-colors">
                        <FiPlusCircle className="mr-1" /> 新增一列
                    </button>
                </div>
            )}
          </div>
        )}
        
        {isGeneratingAI === false && aiResponseTableData.length === 0 && notification && notification.type === 'warning' && (
           <div className="mt-4 text-center text-orange-600 p-3 bg-orange-100 rounded-md">
             <p className="font-semibold">{notification.message}</p>
             <p className="text-sm text-gray-600 mt-1">請檢查瀏覽器開發者工具(Console)以獲取詳細錯誤訊息和 AI 原始回應。</p>
           </div>
        )}
      </div>
    </div>
  );
}

export default DesignProcessDetail;
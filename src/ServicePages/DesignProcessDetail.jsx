import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiZap } from 'react-icons/fi'; // 引入圖標
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

  const [activeModal, setActiveModal] = useState(null);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [notification, setNotification] = useState(null);
  const [aiResponseTableData, setAIResponseTableData] = useState(null); // 儲存解析後的 AI 表格數據

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
      const res = await fetch(`http://localhost:5713/customers/${id}`); // 確保這是你的後端 API 地址
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "未知錯誤" }));
        throw new Error(errorData.message || '找不到客戶資料');
      }
      const data = await res.json();
      setCustomer(data);

      // 初始化 preferenceData 從客戶資料庫中已有的數據
      // 新增 filter 處理，避免 "未提供" 或空字串被解析為有效選項
      setPreferenceData({
        zodiac: data.horoscope ? data.horoscope.split('、').filter(item => item.trim() !== '未提供' && item.trim() !== '') : [],
        blood: data.blood_type ? data.blood_type.split('、').filter(item => item.trim() !== '未提供' && item.trim() !== '') : [],
        color: data.favorite_color && data.favorite_color.trim() !== '' && data.favorite_color.trim() !== '未提供' ? data.favorite_color.trim() : '',
        season: data.favorite_season ? data.favorite_season.split('、').filter(item => item.trim() !== '未提供' && item.trim() !== '') : [],
        belief: data.beliefs_description && data.beliefs_description.trim() !== '' && data.beliefs_description.trim() !== '無' ? data.beliefs_description.trim() : '',
        note: data.needs_description && data.needs_description.trim() !== '' && data.needs_description.trim() !== '無' ? data.needs_description.trim() : ''
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
  const handlePreferenceChange = useCallback((category, value) => {
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
  }, []);

  // 儲存客戶偏好到資料庫
  const handleSavePreferences = async () => {
    setIsSavingPreferences(true);
    setNotification(null); // 清除舊通知

    try {
      // 將 preferenceData 轉換為後端 API 期望的格式 (將陣列轉換為字串儲存)
      // 並確保空值轉換為 '未提供' 或 '無' 以符合 getValueOrFallback
      const dataToSave = {
        ...customer, // 保留其他客戶信息
        horoscope: preferenceData.zodiac.length > 0 ? preferenceData.zodiac.join('、') : '未提供',
        blood_type: preferenceData.blood.length > 0 ? preferenceData.blood.join('、') : '未提供',
        favorite_color: preferenceData.color.trim() !== '' ? preferenceData.color.trim() : '未提供',
        favorite_season: preferenceData.season.length > 0 ? preferenceData.season.join('、') : '未提供',
        beliefs_description: preferenceData.belief.trim() !== '' ? preferenceData.belief.trim() : '無',
        needs_description: preferenceData.note.trim() !== '' ? preferenceData.note.trim() : '無',
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

  /**
   * 解析 AI 返回的 Markdown 表格字符串為 JavaScript 物件陣列。
   * 這裡會首先嘗試從 Markdown 程式碼區塊中提取內容。
   * @param {string} markdownContent - 包含 Markdown 表格的字串。
   * @returns {Array<{時間: string, 事件: string, 備註: string}> | null} 解析後的數據，如果格式不正確則返回 null。
   */
  const parseMarkdownTable = useCallback((markdownContent) => {
    // Step 1: Try to extract content from a Markdown code block
    // 這裡嘗試匹配 ```（後面可選跟著語言名如markdown）開頭的程式碼區塊，並提取其內容
    // [\s\S]*? 匹配所有字符（包括換行符），非貪婪模式
    const codeBlockMatch = markdownContent.match(/```(?:\w+)?\n([\s\S]*?)```/);
    let contentToParse = markdownContent; // 預設為整個回應

    if (codeBlockMatch && codeBlockMatch[1]) {
        contentToParse = codeBlockMatch[1].trim(); // 提取並去除首尾空白
        console.log("從 Markdown 程式碼區塊中提取內容成功。");
    } else {
        console.warn("未在 AI 回應中找到預期的 Markdown 程式碼區塊。嘗試直接解析整個內容。");
        // 如果沒有找到程式碼區塊，則嘗試解析整個回應，但會觸發後續的格式檢查
    }

    const lines = contentToParse.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Step 2: Find the header line and separator line within the extracted content
    let headerLineIndex = -1;
    let separatorLineIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        // 尋找包含三個特定列名的表頭行，且確保是有效的表格分隔線格式
        if (lines[i].startsWith('|') && 
            lines[i].includes('時間') && 
            lines[i].includes('事件') && 
            lines[i].includes('建議／備註')) {
            // 檢查下一行是否是表格分隔線
            if (i + 1 < lines.length && lines[i+1].match(/^\|-+\|-+\|-+\|$/)) {
                 headerLineIndex = i;
                 separatorLineIndex = i + 1;
                 break; // 找到第一個表頭和分隔線就停止
            }
        }
    }

    if (headerLineIndex === -1 || separatorLineIndex === -1) {
        console.warn("在提取的內容中未找到有效的 Markdown 表格格式（表頭或分隔線缺失）。內容片段：", contentToParse.substring(0, 200) + '...');
        return null; // 沒有找到有效的表頭或分隔線
    }

    // 提取數據行 (從分隔線的下一行開始)
    const dataRows = lines.slice(separatorLineIndex + 1);

    const parsedData = dataRows.map(row => {
      // 移除首尾的 '|' 並分割，然後過濾掉因 split 產生空字串（如果行是 "|val1|val2|"）
      const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
      if (cells.length === 3) { // 確保有三個欄位
        return {
          時間: cells[0],
          事件: cells[1],
          備註: cells[2]
        };
      }
      console.warn("跳過格式不正確的表格行 (欄位數量不對):", row);
      return null; // 格式不正確的行
    }).filter(Boolean); // 過濾掉所有 null 值

    if (parsedData.length === 0) {
        console.warn("成功提取並解析 Markdown 表格，但表格中沒有數據行。");
        // 這裡可以選擇返回 [] 而不是 null，如果希望顯示一個空表格而不是 "無法解析" 提示
        return null; 
    }

    return parsedData;
  }, []);


  // 呼叫 AI 生成流程
  const handleAIProcessGenerate = async () => {
    setIsGeneratingAI(true);
    setNotification(null); // 清除舊通知
    setAIResponseTableData(null); // 清空舊的 AI 表格數據

    try {
      // 構建傳送給 AI 服務的數據，確保鍵名與後端 designProcess.js 期望的一致
      // 同樣將空值轉換為後端 Prompt 中 getValueOrFallback 預期的值
      const aiRequestData = {
        horoscope: preferenceData.zodiac.length > 0 ? preferenceData.zodiac.join('、') : '未提供',
        bloodType: preferenceData.blood.length > 0 ? preferenceData.blood.join('、') : '未提供',
        favoriteColor: preferenceData.color.trim() !== '' ? preferenceData.color.trim() : '未提供',
        favoriteSeason: preferenceData.season.length > 0 ? preferenceData.season.join('、') : '未提供',
        beliefsDescription: preferenceData.belief.trim() !== '' ? preferenceData.belief.trim() : '無',
        needsDescription: preferenceData.note.trim() !== '' ? preferenceData.note.trim() : '無',
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

      // 嘗試解析 AI 返回的 Markdown 表格
      const parsedTable = parseMarkdownTable(data.result);
      if (parsedTable && parsedTable.length > 0) { // 確保解析出數據且不為空
        setAIResponseTableData(parsedTable);
        setNotification({ message: 'AI 婚禮流程生成成功！', type: 'success' });
      } else {
        // 如果無法解析為表格或表格為空，顯示警告
        setAIResponseTableData(null); // 確保不顯示錯誤的表格
        console.warn("AI 返回的內容無法解析為表格或表格為空:", data.result);
      }

    } catch (err) {
      console.error('AI 流程生成錯誤:', err);
      setNotification({ message: err.message || 'AI 婚禮流程生成失敗。', type: 'error' });
      setAIResponseTableData(null); // 清空數據，確保錯誤時不顯示舊表格
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

        {/* AI 回應顯示區 - 渲染為表格 */}
        {aiResponseTableData && aiResponseTableData.length > 0 && (
          <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-lg shadow-inner overflow-x-auto">
            <h2 className="text-xl font-semibold text-slate-700 mb-4">AI 生成的婚禮流程：</h2>
            <table className="min-w-full divide-y divide-slate-300 border border-slate-200">
              <thead className="bg-slate-200">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-sm font-semibold text-slate-700">時間</th>
                  <th scope="col" className="px-4 py-2 text-left text-sm font-semibold text-slate-700">事件</th>
                  <th scope="col" className="px-4 py-2 text-left text-sm font-semibold text-slate-700">建議／備註</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {aiResponseTableData.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-100">
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-800">{row.時間}</td>
                    <td className="px-4 py-2 whitespace-normal text-sm text-slate-800">{row.事件}</td>
                    {/* 這裡可以將備註中的 Markdown 簡單處理，例如加粗，換行符 */}
                    <td 
                      className="px-4 py-2 whitespace-normal text-sm text-slate-800"
                      dangerouslySetInnerHTML={{ __html: row.備註.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* 如果 AI 回應解析失敗，但有原始內容，可以考慮顯示原始內容或提示 */}
        {isGeneratingAI === false && aiResponseTableData === null && notification && notification.type === 'warning' && (
           <div className="mt-4 text-center text-red-600">
             {notification.message}
             <p className="text-sm text-gray-500 mt-2">AI 生成成功，但流程表格式異常。請檢查控制台錯誤或嘗試調整輸入，讓 AI 能更精準理解您的要求。</p>
           </div>
        )}
      </div>
    </div>
  );
}

export default DesignProcessDetail;
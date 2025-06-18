import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiZap, FiRefreshCw, FiEdit, FiTrash2, FiPlusCircle, FiXCircle } from 'react-icons/fi';
import moment from 'moment'; // 用於日期格式化和驗證
import validator from 'validator'; // 用於驗證 Email 或 URL

// 後端 API 的基礎 URL
const API_BASE_URL = 'http://localhost:5713';

// 偏好選擇下拉框的選項 (保持不變)
const options = {
    zodiac: ['牡羊座', '金牛座', '雙子座', '巨蟹座', '獅子座', '處女座', '天秤座', '天蠍座', '射手座', '魔羯座', '水瓶座', '雙魚座'],
    blood: ['A型', 'B型', 'O型', 'AB型'],
    season: ['春', '夏', '秋', '冬']
};


function DesignProcessDetail() {
    // 從 URL 參數獲取 ID，這個 ID 對應到新的 project_id
    const { id } = useParams(); 
    const navigate = useNavigate();

    // customer 狀態將儲存從 GET /customers/:id 獲取的專案和情侶合併數據
    const [customer, setCustomer] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 偏好設定狀態，對應 project_couple_details 表的相關欄位
    const [preferenceData, setPreferenceData] = useState({
        zodiac: [], // 對應 horoscope (字串 '牡羊座、金牛座')
        blood: [],  // 對應 blood_type (字串 'A型、B型')
        color: '',  // 對應 favorite_color (字串)
        season: [], // 對應 favorite_season (字串 '春、夏')
        belief: '', // 對應 beliefs_description (字串)
        note: ''    // 對應 needs_description (字串)
    });

    const [activeModal, setActiveModal] = useState(null); // 控制偏好選擇 Modal
    const [isSavingPreferences, setIsSavingPreferences] = useState(false); // 儲存偏好狀態
    const [isGeneratingAI, setIsGeneratingAI] = useState(false); // AI 生成狀態
    const [notification, setNotification] = useState(null); // 提示訊息狀態

    // AI 生成的流程數據狀態 (儲存 universalParser 解析後的 JSON 陣列)
    const [aiResponseTableData, setAIResponseTableData] = useState([]); 
    const [hasSavedProcess, setHasSavedProcess] = useState(false); // 是否有已儲存的流程

    // --- 編輯模式相關 state ---
    const [isEditing, setIsEditing] = useState(false); // 是否處於編輯模式
    // 編輯時使用的流程數據 (總是 JSON 陣列)
    const [editableData, setEditableData] = useState([]); 
    const [isSavingProcess, setIsSavingProcess] = useState(false); // 儲存流程狀態


    // 使用 useEffect 來自動隱藏提示訊息
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer); // 在 notification 改變或元件卸載時清除 timer
        }
    }, [notification]);

     // Helper function to get value or fallback (extracted for reuse)
     function getValueOrFallback(value, fallbackText) {
         // 檢查值是否是有效的字串，否則返回 fallbackText
         return (value != null && typeof value === 'string' && value.trim() !== '') ? value.trim() : fallbackText;
     }


    // --- 流程 JSON 解析器 ---
    // 這個解析器應能處理後端返回的原始字串 (可能包含 JSON, Markdown, Markdown 表格等)
    const universalParser = useCallback((responseText) => {
        if (!responseText || typeof responseText !== 'string') {
             console.warn("Parser: 輸入不是有效的字串。", responseText);
             return null; // 返回 null 表示解析失敗
        }

        // 嘗試作為純 JSON 陣列解析
        try {
            const parsed = JSON.parse(responseText);
             // 驗證是否為符合預期格式的陣列 (每個物件有 時間, 事件, 備註 鍵)
            if (Array.isArray(parsed) && parsed.length > 0 && 
                parsed.every(item => typeof item === 'object' && item !== null && 
                                     '時間' in item && '事件' in item && '備註' in item)) {
                console.log("Parser: 成功解析為純 JSON 陣列");
                return parsed;
            }
        } catch (e) { /* 不是純 JSON，繼續嘗試 */ }

        // 嘗試解析 Markdown 代碼塊內的 JSON
        try {
            const codeBlockMatch = responseText.match(/```(?:\w+)?\n([\s\S]*?)```/);
            if (codeBlockMatch && codeBlockMatch[1]) {
                const jsonString = codeBlockMatch[1].trim();
                const parsed = JSON.parse(jsonString);
                if (Array.isArray(parsed) && parsed.length > 0 && 
                    parsed.every(item => typeof item === 'object' && item !== null && 
                                         '時間' in item && '事件' in item && '備註' in item)) {
                    console.log("Parser: 成功解析 Markdown 代碼塊內的 JSON");
                    return parsed;
                }
            }
        } catch (e) { /* Markdown 內不是有效 JSON，繼續嘗試 */ }

         // 嘗試解析 Markdown 表格格式
        try {
            const lines = responseText.split('\n').map(line => line.trim()).filter(line => line);
            const dataRows = [];
            let headerIndices = {};
            let isParsingTable = false;

            for (let i = 0; i < lines.length; i++) {
                 const line = lines[i];
                 if (line.startsWith('|') && line.endsWith('|')) {
                     const cells = line.split('|').map(c => c.trim()).filter(Boolean);
                     if (cells.length >= 3) { // 至少有時間、事件、備註三列
                         if (!isParsingTable) {
                             // 可能是表頭或分隔線
                             const lowerCaseCells = cells.map(c => c.toLowerCase());
                              // 檢測是否是表頭 (包含關鍵詞且至少有時間、事件、備註中的兩個)
                            if (lowerCaseCells.some(c => c.includes('時間')) && lowerCaseCells.some(c => c.includes('事件') || c.includes('流程')) && lowerCaseCells.some(c => c.includes('備註') || c.includes('內容') || c.includes('建議'))) {
                                 headerIndices = {
                                     時間: lowerCaseCells.findIndex(c => c.includes('時間')),
                                     事件: lowerCaseCells.findIndex(c => c.includes('事件') || c.includes('流程')),
                                     備註: lowerCaseCells.findIndex(c => c.includes('備註') || c.includes('內容') || c.includes('建議')),
                                 };
                                 // 確保所有必需的索引都找到
                                 if (headerIndices.時間 !== -1 && headerIndices.事件 !== -1 && headerIndices.備註 !== -1) {
                                     isParsingTable = true;
                                 } else {
                                     headerIndices = {}; // 找不到完整表頭，重置
                                 }

                            } else if (line.includes('---')) {
                                 // 分隔線，如果已經找到了表頭，跳過分隔線
                                 if(isParsingTable) continue;
                                 // 如果還沒找到表頭，這可能是無表頭表格的分隔線，暫不處理這種複雜情況
                            } 
                            // 如果找到表頭或分隔線，跳過這一行
                             if (isParsingTable || line.includes('---')) {
                                 continue;
                            }
                         } 

                         // 數據行處理 (不論是從表頭下方開始，還是從找到分隔線下方開始)
                         if (isParsingTable && Object.keys(headerIndices).length > 0) {
                              // 確保有足夠的單元格數量
                              const maxIndex = Math.max(headerIndices.時間, headerIndices.事件, headerIndices.備註);
                             if (cells.length > maxIndex) {
                                 dataRows.push({
                                     時間: cells[headerIndices.時間] || '',
                                     事件: cells[headerIndices.事件] || '',
                                     備註: cells[headerIndices.備註] || '',
                                 });
                             } else {
                                  // 如果單元格數量不足，記錄警告並跳過此行
                                  console.warn(`Parser: Markdown 表格行欄位不足 (行 ${i+1}):`, cells);
                             }
                         }
                     }
                 } else if (isParsingTable) {
                      // 如果正在解析表格，遇到非表格行，則停止解析
                      break;
                 }
            }
            
            if (dataRows.length > 0) {
                console.log("Parser: 成功解析 Markdown 表格");
                return dataRows;
            }

        } catch (e) {
            console.error("Parser: 解析 Markdown 表格錯誤:", e);
             /* 解析 Markdown 表格失敗 */ 
        }


        // 如果所有解析策略都失敗
        console.warn("Parser: 所有解析策略均失敗。", { responseText });
        // 在這裡設置一個警告通知，提示用戶手動編輯或重新生成
        setNotification({ message: "無法自動解析 AI 生成的流程格式。您可以嘗試手動編輯。", type: "warning" });
        return null; // 返回 null 表示解析失敗
    }, [setNotification]); // 依賴 setNotification


    // --- 獨立函式用於讀取已儲存的 AI 流程數據 ---
    // coupleId 參數現在是 project_id
    const fetchSavedProcess = useCallback(async (projectId) => {
        if (!projectId || isNaN(parseInt(projectId))) {
            console.warn("無效的專案 ID，無法讀取已儲存流程");
            setAIResponseTableData([]);
            setHasSavedProcess(false);
            return;
        }
        try {
            // 呼叫後端 API 讀取已儲存流程 (URL 中的 ID 是 project_id)
            const res = await fetch(`${API_BASE_URL}/api/design-process/${projectId}`);
            
            if (res.ok) {
                const result = await res.json();
                 // 後端 GET 返回 { success: true, data: json_string }
                 // 使用 universalParser 處理後端返回的原始字串
                 const parsedData = universalParser(result.data); 

                 if (parsedData && Array.isArray(parsedData)) {
                     setAIResponseTableData(parsedData); // 設定解析後的陣列
                     setHasSavedProcess(true); // 標記為已儲存
                 } else {
                      // 如果解析失敗，設置為空陣列並標記為未儲存（雖然有數據但無法解析）
                     console.warn(`專案 ID ${projectId} 的已儲存流程無法解析。`);
                     setAIResponseTableData([]);
                      // 這裡不設置 hasSavedProcess 為 true，因為數據不可用
                      // 但可以考慮設置為某個特定狀態，表示"已儲存但格式錯誤"
                     setHasSavedProcess(false); // 或根據業務需求設置為 true
                     // 解析器內已經設置了警告通知
                 }
            } else if (res.status === 404) {
                 // 找不到流程是正常情況，清除數據和標誌
                 console.log(`專案 ID ${projectId} 尚未儲存流程 (404)。`);
                 setHasSavedProcess(false);
                 setAIResponseTableData([]);
            }
             else {
                // 其他 API 錯誤
                const errorData = await res.json().catch(() => ({ message: "未知錯誤" }));
                console.error(`讀取已儲存流程 API 錯誤 ${res.status}:`, errorData.message);
                setHasSavedProcess(false);
                setAIResponseTableData([]);
                setNotification({ message: `讀取已儲存流程失敗: ${errorData.message}`, type: "error" });
            }
        } catch (err) {
            console.error("讀取已儲存的流程時發生網路錯誤:", err);
            setHasSavedProcess(false);
            setAIResponseTableData([]);
            setNotification({ message: "讀取已儲存流程失敗。", type: "error" });
        }
    }, [id, universalParser]); // 依賴 project_id 和 universalParser 函式


    // --- 初始載入數據 Effect ---
    useEffect(() => {
        const loadAllData = async () => {
            setLoading(true);
            setError(null);
            // 確保 ID 是有效的，避免發送無效請求
            if (!id || isNaN(parseInt(id))) {
                 setError("無效的專案 ID。");
                 setLoading(false);
                 setCustomer(null);
                 setAIResponseTableData([]);
                 setHasSavedProcess(false);
                 return;
            }

            try {
                // 呼叫後端 API 獲取專案和情侶資料 (URL 中的 ID 是 project_id)
                // 後端 GET /customers/:id 已修改為返回 project_couple_details 的偏好欄位
                const customerRes = await fetch(`${API_BASE_URL}/customers/${id}`); 
                if (!customerRes.ok) {
                     if (customerRes.status === 404) {
                        throw new Error("找不到專案資料"); // 修改訊息
                    }
                     const errorData = await customerRes.json().catch(() => ({ message: "未知錯誤" }));
                    throw new Error(`抓取專案資料 API 請求失敗 ${customerRes.status}: ${errorData.message}`);
                }
                const customerData = await customerRes.json();
                 // 將後端返回的數據設置到 customer 狀態
                 // 期望 customerData 包含 project_id(別名id), groom_name, bride_name, email, phone, wedding_date, wedding_time, wedding_location(別名wedding_place), google_sheet_link, status(映射新狀態), horoscope, blood_type, favorite_color, favorite_season, beliefs_description, needs_description
                setCustomer(customerData); 
                
                // 初始化 preferenceData 狀態，從 customerData 中讀取偏好字段
                // 注意：後端返回的字段名應該是資料庫中的實際字段名 (horoscope, blood_type等)
                setPreferenceData({
                    zodiac: getValueOrFallback(customerData.horoscope, '').split('、').filter(item => item.trim() && item.trim() !== '未提供'),
                    blood: getValueOrFallback(customerData.blood_type, '').split('、').filter(item => item.trim() && item.trim() !== '未提供'),
                    color: getValueOrFallback(customerData.favorite_color, ''),
                    season: getValueOrFallback(customerData.favorite_season, '').split('、').filter(item => item.trim() && item.trim() !== '未提供'),
                    belief: getValueOrFallback(customerData.beliefs_description, '').replace('無特殊禁忌', '').trim(), // 移除默認值並清理
                    note: getValueOrFallback(customerData.needs_description, '').replace('希望整體流程溫馨、浪漫，並有與賓客的良好互動。', '').trim() // 移除默認值並清理
                });

                // 讀取已儲存的 AI 流程
                await fetchSavedProcess(id); 

            } catch (err) {
                console.error("載入頁面資料錯誤:", err);
                setError("無法載入資料：" + err.message);
                setCustomer(null);
                setAIResponseTableData([]);
                setHasSavedProcess(false);
            } finally {
                setLoading(false);
            }
        };
        loadAllData();
    }, [id, fetchSavedProcess]); // 依賴 project_id 和 fetchSavedProcess 函式


    // --- 偏好選擇 Modal 的處理函式 ---
    const handlePreferenceChange = useCallback((category, value) => {
        setPreferenceData(prev => {
            const current = prev[category] || [];
            const isSelected = current.includes(value);
            let newValues;
            if (isSelected) {
                newValues = current.filter((item) => item !== value);
            } else if (Array.isArray(current) && current.length < 2) { // 大多數字典允許最多兩個選擇
                newValues = [...current, value];
            } else {
                // 如果已達到上限，且點擊的不是已選中的項目
                if (Array.isArray(current) && current.length >= 2 && !isSelected) {
                   setNotification({ message: `此類別最多只能選擇兩個選項。`, type: "warning" });
                }
                newValues = current; // 不改變已選中的值
            }
            // 對陣列進行排序，確保順序一致
            if (Array.isArray(newValues)) {
                newValues.sort(); 
            }
            return { ...prev, [category]: newValues };
        });
    }, [setNotification]); // 依賴 setNotification


    // --- 儲存客戶偏好設定 ---
    const handleSavePreferences = async () => {
        setIsSavingPreferences(true);
        setNotification(null);

         if (!customer) {
             setNotification({ message: "找不到客戶資料，無法儲存偏好。", type: "error" });
             setIsSavingPreferences(false);
             return;
         }

        try {
            // 準備要發送給後端的數據，對應 project_couple_details 表的欄位
            // 包含所有編輯表單可能更新的字段 + 偏好設置
            // 後端 PUT /customers/:id 接口可以同時更新 wedding_projects 和 project_couple_details 的部分字段
            // 我們將所有可能相關的字段都傳送過去，即使它們在這個頁面沒有被修改
            const dataToSave = {
                 groom_name: customer.groom_name || '', // 從當前 customer 狀態獲取
                 bride_name: customer.bride_name || '',
                 email: customer.email || '',
                 phone: customer.phone || '',
                 // 從 customer 狀態獲取日期時間和連結，並確保格式正確
                 wedding_date: (customer.wedding_date && moment(customer.wedding_date).isValid()) ? moment(customer.wedding_date).format('YYYY-MM-DD') + (customer.wedding_time ? 'T' + moment(customer.wedding_time, 'HH:mm:ss').format('HH:mm') : '') : '', // datetime-local 格式
                 wedding_location: customer.wedding_location || '', // 對應 wedding_place
                 form_link: customer.google_sheet_link || '', // 對應 google_sheet_link


                // 偏好設定，轉換為後端期望的字串格式
                horoscope: preferenceData.zodiac.join('、') || '未提供',
                blood_type: preferenceData.blood.join('、') || '未提供',
                favorite_color: preferenceData.color.trim() || '未提供',
                favorite_season: preferenceData.season.join('、') || '未提供',
                beliefs_description: preferenceData.belief.trim() || '無',
                needs_description: preferenceData.note.trim() || '無',
            };
            console.log("儲存偏好發送數據:", dataToSave);

            // 呼叫後端 API 儲存偏好 (URL 中的 ID 是 project_id)
            const res = await fetch(`${API_BASE_URL}/customers/${id}`, { 
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSave)
            });

             let result;
             try {
                result = await res.json();
             } catch (jsonError) {
                 console.warn("儲存偏好響應無法解析為 JSON:", jsonError);
                 const textResponse = await res.text().catch(() => "未知響應");
                 throw new Error(`儲存偏好失敗 ${res.status}: ${textResponse}`);
             }

            if (!res.ok) {
                 console.error("儲存偏好 API 錯誤:", result.message || result);
                 throw new Error(result.message || `儲存失敗 (${res.status})`);
            }
             // 儲存成功後，重新抓取客戶資料以更新前端 customer 狀態
             // 這會自動更新頁面上顯示的偏好設定
            const customerRes = await fetch(`${API_BASE_URL}/customers/${id}`);
             if (customerRes.ok) {
                 const updatedCustomerData = await customerRes.json();
                 setCustomer(updatedCustomerData);
                  // 重新設置 preferenceData 以確保 UI 與更新後的數據同步 (處理可能存在的默認值)
                  // 這裡的邏輯應該與初始載入時設置 preferenceData 的邏輯一致
                setPreferenceData({
                    zodiac: getValueOrFallback(updatedCustomerData.horoscope, '').split('、').filter(item => item.trim() && item.trim() !== '未提供'),
                    blood: getValueOrFallback(updatedCustomerData.blood_type, '').split('、').filter(item => item.trim() && item.trim() !== '未提供'),
                    color: getValueOrFallback(updatedCustomerData.favorite_color, ''),
                    season: getValueOrFallback(updatedCustomerData.favorite_season, '').split('、').filter(item => item.trim() && item.trim() !== '未提供'),
                    belief: getValueOrFallback(updatedCustomerData.beliefs_description, '').replace('無特殊禁忌', '').trim(), 
                    note: getValueOrFallback(updatedCustomerData.needs_description, '').replace('希望整體流程溫馨、浪漫，並有與賓客的良好互動。', '').trim()
                });

             } else {
                 console.warn("重新抓取更新後客戶資料失敗");
             }


            setNotification({ message: result.message || '客戶偏好儲存成功！', type: 'success' });

        } catch (err) {
            console.error('儲存偏好錯誤:', err);
            setNotification({ message: `儲存偏好失敗: ${err.message}`, type: 'error' });
        } finally {
            setIsSavingPreferences(false);
        }
    };


    // --- AI 流程生成並儲存 ---
    const handleAIProcessGenerate = async () => {
        setIsGeneratingAI(true);
        setNotification(null);
        setAIResponseTableData([]); // 生成前清空舊數據
        setIsEditing(false); // 如果正在編輯，先退出編輯模式

        if (!customer) {
            setNotification({ message: "找不到客戶資料，無法生成流程。", type: "error" });
            setIsGeneratingAI(false);
            return;
        }

        try {
             // 從 customer 狀態中獲取婚禮日期時間和偏好數據，用於 AI Prompt
            const weddingDateTime = (customer.wedding_date && moment(customer.wedding_date).isValid())
                ? moment(customer.wedding_date).format('YYYY-MM-DD') + (customer.wedding_time && moment(customer.wedding_time, 'HH:mm:ss').isValid() ? ' ' + moment(customer.wedding_time, 'HH:mm:ss').format('HH:mm') : '')
                : '';

            // 準備發送給後端的 AI 生成請求數據
            const aiRequestData = {
                coupleId: id, // coupleId 在後端將被視為 project_id
                weddingDateTime: weddingDateTime, // 發送格式化後的日期時間字串
                // 從 preferenceData 狀態中獲取偏好設定
                horoscope: preferenceData.zodiac.join('、') || '未提供',
                bloodType: preferenceData.blood.join('、') || '未提供',
                favoriteColor: preferenceData.color.trim() || '未提供',
                favoriteSeason: preferenceData.season.join('、') || '未提供',
                beliefsDescription: preferenceData.belief.trim() || '無',
                needsDescription: preferenceData.note.trim() || '無',
            };
            console.log("發送給後端的 AI 生成請求數據:", aiRequestData);

            // 呼叫後端 API 生成並儲存流程 (URL 中的 ID 是 project_id)
            const res = await fetch(`${API_BASE_URL}/api/design-process/generate-flow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(aiRequestData)
            });
            
            // 嘗試解析後端響應，即使不是 OK 狀態
             let data;
             try {
                 data = await res.json();
             } catch (jsonError) {
                  console.warn("無法解析 AI 生成響應為 JSON:", jsonError);
                  // 如果不是 JSON，嘗試獲取原始文本作為錯誤訊息
                  const textResponse = await res.text().catch(() => "未知響應");
                  throw new Error(`AI 生成 API 請求失敗 ${res.status}: ${textResponse}`);
             }


            if (!res.ok) {
                // 後端返回非 2xx 狀態碼，拋出錯誤
                throw new Error(data.message || `AI 生成 API 請求失敗 ${res.status}`);
            }
            
             // 後端成功返回 { success: true, message: ..., result: aiResponseString }
            const parsedData = universalParser(data.result); // 使用解析器處理後端返回的原始字串

             if (parsedData && Array.isArray(parsedData) && parsedData.length > 0) {
                setAIResponseTableData(parsedData); // 設定解析後的數據到狀態
                setHasSavedProcess(true); // 標記為已儲存
                setNotification({ message: data.message || 'AI 婚禮流程生成並儲存成功！', type: 'success' });
            } else {
                 // 如果解析失敗或結果為空
                console.warn("AI 生成成功，但解析器無法解析結果:", data.result);
                setAIResponseTableData([]); // 清空數據
                 // 解析器內已經設置了警告通知
                 setHasSavedProcess(false); // 標記為未儲存 (或儲存了無法解析的)
                 // 可以選擇在這裡將原始 AI 回應儲存到某個狀態或日誌，以便調試解析器
                 // setRawAIResponse(data.result); 
            }

        } catch (err) {
            console.error('AI 流程生成錯誤:', err);
            setNotification({ message: `AI 生成失敗: ${err.message}`, type: 'error' });
            setAIResponseTableData([]); // 清空數據
            setHasSavedProcess(false); // 標記為未儲存
        } finally {
            setIsGeneratingAI(false);
        }
    };

    // --- 編輯相關的處理函式 ---

    // 進入/退出編輯模式
    const handleEditToggle = () => {
        if (!isEditing) {
             // 進入編輯模式時，確保 aiResponseTableData 是陣列，並深度複製一份資料到 editableData
             if (Array.isArray(aiResponseTableData)) {
                 setEditableData(JSON.parse(JSON.stringify(aiResponseTableData)));
             } else {
                 // 如果 aiResponseTableData 不是陣列，可能是解析失敗的原始字串
                 // 嘗試再次解析或提供一個空編輯數據
                 console.warn("嘗試進入編輯模式，但現有流程數據不是陣列。", aiResponseTableData);
                  const parsedAttempt = universalParser(aiResponseTableData);
                 if (parsedAttempt && Array.isArray(parsedAttempt)) {
                      setEditableData(JSON.parse(JSON.stringify(parsedAttempt)));
                 } else {
                     setEditableData([]); // 提供空編輯數據
                     setNotification({ message: "無法編輯流程，數據格式不正確。", type: "error" });
                     return; // 不進入編輯模式
                 }
             }
        }
        setIsEditing(!isEditing); // 切換編輯模式狀態
    };

    // 處理表格欄位的變更
    const handleRowChange = (index, field, value) => {
        const updatedData = [...editableData];
        // 確保 index 範圍有效且 field 存在
        if (index >= 0 && index < updatedData.length && field in updatedData[index]) {
             updatedData[index][field] = value;
             setEditableData(updatedData);
        } else {
             console.warn(`嘗試更新無效的行或字段: Index ${index}, Field ${field}`);
        }
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

        if (!id || isNaN(parseInt(id))) {
             setNotification({ message: "無效的專案 ID，無法儲存流程。", type: "error" });
             setIsSavingProcess(false);
             return;
        }

        // 簡單驗證 editableData 格式是否符合預期（陣列中的物件包含必要鍵）
         if (!Array.isArray(editableData) || editableData.some(row => !row || !('時間' in row) || !('事件' in row) || !('備註' in row))) {
             setNotification({ message: "流程數據格式不正確，無法儲存。", type: "error" });
             setIsSavingProcess(false);
             return;
         }


        try {
             // 呼叫後端 API 儲存編輯後的流程 (URL 中的 ID 是 project_id)
            const res = await fetch(`${API_BASE_URL}/api/design-process/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                // 發送編輯後的流程數據陣列
                body: JSON.stringify({ processData: editableData }) 
            });

             let result;
             try {
                result = await res.json();
             } catch (jsonError) {
                 console.warn("儲存流程響應無法解析為 JSON:", jsonError);
                 const textResponse = await res.text().catch(() => "未知響應");
                 throw new Error(`儲存失敗 ${res.status}: ${textResponse}`);
             }

            if (!res.ok) {
                 console.error("儲存流程 API 錯誤:", result.message || result);
                throw new Error(result.message || `儲存失敗 (${res.status})`);
            }

            // 儲存成功後，更新主資料、退出編輯模式
            setAIResponseTableData(editableData); // 將編輯後的數據設為主要顯示數據
            setIsEditing(false); // 退出編輯模式
            setHasSavedProcess(true); // 標記為已儲存
            setNotification({ message: result.message || '婚禮流程已成功儲存！', type: 'success' });

        } catch (err) {
            console.error('儲存流程錯誤:', err);
            setNotification({ message: `儲存失敗: ${err.message}`, type: 'error' });
        } finally {
            setIsSavingProcess(false);
        }
    };


    // 渲染 Markdown 到 HTML (用於檢視模式)
    const renderMarkdown = (text) => {
        if (text === null || text === undefined) return { __html: '' }; // 處理 null/undefined
        const html = String(text) // 確保是字串
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // 加粗
          .replace(/\n/g, '<br/>'); // 換行
        return { __html: html };
    };


    // --- 載入/錯誤/無客戶資料時的 UI ---
    if (loading) return <div className="flex justify-center items-center h-screen bg-gray-100"><p className="text-gray-600 text-xl">載入中...</p></div>;
    // 只有在有錯誤且沒有客戶資料時才顯示錯誤頁面
    if (error && !customer) { 
         return <div className="flex justify-center items-center h-screen bg-gray-100"><p className="text-red-500 text-xl">錯誤：{error}</p></div>;
    }
    // 當載入完成但沒有客戶資料時（例如 404）
    if (!customer) {
        return (
             <div className="flex justify-center items-center h-screen bg-gray-100">
                <div className="max-w-sm mx-auto bg-white shadow-lg rounded-lg p-8 text-center">
                     <h1 className="text-xl font-semibold mb-4 text-gray-800">找不到專案資料</h1>
                     <p className="text-gray-600 mb-6">請檢查網址是否正確，或返回列表查看。</p>
                     <button
                        onClick={() => navigate('/design-process')} // 返回列表的路徑
                        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors duration-200 text-md"
                    >
                        返回專案列表
                    </button>
                </div>
            </div>
        );
    }

    // --- 主要內容渲染 ---
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
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-700 text-center flex-grow">AI 流程設計</h1>
                    <button onClick={handleSavePreferences} className="flex items-center bg-sky-700 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-md shadow hover:bg-sky-800 transition-colors duration-200 disabled:opacity-50 text-sm sm:text-base ml-4" disabled={isSavingPreferences || isEditing || isGeneratingAI || isSavingProcess || activeModal}> 
                        <FiSave className="mr-1 sm:mr-2" />
                        {isSavingPreferences ? '儲存中...' : '儲存客戶偏好'}
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-6 text-gray-700">
                    <p className="text-lg font-medium">新人姓名：{customer.groom_name} & {customer.bride_name}</p>
                    <p>Email: {customer.email}</p>
                    <p>電話: {customer.phone}</p>
                    <p>婚禮日期: {customer.wedding_date ? moment(customer.wedding_date).format('YYYY-MM-DD HH:mm') : '未設定'}</p>
                    <p>婚禮地點: {customer.wedding_location || '未設定'}</p> 
                    <p>Google 表單: {customer.google_sheet_link ? <a href={customer.google_sheet_link} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline break-all">連結</a> : '未提供'}</p> 
                    <p>狀態: <span className={`font-semibold ${customer.status === 'open' ? 'text-yellow-700' : 'text-green-700'}`}>{customer.status === 'open' ? '未結案' : '已結案'}</span></p>
                </div>

                <h2 className="text-[#CB8A90] text-xl font-semibold mb-3 border-t pt-4 mt-4 border-slate-200">傾向／嗜好：</h2>
                <div className="flex flex-wrap gap-3 mb-6">
                    <button onClick={() => setActiveModal('zodiac')} className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 transition-colors" disabled={isEditing || isGeneratingAI || isSavingProcess || isSavingPreferences || activeModal}>星座</button>
                    <button onClick={() => setActiveModal('blood')} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors" disabled={isEditing || isGeneratingAI || isSavingProcess || isSavingPreferences || activeModal}>血型</button>
                    <button onClick={() => setActiveModal('color')} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors" disabled={isEditing || isGeneratingAI || isSavingProcess || isSavingPreferences || activeModal}>顏色</button>
                    <button onClick={() => setActiveModal('season')} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors" disabled={isEditing || isGeneratingAI || isSavingProcess || isSavingPreferences || activeModal}>季節</button>
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
                                        className="w-full border border-gray-300 rounded p-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500" 
                                        placeholder="例如：奶茶色、白+金…" 
                                        value={preferenceData.color} 
                                        onChange={(e) => setPreferenceData({ ...preferenceData, color: e.target.value })}
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
                                <button onClick={() => setActiveModal(null)} className="bg-gray-300 text-gray-800 px-5 py-2 rounded-md hover:bg-gray-400 transition-colors">取消</button>
                                <button onClick={() => setActiveModal(null)} className="bg-sky-600 text-white px-5 py-2 rounded-md hover:bg-sky-700 transition-colors">確定</button>
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
                        onChange={(e) => setPreferenceData({ ...preferenceData, belief: e.target.value })}
                         disabled={isEditing || isGeneratingAI || isSavingProcess || isSavingPreferences || activeModal}
                    />
                </div>
                <h2 className="text-[#CB8A90] text-xl font-semibold mb-3">偏好 / 需求說明 (可空)：</h2>
                <div className="mb-8">
                    <textarea 
                        className="w-full border border-gray-300 rounded p-3 resize-y focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-700" 
                        rows={4} 
                        placeholder="例如：希望浪漫風格、不要主持人、需要中英文雙語婚禮…" 
                        value={preferenceData.note} 
                        onChange={(e) => setPreferenceData({ ...preferenceData, note: e.target.value })}
                        disabled={isEditing || isGeneratingAI || isSavingProcess || isSavingPreferences || activeModal}
                    />
                </div>

                <div className="text-center mt-6">
                    <button className="bg-[#CB8A90] text-white px-8 py-3 rounded-md shadow-lg hover:bg-pink-500 transition-colors duration-200 text-lg font-bold disabled:opacity-50 flex items-center justify-center mx-auto" 
                        onClick={handleAIProcessGenerate} 
                        disabled={isGeneratingAI || isSavingPreferences || isSavingProcess || isEditing || activeModal}> 
                        {hasSavedProcess ? <FiRefreshCw className="mr-2 text-xl" /> : <FiZap className="mr-2 text-xl" />}
                        {isGeneratingAI ? 'AI 正在生成...' : (hasSavedProcess ? '重新生成並覆蓋' : 'AI 一鍵生成流程')}
                    </button>
                </div>

                {(Array.isArray(aiResponseTableData) && aiResponseTableData.length > 0) ? (
                  <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-lg shadow-inner overflow-x-auto">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-slate-700">
                        {isEditing ? '編輯婚禮流程' : '婚禮流程'}
                      </h2>
                      {!isEditing ? (
                        <button onClick={handleEditToggle} className="flex items-center text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors" disabled={isGeneratingAI || isSavingProcess || isSavingPreferences || activeModal}>
                          <FiEdit className="mr-1" /> 編輯
                        </button>
                      ) : (
                        <div className="flex items-center space-x-2">
                            <button onClick={handleSaveChanges} disabled={isSavingProcess || isGeneratingAI || isSavingPreferences} className="flex items-center text-sm bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50">
                              <FiSave className="mr-1" /> {isSavingProcess ? '儲存中...' : '儲存變更'}
                            </button>
                            <button onClick={handleEditToggle} disabled={isSavingProcess || isGeneratingAI || isSavingPreferences} className="flex items-center text-sm bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600 transition-colors">
                              <FiXCircle className="mr-1" /> 取消
                            </button>
                        </div>
                      )}
                    </div>

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
                              <td className="p-1 align-top"><textarea value={row.時間 || ''} onChange={(e) => handleRowChange(index, '時間', e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y" rows={3}/></td>
                              <td className="p-1 align-top"><textarea value={row.事件 || ''} onChange={(e) => handleRowChange(index, '事件', e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y" rows={3}/></td>
                              <td className="p-1 align-top"><textarea value={row.備註 || ''} onChange={(e) => handleRowChange(index, '備註', e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y" rows={3}/></td>
                              <td className="p-1 text-center align-middle">
                                <button onClick={() => handleDeleteRow(index)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 transition-colors" disabled={isSavingProcess}>
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
                    {isEditing && (
                        <div className="mt-4">
                            <button onClick={handleAddRow} className="flex items-center text-sm bg-sky-600 text-white px-3 py-1 rounded-md hover:bg-sky-700 transition-colors">
                                <FiPlusCircle className="mr-1" /> 新增一列
                            </button>
                        </div>
                    )}
                  </div>
                ) : (
                    // 如果沒有已儲存流程，且不是正在生成，顯示提示
                    !isGeneratingAI && (
                        <div className="mt-8 p-6 bg-white border border-gray-300 rounded-lg shadow-inner text-center text-gray-600">
                          尚未生成或儲存 AI 婚禮流程。請填寫客戶偏好後，點擊「AI 一鍵生成流程」。
                        </div>
                    )
                )}
                
                {isGeneratingAI === false && notification && notification.type === 'warning' && (
                  <div className="mt-4 text-center text-orange-600 p-3 bg-orange-100 rounded-md">
                    <p className="font-semibold">{notification.message}</p>
                  </div>
                )}
            </div>
        </div>
    );
}

export default DesignProcessDetail;
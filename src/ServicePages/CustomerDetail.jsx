import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import moment from 'moment';
import validator from 'validator';
// 請確保這個 CSS 檔案已被清理，只包含局部樣式或已經移除
// import '../styles/Service.css';

const templateOptions = [
    { value: 'template1', label: '模板 1 (預設)', imageUrl: '/template_1.png' },
    { value: 'template2', label: '模板 2 (我們結婚啦-紅)', imageUrl: '/template_2.png' },
    { value: 'template3', label: '模板 3 (我們結婚啦-綠)', imageUrl: '/template_3.png' },
    { value: 'template4', label: '模板 4 (婚禮邀請函-橘)', imageUrl: '/template_4.png' },
    { value: 'template5', label: '模板 5 (囍結良緣)', imageUrl: '/template_5.png' },
    { value: 'template6', label: '模板 6 (復古)', imageUrl: '/template_6.png' },
    { value: 'template7', label: '模板 7 (粉粉的)', imageUrl: '/template_7.png' },
];

// 後端 API 的基礎 URL
const API_BASE_URL = 'http://localhost:5713';

function CustomerDetails() {
    // 從 URL 參數獲取 ID，這個 ID 現在對應到新的 project_id
    const { id } = useParams();
    const navigate = useNavigate();

    const [customer, setCustomer] = useState(null); // 這裡實際上是專案和情侶合併的數據
    const [sheetData, setSheetData] = useState(null); // 賓客資料
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCustomerInfoCollapsed, setIsCustomerInfoCollapsed] = useState(false); // 預設展開客戶資訊

    // ==== 編輯客戶資訊相關的狀態 ====
    const [showEditForm, setShowEditForm] = useState(false);
    const [editFormData, setEditFormData] = useState({
        groom_name: "",
        bride_name: "",
        email: "",
        phone: "",
        wedding_date: "", // datetime-local 格式字串 (YYYY-MM-DDTHH:mm)
        wedding_location: "", // 對應後端的 wedding_place
        form_link: "", // 對應後端的 google_sheet_link
    });
    const [editFormErrors, setEditFormErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false); // 追蹤是否正在儲存
    const [isSyncing, setIsSyncing] = useState(false); // 追蹤是否正在同步
    const [isSendingEmail, setIsSendingEmail] = useState(false); // 追蹤是否正在寄送郵件

    // 提示訊息狀態
    const [notification, setNotification] = useState(null);

    // 寄送請帖確認框和選擇的模板與預覽圖片狀態
    const [showSendEmailConfirm, setShowSendEmailConfirm] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(templateOptions[0].value); // 預設選擇第一個模板
    const [previewImageUrl, setPreviewImageUrl] = useState(templateOptions[0].imageUrl); // 儲存預覽圖片 URL

    // 圖片預覽 Modal 狀態
    const [showImagePreviewModal, setShowImagePreviewModal] = useState(false);

    // 獨立函式用於抓取賓客資料，使用 useCallback進行 memoize
    // 注意：這裡的 ID 已經是 project_id
    const fetchSheetData = useCallback(async () => {
        // 確保 ID 是有效的，避免發送無效請求
        if (!id || isNaN(parseInt(id))) {
            console.warn("無效的專案 ID，無法抓取賓客資料");
            setSheetData([]);
            return;
        }

        try {
            // 呼叫後端 API 獲取賓客資料 (URL 保持不變，後端已修改查詢邏輯)
            const sheetDataRes = await fetch(`${API_BASE_URL}/customers/${id}/guests`);
            if (!sheetDataRes.ok) {
                // 嘗試解析錯誤訊息
                const errorData = await sheetDataRes.json().catch(() => ({ message: "無法解析錯誤訊息" }));
                console.warn(`抓取賓客資料 API 返回非 OK 狀態 ${sheetDataRes.status}: ${errorData.message}`);
                setSheetData([]); // 如果需要，可以在這裡設置一個錯誤提示，但通常賓客列表為空是可接受的
                // setNotification({ message: `無法載入賓客資料: ${errorData.message}`, type: "warning" });
                return;
            }
            const sheetData = await sheetDataRes.json();
            if (sheetData && Array.isArray(sheetData)) {
                // 後端已經將 guest_id 別名為 id，前端可以直接使用 row.id
                setSheetData(sheetData);
            } else {
                setSheetData([]);
                console.warn("抓取賓客資料 API 返回的格式非陣列:", sheetData);
                setNotification({ message: "賓客資料格式不正確", type: "warning" });
            }
        } catch (err) {
            console.error("抓取賓客資料錯誤:", err);
            setSheetData([]);
            setNotification({ message: "載入賓客資料失敗。", type: "error" });
        }
    }, [id]); // 依賴 URL 中的 ID (project_id)

    useEffect(() => {
        const fetchCustomerData = async () => {
            setLoading(true);
            setError(null);

            // 確保 ID 是有效的，避免發送無效請求
            if (!id || isNaN(parseInt(id))) {
                setError("無效的客戶/專案 ID。");
                setLoading(false);
                setCustomer(null);
                setSheetData([]);
                return;
            }

            try {
                // 呼叫後端 API 獲取專案和情侶資料 (URL 保持不變，後端已修改查詢邏輯)
                const customerRes = await fetch(`${API_BASE_URL}/customers/${id}`);
                if (!customerRes.ok) {
                    if (customerRes.status === 404) {
                        throw new Error("找不到客戶/專案資料"); // 修改訊息以匹配新邏輯
                    }
                    const errorData = await customerRes.json().catch(() => ({ message: "未知錯誤" }));
                    throw new Error(`抓取客戶資料 API 請求失敗 ${customerRes.status}: ${errorData.message}`);
                }
                const customerData = await customerRes.json();
                // 後端已經將 project_id 別名為 id，wedding_place 別名為 wedding_location
                setCustomer(customerData);

                // 在獲取到客戶資料後，初始化編輯表單的 state
                // 需要將日期和時間合併為 datetime-local 格式 (YYYY-MM-DDTHH:mm)
                const initialEditData = {
                    groom_name: customerData.groom_name || "",
                    bride_name: customerData.bride_name || "",
                    email: customerData.email || "",
                    phone: customerData.phone || "",
                    // 確保 date 和 time 存在且格式正確
                    wedding_date: (customerData.wedding_date && moment(customerData.wedding_date).isValid()) ?
                        (customerData.wedding_time && moment(customerData.wedding_time, 'HH:mm:ss').isValid() ?
                            `${moment(customerData.wedding_date).format('YYYY-MM-DD')}T${moment(customerData.wedding_time, 'HH:mm:ss').format('HH:mm')}` :
                            moment(customerData.wedding_date).format('YYYY-MM-DD') + 'T00:00') // 如果沒有時間，預設 00:00
                        : '', // 如果沒有有效日期
                    wedding_location: customerData.wedding_location || "", // 對應 wedding_place
                    form_link: customerData.google_sheet_link || "", // 對應 google_sheet_link
                };
                setEditFormData(initialEditData);

                await fetchSheetData(); // 抓取賓客資料

            } catch (err) {
                console.error("載入資料錯誤:", err);
                setError(err.message || "載入資料失敗。");
                setCustomer(null);
                setSheetData([]);
                setNotification({ message: err.message || "載入資料失敗。", type: "error" });
            } finally {
                setLoading(false);
            }
        };

        fetchCustomerData();
    }, [id, fetchSheetData]); // 依賴 URL 中的 ID 和 fetchSheetData 函式

    // 使用 useEffect 來自動隱藏提示訊息
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 5000); // 5 秒後隱藏提示訊息
            return () => clearTimeout(timer); // 在 notification 改變或元件卸載時清除 timer
        }
    }, [notification]);

    // 使用 useEffect 來更新預覽圖片 URL
    useEffect(() => {
        const selectedOption = templateOptions.find(option => option.value === selectedTemplate);
        if (selectedOption) {
            setPreviewImageUrl(selectedOption.imageUrl);
        } else {
            // 如果找不到對應的模板，可以設定一個預設圖片或清空
            setPreviewImageUrl(''); // 或者一個錯誤圖片 URL
        }
    }, [selectedTemplate]); // 當 selectedTemplate 改變時觸發

    // 函式用於更新單個賓客的寄送狀態
    // 注意：這裡傳遞的 guestId 是從後端獲取的 row.id，它應該是新的 guest_id
    const updateGuestStatus = async (guestId, status) => {
        if (!guestId) {
            console.warn("嘗試更新狀態但賓客 ID 無效");
            return false;
        }
        try {
            // 呼叫後端 API 更新賓客狀態 (URL 保持不變，後端已修改查詢和更新邏輯)
            const res = await fetch(`${API_BASE_URL}/update-status`, {
                method: "POST", // 狀態更新路由是 POST
                headers: {
                    "Content-Type": "application/json",
                },
                // 發送的 guest_id 是後端別名後的 id (新 guest_id)，status 是 0 或 1
                body: JSON.stringify({ guest_id: guestId, status: status }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error(`更新賓客 ${guestId} 狀態失敗: ${res.status} ${res.statusText} - ${errorText}`);
                // 嘗試解析 JSON 錯誤信息（如果後端返回 JSON）
                try {
                    const errorJson = JSON.parse(errorText);
                    console.error("後端錯誤詳情:", errorJson.message);
                    // 可以返回具體的錯誤信息
                    return { success: false, message: errorJson.message };
                } catch {
                    // 如果不是 JSON 錯誤
                    return { success: false, message: errorText || "未知錯誤" };
                }
            } else {
                console.log(`賓客 ${guestId} 狀態更新成功`);
                return { success: true };
            }
        } catch (err) {
            console.error(`呼叫更新狀態 API 錯誤 (賓客 ${guestId}):`, err);
            return { success: false, message: err.message || "未知錯誤" };
        }
    };

    // ==== 處理點擊寄送請帖按鈕 (開啟確認框) ====
    const handleSendEmailButtonClick = () => {
        if (!sheetData || sheetData.length === 0) {
            setNotification({ message: "沒有賓客資料，無法寄送邀請函。", type: "error" });
            return;
        }
        if (!customer) {
            setNotification({ message: "客戶資料尚未載入，無法寄送。", type: "error" });
            return;
        }

        // 只寄送未寄送且有 Email 的賓客
        // 注意：前端使用 row.id (對應 guest_id)
        const guestsToSend = sheetData.filter(guest => !guest.is_sent && guest.email);
        if (guestsToSend.length === 0) {
            setNotification({ message: "沒有符合寄送條件的賓客 (未寄送且有Email)。", type: "info" });
            return;
        }

        // 在顯示確認 Modal 前，確保 selectedTemplate 和預覽圖片有預設值
        setSelectedTemplate(templateOptions[0].value);
        // previewImageUrl 會在 useEffect 中根據 selectedTemplate 自動更新

        setShowSendEmailConfirm(true); // 顯示寄送確認 Modal
    };

    // ==== 處理寄送確認並執行寄信 API ====
    const confirmSendEmail = async () => {
        setIsSendingEmail(true); // 開始寄送，設置狀態為 true
        closeSendEmailConfirmModal(); // 關閉確認框

        // 再次過濾確保發送正確的賓客 (未寄送且有 Email)
        const guestsToSend = sheetData.filter(guest => !guest.is_sent && guest.email);
        if (guestsToSend.length === 0) {
            setNotification({ message: "沒有符合寄送條件的賓客可供寄送。", type: "info" });
            setIsSendingEmail(false);
            return;
        }

        const payload = {
            // 注意：前端傳遞的 customerId 是專案 ID (id)，customer 數據結構需要和後端 webhook 期望的匹配
            // 如果 n8n webhook 期望的是舊的 wedding_couples 結構，這裡需要進行轉換
            // 這裡假設 n8n webhook 可以接受目前的 customer 數據結構 (包含 project_id 等)
            customerId: id, // 傳遞 project_id
            customer: { // 傳遞客戶/專案詳細數據，結構與 GET /:id 返回的相同
                id: customer.id, // project_id
                groom_name: customer.groom_name,
                bride_name: customer.bride_name,
                email: customer.email, // 情侶 Email
                phone: customer.phone, // 情侶電話
                wedding_date: customer.wedding_date,
                wedding_time: customer.wedding_time,
                wedding_location: customer.wedding_location, // 這是 wedding_place 的別名
                google_sheet_link: customer.google_sheet_link,
                status: customer.status // 這是 project_status 的映射
                // 您可能需要根據 webhook 的實際需求調整這裡傳遞的字段
            },
            // 傳遞賓客列表，賓客 ID 是後端別名後的 id (新 guest_id)
            sheetData: guestsToSend.map(guest => ({
                id: guest.id, // 新 guest_id
                googleSheetGuestId: guest.google_sheet_guest_id,
                guestName: guest.guest_name,
                email: guest.email,
                isSent: guest.is_sent,
                relationshipWithGroom: guest.relationshipWithGroom,
                relationshipWithBride: guest.relationshipWithBride,
                relationshipWithCouple: guest.relationshipWithCouple,
                guestDescription: guest.guestDescription,
                sharedMemories: guest.sharedMemories,
                message: guest.message
            })),
            selectedTemplate: selectedTemplate, // 包含選擇的模板資訊
        };

        console.log("發送到 n8n 的 payload:", payload);

        // 確保這裡的 URL 是您的 n8n webhook 地址
        const n8nWebhookUrl = "https://anitakao.app.n8n.cloud/webhook-test/f629e12f-7ac6-4d3e-934f-d984449e8d50";

        try {
            const res = await fetch(n8nWebhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            // 即使不是 2xx 狀態碼，n8n webhook 也可能返回 JSON
            let n8nResponseData;
            try {
                n8nResponseData = await res.json();
            } catch (jsonErr) {
                console.warn("無法解析 n8n 響應為 JSON:", jsonErr);
                n8nResponseData = { message: await res.text().catch(() => "未知 webhook 響應") };
            }

            if (!res.ok) {
                // 根據 webhook 響應的狀態碼和內容來拋出錯誤
                const errorMessage = n8nResponseData.message || `Webhook 請求失敗：${res.status} ${res.statusText}`;
                throw new Error(errorMessage);
            }

            // Webhook 請求成功，現在更新賓客狀態
            setNotification({ message: n8nResponseData.message || "請帖寄送請求已發送！正在嘗試更新賓客狀態。", type: "success" });

            // 並行更新所有已發送的賓客狀態
            const updatePromises = guestsToSend.map(guest => updateGuestStatus(guest.id, 1)); // guest.id 是新的 guest_id
            const updateResults = await Promise.all(updatePromises);

            const failedUpdates = updateResults.filter(result => !result.success);
            if (failedUpdates.length > 0) {
                console.error("以下賓客狀態更新失敗:", failedUpdates);
                setNotification({ message: `請帖寄送請求已發送，但有 ${failedUpdates.length} 位賓客狀態更新失敗。`, type: "warning" });
            } else {
                setNotification({ message: "請帖寄送成功且所有賓客狀態已更新！", type: "success" });
            }

            await fetchSheetData(); // 重新抓取資料以更新 UI 上的寄送狀態

        } catch (err) {
            console.error("寄信錯誤:", err);
            setNotification({ message: "寄信失敗：" + err.message, type: "error" });
        } finally {
            setIsSendingEmail(false); // 寄送結束
        }
    };

    // 關閉寄送確認框並清除狀態
    const closeSendEmailConfirmModal = () => {
        setShowSendEmailConfirm(false);
    };

    // 關閉圖片預覽 Modal 的函式
    const closeImagePreviewModal = () => {
        setShowImagePreviewModal(false);
    };

    // 處理同步資料按鈕點擊
    // 注意：這裡傳遞的 ID 是 project_id
    const handleSyncData = async () => {
        if (!customer) {
            setNotification({ message: "客戶資料尚未載入，無法同步。", type: "error" });
            return;
        }
        // 確保 ID 是有效的，避免發送無效請求
        if (!id || isNaN(parseInt(id))) {
            setNotification({ message: "無效的專案 ID，無法同步。", type: "error" });
            return;
        }

        setIsSyncing(true);
        try {
            // 呼叫後端 API 同步資料 (URL 保持不變，後端已修改查詢和 UPSERT 邏輯)
            const res = await fetch(`${API_BASE_URL}/sync-sheet-data/${id}`, {
                method: "POST", // 同步路由是 POST
            });

            const data = await res.json(); // 嘗試解析 JSON

            if (!res.ok) {
                const errorMessage = data.message || "同步失敗，請稍後再試";
                console.error("同步 API 請求失敗:", errorMessage);
                throw new Error(errorMessage);
            }

            // 顯示成功同步的訊息
            setNotification({ message: data.message, type: "success" });
            await fetchSheetData(); // 重新抓取賓客資料以更新列表

        } catch (err) {
            console.error("同步資料錯誤:", err);
            setNotification({ message: "同步資料失敗：" + err.message, type: "error" });
        } finally {
            setIsSyncing(false);
        }
    };

    // Helper function to format date and time
    const formatWeddingDateTime = (date, time) => {
        let dateTimeString = '';

        // 檢查 date 是否為有效日期物件或字串
        const validDate = moment(date);
        if (date && validDate.isValid()) {
            dateTimeString += validDate.format('YYYY-MM-DD');
        } else if (date) {
            // 如果 date 存在但無效，可能是其他格式的字串，嘗試直接顯示
            // dateTimeString += String(date); // 不推薦直接顯示未驗證的字串
            dateTimeString += '無效日期';
        }

        if (time) {
            // 檢查 time 是否為有效時間格式 (HH:mm:ss)
            const validTime = moment(time, 'HH:mm:ss', true);
            if (time && validTime.isValid()) {
                if (dateTimeString) { // 如果日期部分已經有內容
                    dateTimeString += ' '; // 加一個空格分隔
                }
                dateTimeString += validTime.format('HH:mm'); // 只顯示 HH:mm
            } else if (time) {
                // 如果 time 存在但無效
                if (dateTimeString) dateTimeString += ' ';
                dateTimeString += '無效時間';
            }
        }

        if (!dateTimeString || dateTimeString.trim() === '無效日期' || dateTimeString.trim() === '無效時間') {
            return '未設定';
        }
        return dateTimeString;
    };

    // ==== 編輯表單相關函式 ====
    const handleEditFormChange = (e) => {
        setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
        // 當使用者修改欄位時，清除該欄位的錯誤訊息
        if (editFormErrors[e.target.name]) {
            setEditFormErrors({ ...editFormErrors, [e.target.name]: "" });
        }
        // 清除提交錯誤訊息
        if (editFormErrors.submit) {
            setEditFormErrors({ ...editFormErrors, submit: "" });
        }
    };

    // 編輯表單驗證函式
    const validateEditForm = () => {
        const errors = {};

        // 驗證新郎新娘姓名
        if (!editFormData.groom_name || !editFormData.groom_name.trim()) errors.groom_name = "請填寫新郎姓名";
        if (!editFormData.bride_name || !editFormData.bride_name.trim()) errors.bride_name = "請填寫新娘姓名";

        // 驗證 Email
        if (!editFormData.email || !editFormData.email.trim()) {
            errors.email = "請填寫電子郵件地址";
        } else if (!validator.isEmail(editFormData.email)) {
            errors.email = "請輸入有效的電子郵件地址";
        }

        // 驗證電話
        if (!editFormData.phone || !editFormData.phone.trim()) {
            errors.phone = "請填寫聯絡電話";
        } else if (!validator.isMobilePhone(editFormData.phone, 'any', { strictMode: false })) {
            errors.phone = "請輸入有效的聯絡電話";
        }

        // 婚禮日期非必填，但如果填了，格式要正確 (datetime-local 格式)
        if (editFormData.wedding_date) {
            // datetime-local 的值是 "YYYY-MM-DDTHH:mm"
            const dateTimeParts = editFormData.wedding_date.split('T');
            if (dateTimeParts.length !== 2 || !moment(dateTimeParts[0], 'YYYY-MM-DD', true).isValid() || !moment(dateTimeParts[1], 'HH:mm', true).isValid()) {
                errors.wedding_date = "請選擇有效的婚禮日期和時間";
            }
        }

        // Google 試算表連結必填且格式正確
        if (!editFormData.form_link || !editFormData.form_link.trim()) {
            errors.form_link = "請填寫 Google 試算表連結";
        } else if (!validator.isURL(editFormData.form_link, { require_protocol: true })) {
            errors.form_link = "請輸入有效的連結 (包含 http:// 或 https://)";
        }

        // wedding_location (對應 wedding_place) 不是必填，無需驗證是否為空

        setEditFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // 此函式用於儲存編輯後的客戶資訊
    // 注意：這裡傳遞的 ID 是 project_id
    const handleSaveEdit = async () => {
        if (!validateEditForm()) {
            return; // 驗證失敗，停止儲存
        }

        setIsSaving(true); // 開始儲存，設置狀態為 true

        // ==== 呼叫後端 PUT API 更新客戶資料 ====
        // URL 保持不變，後端已修改處理邏輯
        try {
            const res = await fetch(`${API_BASE_URL}/customers/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                // 發送編輯表單的資料，字段名與後端期望的匹配
                body: JSON.stringify(editFormData),
            });

            const data = await res.json(); // 嘗試解析 JSON

            if (!res.ok) {
                // 根據後端返回的錯誤訊息來顯示
                const errorMessage = data.message || "更新失敗，請稍後再試";
                console.error("更新客戶資料 API 錯誤:", errorMessage);
                throw new Error(errorMessage);
            }

            setNotification({ message: "客戶資料更新成功！", type: "success" });
            setShowEditForm(false); // 關閉 Modal
            setEditFormErrors({}); // 清空錯誤訊息

            // 重新抓取客戶資料以更新畫面上顯示的資訊
            // 這裡使用重新 fetch 以確保資料與後端完全同步
            const customerRes = await fetch(`${API_BASE_URL}/customers/${id}`);
            if (customerRes.ok) {
                const updatedCustomerData = await customerRes.json();
                // 後端已經將 project_id 別名為 id，wedding_place 別名為 wedding_location
                setCustomer(updatedCustomerData);

                // 更新編輯表單的 state 以保持一致
                const initialEditData = {
                    groom_name: updatedCustomerData.groom_name || "",
                    bride_name: updatedCustomerData.bride_name || "",
                    email: updatedCustomerData.email || "",
                    phone: updatedCustomerData.phone || "",
                    // 確保 date 和 time 存在且格式正確以便初始化 datetime-local
                    wedding_date: (updatedCustomerData.wedding_date && moment(updatedCustomerData.wedding_date).isValid()) ?
                        (updatedCustomerData.wedding_time && moment(updatedCustomerData.wedding_time, 'HH:mm:ss').isValid() ?
                            `${moment(updatedCustomerData.wedding_date).format('YYYY-MM-DD')}T${moment(updatedCustomerData.wedding_time, 'HH:mm:ss').format('HH:mm')}` :
                            moment(updatedCustomerData.wedding_date).format('YYYY-MM-DD') + 'T00:00')
                        : '',
                    wedding_location: updatedCustomerData.wedding_location || "", // 對應 wedding_place
                    form_link: updatedCustomerData.google_sheet_link || "", // 對應 google_sheet_link
                };
                setEditFormData(initialEditData);
            } else {
                const errorData = await customerRes.json().catch(() => ({ message: "未知錯誤" }));
                console.error(`重新抓取更新後的客戶資料失敗 ${customerRes.status}: ${errorData.message}`);
                // 即使重新抓取失敗，也清空錯誤訊息，使用者至少知道更新成功
                setNotification({ message: "資料更新成功，但重新載入詳情失敗，請刷新頁面。", type: "warning" });
                setEditFormErrors({});
            }

        } catch (err) {
            console.error("更新客戶資料錯誤：", err);
            setEditFormErrors({ ...editFormErrors, submit: err.message || "更新失敗，請稍後再試" });
            setNotification({ message: "更新客戶資料失敗：" + err.message, type: "error" });
        } finally {
            setIsSaving(false); // 儲存結束
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full bg-white">
                <p className="text-gray-600 text-xl">載入中...</p>
            </div>
        );
    }

    // 移除 min-h-screen, bg-gray-100，改為 h-full bg-white
    // 將 error 訊息放在頁面中央
    if (error && !customer) {
        // 只有在有錯誤且沒有客戶資料時才顯示錯誤頁面
        return (
            <div className="flex justify-center items-center h-full bg-white">
                <p className="text-red-600 text-xl">{error}</p>
            </div>
        );
    }

    // 當載入完成但沒有客戶資料時（例如 404）
    if (!customer) {
        return (
            <div className="w-full h-full p-2 flex justify-center items-center">
                <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 text-center">
                    <h1 className="text-2xl font-semibold mb-4 text-gray-800">找不到客戶資料</h1>
                    <p className="text-gray-600 mb-6">請檢查網址是否正確，或返回列表查看。</p>
                    <button
                        onClick={() => navigate('/service')} // 根據你的路由修改跳轉路徑
                        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors duration-200 text-lg"
                    >
                        返回客戶列表
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-full p-2">
            {notification && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-md text-white ${notification.type === 'success' ? 'bg-green-500' : notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}>
                    {notification.message}
                </div>
            )}

            {showSendEmailConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm md:max-w-md transform transition-all duration-300 scale-100">
                        <div className="flex justify-between items-center mb-4 border-b pb-2 border-gray-200">
                            <h2 className="text-xl font-bold text-gray-700">確認寄送請帖</h2>
                            <button onClick={closeSendEmailConfirmModal} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                        </div>
                        <p className="mb-4 text-gray-700">您確定要向所有未寄送且有有效電子郵件地址的賓客寄送請帖嗎？</p>

                        <div className="mb-4 flex items-end gap-4">
                            <div className="flex-grow">
                                <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 mb-1">選擇請帖模板:</label>
                                <select
                                    id="template-select"
                                    value={selectedTemplate}
                                    onChange={(e) => setSelectedTemplate(e.target.value)} // 更新 selectedTemplate 狀態
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                >
                                    {templateOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => setShowImagePreviewModal(true)} // 點擊時打開圖片預覽 Modal
                                className="bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
                                disabled={!previewImageUrl} // 如果沒有預覽圖片 URL，則禁用按鈕
                            >
                                預覽模板
                            </button>
                        </div>

                        <div className="flex gap-4 mt-4 justify-end">
                            <button
                                onClick={confirmSendEmail} // 點擊確認時呼叫 confirmSendEmail
                                className="bg-green-600 text-white px-4 py-2 rounded-md shadow hover:bg-green-700 disabled:opacity-50"
                                disabled={isSendingEmail} // 只根據是否正在寄送來禁用按鈕
                            >
                                {isSendingEmail ? '寄送中...' : '確認寄送'}
                            </button>
                            <button
                                onClick={closeSendEmailConfirmModal}
                                className="bg-gray-500 text-white px-4 py-2 rounded-md shadow hover:bg-gray-600"
                                disabled={isSendingEmail}
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showImagePreviewModal && previewImageUrl && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-full max-h-full overflow-auto transform transition-all duration-300 scale-100 relative">
                        <button
                            onClick={closeImagePreviewModal}
                            className="absolute top-2 right-2 bg-gray-300 text-gray-700 rounded-full p-1 text-lg hover:bg-gray-400 z-10"
                            aria-label="Close preview"
                        >
                            ×
                        </button>
                        <img src={previewImageUrl} alt="Template Preview" className="max-w-full h-auto mx-auto" />
                    </div>
                </div>
            )}

            {/* 當 customer 不為 null 時才渲染內容 */}
            {customer && (
                <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 relative">
                    <button
                        onClick={() => navigate('/service')} // 返回客戶列表的路徑
                        className="absolute top-4 left-4 bg-gray-300 text-gray-700 px-4 py-2 rounded-md shadow hover:bg-gray-400 transition-colors duration-200 text-sm md:text-base"
                    >
                        返回列表
                    </button>

                    {/* 顯示專案名稱 */}
                    <h1 className="text-2xl md:text-3xl font-semibold mb-8 text-center text-gray-800">
                        客戶詳情: {customer.groom_name} & {customer.bride_name}
                    </h1>

                    <div className="border border-gray-300 rounded-lg mb-6">
                        <button
                            className="w-full text-left px-6 py-4 bg-gray-200 hover:bg-gray-300 font-semibold text-gray-700 flex justify-between items-center"
                            onClick={() => setIsCustomerInfoCollapsed(!isCustomerInfoCollapsed)}
                        >
                            客戶資訊
                            <span>{isCustomerInfoCollapsed ? '▶' : '▼'}</span>
                        </button>
                        {!isCustomerInfoCollapsed && (
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-lg text-gray-700">
                                <div className="md:col-span-2 flex flex-wrap gap-x-8">
                                    <p>
                                        <span className="font-semibold">新郎:</span> {customer.groom_name}
                                    </p>
                                    <p>
                                        <span className="font-semibold">新娘:</span> {customer.bride_name}
                                    </p>
                                </div>
                                <p>
                                    <span className="font-semibold">聯絡信箱:</span> {customer.email}
                                </p>
                                <p>
                                    <span className="font-semibold">聯絡電話:</span> {customer.phone}
                                </p>
                                <div className="md:col-span-2">
                                    <p>
                                        <span className="font-semibold">婚禮日期時間:</span>{' '}
                                        {formatWeddingDateTime(customer.wedding_date, customer.wedding_time)}
                                    </p>
                                    <p className="mt-1">
                                        <span className="font-semibold">婚禮地點:</span> {customer.wedding_location || '未設定'}
                                    </p>
                                </div>
                                <div className="md:col-span-2">
                                    <p>
                                        <span className="font-semibold">賓客連結:</span>{' '}
                                        {customer.google_sheet_link ? (
                                            <a
                                                href={customer.google_sheet_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline break-all"
                                            >
                                                點此開啟
                                            </a>
                                        ) : (
                                            '未設定'
                                        )}
                                    </p>
                                </div>
                                <div className="md:col-span-2">
                                    <p>
                                        <span className="font-semibold">專案狀態:</span> {customer.status === 'open' ? '未結案' : '已結案'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 操作按鈕區域 */}
                    <div className="flex justify-center gap-4 mb-6 flex-wrap">
                        <button
                            onClick={handleSyncData}
                            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition duration-300 ease-in-out disabled:opacity-50"
                            // 確保在進行其他操作時禁用按鈕
                            disabled={loading || isSendingEmail || isSyncing || showEditForm || isSaving || showSendEmailConfirm || showImagePreviewModal}
                        >
                            {isSyncing ? '同步中...' : '同步賓客資料'}
                        </button>
                        <button
                            onClick={() => {
                                // 點擊編輯按鈕時，用當前 customer 資料填充表單並顯示 Modal
                                if (customer) {
                                    const initialEditData = {
                                        groom_name: customer.groom_name || "",
                                        bride_name: customer.bride_name || "",
                                        email: customer.email || "",
                                        phone: customer.phone || "",
                                        // 確保 date 和 time 存在且格式正確以便初始化 datetime-local
                                        wedding_date: (customer.wedding_date && moment(customer.wedding_date).isValid()) ?
                                            (customer.wedding_time && moment(customer.wedding_time, 'HH:mm:ss').isValid() ?
                                                `${moment(customer.wedding_date).format('YYYY-MM-DD')}T${moment(customer.wedding_time, 'HH:mm:ss').format('HH:mm')}` :
                                                moment(customer.wedding_date).format('YYYY-MM-DD') + 'T00:00') // 如果沒有時間，預設 00:00
                                            : '', // 如果沒有有效日期
                                        wedding_location: customer.wedding_location || "", // 對應 wedding_place
                                        form_link: customer.google_sheet_link || "", // 對應 google_sheet_link
                                    };
                                    setEditFormData(initialEditData);
                                    setEditFormErrors({}); // 清空舊的錯誤
                                    setShowEditForm(true); // 顯示編輯表單 Modal
                                }
                            }}
                            className="bg-yellow-600 text-white px-6 py-2 rounded hover:bg-yellow-700 transition duration-300 ease-in-out disabled:opacity-50"
                            disabled={loading || isSendingEmail || isSyncing || showEditForm || isSaving || showSendEmailConfirm || showImagePreviewModal}
                        >
                            編輯客戶資訊
                        </button>
                        <button
                            onClick={handleSendEmailButtonClick}
                            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition duration-300 ease-in-out disabled:opacity-50"
                            disabled={loading || isSendingEmail || isSyncing || showEditForm || isSaving || showSendEmailConfirm || showImagePreviewModal}
                        >
                            {isSendingEmail ? '寄送中...' : '寄送請帖'}
                        </button>
                    </div>

                    {/* 編輯表單 Modal */}
                    { showEditForm && (
                        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50 p-4">
                            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all duration-300 scale-100">
                                <div className="flex justify-between items-center mb-4 border-b pb-2 border-gray-200">
                                    <h2 className="text-xl font-bold text-gray-700">編輯客戶資訊</h2>
                                    <button
                                        onClick={() => {
                                            setShowEditForm(false);
                                            setEditFormErrors({});
                                        }}
                                        className="text-gray-500 hover:text-gray-700 text-2xl"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 text-black gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">新郎姓名</label>
                                        <input
                                            type="text"
                                            name="groom_name"
                                            value={editFormData.groom_name}
                                            onChange={handleEditFormChange}
                                            placeholder="新郎姓名"
                                            className={`border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.groom_name ? 'border-red-500' : ''}`}
                                        />
                                        {editFormErrors.groom_name && <p className="text-red-500 text-sm mt-1">{editFormErrors.groom_name}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">新娘姓名</label>
                                        <input
                                            type="text"
                                            name="bride_name"
                                            value={editFormData.bride_name}
                                            onChange={handleEditFormChange}
                                            placeholder="新娘姓名"
                                            className={`border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.bride_name ? 'border-red-500' : ''}`}
                                        />
                                        {editFormErrors.bride_name && <p className="text-red-500 text-sm mt-1">{editFormErrors.bride_name}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">聯絡信箱</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={editFormData.email}
                                            onChange={handleEditFormChange}
                                            placeholder="聯絡信箱"
                                            className={`border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.email ? 'border-red-500' : ''}`}
                                        />
                                        {editFormErrors.email && <p className="text-red-500 text-sm mt-1">{editFormErrors.email}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">聯絡電話</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={editFormData.phone}
                                            onChange={handleEditFormChange}
                                            placeholder="聯絡電話"
                                            className={`border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.phone ? 'border-red-500' : ''}`}
                                        />
                                        {editFormErrors.phone && <p className="text-red-500 text-sm mt-1">{editFormErrors.phone}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">婚禮日期時間</label>
                                        <input
                                            type="datetime-local"
                                            name="wedding_date"
                                            value={editFormData.wedding_date}
                                            onChange={handleEditFormChange}
                                            className={`border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.wedding_date ? 'border-red-500' : ''}`}
                                        />
                                        {editFormErrors.wedding_date && <p className="text-red-500 text-sm mt-1">{editFormErrors.wedding_date}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">婚禮地點</label>
                                        <input
                                            type="text"
                                            name="wedding_location" // 對應後端 project_couple_details 的 wedding_place
                                            value={editFormData.wedding_location}
                                            onChange={handleEditFormChange}
                                            placeholder="婚禮地點"
                                            className={`border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.wedding_location ? 'border-red-500' : ''}`}
                                        />
                                        {editFormErrors.wedding_location && <p className="text-red-500 text-sm mt-1">{editFormErrors.wedding_location}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Google 試算表連結</label>
                                        <input
                                            type="text"
                                            name="form_link" // 對應後端 wedding_projects 的 google_sheet_link
                                            value={editFormData.form_link}
                                            onChange={handleEditFormChange}
                                            placeholder="google 試算表連結"
                                            className={`border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.form_link ? 'border-red-500' : ''}`}
                                        />
                                        {editFormErrors.form_link && <p className="text-red-500 text-sm mt-1">{editFormErrors.form_link}</p>}
                                    </div>

                                    {editFormErrors.submit && <p className="text-red-600 text-sm mt-2 text-center">{editFormErrors.submit}</p>}

                                    <div className="flex gap-4 mt-2 justify-end">
                                        <button
                                            onClick={handleSaveEdit}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={isSaving}
                                        >
                                            {isSaving ? '儲存中...' : '儲存變更'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowEditForm(false);
                                                setEditFormErrors({});
                                            }}
                                            className="bg-gray-500 text-white px-4 py-2 rounded-md shadow hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={isSaving}
                                        >
                                            取消
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 賓客列表 */}
                    <h2 className="text-2xl font-semibold mb-4 text-gray-800 border-b pb-2">賓客列表</h2>
                    { sheetData && sheetData.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse table-auto">
                                <thead className="bg-gray-200 text-gray-700">
                                    <tr>
                                        {/* 賓客 ID 欄位 */}
                                        <th className="py-4 px-6 border-b border-gray-300 text-lg text-center font-semibold">賓客 ID</th>
                                        <th className="py-4 px-6 border-b border-gray-300 text-lg text-center font-semibold">賓客姓名</th>
                                        <th className="py-4 px-6 border-b border-gray-300 text-lg">電子郵件地址</th>
                                        <th className="py-4 px-6 border-b border-gray-300 text-lg text-center font-semibold">是否寄送</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sheetData.map((row) => (
                                        // row.id 現在對應後端別名後的 guest_id
                                        <tr key={row.id} className="hover:bg-gray-100">
                                            <td className="py-3 px-6 border-b border-gray-300 text-center text-black">{row.google_sheet_guest_id || '未同步'}</td>
                                            <td className="py-3 px-6 border-b border-gray-300 text-center text-black">{row.guest_name}</td>
                                            <td className="py-3 px-6 border-b border-gray-300 text-lg break-all text-black">{row.email}</td>
                                            <td className="py-3 px-6 border-b border-gray-300 text-lg text-center text-black">
                                                {row.is_sent ? "已寄送" : "未寄送"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 mt-4">目前沒有賓客資料。</p>
                    ) }
                </div >
            )}
        </div >
    );
}

export default CustomerDetails;
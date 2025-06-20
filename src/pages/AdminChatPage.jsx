import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5713';

function AdminChatPage() {
    const [groupedMessages, setGroupedMessages] = useState({});
    const [customerList, setCustomerList] = useState([]);
    const [activeCustomerId, setActiveCustomerId] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [replying, setReplying] = useState(false);
    const [error, setError] = useState('');
    const chatWindowRef = useRef(null);

    const fetchAndProcessMessages = useCallback(async () => {
        // ... (fetchAndProcessMessages 邏輯與上一版本相同，確保使用英文鍵名)
        setLoadingMessages(true);
        setError('');
        try {
            const res = await axios.get(`${API_BASE_URL}/api/chat/admin/messages`);
            const data = res.data;
            if (Array.isArray(data)) {
                const grouped = data.reduce((acc, msg) => {
                    if (msg.customer_id === null || msg.customer_id === undefined) {
                        console.warn("消息缺少 customer_id:", msg); return acc;
                    }
                    const id = msg.customer_id.toString();
                    if (!acc[id]) { acc[id] = { name: msg.customer_name, messages: [] }; }
                    acc[id].messages.push(msg); return acc;
                }, {});
                Object.keys(grouped).forEach(id => { grouped[id].messages.sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at)); });
                setGroupedMessages(grouped);
                const sortedCustomerList = Object.keys(grouped).map(id => {
                    const customerSession = grouped[id];
                    const userMsgs = customerSession.messages.filter(m => m.sender_type === 'user');
                    const hasUnreplied = userMsgs.some(m => m.is_replied === 0);
                    const lastMessageTime = customerSession.messages.length > 0 ? new Date(customerSession.messages[customerSession.messages.length - 1].sent_at) : new Date(0);
                    return { id, name: customerSession.name, hasUnreplied, lastMessageTime };
                }).sort((a, b) => {
                    if (a.hasUnreplied && !b.hasUnreplied) return -1;
                    if (!a.hasUnreplied && b.hasUnreplied) return 1;
                    return b.lastMessageTime - a.lastMessageTime;
                });
                setCustomerList(sortedCustomerList);
            } else { /* ...錯誤處理... */ }
        } catch (err) { /* ...錯誤處理... */ }
        finally { setLoadingMessages(false); }
    }, []);

    useEffect(() => { fetchAndProcessMessages(); }, [fetchAndProcessMessages]);
    useEffect(() => { if (chatWindowRef.current) { chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight; } }, [groupedMessages, activeCustomerId]);

    const handleSelectCustomer = (customerId) => { setActiveCustomerId(customerId); setError(''); };
    const handleReply = async () => { /* ... (與上一版本相同，確保使用英文鍵名) ... */ };
    
    const currentChatMessages = activeCustomerId ? groupedMessages[activeCustomerId]?.messages || [] : [];

    return (
        <div className="p-4 md:p-6 font-sans bg-pink-50 min-h-screen"> {/* 更改背景色 */}
            <style>{`
                .chat-customer-list {
                    background-color: #ffffff; /* 白色背景 */
                    border: 1px solid #fbcfe8; /* 淡粉色邊框 */
                    border-radius: 12px; /* 更圓的角 */
                    padding: 12px;
                    max-height: calc(100vh - 10rem); /* 調整最大高度 */
                    overflow-y: auto;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08); /* 添加柔和陰影 */
                }

                .chat-customer-item {
                    padding: 10px 12px; /* 調整padding */
                    border-radius: 8px; /* 更圓的角 */
                    margin-bottom: 8px;
                    cursor: pointer;
                    transition: background-color 0.2s, color 0.2s;
                    border-left: 4px solid transparent; /* 左側高亮條準備 */
                }

                .chat-customer-item:hover {
                    background-color: #fff0f5; /* 淡雅的懸停背景色 */
                    border-left-color: #f472b6; /* 懸停時左側高亮 */
                }

                .chat-active {
                    background-color: #ec4899; /* 主題粉色 */
                    color: white;
                    font-weight: 600; /* 加粗 */
                    border-left-color: #db2777; /* 更深的粉色 */
                }
                .chat-active:hover {
                    background-color: #db2777; /* 懸停時更深 */
                }

                .chat-window-container { /* 新增容器方便控制 */
                    background-color: #ffffff;
                    border: 1px solid #fbcfe8;
                    border-radius: 12px;
                    padding: 0; /* 內部由 chat-window 控制 padding */
                    max-height: calc(100vh - 10rem);
                    display: flex;
                    flex-direction: column; /* 讓回覆框在底部 */
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                }

                .chat-window {
                    padding: 16px; /* 增加內邊距 */
                    overflow-y: auto;
                    flex-grow: 1; /* 占据剩余空间 */
                    background-color: #fffcfc; /* 非常淡的粉色背景 */
                }

                .chat-bubble {
                    display: inline-block;
                    max-width: 70%; /* 稍微減小最大寬度 */
                    padding: 10px 14px; /* 調整氣泡padding */
                    border-radius: 18px; /* 更圓的氣泡 */
                    line-height: 1.4; /* 改善可讀性 */
                    box-shadow: 0 2px 4px rgba(0,0,0,0.06); /* 給氣泡加陰影 */
                }

                .chat-user {
                    background-color: #ffe4e1; /* 用戶氣泡 - 更淡的粉色 */
                    color: #5c2b29; /* 深色文字 */
                    border-bottom-left-radius: 4px; /* 使氣泡更像對話框 */
                }

                .chat-admin {
                    background-color: #ec4899; /* 管理員氣泡 - 主題粉色 */
                    color: white;
                    border-bottom-right-radius: 4px; /* 使氣泡更像對話框 */
                }

                .chat-time {
                    font-size: 0.7rem; /* 更小時間戳 */
                    color: #a0aec0; /* 灰色時間戳 */
                    margin-top: 4px;
                    display: block; /* 確保獨佔一行 */
                }

                .reply-input-container { /* 新增容器 */
                    padding: 12px 16px;
                    border-top: 1px solid #fbcfe8;
                    background-color: #fffafa; /* 與列表背景稍作區分 */
                }

                .reply-box {
                    border: 1px solid #fbcfe8;
                    border-radius: 8px;
                    padding: 10px 12px; /* 調整padding */
                    width: 100%;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    font-size: 0.9rem;
                }
                .reply-box:focus {
                    border-color: #ec4899;
                    box-shadow: 0 0 0 2px rgba(236, 72, 153, 0.2); /* 聚焦光暈 */
                    outline: none;
                }

                .reply-button {
                    background-color: #ec4899; /* 主題粉色 */
                    color: white;
                    padding: 10px 20px; /* 調整padding */
                    border: none;
                    border-radius: 8px;
                    margin-left: 12px; /* 調整間距 */
                    cursor: pointer;
                    transition: background-color 0.2s;
                    font-weight: 500;
                }
                .reply-button:hover:not(:disabled) { /* 只有非禁用時才有懸停效果 */
                    background-color: #db2777; /* 更深的粉色 */
                }
                .reply-button:disabled {
                    background-color: #f3f4f6; /* 灰色 */
                    color: #9ca3af;
                    cursor: not-allowed;
                }

                .unreplied-tag {
                    font-size: 0.65rem; /* 更小標籤 */
                    background-color: #ef4444; /* 鮮紅色 */
                    color: white;
                    padding: 2px 6px;
                    border-radius: 9999px; /* 膠囊狀 */
                    margin-left: 8px;
                    font-weight: 500;
                    vertical-align: middle;
                }
                .unreplied-customer-dot { /* 用於顧客列表的小紅點 */
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    background-color: #ef4444;
                    border-radius: 50%;
                    margin-right: 6px;
                }
            `}</style>

            <h1 className="text-3xl font-bold mb-8 text-[#db2777] text-center tracking-tight">客服對話中心</h1> {/* 更深的粉色，調整字間距*/}

            {error && <p className="mb-4 text-center text-red-600 bg-red-100 p-3 rounded-md shadow">{error}</p>}

            <div className="flex flex-col md:flex-row gap-4 lg:gap-6">
                {/* 左側顧客列表 */}
                <div className="w-full md:w-1/3 lg:w-1/4 chat-customer-list">
                    <h2 className="font-semibold text-xl text-[#db2777] mb-4 p-2 border-b border-[#fbcfe8] sticky top-0 bg-white z-10"> {/* 列表標題加大，吸頂 */}
                        待處理 / 對話列表
                    </h2>
                    {loadingMessages && customerList.length === 0 ? (
                        <div className="p-3 text-gray-500 text-center">正在載入顧客列表...</div>
                    ) : customerList.length > 0 ? (
                        customerList.map(cust => (
                            <div
                                key={cust.id}
                                className={`chat-customer-item flex justify-between items-center ${activeCustomerId === cust.id ? 'chat-active' : 'hover:bg-[#fff0f5]'}`}
                                onClick={() => handleSelectCustomer(cust.id)}
                                title={cust.name || `顧客 #${cust.id}`}
                            >
                                <span className="truncate font-medium flex items-center"> {/* truncate 防止名稱過長 */}
                                    {cust.hasUnreplied && <span className="unreplied-customer-dot" title="有未回覆消息"></span>}
                                    {cust.name || `顧客 #${cust.id}`}
                                </span>
                                {cust.hasUnreplied && <span className="unreplied-tag hidden sm:inline">未回覆</span>} {/* 小屏幕上可能隱藏文字標籤 */}
                            </div>
                        ))
                    ) : (
                        <p className="p-3 text-gray-500 text-center">目前沒有對話。</p>
                    )}
                </div>

                {/* 右側對話區域 */}
                <div className="w-full md:w-2/3 lg:w-3/4 flex flex-col chat-window-container"> {/* 使用新的容器 */}
                    {activeCustomerId && groupedMessages[activeCustomerId] ? (
                        <>
                            <div className="font-semibold text-xl text-[#db2777] mb-3 p-4 border-b border-[#fbcfe8] bg-white sticky top-0 z-10"> {/* 聊天對象標題加大，吸頂 */}
                                與 {groupedMessages[activeCustomerId].name || `顧客 #${activeCustomerId}`} 的對話
                            </div>
                            <div ref={chatWindowRef} className="chat-window"> {/* flex-grow 已被 chat-window-container 的 flex-direction:column 控制 */}
                                {loadingMessages && currentChatMessages.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-gray-400">載入訊息中...</div>
                                ) : currentChatMessages.length > 0 ? (
                                    currentChatMessages.map(msg => (
                                        <div key={msg.message_id || `msg-${Math.random()}`} className={`mb-4 clear-both flex flex-col ${msg.sender_type === 'admin' ? 'items-end' : 'items-start'}`}>
                                            <div className={`chat-bubble ${msg.sender_type === 'admin' ? 'chat-admin' : 'chat-user'}`}>
                                                {msg.content}
                                            </div>
                                            <div className={`chat-time px-1 ${msg.sender_type === 'admin' ? 'text-right' : 'text-left'}`}>
                                                {msg.sent_at ? new Date(msg.sent_at).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '無時間'}
                                                {msg.sender_type === 'user' && msg.is_replied === 0 && (
                                                    <span className="unreplied-tag ml-1">待回</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400">目前沒有訊息</div>
                                )}
                            </div>

                            <div className="flex items-center reply-input-container"> {/* 使用新的容器 */}
                                <textarea
                                    id="reply-input-field" value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    onKeyPress={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply();}}}
                                    className="reply-box flex-grow resize-none" rows="2"
                                    placeholder="輸入回覆內容 (Shift+Enter 換行)..." disabled={replying}
                                />
                                <button onClick={handleReply} className="reply-button"
                                    disabled={replying || !replyText.trim()}>
                                    {replying ? '傳送中...' : '傳送'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-grow flex items-center justify-center text-gray-500 bg-white rounded-lg shadow-lg">
                            <p className="text-lg">請從左側列表選擇一位顧客以開始對話。</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminChatPage;
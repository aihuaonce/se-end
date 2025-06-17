import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AdminChatPage() {
    const [messages, setMessages] = useState([]);
    const [activeCustomerId, setActiveCustomerId] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [loading, setLoading] = useState(true);
    const [replying, setReplying] = useState(false);  // 新增回覆中狀態

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/chat/admin/messages');
            const data = res.data;
            if (Array.isArray(data)) {
                setMessages(data);
            } else {
                console.warn('API 回傳不是陣列：', data);
                setMessages([]);
            }
        } catch (error) {
            console.error('載入訊息失敗:', error);
            setMessages([]);
        } finally {
            setLoading(false);
        }
    };

    const handleReply = async () => {
        if (!replyText.trim()) return;
        if (!activeCustomerId) {
            alert('請先選擇一位顧客');
            return;
        }
        setReplying(true);
        try {
            await axios.post('/api/chat/admin/reply', {
                顧客id: activeCustomerId,
                回覆內容: replyText,
            });
            setReplyText('');
            await fetchMessages();  // **await 等待資料刷新完成**
        } catch (error) {
            console.error('回覆失敗:', error);
            alert('回覆失敗，請稍後再試');
        } finally {
            setReplying(false);
        }
    };

    // group by 顧客id
    const grouped = messages.reduce((acc, msg) => {
        const id = msg.顧客id.toString();
        if (!acc[id]) acc[id] = [];
        acc[id].push(msg);
        return acc;
    }, {});

    // 對每組訊息排序：早 → 晚
    Object.keys(grouped).forEach(id => {
        grouped[id].sort((a, b) => new Date(a.溝通時間) - new Date(b.溝通時間));
    });

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">訊息管理後台</h2>
            <div className="flex">
                {/* 顧客列表 */}
                <div className="w-1/3 border-r pr-4">
                    <h3 className="font-bold mb-2">顧客列表</h3>
                    {Object.keys(grouped).map(id => {
                        const userMsgs = grouped[id].filter(m => m.發送者 === 'user');
                        const hasUnreplied = userMsgs.some(m => m.是否回覆 === 0);
                        return (
                            <div
                                key={id}
                                className={`cursor-pointer mb-2 p-2 rounded ${hasUnreplied ? 'bg-yellow-100' : 'bg-gray-100'}`}
                                onClick={() => setActiveCustomerId(id)}
                            >
                                顧客 #{id} {hasUnreplied && '（未回覆）'}
                            </div>
                        );
                    })}
                </div>

                {/* 對話區塊 */}
                <div className="w-2/3 pl-4">
                    {activeCustomerId ? (
                        <>
                            <h3 className="font-bold mb-2">與顧客對話</h3>
                            <div className="border h-96 overflow-y-scroll p-2 mb-4 bg-white">
                                {loading ? (
                                    <p className="text-gray-400 text-center">載入中...</p>
                                ) : Array.isArray(grouped[activeCustomerId]) && grouped[activeCustomerId].length > 0 ? (
                                    grouped[activeCustomerId].map(msg => (
                                        <div
                                            key={msg.溝通id}
                                            className={`mb-2 ${msg.發送者 === 'admin' ? 'text-right' : 'text-left'}`}
                                        >
                                            <div
                                                className={`inline-block p-2 rounded relative ${msg.發送者 === 'admin' ? 'bg-blue-200' : 'bg-gray-200'}`}
                                            >
                                                {msg.溝通內容}
                                                {msg.發送者 === 'user' && msg.是否回覆 === 0 && (
                                                    <span className="text-xs text-white bg-red-500 px-2 py-0.5 rounded ml-2">
                                                        未回覆
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {msg.溝通時間 ? new Date(msg.溝通時間).toLocaleString() : '無時間'}
                                            </div>
                                        </div>
                                    ))

                                ) : (
                                    <p className="text-gray-400 text-center">目前沒有訊息</p>
                                )}
                            </div>
                            {/* 回覆輸入區 */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    className="flex-1 border rounded p-2"
                                    placeholder="輸入回覆內容..."
                                    disabled={replying} // 回覆時鎖住輸入
                                />
                                <button
                                    onClick={handleReply}
                                    className="bg-blue-500 text-white px-4 py-2 rounded"
                                    disabled={replying} // 回覆時鎖住按鈕
                                >
                                    {replying ? '回覆中...' : '回覆'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <p className="text-gray-500">請點選左側顧客以查看對話</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminChatPage;

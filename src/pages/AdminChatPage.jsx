import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AdminChatPage() {
    const [messages, setMessages] = useState([]);
    const [activeCustomerId, setActiveCustomerId] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [loading, setLoading] = useState(true);
    const [replying, setReplying] = useState(false);

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
            await fetchMessages();
        } catch (error) {
            console.error('回覆失敗:', error);
            alert('回覆失敗，請稍後再試');
        } finally {
            setReplying(false);
        }
    };

    const grouped = messages.reduce((acc, msg) => {
        const id = msg.顧客id.toString();
        if (!acc[id]) acc[id] = [];
        acc[id].push(msg);
        return acc;
    }, {});

    Object.keys(grouped).forEach(id => {
        grouped[id].sort((a, b) => new Date(a.溝通時間) - new Date(b.溝通時間));
    });

    return (
        <div className="p-6 font-sans">
            <style>{`
                .chat-customer-list {
                    background-color: #fffafa;
                    border: 1px solid #e5a8b5;
                    border-radius: 10px;
                    padding: 10px;
                    height: 32rem;
                    overflow-y: auto;
                }

                .chat-customer-item {
                    padding: 8px 10px;
                    border-radius: 6px;
                    margin-bottom: 8px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                .chat-customer-item:hover {
                    background-color: #f3d9db;
                }

                .chat-active {
                    background-color: #cb8a90;
                    color: white;
                }

                .chat-window {
                    border: 1px solid #e5a8b5;
                    border-radius: 10px;
                    padding: 10px;
                    height: 32rem;
                    overflow-y: auto;
                    background-color: #fffafa;
                }

                .chat-bubble {
                    display: inline-block;
                    max-width: 75%;
                    padding: 8px 12px;
                    border-radius: 10px;
                    position: relative;
                }

                .chat-user {
                    background-color: #f9dcdc;
                    color: #4b1e1e;
                }

                .chat-admin {
                    background-color: #cb8a90;
                    color: white;
                }

                .chat-time {
                    font-size: 12px;
                    color: #aaa;
                    margin-top: 2px;
                }

                .reply-box {
                    border: 1px solid #cb8a90;
                    border-radius: 8px;
                    padding: 8px;
                    width: 100%;
                }

                .reply-button {
                    background-color: #cb8a90;
                    color: white;
                    padding: 8px 16px;
                    border: none;
                    border-radius: 6px;
                    margin-left: 10px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                .reply-button:hover {
                    background-color: #ef4c92;
                }

                .unreplied-tag {
                    font-size: 10px;
                    background-color: #dc2626;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 4px;
                    margin-left: 6px;
                }
            `}</style>

            <h1 className="text-2xl font-bold mb-4 text-[#cb8a90]">客服對話</h1>

            <div className="flex gap-6">
                {/* 左側顧客列表 */}
                <div className="w-1/3 chat-customer-list">
                    <h2 className="font-semibold text-[#cb8a90] mb-3">顧客列表</h2>
                    {Object.keys(grouped).map(id => {
                        const userMsgs = grouped[id].filter(m => m.發送者 === 'user');
                        const hasUnreplied = userMsgs.some(m => m.是否回覆 === 0);
                        return (
                            <div
                                key={id}
                                className={`chat-customer-item ${activeCustomerId === id ? 'chat-active' : ''}`}
                                onClick={() => setActiveCustomerId(id)}
                            >
                                顧客 #{id} {hasUnreplied && <span className="unreplied-tag">未回覆</span>}
                            </div>
                        );
                    })}
                </div>

                {/* 右側對話區域 */}
                <div className="w-2/3">
                    {activeCustomerId ? (
                        <>
                            <h2 className="font-semibold text-[#cb8a90] mb-3">與顧客 #{activeCustomerId} 的對話</h2>
                            <div className="chat-window mb-4">
                                {loading ? (
                                    <p className="text-gray-400 text-center">載入中...</p>
                                ) : Array.isArray(grouped[activeCustomerId]) && grouped[activeCustomerId].length > 0 ? (
                                    grouped[activeCustomerId].map(msg => (
                                        <div key={msg.溝通id} className={`mb-3 ${msg.發送者 === 'admin' ? 'text-right' : 'text-left'}`}>
                                            <div className={`chat-bubble ${msg.發送者 === 'admin' ? 'chat-admin' : 'chat-user'}`}>
                                                {msg.溝通內容}
                                                {msg.發送者 === 'user' && msg.是否回覆 === 0 && (
                                                    <span className="unreplied-tag">未回覆</span>
                                                )}
                                            </div>
                                            <div className="chat-time">
                                                {msg.溝通時間 ? new Date(msg.溝通時間).toLocaleString() : '無時間'}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-400 text-center">目前沒有訊息</p>
                                )}
                            </div>

                            <div className="flex">
                                <input
                                    type="text"
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    className="reply-box"
                                    placeholder="輸入回覆內容..."
                                    disabled={replying}
                                />
                                <button
                                    onClick={handleReply}
                                    className="reply-button"
                                    disabled={replying}
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

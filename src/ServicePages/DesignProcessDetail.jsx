import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

function DesignProcessDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeModal, setActiveModal] = useState(null);
  const [preferenceData, setPreferenceData] = useState({
    zodiac: [],
    blood: [],
    color: '',
    season: [],
    belief: '',
    note: ''
  });

  const options = {
    zodiac: ['牡羊座', '金牛座', '雙子座', '巨蟹座', '獅子座', '處女座', '天秤座', '天蠍座', '射手座', '魔羯座', '水瓶座', '雙魚座'],
    blood: ['A型', 'B型', 'O型', 'AB型'],
    season: ['春', '夏', '秋', '冬']
  };

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const res = await fetch(`http://localhost:5713/customers/${id}`);
        if (!res.ok) throw new Error('找不到客戶資料');
        const data = await res.json();
        setCustomer(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [id]);

  if (loading) return <div className="p-6">載入中...</div>;
  if (error) return <div className="p-6 text-red-500">錯誤：{error}</div>;
  if (!customer) return <div className="p-6">查無此客戶。</div>;

  return (
    <div className="p-6">
      <h1 className="text-[#CB8A90] text-2xl font-bold tracking-wide mb-4">流程設計</h1>
      <p className="text-lg mb-6 text-gray-700">
        新人姓名：{customer.groom_name} & {customer.bride_name}
      </p>

      <h2 className="text-[#CB8A90] text-lg font-semibold mb-2">傾向／嗜好：</h2>
      <div className="space-x-2 mb-6">
        <button onClick={() => setActiveModal('zodiac')} className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600">星座</button>
        <button onClick={() => setActiveModal('blood')} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">血型</button>
        <button onClick={() => setActiveModal('color')} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">顏色</button>
        <button onClick={() => setActiveModal('season')} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">季節</button>
      </div>

      <div className="mb-8 text-gray-700 space-y-1">
        {preferenceData.zodiac.length > 0 && <p>星座：{preferenceData.zodiac.join('、')}</p>}
        {preferenceData.blood.length > 0 && <p>血型：{preferenceData.blood.join('、')}</p>}
        {preferenceData.color && <p>顏色：{preferenceData.color}</p>}
        {preferenceData.season.length > 0 && <p>季節：{preferenceData.season.join('、')}</p>}
      </div>

      {activeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-80">
            <h2 className="text-xl font-bold mb-4">
              {activeModal === 'zodiac' && '請選擇星座（最多兩個）'}
              {activeModal === 'blood' && '請選擇血型（最多兩個）'}
              {activeModal === 'color' && '請輸入喜歡的顏色'}
              {activeModal === 'season' && '請選擇喜歡的季節（最多兩個）'}
            </h2>

            <div className="mb-4 space-y-2">
              {activeModal === 'color' ? (
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded p-2 mb-4"
                  placeholder="例如：奶茶色、白+金…"
                  value={preferenceData.color}
                  onChange={(e) =>
                    setPreferenceData({ ...preferenceData, color: e.target.value })
                  }
                />
              ) : (
                options[activeModal]?.map((option) => (
                  <label key={option} className="block">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={preferenceData[activeModal]?.includes(option)}
                      onChange={() => {
                        const current = preferenceData[activeModal] || [];
                        const isSelected = current.includes(option);

                        if (isSelected) {
                          setPreferenceData({
                            ...preferenceData,
                            [activeModal]: current.filter((item) => item !== option),
                          });
                        } else if (current.length < 2) {
                          setPreferenceData({
                            ...preferenceData,
                            [activeModal]: [...current, option],
                          });
                        }
                      }}
                    />
                    {option}
                  </label>
                ))
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setActiveModal(null)}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                取消
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="bg-sky-600 text-white px-4 py-2 rounded hover:bg-sky-700"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-[#CB8A90] text-lg font-semibold mb-2">信仰 / 禁忌說明：</h2>
      <div className="mb-6">
        <textarea
          className="w-full border border-gray-300 rounded p-2"
          rows={3}
          placeholder="例如：不可碰酒、不能穿紅色、需安排宗教儀式…（可空白）"
          value={preferenceData.belief}
          onChange={(e) =>
            setPreferenceData({ ...preferenceData, belief: e.target.value })
          }
        />
      </div>

      <h2 className="text-[#CB8A90] text-lg font-semibold mb-2">偏好 / 需求說明：</h2>
      <div className="mb-10">
        <textarea
          className="w-full border border-gray-300 rounded p-2"
          rows={3}
          placeholder="例如：希望浪漫風格、不要主持人、需要中英文雙語婚禮…（可空白）"
          value={preferenceData.note}
          onChange={(e) =>
            setPreferenceData({ ...preferenceData, note: e.target.value })
          }
        />
      </div>
    </div>
  );
}

export default DesignProcessDetail;

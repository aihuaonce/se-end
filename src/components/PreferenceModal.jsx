const PreferenceModal = ({ activeModal, preferenceData, handlePreferenceChange, setPreferenceData, setActiveModal, options }) => {
  if (!activeModal) return null;

  const titles = {
    zodiac: '請選擇星座（最多兩個）',
    blood: '請選擇血型（最多兩個）',
    color: '請輸入喜歡的顏色',
    season: '請選擇喜歡的季節（最多兩個）'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-4 text-slate-700">{titles[activeModal]}</h2>
        <div className="mb-6 space-y-2 max-h-60 overflow-y-auto">
          {activeModal === 'color' ? (
            <input type="text" className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="例如：奶茶色、白+金…" value={preferenceData.color} onChange={(e) => setPreferenceData(prev => ({ ...prev, color: e.target.value }))} />
          ) : (
            options[activeModal]?.map((option) => (
              <label key={option} className="flex items-center cursor-pointer text-gray-700 hover:bg-gray-50 p-2 rounded">
                <input type="checkbox" className="form-checkbox h-5 w-5 text-sky-600 rounded mr-3" checked={preferenceData[activeModal]?.includes(option)} onChange={() => handlePreferenceChange(activeModal, option)} />
                <span className="text-lg">{option}</span>
              </label>
            ))
          )}
        </div>
        <div className="flex justify-end space-x-3">
          <button onClick={() => setActiveModal(null)} className="bg-gray-300 text-gray-800 px-5 py-2 rounded-md hover:bg-gray-400">取消</button>
          <button onClick={() => setActiveModal(null)} className="bg-sky-600 text-white px-5 py-2 rounded-md hover:bg-sky-700">確定</button>
        </div>
      </div>
    </div>
  );
};
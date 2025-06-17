import React, { useState, useMemo, useCallback } from 'react';
import moment from 'moment';

// 定義每週的名稱
const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTH_NAMES = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
];

// 引入 onClear prop 和 weddingEvents prop
function CustomMonthPickerCalendar({ selectedMonth, onSelectMonth, minDate, maxDate, onClear, weddingEvents }) {
  // currentView: 'month' (顯示日期), 'year' (顯示月份), 'decade' (顯示年份)
  const [currentView, setCurrentView] = useState('month'); // 預設顯示月份的日期網格
  // displayDate: 決定日曆目前顯示的是哪個月/年/十年
  const [displayDate, setDisplayDate] = useState(selectedMonth || new Date());

  // 確保 displayDate 始終是 Date 物件並避免時間戳差異影響
  const safeDisplayDate = useMemo(() => {
    if (!moment(displayDate).isValid()) {
      return new Date(); // 無效則設為當前日期
    }
    return moment(displayDate).startOf('day').toDate(); // 確保只保留年、月、日信息
  }, [displayDate]);

  // ==== 新增：根據狀態獲取 Tailwind 顏色類別 ====
  const getStatusColorClass = useCallback((status) => {
    switch (status) {
      case 'open': return 'bg-yellow-300 text-yellow-900'; // 未結案
      case 'closed': return 'bg-green-300 text-green-900'; // 已結案
      default: return ''; // 預設無特定顏色
    }
  }, []);

  // 處理點擊年份視圖中的月份
  const handleMonthClick = useCallback((monthDate) => {
    setDisplayDate(monthDate); // 更新顯示日曆到該月份
    setCurrentView('month'); // 切換回月份的日視圖
    onSelectMonth(monthDate); // 選取該月份，觸發外部的 selectedMonth 狀態更新
  }, [onSelectMonth]);

  // 處理點擊十年視圖中的年份
  const handleYearClick = useCallback((year) => {
    // 更新顯示日曆到該年份的當前月份（保持月和日不變，只換年）
    setDisplayDate(moment(safeDisplayDate).year(year).toDate());
    setCurrentView('year'); // 切換到月份選擇視圖
  }, [safeDisplayDate]);

  // 生成月份視圖 (顯示日期)
  const renderMonthView = useCallback(() => {
    const startOfMonth = moment(safeDisplayDate).startOf('month');
    const endOfMonth = moment(safeDisplayDate).endOf('month');
    const firstDayOfWeek = startOfMonth.day(); // 0 (Sun) to 6 (Sat)

    const daysInMonth = startOfMonth.daysInMonth();
    const prevMonthDays = moment(safeDisplayDate).subtract(1, 'month').daysInMonth();

    const calendarDays = [];

    // 填充上一個月的灰顯日期
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      calendarDays.push({
        date: moment(safeDisplayDate).subtract(1, 'month').date(prevMonthDays - i).toDate(),
        isCurrentMonth: false,
      });
    }

    // 填充當前月份的日期
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push({
        date: moment(startOfMonth).date(i).toDate(),
        isCurrentMonth: true,
      });
    }

    // 填充下一個月的灰顯日期，確保日曆格子總是 6 行 (42個日期)
    let nextMonthDay = 1;
    const totalDaysToShow = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
    while (calendarDays.length < totalDaysToShow) {
        calendarDays.push({
            date: moment(endOfMonth).add(1, 'month').date(nextMonthDay).toDate(),
            isCurrentMonth: false,
        });
        nextMonthDay++;
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {WEEK_DAYS.map(day => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
        {calendarDays.map((dayObj, index) => {
          const isToday = moment(dayObj.date).isSame(moment(), 'day');
          // ==== 修改：找到該日期的婚禮事件，並獲取其狀態顏色 ====
          const weddingEventForDay = weddingEvents.find(event =>
            moment(event.date).isSame(dayObj.date, 'day')
          );
          const weddingStatusColorClass = weddingEventForDay ? getStatusColorClass(weddingEventForDay.status) : '';


          return (
            <div
              key={index}
              className={`text-center p-2 rounded-md transition-colors duration-150
                          ${dayObj.isCurrentMonth ? 'text-gray-800' : 'text-gray-400'}
                          ${isToday ? 'bg-sky-200 font-bold' : ''}
                          ${weddingStatusColorClass} ${weddingEventForDay ? 'font-bold' : ''} 
                          cursor-default`}
            >
              {dayObj.date.getDate()}
            </div>
          );
        })}
      </div>
    );
  }, [safeDisplayDate, weddingEvents, getStatusColorClass]); // <-- 將 weddingEvents 加入依賴陣列

  // 生成年份視圖 (顯示月份)
  const renderYearView = useCallback(() => {
    const year = safeDisplayDate.getFullYear();
    return (
      <div className="grid grid-cols-3 gap-2">
        {MONTH_NAMES.map((monthName, index) => {
          const monthDate = new Date(year, index, 1);
          const isSelected = selectedMonth && moment(monthDate).format('YYYY-MM') === moment(selectedMonth).format('YYYY-MM');
          const isCurrentMonth = moment(monthDate).isSame(moment(), 'month');

          // 檢查月份是否在允許的日期範圍內
          const isMonthOutOfRange = (minDate && moment(monthDate).isBefore(moment(minDate).startOf('month'), 'month')) ||
                                   (maxDate && moment(monthDate).isAfter(moment(maxDate).endOf('month'), 'month'));

          return (
            <div
              key={monthName}
              className={`text-center p-3 rounded-md transition-colors duration-150
                          ${isMonthOutOfRange ? 'text-gray-400 cursor-not-allowed' : 'text-gray-800 cursor-pointer hover:bg-sky-200'}
                          ${isSelected ? 'bg-sky-500 text-white font-bold' : ''}
                          ${isCurrentMonth && !isSelected && !isMonthOutOfRange ? 'bg-sky-100' : ''}`}
              onClick={() => !isMonthOutOfRange && handleMonthClick(monthDate)}
            >
              {monthName}
            </div>
          );
        })}
      </div>
    );
  }, [safeDisplayDate, selectedMonth, minDate, maxDate, handleMonthClick]);

  // 生成十年視圖 (顯示年份)
  const renderDecadeView = useCallback(() => {
    const startYear = Math.floor(safeDisplayDate.getFullYear() / 10) * 10;
    const years = [];
    for (let i = 0; i < 12; i++) { // 顯示當前十年及前後各一年 (例如 2020-2029 的會顯示 2019 到 2030)
      years.push(startYear - 1 + i);
    }

    return (
      <div className="grid grid-cols-3 gap-2">
        {years.map(year => {
          const yearDate = new Date(year, 0, 1); // 代表該年份的第一天
          const isSelectedYear = selectedMonth && moment(selectedMonth).year() === year;
          const isCurrentYear = moment(yearDate).isSame(moment(), 'year');

          // 檢查年份是否在允許的日期範圍內
          const isYearOutOfRange = (minDate && year < moment(minDate).year()) ||
                                   (maxDate && year > moment(maxDate).year());

          return (
            <div
              key={year}
              className={`text-center p-3 rounded-md transition-colors duration-150
                          ${isYearOutOfRange ? 'text-gray-400 cursor-not-allowed' : 'text-gray-800 cursor-pointer hover:bg-sky-200'}
                          ${isSelectedYear ? 'bg-sky-500 text-white font-bold' : ''}
                          ${isCurrentYear && !isSelectedYear && !isYearOutOfRange ? 'bg-sky-100' : ''}`}
              onClick={() => !isYearOutOfRange && handleYearClick(year)}
            >
              {year}
            </div>
          );
        })}
      </div>
    );
  }, [safeDisplayDate, selectedMonth, minDate, maxDate, handleYearClick]);


  // 導航：上一個
  const handlePrev = useCallback(() => {
    if (currentView === 'month') {
      setDisplayDate(moment(safeDisplayDate).subtract(1, 'month').toDate());
    } else if (currentView === 'year') {
      setDisplayDate(moment(safeDisplayDate).subtract(1, 'year').toDate());
    } else if (currentView === 'decade') {
      setDisplayDate(moment(safeDisplayDate).subtract(10, 'year').toDate());
    }
  }, [currentView, safeDisplayDate]);

  // 導航：下一個
  const handleNext = useCallback(() => {
    if (currentView === 'month') {
      setDisplayDate(moment(safeDisplayDate).add(1, 'month').toDate());
    } else if (currentView === 'year') {
      setDisplayDate(moment(safeDisplayDate).add(1, 'year').toDate());
    } else if (currentView === 'decade') {
      setDisplayDate(moment(safeDisplayDate).add(10, 'year').toDate());
    }
  }, [currentView, safeDisplayDate]);

  // 點擊日曆標題切換視圖
  const handleHeaderClick = useCallback(() => {
    if (currentView === 'month') {
      setCurrentView('year'); // 從日期視圖切換到月份視圖
    } else if (currentView === 'year') {
      setCurrentView('decade'); // 從月份視圖切換到年份視圖
    }
    // decade view 不再向上切換
  }, [currentView]);

  // 顯示日曆標題
  const renderHeaderTitle = () => {
    if (currentView === 'month') {
      return moment(safeDisplayDate).format('YYYY年 M月');
    } else if (currentView === 'year') {
      return safeDisplayDate.getFullYear();
    } else if (currentView === 'decade') {
      const startYear = Math.floor(safeDisplayDate.getFullYear() / 10) * 10;
      return `${startYear} - ${startYear + 9}`;
    }
    return '';
  };

  // 清除篩選的處理函式
  const handleClearFilter = useCallback(() => {
    setDisplayDate(new Date()); // 設定顯示日期為今天
    setCurrentView('month'); // 回到月份的日期視圖
    if (onClear) { // 如果有傳入 onClear 函式，就呼叫它
      onClear(); // 通知父元件清除 selectedMonth
    }
  }, [onClear]); // 依賴 onClear prop

  return (
    <div className="custom-calendar-container bg-white shadow-md rounded-lg p-4 w-full max-w-sm mx-auto">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handlePrev}
          className="px-2 py-1 rounded-md hover:bg-gray-200 text-gray-700 font-bold"
        >
          &lt;
        </button>

        <div
          className="text-lg font-semibold text-gray-800 cursor-pointer hover:text-sky-600"
          onClick={handleHeaderClick}
        >
          {renderHeaderTitle()}
        </div>

        <button
          onClick={handleNext}
          className="px-2 py-1 rounded-md hover:bg-gray-200 text-gray-700 font-bold"
        >
          &gt;
        </button>
      </div>

      {currentView === 'month' && renderMonthView()}
      {currentView === 'year' && renderYearView()}
      {currentView === 'decade' && renderDecadeView()}

      <div className="mt-4 text-center">
        {selectedMonth && ( // 只有在有選取月份時才顯示清除按鈕
            <button
              onClick={handleClearFilter}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 font-semibold transition-colors duration-150"
            >
              清除月份篩選
            </button>
        )}
      </div>
    </div>
  );
}

export default CustomMonthPickerCalendar;
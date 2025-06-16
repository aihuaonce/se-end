import React from "react";

const tasks = [
  { name: "設計階段", start: 0, duration: 3 },
  { name: "開發階段", start: 3, duration: 5 },
  { name: "測試階段", start: 8, duration: 2 },
];

const GanttChart = () => {
  return (
    <div className="w-full border border-gray-300 p-4">
      {tasks.map((task, index) => (
        <div key={index} className="mb-2">
          <div className="text-sm mb-1">{task.name}</div>
          <div className="relative h-6 bg-gray-100">
            <div
              className="absolute h-6 bg-blue-500 rounded"
              style={{
                left: `${task.start * 40}px`,
                width: `${task.duration * 40}px`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default GanttChart;

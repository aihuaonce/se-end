import React from 'react';

function HomePage() {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">專案清單</h2>
      <table className="table-auto w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th>專案ID</th>
            <th>客戶</th>
            <th>婚禮日期</th>
            <th>狀態</th>
          </tr>
        </thead>
        <tbody>
            <tr className="text-center border-t">
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
        </tbody>
      </table>
    </div>
  );
}

export default HomePage;
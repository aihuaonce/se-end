import React from 'react';

export default function VendorDetailModal({ vendorData, onClose }) {
  if (!vendorData) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg transform scale-100 transition-transform duration-300">
        <h2 className="text-2xl font-bold mb-6 text-pink-700 text-center">廠商詳情: {vendorData.name}</h2>
        
        <div className="space-y-3 text-gray-800 mb-6">
          <p><strong>類別:</strong> {vendorData.category}</p>
          <p><strong>聯絡人:</strong> {vendorData.contactPerson}</p>
          <p><strong>電話:</strong> {vendorData.phone}</p>
          <p><strong>Email:</strong> {vendorData.email}</p>
          <p><strong>評分:</strong> {vendorData.rating} / 5</p>
          <p><strong>價格區間:</strong> {vendorData.priceRange}</p>
          <p><strong>描述:</strong> {vendorData.description}</p>
          {vendorData.website && (
            <p><strong>網站:</strong> <a href={vendorData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{vendorData.website}</a></p>
          )}
          {vendorData.portfolioLink && (
            <p><strong>作品集:</strong> <a href={vendorData.portfolioLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">點此查看</a></p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-full text-gray-700 font-semibold hover:bg-gray-100 transition duration-300 ease-in-out"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
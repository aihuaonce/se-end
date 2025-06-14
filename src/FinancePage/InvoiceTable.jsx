import React from 'react';

export default function InvoiceTable({ invoices, onInitiatePayment, API_URL }) {
  const handlePrintInvoice = async (invoice) => {
    if (typeof window.jsPDF === 'undefined' || typeof window.html2canvas === 'undefined') {
      console.error("PDF export libraries not loaded yet.");
      alert("PDF 匯出功能尚未載入，請稍後再試。");
      return;
    }

    const invoiceContent = `
      <div style="font-family: 'Inter', sans-serif; padding: 20px; color: #333; width: 210mm; min-height: 297mm; margin: 0 auto; box-sizing: border-box; background-color: white;">
        <h1 style="text-align: center; color: #C9C2B2; margin-bottom: 20px;">發票 #${invoice.id}</h1>
        <div style="margin-bottom: 20px;">
          <p><strong>公司名稱:</strong> ${invoice.customer_company_name}</p>
          <p><strong>負責人姓名:</strong> ${invoice.customer_contact_person || 'N/A'}</p>
          <p><strong>開立日期:</strong> ${invoice.issueDate}</p>
          <p><strong>繳款截止日:</strong> ${invoice.dueDate}</p>
          <p><strong>狀態:</strong> ${invoice.paid}</p>
          <p><strong>已付金額:</strong> NT$ ${invoice.amount_paid?.toLocaleString()}</p>
          <p><strong>尚未支付:</strong> NT$ ${(invoice.amount - invoice.amount_paid).toLocaleString()}</p>
          <p><strong>預計分期數:</strong> ${invoice.total_installments || 1} 期</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">項目</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">金額 (NT$)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">服務費</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${invoice.amount?.toLocaleString()}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">總金額</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">NT$ ${invoice.amount?.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        <p style="text-align: right; margin-top: 30px;">感謝您的惠顧！</p>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>發票 #' + invoice.id + '</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      @page { size: A4; margin: 10mm; }
      body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; }
      h1, h2, h3, h4, h5, h6 { color: #C9C2B2; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f2f2f2; }
      .text-right { text-align: right; }
      .font-bold { font-weight: bold; }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write(invoiceContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();

    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };
  };

  return (
    <div>
      <h3 className="text-3xl font-bold mb-6 text-[#C9C2B2]">發票管理</h3>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#C9C2B2] text-white">
            <tr>
              <th className="p-3 text-left text-sm font-semibold tracking-wider rounded-tl-lg">發票號碼</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">公司名稱</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">負責人姓名</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">開立日期</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">繳款截止日</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider">總金額</th>
              <th className="p-3 text-right text-sm font-semibold tracking-wider">已付金額</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">狀態</th>
              <th className="p-3 text-left text-sm font-semibold tracking-wider">分期數</th>
              <th className="p-3 text-center text-sm font-semibold tracking-wider rounded-tr-lg">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.length > 0 ? (
              invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.id}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.customer_company_name}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.customer_contact_person || 'N/A'}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.issueDate}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.dueDate}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {inv.amount?.toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800 text-right">NT$ {inv.amount_paid?.toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${inv.paid === '已付' ? 'bg-green-100 text-green-800' :
                        (inv.paid === '未付' || inv.paid === '逾期' || inv.paid === '部分付款' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800')}`}>
                      {inv.paid}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap text-sm text-gray-800">{inv.total_installments}</td>
                  <td className="p-3 whitespace-nowrap text-center space-x-2">
                    {(inv.paid === '未付' || inv.paid === '部分付款' || inv.paid === '逾期') && (
                      <button
                        onClick={() => onInitiatePayment(inv)}
                        className="px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-full shadow-md hover:bg-green-600 transition duration-300 ease-in-out transform hover:scale-105"
                      >
                        付款
                      </button>
                    )}
                    <button
                      onClick={() => handlePrintInvoice(inv)}
                      className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-full shadow-md hover:bg-blue-600 transition duration-300 ease-in-out transform hover:scale-105"
                    >
                      列印
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="p-4 text-center text-gray-500">沒有發票數據。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
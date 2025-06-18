const express = require('express');
const router = express.Router();
const pool = require('../db'); // 假設 db.js 導出了一個 MySQL 連接池 (使用 mysql2/promise)
const moment = require('moment'); // 用於日期驗證

// 輔助函數：統一處理資料庫錯誤響應
const sendDbError = (res, routeName, error, message = "伺服器內部錯誤") => {
  console.error(`[${routeName}] 資料庫操作錯誤:`, error);
  res.status(500).json({
    message: `${message}: ${error.message}`,
    code: error.code || 'UNKNOWN_DB_ERROR'
  });
};

/**
 * @route GET /api/finance/overview
 * @desc 獲取財務概覽數據 (總營收、代收款、發票張數、總支出)
 * @access Public
 */
router.get('/overview', async (req, res) => {
  // 這個路由不需要事務
  try {
    // 計算總營收 (已付款的發票金額)
    // 這裡我們假設 '已付' 和 '部分付款' 的發票中的 'amount_paid' 算作已收營收
    const [revenueData] = await pool.execute(`
      SELECT COALESCE(SUM(amount_paid), 0.00) AS totalRevenue
      FROM invoices
      WHERE status IN ('已付', '部分付款')
    `);
    const totalRevenue = revenueData[0].totalRevenue;

    // 計算總代收款 (未付和部分付款、逾期發票的未支付金額總和)
    const [receivablesData] = await pool.execute(`
      SELECT COALESCE(SUM(total_amount - amount_paid), 0.00) AS totalReceivables
      FROM invoices
      WHERE status IN ('未付', '部分付款', '逾期') AND (total_amount - amount_paid) > 0 -- 確保未付金額大於0
    `);
    const totalReceivables = receivablesData[0].totalReceivables;

    // 計算發票總張數
    const [invoiceCountData] = await pool.execute(`
      SELECT COUNT(invoice_id) AS invoiceCount
      FROM invoices
    `);
    const invoiceCount = invoiceCountData[0].invoiceCount;

    // 計算總支出 (所有 wedding_expenses 金額總和)
    const [expensesData] = await pool.execute(`
      SELECT COALESCE(SUM(amount), 0.00) AS totalExpenses
      FROM wedding_expenses
    `);
    const totalExpenses = expensesData[0].totalExpenses;

    res.json({
      totalRevenue: parseFloat(totalRevenue),
      totalReceivables: parseFloat(totalReceivables),
      invoiceCount: parseInt(invoiceCount, 10),
      totalExpenses: parseFloat(totalExpenses)
    });

  } catch (error) {
    sendDbError(res, 'GET /api/finance/overview', error, '無法獲取財務概覽數據');
  }
});

/**
 * @route GET /api/finance/invoices
 * @desc 獲取所有發票數據 (包含公司名稱和負責人姓名，以及分期數和已付款次數)
 * @access Public
 */
router.get('/invoices', async (req, res) => {
  // 這個路由不需要事務
  try {
    // 從 invoices 表和 customers 表 JOIN 查詢
    const [rows] = await pool.execute(`
      SELECT
          i.invoice_id AS id,          -- 發票ID (前端使用 id)
          wp.project_name,             -- 婚禮專案名稱 (從 wedding_projects)
          i.customer_id,               -- 客戶ID
          c.name AS customer_company_name, -- 客戶名稱 (從 customers)
          c.contact_person AS customer_contact_person, -- 客戶聯絡人 (從 customers)
          DATE_FORMAT(i.issue_date, '%Y-%m-%d') AS issueDate,    -- 開立日期
          DATE_FORMAT(i.due_date, '%Y-%m-%d') AS dueDate,        -- 繳款截止日
          i.total_amount AS amount,      -- 發票總金額
          i.amount_paid,                 -- 已付款金額
          i.status AS paid,              -- 發票狀態 (前端可能使用 paid 欄位來表示狀態)
          i.total_installments,          -- 預計分期數
          (SELECT COALESCE(COUNT(payment_id), 0) FROM customer_payments WHERE invoice_id = i.invoice_id AND status = '已付款') AS payments_count -- 計算已付款的次數
      FROM invoices i
      JOIN customers c ON i.customer_id = c.customer_id
      LEFT JOIN wedding_projects wp ON i.project_id = wp.project_id -- 與 wedding_projects JOIN
      ORDER BY i.issue_date DESC
    `);
    res.json(rows);
  } catch (error) {
    sendDbError(res, 'GET /api/finance/invoices', error, '無法獲取發票數據');
  }
});

/**
 * @route POST /api/finance/process-payment
 * @desc 處理客戶付款，更新發票狀態並記錄付款與日記帳分錄
 * @access Public
 */
router.post('/process-payment', async (req, res) => {
  // 接收前端數據
  const { invoiceId, paymentAmount, paymentMethod, paymentDate = new Date().toISOString().split('T')[0], notes } = req.body; // 接收 notes

  // 驗證輸入
  if (!invoiceId || !paymentAmount || parseFloat(paymentAmount) <= 0 || !paymentMethod || !paymentDate) {
    return res.status(400).json({ message: '缺少必要的付款資訊 (發票ID, 金額, 方式, 日期)。' });
  }
  // 驗證日期格式
  if (!moment(paymentDate, 'YYYY-MM-DD', true).isValid()) {
    return res.status(400).json({ message: "無效的付款日期格式 (應為 YYYY-MM-DD)" });
  }


  let connection; // 宣告 connection 變數在 try 塊外部
  try {
    connection = await pool.getConnection(); // 從連接池獲取連接
    await connection.beginTransaction(); // 開始事務

    // 1. 獲取當前發票資訊並鎖定行
    const [invoiceRows] = await connection.execute(
      `SELECT total_amount, amount_paid, customer_id, project_id, status FROM invoices WHERE invoice_id = ? FOR UPDATE`,
      [invoiceId]
    );

    if (invoiceRows.length === 0) {
      throw new Error('找不到指定的發票。');
    }

    const invoice = invoiceRows[0];
    const newAmountPaid = parseFloat(invoice.amount_paid) + parseFloat(paymentAmount);
    let newInvoiceStatus = invoice.status; // 注意：這裡使用 newInvoiceStatus，以區分發票狀態和付款記錄狀態

    if (newAmountPaid >= invoice.total_amount) {
      newInvoiceStatus = '已付';
    } else if (newAmountPaid > 0 && newAmountPaid < invoice.total_amount) {
      newInvoiceStatus = '部分付款';
    } else {
      // 如果支付金額為0或無效（已在前面檢查），或者 amount_paid 沒有增加，保持原狀態
      newInvoiceStatus = invoice.status; // 保持原來的發票狀態
    }

    // 2. 更新 invoices 表
    await connection.execute(
      `UPDATE invoices SET amount_paid = ?, status = ? WHERE invoice_id = ?`,
      [newAmountPaid, newInvoiceStatus, invoiceId]
    );

    // 3. 插入 customer_payments 表
    // payment_status 在 customer_payments 表中應為 '已付款' 或其他表示這筆交易狀態的值
    const paymentStatusForRecord = '已付款'; // 假設前端發來的付款都是成功的
    const [paymentResult] = await connection.execute(
      `INSERT INTO customer_payments (project_id, customer_id, invoice_id, payment_date, amount, method, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, // 新增 notes 欄位
      [invoice.project_id, invoice.customer_id, invoiceId, paymentDate, parseFloat(paymentAmount), paymentMethod, paymentStatusForRecord, notes || null] // 儲存 notes
    );
    const newPaymentId = paymentResult.insertId; // 獲取新插入的 payment_id

    // 4. 創建日記帳分錄
    const description = `收到發票 #${invoiceId} 的款項 (payment_id: ${newPaymentId})，方式: ${paymentMethod}`; // 摘要包含 payment_id
    const [journalEntryResult] = await connection.execute(
      `INSERT INTO journal_entries (entry_date, description, reference_id, reference_type)
        VALUES (?, ?, ?, ?)`,
      [paymentDate, description, newPaymentId, 'customer_payment'] // reference_id 是 INT，直接用 newPaymentId
    );
    const newJournalEntryId = journalEntryResult.insertId; // 獲取新插入的 entry_id

    // 確定借方會計科目 (現金/銀行存款) - 使用 account_number 查詢 account_id
    let debitAccountId;
    // 注意：這裡的會計科目邏輯應與你的會計制度匹配。1010現金，1020銀行存款是常見假設。
    if (paymentMethod === '現金') {
      const [cashAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE account_number = '1010'`);
      debitAccountId = cashAccount[0]?.account_id;
    } else if (paymentMethod === '銀行轉帳' || paymentMethod === '信用卡' || paymentMethod === '線上付款') {
      const [bankAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE account_number = '1020'`);
      debitAccountId = bankAccount[0]?.account_id;
    } else {
      // 對於 '其他' 支付方式，可以根據實際情況確定借方科目，或者報錯
      // 假設 '其他' 也是存入銀行
      const [bankAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE account_number = '1020'`);
      debitAccountId = bankAccount[0]?.account_id;
      // throw new Error(`未知的支付方式: ${paymentMethod}`);
    }


    // 確定貸方會計科目 (應收帳款) - 使用 account_number 查詢 account_id
    const [accountsReceivableAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE account_number = '1200'`);
    const creditAccountId = accountsReceivableAccount[0]?.account_id;

    if (!debitAccountId || !creditAccountId) {
      // 檢查是否找到有效的會計科目 ID
      throw new Error('無法找到對應的會計科目（現金/銀行或應收帳款）。請檢查會計科目設置。');
    }

    // 5. 插入日記帳分錄明細 (借方：現金/銀行存款 - 增加)
    await connection.execute(
      `INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description)
        VALUES (?, ?, ?, ?, ?)`,
      [newJournalEntryId, debitAccountId, parseFloat(paymentAmount), 0.00, `收到發票 #${invoiceId} 的款項`]
    );

    // 6. 插入日記帳分錄明細 (貸方：應收帳款 - 減少)
    await connection.execute(
      `INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description)
        VALUES (?, ?, ?, ?, ?)`,
      [newJournalEntryId, creditAccountId, 0.00, parseFloat(paymentAmount), `減少應收帳款 #${invoiceId}`]
    );

    await connection.commit(); // 提交事務
    console.log(`[Backend] 成功處理發票 ${invoiceId} 付款，金額 ${paymentAmount}，發票狀態更新為 ${newInvoiceStatus}`);
    res.status(200).json({ message: '付款已成功處理並記錄', newStatus: newInvoiceStatus, newAmountPaid: newAmountPaid }); // 返回發票的最新狀態

  } catch (error) {
    if (connection) {
      await connection.rollback(); // 發生錯誤時回滾事務
    }
    sendDbError(res, 'POST /api/finance/process-payment', error, '處理付款時發生錯誤');
  } finally {
    if (connection) {
      connection.release(); // 釋放連線
    }
  }
});


/**
 * @route GET /api/finance/customers
 * @desc 獲取所有客戶數據 (用於下拉選單，與客戶管理不同)
 * @access Public
 */
router.get('/customers', async (req, res) => {
  // 這個路由不需要事務
  try {
    // 從 customers 表格獲取客戶列表
    const [rows] = await pool.execute(`
      SELECT customer_id, name, contact_person, phone, email
      FROM customers
      ORDER BY name ASC
    `);
    res.json(rows);
  } catch (error) {
    sendDbError(res, 'GET /api/finance/customers', error, '無法獲取客戶數據');
  }
});

/**
 * @route GET /api/finance/customers/:customerId/details
 * @desc 獲取特定客戶的發票和付款詳情 (包含付款次數/分期數)
 * @access Public
 */
router.get('/customers/:customerId/details', async (req, res) => {
  const customerId = req.params.customerId;
  // 簡單驗證輸入
  if (!customerId || isNaN(parseInt(customerId))) {
    return res.status(400).json({ message: '無效的客戶 ID。' });
  }

  // 這個路由不需要事務
  try {
    // 獲取客戶基本資訊
    const [customerInfo] = await pool.execute(
      `SELECT customer_id, name, contact_person, phone, email FROM customers WHERE customer_id = ?`,
      [customerId]
    );

    if (customerInfo.length === 0) {
      return res.status(404).json({ message: '找不到指定的客戶。' });
    }

    // 獲取該客戶的所有發票，並計算已收到的付款次數
    const [invoicesData] = await pool.execute(`
      SELECT
          i.invoice_id AS id,
          wp.project_name, -- 關聯到專案名稱 (從 wedding_projects)
          i.total_amount AS amount,
          i.amount_paid,
          i.status AS paid, -- 發票狀態
          DATE_FORMAT(i.issue_date, '%Y-%m-%d') AS issueDate,
          DATE_FORMAT(i.due_date, '%Y-%m-%d') AS dueDate,
          i.total_installments,
          (SELECT COALESCE(COUNT(payment_id), 0) FROM customer_payments WHERE invoice_id = i.invoice_id AND status = '已付款') AS payments_count -- 計算已付款的次數
      FROM invoices i
      LEFT JOIN wedding_projects wp ON i.project_id = wp.project_id -- 與 wedding_projects JOIN
      WHERE i.customer_id = ?
      ORDER BY i.issue_date DESC
    `, [customerId]);

    // 獲取該客戶的所有付款記錄 (僅用於顯示已付款的詳細列表)
    const [paymentsData] = await pool.execute(`
      SELECT
          cp.payment_id,
          DATE_FORMAT(cp.payment_date, '%Y-%m-%d') AS payment_date,
          cp.amount,
          cp.method,
          cp.status, -- 付款記錄狀態
          cp.invoice_id,
          wp.project_name -- 關聯到專案名稱
      FROM customer_payments cp
      LEFT JOIN wedding_projects wp ON cp.project_id = wp.project_id
      WHERE cp.customer_id = ? AND cp.status = '已付款' -- 只顯示已付款的記錄
      ORDER BY cp.payment_date DESC
    `, [customerId]);


    res.json({
      customer: customerInfo[0],
      invoices: invoicesData,
      payments: paymentsData
    });

  } catch (error) {
    sendDbError(res, 'GET /api/finance/customers/:customerId/details', error, '無法獲取客戶詳情');
  }
});


/**
 * @route GET /api/finance/payments
 * @desc 獲取所有顧客付款紀錄 (只顯示已付款的記錄)
 * @access Public
 */
router.get('/payments', async (req, res) => {
  // 這個路由不需要事務
  try {
    // 從 customer_payments, wedding_projects, customers JOIN 查詢
    const [rows] = await pool.execute(`
      SELECT
          cp.payment_id,
          DATE_FORMAT(cp.payment_date, '%Y-%m-%d') AS payment_date,
          cp.amount,
          cp.method,
          cp.status, -- 付款記錄狀態
          wp.project_name,          -- 婚禮專案名稱 (從 wedding_projects)
          c.name AS customer_name,  -- 客戶名稱 (從 customers)
          cp.invoice_id             -- 對應的發票ID
      FROM customer_payments cp
      LEFT JOIN wedding_projects wp ON cp.project_id = wp.project_id
      JOIN customers c ON cp.customer_id = c.customer_id
      WHERE cp.status = '已付款' -- 僅返回已付款的記錄
      ORDER BY cp.payment_date DESC
    `);
    res.json(rows);
  }
  catch (error) {
    sendDbError(res, 'GET /api/finance/payments', error, '無法獲取付款紀錄');
  }
});

/**
 * @route GET /api/finance/expenses
 * @desc 獲取所有婚禮支出紀錄
 * @access Public
 */
router.get('/expenses', async (req, res) => {
  // 這個路由不需要事務
  try {
    // 從 wedding_expenses 及相關聯的表 JOIN 查詢
    const [rows] = await pool.execute(`
      SELECT
          we.expense_id,
          wp.project_name,            -- 專案名稱 (從 wedding_projects)
          v.name AS vendor_name,      -- 供應商名稱 (從 vendors)
          ec.name AS category_name,   -- 支出分類名稱 (從 expense_categories)
          we.expense_item_description AS description, -- 支出項目描述
          we.amount,
          DATE_FORMAT(we.expense_date, '%Y-%m-%d') AS expense_date,
          we.vendor_invoice_number,
          we.responsible_person,      -- 負責人
          we.notes,                   -- 備註
          COALESCE(a.name, 'N/A') AS accounting_account_name,     -- 會計科目名稱，使用 COALESCE 處理 NULL (從 accounts)
          a.account_id AS accounting_account_id -- 返回科目ID方便前端使用
      FROM wedding_expenses we
      LEFT JOIN expense_categories ec ON we.category_id = ec.category_id
      LEFT JOIN vendors v ON we.vendor_id = v.vendor_id
      LEFT JOIN wedding_projects wp ON we.project_id = wp.project_id
      LEFT JOIN accounts a ON we.accounting_account_id = a.account_id
      ORDER BY we.expense_date DESC
    `);
    res.json(rows);
  } catch (error) {
    sendDbError(res, 'GET /api/finance/expenses', error, '無法獲取支出紀錄');
  }
});

/**
 * @route POST /api/finance/expenses
 * @desc 新增一筆支出並創建對應的日記帳分錄
 * @access Public
 */
router.post('/expenses', async (req, res) => {
  const {
    project_id,
    vendor_id,
    category_id,
    expense_item_description,
    amount,
    expense_date,
    vendor_invoice_number,
    payment_method,
    notes,
    responsible_person, // 負責人
    accounting_account_id // 對應的費用科目ID
  } = req.body;

  let connection; // 宣告 connection 變數在 try 塊外部
  try {
    connection = await pool.getConnection(); // 從連接池獲取連接
    await connection.beginTransaction(); // 開始事務

    // 處理和驗證輸入數據
    const parsedProjectId = project_id ? parseInt(project_id) : null;
    const parsedVendorId = vendor_id ? parseInt(vendor_id) : null;
    const parsedCategoryId = parseInt(category_id);
    const parsedAmount = parseFloat(amount);
    const parsedAccountingAccountId = parseInt(accounting_account_id); // 前端應該提供有效的費用科目ID

    // 驗證所有必要字段，並確保數字和ID有效
    if (!expense_item_description || isNaN(parsedAmount) || parsedAmount <= 0 || !expense_date ||
      isNaN(parsedCategoryId) || parsedCategoryId <= 0 || !payment_method || !responsible_person || // responsible_person 也列為必填
      isNaN(parsedAccountingAccountId) || parsedAccountingAccountId <= 0) { // accounting_account_id 也列為必填且有效
      return res.status(400).json({ message: '請提供有效的支出項目描述、金額、日期、分類、支付方式、負責人及會計科目。' });
    }
    // 驗證日期格式
    if (!moment(expense_date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ message: "無效的支出日期格式 (應為 YYYY-MM-DD)" });
    }


    // 1. 插入到 wedding_expenses 表
    const [expenseResult] = await connection.execute( // 使用 connection.execute
      `INSERT INTO wedding_expenses
      (project_id, vendor_id, category_id, expense_item_description, amount, expense_date, vendor_invoice_number, payment_method, responsible_person, notes, accounting_account_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parsedProjectId, // project_id 可以為 null
        parsedVendorId, // vendor_id 可以為 null
        parsedCategoryId,
        expense_item_description,
        parsedAmount,
        expense_date, // 直接使用已驗證的日期字串
        vendor_invoice_number || null, // 可選欄位，如果為空則存入 null
        payment_method,
        responsible_person,
        notes || null, // 可選欄位，如果為空則存入 null
        parsedAccountingAccountId // 費用科目ID
      ]
    );
    const newExpenseId = expenseResult.insertId;

    // 2. 創建日記帳分錄
    let journalDescription = `支付 ${expense_item_description}`;
    if (responsible_person) {
      journalDescription += ` (負責人: ${responsible_person})`;
    }
    if (vendor_invoice_number) {
      journalDescription += ` 廠商發票號碼: ${vendor_invoice_number}`;
    }
    if (notes) {
      journalDescription += ` 備註: ${notes}`;
    }


    const [journalEntryResult] = await connection.execute( // 使用 connection.execute
      `INSERT INTO journal_entries (entry_date, description, reference_id, reference_type)
      VALUES (?, ?, ?, ?)`,
      [expense_date, journalDescription, newExpenseId, 'wedding_expense'] // reference_id 是 INT，直接用 newExpenseId
    );
    const newJournalEntryId = journalEntryResult.insertId;

    // 3. 確定借方會計科目 (費用科目) - 直接使用前端傳來的 ID
    const debitAccountId = parsedAccountingAccountId;


    // 4. 確定貸方會計科目 (現金/銀行/應付帳款) - 使用 account_number 查詢 account_id
    let creditAccountId;
    // 根據支付方式查找對應的資產或負債科目
    if (payment_method === '現金') {
      const [cashAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE account_number = '1010'`);
      creditAccountId = cashAccount[0]?.account_id;
    } else if (payment_method === '銀行轉帳' || payment_method === '信用卡' || payment_method === '線上付款') { // 信用卡支付也通常透過銀行帳戶扣款
      const [bankAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE account_number = '1020'`);
      creditAccountId = bankAccount[0]?.account_id;
    } else if (payment_method === '支票') {
      // 支票支付通常對應銀行存款減少，或者如果支票未兌現，可能是應付票據
      // 假設簡單處理為銀行存款減少
      const [bankAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE account_number = '1020'`);
      creditAccountId = bankAccount[0]?.account_id;
    } else if (payment_method === '其他') {
      // '其他' 支付方式可能對應應付帳款或其他，這裡假設對應應付帳款
      const [otherCreditAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE account_number = '2010'`); // 應付帳款
      creditAccountId = otherCreditAccount[0]?.account_id;
    } else {
      // 如果傳入未知的 payment_method
      throw new Error(`無效或未知的支付方式: ${payment_method}`);
    }


    if (!debitAccountId || !creditAccountId) {
      // 檢查是否找到有效的會計科目 ID
      throw new Error('無法找到對應的會計科目。請檢查會計科目設置。');
    }

    // 5. 插入日記帳分錄明細 (借方：費用科目 - 增加)
    await connection.execute( // 使用 connection.execute
      `INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description)
      VALUES (?, ?, ?, ?, ?)`,
      [newJournalEntryId, debitAccountId, parsedAmount, 0.00, `借方: 支付 ${expense_item_description}`]
    );

    // 6. 插入日記帳分錄明細 (貸方：支付帳戶科目 - 減少)
    await connection.execute( // 使用 connection.execute
      `INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description)
      VALUES (?, ?, ?, ?, ?)`,
      [newJournalEntryId, creditAccountId, 0.00, parsedAmount, `貸方: 透過 ${payment_method} 支付`]
    );

    await connection.commit(); // 提交事務
    console.log(`[Backend] 成功新增支出，ID: ${newExpenseId}，並記錄到日記帳 ${newJournalEntryId}`);
    res.status(201).json({ message: '支出已成功新增並記錄到日記帳', expenseId: newExpenseId }); // 新增成功返回 201

  } catch (error) {
    if (connection) { // 確保連接已獲取到
      await connection.rollback();
    }
    sendDbError(res, 'POST /api/finance/expenses', error, '新增支出時發生錯誤');
  } finally {
    if (connection) { // 確保連接已獲取到
      connection.release();
    }
  }
});


/**
 * @route GET /api/finance/pettycash
 * @desc 獲取零用金收支紀錄 (基於日記帳中現金科目)
 * @access Public
 */
router.get('/pettycash', async (req, res) => {
  // 這個路由不需要事務
  try {
    // 假設 '現金' 科目的 account_number 是 '1010'
    const [rows] = await pool.execute(`
      SELECT
          je.entry_date,
          COALESCE(jel.line_description, je.description) AS description, -- 優先使用明細描述，否則使用主分錄描述
          jel.debit_amount,  -- 現金增加 (收入)
          jel.credit_amount, -- 現金減少 (支出)
          jel.line_id, -- 需要 line_id 作為唯一 key
          je.entry_id
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.entry_id = je.entry_id
      JOIN accounts a ON jel.account_id = a.account_id
      WHERE a.account_number = '1010' -- 過濾只顯示現金科目的交易
      ORDER BY je.entry_date ASC, je.entry_id ASC, jel.line_id ASC -- 按時間排序，以正確計算累計餘額
    `);

    res.json(rows);
  } catch (error) {
    sendDbError(res, 'GET /api/finance/pettycash', error, '無法獲取零用金數據');
  }
});


/**
 * @route POST /api/finance/pettycash/deposit
 * @desc 存入零用金並創建日記帳分錄
 * @access Public (前端會控制主管權限)
 */
router.post('/pettycash/deposit', async (req, res) => {
  const { amount, deposit_date, notes } = req.body;

  // 驗證輸入
  if (!amount || parseFloat(amount) <= 0 || !deposit_date) {
    return res.status(400).json({ message: '請提供有效的存入金額和日期。' });
  }
  // 驗證日期格式
  if (!moment(deposit_date, 'YYYY-MM-DD', true).isValid()) {
    return res.status(400).json({ message: "無效的存入日期格式 (應為 YYYY-MM-DD)" });
  }


  let connection; // 宣告 connection 變數在 try 塊外部
  try {
    connection = await pool.getConnection(); // 從連接池獲取連接
    await connection.beginTransaction(); // 開始事務

    // 1. 創建日記帳分錄
    const description = `存入零用金：NT$ ${parseFloat(amount).toLocaleString()}`;
    const [journalEntryResult] = await connection.execute( // 使用 connection.execute
      `INSERT INTO journal_entries (entry_date, description, reference_type)
      VALUES (?, ?, ?)`,
      [deposit_date, description, 'petty_cash_deposit']
    );
    const newJournalEntryId = journalEntryResult.insertId;

    // 2. 確定借方科目 (現金) 和貸方科目 (通常是銀行存款或其他資產科目，假設為銀行存款) - 使用 account_number 查詢 account_id
    const [cashAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE account_number = '1010'`); // 現金科目
    const debitAccountId = cashAccount[0]?.account_id;

    const [bankAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE account_number = '1020'`); // 銀行存款科目
    const creditAccountId = bankAccount[0]?.account_id;

    if (!debitAccountId || !creditAccountId) {
      throw new Error('無法找到對應的會計科目（現金或銀行存款）。');
    }

    // 3. 插入日記帳分錄明細 (借方：現金 - 增加)
    await connection.execute( // 使用 connection.execute
      `INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description)
      VALUES (?, ?, ?, ?, ?)`,
      [newJournalEntryId, debitAccountId, parseFloat(amount), 0.00, `借方: 從銀行轉入零用金`]
    );

    // 4. 插入日記帳分錄明細 (貸方：銀行存款 - 減少)
    await connection.execute( // 使用 connection.execute
      `INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description)
      VALUES (?, ?, ?, ?, ?)`,
      [newJournalEntryId, creditAccountId, 0.00, parseFloat(amount), `貸方: 減少銀行存款 (存入零用金)`]
    );

    await connection.commit(); // 提交事務
    console.log(`[Backend] 成功存入零用金，金額 ${amount}，記錄到日記帳 ${newJournalEntryId}`);
    res.status(201).json({ message: '零用金已成功存入並記錄。', entryId: newJournalEntryId }); // 新增成功返回 201

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    sendDbError(res, 'POST /api/finance/pettycash/deposit', error, '存入零用金時發生錯誤');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


/**
 * @route GET /api/finance/categories
 * @desc 獲取所有支出分類 (用於下拉選單)
 * @access Public
 */
router.get('/categories', async (req, res) => {
  // 這個路由不需要事務
  try {
    // 從 expense_categories 表格獲取列表
    const [rows] = await pool.execute(`SELECT category_id, name FROM expense_categories ORDER BY name ASC`);
    res.json(rows);
  } catch (error) {
    sendDbError(res, 'GET /api/finance/categories', error, '無法獲取支出分類');
  }
});

/**
 * @route GET /api/finance/vendors
 * @desc 獲取所有供應商 (用於下拉選單)
 * @access Public
 */
router.get('/vendors', async (req, res) => {
  // 這個路由不需要事務
  try {
    // 從 vendors 表格獲取列表
    const [rows] = await pool.execute(`SELECT vendor_id, name FROM vendors ORDER BY name ASC`);
    res.json(rows);
  } catch (error) {
    sendDbError(res, 'GET /api/finance/vendors', error, '無法獲取供應商');
  }
});

/**
 * @route GET /api/finance/projects
 * @desc 獲取所有婚禮專案 (用於下拉選單)
 * @access Public
 */
router.get('/projects', async (req, res) => {
  // 這個路由不需要事務
  try {
    // 從 wedding_projects 表格獲取列表
    const [rows] = await pool.execute(`SELECT project_id, project_name FROM wedding_projects ORDER BY project_name ASC`);
    res.json(rows);
  } catch (error) {
    sendDbError(res, 'GET /api/finance/projects', error, '無法獲取婚禮專案');
  }
});

/**
 * @route GET /api/finance/accounts/expenses
 * @desc 獲取所有費用類會計科目 (用於下拉選單)
 * @access Public
 */
router.get('/accounts/expenses', async (req, res) => {
  // 這個路由不需要事務
  try {
    // 從 accounts 表格獲取費用類科目
    const [rows] = await pool.execute(`
      SELECT account_id, CONCAT(account_number, ' - ', name) AS display_name
      FROM accounts
      WHERE type = '費用'
      ORDER BY account_number ASC
    `);
    res.json(rows);
  } catch (error) {
    sendDbError(res, 'GET /api/finance/accounts/expenses', error, '無法獲取費用科目');
  }
});

/**
 * @route GET /api/finance/monthly-report
 * @desc 獲取每月財務總結報表數據 (來自 monthly_financial_summary VIEW)
 * @access Public
 */
router.get('/monthly-report', async (req, res) => {
  // 這個路由不需要事務
  try {
    // 從 monthly_financial_summary 視圖獲取數據
    const [rows] = await pool.execute(`
      SELECT
        month,
        total_revenue,
        total_expenses,
        net_profit_loss
      FROM monthly_financial_summary
      ORDER BY month ASC
    `);
    res.json(rows);
  } catch (error) {
    sendDbError(res, 'GET /api/finance/monthly-report', error, '無法獲取每月報表數據');
  }
});

/**
 * @route GET /api/finance/expenses-by-category
 * @desc 獲取各支出分類的總金額 (用於圓餅圖)
 * @access Public
 */
router.get('/expenses-by-category', async (req, res) => {
  // 這個路由不需要事務
  try {
    // 從 expense_categories 和 wedding_expenses JOIN 查詢
    const [rows] = await pool.execute(`
      SELECT
          ec.name AS category_name,
          COALESCE(SUM(we.amount), 0) AS amount
      FROM expense_categories ec
      LEFT JOIN wedding_expenses we ON ec.category_id = we.category_id
      GROUP BY ec.name
      ORDER BY amount DESC;
    `);
    res.json(rows);
  }
  catch (error) {
    sendDbError(res, 'GET /api/finance/expenses-by-category', error, '無法獲取按類別劃分的支出數據');
  }
});

/**
 * @route GET /api/finance/revenue-by-project
 * @desc 獲取各專案的總營收 (用於長條圖)
 * @access Public
 */
router.get('/revenue-by-project', async (req, res) => {
  // 這個路由不需要事務
  try {
    // 從 wedding_projects 和 invoices JOIN 查詢
    const [rows] = await pool.execute(`
      SELECT
          wp.project_name,
          COALESCE(SUM(i.amount_paid), 0) AS total_revenue
      FROM wedding_projects wp
      LEFT JOIN invoices i ON wp.project_id = i.project_id AND i.status IN ('已付', '部分付款')
      GROUP BY wp.project_name
      ORDER BY total_revenue DESC;
    `);
    res.json(rows);
  } catch (error) {
    sendDbError(res, 'GET /api/finance/revenue-by-project', error, '無法獲取按專案劃分的營收數據');
  }
});

/**
 * @route GET /api/finance/invoice-payment-methods
 * @desc 獲取客戶付款方式分佈數據
 * @access Public
 */
router.get('/invoice-payment-methods', async (req, res) => {
  // 這個路由不需要事務
  try {
    // 從 customer_payments 表格查詢
    const [rows] = await pool.execute(`
      SELECT
          method,
          COALESCE(SUM(amount), 0) AS total_amount
      FROM customer_payments
      WHERE status = '已付款' -- 僅統計已付款的交易
      GROUP BY method
      ORDER BY total_amount DESC;
    `);
    res.json(rows);
  } catch (error) {
    sendDbError(res, 'GET /api/finance/invoice-payment-methods', error, '無法獲取付款方式分佈數據');
  }
});

/**
 * @route GET /api/finance/invoice-status-distribution
 * @desc 獲取發票狀態分佈數據
 * @access Public
 */
router.get('/invoice-status-distribution', async (req, res) => {
  // 這個路由不需要事務
  try {
    // 從 invoices 表格查詢
    const [rows] = await pool.execute(`
      SELECT
          status,
          COUNT(invoice_id) AS count
      FROM invoices
      GROUP BY status
      ORDER BY count DESC;
    `);
    res.json(rows);
  } catch (error) {
    sendDbError(res, 'GET /api/finance/invoice-status-distribution', error, '無法獲取發票狀態分佈數據');
  }
});

/**
 * @route GET /api/finance/top-customers-by-revenue
 * @desc 獲取前N大客戶的營收數據 (預設前5大)
 * @access Public
 */
router.get('/top-customers-by-revenue', async (req, res) => {
  const limit = parseInt(req.query.limit) || 5; // 可選參數，預設前5名
  // 簡單驗證 limit
  if (isNaN(limit) || limit <= 0) {
    return res.status(400).json({ message: '無效的 limit 參數' });
  }
  // 這個路由不需要事務
  try {
    // 從 customers 和 customer_payments JOIN 查詢
    const [rows] = await pool.execute(`
      SELECT
          c.name AS customer_name,
          COALESCE(SUM(cp.amount), 0) AS total_revenue
      FROM customers c
      JOIN customer_payments cp ON c.customer_id = cp.customer_id
      WHERE cp.status = '已付款'
      GROUP BY c.customer_id, c.name
      ORDER BY total_revenue DESC
      LIMIT ?;
    `, [limit]); // 使用參數化查詢傳遞 LIMIT 值
    res.json(rows);
  } catch (error) {
    sendDbError(res, 'GET /api/finance/top-customers-by-revenue', error, '無法獲取前N大客戶營收數據');
  }
});


module.exports = router;
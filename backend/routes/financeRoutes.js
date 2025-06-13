const express = require('express');
const router = express.Router();
const pool = require('../db'); // 假設 db.js 導出了一個 MySQL 連接池 (使用 mysql2/promise)

/**
 * @route GET /api/finance/overview
 * @desc 獲取財務概覽數據 (總營收、代收款、發票張數、總支出)
 * @access Public
 */
router.get('/overview', async (req, res) => {
  try {
    // 計算總營收 (已付款的發票金額)
    // 這裡我們假設 '已付' 和 '部分付款' 的發票中的 'amount_paid' 算作已收營收
    const [revenueData] = await pool.execute(`
      SELECT COALESCE(SUM(amount_paid), 0.00) AS totalRevenue
      FROM invoices
      WHERE status IN ('已付', '部分付款')
    `);
    const totalRevenue = revenueData[0].totalRevenue;

    // 計算總代收款 (未付和部分付款的發票的未支付金額總和)
    const [receivablesData] = await pool.execute(`
      SELECT COALESCE(SUM(total_amount - amount_paid), 0.00) AS totalReceivables
      FROM invoices
      WHERE status IN ('未付', '部分付款', '逾期')
    `);
    const totalReceivables = receivablesData[0].totalReceivables;

    // 計算發票總張數
    const [invoiceCountData] = await pool.execute(`
      SELECT COUNT(invoice_id) AS invoiceCount
      FROM invoices
    `);
    const invoiceCount = invoiceCountData[0].invoiceCount;

    // 計算總支出 (所有婚禮實際支出金額總和)
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
    console.error('獲取財務概覽數據時發生錯誤:', error);
    res.status(500).json({ message: '伺服器內部錯誤，無法獲取概覽數據', error: error.message });
  }
});

/**
 * @route GET /api/finance/invoices
 * @desc 獲取所有發票數據 (包含公司名稱和負責人姓名，以及分期數和已付款次數)
 * @access Public
 */
router.get('/invoices', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
          i.invoice_id AS id,             -- 發票ID (前端使用 id)
          wp.project_name,                -- 婚禮專案名稱
          i.customer_id,
          c.name AS customer_company_name, -- 客戶公司名稱
          c.contact_person AS customer_contact_person, -- 客戶負責人姓名
          DATE_FORMAT(i.issue_date, '%Y-%m-%d') AS issueDate,     -- 開立日期
          DATE_FORMAT(i.due_date, '%Y-%m-%d') AS dueDate,         -- 繳款截止日
          i.total_amount AS amount,      -- 發票總金額
          i.amount_paid,                 -- 已付款金額
          i.status AS paid,              -- 發票狀態 (前端使用 paid)
          i.total_installments,          -- 預計分期數
          (SELECT COUNT(payment_id) FROM customer_payments WHERE invoice_id = i.invoice_id AND status = '已付款') AS payments_count -- 計算已付款的次數
      FROM invoices i
      JOIN customers c ON i.customer_id = c.customer_id
      LEFT JOIN wedding_projects wp ON i.project_id = wp.project_id
      ORDER BY i.issue_date DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('獲取發票數據時發生錯誤:', error);
    res.status(500).json({ message: '伺服器內部錯誤，無法獲取發票數據', error: error.message });
  }
});

/**
 * @route POST /api/finance/process-payment
 * @desc 處理客戶付款，更新發票狀態並記錄付款與日記帳分錄
 * @access Public
 */
router.post('/process-payment', async (req, res) => {
  const { invoiceId, paymentAmount, paymentMethod, paymentDate = new Date().toISOString().split('T')[0] } = req.body;

  if (!invoiceId || !paymentAmount || parseFloat(paymentAmount) <= 0 || !paymentMethod) {
    return res.status(400).json({ message: '缺少必要的付款資訊 (發票ID, 金額, 方式)' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
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
    let newStatus = invoice.status;

    if (newAmountPaid >= invoice.total_amount) {
      newStatus = '已付';
    } else if (newAmountPaid > 0 && newAmountPaid < invoice.total_amount) {
      newStatus = '部分付款';
    } else {
        newStatus = '未付'; // 如果支付金額為0或無效，保持原狀態
    }

    // 2. 更新 invoices 表
    await connection.execute(
      `UPDATE invoices SET amount_paid = ?, status = ? WHERE invoice_id = ?`,
      [newAmountPaid, newStatus, invoiceId]
    );

    // 3. 插入 customer_payments 表
    const [paymentResult] = await connection.execute(
      `INSERT INTO customer_payments (project_id, customer_id, invoice_id, payment_date, amount, method, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [invoice.project_id, invoice.customer_id, invoiceId, paymentDate, parseFloat(paymentAmount), paymentMethod, newStatus]
    );
    const newPaymentId = paymentResult.insertId; // 獲取 MySQL 的 LAST_INSERT_ID()

    // 4. 創建日記帳分錄
    const description = `收到發票 #${invoiceId} 的款項，方式: ${paymentMethod}`;
    const [journalEntryResult] = await connection.execute(
      `INSERT INTO journal_entries (entry_date, description, reference_id, reference_type)
       VALUES (?, ?, ?, ?)`,
      [paymentDate, description, newPaymentId.toString(), 'customer_payment']
    );
    const newJournalEntryId = journalEntryResult.insertId; // 獲取 MySQL 的 LAST_INSERT_ID()

    // 確定借方會計科目 (現金/銀行存款)
    let debitAccountId;
    if (paymentMethod === '現金') {
      const [cashAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE account_number = '1010'`); // 現金科目
      debitAccountId = cashAccount[0]?.account_id;
    } else if (paymentMethod === '銀行轉帳' || paymentMethod === '信用卡' || paymentMethod === '線上付款') {
      const [bankAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE account_number = '1020'`); // 銀行存款科目
      debitAccountId = bankAccount[0]?.account_id;
    } else {
      throw new Error('無效的支付方式。');
    }

    // 確定貸方會計科目 (應收帳款)
    const [accountsReceivableAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE account_number = '1200'`); // 應收帳款科目
    const creditAccountId = accountsReceivableAccount[0]?.account_id;

    if (!debitAccountId || !creditAccountId) {
      throw new Error('無法找到對應的會計科目。請檢查會計科目設置。');
    }

    // 5. 插入日記帳分錄明細 (借方：現金/銀行存款 - 增加)
    await connection.execute(
      `INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description)
       VALUES (?, ?, ?, ?, ?)`,
      [newJournalEntryId, debitAccountId, parseFloat(paymentAmount), 0.00, `收到付款 (透過 ${paymentMethod})`]
    );

    // 6. 插入日記帳分錄明細 (貸方：應收帳款 - 減少)
    await connection.execute(
      `INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description)
       VALUES (?, ?, ?, ?, ?)`,
      [newJournalEntryId, creditAccountId, 0.00, parseFloat(paymentAmount), `減少應收帳款 #${invoiceId}`]
    );

    await connection.commit(); // 提交事務
    res.status(200).json({ message: '付款已成功處理並記錄', newStatus: newStatus, newAmountPaid: newAmountPaid });

  } catch (error) {
    if (connection) {
      await connection.rollback(); // 發生錯誤時回滾事務
    }
    console.error('處理付款時發生錯誤:', error);
    res.status(500).json({ message: `伺服器內部錯誤，無法處理付款: ${error.message}`, error: error.message });
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
  try {
    const [rows] = await pool.execute(`
      SELECT customer_id, name, contact_person, phone, email
      FROM customers
      ORDER BY name ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error('獲取客戶數據時發生錯誤:', error);
    res.status(500).json({ message: '伺服器內部錯誤，無法獲取客戶數據', error: error.message });
  }
});

/**
 * @route GET /api/finance/customers/:customerId/details
 * @desc 獲取特定客戶的發票和付款詳情 (包含付款次數/分期數)
 * @access Public
 */
router.get('/customers/:customerId/details', async (req, res) => {
  try {
    const { customerId } = req.params;

    // 獲取客戶基本資訊
    const [customerInfo] = await pool.execute(
      `SELECT customer_id, name, contact_person, phone, email FROM customers WHERE customer_id = ?`,
      [customerId]
    );

    if (customerInfo.length === 0) {
      return res.status(404).json({ message: '找不到該客戶。' });
    }

    // 獲取該客戶的所有發票，並計算已收到的付款次數
    const [invoicesData] = await pool.execute(`
      SELECT
          i.invoice_id AS id,
          i.total_amount AS amount,
          i.amount_paid,
          i.status AS paid,
          DATE_FORMAT(i.issue_date, '%Y-%m-%d') AS issueDate,
          DATE_FORMAT(i.due_date, '%Y-%m-%d') AS dueDate,
          i.total_installments,
          (SELECT COUNT(payment_id) FROM customer_payments WHERE invoice_id = i.invoice_id AND status = '已付款') AS payments_count -- 計算已付款的次數
      FROM invoices i
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
          cp.status,
          cp.invoice_id,
          wp.project_name
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
    console.error('獲取客戶詳情時發生錯誤:', error);
    res.status(500).json({ message: '伺服器內部錯誤，無法獲取客戶詳情', error: error.message });
  }
});


/**
 * @route GET /api/finance/payments
 * @desc 獲取所有顧客付款紀錄 (只顯示已付款的記錄)
 * @access Public
 */
router.get('/payments', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
          cp.payment_id,
          DATE_FORMAT(cp.payment_date, '%Y-%m-%d') AS payment_date,
          cp.amount,
          cp.method,
          cp.status,
          wp.project_name,           -- 婚禮專案名稱
          c.name AS customer_name,   -- 客戶名稱
          cp.invoice_id              -- 對應的發票ID
      FROM customer_payments cp
      LEFT JOIN wedding_projects wp ON cp.project_id = wp.project_id
      JOIN customers c ON cp.customer_id = c.customer_id
      WHERE cp.status = '已付款' -- 僅返回已付款的記錄
      ORDER BY cp.payment_date DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('獲取付款紀錄時發生錯誤:', error);
    res.status(500).json({ message: '伺服器內部錯誤，無法獲取付款紀錄', error: error.message });
  }
});

/**
 * @route GET /api/finance/expenses
 * @desc 獲取所有婚禮支出紀錄
 * @access Public
 */
router.get('/expenses', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
          we.expense_id,
          wp.project_name,                     -- 專案名稱
          v.name AS vendor_name,               -- 供應商名稱
          ec.name AS category_name,            -- 支出分類名稱
          we.expense_item_description AS description, -- 支出項目描述
          we.amount,
          DATE_FORMAT(we.expense_date, '%Y-%m-%d') AS expense_date,
          we.vendor_invoice_number,
          we.responsible_person,               -- 負責人
          a.name AS accounting_account_name    -- 會計科目名稱
      FROM wedding_expenses we
      JOIN expense_categories ec ON we.category_id = ec.category_id
      LEFT JOIN vendors v ON we.vendor_id = v.vendor_id
      LEFT JOIN wedding_projects wp ON we.project_id = wp.project_id
      LEFT JOIN accounts a ON we.accounting_account_id = a.account_id -- 新增 join 到 accounts 表
      ORDER BY we.expense_date DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('獲取支出紀錄時發生錯誤:', error);
    res.status(500).json({ message: '伺服器內部錯誤，無法獲取支出紀錄', error: error.message });
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
    accounting_account_id // 會計科目ID (用於費用)
  } = req.body;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction(); // 開始事務

    // 1. 插入到 wedding_expenses 表
    const [expenseResult] = await connection.execute(
      `INSERT INTO wedding_expenses
      (project_id, vendor_id, category_id, expense_item_description, amount, expense_date, vendor_invoice_number, payment_method, responsible_person, notes, accounting_account_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project_id === null ? null : parseInt(project_id),
        vendor_id === null ? null : parseInt(vendor_id),
        parseInt(category_id),
        expense_item_description,
        parseFloat(amount),
        expense_date,
        vendor_invoice_number,
        payment_method,
        responsible_person,
        notes,
        parseInt(accounting_account_id) // 確保會計科目ID是數字
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

    const [journalEntryResult] = await connection.execute(
      `INSERT INTO journal_entries (entry_date, description, reference_id, reference_type)
      VALUES (?, ?, ?, ?)`,
      [expense_date, journalDescription, newExpenseId.toString(), 'wedding_expense']
    );
    const newJournalEntryId = journalEntryResult.insertId;

    // 3. 確定借方會計科目 (費用科目) - 直接使用前端傳來的 ID
    const debitAccountId = parseInt(accounting_account_id);

    // 4. 確定貸方會計科目 (現金/銀行/應付帳款)
    let creditAccountId;
    if (payment_method === '現金') {
      const [cashAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE account_number = '1010'`);
      creditAccountId = cashAccount[0]?.account_id;
    } else if (payment_method === '銀行轉帳' || payment_method === '信用卡') { // 信用卡支付也通常透過銀行帳戶扣款
      const [bankAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE account_number = '1020'`);
      creditAccountId = bankAccount[0]?.account_id;
    } else {
      // 對於 '支票' 或 '其他'，可以預設為應付帳款或其他合適的科目
      const [otherCreditAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE account_number = '2010'`); // 應付帳款
      creditAccountId = otherCreditAccount[0]?.account_id;
    }

    if (!debitAccountId || !creditAccountId) {
      throw new Error('無法找到對應的會計科目。請檢查會計科目設置。');
    }

    // 5. 插入日記帳分錄明細 (借方：費用科目)
    await connection.execute(
      `INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description)
      VALUES (?, ?, ?, ?, ?)`,
      [newJournalEntryId, debitAccountId, parseFloat(amount), 0.00, `支付 ${expense_item_description}`]
    );

    // 6. 插入日記帳分錄明細 (貸方：支付帳戶科目)
    await connection.execute(
      `INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description)
      VALUES (?, ?, ?, ?, ?)`,
      [newJournalEntryId, creditAccountId, 0.00, parseFloat(amount), `透過 ${payment_method} 支付`]
    );

    await connection.commit(); // 提交事務
    res.status(201).json({ message: '支出已成功新增並記錄到日記帳', expenseId: newExpenseId });

  } catch (error) {
    if (connection) {
      await connection.rollback(); // 發生錯誤時回滾事務
    }
    console.error('新增支出時發生錯誤:', error);
    res.status(500).json({ message: '伺服器內部錯誤，無法新增支出', error: error.message });
  } finally {
    if (connection) {
      connection.release(); // 釋放連線
    }
  }
});

/**
 * @route GET /api/finance/pettycash
 * @desc 獲取零用金收支紀錄 (基於日記帳中現金科目)
 * @access Public
 */
router.get('/pettycash', async (req, res) => {
  try {
    // 假設 '現金' 科目的 account_number 是 '1010'
    const [rows] = await pool.execute(`
      SELECT
          je.entry_date,
          COALESCE(jel.line_description, je.description) AS description, -- 優先使用明細描述，否則使用主分錄描述
          jel.debit_amount,
          jel.credit_amount,
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
    console.error('獲取零用金數據時發生錯誤:', error);
    res.status(500).json({ message: '伺服器內部錯誤，無法獲取零用金數據', error: error.message });
  }
});


/**
 * @route POST /api/finance/pettycash/deposit
 * @desc 存入零用金並創建日記帳分錄
 * @access Public (前端會控制主管權限)
 */
router.post('/pettycash/deposit', async (req, res) => {
  const { amount, deposit_date, notes } = req.body;

  if (!amount || parseFloat(amount) <= 0 || !deposit_date) {
    return res.status(400).json({ message: '請提供有效的存入金額和日期。' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. 創建日記帳分錄
    const description = `存入零用金：NT$ ${parseFloat(amount).toLocaleString()}`;
    const [journalEntryResult] = await connection.execute(
      `INSERT INTO journal_entries (entry_date, description, reference_type)
       VALUES (?, ?, ?)`,
      [deposit_date, description, 'petty_cash_deposit']
    );
    const newJournalEntryId = journalEntryResult.insertId;

    // 2. 確定借方科目 (現金) 和貸方科目 (通常是銀行存款或其他資產科目，假設為銀行存款)
    const [cashAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE account_number = '1010'`); // 現金科目
    const debitAccountId = cashAccount[0]?.account_id;

    const [bankAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE account_number = '1020'`); // 銀行存款科目
    const creditAccountId = bankAccount[0]?.account_id;

    if (!debitAccountId || !creditAccountId) {
      throw new Error('無法找到對應的會計科目（現金或銀行存款）。');
    }

    // 3. 插入日記帳分錄明細 (借方：現金 - 增加)
    await connection.execute(
      `INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description)
       VALUES (?, ?, ?, ?, ?)`,
      [newJournalEntryId, debitAccountId, parseFloat(amount), 0.00, `從銀行轉入零用金`]
    );

    // 4. 插入日記帳分錄明細 (貸方：銀行存款 - 減少)
    await connection.execute(
      `INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description)
       VALUES (?, ?, ?, ?, ?)`,
      [newJournalEntryId, creditAccountId, 0.00, parseFloat(amount), `減少銀行存款 (存入零用金)`]
    );

    await connection.commit();
    res.status(201).json({ message: '零用金已成功存入並記錄。', entryId: newJournalEntryId });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('存入零用金時發生錯誤:', error);
    res.status(500).json({ message: `伺服器內部錯誤，無法存入零用金: ${error.message}`, error: error.message });
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
  try {
    const [rows] = await pool.execute(`SELECT category_id, name FROM expense_categories ORDER BY name ASC`);
    res.json(rows);
  } catch (error) {
    console.error('獲取支出分類時發生錯誤:', error);
    res.status(500).json({ message: '伺服器內部錯誤，無法獲取支出分類', error: error.message });
  }
});

/**
 * @route GET /api/finance/vendors
 * @desc 獲取所有供應商 (用於下拉選單)
 * @access Public
 */
router.get('/vendors', async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT vendor_id, name FROM vendors ORDER BY name ASC`);
    res.json(rows);
  } catch (error) {
    console.error('獲取供應商時發生錯誤:', error);
    res.status(500).json({ message: '伺服器內部錯誤，無法獲取供應商', error: error.message });
  }
});

/**
 * @route GET /api/finance/projects
 * @desc 獲取所有婚禮專案 (用於下拉選單)
 * @access Public
 */
router.get('/projects', async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT project_id, project_name FROM wedding_projects ORDER BY project_name ASC`);
    res.json(rows);
  } catch (error) {
    console.error('獲取婚禮專案時發生錯誤:', error);
    res.status(500).json({ message: '伺服器內部錯誤，無法獲取婚禮專案', error: error.message });
  }
});

/**
 * @route GET /api/finance/accounts/expenses
 * @desc 獲取所有費用類會計科目 (用於下拉選單)
 * @access Public
 */
router.get('/accounts/expenses', async (req, res) => {
  try {
    // 假設費用類科目在 'accounts' 表中 type 為 '費用'
    const [rows] = await pool.execute(`
      SELECT account_id, CONCAT(account_number, ' - ', name) AS display_name
      FROM accounts
      WHERE type = '費用'
      ORDER BY account_number ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error('獲取費用科目時發生錯誤:', error);
    res.status(500).json({ message: '伺服器內部錯誤，無法獲取費用科目', error: error.message });
  }
});


/**
 * @route GET /api/finance/monthly-report
 * @desc 獲取每月財務總結報表數據 (來自 monthly_financial_summary VIEW)
 * @access Public
 */
router.get('/monthly-report', async (req, res) => {
  try {
    // 確認視圖名稱為 monthly_financial_summary
    const [rows] = await pool.execute(`SELECT month, total_revenue, total_expenses, net_profit_loss FROM monthly_financial_summary ORDER BY month DESC`);
    res.json(rows);
  } catch (error) {
    console.error('獲取每月報表數據時發生錯誤:', error);
    res.status(500).json({ message: '伺服器內部錯誤，無法獲取每月報表數據', error: error.message });
  }
});

module.exports = router;

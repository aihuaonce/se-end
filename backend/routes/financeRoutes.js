// backend/routes/financeRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // 從 db.js 引入資料庫連線池

/**
 * @route GET /api/finance/overview
 * @desc 獲取財務概覽數據 (總營收、待支付金額、發票張數、總支出)
 * @access Public
 */
router.get('/overview', async (req, res) => {
  try {
    // 計算總營收: 已付款的客戶款項總和 (來自 customer_payments)
    const [revenueData] = await pool.execute(`
      SELECT COALESCE(SUM(amount), 0) AS totalRevenue
      FROM customer_payments
      WHERE status = '已付款'
    `);
    const totalRevenue = revenueData[0].totalRevenue;

    // 計算待支付金額: 未付或部分付款發票的剩餘金額總和 (來自 invoices)
    const [pendingData] = await pool.execute(`
      SELECT COALESCE(SUM(total_amount - amount_paid), 0) AS pendingPayments
      FROM invoices
      WHERE status IN ('未付', '部分付款', '逾期')
    `);
    const pendingPayments = pendingData[0].pendingPayments;

    // 計算發票總張數 (來自 invoices)
    const [invoiceCountData] = await pool.execute(`
      SELECT COUNT(invoice_id) AS invoiceCount
      FROM invoices
    `);
    const invoiceCount = invoiceCountData[0].invoiceCount;

    // 計算總支出: 所有婚禮實際支出金額總和 (來自 wedding_expenses)
    const [expensesData] = await pool.execute(`
      SELECT COALESCE(SUM(amount), 0) AS totalExpenses
      FROM wedding_expenses
    `);
    const totalExpenses = expensesData[0].totalExpenses;

    // 回應給前端
    res.json({
      totalRevenue: parseFloat(totalRevenue),
      pendingPayments: parseFloat(pendingPayments),
      invoiceCount: parseInt(invoiceCount),
      totalExpenses: parseFloat(totalExpenses) // 新增總支出
    });

  } catch (error) {
    console.error('獲取財務概覽數據時發生錯誤:', error);
    res.status(500).json({ message: '伺服器內部錯誤，無法獲取概覽數據', error: error.message });
  }
});

/**
 * @route GET /api/finance/invoices
 * @desc 獲取所有發票數據
 * @access Public
 */
router.get('/invoices', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
          i.invoice_id AS id,             -- 發票ID (前端使用 id)
          c.name AS customer,            -- 客戶名稱
          i.issue_date AS issueDate,     -- 開立日期
          i.due_date AS dueDate,         -- 繳款截止日
          i.total_amount AS amount,      -- 發票總金額
          i.status AS paid               -- 發票狀態 (前端使用 paid)
      FROM invoices i
      JOIN customers c ON i.customer_id = c.customer_id
      ORDER BY i.issue_date DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('獲取發票數據時發生錯誤:', error);
    res.status(500).json({ message: '伺服器內部錯誤，無法獲取發票數據', error: error.message });
  }
});

/**
 * @route GET /api/finance/customers
 * @desc 獲取所有客戶數據
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
 * @route GET /api/finance/payments
 * @desc 獲取所有顧客付款紀錄
 * @access Public
 */
router.get('/payments', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
          cp.payment_id,
          cp.payment_date,
          cp.amount,
          cp.method,
          cp.status,
          wp.project_name,           -- 婚禮專案名稱
          c.name AS customer_name,   -- 客戶名稱
          -- 將與此付款相關的發票ID組合成字串，例如 "1, 2, 3"
          (SELECT GROUP_CONCAT(invoice_id ORDER BY invoice_id ASC)
           FROM invoices
           WHERE payment_id = cp.payment_id) AS invoice_ids
      FROM customer_payments cp
      LEFT JOIN wedding_projects wp ON cp.project_id = wp.project_id
      JOIN customers c ON cp.customer_id = c.customer_id
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
          we.expense_date,
          we.vendor_invoice_number,
          we.responsible_person                -- 負責人
      FROM wedding_expenses we
      JOIN expense_categories ec ON we.category_id = ec.category_id
      LEFT JOIN vendors v ON we.vendor_id = v.vendor_id
      LEFT JOIN wedding_projects wp ON we.project_id = wp.project_id -- 加入專案名稱
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
    accounting_account_id // 會計科目ID
  } = req.body;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction(); // 開始事務

    // 1. 插入到 wedding_expenses 表
    const [expenseResult] = await connection.execute(
      `INSERT INTO wedding_expenses
      (project_id, vendor_id, category_id, expense_item_description, amount, expense_date, vendor_invoice_number, payment_method, responsible_person, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project_id === null ? null : parseInt(project_id), // 確保為 null 或整數
        vendor_id === null ? null : parseInt(vendor_id),   // 確保為 null 或整數
        parseInt(category_id),                            // 確保為整數
        expense_item_description,
        parseFloat(amount),                               // 確保為浮點數
        expense_date,
        vendor_invoice_number,
        payment_method,
        responsible_person,
        notes
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
    } else if (payment_method === '銀行轉帳') {
      const [bankAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE account_number = '1020'`);
      creditAccountId = bankAccount[0]?.account_id;
    } else if (payment_method === '信用卡') {
      // 信用卡支付通常會產生應付帳款 (負債)，直到帳單支付
      const [creditCardPayableAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE name = '應付帳款' AND type = '負債'`);
      creditAccountId = creditCardPayableAccount[0]?.account_id;
    } else {
      // 其他支付方式，可根據實際情況設置默認或更詳細的邏輯
      const [otherCreditAccount] = await connection.execute(`SELECT account_id FROM accounts WHERE account_number = '2010'`); // 假設為其他應付帳款
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
          je.entry_id,
          je.entry_date,
          COALESCE(jel.line_description, je.description) AS description, -- 優先使用明細描述，否則使用主分錄描述
          jel.debit_amount,
          jel.credit_amount,
          jel.line_id -- 新增 line_id 以確保 key 的唯一性
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
    const [rows] = await pool.execute(`SELECT month, total_revenue, total_expenses, net_profit_loss FROM monthly_financial_summary ORDER BY month DESC`);
    res.json(rows);
  } catch (error) {
    console.error('獲取每月報表數據時發生錯誤:', error);
    res.status(500).json({ message: '伺服器內部錯誤，無法獲取每月報表數據', error: error.message });
  }
});


module.exports = router;

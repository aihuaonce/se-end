// backend/routes/financeRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // 從 db.js 引入資料庫連線池

/**
 * @route GET /api/finance/overview
 * @desc 獲取財務概覽數據 (總營收、待支付金額、發票張數)
 * @access Public
 */
router.get('/overview', async (req, res) => {
  try {
    // 計算總營收: 已付款發票的總金額
    const [revenueData] = await pool.execute(`
      SELECT COALESCE(SUM(total_amount), 0) AS totalRevenue
      FROM invoices
      WHERE status = '已付'
    `);
    const totalRevenue = revenueData[0].totalRevenue;

    // 計算待支付金額: 未付或部分付款發票的剩餘金額總和
    const [pendingData] = await pool.execute(`
      SELECT COALESCE(SUM(total_amount - amount_paid), 0) AS pendingPayments
      FROM invoices
      WHERE status IN ('未付', '部分付款', '逾期')
    `);
    const pendingPayments = pendingData[0].pendingPayments;

    // 計算發票總張數
    const [invoiceCountData] = await pool.execute(`
      SELECT COUNT(invoice_id) AS invoiceCount
      FROM invoices
    `);
    const invoiceCount = invoiceCountData[0].invoiceCount;

    // 回應給前端
    res.json({
      totalRevenue: parseFloat(totalRevenue),
      pendingPayments: parseFloat(pendingPayments),
      invoiceCount: parseInt(invoiceCount)
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
          we.vendor_invoice_number
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
          jel.credit_amount
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

module.exports = router;

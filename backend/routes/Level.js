const express = require('express');
const router = express.Router();
const pool = require('../db');

// 輔助函數：解析前端傳來的 level 字符串
function parseLevel(levelString) {
    let budgetTier = null;
    let venuePreference = null;

    if (!levelString) return { budgetTier, venuePreference };

    if (levelString.includes('高預算')) budgetTier = 'high';
    else if (levelString.includes('正常預算') || levelString.includes('中預算')) budgetTier = 'medium'; // 容錯 "中預算"
    else if (levelString.includes('低預算')) budgetTier = 'low';

    if (levelString.includes('戶外')) venuePreference = '戶外';
    else if (levelString.includes('室內')) venuePreference = '室內';

    return { budgetTier, venuePreference };
}

// 根據分級查詢顧客
router.get('/level', async (req, res) => { // 前端請求的是 /api/level，所以這裡路由是 /
    const { level } = req.query; // 例如 "A級(高預算、戶外)"

    if (!level) {
        // 如果沒有提供 level 參數，可以返回空數據或所有顧客（根據需求）
        return res.json([]);
    }

    const { budgetTier, venuePreference } = parseLevel(level);

    // 定义预算阈值 (您可以根據實際情況調整)
    const budgetThresholds = {
        high: 500000,   // 高預算大於等於 50萬
        medium_lower: 200000, // 中預算大於等於 20萬
        medium_upper: 499999, // 中預算小於 50萬
        low: 199999     // 低預算小於 20萬
    };

    let query = `
        SELECT DISTINCT
            c.customer_id AS 顧客id, 
            c.contact_person AS 顧客姓名, 
            c.email AS 電子信箱,
            wp.total_budget,     -- 用於調試或未來擴展
            wp.venue_type        -- 用於調試或未來擴展
        FROM customers c
        JOIN wedding_projects wp ON c.customer_id = wp.customer_id
        WHERE 1=1 
    `; // 使用 DISTINCT 來確保每個顧客只出現一次

    const queryParams = [];

    // 構建預算條件
    if (budgetTier) {
        switch (budgetTier) {
            case 'high':
                query += ` AND wp.total_budget >= ?`;
                queryParams.push(budgetThresholds.high);
                break;
            case 'medium':
                query += ` AND wp.total_budget >= ? AND wp.total_budget <= ?`;
                queryParams.push(budgetThresholds.medium_lower);
                queryParams.push(budgetThresholds.medium_upper);
                break;
            case 'low':
                query += ` AND wp.total_budget <= ?`;
                queryParams.push(budgetThresholds.low);
                break;
        }
    }

    // 構建場地偏好條件 (假設 venue_type 在 wedding_projects 表)
    if (venuePreference) {
        query += ` AND wp.venue_type = ?`;
        queryParams.push(venuePreference);
    }

    // 如果 budgetTier 和 venuePreference 都為 null (即 level 字符串無法解析)，
    // 則可能返回空，或者不加額外 WHERE 條件返回所有（取決於業務邏輯）
    if (!budgetTier && !venuePreference && level) { // 如果 level 有值但無法解析
        console.warn(`無法解析的 level 參數: ${level}`);
        return res.json([]); // 返回空數組
    }

    query += ` ORDER BY c.customer_id ASC;` // 可選排序

    try {
        console.log('Executing query:', query);
        console.log('With params:', queryParams);
        const [rows] = await pool.query(query, queryParams);
        res.json(rows);
    } catch (error) {
        console.error('查詢顧客分級錯誤:', error);
        res.status(500).json({ message: '伺服器查詢錯誤', error: error.message });
    }
});

module.exports = router;
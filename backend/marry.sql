-- 建立資料庫 (如果不存在) 並指定字符集
CREATE DATABASE IF NOT EXISTS marry CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE marry;

DROP VIEW IF EXISTS project_financial_overview;
DROP VIEW IF EXISTS monthly_revenue;
DROP VIEW IF EXISTS overdue_invoices;
DROP VIEW IF EXISTS account_balances;
DROP VIEW IF EXISTS monthly_financial_summary;

DROP TABLE IF EXISTS journal_entry_lines;
DROP TABLE IF EXISTS journal_entries;
DROP TABLE IF EXISTS invoice_line_items;
DROP TABLE IF EXISTS customer_payments;
DROP TABLE IF EXISTS wedding_expenses;
DROP TABLE IF EXISTS expense_categories;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS vendors;
DROP TABLE IF EXISTS bank_accounts;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS wedding_projects;
DROP TABLE IF EXISTS customers;

-- 1️⃣ 客戶資料表 (Customers)
-- 用於記錄所有與公司進行交易的客戶資訊
CREATE TABLE customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '客戶編號',
    name VARCHAR(255) NOT NULL COMMENT '客戶名稱',
    contact_person VARCHAR(100) COMMENT '主要聯絡人',
    phone VARCHAR(50) COMMENT '電話號碼',
    email VARCHAR(100) COMMENT '電子郵件',
    address VARCHAR(255) COMMENT '客戶地址',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最後更新時間'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客戶資料表';

-- 2️⃣ 供應商資料表 (Vendors)
-- 用於記錄所有與公司進行採購或費用支付的供應商資訊
CREATE TABLE vendors (
    vendor_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '供應商編號',
    name VARCHAR(255) NOT NULL COMMENT '供應商名稱',
    contact_person VARCHAR(100) COMMENT '主要聯絡人',
    phone VARCHAR(50) COMMENT '電話號碼',
    email VARCHAR(100) COMMENT '電子郵件',
    address VARCHAR(255) COMMENT '供應商地址',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最後更新時間'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='供應商資料表';

-- 3️⃣ 會計科目表 (Chart of Accounts)
-- 定義公司所有的資產、負債、權益、收入、費用科目，支持科目層級
CREATE TABLE accounts (
    account_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '科目編號',
    account_number VARCHAR(50) NOT NULL UNIQUE COMMENT '科目代碼/編號',
    name VARCHAR(100) NOT NULL COMMENT '科目名稱',
    type ENUM('資產','負債','權益','收入','費用') NOT NULL COMMENT '科目類型',
    normal_balance ENUM('借','貸') NOT NULL COMMENT '正常餘額方向 (借方或貸方)',
    description VARCHAR(255) COMMENT '科目描述',
    parent_account_id INT COMMENT '上級科目ID (用於建立科目層級結構)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最後更新時間',
    FOREIGN KEY (parent_account_id) REFERENCES accounts(account_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='會計科目表';

-- 4️⃣ 銀行帳戶表 (Bank Accounts)
-- 記錄公司所有銀行帳戶資訊
CREATE TABLE bank_accounts (
    bank_account_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '銀行帳戶編號',
    account_name VARCHAR(100) NOT NULL COMMENT '帳戶名稱 (例如：主要營運帳戶)',
    bank_name VARCHAR(100) NOT NULL COMMENT '銀行名稱',
    account_number VARCHAR(100) NOT NULL UNIQUE COMMENT '銀行帳號',
    currency VARCHAR(10) DEFAULT 'TWD' COMMENT '幣別 (例如：TWD, USD)',
    opening_balance DECIMAL(12,2) DEFAULT 0.00 COMMENT '期初餘額',
    current_balance DECIMAL(12,2) DEFAULT 0.00 COMMENT '當前餘額 (可透過交易計算，但有時也用於快速查詢)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最後更新時間'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='銀行帳戶表';

-- 5️⃣ 支出分類表 (Expense Categories)
-- 定義公司支出的不同分類
CREATE TABLE expense_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '分類編號',
    name VARCHAR(100) NOT NULL UNIQUE COMMENT '分類名稱 (例如：辦公用品、交通費、餐飲費)',
    description VARCHAR(255) COMMENT '描述',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最後更新時間'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支出分類表';

-- 6️⃣ 婚禮專案表 (Wedding Projects)
-- 記錄每個婚禮專案的基本資訊和預算
CREATE TABLE wedding_projects (
    project_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '專案編號',
    project_name VARCHAR(255) NOT NULL COMMENT '專案名稱',
    customer_id INT NOT NULL COMMENT '對應客戶(customer_id)',
    start_date DATE COMMENT '專案開始日期',
    end_date DATE COMMENT '專案結束日期',
    total_budget DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '專案總預算金額',
    status ENUM('規劃中','進行中','已完成','取消') NOT NULL DEFAULT '規劃中' COMMENT '專案狀態',
    notes TEXT COMMENT '專案備註',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最後更新時間',
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='婚禮專案表';


-- 8️⃣ 發票主表 (Invoices)
-- 記錄向客戶開立的發票，連結到客戶和顧客付款紀錄
CREATE TABLE invoices (
    invoice_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '發票ID (主鍵，自動編號)',
    customer_id INT NOT NULL COMMENT '對應客戶資料(customer_id)',
    project_id INT COMMENT '對應婚禮專案(project_id)', -- 發票應可連結專案
    issue_date DATE NOT NULL COMMENT '發票開立時間',
    due_date DATE NOT NULL COMMENT '建議付款日期',
    total_amount DECIMAL(12,2) NOT NULL COMMENT '所有明細加總的總金額',
    amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '已付款金額',
    status ENUM('未付','部分付款','已付','逾期','作廢') NOT NULL DEFAULT '未付' COMMENT '發票狀態',
    total_installments INT DEFAULT 1 COMMENT '預計分期數', -- 新增分期數
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最後更新時間',
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (project_id) REFERENCES wedding_projects(project_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='發票主表';

-- 7️⃣ 顧客付款紀錄表 (Customer Payments)
-- 記錄客戶針對專案或發票的實際付款
CREATE TABLE customer_payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '付款ID',
    project_id INT COMMENT '對應婚禮專案(project_id)', -- 可空，因為可能有些付款不直接掛鉤專案或稍後分配
    customer_id INT NOT NULL COMMENT '對應顧客資料(customer_id)',
    invoice_id INT COMMENT '對應發票ID', -- 新增，用於明確連結付款到發票
    payment_date DATE NOT NULL COMMENT '實際付款日期',
    amount DECIMAL(12,2) NOT NULL COMMENT '實際付款金額',
    method ENUM('現金','銀行轉帳','信用卡','線上付款','其他') NOT NULL COMMENT '付款方式', -- 新增線上付款
    status ENUM('已付款','未付款','退款') NOT NULL DEFAULT '已付款' COMMENT '付款狀態', -- 初始為已付款
    notes VARCHAR(255) COMMENT '付款備註',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最後更新時間',
    FOREIGN KEY (project_id) REFERENCES wedding_projects(project_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) -- 新增外來鍵約束
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='顧客付款紀錄表';


-- 9️⃣ 發票明細表 (Invoice Line Items)
-- 記錄每張發票的具體項目明細
CREATE TABLE invoice_line_items (
    detail_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '明細ID (主鍵，自動編號)',
    invoice_id INT NOT NULL COMMENT '對應發票主表(invoice_id)',
    item_name VARCHAR(255) NOT NULL COMMENT '項目名稱 (如婚紗、攝影等)',
    quantity INT NOT NULL DEFAULT 1 COMMENT '數量單位數量',
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '每單位價格',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '小計 (數量 * 單價)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id)
        ON UPDATE CASCADE ON DELETE CASCADE -- 刪除發票時，明細也一併刪除
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='發票明細表';


-- 🔟 婚禮實際支出表 (Wedding Expenses)
-- 記錄每個婚禮專案的實際支出
CREATE TABLE wedding_expenses (
    expense_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '支出ID (主鍵，自動編號)',
    project_id INT COMMENT '對應婚禮專案(project_id)', -- 可空
    vendor_id INT COMMENT '對應供應商(vendor_id)', -- 可空，如果支出不涉及特定供應商
    category_id INT NOT NULL COMMENT '對應支出分類(category_id)', -- 用於更細緻的分類
    expense_item_description VARCHAR(255) NOT NULL COMMENT '支出項目描述 (如婚紗、場地租借等)',
    amount DECIMAL(12,2) NOT NULL COMMENT '實際支出金額',
    expense_date DATE NOT NULL COMMENT '付款日期',
    vendor_invoice_number VARCHAR(50) COMMENT '廠商提供的發票號碼', -- 可空
    payment_method ENUM('現金','銀行轉帳','信用卡','支票','其他') COMMENT '支付方式',
    responsible_person VARCHAR(100) COMMENT '負責人',
    notes VARCHAR(255) COMMENT '備註',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最後更新時間',
    FOREIGN KEY (project_id) REFERENCES wedding_projects(project_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES expense_categories(category_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='婚禮實際支出表';


-- 1️⃣1️⃣ 日記帳分錄主表 (Journal Entries)
-- 記錄每筆財務交易的概要資訊，作為複式記帳的基礎
CREATE TABLE journal_entries (
    entry_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '日記帳分錄編號',
    entry_date DATE NOT NULL COMMENT '交易日期',
    description VARCHAR(255) NOT NULL COMMENT '分錄摘要',
    reference_id VARCHAR(50) COMMENT '參考文件ID (例如發票ID, 付款ID, 費用ID)',
    reference_type ENUM('invoice', 'customer_payment', 'wedding_expense', 'petty_cash_deposit', 'other_revenue', 'other_expense', 'vendor_bill', 'other') COMMENT '參考文件類型', -- 新增 petty_cash_deposit
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最後更新時間'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日記帳分錄主表';

-- 1️⃣2️⃣ 日記帳分錄明細表 (Journal Entry Lines)
-- 記錄每筆日記帳分錄的具體借貸明細，多條明細構成一個完整的複式分錄
CREATE TABLE journal_entry_lines (
    line_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '分錄明細編號',
    entry_id INT NOT NULL COMMENT '對應日記帳分錄編號',
    account_id INT NOT NULL COMMENT '對應科目(account_id)',
    debit_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '借方金額',
    credit_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '貸方金額',
    line_description VARCHAR(255) COMMENT '明細說明 (可選，覆蓋主分錄說明)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    FOREIGN KEY (entry_id) REFERENCES journal_entries(entry_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(account_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日記帳分錄明細表';


-- 🔢 範例資料插入

-- 客戶範例資料
INSERT INTO customers (name, contact_person, phone, email, address) VALUES
('王小明有限公司', '王小明', '0912-345678', 'wayne@example.com', '台北市信義區忠孝東路一段1號'),
('李小華貿易', '李小華', '0933-223344', 'lixh@example.com', '新北市板橋區文化路一段100號'),
('陳大同實業', '陳大同', '0955-667788', 'chendt@example.com', '高雄市苓雅區中華路二段50號'),
('林美麗婚顧', '林美麗', '0966-889900', 'linml@example.com', '桃園市中壢區中正路10號');


-- 供應商範例資料
INSERT INTO vendors (name, contact_person, phone, email, address) VALUES
('文具大批發', '陳經理', '02-87654321', 'stationery@example.com', '台北市內湖區瑞光路123號'),
('電腦城', '林小姐', '02-12345678', 'pc_city@example.com', '新北市中和區中正路456號'),
('豪華婚宴會館', '張經理', '02-77778888', 'banquet@example.com', '台北市大安區婚禮路99號'),
('幸福攝影工作室', '黃先生', '0987-654321', 'photo@example.com', '新北市永和區永安路33號'),
('花好月圓花藝坊', '蔡小姐', '0922-112233', 'flowers@example.com', '台中市西區公益路200號');

-- 會計科目範例資料
INSERT INTO accounts (account_number, name, type, normal_balance, description) VALUES
('1000', '資產', '資產', '借', '所有資產的總分類'),
('1010', '現金', '資產', '借', '企業持有的現金餘額'),
('1020', '銀行存款', '資產', '借', '企業在銀行中的存款'),
('1200', '應收帳款', '資產', '借', '客戶欠公司的款項'),
('1500', '辦公設備', '資產', '借', '辦公室使用的設備，如電腦、印表機等'),
('2000', '負債', '負債', '貸', '所有負債的總分類'),
('2010', '應付帳款', '負債', '貸', '公司應付供應商的款項'),
('3000', '權益', '權益', '貸', '所有者權益的總分類'),
('4000', '收入', '收入', '貸', '所有收入的總分類'),
('4010', '服務收入', '收入', '貸', '提供婚禮服務等收入'),
('5000', '費用', '費用', '借', '所有費用的總分類'),
('5010', '婚宴場地費', '費用', '借', '婚宴場地租賃費用'),
('5020', '攝影費用', '費用', '借', '婚禮攝影服務費用'),
('5030', '辦公用品費', '費用', '借', '辦公室用品費用'),
('5040', '交通費用', '費用', '借', '員工出差、業務交通費用'),
('5050', '餐飲娛樂費', '費用', '借', '餐飲和娛樂費用'),
('5060', '花藝佈置費', '費用', '借', '婚禮花藝佈置費用');

-- 銀行帳戶範例資料
INSERT INTO bank_accounts (account_name, bank_name, account_number, currency, opening_balance, current_balance) VALUES
('主要營運帳戶', '台灣銀行', '123-456-7890', 'TWD', 100000.00, 100000.00),
('美元存款帳戶', '中國信託', '987-654-3210', 'USD', 5000.00, 5000.00);

-- 支出分類範例資料
INSERT INTO expense_categories (name, description) VALUES
('場地租賃', '婚宴場地、會議室租賃費用'),
('人力服務', '攝影師、主持人、化妝師等費用'),
('用品採購', '婚禮裝飾、辦公用品等採購費用'),
('差旅交通', '出差住宿、交通費用'),
('餐飲娛樂', '業務招待或員工餐飲'),
('花藝佈置', '婚禮花藝和場地佈置費用');

-- 婚禮專案範例資料
INSERT INTO wedding_projects (project_name, customer_id, start_date, end_date, total_budget, status, notes) VALUES
('張陳聯姻豪華婚宴', (SELECT customer_id FROM customers WHERE name='王小明有限公司'), '2025-09-01', '2025-09-01', 500000.00, '進行中', '客戶要求高標準服務'),
('李黃溫馨小型婚禮', (SELECT customer_id FROM customers WHERE name='李小華貿易'), '2025-10-15', '2025-10-15', 150000.00, '規劃中', '預算有限，追求溫馨氛圍'),
('趙錢世紀慶典', (SELECT customer_id FROM customers WHERE name='陳大同實業'), '2025-08-01', '2025-08-02', 800000.00, '規劃中', '大型戶外慶典'),
('林陳幸福婚禮', (SELECT customer_id FROM customers WHERE name='林美麗婚顧'), '2025-11-20', '2025-11-20', 250000.00, '規劃中', '輕奢風格婚禮');


-- 發票主表範例資料 (已付、部分付款、未付、逾期，以及分期範例)

-- 發票 A: 已付清 (單筆付款)
INSERT INTO invoices (customer_id, project_id, issue_date, due_date, total_amount, amount_paid, status, total_installments) VALUES
((SELECT customer_id FROM customers WHERE name='王小明有限公司'), (SELECT project_id FROM wedding_projects WHERE project_name='張陳聯姻豪華婚宴'), '2025-05-01', '2025-05-15', 100000.00, 100000.00, '已付', 1);
SET @inv_id_A = LAST_INSERT_ID();
INSERT INTO customer_payments (project_id, customer_id, invoice_id, payment_date, amount, method, status) VALUES
((SELECT project_id FROM wedding_projects WHERE project_name='張陳聯姻豪華婚宴'), (SELECT customer_id FROM customers WHERE name='王小明有限公司'), @inv_id_A, '2025-05-12', 100000.00, '銀行轉帳', '已付款');
SET @pay_id_A1 = LAST_INSERT_ID();


-- 發票 B: 部分付款 (分兩期，已付第一期)
INSERT INTO invoices (customer_id, project_id, issue_date, due_date, total_amount, amount_paid, status, total_installments) VALUES
((SELECT customer_id FROM customers WHERE name='李小華貿易'), (SELECT project_id FROM wedding_projects WHERE project_name='李黃溫馨小型婚禮'), '2025-05-10', '2025-06-25', 80000.00, 40000.00, '部分付款', 2);
SET @inv_id_B = LAST_INSERT_ID();
INSERT INTO customer_payments (project_id, customer_id, invoice_id, payment_date, amount, method, status) VALUES
((SELECT project_id FROM wedding_projects WHERE project_name='李黃溫馨小型婚禮'), (SELECT customer_id FROM customers WHERE name='李小華貿易'), @inv_id_B, '2025-05-20', 40000.00, '現金', '已付款');
SET @pay_id_B1 = LAST_INSERT_ID();


-- 發票 C: 未付 (預計分三期)
INSERT INTO invoices (customer_id, project_id, issue_date, due_date, total_amount, amount_paid, status, total_installments) VALUES
((SELECT customer_id FROM customers WHERE name='王小明有限公司'), (SELECT project_id FROM wedding_projects WHERE project_name='張陳聯姻豪華婚宴'), '2025-06-01', '2025-07-15', 150000.00, 0.00, '未付', 3);
SET @inv_id_C = LAST_INSERT_ID();


-- 發票 D: 逾期未付 (單筆付款)
INSERT INTO invoices (customer_id, project_id, issue_date, due_date, total_amount, amount_paid, status, total_installments) VALUES
((SELECT customer_id FROM customers WHERE name='陳大同實業'), (SELECT project_id FROM wedding_projects WHERE project_name='趙錢世紀慶典'), '2025-04-10', '2025-05-01', 90000.00, 0.00, '逾期', 1);
SET @inv_id_D = LAST_INSERT_ID();


-- 發票 E: 已付清 (跨月份, 分兩期, 已付兩期)
INSERT INTO invoices (customer_id, project_id, issue_date, due_date, total_amount, amount_paid, status, total_installments) VALUES
((SELECT customer_id FROM customers WHERE name='林美麗婚顧'), (SELECT project_id FROM wedding_projects WHERE project_name='林陳幸福婚禮'), '2025-03-25', '2025-04-10', 60000.00, 60000.00, '已付', 2);
SET @inv_id_E = LAST_INSERT_ID();
INSERT INTO customer_payments (project_id, customer_id, invoice_id, payment_date, amount, method, status) VALUES
((SELECT project_id FROM wedding_projects WHERE project_name='林陳幸福婚禮'), (SELECT customer_id FROM customers WHERE name='林美麗婚顧'), @inv_id_E, '2025-04-05', 30000.00, '線上付款', '已付款');
SET @pay_id_E1 = LAST_INSERT_ID();
INSERT INTO customer_payments (project_id, customer_id, invoice_id, payment_date, amount, method, status) VALUES
((SELECT project_id FROM wedding_projects WHERE project_name='林陳幸福婚禮'), (SELECT customer_id FROM customers WHERE name='林美麗婚顧'), @inv_id_E, '2025-04-15', 30000.00, '信用卡', '已付款');
SET @pay_id_E2 = LAST_INSERT_ID();


-- 婚禮實際支出範例資料 (多樣化日期和項目)
INSERT INTO wedding_expenses (project_id, vendor_id, category_id, expense_item_description, amount, expense_date, vendor_invoice_number, payment_method, responsible_person, notes) VALUES
-- 2025-04
((SELECT project_id FROM wedding_projects WHERE project_name='趙錢世紀慶典'), (SELECT vendor_id FROM vendors WHERE name='花好月圓花藝坊'), (SELECT category_id FROM expense_categories WHERE name='花藝佈置'), '慶典初期花藝設計費', 10000.00, '2025-04-01', 'FLORAL-202504-001', '銀行轉帳', '李專員', '趙錢慶典早期花藝諮詢與設計'),
(NULL, (SELECT vendor_id FROM vendors WHERE name='電腦城'), (SELECT category_id FROM expense_categories WHERE name='用品採購'), '新購辦公電腦', 35000.00, '2025-04-10', 'PC-202504-001', '銀行轉帳', '王主管', '辦公室電腦更新'),
-- 2025-05
((SELECT project_id FROM wedding_projects WHERE project_name='張陳聯姻豪華婚宴'), (SELECT vendor_id FROM vendors WHERE name='豪華婚宴會館'), (SELECT category_id FROM expense_categories WHERE name='場地租賃'), '豪華婚宴場地費訂金', 150000.00, '2025-05-01', 'VHM-202505-001', '銀行轉帳', '張經理', '豪華婚宴會館場地預訂費用'),
((SELECT project_id FROM wedding_projects WHERE project_name='張陳聯姻豪華婚宴'), (SELECT vendor_id FROM vendors WHERE name='幸福攝影工作室'), (SELECT category_id FROM expense_categories WHERE name='人力服務'), '全天婚禮攝影師訂金', 30000.00, '2025-05-05', 'PHOTO-202505-001', '信用卡', '黃先生', '婚禮攝影師預訂費用'),
(NULL, NULL, (SELECT category_id FROM expense_categories WHERE name='餐飲娛樂'), '部門聚餐費', 2500.00, '2025-05-15', NULL, '現金', '陳會計', '月度部門慶祝'),
-- 2025-06
((SELECT project_id FROM wedding_projects WHERE project_name='李黃溫馨小型婚禮'), (SELECT vendor_id FROM vendors WHERE name='文具大批發'), (SELECT category_id FROM expense_categories WHERE name='用品採購'), '婚禮邀請函製作', 3000.00, '2025-06-10', 'STAT-202506-001', '現金', '陳小姐', '邀請函及相關文具採購'),
(NULL, NULL, (SELECT category_id FROM expense_categories WHERE name='餐飲娛樂'), '員工咖啡費', 800.00, '2025-06-20', NULL, '現金', '王經理', '辦公室咖啡補給'),
-- 2025-07
((SELECT project_id FROM wedding_projects WHERE project_name='趙錢世紀慶典'), (SELECT vendor_id FROM vendors WHERE name='花好月圓花藝坊'), (SELECT category_id FROM expense_categories WHERE name='花藝佈置'), '慶典花藝佈置尾款', 25000.00, '2025-07-15', 'FLORAL-202507-002', '銀行轉帳', '李專員', '世紀慶典的鮮花和佈置尾款');


-- 日記帳分錄及明細範例資料 (根據新的業務流程和表格)

-- 範例 A1: 收到客戶付款 - 發票 A (全額)
INSERT INTO journal_entries (entry_date, description, reference_id, reference_type) VALUES
('2025-05-12', '收到客戶款項 - 發票 #A 全額支付', @pay_id_A1, 'customer_payment');
SET @last_entry_id = LAST_INSERT_ID();
INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description) VALUES
(@last_entry_id, (SELECT account_id FROM accounts WHERE account_number='1020'), 100000.00, 0.00, '銀行存款增加'),
(@last_entry_id, (SELECT account_id FROM accounts WHERE account_number='1200'), 0.00, 100000.00, '應收帳款減少 (發票 #A)');

-- 範例 B1: 收到客戶付款 - 發票 B (部分)
INSERT INTO journal_entries (entry_date, description, reference_id, reference_type) VALUES
('2025-05-20', '收到客戶款項 - 發票 #B 部分支付', @pay_id_B1, 'customer_payment');
SET @last_entry_id = LAST_INSERT_ID();
INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description) VALUES
(@last_entry_id, (SELECT account_id FROM accounts WHERE account_number='1010'), 40000.00, 0.00, '現金增加'),
(@last_entry_id, (SELECT account_id FROM accounts WHERE account_number='1200'), 0.00, 40000.00, '應收帳款減少 (發票 #B)');

-- 範例 E1: 收到客戶付款 - 發票 E (第一期, 線上支付)
INSERT INTO journal_entries (entry_date, description, reference_id, reference_type) VALUES
('2025-04-05', '收到客戶款項 - 發票 #E 第一期 (線上)', @pay_id_E1, 'customer_payment');
SET @last_entry_id = LAST_INSERT_ID();
INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description) VALUES
(@last_entry_id, (SELECT account_id FROM accounts WHERE account_number='1020'), 30000.00, 0.00, '銀行存款增加 (線上支付)'),
(@last_entry_id, (SELECT account_id FROM accounts WHERE account_number='1200'), 0.00, 30000.00, '應收帳款減少 (發票 #E 第一期)');

-- 範例 E2: 收到客戶付款 - 發票 E (第二期, 信用卡支付)
INSERT INTO journal_entries (entry_date, description, reference_id, reference_type) VALUES
('2025-04-15', '收到客戶款項 - 發票 #E 第二期 (信用卡)', @pay_id_E2, 'customer_payment');
SET @last_entry_id = LAST_INSERT_ID();
INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description) VALUES
(@last_entry_id, (SELECT account_id FROM accounts WHERE account_number='1020'), 30000.00, 0.00, '銀行存款增加 (信用卡收款)'),
(@last_entry_id, (SELECT account_id FROM accounts WHERE account_number='1200'), 0.00, 30000.00, '應收帳款減少 (發票 #E 第二期)');


-- 範例支出 1: 支付花藝設計費 (2025-04)
INSERT INTO journal_entries (entry_date, description, reference_id, reference_type) VALUES
('2025-04-01', '支付慶典初期花藝設計費', (SELECT expense_id FROM wedding_expenses WHERE expense_item_description='慶典初期花藝設計費'), 'wedding_expense');
SET @last_entry_id = LAST_INSERT_ID();
INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description) VALUES
(@last_entry_id, (SELECT account_id FROM accounts WHERE account_number='5060'), 10000.00, 0.00, '花藝佈置費用增加'),
(@last_entry_id, (SELECT account_id FROM accounts WHERE account_number='1020'), 0.00, 10000.00, '銀行存款減少');

-- 範例支出 2: 支付辦公電腦 (2025-04)
INSERT INTO journal_entries (entry_date, description, reference_id, reference_type) VALUES
('2025-04-10', '支付新購辦公電腦', (SELECT expense_id FROM wedding_expenses WHERE expense_item_description='新購辦公電腦'), 'wedding_expense');
SET @last_entry_id = LAST_INSERT_ID();
INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description) VALUES
(@last_entry_id, (SELECT account_id FROM accounts WHERE account_number='1500'), 35000.00, 0.00, '辦公設備增加'),
(@last_entry_id, (SELECT account_id FROM accounts WHERE account_number='1020'), 0.00, 35000.00, '銀行存款減少');

-- 範例支出 3: 支付婚宴場地費訂金 (2025-05)
INSERT INTO journal_entries (entry_date, description, reference_id, reference_type) VALUES
('2025-05-01', '支付豪華婚宴會館場地費訂金', (SELECT expense_id FROM wedding_expenses WHERE expense_item_description='豪華婚宴場地費訂金'), 'wedding_expense');
SET @last_entry_id = LAST_INSERT_ID();
INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description) VALUES
(@last_entry_id, (SELECT account_id FROM accounts WHERE account_number='5010'), 150000.00, 0.00, '婚宴場地費增加'),
(@last_entry_id, (SELECT account_id FROM accounts WHERE account_number='1020'), 0.00, 150000.00, '銀行存款減少');

-- 範例支出 4: 零用金支出 - 部門聚餐費 (2025-05)
INSERT INTO journal_entries (entry_date, description, reference_id, reference_type) VALUES
('2025-05-15', '部門聚餐費', (SELECT expense_id FROM wedding_expenses WHERE expense_item_description='部門聚餐費'), 'wedding_expense');
SET @last_entry_id = LAST_INSERT_ID();
INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description) VALUES
(@last_entry_id, (SELECT account_id FROM accounts WHERE account_number='5050'), 2500.00, 0.00, '餐飲娛樂費增加'),
(@last_entry_id, (SELECT account_id FROM accounts WHERE account_number='1010'), 0.00, 2500.00, '現金減少');

-- 範例支出 5: 零用金支出 - 員工咖啡費 (2025-06)
INSERT INTO journal_entries (entry_date, description, reference_id, reference_type) VALUES
('2025-06-20', '員工咖啡費', (SELECT expense_id FROM wedding_expenses WHERE expense_item_description='員工咖啡費'), 'wedding_expense');
SET @last_entry_id = LAST_INSERT_ID();
INSERT INTO journal_entry_lines (entry_id, account_id, debit_amount, credit_amount, line_description) VALUES
(@last_entry_id, (SELECT account_id FROM accounts WHERE account_number='5050'), 800.00, 0.00, '餐飲娛樂費增加'),
(@last_entry_id, (SELECT account_id FROM accounts WHERE account_number='1010'), 0.00, 800.00, '現金減少');


-- 📊 建立檢視表 (View)

-- 1. 專案財務總覽 (project_financial_overview)
CREATE OR REPLACE VIEW project_financial_overview AS
SELECT
    wp.project_id,
    wp.project_name,
    c.name AS customer_name,
    wp.total_budget,
    COALESCE(SUM(cp.amount), 0.00) AS total_payments_received,
    COALESCE(SUM(we.amount), 0.00) AS total_actual_expenses,
    (COALESCE(SUM(cp.amount), 0.00) - COALESCE(SUM(we.amount), 0.00)) AS net_profit_loss,
    (wp.total_budget - COALESCE(SUM(we.amount), 0.00)) AS budget_surplus_deficit,
    CASE
        WHEN (COALESCE(SUM(wp.total_budget), 0.00) - COALESCE(SUM(we.amount), 0.00)) > 0 THEN '有盈餘'
        WHEN (COALESCE(SUM(wp.total_budget), 0.00) - COALESCE(SUM(we.amount), 0.00)) < 0 THEN '超支'
        ELSE '收支平衡'
    END AS budget_status
FROM wedding_projects wp
LEFT JOIN customer_payments cp ON wp.project_id = cp.project_id AND cp.status = '已付款'
LEFT JOIN wedding_expenses we ON wp.project_id = we.project_id
JOIN customers c ON wp.customer_id = c.customer_id
GROUP BY wp.project_id, wp.project_name, c.name, wp.total_budget
ORDER BY wp.project_id;


-- 2. 每月營收彙總 (基於已付款發票的開立日期)
CREATE OR REPLACE VIEW monthly_revenue AS
SELECT
    DATE_FORMAT(issue_date, '%Y-%m') AS month,
    SUM(total_amount) AS total_revenue
FROM invoices
WHERE status = '已付'
GROUP BY DATE_FORMAT(issue_date, '%Y-%m')
ORDER BY month;

-- 3. 逾期未付款清單 (基於發票狀態和截止日期)
CREATE OR REPLACE VIEW overdue_invoices AS
SELECT
    i.invoice_id,
    c.name AS customer_name,
    i.issue_date,
    i.due_date,
    i.total_amount,
    (i.total_amount - COALESCE(i.amount_paid, 0.00)) AS outstanding_amount, -- 計算未付金額
    i.status
FROM invoices i
JOIN customers c ON i.customer_id = c.customer_id
WHERE i.status IN ('未付', '部分付款', '逾期') AND i.due_date < CURDATE()
ORDER BY i.due_date;

-- 4. 科目餘額表 (簡易試算表，可根據會計期間進一步篩選)
CREATE OR REPLACE VIEW account_balances AS
SELECT
    a.account_number,
    a.name AS account_name,
    a.type AS account_type,
    SUM(jel.debit_amount) AS total_debit,
    SUM(jel.credit_amount) AS total_credit,
    CASE
        WHEN a.normal_balance = '借' THEN SUM(jel.debit_amount) - SUM(jel.credit_amount)
        ELSE SUM(jel.credit_amount) - SUM(jel.debit_amount)
    END AS current_balance
FROM journal_entry_lines jel
JOIN accounts a ON jel.account_id = a.account_id
GROUP BY a.account_id, a.account_number, a.name, a.type, a.normal_balance
ORDER BY a.account_number;

-- 5. 每月財務總結報表 (monthly_financial_summary)
CREATE OR REPLACE VIEW monthly_financial_summary AS
SELECT
    DATE_FORMAT(je.entry_date, '%Y-%m') AS month,
    SUM(CASE WHEN a.type = '收入' THEN (jel.credit_amount - jel.debit_amount) ELSE 0 END) AS total_revenue,
    SUM(CASE WHEN a.type = '費用' THEN (jel.debit_amount - jel.credit_amount) ELSE 0 END) AS total_expenses,
    (SUM(CASE WHEN a.type = '收入' THEN (jel.credit_amount - jel.debit_amount) ELSE 0 END) -
     SUM(CASE WHEN a.type = '費用' THEN (jel.debit_amount - jel.credit_amount) ELSE 0 END)) AS net_profit_loss
FROM journal_entries je
JOIN journal_entry_lines jel ON je.entry_id = jel.entry_id
JOIN accounts a ON jel.account_id = a.account_id
WHERE a.type IN ('收入', '費用')
GROUP BY DATE_FORMAT(je.entry_date, '%Y-%m')
ORDER BY month;

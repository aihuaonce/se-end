const express = require("express");
const router = express.Router();
const pool = require("../db.js");
const moment = require('moment');

const sendDbError = (res, routeName, error, message = "Server internal error", statusCode = 500) => {
  console.error(`[${routeName}] Database operation error:`, error);
  const errMessage = process.env.NODE_ENV === 'production' ? message : `${message}: ${error.message || error}`;
  res.status(statusCode).json({
    success: false,
    message: errMessage,
    code: error.code || 'UNKNOWN_DB_ERROR'
  });
};

// [POST] /api/reserve - Create a reservation
router.post('/', async (req, res) => {
  console.log("[RESERVATIONS POST /] Received data:", req.body);
  // Expecting English keys from frontend
  const { customer_id, reservation_type, reservation_time, status, notes } = req.body;

  if (!customer_id || isNaN(parseInt(customer_id)) || !reservation_type || !reservation_time || !status) {
    return res.status(400).json({ success: false, message: "Missing required fields (customer_id, reservation_type, reservation_time, status)" });
  }
  if (!moment(reservation_time, moment.ISO_8601, true).isValid()) {
    return res.status(400).json({ success: false, message: "Invalid reservation_time format (should be ISO 8601, e.g., YYYY-MM-DDTHH:mm:ss)" });
  }
  const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `Invalid status value, must be one of: ${validStatuses.join(', ')}` });
  }

  const parsedCustomerId = parseInt(customer_id);
  const formattedReservationTime = moment(reservation_time).format('YYYY-MM-DD HH:mm:ss');

  try {
    const [result] = await pool.query(
      'INSERT INTO reservations (customer_id, reservation_type, reservation_time, status, notes) VALUES (?, ?, ?, ?, ?)',
      [parsedCustomerId, reservation_type, formattedReservationTime, status, notes || null]
    );
    console.log(`[RESERVATIONS POST /] Reservation created successfully, ID: ${result.insertId}`);
    res.status(201).json({ success: true, message: "Reservation created successfully", id: result.insertId });
  } catch (error) {
    sendDbError(res, 'POST /api/reserve', error, 'Failed to create reservation');
  }
});

// [GET] /api/reserve - Get list of reservations (with filtering)
router.get('/', async (req, res) => {
  console.log("[RESERVATIONS GET /] Received filter params:", req.query);
  // Expecting English keys for query params from frontend
  const { customer_name, reservation_type, status, start_date, end_date } = req.query;

  let query = `
    SELECT 
      r.reservation_id, 
      r.customer_id, 
      c.contact_person AS customer_name, 
      r.reservation_type, 
      r.reservation_time, 
      r.status,
      r.notes,
      r.created_at,
      r.updated_at
    FROM reservations r
    LEFT JOIN customers c ON r.customer_id = c.customer_id
    WHERE 1=1
  `;
  const queryParams = [];
  if (customer_name) {
    query += ` AND c.name LIKE ?`;
    queryParams.push(`%${customer_name}%`);
  }
  if (reservation_type) {
    query += ` AND r.reservation_type LIKE ?`;
    queryParams.push(`%${reservation_type}%`);
  }
  if (status) {
    query += ` AND r.status = ?`;
    queryParams.push(status);
  }
  if (start_date && moment(start_date, 'YYYY-MM-DD', true).isValid()) {
    query += ` AND DATE(r.reservation_time) >= ?`;
    queryParams.push(moment(start_date).format('YYYY-MM-DD'));
  }
  if (end_date && moment(end_date, 'YYYY-MM-DD', true).isValid()) {
    query += ` AND DATE(r.reservation_time) <= ?`;
    queryParams.push(moment(end_date).format('YYYY-MM-DD'));
  }

  query += ` ORDER BY r.reservation_time DESC`;

  try {
    const [rows] = await pool.query(query, queryParams);
    res.json(rows);
  } catch (error) {
    sendDbError(res, 'GET /api/reserve', error, 'Failed to fetch reservations');
  }
});

// [PUT] /api/reserve/:id/status - Update reservation status
router.put('/:id/status', async (req, res) => {
  const reservationId = parseInt(req.params.id);
  // Expecting English key "status" in request body
  const { status } = req.body;
  console.log(`[RESERVATIONS PUT /${reservationId}/status] Updating status to:`, status);

  if (isNaN(reservationId) || reservationId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid reservation ID" });
  }
  const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `Invalid status value, must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const [result] = await pool.query(
      'UPDATE reservations SET status = ?, updated_at = NOW() WHERE reservation_id = ?', // Also update updated_at
      [status, reservationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Reservation not found or status unchanged" });
    }
    console.log(`[RESERVATIONS PUT /${reservationId}/status] Status updated successfully`);
    // Optionally, fetch and return the updated reservation
    const [updatedRows] = await pool.query('SELECT * FROM reservations WHERE reservation_id = ?', [reservationId]);
    res.json({
      success: true,
      message: "Reservation status updated successfully",
      data: updatedRows.length > 0 ? updatedRows[0] : null
    });
  } catch (error) {
    sendDbError(res, `PUT /api/reserve/${reservationId}/status`, error, 'Failed to update reservation status');
  }
});

module.exports = router;
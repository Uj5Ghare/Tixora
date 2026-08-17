const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors());
app.use(express.json());

// In-Memory Transactions Store
const transactions = [];

// Health Check
app.get('/health', (req, res) => {
  res.json({
    service: 'payment-service',
    status: 'healthy',
    uptime: process.uptime(),
    settledTransactions: transactions.length,
    timestamp: new Date().toISOString()
  });
});

// Process Payment Settlement
app.post('/process', (req, res) => {
  const { bookingId, amount, paymentMethod } = req.body;
  if (!bookingId) {
    return res.status(400).json({ message: 'Booking ID is required' });
  }

  const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record = {
    transactionId,
    bookingId,
    amount: Number(amount) || 0,
    paymentMethod: paymentMethod || 'card',
    status: 'paid',
    timestamp: new Date().toISOString()
  };

  transactions.unshift(record);
  console.log(`[Payment-Service] Settled transaction ${transactionId} for booking ${bookingId} ($${record.amount})`);

  res.json({
    success: true,
    ...record
  });
});

// Get Settlement Stats & Analytics
app.get('/stats', (req, res) => {
  const totalRevenue = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  res.json({
    totalRevenue,
    totalTransactions: transactions.length,
    settlementRate: '100%'
  });
});

// Get Transaction Ledger
app.get('/transactions', (req, res) => {
  res.json(transactions);
});

app.listen(PORT, () => {
  console.log(`[Payment-Service] Listening on port ${PORT}`);
});

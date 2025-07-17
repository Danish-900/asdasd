import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// In-memory settings store (could be moved to database)
let appSettings = {
  scanner: {
    resolution: 300,
    colorMode: 'grayscale',
    autoFeed: true,
    duplex: false,
  },
  processing: {
    confidenceThreshold: 0.7,
    autoProcessing: true,
    batchSize: 50,
  },
  exam: {
    defaultQuestions: 100,
    passingScore: 60,
    allowPartialCredit: false,
  },
  database: {
    connectionString: 'mongodb+srv://dani:123@cluster0.zgjz474.mongodb.net/',
    connected: true,
  },
};

// Get all settings
router.get('/', (req, res) => {
  res.json(appSettings);
});

// Update settings
router.put('/', (req, res) => {
  try {
    const updates = req.body;
    
    // Merge updates with existing settings
    appSettings = {
      ...appSettings,
      ...updates,
      scanner: { ...appSettings.scanner, ...(updates.scanner || {}) },
      processing: { ...appSettings.processing, ...(updates.processing || {}) },
      exam: { ...appSettings.exam, ...(updates.exam || {}) },
      database: { ...appSettings.database, ...(updates.database || {}) },
    };

    res.json(appSettings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Test database connection
router.post('/test-db', async (req, res) => {
  try {
    const state = mongoose.connection.readyState;
    const status = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    res.json({
      connected: state === 1,
      status: status[state],
      host: mongoose.connection.host,
      database: mongoose.connection.name,
    });
  } catch (error) {
    res.status(500).json({ error: 'Database connection test failed' });
  }
});

// Reset settings to defaults
router.post('/reset', (req, res) => {
  appSettings = {
    scanner: {
      resolution: 300,
      colorMode: 'grayscale',
      autoFeed: true,
      duplex: false,
    },
    processing: {
      confidenceThreshold: 0.7,
      autoProcessing: true,
      batchSize: 50,
    },
    exam: {
      defaultQuestions: 100,
      passingScore: 60,
      allowPartialCredit: false,
    },
    database: {
      connectionString: 'mongodb+srv://dani:123@cluster0.e1vm0zs.mongodb.net/',
      connected: true,
    },
  };

  res.json({ message: 'Settings reset to defaults', settings: appSettings });
});

// Get scanner status
router.get('/scanner-status', (req, res) => {
  res.json({
    available: true,
    devices: [
      { id: 'scanner1', name: 'Default Scanner', status: 'ready' },
    ],
    currentDevice: 'scanner1',
  });
});

export default router;
const express = require('express');
const router = express.Router();
const analytics = require('../services/analytics');
const aiAnalyzer = require('../services/aiAnalyzer');

// Get statistics - default (without timeRange parameter)
router.get('/stats', async (req, res) => {
  try {
    const stats = analytics.getStatistics('24h');
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get statistics - with timeRange
router.get('/stats/:timeRange', async (req, res) => {
  try {
    const timeRange = req.params.timeRange || '24h';
    const stats = analytics.getStatistics(timeRange);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get realtime stats
router.get('/realtime', async (req, res) => {
  try {
    const stats = analytics.getRealtimeStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate JSON report
router.post('/generate/json', async (req, res) => {
  try {
    const { timeRange } = req.body;
    const report = await analytics.generateJSONReport(timeRange || '24h');
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate CSV report
router.post('/generate/csv', async (req, res) => {
  try {
    const { timeRange } = req.body;
    const report = await analytics.generateCSVReport(timeRange || '24h');
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate AI report
router.post('/generate/ai-report', async (req, res) => {
  try {
    const { attacks, timeRange } = req.body;
    const report = await aiAnalyzer.generateFullReport(attacks, timeRange);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get AI analysis for specific attack
router.post('/analyze-attack', async (req, res) => {
  try {
    const { attack } = req.body;
    const analysis = await aiAnalyzer.analyzeAttack(attack);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

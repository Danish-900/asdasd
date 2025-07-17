import express from 'express';
import multer from 'multer';
import cv from 'opencv-wasm';
import Response from '../models/Response.js';
import Exam from '../models/Exam.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Image processing service
class OMRProcessor {
  constructor() {
    this.bubbleRadius = { min: 10, max: 30 };
    this.confidenceThreshold = 0.7;
  }

  async processAnswerSheet(imageBuffer, numQuestions) {
    try {
      // Decode image from buffer
      const mat = cv.imdecode(imageBuffer);
      
      // Preprocess image
      const gray = mat.cvtColor(cv.COLOR_BGR2GRAY);
      const blurred = gray.gaussianBlur(new cv.Size(5, 5), 0);
      const thresh = blurred.threshold(0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
      
      // Find contours for bubble detection
      const contours = thresh.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      const bubbles = this.extractBubbles(contours, thresh);
      const responses = this.interpretResponses(bubbles, numQuestions);
      
      return {
        responses,
        confidence: this.calculateConfidence(bubbles),
        processingTime: Date.now(),
      };
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  extractBubbles(contours, thresh) {
    const bubbles = [];
    
    for (const contour of contours) {
      const area = contour.area;
      const perimeter = contour.arcLength(true);
      
      if (area < 100 || area > 5000) continue;
      
      const approx = contour.approxPolyDP(0.02 * perimeter, true);
      const bounds = contour.boundingRect();
      
      // Check if contour is roughly circular (bubble-like)
      const aspectRatio = bounds.width / bounds.height;
      if (aspectRatio > 0.7 && aspectRatio < 1.3) {
        const mask = new cv.Mat(thresh.rows, thresh.cols, cv.CV_8UC1, cv.Scalar.all(0));
        mask.drawContours([contour], -1, new cv.Scalar(255), -1);
        
        const masked = thresh.bitwiseAnd(mask);
        const total = cv.countNonZero(masked);
        
        bubbles.push({
          bounds,
          filled: total / area > 0.5,
          confidence: Math.min(total / area, 1.0),
          area,
        });
      }
    }
    
    return bubbles.sort((a, b) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x);
  }

  interpretResponses(bubbles, numQuestions) {
    const responses = [];
    const questionsPerRow = 5; // A, B, C, D, E
    
    for (let q = 0; q < numQuestions; q++) {
      const startIdx = q * questionsPerRow;
      const questionBubbles = bubbles.slice(startIdx, startIdx + questionsPerRow);
      
      const filledBubbles = questionBubbles.filter(b => b.filled);
      
      if (filledBubbles.length === 0) {
        responses.push('BLANK');
      } else if (filledBubbles.length > 1) {
        responses.push('MULTIPLE');
      } else {
        const bubbleIndex = questionBubbles.indexOf(filledBubbles[0]);
        responses.push(['A', 'B', 'C', 'D', 'E'][bubbleIndex] || 'BLANK');
      }
    }
    
    return responses;
  }

  calculateConfidence(bubbles) {
    const avgConfidence = bubbles.reduce((sum, b) => sum + b.confidence, 0) / bubbles.length;
    return Math.round(avgConfidence * 100);
  }
}

const processor = new OMRProcessor();

// Process scanned images
router.post('/process', upload.single('image'), async (req, res) => {
  try {
    const { examId, studentId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const exam = await Exam.findOne({ examId });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Process the image using OMRProcessor
    const processingResult = await processor.processAnswerSheet(req.file.buffer, exam.numQuestions);
    
    // Calculate score based on responses
    const scoreData = calculateScore(processingResult.responses, exam.answerKey);

    const response = new Response({
      examId,
      studentId,
      responses: processingResult.responses,
      score: scoreData.score,
      accuracy: Math.round(scoreData.accuracy * 100) / 100,
      correctAnswers: scoreData.correct,
      incorrectAnswers: scoreData.incorrect,
      blankAnswers: scoreData.blank,
      multipleMarks: scoreData.multiple,
      processingMetadata: {
        confidence: processingResult.confidence,
        processingTime: processingResult.processingTime,
      },
    });

    await response.save();

    res.json({
      success: true,
      response,
      processingMetadata: processingResult,
    });

  } catch (error) {
    console.error('Scan processing error:', error);
    res.status(500).json({ error: 'Failed to process scan' });
  }
});

// Calculate score helper
function calculateScore(responses, answerKey) {
  let correct = 0;
  let incorrect = 0;
  let blank = 0;
  let multiple = 0;

  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    const correctAnswer = answerKey[i];

    if (response === 'BLANK') {
      blank++;
    } else if (response === 'MULTIPLE') {
      multiple++;
      incorrect++;
    } else if (response === correctAnswer) {
      correct++;
    } else {
      incorrect++;
    }
  }

  const score = correct;
  const accuracy = (correct / answerKey.length) * 100;

  return { score, accuracy, correct, incorrect, blank, multiple };
}

// Get scanning status
router.get('/status', (req, res) => {
  res.json({
    scannerConnected: true,
    processingQueue: 0,
    lastScanTime: new Date().toISOString(),
  });
});

export default router;
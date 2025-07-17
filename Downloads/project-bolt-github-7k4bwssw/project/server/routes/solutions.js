import express from 'express';
import multer from 'multer';
import Solution from '../models/Solution.js';
import Exam from '../models/Exam.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload solution sheet
router.post('/:examId/upload', upload.single('file'), async (req, res) => {
  try {
    const { examId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const exam = await Exam.findOne({ examId });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Parse solutions from FormData
    let solutions;
    try {
      solutions = JSON.parse(req.body.solutions);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid solutions format. Expected JSON array.' });
    }
    
    if (!Array.isArray(solutions)) {
      return res.status(400).json({ error: 'Solutions data must be an array' });
    }

    // Validate solutions format
    const validSolutions = solutions.filter(sol => 
      sol.question && 
      typeof sol.question === 'number' && 
      sol.answer && 
      ['A', 'B', 'C', 'D', 'E'].includes(sol.answer)
    );

    if (validSolutions.length !== exam.numQuestions) {
      return res.status(400).json({ 
        error: `Expected ${exam.numQuestions} solutions, got ${validSolutions.length}` 
      });
    }

    // Remove existing solution if any
    await Solution.deleteOne({ examId });

    // Save new solution
    const solution = new Solution({
      examId,
      solutions: validSolutions,
    });

    await solution.save();

    // Update exam to mark solution as uploaded
    await Exam.findOneAndUpdate(
      { examId },
      { solutionUploaded: true }
    );

    res.json({
      message: 'Solution uploaded successfully',
      solutionCount: validSolutions.length,
    });

  } catch (error) {
    console.error('Solution upload error:', error);
    res.status(500).json({ error: 'Failed to upload solution', details: error.message });
  }
});

// Get solution for an exam
router.get('/:examId', async (req, res) => {
  try {
    const { examId } = req.params;
    
    const solution = await Solution.findOne({ examId });
    if (!solution) {
      return res.status(404).json({ error: 'Solution not found' });
    }

    res.json(solution);
    
  } catch (error) {
    console.error('Get solution error:', error);
    res.status(500).json({ error: 'Failed to fetch solution', details: error.message });
  }
});

export default router;
import express from 'express';
import Exam from '../models/Exam.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Create new exam
router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      dateTime, 
      numQuestions, 
      marksPerMcq, 
      passingPercentage,
      wing,
      course,
      module,
      sponsorDS,
      instructions 
    } = req.body;

    if (!name || !dateTime || !numQuestions || !marksPerMcq || 
        passingPercentage === undefined || !wing || !course || !module || !sponsorDS) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (numQuestions < 1 || numQuestions > 200) {
      return res.status(400).json({ error: 'Number of questions must be between 1 and 200' });
    }

    if (marksPerMcq < 0.5) {
      return res.status(400).json({ error: 'Marks per MCQ must be at least 0.5' });
    }

    if (passingPercentage < 0 || passingPercentage > 100) {
      return res.status(400).json({ error: 'Passing percentage must be between 0 and 100' });
    }

    const exam = new Exam({
      examId: uuidv4(),
      name,
      dateTime: new Date(dateTime),
      numQuestions,
      marksPerMcq,
      passingPercentage,
      wing,
      course,
      module,
      sponsorDS,
      instructions: instructions || '',
    });

    await exam.save();
    res.status(201).json(exam);
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({ error: 'Failed to create exam' });
  }
});

// Get all exams
router.get('/', async (req, res) => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });
    res.json(exams);
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

// Get exam by ID
router.get('/:examId', async (req, res) => {
  try {
    const exam = await Exam.findOne({ examId: req.params.examId });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    res.json(exam);
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({ error: 'Failed to fetch exam' });
  }
});

// Update exam
router.put('/:examId', async (req, res) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { examId: req.params.examId },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    
    res.json(exam);
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({ error: 'Failed to update exam' });
  }
});

// Delete exam
router.delete('/:examId', async (req, res) => {
  try {
    const exam = await Exam.findOneAndDelete({ examId: req.params.examId });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({ error: 'Failed to delete exam' });
  }
});

export default router;
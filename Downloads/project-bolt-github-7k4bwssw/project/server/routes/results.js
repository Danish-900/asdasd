import express from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import Response from '../models/Response.js';
import Exam from '../models/Exam.js';
import Student from '../models/Student.js';
import Solution from '../models/Solution.js';
import Result from '../models/Result.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Process answer sheets
router.post('/:examId/process', upload.single('file'), async (req, res) => {
  try {
    const { examId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const exam = await Exam.findOne({ examId });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const solution = await Solution.findOne({ examId });
    if (!solution) {
      return res.status(400).json({ error: 'Solution not uploaded yet' });
    }

    const students = await Student.find({ examId });
    if (students.length === 0) {
      return res.status(400).json({ error: 'No students found' });
    }

    // For demo purposes, we'll simulate OCR processing
    // In a real implementation, you would use tesseract.js or similar
    const results = await simulateAnswerProcessing(exam, students, solution);
    
    // Save results to database
    await Result.deleteMany({ examId }); // Clear existing results
    await Result.insertMany(results);

    res.json({
      message: 'Answer sheets processed successfully',
      processedCount: results.length,
      results: results.map(r => ({
        studentName: r.studentName,
        score: r.score,
        totalMarks: r.totalMarks,
        percentage: r.percentage,
        result: r.result,
      })),
    });

  } catch (error) {
    console.error('Answer processing error:', error);
    res.status(500).json({ error: 'Failed to process answer sheets' });
  }
});

// Get results for an exam
router.get('/:examId/report', async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await Exam.findOne({ examId });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const results = await Result.find({ examId })
      .populate('studentId')
      .sort({ percentage: -1 });

    const reportData = results.map(result => ({
      studentName: result.studentId.name,
      lockerNumber: result.studentId.lockerNumber,
      rank: result.studentId.rank,
      score: result.score,
      totalMarks: result.totalMarks,
      percentage: result.percentage,
      result: result.result,
    }));

    const summary = {
      totalStudents: results.length,
      passCount: results.filter(r => r.result === 'Pass').length,
      failCount: results.filter(r => r.result === 'Fail').length,
      averagePercentage: results.reduce((sum, r) => sum + r.percentage, 0) / results.length,
      highestScore: Math.max(...results.map(r => r.score)),
      lowestScore: Math.min(...results.map(r => r.score)),
    };

    res.json({
      exam: {
        name: exam.name,
        dateTime: exam.dateTime,
        numQuestions: exam.numQuestions,
        marksPerMcq: exam.marksPerMcq,
        passingPercentage: exam.passingPercentage,
      },
      summary,
      results: reportData,
    });

  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Download results as Excel
router.get('/:examId/download/excel', async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await Exam.findOne({ examId });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const results = await Result.find({ examId })
      .populate('studentId')
      .sort({ percentage: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Results');

    // Headers
    worksheet.columns = [
      { header: 'Student Name', key: 'name', width: 25 },
      { header: 'Locker Number', key: 'lockerNumber', width: 15 },
      { header: 'Rank', key: 'rank', width: 15 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Total Marks', key: 'totalMarks', width: 12 },
      { header: 'Percentage', key: 'percentage', width: 12 },
      { header: 'Result', key: 'result', width: 10 },
    ];

    // Add data
    results.forEach(result => {
      worksheet.addRow({
        name: result.studentId.name,
        lockerNumber: result.studentId.lockerNumber,
        rank: result.studentId.rank,
        score: result.score,
        totalMarks: result.totalMarks,
        percentage: `${result.percentage.toFixed(2)}%`,
        result: result.result,
      });
    });

    // Style headers
    worksheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${exam.name}_Results.xlsx"`);
    res.send(buffer);

  } catch (error) {
    console.error('Excel download error:', error);
    res.status(500).json({ error: 'Failed to download Excel report' });
  }
});

// Download results as PDF
router.get('/:examId/download/pdf', async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await Exam.findOne({ examId });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const results = await Result.find({ examId })
      .populate('studentId')
      .sort({ percentage: -1 });

    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${exam.name}_Results.pdf"`);
    
    doc.pipe(res);

    // Title
    doc.fontSize(20).text('Exam Results Report', { align: 'center' });
    doc.fontSize(14).text(`Exam: ${exam.name}`, { align: 'center' });
    doc.text(`Date: ${exam.dateTime.toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    const passCount = results.filter(r => r.result === 'Pass').length;
    const failCount = results.filter(r => r.result === 'Fail').length;
    const avgPercentage = results.reduce((sum, r) => sum + r.percentage, 0) / results.length;

    doc.fontSize(16).text('Summary', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Students: ${results.length}`);
    doc.text(`Pass: ${passCount} | Fail: ${failCount}`);
    doc.text(`Average Percentage: ${avgPercentage.toFixed(2)}%`);
    doc.moveDown();

    // Results table
    doc.fontSize(14).text('Individual Results', { underline: true });
    doc.fontSize(10);
    
    const tableTop = doc.y + 20;
    doc.text('Name', 50, tableTop);
    doc.text('Locker #', 200, tableTop);
    doc.text('Rank', 270, tableTop);
    doc.text('Score', 320, tableTop);
    doc.text('Percentage', 370, tableTop);
    doc.text('Result', 450, tableTop);

    let currentY = tableTop + 20;
    results.forEach(result => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }
      
      doc.text(result.studentId.name, 50, currentY);
      doc.text(result.studentId.lockerNumber, 200, currentY);
      doc.text(result.studentId.rank, 270, currentY);
      doc.text(`${result.score}/${result.totalMarks}`, 320, currentY);
      doc.text(`${result.percentage.toFixed(2)}%`, 370, currentY);
      doc.text(result.result, 450, currentY);
      
      currentY += 15;
    });

    doc.end();

  } catch (error) {
    console.error('PDF download error:', error);
    res.status(500).json({ error: 'Failed to download PDF report' });
  }
});

// Helper function to simulate answer processing
async function simulateAnswerProcessing(exam, students, solution) {
  const results = [];
  
  for (const student of students) {
    // Simulate random answers for demo
    const answers = [];
    let correctCount = 0;
    
    for (let i = 1; i <= exam.numQuestions; i++) {
      const correctAnswer = solution.solutions.find(s => s.question === i)?.answer;
      const studentAnswer = Math.random() > 0.3 ? // 70% chance of answering
        ['A', 'B', 'C', 'D', 'E'][Math.floor(Math.random() * 5)] : 'BLANK';
      
      answers.push({ question: i, answer: studentAnswer });
      
      if (studentAnswer === correctAnswer) {
        correctCount++;
      }
    }
    
    const score = correctCount * exam.marksPerMcq;
    const totalMarks = exam.numQuestions * exam.marksPerMcq;
    const percentage = (score / totalMarks) * 100;
    const result = percentage >= exam.passingPercentage ? 'Pass' : 'Fail';
    
    results.push({
      examId: exam.examId,
      studentId: student._id,
      studentName: student.name,
      answers,
      score,
      totalMarks,
      percentage,
      result,
    });
  }
  
  return results;
}
// Get results for specific exam
router.get('/exam/:examId', async (req, res) => {
  try {
    const { examId } = req.params;
    const { page = 1, limit = 20, sortBy = 'processedAt', order = 'desc' } = req.query;

    const exam = await Exam.findOne({ examId });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const sortOrder = order === 'desc' ? -1 : 1;
    const skip = (page - 1) * limit;

    const responses = await Response.find({ examId })
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Response.countDocuments({ examId });

    // Calculate aggregate statistics
    const stats = await calculateExamStats(examId);

    res.json({
      responses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      statistics: stats,
    });

  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Get individual student result
router.get('/student/:examId/:studentId', async (req, res) => {
  try {
    const { examId, studentId } = req.params;

    const response = await Response.findOne({ examId, studentId });
    if (!response) {
      return res.status(404).json({ error: 'Student response not found' });
    }

    const exam = await Exam.findOne({ examId });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Provide detailed question-by-question analysis
    const questionAnalysis = response.responses.map((studentAnswer, index) => ({
      questionNumber: index + 1,
      studentAnswer,
      correctAnswer: exam.answerKey[index],
      isCorrect: studentAnswer === exam.answerKey[index],
      status: getAnswerStatus(studentAnswer),
    }));

    res.json({
      response,
      exam: {
        name: exam.name,
        numQuestions: exam.numQuestions,
      },
      questionAnalysis,
    });

  } catch (error) {
    console.error('Get student result error:', error);
    res.status(500).json({ error: 'Failed to fetch student result' });
  }
});

// Get aggregate statistics
router.get('/stats/:examId', async (req, res) => {
  try {
    const { examId } = req.params;
    const stats = await calculateExamStats(examId);
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Helper function to calculate exam statistics
async function calculateExamStats(examId) {
  const responses = await Response.find({ examId });
  const exam = await Exam.findOne({ examId });

  if (responses.length === 0) {
    return {
      totalStudents: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      passingRate: 0,
      scoreDistribution: [],
      questionAnalysis: [],
    };
  }

  const scores = responses.map(r => r.score);
  const totalStudents = responses.length;
  const averageScore = scores.reduce((a, b) => a + b, 0) / totalStudents;
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);
  const passingScore = exam.settings?.passingScore || 60;
  const passingCount = scores.filter(score => (score / exam.numQuestions) * 100 >= passingScore).length;
  const passingRate = (passingCount / totalStudents) * 100;

  // Score distribution
  const ranges = [
    { min: 0, max: 20, label: '0-20%' },
    { min: 21, max: 40, label: '21-40%' },
    { min: 41, max: 60, label: '41-60%' },
    { min: 61, max: 80, label: '61-80%' },
    { min: 81, max: 100, label: '81-100%' },
  ];

  const scoreDistribution = ranges.map(range => {
    const count = scores.filter(score => {
      const percentage = (score / exam.numQuestions) * 100;
      return percentage >= range.min && percentage <= range.max;
    }).length;

    return {
      range: range.label,
      count,
      percentage: (count / totalStudents) * 100,
    };
  });

  // Question analysis
  const questionAnalysis = [];
  for (let i = 0; i < exam.numQuestions; i++) {
    const correctCount = responses.filter(r => r.responses[i] === exam.answerKey[i]).length;
    const correctPercentage = (correctCount / totalStudents) * 100;
    
    let difficulty = 'Easy';
    if (correctPercentage < 30) difficulty = 'Very Hard';
    else if (correctPercentage < 50) difficulty = 'Hard';
    else if (correctPercentage < 70) difficulty = 'Medium';

    // Find most common wrong answer
    const wrongAnswers = responses
      .map(r => r.responses[i])
      .filter(answer => answer !== exam.answerKey[i] && answer !== 'BLANK')
      .reduce((acc, answer) => {
        acc[answer] = (acc[answer] || 0) + 1;
        return acc;
      }, {});

    const commonWrongAnswer = Object.keys(wrongAnswers).length > 0
      ? Object.keys(wrongAnswers).reduce((a, b) => wrongAnswers[a] > wrongAnswers[b] ? a : b)
      : 'None';

    questionAnalysis.push({
      questionNumber: i + 1,
      correctPercentage: Math.round(correctPercentage),
      difficulty,
      commonWrongAnswer,
    });
  }

  return {
    totalStudents,
    averageScore: Math.round(averageScore * 100) / 100,
    highestScore,
    lowestScore,
    passingRate: Math.round(passingRate * 100) / 100,
    scoreDistribution,
    questionAnalysis,
  };
}

// Helper function to get answer status
function getAnswerStatus(answer) {
  switch (answer) {
    case 'BLANK': return 'No Answer';
    case 'MULTIPLE': return 'Multiple Marks';
    default: return 'Answered';
  }
}

export default router;
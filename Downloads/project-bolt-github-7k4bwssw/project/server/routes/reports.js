import express from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import Response from '../models/Response.js';
import Exam from '../models/Exam.js';
import Report from '../models/Report.js';

const router = express.Router();

// Generate Excel report
router.post('/excel/:examId', async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await Exam.findOne({ examId });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const responses = await Response.find({ examId }).sort({ studentId: 1 });
    
    const workbook = new ExcelJS.Workbook();
    
    // Individual Results Sheet
    const resultsSheet = workbook.addWorksheet('Individual Results');
    
    // Headers
    const headers = ['Student ID', 'Score', 'Accuracy (%)', 'Correct', 'Incorrect', 'Blank', 'Multiple Marks', 'Processed At'];
    resultsSheet.addRow(headers);
    
    // Style headers
    resultsSheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } };
    });

    // Add data rows
    responses.forEach(response => {
      resultsSheet.addRow([
        response.studentId,
        response.score,
        Math.round(response.accuracy * 100) / 100,
        response.correctAnswers,
        response.incorrectAnswers,
        response.blankAnswers,
        response.multipleMarks,
        response.processedAt.toLocaleDateString(),
      ]);
    });

    // Auto-fit columns
    resultsSheet.columns.forEach(column => {
      column.width = 15;
    });

    // Statistics Sheet
    const statsSheet = workbook.addWorksheet('Statistics');
    const stats = await calculateExamStats(examId);
    
    statsSheet.addRow(['Exam Statistics']);
    statsSheet.addRow(['Total Students', stats.totalStudents]);
    statsSheet.addRow(['Average Score', stats.averageScore]);
    statsSheet.addRow(['Highest Score', stats.highestScore]);
    statsSheet.addRow(['Lowest Score', stats.lowestScore]);
    statsSheet.addRow(['Passing Rate (%)', stats.passingRate]);
    
    // Question Analysis Sheet
    const qaSheet = workbook.addWorksheet('Question Analysis');
    qaSheet.addRow(['Question #', 'Correct %', 'Difficulty', 'Common Wrong Answer']);
    
    stats.questionAnalysis.forEach(qa => {
      qaSheet.addRow([qa.questionNumber, qa.correctPercentage, qa.difficulty, qa.commonWrongAnswer]);
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Save report record
    const report = new Report({
      examId,
      reportType: 'Excel',
      data: stats,
    });
    await report.save();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${exam.name}_Report.xlsx"`);
    res.send(buffer);

  } catch (error) {
    console.error('Excel report error:', error);
    res.status(500).json({ error: 'Failed to generate Excel report' });
  }
});

// Generate PDF report
router.post('/pdf/:examId', async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await Exam.findOne({ examId });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const responses = await Response.find({ examId }).sort({ studentId: 1 });
    const stats = await calculateExamStats(examId);
    
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${exam.name}_Report.pdf"`);
    
    doc.pipe(res);

    // Title
    doc.fontSize(20).text('EFSoft OMR Report', { align: 'center' });
    doc.fontSize(14).text(`Exam: ${exam.name}`, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Statistics Section
    doc.fontSize(16).text('Exam Statistics', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Students: ${stats.totalStudents}`);
    doc.text(`Average Score: ${stats.averageScore}`);
    doc.text(`Highest Score: ${stats.highestScore}`);
    doc.text(`Lowest Score: ${stats.lowestScore}`);
    doc.text(`Passing Rate: ${stats.passingRate}%`);
    doc.moveDown();

    // Score Distribution
    doc.fontSize(14).text('Score Distribution', { underline: true });
    doc.fontSize(10);
    stats.scoreDistribution.forEach(dist => {
      doc.text(`${dist.range}: ${dist.count} students (${Math.round(dist.percentage)}%)`);
    });
    doc.moveDown();

    // Question Analysis (first 20 questions to fit on page)
    doc.fontSize(14).text('Question Analysis (Top 20)', { underline: true });
    doc.fontSize(8);
    
    const topQuestions = stats.questionAnalysis.slice(0, 20);
    topQuestions.forEach(qa => {
      doc.text(`Q${qa.questionNumber}: ${qa.correctPercentage}% correct - ${qa.difficulty}`);
    });

    // Individual Results Table
    doc.addPage();
    doc.fontSize(16).text('Individual Results', { underline: true });
    doc.fontSize(8);
    
    // Table headers
    const tableTop = doc.y + 20;
    doc.text('Student ID', 50, tableTop);
    doc.text('Score', 150, tableTop);
    doc.text('Accuracy', 200, tableTop);
    doc.text('Correct', 250, tableTop);
    doc.text('Incorrect', 300, tableTop);
    doc.text('Blank', 350, tableTop);
    doc.text('Multiple', 400, tableTop);

    // Table rows
    let currentY = tableTop + 20;
    responses.slice(0, 40).forEach((response, index) => { // Limit to 40 results per page
      if (currentY > 700) { // Start new page if needed
        doc.addPage();
        currentY = 50;
      }
      
      doc.text(response.studentId, 50, currentY);
      doc.text(response.score.toString(), 150, currentY);
      doc.text(`${Math.round(response.accuracy)}%`, 200, currentY);
      doc.text(response.correctAnswers.toString(), 250, currentY);
      doc.text(response.incorrectAnswers.toString(), 300, currentY);
      doc.text(response.blankAnswers.toString(), 350, currentY);
      doc.text(response.multipleMarks.toString(), 400, currentY);
      
      currentY += 15;
    });

    doc.end();

    // Save report record
    const report = new Report({
      examId,
      reportType: 'PDF',
      data: stats,
    });
    await report.save();

  } catch (error) {
    console.error('PDF report error:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

// Get report history
router.get('/history/:examId', async (req, res) => {
  try {
    const { examId } = req.params;
    const reports = await Report.find({ examId }).sort({ generatedAt: -1 });
    res.json(reports);
  } catch (error) {
    console.error('Get report history error:', error);
    res.status(500).json({ error: 'Failed to fetch report history' });
  }
});

// Helper function (same as in results.js)
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

  const questionAnalysis = [];
  for (let i = 0; i < exam.numQuestions; i++) {
    const correctCount = responses.filter(r => r.responses[i] === exam.answerKey[i]).length;
    const correctPercentage = (correctCount / totalStudents) * 100;
    
    let difficulty = 'Easy';
    if (correctPercentage < 30) difficulty = 'Very Hard';
    else if (correctPercentage < 50) difficulty = 'Hard';
    else if (correctPercentage < 70) difficulty = 'Medium';

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

export default router;
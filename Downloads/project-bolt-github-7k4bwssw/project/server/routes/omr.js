import express from 'express';
import { jsPDF } from 'jspdf'; // Use named import for jsPDF
import { createCanvas } from 'canvas'; // Required for Node.js environment
import archiver from 'archiver';
import Student from '../models/Student.js';
import Exam from '../models/Exam.js';

const router = express.Router();

// Generate OMR sheets for an exam
router.get('/:examId/sheets', async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await Exam.findOne({ examId });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const students = await Student.find({ examId }).sort({ copyNumber: 1 });
    if (students.length === 0) {
      return res.status(400).json({ error: 'No students found for this exam' });
    }

    const sheets = students.map(student => generateOMRSheet(exam, student));
    
    res.json({
      examName: exam.name,
      totalSheets: sheets.length,
      sheets: sheets.map(sheet => ({
        studentName: sheet.studentName,
        copyNumber: sheet.copyNumber,
        previewData: sheet.previewData,
      })),
    });

  } catch (error) {
    console.error('OMR sheets generation error:', error);
    res.status(500).json({ error: 'Failed to generate OMR sheets', details: error.message });
  }
});

// Download OMR sheets as PDF bundle
router.get('/:examId/download', async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await Exam.findOne({ examId });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const students = await Student.find({ examId }).sort({ copyNumber: 1 });
    if (students.length === 0) {
      return res.status(400).json({ error: 'No students found for this exam' });
    }

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${exam.name}_OMR_Sheets.zip"`);
    
    archive.pipe(res);

    // Generate PDF for each student
    for (const student of students) {
      const pdfBuffer = await generateOMRPDF(exam, student);
      archive.append(pdfBuffer, { name: `${student.copyNumber}_${student.name}_OMR.pdf` });
    }

    await archive.finalize();

  } catch (error) {
    console.error('OMR download error:', error);
    res.status(500).json({ error: 'Failed to download OMR sheets', details: error.message });
  }
});

// Helper function to generate OMR sheet data
function generateOMRSheet(exam, student) {
  const totalMarks = exam.numQuestions * exam.marksPerMcq;
  
  return {
    studentName: student.name,
    copyNumber: student.copyNumber,
    previewData: {
      header: {
        dateTime: exam.dateTime.toLocaleString(),
        examSecret: 'EXAM SECRET',
        copyNumber: student.copyNumber,
      },
      body: {
        centerLine: 'SA & MW',
        examDetails: {
          wing: exam.wing,
          course: exam.course,
          module: exam.module,
          sponsorDS: exam.sponsorDS,
          numMcqs: exam.numQuestions,
          marksPerMcq: exam.marksPerMcq,
          totalMarks: totalMarks,
          passingPercentage: exam.passingPercentage,
        },
        studentInfo: {
          lockerNumber: student.lockerNumber,
          rank: student.rank,
          name: student.name,
        },
        instructions: exam.instructions || 'Please fill the bubbles completely with a dark pencil.',
      },
      mcqSection: {
        questions: Array.from({ length: exam.numQuestions }, (_, i) => ({
          number: i + 1,
          options: ['A', 'B', 'C', 'D', 'E'],
        })),
      },
      footer: {
        studentSignature: '',
        result: '',
        invigilatorSignature: '',
      },
    },
  };
}

// Helper function to generate PDF
async function generateOMRPDF(exam, student) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Attach canvas to jsPDF context for Node.js compatibility
  const canvas = createCanvas(1, 1); // Create a minimal canvas
  doc.canvas = canvas; // Attach canvas to jsPDF instance

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  
  // Header
  doc.setFontSize(10);
  doc.text(`DATE & TIME: ${exam.dateTime.toLocaleString()}`, margin, 20);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('EXAM SECRET', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Copy #: ${student.copyNumber}`, pageWidth - margin, 20, { align: 'right' });
  
  // Body - Center line
  let yPos = 35;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SA & MW', pageWidth / 2, yPos, { align: 'center' });
  
  // Exam details
  yPos += 15;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const leftCol = margin;
  const rightCol = pageWidth / 2 + 10;
  
  doc.text(`WING: ${exam.wing}`, leftCol, yPos);
  doc.text(`Number of MCQs: ${exam.numQuestions}`, rightCol, yPos);
  
  yPos += 8;
  doc.text(`COURSE: ${exam.course}`, leftCol, yPos);
  doc.text(`Marks per MCQ: ${exam.marksPerMcq}`, rightCol, yPos);
  
  yPos += 8;
  doc.text(`MODULE: ${exam.module}`, leftCol, yPos);
  doc.text(`Total Marks: ${exam.numQuestions * exam.marksPerMcq}`, rightCol, yPos);
  
  yPos += 8;
  doc.text(`SPONSOR DS: ${exam.sponsorDS}`, leftCol, yPos);
  doc.text(`Passing Percentage: ${exam.passingPercentage}%`, rightCol, yPos);
  
  // Student info and instructions boxes
  yPos += 20;
  const boxHeight = 25;
  
  // Student info box
  doc.rect(margin, yPos, (pageWidth - 2 * margin) / 2 - 5, boxHeight);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDENT INFORMATION', margin + 5, yPos + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Locker Number: ${student.lockerNumber}`, margin + 5, yPos + 15);
  doc.text(`Rank: ${student.rank}`, margin + 5, yPos + 20);
  doc.text(`Name: ${student.name}`, margin + 5, yPos + 25);
  
  // Instructions box
  const instructionsX = pageWidth / 2 + 5;
  doc.rect(instructionsX, yPos, (pageWidth - 2 * margin) / 2 - 5, boxHeight);
  doc.setFont('helvetica', 'bold');
  doc.text('INSTRUCTIONS', instructionsX + 5, yPos + 8);
  doc.setFont('helvetica', 'normal');
  
  const instructions = exam.instructions || 'Please fill the bubbles completely with a dark pencil.';
  const splitInstructions = doc.splitTextToSize(instructions, (pageWidth - 2 * margin) / 2 - 15);
  doc.text(splitInstructions, instructionsX + 5, yPos + 15);
  
  // MCQ bubbles section
  yPos += boxHeight + 15;
  doc.setFont('helvetica', 'bold');
  doc.text('ANSWER SHEET', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  const bubbleSize = 4;
  const bubbleSpacing = 8;
  const questionsPerRow = 5;
  const rowHeight = 12;
  
  for (let i = 0; i < exam.numQuestions; i++) {
    const row = Math.floor(i / questionsPerRow);
    const col = i % questionsPerRow;
    
    const questionY = yPos + row * rowHeight;
    const questionX = margin + col * ((pageWidth - 2 * margin) / questionsPerRow);
    
    // Question number
    doc.setFontSize(8);
    doc.text(`${i + 1}.`, questionX, questionY);
    
    // Bubbles A, B, C, D, E
    const options = ['A', 'B', 'C', 'D', 'E'];
    for (let j = 0; j < options.length; j++) {
      const bubbleX = questionX + 10 + j * bubbleSpacing;
      doc.circle(bubbleX, questionY - 2, bubbleSize / 2);
      doc.text(options[j], bubbleX - 1, questionY + 3);
    }
  }
  
  // Footer
  const footerY = pageHeight - 30;
  doc.setFontSize(10);
  doc.text('STUDENT SIGNATURE: ________________', margin, footerY);
  doc.text('RESULT: ________________', pageWidth / 2, footerY, { align: 'center' });
  doc.text('INVIGILATOR SIGNATURE: ________________', pageWidth - margin, footerY, { align: 'right' });
  
  return Buffer.from(doc.output('arraybuffer'));
}

export default router;
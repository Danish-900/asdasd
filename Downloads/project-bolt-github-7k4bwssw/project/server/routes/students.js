import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import Student from '../models/Student.js';
import Exam from '../models/Exam.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload students from Excel file
router.post('/:examId/upload', upload.single('file'), async (req, res) => {
  try {
    const { examId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify exam exists
    const exam = await Exam.findOne({ examId });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    // Validate required columns
    const requiredColumns = ['Name', 'Locker Number', 'Rank'];
    const firstRow = data[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
    
    if (missingColumns.length > 0) {
      return res.status(400).json({ 
        error: `Missing required columns: ${missingColumns.join(', ')}` 
      });
    }

    // Clear existing students for this exam
    await Student.deleteMany({ examId });

    // Process and save students
    const students = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      if (!row.Name || !row['Locker Number'] || !row.Rank) {
        continue; // Skip empty rows
      }

      const student = new Student({
        examId,
        name: row.Name.toString().trim(),
        lockerNumber: row['Locker Number'].toString().trim(),
        rank: row.Rank.toString().trim(),
        copyNumber: String(i + 1).padStart(3, '0'),
      });

      students.push(student);
    }

    if (students.length === 0) {
      return res.status(400).json({ error: 'No valid student data found' });
    }

    await Student.insertMany(students);

    // Update exam to mark students as uploaded
    await Exam.findOneAndUpdate(
      { examId },
      { studentsUploaded: true }
    );

    res.json({
      message: 'Students uploaded successfully',
      count: students.length,
      students: students.map(s => ({
        name: s.name,
        lockerNumber: s.lockerNumber,
        rank: s.rank,
        copyNumber: s.copyNumber,
      })),
    });

  } catch (error) {
    console.error('Student upload error:', error);
    res.status(500).json({ error: 'Failed to upload students' });
  }
});

// Get students for an exam
router.get('/:examId', async (req, res) => {
  try {
    const { examId } = req.params;
    
    const students = await Student.find({ examId }).sort({ copyNumber: 1 });
    res.json(students);
    
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

export default router;
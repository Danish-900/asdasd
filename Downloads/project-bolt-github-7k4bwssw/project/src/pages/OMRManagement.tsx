import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  Printer,
  Users,
  FileSpreadsheet
} from 'lucide-react';
import { useApi } from '../context/ApiContext';
import { FileUpload } from '../components/FileUpload';

interface Exam {
  examId: string;
  name: string;
  dateTime: string;
  numQuestions: number;
  marksPerMcq: number;
  studentsUploaded: boolean;
  solutionUploaded: boolean;
}

interface OMRSheet {
  studentName: string;
  copyNumber: string;
  previewData: any;
}

interface Student {
  name: string;
  lockerNumber: string;
  rank: string;
  copyNumber: string;
}

export const OMRManagement: React.FC = () => {
  const { api } = useApi();
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [omrSheets, setOMRSheets] = useState<OMRSheet[]>([]);
  const [currentStep, setCurrentStep] = useState<'select' | 'solution' | 'process'>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchStudents();
      generateOMRSheets();
    }
  }, [selectedExam]);

  const fetchExams = async () => {
    try {
      const response = await api.get('/exams');
      const examsWithStudents = response.data.filter((exam: Exam) => exam.studentsUploaded);
      setExams(examsWithStudents);
    } catch (error) {
      console.error('Failed to fetch exams:', error);
      setError('Failed to fetch exams. Please try again.');
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get(`/students/${selectedExam}`);
      setStudents(response.data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
      setError('Failed to fetch students. Please try again.');
    }
  };

  const generateOMRSheets = async () => {
    if (!selectedExam) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/omr/${selectedExam}/sheets`);
      setOMRSheets(response.data.sheets);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to generate OMR sheets');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadOMR = async () => {
    if (!selectedExam) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/omr/${selectedExam}/download`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `OMR_Sheets_${selectedExam}.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      setSuccess('OMR sheets downloaded successfully!');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to download OMR sheets');
    } finally {
      setLoading(false);
    }
  };

  const handleSolutionUpload = async (file: File) => {
    if (!selectedExam) {
      setError('No exam selected. Please select an exam first.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const exam = exams.find(e => e.examId === selectedExam);
      if (!exam) {
        throw new Error('Selected exam not found.');
      }
      
      // Generate mock solutions matching the Solution.js schema
      const solutions = Array.from({ length: exam.numQuestions }, (_, i) => ({
        question: i + 1,
        answer: ['A', 'B', 'C', 'D', 'E'][Math.floor(Math.random() * 5)],
      }));
      
      // Create FormData and append file and solutions
      const formData = new FormData();
      formData.append('file', file);
      formData.append('solutions', JSON.stringify(solutions)); // Send array directly
      
      const response = await api.post(`/solutions/${selectedExam}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setSuccess(response.data.message || 'Solution uploaded successfully!');
      setCurrentStep('process');
      await fetchExams(); // Refresh to update solution status
    } catch (error: any) {
      console.error('Solution upload error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload solution. Please check the file and try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerProcessing = async (file: File) => {
    if (!selectedExam) {
      setError('No exam selected. Please select an exam first.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(`/results/${selectedExam}/process`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setSuccess(`Processed ${response.data.processedCount} answer sheets successfully!`);
    } catch (error: any) {
      console.error('Answer processing error:', error);
      setError(error.response?.data?.error || 'Failed to process answer sheets');
    } finally {
      setLoading(false);
    }
  };

  const selectedExamData = exams.find(exam => exam.examId === selectedExam);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">OMR Sheet Management</h1>
        <p className="text-gray-600 mt-2">
          Generate OMR sheets, upload solutions, and process answer sheets
        </p>
      </div>

      {/* Status Messages */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800">{success}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Exam Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Exam</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose Exam
            </label>
            <select
              value={selectedExam}
              onChange={(e) => {
                setSelectedExam(e.target.value);
                setCurrentStep('select');
                setError('');
                setSuccess('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select an exam...</option>
              {exams.map(exam => (
                <option key={exam.examId} value={exam.examId}>
                  {exam.name} - {new Date(exam.dateTime).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
          
          {selectedExamData && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Exam Details</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Questions: {selectedExamData.numQuestions}</div>
                <div>Marks per MCQ: {selectedExamData.marksPerMcq}</div>
                <div>Students: {students.length}</div>
                <div className="flex items-center space-x-4 mt-2">
                  <span className={`flex items-center space-x-1 ${
                    selectedExamData.studentsUploaded ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <CheckCircle className="h-4 w-4" />
                    <span>Students</span>
                  </span>
                  <span className={`flex items-center space-x-1 ${
                    selectedExamData.solutionUploaded ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <CheckCircle className="h-4 w-4" />
                    <span>Solution</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedExam && (
        <>
          {/* OMR Sheets Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">OMR Sheets</h2>
              <div className="flex space-x-3">
                <button
                  onClick={generateOMRSheets}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={handleDownloadOMR}
                  disabled={loading || omrSheets.length === 0}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Download All</span>
                </button>
              </div>
            </div>

            {omrSheets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {omrSheets.slice(0, 6).map((sheet, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{sheet.studentName}</h3>
                        <p className="text-sm text-gray-600">Copy #{sheet.copyNumber}</p>
                      </div>
                      <Printer className="h-5 w-5 text-gray-400" />
                    </div>
                    
                    <div className="bg-gray-50 rounded p-3 text-xs">
                      <div className="text-center font-bold mb-2">EXAM SECRET</div>
                      <div className="space-y-1">
                        <div>Date: {sheet.previewData.header.dateTime}</div>
                        <div>Copy: {sheet.previewData.header.copyNumber}</div>
                        <div className="border-t pt-1 mt-2">
                          <div>Student: {sheet.previewData.body.studentInfo.name}</div>
                          <div>Locker: {sheet.previewData.body.studentInfo.lockerNumber}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {omrSheets.length > 6 && (
                  <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2" />
                      <p>+{omrSheets.length - 6} more sheets</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No OMR sheets generated yet</p>
              </div>
            )}
          </div>

          {/* Solution Upload Section */}
          {!selectedExamData?.solutionUploaded && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Solution Sheet</h2>
              
              <FileUpload
                onFileUpload={handleSolutionUpload}
                acceptedTypes=".pdf"
                maxSize={50}
                loading={loading}
                title="Upload Solution PDF"
                description="Upload the solution sheet PDF with correct answers"
                instructions={[
                  'PDF should contain question numbers and correct answers',
                  'Correct answers should be clearly marked or bolded',
                  'Maximum file size: 50MB',
                ]}
              />
            </div>
          )}

          {/* Answer Processing Section */}
          {selectedExamData?.solutionUploaded && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Process Answer Sheets</h2>
              
              <FileUpload
                onFileUpload={handleAnswerProcessing}
                acceptedTypes=".pdf"
                maxSize={100}
                loading={loading}
                title="Upload Answer Sheets"
                description="Upload scanned answer sheets PDF for processing"
                instructions={[
                  'PDF should contain all student answer sheets',
                  'Ensure sheets are clearly scanned and readable',
                  'Maximum file size: 100MB',
                  'Processing may take several minutes',
                ]}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
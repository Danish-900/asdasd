import React, { useState, useEffect } from 'react';
import { 
  Scan, 
  Play, 
  Pause, 
  Square, 
  CheckCircle, 
  AlertTriangle,
  Camera,
  Settings,
  FileImage,
  Upload,
  RefreshCw
} from 'lucide-react';
import { useApi } from '../context/ApiContext';

interface Exam {
  examId: string;
  name: string;
  numQuestions: number;
}

interface ScanProgress {
  currentSheet: number;
  totalSheets: number;
  processed: number;
  errors: number;
  status: 'idle' | 'scanning' | 'processing' | 'completed' | 'error';
}

interface ProcessingResult {
  studentId: string;
  score: number;
  accuracy: number;
  confidence: number;
  status: 'success' | 'warning' | 'error';
  issues?: string[];
}

export const ScanProcess: React.FC = () => {
  const { api } = useApi();
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [scannerConnected, setScannerConnected] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress>({
    currentSheet: 0,
    totalSheets: 0,
    processed: 0,
    errors: 0,
    status: 'idle',
  });
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchExams();
    checkScannerStatus();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await api.get('/exams');
      setExams(response.data);
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    }
  };

  const checkScannerStatus = async () => {
    try {
      const response = await api.get('/scan/status');
      setScannerConnected(response.data.scannerConnected);
    } catch (error) {
      setScannerConnected(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    }
  };

  const startScanning = async () => {
    if (!selectedExam || !studentId) {
      alert('Please select an exam and enter student ID');
      return;
    }

    setIsScanning(true);
    setProgress({
      currentSheet: 1,
      totalSheets: 1,
      processed: 0,
      errors: 0,
      status: 'scanning',
    });

    try {
      // Simulate scanning process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setProgress(prev => ({ ...prev, status: 'processing' }));
      
      if (selectedFile) {
        await processImage(selectedFile);
      } else {
        // Simulate processing without actual file
        await simulateProcessing();
      }
      
    } catch (error) {
      console.error('Scanning failed:', error);
      setProgress(prev => ({ ...prev, status: 'error' }));
    }
  };

  const processImage = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('examId', selectedExam);
      formData.append('studentId', studentId);

      const response = await api.post('/scan/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result: ProcessingResult = {
        studentId,
        score: response.data.response.score,
        accuracy: response.data.response.accuracy,
        confidence: response.data.processingMetadata.confidence,
        status: response.data.processingMetadata.confidence > 70 ? 'success' : 'warning',
        issues: response.data.processingMetadata.confidence < 70 ? ['Low confidence detection'] : [],
      };

      setResults(prev => [...prev, result]);
      setProgress(prev => ({ 
        ...prev, 
        processed: prev.processed + 1,
        status: 'completed' 
      }));

    } catch (error: any) {
      const errorResult: ProcessingResult = {
        studentId,
        score: 0,
        accuracy: 0,
        confidence: 0,
        status: 'error',
        issues: [error.response?.data?.error || 'Processing failed'],
      };

      setResults(prev => [...prev, errorResult]);
      setProgress(prev => ({ 
        ...prev, 
        errors: prev.errors + 1,
        status: 'error' 
      }));
    } finally {
      setIsScanning(false);
    }
  };

  const simulateProcessing = async () => {
    // Simulate processing for demo purposes
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const mockResult: ProcessingResult = {
      studentId,
      score: Math.floor(Math.random() * 50) + 50,
      accuracy: Math.floor(Math.random() * 30) + 70,
      confidence: Math.floor(Math.random() * 20) + 80,
      status: 'success',
      issues: [],
    };

    setResults(prev => [...prev, mockResult]);
    setProgress(prev => ({ 
      ...prev, 
      processed: prev.processed + 1,
      status: 'completed' 
    }));
    setIsScanning(false);
  };

  const stopScanning = () => {
    setIsScanning(false);
    setProgress(prev => ({ ...prev, status: 'idle' }));
  };

  const resetSession = () => {
    setProgress({
      currentSheet: 0,
      totalSheets: 0,
      processed: 0,
      errors: 0,
      status: 'idle',
    });
    setResults([]);
    setSelectedFile(null);
    setStudentId('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Scan & Process Answer Sheets</h1>
        <p className="text-gray-600 mt-2">
          Use your scanner or upload images to process OMR answer sheets
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Exam Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Exam Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Exam
                </label>
                <select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose an exam...</option>
                  {exams.map(exam => (
                    <option key={exam.examId} value={exam.examId}>
                      {exam.name} ({exam.numQuestions} questions)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student ID
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter student ID"
                />
              </div>
            </div>
          </div>

          {/* Scanner Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Scanner Status</h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Connection</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${scannerConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={`text-sm ${scannerConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {scannerConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Device</span>
                <span className="text-sm text-gray-900">Default Scanner</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className="text-sm text-green-600">Ready</span>
              </div>
            </div>

            <button className="w-full mt-4 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <Settings className="h-4 w-4 inline mr-2" />
              Scanner Settings
            </button>
          </div>

          {/* File Upload Alternative */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Image</h2>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileImage className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Click to upload answer sheet image
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG up to 10MB
                  </p>
                </label>
              </div>
              
              {selectedFile && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-3">
                    <FileImage className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">{selectedFile.name}</p>
                      <p className="text-xs text-blue-700">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Processing Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Processing Controls</h2>
              
              <div className="flex space-x-3">
                {!isScanning ? (
                  <button
                    onClick={startScanning}
                    disabled={!selectedExam || !studentId}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Play className="h-4 w-4" />
                    <span>Start Processing</span>
                  </button>
                ) : (
                  <button
                    onClick={stopScanning}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Square className="h-4 w-4" />
                    <span>Stop</span>
                  </button>
                )}
                
                <button
                  onClick={resetSession}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Progress Indicator */}
            {progress.status !== 'idle' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {progress.status === 'scanning' && 'Scanning...'}
                    {progress.status === 'processing' && 'Processing...'}
                    {progress.status === 'completed' && 'Completed'}
                    {progress.status === 'error' && 'Error'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {progress.processed} processed, {progress.errors} errors
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      progress.status === 'error' ? 'bg-red-500' : 
                      progress.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ 
                      width: isScanning ? '50%' : progress.status === 'completed' ? '100%' : '0%' 
                    }}
                  ></div>
                </div>
                
                {isScanning && (
                  <div className="flex items-center space-x-3 text-sm text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>
                      {progress.status === 'scanning' ? 'Capturing image...' : 'Analyzing answer sheet...'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Processing Results</h2>
            
            {results.length === 0 ? (
              <div className="text-center py-8">
                <Scan className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No results yet</p>
                <p className="text-sm text-gray-400">Start scanning to see processed results here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      result.status === 'success' ? 'border-green-200 bg-green-50' :
                      result.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                      'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {result.status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                        {result.status === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                        {result.status === 'error' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                        <span className="font-medium text-gray-900">Student: {result.studentId}</span>
                      </div>
                      <span className={`text-sm font-medium ${
                        result.status === 'success' ? 'text-green-700' :
                        result.status === 'warning' ? 'text-yellow-700' :
                        'text-red-700'
                      }`}>
                        {result.status === 'success' ? 'Success' :
                         result.status === 'warning' ? 'Warning' : 'Error'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Score:</span>
                        <span className="ml-2 font-medium">{result.score}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Accuracy:</span>
                        <span className="ml-2 font-medium">{result.accuracy.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Confidence:</span>
                        <span className="ml-2 font-medium">{result.confidence}%</span>
                      </div>
                    </div>
                    
                    {result.issues && result.issues.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-600 mb-1">Issues:</p>
                        <ul className="text-sm text-gray-700 list-disc list-inside">
                          {result.issues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDarkMode } from '../context/DarkModeContext';
import { api } from '../services/api';
import { ClipboardCheck, Award, TrendingUp, Calendar, Loader2 } from 'lucide-react';

interface Test {
  id: string;
  title: string;
  subject: string;
  board: string;
  standard: number;
  date?: string;
  dateTime?: string;
  totalMarks: number;
  duration: number;
  description?: string;
}

interface TestResult {
  id: string;
  testId: string;
  studentId: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  remarks?: string;
  submittedAt?: any;
}

const StudentTests: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isDarkMode } = useDarkMode();
  const [tests, setTests] = useState<Test[]>([]);
  const [results, setResults] = useState<{ [key: string]: TestResult }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTests();
  }, [user]);

  const loadTests = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load tests for the student's board and standard
      // First, get student profile to know board and standard
      const studentResponse = await api.get<any>(`/students/${user.uid}`);
      const studentProfile = studentResponse.student || studentResponse;
      
      // Get all tests for this board and standard
      const query = `/tests?board=${studentProfile.board}&standard=${studentProfile.standard}&active=true`;
      const testsResponse = await api.get<any>(query);
      let testsList = testsResponse.tests || testsResponse.items || [];
      
      // Filter tests to show only:
      // 1. Tests assigned to all students (no assignTo field)
      // 2. Tests assigned to this specific student (assignTo includes student's userId)
      testsList = testsList.filter((test: any) => {
        if (!test.assignTo || test.assignTo.length === 0) {
          // Test assigned to all students in board/standard
          return true;
        }
        // Test assigned to specific students - check if this student is included
        return test.assignTo.includes(user.uid);
      });
      
      console.log(`Tests for student ${user.uid}:`, testsList.length, 'out of', (testsResponse.tests || testsResponse.items || []).length);
      setTests(testsList);

      // Load results for each test
      const resultsMap: { [key: string]: TestResult } = {};
      for (const test of testsList) {
        try {
          const resultResponse = await api.get<any>(`/tests/${test.id}/results?studentId=${user.uid}`);
          const results = resultResponse.results || resultResponse.items || [];
          if (results.length > 0) {
            const result = results[0];
            // Use test.totalMarks (not result.totalMarks) for percentage calculation
            const totalMarks = test.totalMarks || result.totalMarks || 1; // Fallback to 1 to avoid division by zero
            resultsMap[test.id] = {
              ...result,
              totalMarks: totalMarks,
              percentage: (result.marksObtained / totalMarks) * 100
            };
          }
        } catch (error) {
          console.log(`No result found for test ${test.id}`);
        }
      }
      setResults(resultsMap);
    } catch (error: any) {
      showToast(error.message || 'Failed to load tests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };



  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-700 bg-green-100';
    if (percentage >= 75) return 'text-blue-700 bg-blue-100';
    if (percentage >= 60) return 'text-yellow-700 bg-yellow-100';
    if (percentage >= 40) return 'text-orange-700 bg-orange-100';
    return 'text-red-700 bg-red-100';
  };

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const calculateStats = () => {
    const completedResults = Object.values(results) as TestResult[];
    if (completedResults.length === 0) {
      return {
        totalTests: tests.length,
        completed: 0,
        averageScore: 0,
        highestScore: 0
      };
    }

    const scores = completedResults.map((r: TestResult) => r.percentage);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highest = Math.max(...scores);

    return {
      totalTests: tests.length,
      completed: completedResults.length,
      averageScore: average,
      highestScore: highest
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className={`text-2xl font-bold mb-2 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}><ClipboardCheck size={32} className="text-green-600" />Tests & Results</h1>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Track your test performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className={`rounded-lg shadow-md p-3 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Tests</p>
              <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.totalTests}</p>
            </div>
            <ClipboardCheck className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        
        <div className={`rounded-lg shadow-md p-3 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Completed</p>
              <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.completed}</p>
            </div>
            <Award className="w-6 h-6 text-green-500" />
          </div>
        </div>
        
        <div className={`rounded-lg shadow-md p-3 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Average Score</p>
              <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.averageScore.toFixed(1)}%</p>
            </div>
            <TrendingUp className="w-6 h-6 text-purple-500" />
          </div>
        </div>
        
        <div className={`rounded-lg shadow-md p-3 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Highest Score</p>
              <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.highestScore.toFixed(1)}%</p>
            </div>
            <Award className="w-6 h-6 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Tests List */}
      {tests.length === 0 ? (
        <div className={`text-center py-12 rounded-lg shadow ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <ClipboardCheck className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-xl font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No tests found</h3>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>You don't have any tests assigned yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((test) => {
            const result = results[test.id];
            const hasResult = !!result;

            return (
              <div key={test.id} className={`rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{test.title}</h3>
                    {test.description && (
                      <p className={isDarkMode ? 'text-gray-300 mb-3' : 'text-gray-600 mb-3'}>{test.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-3 text-xs mb-3">
                      <span className={`flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <ClipboardCheck className="w-3 h-3 mr-1" />
                        {test.subject}
                      </span>
                      <span className={`flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(test.date || test.dateTime)}
                      </span>
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                        Duration: {test.duration} min
                      </span>
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                        Total Marks: {test.totalMarks}
                      </span>
                    </div>

                    {/* Result Section */}
                    {hasResult ? (
                      <div className={`mt-3 p-3 rounded-lg ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className={`font-medium mb-2 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Your Result</h4>
                            <div className="flex items-center gap-3">
                              <div>
                                <span className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {result.marksObtained}
                                </span>
                                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}> / {test.totalMarks}</span>
                              </div>
                              <div className={`px-3 py-1 rounded-full font-medium ${getGradeColor(result.percentage)}`}>
                                {result.percentage.toFixed(1)}% - Grade {getGrade(result.percentage)}
                              </div>
                            </div>
                            {result.remarks && (
                              <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                <span className="font-medium">Remarks:</span> {result.remarks}
                              </p>
                            )}
                          </div>
                          <Award className="w-12 h-12 text-gray-400" />
                        </div>
                      </div>
                    ) : (
                      <div className={`mt-3 p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-yellow-50 border-yellow-200'}`}>
                        <p className={`text-xs ${isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                          Result not yet published
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentTests;

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Test, TestResult, Student, ApiListResponse } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { Loader2, ArrowLeft, Plus, Edit2, Trash2, Award, TrendingUp, TrendingDown, Download, FileText } from 'lucide-react';
import Modal from '../components/Modal';

interface TestResultWithStudent extends TestResult {
  studentName?: string;
  studentEmail?: string;
  percentage?: number;
  rank?: number;
  gradeLetter?: string;
}
const TestResults: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();

  const [test, setTest] = useState<Test | null>(null);
  const [results, setResults] = useState<TestResultWithStudent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    submitted: 0,
    pending: 0,
    average: 0,
    highest: 0,
    lowest: 0
  });

  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<TestResultWithStudent | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [resultForm, setResultForm] = useState({
    studentId: '',
    marksObtained: '',
    remarks: ''
  });

  const [bulkResults, setBulkResults] = useState<Array<{
    studentId: string;
    marksObtained: number;
    remarks: string;
  }>>([]);

  const isAdmin = user?.role === 'admin' || user?.role === 'teacher';

  useEffect(() => {
    loadData();
  }, [testId]);

  const loadData = async () => {
    if (!testId) return;
    setLoading(true);
    try {
      // Load test details
      const testsResponse = await api.get<ApiListResponse<Test>>('/tests?limit=1000');
      const foundTest = testsResponse.items.find(t => t.id === testId);
      if (!foundTest) throw new Error('Test not found');
      setTest(foundTest);

      // Load students for this test (board and standard)
      const studentsResponse = await api.get<ApiListResponse<Student>>(
        `/students?board=${foundTest.board}&standard=${foundTest.standard}&limit=1000`
      );
      setStudents(studentsResponse.items || []);

      // Load test results
      try {
        const resultsResponse = await api.get<ApiListResponse<TestResult>>(
          `/tests/${testId}/results`
        );
        
        // Enrich results with student info and calculate ranks
        const enrichedResults = (resultsResponse.items || []).map(result => {
          const student = studentsResponse.items.find(s => s.id === result.studentId || s.userId === result.studentId);
          const percentage = ((result.marksObtained / result.totalMarks) * 100);
          return {
            ...result,
            studentName: student?.name,
            studentEmail: student?.email,
            percentage,
            gradeLetter: getGrade(percentage)
          };
        });

        // Sort by marks and assign ranks
        const sortedResults = enrichedResults.sort((a, b) => b.marksObtained - a.marksObtained);
        sortedResults.forEach((result, index) => {
          result.rank = index + 1;
        });

        setResults(sortedResults);

        // Calculate statistics
        const submitted = sortedResults.length;
        const marks = sortedResults.map(r => r.marksObtained);
        setStats({
          totalStudents: studentsResponse.items.length,
          submitted,
          pending: studentsResponse.items.length - submitted,
          average: marks.length > 0 ? marks.reduce((a, b) => a + b, 0) / marks.length : 0,
          highest: marks.length > 0 ? Math.max(...marks) : 0,
          lowest: marks.length > 0 ? Math.min(...marks) : 0
        });
      } catch (error) {
        console.error('Results endpoint not available:', error);
        setResults([]);
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to load test results', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const getGradeColor = (grade: string): string => {
    if (grade === 'A+' || grade === 'A') return 'bg-green-100 text-green-800';
    if (grade === 'B+' || grade === 'B') return 'bg-blue-100 text-blue-800';
    if (grade === 'C') return 'bg-yellow-100 text-yellow-800';
    if (grade === 'D') return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testId || !test) return;
    setSubmitting(true);
    try {
      const payload = {
        studentId: resultForm.studentId,
        marksObtained: parseFloat(resultForm.marksObtained),
        totalMarks: test.totalMarks,
        remarks: resultForm.remarks
      };

      if (editingResult) {
        await api.put(`/tests/${testId}/results/${editingResult.id}`, payload);
        showToast('Result updated successfully');
      } else {
        await api.post(`/tests/${testId}/results`, payload);
        showToast('Result submitted successfully');
      }

      setIsResultModalOpen(false);
      setEditingResult(null);
      setResultForm({ studentId: '', marksObtained: '', remarks: '' });
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to submit result', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testId) return;
    setSubmitting(true);
    try {
      await api.post(`/tests/${testId}/results/bulk`, {
        results: bulkResults.map(r => ({
          ...r,
          totalMarks: test?.totalMarks
        }))
      });
      showToast(`${bulkResults.length} results submitted successfully`);
      setIsBulkModalOpen(false);
      setBulkResults([]);
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to submit bulk results', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditResult = (result: TestResultWithStudent) => {
    setEditingResult(result);
    setResultForm({
      studentId: result.studentId,
      marksObtained: result.marksObtained.toString(),
      remarks: result.remarks || ''
    });
    setIsResultModalOpen(true);
  };

  const handleDeleteResult = async (resultId: string) => {
    if (!window.confirm('Are you sure you want to delete this result?')) return;
    try {
      await api.delete(`/tests/${testId}/results/${resultId}`);
      setResults(prev => prev.filter(r => r.id !== resultId));
      showToast('Result deleted successfully');
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete result', 'error');
    }
  };

  const addBulkResultRow = () => {
    setBulkResults(prev => [...prev, { studentId: '', marksObtained: 0, remarks: '' }]);
  };

  const updateBulkResult = (index: number, field: string, value: any) => {
    setBulkResults(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeBulkResultRow = (index: number) => {
    setBulkResults(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin text-purple-600" size={40} />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Test not found</p>
        <button
          onClick={() => navigate('/tests')}
          className="text-purple-600 hover:text-purple-700 flex items-center gap-2 mx-auto"
        >
          <ArrowLeft size={16} /> Back to Tests
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 min-h-screen px-4 md:px-8 py-6 ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/tests')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{test.title || test.subject}</h1>
            <p className="text-gray-500">
              {test.board} • Standard {test.standard} • {test.totalMarks} marks
            </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-3">
            <button
              onClick={() => {
                setEditingResult(null);
                setResultForm({ studentId: '', marksObtained: '', remarks: '' });
                setIsResultModalOpen(true);
              }}
              className="bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 transition flex items-center gap-2 font-medium shadow-sm"
            >
              <Plus size={20} /> Add Result
            </button>
            <button
              onClick={() => {
                setBulkResults(students.map(s => ({ studentId: s.id, marksObtained: 0, remarks: '' })));
                setIsBulkModalOpen(true);
              }}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-medium shadow-sm"
            >
              <FileText size={20} /> Bulk Entry
            </button>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6">
          <p className="text-sm text-blue-700 uppercase font-medium mb-2">Total Students</p>
          <p className="text-3xl font-bold text-blue-900">{stats.totalStudents}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6">
          <p className="text-sm text-green-700 uppercase font-medium mb-2">Results Submitted</p>
          <p className="text-3xl font-bold text-green-900">{stats.submitted}</p>
          <p className="text-xs text-green-600 mt-1">{stats.pending} pending</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-6">
          <p className="text-sm text-purple-700 uppercase font-medium mb-2">Average Score</p>
          <p className="text-3xl font-bold text-purple-900">{stats.average.toFixed(2)}</p>
          <p className="text-xs text-purple-600 mt-1">out of {test.totalMarks}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-xl p-6">
          <p className="text-sm text-orange-700 uppercase font-medium mb-2">Highest / Lowest</p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <TrendingUp size={20} className="text-green-600" />
              <span className="text-2xl font-bold text-green-900">{stats.highest}</span>
            </div>
            <span className="text-gray-500">/</span>
            <div className="flex items-center gap-1">
              <TrendingDown size={20} className="text-red-600" />
              <span className="text-2xl font-bold text-red-900">{stats.lowest}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Test Results</h2>
          {results.length > 0 && (
            <button className="text-blue-600 hover:text-blue-700 flex items-center gap-2 text-sm font-medium">
              <Download size={16} /> Export Results
            </button>
          )}
        </div>
        {results.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Rank</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Student Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Marks</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Percentage</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Grade</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Remarks</th>
                  {isAdmin && (
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.map(result => (
                  <tr key={result.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {result.rank === 1 && <Award size={20} className="text-yellow-500" />}
                        {result.rank === 2 && <Award size={20} className="text-gray-400" />}
                        {result.rank === 3 && <Award size={20} className="text-orange-600" />}
                        <span className="font-bold text-gray-900">{result.rank}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{result.studentName || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{result.studentEmail}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">
                        {result.marksObtained} / {result.totalMarks}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full bg-gray-200 rounded-full h-2 relative">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full"
                          style={{ width: `${result.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 mt-1">{result.percentage?.toFixed(1)}%</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getGradeColor(result.gradeLetter || '')}`}>
                        {result.gradeLetter}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {result.remarks || '-'}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditResult(result)}
                            className="text-blue-600 hover:text-blue-700 p-1"
                            title="Edit result"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteResult(result.id)}
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Delete result"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="font-medium mb-2">No results submitted yet</p>
            <p className="text-sm">Add results for students who appeared in this test</p>
            {isAdmin && (
              <button
                onClick={() => setIsResultModalOpen(true)}
                className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
              >
                Add First Result
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Result Modal */}
      <Modal
        isOpen={isResultModalOpen}
        onClose={() => {
          setIsResultModalOpen(false);
          setEditingResult(null);
        }}
        title={editingResult ? 'Edit Result' : 'Add Test Result'}
      >
        <form onSubmit={handleSubmitResult} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
            <select
              required
              disabled={!!editingResult}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-gray-900"
              value={resultForm.studentId}
              onChange={e => setResultForm({...resultForm, studentId: e.target.value})}
            >
              <option value="">Select Student</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name} - {student.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Marks Obtained * (out of {test.totalMarks})
            </label>
            <input
              required
              type="number"
              min="0"
              max={test.totalMarks}
              step="0.5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-gray-900"
              value={resultForm.marksObtained}
              onChange={e => setResultForm({...resultForm, marksObtained: e.target.value})}
              placeholder="Enter marks"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-gray-900"
              value={resultForm.remarks}
              onChange={e => setResultForm({...resultForm, remarks: e.target.value})}
              placeholder="Optional comments about performance"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setIsResultModalOpen(false);
                setEditingResult(null);
              }}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              disabled={submitting}
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Saving...' : editingResult ? 'Update Result' : 'Add Result'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Entry Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Results Entry"
      >
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter marks for all students at once. You can leave marks as 0 for absent students.
          </p>
          
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 space-y-3">
            {bulkResults.map((result, index) => {
              const student = students.find(s => s.id === result.studentId);
              return (
                <div key={index} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-3 rounded-lg">
                  <div className="col-span-5 text-sm font-medium text-gray-900">
                    {student?.name || 'Unknown'}
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={test.totalMarks}
                    step="0.5"
                    className="col-span-3 px-3 py-1.5 border border-gray-300 rounded text-sm"
                    value={result.marksObtained}
                    onChange={e => updateBulkResult(index, 'marksObtained', parseFloat(e.target.value) || 0)}
                    placeholder="Marks"
                  />
                  <input
                    type="text"
                    className="col-span-4 px-3 py-1.5 border border-gray-300 rounded text-sm"
                    value={result.remarks}
                    onChange={e => updateBulkResult(index, 'remarks', e.target.value)}
                    placeholder="Remarks (optional)"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              disabled={submitting}
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Submitting...' : `Submit ${bulkResults.length} Results`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TestResults;

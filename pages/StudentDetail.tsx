import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Student, FeePlan, Homework, Test, TestResult, ApiListResponse } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Loader2, DollarSign, Book, FileText, Plus, Edit2, Trash2, CreditCard, BookOpen, Calendar } from 'lucide-react';
import Modal from '../components/Modal';

const StudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [student, setStudent] = useState<Student | null>(null);
  const [feePlan, setFeePlan] = useState<any | null>(null);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'fees' | 'homework' | 'tests'>('overview');

  // Modal states
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isTestResultModalOpen, setIsTestResultModalOpen] = useState(false);
  const [isAssignFeePlanModalOpen, setIsAssignFeePlanModalOpen] = useState(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
  
  // Form states
  const [homeworkForm, setHomeworkForm] = useState({
    title: '',
    description: '',
    subject: '',
    dueDate: ''
  });

  const [testForm, setTestForm] = useState({
    title: '',
    subject: '',
    dateTime: '',
    totalMarks: '',
    duration: ''
  });

  const [testResultForm, setTestResultForm] = useState({
    marksObtained: '',
    remarks: ''
  });

  const [feePlanForm, setFeePlanForm] = useState({
    amount: '',
    currency: 'INR',
    frequency: 'monthly',
    startMonth: new Date().toISOString().slice(0, 7)
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'cash',
    note: ''
  });

  const [editStudentForm, setEditStudentForm] = useState({
    name: '',
    email: '',
    phone: '',
    board: '',
    standard: '',
    schoolName: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    parentProfession: '',
    parentCompanyName: '',
    parentDesignation: '',
    subjects: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);

  useEffect(() => {
    const fetchStudentDetails = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // TEMPORARY WORKAROUND: Fetch all students and find the specific one
        const studentsResponse = await api.get<ApiListResponse<Student>>(`/students?limit=1000`);
        const foundStudent = studentsResponse.items.find(s => s.id === id);
        
        if (!foundStudent) {
          throw new Error('Student not found');
        }
        
        setStudent(foundStudent);

        // Fetch Fee Plan - Try multiple endpoints for compatibility
        let feePlanData = null;
        try {
          // Try the specific fee-plan endpoint first
          try {
            const feePlanResponse = await api.get<any>(`/students/${id}/fee-plan`);
            if (feePlanResponse && feePlanResponse.feePlan) {
              feePlanData = feePlanResponse.feePlan;
            }
          } catch (error) {
            // First endpoint may not be available, that's OK - will try fallback
            // Fallback: Try to get from fees/summary
            try {
              const period = new Date().toISOString().slice(0, 7);
              const summaryResponse = await api.get<any>(`/fees/summary?period=${period}`);
              if (summaryResponse && summaryResponse.items) {
                const studentFee = summaryResponse.items.find((f: any) => f.studentId === id);
                if (studentFee && studentFee.plan) {
                  feePlanData = studentFee.plan;
                }
              }
            } catch (innerError) {
              // Fees summary also not available - that's OK, fee plan will be null
            }
          }
          setFeePlan(feePlanData || null);
        } catch (error) {
          setFeePlan(null);
        }

        // Fetch Homework assigned to this student
        try {
          const homeworkResponse = await api.get<ApiListResponse<Homework>>(`/homework?assignedTo=${id}&limit=100`);
          // Backend bug: assignedTo query param doesn't work, so filter on frontend
          const filteredHomework = (homeworkResponse.items || []).filter(hw => {
            const assignTo = (hw as any).assignTo || [];
            return assignTo.includes(id);
          });
          console.log('All homework:', homeworkResponse.items?.length);
          console.log('Filtered homework for student:', filteredHomework.length);
          setHomework(filteredHomework);
        } catch (error) {
          // Endpoint not available yet - this is OK
          setHomework([]);
        }

        // Fetch Tests for student's board and standard
        try {
          const testsResponse = await api.get<ApiListResponse<Test>>(`/tests?board=${foundStudent.board}&standard=${foundStudent.standard}&limit=100`);
          const allTests = testsResponse.items || [];
          setTests(allTests);

          // Fetch Test Results for all tests (skip if endpoint not available)
          const testResultsPromises = allTests.map(async (test) => {
            try {
              const resultsResponse = await api.get<ApiListResponse<TestResult>>(`/tests/${test.id}/results?studentId=${id}`);
              return resultsResponse.items || [];
            } catch (error) {
              // Endpoint not available - return empty
              return [];
            }
          });

          const resultsArrays = await Promise.all(testResultsPromises);
          setTestResults(resultsArrays.flat());
        } catch (error) {
          // Endpoint not available yet - this is OK
          setTests([]);
          setTestResults([]);
        }

      } catch (error: any) {
        showToast(error.message || 'Failed to load student details', 'error');
        console.error('Failed to load student details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentDetails();
  }, [id, showToast]);

  // Homework Functions
  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !student) return;
    setSubmitting(true);
    try {
        await api.post('/homework', {
        title: homeworkForm.title,
        description: homeworkForm.description,
        subject: homeworkForm.subject,
        board: student.board,
        standard: student.standard,
        dueDate: homeworkForm.dueDate,
        assignedTo: [id]
        });
        showToast('Homework created successfully');
        setIsHomeworkModalOpen(false);
        setHomeworkForm({ title: '', description: '', subject: '', dueDate: '' });
        
        // Refresh homework
        const homeworkResponse = await api.get<ApiListResponse<Homework>>(`/homework?assignedTo=${id}&limit=100`);
        setHomework(homeworkResponse.items || []);
    } catch (error: any) {
        showToast(error.message || 'Failed to create homework', 'error');
    } finally {
        setSubmitting(false);
    }
    };

    const handleUpdateHomework = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingHomework) return;
        setSubmitting(true);
        try {
        // Preserve the assignTo array from the original homework
        const assignTo = (editingHomework as any).assignTo || [id];
        await api.put(`/homework/${editingHomework.id}`, {
          title: homeworkForm.title,
          description: homeworkForm.description,
          subject: homeworkForm.subject,
          dueDate: homeworkForm.dueDate,
          assignTo: assignTo  // IMPORTANT: Preserve the assignTo array
        });
        showToast('Homework updated successfully');
        setIsHomeworkModalOpen(false);
        setEditingHomework(null);
        setHomeworkForm({ title: '', description: '', subject: '', dueDate: '' });
        
        // Refresh homework with filter
        const homeworkResponse = await api.get<ApiListResponse<Homework>>(`/homework?assignedTo=${id}&limit=100`);
        const filteredHomework = (homeworkResponse.items || []).filter(hw => {
          const hwAssignTo = (hw as any).assignTo || [];
          return hwAssignTo.includes(id);
        });
        setHomework(filteredHomework);
        } catch (error: any) {
        showToast(error.message || 'Failed to update homework', 'error');
        } finally {
        setSubmitting(false);
        }
        };

    const handleViewHomework = (hw: Homework) => {
        setSelectedHomework(hw);
        setTimeout(() => {
            setSelectedHomework(null);
        }, 5000);
    };

    const handleDeleteHomework = async (hwId: string) => {
    if (!hwId) return;
    
    if (!window.confirm('Are you sure you want to delete this homework? This action cannot be undone.')) {
        return;
    }

    try {
        // Try backend deletion first
        await api.delete(`/homework/${hwId}`);
        
        // Only remove from local state if backend deletion succeeds
        setHomework(prev => prev.filter(hw => hw.id !== hwId));
        showToast('Homework deleted successfully', 'success');
        
    } catch (error: any) {
        console.error('Delete homework error:', error);
        
        // Show specific error messages based on the error type
        if (error.message.includes('404') || error.message.includes('Cannot DELETE')) {
        showToast('Delete homework endpoint not available on server', 'error');
        } else if (error.message.includes('401')) {
        showToast('Unauthorized: Please login again', 'error');
        } else if (error.message.includes('403')) {
        showToast('Forbidden: You do not have permission to delete homework', 'error');
        } else if (error.message.includes('500')) {
        showToast('Server error: Please try again later', 'error');
        } else {
        showToast(error.message || 'Failed to delete homework', 'error');
        }
    }
    };
  // Test Functions
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    setSubmitting(true);
    try {
        await api.post('/tests', {
        title: testForm.title,
        subject: testForm.subject,
        board: student.board,
        standard: student.standard,
        date: testForm.dateTime.split('T')[0],
        totalMarks: parseInt(testForm.totalMarks),
        duration: parseInt(testForm.duration)
        });
        showToast('Test created successfully');
        setIsTestModalOpen(false);
        setTestForm({ title: '', subject: '', dateTime: '', totalMarks: '', duration: '' });
        
        // Refresh tests
        const testsResponse = await api.get<ApiListResponse<Test>>(`/tests?board=${student.board}&standard=${student.standard}&limit=100`);
        setTests(testsResponse.items || []);
    } catch (error: any) {
        showToast(error.message || 'Failed to create test', 'error');
    } finally {
        setSubmitting(false);
    }
    };

    // Test Result Functions
    const handleAddTestResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest || !id) return;
    setSubmitting(true);
    try {
        // Use only totalMarks (the standard field)
        const totalMarks = selectedTest.totalMarks;
        if (!totalMarks) {
          showToast('Test total marks not found', 'error');
          return;
        }
        
        const marksObtained = parseInt(testResultForm.marksObtained);
        if (marksObtained < 0 || marksObtained > totalMarks) {
          showToast(`Marks must be between 0 and ${totalMarks}`, 'error');
          return;
        }
        
        // Build payload with only defined fields to avoid Firestore undefined errors
        const payload: any = {
          studentId: id,
          testId: selectedTest.id,
          testTitle: selectedTest.title || '',
          subject: selectedTest.subject,
          marksObtained: marksObtained,
          totalMarks: totalMarks
        };
        
        // Only include optional fields if they have values
        if (testResultForm.remarks && testResultForm.remarks.trim()) {
          payload.remarks = testResultForm.remarks;
        }
        
        console.log('Sending test result payload:', payload);
        await api.post(`/tests/${selectedTest.id}/results`, payload);
        showToast('Test result added successfully');
        setIsTestResultModalOpen(false);
        setSelectedTest(null);
        setTestResultForm({ marksObtained: '', remarks: '' });
        
        // Refresh test results
        const resultsResponse = await api.get<ApiListResponse<TestResult>>(`/tests/${selectedTest.id}/results?studentId=${id}`);
        const newResults = resultsResponse.items || [];
        setTestResults(prev => [...prev.filter(r => r.testId !== selectedTest.id), ...newResults]);
    } catch (error: any) {
        showToast(error.message || 'Failed to add test result', 'error');
    } finally {
        setSubmitting(false);
    }
    };

  const handleDeleteTest = async (testId: string) => {
  if (!testId) return;
  
  if (!window.confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
    return;
  }

  try {
    await api.delete(`/tests/${testId}`);
    showToast('Test deleted successfully', 'success');
    
    // Refresh tests list
    if (student) {
      const testsResponse = await api.get<ApiListResponse<Test>>(`/tests?board=${student.board}&standard=${student.standard}&limit=100`);
      setTests(testsResponse.items || []);
    }
  } catch (error: any) {
    showToast(error.message || 'Failed to delete test', 'error');
    console.error('Delete test error:', error);
  }
};

  // Fee Plan Functions
  const handleAssignFeePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    try {
      const feePlanData = {
        amount: parseFloat(feePlanForm.amount),
        currency: feePlanForm.currency,
        frequency: feePlanForm.frequency,
        startMonth: feePlanForm.startMonth,
        isActive: true
      };

      const response = await api.put<any>(`/students/${id}/fee-plan`, feePlanData);
      
      showToast('Fee plan assigned successfully');
      setIsAssignFeePlanModalOpen(false);
      setFeePlanForm({ amount: '', currency: 'INR', frequency: 'monthly', startMonth: new Date().toISOString().slice(0, 7) });
      
      // Set the fee plan directly from what we just sent, since the GET endpoint may not be available
      if (response && response.feePlan) {
        setFeePlan(response.feePlan);
      } else {
        // If response doesn't contain feePlan, use what we sent
        setFeePlan(feePlanData);
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to assign fee plan', 'error');
      console.error('Fee plan assignment error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    try {
      await api.post(`/students/${id}/fees/payments`, {
        amount: parseFloat(paymentForm.amount),
        method: paymentForm.method,
        note: paymentForm.note,
        frequency: 'monthly',
        currency: 'INR'
      });
      showToast('Payment recorded successfully');
      setIsRecordPaymentModalOpen(false);
      setPaymentForm({ amount: '', method: 'cash', note: '' });
      
      // Note: We don't try to refresh fee plan as the GET endpoint may not be available
      // The fee plan data shown is what was assigned, not real-time balance
    } catch (error: any) {
      showToast(error.message || 'Failed to record payment', 'error');
      console.error('Payment recording error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditStudent = () => {
    if (student) {
      const parentData = (student as any).parent || {};
      setEditStudentForm({
        name: student.name || '',
        email: student.email || '',
        phone: student.phone || '',
        board: student.board || '',
        standard: student.standard || '',
        schoolName: student.schoolName || '',
        parentName: parentData.name || student.parentName || '',
        parentPhone: parentData.phone || student.parentPhone || '',
        parentEmail: parentData.email || student.parentEmail || '',
        parentProfession: parentData.profession || student.parentProfession || '',
        parentCompanyName: parentData.companyName || student.parentCompanyName || '',
        parentDesignation: parentData.designation || student.parentDesignation || '',
        subjects: student.subjects ? student.subjects.join(', ') : ''
      });
      setIsEditStudentModalOpen(true);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    try {
      const payload = {
        name: editStudentForm.name,
        email: editStudentForm.email,
        phone: editStudentForm.phone,
        board: editStudentForm.board,
        standard: editStudentForm.standard,
        schoolName: editStudentForm.schoolName,
        parentName: editStudentForm.parentName,
        parentPhone: editStudentForm.parentPhone,
        parentEmail: editStudentForm.parentEmail,
        parentProfession: editStudentForm.parentProfession,
        parentCompanyName: editStudentForm.parentCompanyName,
        parentDesignation: editStudentForm.parentDesignation,
        subjects: editStudentForm.subjects ? editStudentForm.subjects.split(',').map(s => s.trim()).filter(s => s) : []
      };

      await api.put(`/students/${id}`, payload);
      showToast('Student updated successfully');
      setIsEditStudentModalOpen(false);
      
      // Update local student state
      setStudent({
        ...student!,
        ...payload
      });
    } catch (error: any) {
      showToast(error.message || 'Failed to update student', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditHomework = (hw: Homework) => {
    // Edit not available - show message
    setEditingHomework(hw);
    setHomeworkForm({
      title: hw.title || '',
      description: hw.description || '',
      subject: hw.subject || '',
      dueDate: hw.dueDate ? hw.dueDate.slice(0, 10) : ''
    });
    setIsHomeworkModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!student) {
    return <div className="text-center p-12 text-gray-500">Student not found.</div>;
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'teacher';

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{student.name}</h1>
            <p className="text-lg text-gray-600 mb-1">{student.email}</p>
            <p className="text-sm text-gray-500">{student.phone || 'No phone number'}</p>
          </div>
          <div className="flex gap-2">
            <span className={`px-4 py-2 rounded-lg text-sm font-medium ${student.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {student.active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-sm font-medium transition border-b-2 ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('fees')}
            className={`px-6 py-3 text-sm font-medium transition border-b-2 ${activeTab === 'fees' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            Fee Plan
          </button>
          <button 
            onClick={() => setActiveTab('homework')}
            className={`px-6 py-3 text-sm font-medium transition border-b-2 ${activeTab === 'homework' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            Homework ({homework.length})
          </button>
          <button 
            onClick={() => setActiveTab('tests')}
            className={`px-6 py-3 text-sm font-medium transition border-b-2 ${activeTab === 'tests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            Tests & Results ({tests.length})
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-800">Student Information</h2>
            {isAdmin && (
              <button
                onClick={handleOpenEditStudent}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-medium shadow-sm"
              >
                <Edit2 size={18} /> Edit
              </button>
            )}
          </div>
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="text-xs font-medium text-gray-500 uppercase block mb-1">Board</span>
                <span className="text-lg font-semibold text-gray-900">{student.board}</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="text-xs font-medium text-gray-500 uppercase block mb-1">Standard</span>
                <span className="text-lg font-semibold text-gray-900">{student.standard}</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="text-xs font-medium text-gray-500 uppercase block mb-1">Joined</span>
                <span className="text-lg font-semibold text-gray-900">{new Date(student.createdAt?.seconds * 1000 || student.joinedAt).toLocaleDateString()}</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg md:col-span-2 lg:col-span-3">
                <span className="text-xs font-medium text-gray-500 uppercase block mb-1">Subjects</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {student.subjects && student.subjects.length > 0 ? (
                    student.subjects.map((subject, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {subject}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">No subjects assigned</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="text-xs font-medium text-gray-500 uppercase block mb-1">Email</span>
                <span className="text-lg font-semibold text-gray-900">{student.email}</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="text-xs font-medium text-gray-500 uppercase block mb-1">Phone</span>
                <span className="text-lg font-semibold text-gray-900">{student.phone || 'Not provided'}</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">School Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <span className="text-xs font-medium text-blue-700 uppercase block mb-1">School Name</span>
                <span className="text-lg font-semibold text-blue-900">{student.schoolName || 'Not provided'}</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Parent Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <span className="text-xs font-medium text-purple-700 uppercase block mb-1">Parent Name</span>
                <span className="text-lg font-semibold text-purple-900">{(student as any).parent?.name || student.parentName || 'Not provided'}</span>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <span className="text-xs font-medium text-purple-700 uppercase block mb-1">Parent Phone</span>
                <span className="text-lg font-semibold text-purple-900">{(student as any).parent?.phone || student.parentPhone || 'Not provided'}</span>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <span className="text-xs font-medium text-purple-700 uppercase block mb-1">Parent Email</span>
                <span className="text-lg font-semibold text-purple-900">{(student as any).parent?.email || student.parentEmail || 'Not provided'}</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Parent Professional Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <span className="text-xs font-medium text-indigo-700 uppercase block mb-1">Profession</span>
                <span className="text-lg font-semibold text-indigo-900">{(student as any).parent?.profession || student.parentProfession || 'Not provided'}</span>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <span className="text-xs font-medium text-indigo-700 uppercase block mb-1">Company Name</span>
                <span className="text-lg font-semibold text-indigo-900">{(student as any).parent?.companyName || student.parentCompanyName || 'Not provided'}</span>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <span className="text-xs font-medium text-indigo-700 uppercase block mb-1">Designation</span>
                <span className="text-lg font-semibold text-indigo-900">{(student as any).parent?.designation || student.parentDesignation || 'Not provided'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fee Plan Tab */}
      {activeTab === 'fees' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <DollarSign size={28} className="text-green-600" /> Fee Plan
            </h2>
            <div className="flex gap-2">
              {isAdmin && (!feePlan || !feePlan.isActive) && (
                <button
                  onClick={() => setIsAssignFeePlanModalOpen(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2 font-medium shadow-sm"
                >
                  <Plus size={18} /> Assign Plan
                </button>
              )}
              {isAdmin && feePlan && feePlan.isActive && (
                <button
                  onClick={() => setIsRecordPaymentModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-medium shadow-sm"
                >
                  <CreditCard size={18} /> Record Payment
                </button>
              )}
            </div>
          </div>
          {feePlan && feePlan.amount ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-green-50 p-5 rounded-lg border border-green-100">
                <span className="text-xs font-medium text-green-600 uppercase block mb-1">Amount</span>
                <span className="text-2xl font-bold text-green-700">{feePlan.currency || 'INR'} {feePlan.amount}</span>
              </div>
              <div className="bg-gray-50 p-5 rounded-lg">
                <span className="text-xs font-medium text-gray-500 uppercase block mb-1">Frequency</span>
                <span className="text-lg font-semibold text-gray-900 capitalize">{feePlan.frequency || 'N/A'}</span>
              </div>
              <div className="bg-gray-50 p-5 rounded-lg">
                <span className="text-xs font-medium text-gray-500 uppercase block mb-1">Status</span>
                <span className={`text-lg font-semibold ${feePlan.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {feePlan.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {feePlan.startMonth && (
                <div className="bg-gray-50 p-5 rounded-lg">
                  <span className="text-xs font-medium text-gray-500 uppercase block mb-1">Start Month</span>
                  <span className="text-lg font-semibold text-gray-900">{feePlan.startMonth}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-lg">No fee plan assigned to this student</p>
            </div>
          )}
        </div>
      )}

      {/* Homework Tab */}
      {/* Homework Tab */}
        {activeTab === 'homework' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                <Book size={28} className="text-blue-600" /> Homework Assignments
            </h2>
            {isAdmin && (
                <button
                onClick={() => setIsHomeworkModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-medium shadow-sm"
                >
                <Plus size={18} /> Add Homework
                </button>
            )}
            </div>
            {homework.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {homework.map((hw) => (
                <div 
                    key={hw.id} 
                    onClick={() => handleViewHomework(hw)}
                    className="border border-gray-200 rounded-lg p-5 bg-gray-50 hover:shadow-md transition cursor-pointer"
                >
                    <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900 text-lg">{hw.title}</h3>
                    {isAdmin && (
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => openEditHomework(hw)} 
                        className="text-gray-400 hover:text-blue-600 transition" 
                        title="Edit homework"
                      >
                        <Edit2 size={16} />
                      </button>
                        {/* DELETE BUTTON FOR HOMEWORK */}
                        <button
                            onClick={() => handleDeleteHomework(hw.id!)}
                            className="text-gray-400 hover:text-red-600 transition"
                            title="Delete homework"
                        >
                            <Trash2 size={16} />
                        </button>
                        </div>
                    )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{hw.description}</p>
                    <div className="flex flex-wrap gap-2 items-center text-xs">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">{hw.subject}</span>
                    <span className="text-gray-500">Due: {new Date(hw.dueAt).toLocaleDateString()}</span>
                    </div>
                </div>
                ))}
            </div>
            ) : (
            <div className="text-center py-12">
                <Book size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-lg">No homework assigned yet</p>
            </div>
            )}
        </div>
        )}

      {/* Tests Tab */}
      {activeTab === 'tests' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <FileText size={28} className="text-purple-600" /> Tests & Results
            </h2>
            {isAdmin && (
              <button
                onClick={() => setIsTestModalOpen(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2 font-medium shadow-sm"
              >
                <Plus size={18} /> Add Test
              </button>
            )}
          </div>
          {tests.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {tests.map((test) => {
                const result = testResults.find((res) => res.testId === test.id && res.studentId === id);
                return (
                  <div key={test.id} className="border border-gray-200 rounded-lg p-5 bg-gray-50 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                            <h3 className="font-semibold text-gray-900 text-lg">{test.title || 'Untitled Test'}</h3>
                            <p className="text-sm text-gray-600">{test.subject}</p>
                            </div>
                            {/* ADD DELETE BUTTON HERE */}
                            {isAdmin && (
                            <button
                                onClick={() => handleDeleteTest(test.id!)}
                                className="text-gray-400 hover:text-red-600 transition"
                                title="Delete test"
                            >
                                <Trash2 size={16} />
                            </button>
                            )}
                    </div>
                    <div className="space-y-2 mb-3">
                      <p className="text-xs text-gray-500">Date: {new Date(test.date).toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Total Marks: {test.totalMarks} | Duration: {test.duration} mins</p>
                    </div>
                    {result ? (
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Result</span>
                          <span className="text-lg font-bold text-purple-700">
                            {result.marksObtained} / {result.totalMarks || test.totalMarks}
                          </span>
                        </div>
                        {result.remarks && (
                          <p className="text-xs text-gray-600 mt-2">
                            <span className="font-medium">Remarks:</span> {result.remarks}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                        <p className="text-sm text-yellow-700 mb-2">No result recorded</p>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setSelectedTest(test);
                              setIsTestResultModalOpen(true);
                            }}
                            className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition"
                          >
                            Add Result
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-lg">No tests found for this student</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Homework Modal */}
      <Modal 
        isOpen={isHomeworkModalOpen || !!editingHomework} 
        onClose={() => {
          setIsHomeworkModalOpen(false);
          setEditingHomework(null);
          setHomeworkForm({ title: '', description: '', subject: '', dueDate: '' });
        }} 
        title={editingHomework ? 'Edit Homework' : 'Add New Homework'}
      >
        <form onSubmit={editingHomework ? handleUpdateHomework : handleCreateHomework} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input 
              required 
              type="text" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" 
              value={homeworkForm.title} 
              onChange={e => setHomeworkForm({...homeworkForm, title: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea 
              required 
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" 
              value={homeworkForm.description} 
              onChange={e => setHomeworkForm({...homeworkForm, description: e.target.value})} 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <input 
                required 
                type="text" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" 
                value={homeworkForm.subject} 
                onChange={e => setHomeworkForm({...homeworkForm, subject: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
              <input 
                required 
                type="date" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" 
                value={homeworkForm.dueDate} 
                onChange={e => setHomeworkForm({...homeworkForm, dueDate: e.target.value})} 
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button 
              type="button" 
              onClick={() => {
                setIsHomeworkModalOpen(false);
                setEditingHomework(null);
                setHomeworkForm({ title: '', description: '', subject: '', dueDate: '' });
              }} 
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button 
              disabled={submitting} 
              type="submit" 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Saving...' : editingHomework ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Test Modal */}
      <Modal 
        isOpen={isTestModalOpen} 
        onClose={() => {
          setIsTestModalOpen(false);
          setTestForm({ title: '', subject: '', dateTime: '', totalMarks: '', duration: '' });
        }} 
        title="Create New Test"
      >
        <form onSubmit={handleCreateTest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input 
              required 
              type="text" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-gray-900" 
              value={testForm.title} 
              onChange={e => setTestForm({...testForm, title: e.target.value})} 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <input 
                required 
                type="text" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-gray-900" 
                value={testForm.subject} 
                onChange={e => setTestForm({...testForm, subject: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input 
                required 
                type="date" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-gray-900" 
                value={testForm.dateTime} 
                onChange={e => setTestForm({...testForm, dateTime: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks *</label>
              <input 
                required 
                type="number" 
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-gray-900" 
                value={testForm.totalMarks} 
                onChange={e => setTestForm({...testForm, totalMarks: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) *</label>
              <input 
                required 
                type="number" 
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-gray-900" 
                value={testForm.duration} 
                onChange={e => setTestForm({...testForm, duration: e.target.value})} 
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button 
              type="button" 
              onClick={() => {
                setIsTestModalOpen(false);
                setTestForm({ title: '', subject: '', dateTime: '', totalMarks: '', duration: '' });
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
              {submitting ? 'Creating...' : 'Create Test'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Test Result Modal */}
      <Modal 
        isOpen={isTestResultModalOpen} 
        onClose={() => {
          setIsTestResultModalOpen(false);
          setSelectedTest(null);
          setTestResultForm({ marksObtained: '', remarks: '' });
        }} 
        title={`Grade Test: ${selectedTest?.title || 'Test'} (${selectedTest?.totalMarks} marks)`}
      >
        <form onSubmit={handleAddTestResult} className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-blue-600 font-medium uppercase mb-1">Test</p>
                <p className="text-lg font-semibold text-blue-900">{selectedTest?.title}</p>
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium uppercase mb-1">Subject</p>
                <p className="text-lg font-semibold text-blue-900">{selectedTest?.subject}</p>
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium uppercase mb-1">Total Marks</p>
                <p className="text-lg font-semibold text-blue-900">{selectedTest?.totalMarks}</p>
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium uppercase mb-1">Duration</p>
                <p className="text-lg font-semibold text-blue-900">{selectedTest?.duration || '-'} mins</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Marks Obtained * (out of {selectedTest?.totalMarks})
            </label>
            <input 
              required 
              type="number" 
              min="0"
              max={selectedTest?.totalMarks}
              step="0.5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-gray-900" 
              value={testResultForm.marksObtained} 
              onChange={e => setTestResultForm({...testResultForm, marksObtained: e.target.value})} 
              placeholder="Enter marks obtained"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks / Feedback</label>
            <textarea 
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-gray-900" 
              value={testResultForm.remarks} 
              onChange={e => setTestResultForm({...testResultForm, remarks: e.target.value})} 
              placeholder="Add any feedback or comments about the test performance (optional)"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button 
              type="button" 
              onClick={() => {
                setIsTestResultModalOpen(false);
                setSelectedTest(null);
                setTestResultForm({ marksObtained: '', remarks: '' });
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
              {submitting ? 'Saving...' : 'Add Result'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Fee Plan Modal */}
      <Modal 
        isOpen={isAssignFeePlanModalOpen} 
        onClose={() => {
          setIsAssignFeePlanModalOpen(false);
          setFeePlanForm({ amount: '', currency: 'INR', frequency: 'monthly', startMonth: new Date().toISOString().slice(0, 7) });
        }} 
        title="Assign Fee Plan"
      >
        <form onSubmit={handleAssignFeePlan} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (INR) *</label>
            <input 
              required 
              type="number" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white text-gray-900" 
              value={feePlanForm.amount} 
              onChange={e => setFeePlanForm({...feePlanForm, amount: e.target.value})} 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency *</label>
              <select 
                required 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white text-gray-900" 
                value={feePlanForm.currency} 
                onChange={e => setFeePlanForm({...feePlanForm, currency: e.target.value})}
              >
                <option value="INR">INR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
              <select 
                required 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white text-gray-900" 
                value={feePlanForm.frequency} 
                onChange={e => setFeePlanForm({...feePlanForm, frequency: e.target.value})}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Month *</label>
            <input 
              required 
              type="month" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white text-gray-900" 
              value={feePlanForm.startMonth} 
              onChange={e => setFeePlanForm({...feePlanForm, startMonth: e.target.value})} 
            />
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button 
              type="button" 
              onClick={() => {
                setIsAssignFeePlanModalOpen(false);
                setFeePlanForm({ amount: '', currency: 'INR', frequency: 'monthly', startMonth: new Date().toISOString().slice(0, 7) });
              }} 
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button 
              disabled={submitting} 
              type="submit" 
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Assigning...' : 'Assign Plan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal 
        isOpen={isRecordPaymentModalOpen} 
        onClose={() => {
          setIsRecordPaymentModalOpen(false);
          setPaymentForm({ amount: '', method: 'cash', note: '' });
        }} 
        title="Record Payment"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (INR) *</label>
            <input 
              required 
              type="number" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" 
              value={paymentForm.amount} 
              onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
            <select 
              required 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" 
              value={paymentForm.method} 
              onChange={e => setPaymentForm({...paymentForm, method: e.target.value})}
            >
              <option value="cash">Cash</option>
              <option value="online">Online</option>
              <option value="cheque">Cheque</option>
              <option value="card">Card</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label>
            <textarea 
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" 
              value={paymentForm.note} 
              onChange={e => setPaymentForm({...paymentForm, note: e.target.value})} 
              placeholder="Payment reference or notes"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button 
              type="button" 
              onClick={() => {
                setIsRecordPaymentModalOpen(false);
                setPaymentForm({ amount: '', method: 'cash', note: '' });
              }} 
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button 
              disabled={submitting} 
              type="submit" 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal isOpen={isEditStudentModalOpen} onClose={() => setIsEditStudentModalOpen(false)} title="Edit Student Details">
        <form onSubmit={handleUpdateStudent} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={editStudentForm.name} onChange={e => setEditStudentForm({...editStudentForm, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input required type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={editStudentForm.email} onChange={e => setEditStudentForm({...editStudentForm, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Board *</label>
              <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={editStudentForm.board} onChange={e => setEditStudentForm({...editStudentForm, board: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Standard *</label>
              <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={editStudentForm.standard} onChange={e => setEditStudentForm({...editStudentForm, standard: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={editStudentForm.phone} onChange={e => setEditStudentForm({...editStudentForm, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={editStudentForm.schoolName} onChange={e => setEditStudentForm({...editStudentForm, schoolName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Name</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={editStudentForm.parentName} onChange={e => setEditStudentForm({...editStudentForm, parentName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone</label>
              <input type="tel" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={editStudentForm.parentPhone} onChange={e => setEditStudentForm({...editStudentForm, parentPhone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Email</label>
              <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={editStudentForm.parentEmail} onChange={e => setEditStudentForm({...editStudentForm, parentEmail: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Profession</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={editStudentForm.parentProfession} onChange={e => setEditStudentForm({...editStudentForm, parentProfession: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Company Name</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={editStudentForm.parentCompanyName} onChange={e => setEditStudentForm({...editStudentForm, parentCompanyName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Designation</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" value={editStudentForm.parentDesignation} onChange={e => setEditStudentForm({...editStudentForm, parentDesignation: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Subjects (comma separated)</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900" placeholder="Maths, Physics" value={editStudentForm.subjects} onChange={e => setEditStudentForm({...editStudentForm, subjects: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button 
              type="button" 
              onClick={() => setIsEditStudentModalOpen(false)} 
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button 
              disabled={submitting} 
              type="submit" 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Homework Detail View Modal - Auto closes after 5 seconds */}
      {selectedHomework && (
        <div 
          onClick={() => setSelectedHomework(null)}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-8 animate-slideUp"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedHomework.title}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1 bg-purple-50 px-3 py-1 rounded-full">
                    <BookOpen size={16} className="text-purple-600" /> {selectedHomework.subject}
                  </span>
                  <span className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full">
                    <Calendar size={16} className="text-blue-600" /> Due: {new Date(selectedHomework.dueAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedHomework(null)}
                className="text-gray-400 hover:text-gray-600 transition text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Instructions</h3>
                <p className="text-gray-800">{selectedHomework.description}</p>
              </div>

              <div className="bg-pink-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-pink-700 uppercase mb-2">Assignment Details</h3>
                <p className="text-gray-800">
                  Status: <span className="font-medium">{selectedHomework.status}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center mt-6">This popup will close automatically in 5 seconds</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetail;
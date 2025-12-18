
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ApiListResponse, Student, Batch } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { Loader2, Plus, DollarSign, Calendar, Search, CreditCard, FileText, Edit2, Trash2, Filter } from 'lucide-react';
import Modal from '../components/Modal';
import { BOARDS, STANDARDS } from '../constants';

interface FeePlan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  frequency: string;
  board: string;
  standard: number;
  subject?: string;
}

interface FeeSummary {
  studentId: string;
  name: string;
  teacherId: string;
  plan?: {
    amount: number;
    currency: string;
    frequency: string;
  };
  paidAmount: number;
  dueAmount: number;
  status: 'paid' | 'partial' | 'unpaid' | 'no_plan';
}

const Fees: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'collection' | 'plans'>('collection');
  const [feePlans, setFeePlans] = useState<FeePlan[]>([]);
  const [summary, setSummary] = useState<FeeSummary[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();

  // Create Plan Modal
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<FeePlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    amount: '',
    currency: 'INR',
    frequency: 'monthly',
    board: '',
    standard: '',
    subject: ''
  });

  // Payment Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    studentId: '',
    amount: '',
    method: 'cash',
    note: '',
    period: new Date().toISOString().slice(0, 7) // YYYY-MM
  });

  // Assign Plan Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignStudentId, setAssignStudentId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  
  // Filter states
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBoard, setFilterBoard] = useState('');
  const [filterStandard, setFilterStandard] = useState('');
  const [filterBatch, setFilterBatch] = useState('');

  const loadFeePlans = async () => {
    try {
      const response = await api.get<ApiListResponse<FeePlan>>('/fee-plans?limit=100');
      setFeePlans(response.items || []);
    } catch (error) {
      showToast('Failed to load fee plans', 'error');
    }
  };

  const loadSummary = async () => {
    setLoading(true);
    try {
      // Load students first to filter the summary
      const studentsResponse = await api.get<ApiListResponse<Student>>('/students?limit=100');
      const existingStudents = studentsResponse.items || [];
      setStudents(existingStudents);
      
      // Create a Set of existing student IDs for fast lookup
      const existingStudentIds = new Set(existingStudents.map(s => s.id));
      
      // Load fee summary
      const response = await api.get<ApiListResponse<FeeSummary>>(`/fees/summary?period=${period}`);
      
      // Filter summary to only include students that exist in the students list
      const filteredSummary = (response.items || []).filter(
        item => existingStudentIds.has(item.studentId)
      );
      
      setSummary(filteredSummary);
    } catch (error) {
      showToast('Failed to load fee summary', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const response = await api.get<ApiListResponse<Student>>('/students?limit=100');
      setStudents(response.items || []);
    } catch (error) {
      // console.warn('Failed to load students');
    }
  };

  const loadBatches = async () => {
    try {
      const response = await api.get<ApiListResponse<Batch>>('/batches?limit=100');
      setBatches(response.items || []);
    } catch (error) {
      // console.warn('Failed to load batches');
    }
  };

  useEffect(() => {
    // Always load fee plans because they are used in the "Assign Plan" modal
    // which is accessible from the "Fee Collection" tab.
    loadFeePlans();

    if (activeTab === 'collection') {
      loadSummary();
      loadBatches();
      // No need to call loadStudents separately - it's now called inside loadSummary
    }
  }, [activeTab, period]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...planForm,
        amount: parseFloat(planForm.amount),
        standard: parseInt(planForm.standard)
      };
      
      if (editingPlan) {
        await api.put(`/fee-plans/${editingPlan.id}`, payload);
        showToast('Fee plan updated successfully');
      } else {
        await api.post('/fee-plans', payload);
        showToast('Fee plan created successfully');
      }
      
      setIsPlanModalOpen(false);
      setEditingPlan(null);
      setPlanForm({ name: '', amount: '', currency: 'INR', frequency: 'monthly', board: '', standard: '', subject: '' });
      loadFeePlans();
    } catch (error: any) {
      showToast(error.message || `Failed to ${editingPlan ? 'update' : 'create'} fee plan`, 'error');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payForm.studentId) {
      showToast('Please select a student', 'error');
      return;
    }
    try {
      await api.post(`/students/${payForm.studentId}/fees/payments`, {
        amount: parseFloat(payForm.amount),
        method: payForm.method,
        note: payForm.note,
        frequency: 'monthly', // Defaulting for now, API supports dynamic
        currency: 'INR'
      });
      showToast('Payment recorded successfully');
      setIsPayModalOpen(false);
      setPayForm({ ...payForm, amount: '', note: '' });
      loadSummary(); 
    } catch (error: any) {
      showToast(error.message || 'Failed to record payment', 'error');
    }
  };

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStudentId || !selectedPlanId) {
      showToast('Please select student and plan', 'error');
      return;
    }

    const plan = feePlans.find(p => p.id === selectedPlanId);
    if (!plan) return;

    try {
      // API expects: { amount, currency, frequency, startMonth, isActive }
      // We map the selected "Template" to the "Student Plan"
      await api.put(`/students/${assignStudentId}/fee-plan`, {
        amount: plan.amount,
        currency: plan.currency,
        frequency: plan.frequency,
        isActive: true
      });
      showToast('Plan assigned successfully');
      setIsAssignModalOpen(false);
      loadSummary();
    } catch (error: any) {
      showToast(error.message || 'Failed to assign plan', 'error');
    }
  };

  const openPaymentModal = (studentId?: string) => {
    setPayForm(prev => ({
      ...prev,
      studentId: studentId || '',
      amount: '',
      note: ''
    }));
    setIsPayModalOpen(true);
  };

  const openAssignModal = (studentId: string) => {
    setAssignStudentId(studentId);
    setSelectedPlanId('');
    setIsAssignModalOpen(true);
  }

  const handleRemoveFeePlan = async (studentId: string, studentName: string) => {
    if (!window.confirm(`Are you sure you want to remove the fee plan for "${studentName}"?`)) {
      return;
    }

    try {
      await api.delete(`/students/${studentId}/fee-plan`);
      showToast('Fee plan removed successfully', 'success');
      loadSummary();
    } catch (error: any) {
      showToast(error.message || 'Failed to remove fee plan', 'error');
    }
  };

  // Filter summary based on search and filters
  const filteredSummary = summary.filter(item => {
    // Search filter
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Find the student data for this summary item
    const student = students.find(s => s.id === item.studentId);
    if (!student) return false;

    // Board filter
    if (filterBoard && student.board !== filterBoard) {
      return false;
    }

    // Standard filter
    if (filterStandard && student.standard.toString() !== filterStandard) {
      return false;
    }

    // Batch filter
    if (filterBatch) {
      const batch = batches.find(b => b.id === filterBatch);
      if (!batch || !batch.studentIds.includes(item.studentId)) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className={`space-y-6 min-h-screen px-4 md:px-8 py-6 ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className={`text-3xl font-bold flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          <DollarSign className="text-green-600" size={36} />
          Fees Management
        </h1>
        
        {/* Tabs */}
        <div className={`p-1 rounded-lg border inline-flex ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <button 
            onClick={() => setActiveTab('collection')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'collection' ? (isDarkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-50')}`}
          >
            Fee Collection
          </button>
          <button 
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'plans' ? (isDarkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-50')}`}
          >
            Fee Plans
          </button>
        </div>
      </div>

      {activeTab === 'collection' && (
        <div className="space-y-4">
          {/* Filters Section */}
          <div className={`p-4 rounded-xl shadow-sm border space-y-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className={`flex items-center gap-2 font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Period</label>
                <input 
                  type="month" 
                  value={period} 
                  onChange={(e) => setPeriod(e.target.value)} 
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Board</label>
                <select
                  value={filterBoard}
                  onChange={(e) => setFilterBoard(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="">All Boards</option>
                  {BOARDS.map(board => (
                    <option key={board} value={board}>{board}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Standard</label>
                <select
                  value={filterStandard}
                  onChange={(e) => setFilterStandard(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="">All Standards</option>
                  {STANDARDS.map(std => (
                    <option key={std} value={std}>{std}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Batch</label>
                <select
                  value={filterBatch}
                  onChange={(e) => setFilterBatch(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="">All Batches</option>
                  {batches.map(batch => (
                    <option key={batch.id} value={batch.id}>{batch.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Search Student</label>
                <div className="relative">
                  <Search size={18} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <input 
                    type="text" 
                    placeholder="Search by name..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-10 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="flex items-end">
              <button 
                onClick={() => openPaymentModal()}
                className="bg-yellow-600 text-white px-6 py-2.5 rounded-lg hover:bg-yellow-700 transition flex items-center gap-2 font-medium shadow-sm"
              >
                <CreditCard size={20} /> Record Payment
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-yellow-600" /></div>
          ) : (
            <div className={`rounded-xl shadow-sm border overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className={`border-b ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                    <tr>
                      <th className={`px-6 py-4 text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Student Name</th>
                      <th className={`px-6 py-4 text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Plan Amount</th>
                      <th className={`px-6 py-4 text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Paid</th>
                      <th className={`px-6 py-4 text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Due</th>
                      <th className={`px-6 py-4 text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Status</th>
                      <th className={`px-6 py-4 text-xs font-semibold uppercase text-right ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Action</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                    {filteredSummary.length === 0 ? (
                      <tr><td colSpan={6} className={`px-6 py-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No records found for this period.</td></tr>
                    ) : (
                      filteredSummary.map(item => (
                        <tr key={item.studentId} className={isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                          <td className={`px-6 py-4 font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.name}</td>
                          <td className={isDarkMode ? 'px-6 py-4 text-gray-300' : 'px-6 py-4 text-gray-600'}>
                            {item.plan ? item.plan.amount : <span className={`italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No Plan</span>}
                          </td>
                          <td className={`px-6 py-4 font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{item.paidAmount}</td>
                          <td className={`px-6 py-4 font-medium ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{item.dueAmount}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase 
                              ${item.status === 'paid' ? 'bg-green-100 text-green-800' : 
                                item.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 
                                item.status === 'unpaid' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'}`}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-3">
                            {item.status === 'no_plan' ? (
                              <button 
                                onClick={() => openAssignModal(item.studentId)}
                                className="text-purple-600 hover:text-purple-800 font-medium text-sm hover:underline flex items-center gap-1 justify-end ml-auto"
                              >
                                <FileText size={14} /> Assign Plan
                              </button>
                            ) : (
                              <div className="flex gap-2 justify-end">
                                <button 
                                  onClick={() => openPaymentModal(item.studentId)}
                                  className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline"
                                >
                                  Collect Fee
                                </button>
                                <button 
                                  onClick={() => handleRemoveFeePlan(item.studentId, item.name)}
                                  className="text-red-600 hover:text-red-800 font-medium text-sm hover:underline"
                                >
                                  Remove Plan
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            {user?.role === 'admin' && (
              <button
                onClick={() => setIsPlanModalOpen(true)}
                className="bg-yellow-600 text-white px-6 py-2.5 rounded-lg hover:bg-yellow-700 transition flex items-center gap-2 font-medium shadow-sm"
              >
                <Plus size={20} /> Add Fee Plan
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {feePlans.length === 0 ? (
              <div className={`col-span-full text-center p-8 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-100 text-gray-500'}`}>No fee plans found.</div>
            ) : (
              feePlans.map(plan => (
                <div key={plan.id} className={`p-6 rounded-xl shadow-sm border transition relative overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:shadow-lg' : 'bg-white border-gray-100 hover:shadow-md'}`}>
                  <div className={`absolute top-0 right-0 text-xs font-bold px-2 py-1 rounded-bl-lg uppercase ${isDarkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-50 text-yellow-700'}`}>
                    {plan.frequency}
                  </div>
                  <h3 className={`text-lg font-bold mb-2 pr-8 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{plan.name}</h3>
                  
                  <div className={`flex items-baseline gap-1 mb-4 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    <span className="text-sm font-medium">{plan.currency}</span>
                    <span className="text-2xl font-bold">{plan.amount}</span>
                  </div>
                  
                  <div className={`space-y-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <div className="flex items-center gap-2">
                       <span className={`w-16 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Board:</span>
                       <span className="font-medium">{plan.board}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className={`w-16 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Class:</span>
                       <span className="font-medium">{plan.standard}</span>
                    </div>
                    {plan.subject && (
                      <div className="flex items-center gap-2">
                        <span className={`w-16 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Subject:</span>
                        <span className="font-medium">{plan.subject}</span>
                      </div>
                    )}
                  </div>
                  
                  {user?.role === 'admin' && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setEditingPlan(plan);
                          setPlanForm({
                            name: plan.name,
                            amount: plan.amount.toString(),
                            currency: plan.currency,
                            frequency: plan.frequency,
                            board: plan.board,
                            standard: plan.standard.toString(),
                            subject: plan.subject || ''
                          });
                          setIsPlanModalOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Are you sure you want to delete "${plan.name}"?`)) {
                            return;
                          }
                          try {
                            await api.delete(`/fee-plans/${plan.id}`);
                            showToast('Fee plan deleted successfully');
                            loadFeePlans();
                          } catch (error: any) {
                            showToast(error.message || 'Failed to delete fee plan', 'error');
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create Plan Modal */}
      <Modal isOpen={isPlanModalOpen} onClose={() => {
        setIsPlanModalOpen(false);
        setEditingPlan(null);
        setPlanForm({ name: '', amount: '', currency: 'INR', frequency: 'monthly', board: '', standard: '', subject: '' });
      }} title={editingPlan ? 'Edit Fee Plan' : 'Add Fee Plan'}>
        <form onSubmit={handleCreatePlan} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Plan Name *</label>
            <input required type="text" className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="e.g., Class 10 Monthly" value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Amount *</label>
              <input required type="number" className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} value={planForm.amount} onChange={e => setPlanForm({...planForm, amount: e.target.value})} />
            </div>
            <div>
               <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Frequency *</label>
               <select required className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} value={planForm.frequency} onChange={e => setPlanForm({...planForm, frequency: e.target.value})}>
                 <option value="monthly">Monthly</option>
                 <option value="yearly">Yearly</option>
               </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Board *</label>
              <select required className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} value={planForm.board} onChange={e => setPlanForm({...planForm, board: e.target.value})}>
                <option value="">Select</option>
                {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Standard *</label>
              <select required className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} value={planForm.standard} onChange={e => setPlanForm({...planForm, standard: e.target.value})}>
                <option value="">Select</option>
                {STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Subject (Optional)</label>
            <input type="text" className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} value={planForm.subject} onChange={e => setPlanForm({...planForm, subject: e.target.value})} />
          </div>

          <div className={`flex justify-end gap-3 mt-6 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button type="button" onClick={() => {
              setIsPlanModalOpen(false);
              setEditingPlan(null);
              setPlanForm({ name: '', amount: '', currency: 'INR', frequency: 'monthly', board: '', standard: '', subject: '' });
            }} className={`px-4 py-2 rounded-lg ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>Cancel</button>
            <button type="submit" className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
              {editingPlan ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title="Record Payment">
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select Student *</label>
            <select 
              required 
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              value={payForm.studentId} 
              onChange={e => setPayForm({...payForm, studentId: e.target.value})}
            >
              <option value="">Choose a student...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.standard} - {s.board})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Amount (INR) *</label>
              <input required type="number" className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Method *</label>
              <select required className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} value={payForm.method} onChange={e => setPayForm({...payForm, method: e.target.value})}>
                <option value="cash">Cash</option>
                <option value="online">Online</option>
                <option value="cheque">Cheque</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Note (Optional)</label>
            <textarea className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} rows={2} value={payForm.note} onChange={e => setPayForm({...payForm, note: e.target.value})} />
          </div>

          <div className={`flex justify-end gap-3 mt-6 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button type="button" onClick={() => setIsPayModalOpen(false)} className={`px-4 py-2 rounded-lg ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>Cancel</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Record Payment</button>
          </div>
        </form>
      </Modal>

      {/* Assign Plan Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Fee Plan">
        <form onSubmit={handleAssignPlan} className="space-y-4">
          <div className={`p-4 rounded-lg border text-sm mb-4 ${isDarkMode ? 'bg-yellow-900 border-yellow-700 text-yellow-300' : 'bg-yellow-50 border-yellow-100 text-yellow-800'}`}>
            Assigning a plan will set the expected fee amount for this student. This allows tracking of dues.
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select Plan *</label>
            <select 
              required 
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              value={selectedPlanId} 
              onChange={e => setSelectedPlanId(e.target.value)}
            >
              <option value="">Choose a plan template...</option>
              {feePlans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} - {p.amount} {p.currency} ({p.frequency})
                </option>
              ))}
            </select>
          </div>

          <div className={`flex justify-end gap-3 mt-6 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button type="button" onClick={() => setIsAssignModalOpen(false)} className={`px-4 py-2 rounded-lg ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>Cancel</button>
            <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Assign Plan</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Fees;

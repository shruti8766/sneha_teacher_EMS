
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ApiListResponse, Student } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Loader2, Plus, DollarSign, Calendar, Search, CreditCard, FileText } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { user } = useAuth();

  // Create Plan Modal
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
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
      const response = await api.get<ApiListResponse<FeeSummary>>(`/fees/summary?period=${period}`);
      setSummary(response.items || []);
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

  useEffect(() => {
    // Always load fee plans because they are used in the "Assign Plan" modal
    // which is accessible from the "Fee Collection" tab.
    loadFeePlans();

    if (activeTab === 'collection') {
      loadSummary();
      loadStudents();
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
      await api.post('/fee-plans', payload);
      showToast('Fee plan created successfully');
      setIsPlanModalOpen(false);
      setPlanForm({ name: '', amount: '', currency: 'INR', frequency: 'monthly', board: '', standard: '', subject: '' });
      loadFeePlans();
    } catch (error: any) {
      showToast(error.message || 'Failed to create fee plan', 'error');
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

  // Filter summary based on search
  const filteredSummary = summary.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Fees Management</h1>
        
        {/* Tabs */}
        <div className="bg-white p-1 rounded-lg border border-gray-200 inline-flex">
          <button 
            onClick={() => setActiveTab('collection')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'collection' ? 'bg-yellow-100 text-yellow-800' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Fee Collection
          </button>
          <button 
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'plans' ? 'bg-yellow-100 text-yellow-800' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Fee Plans
          </button>
        </div>
      </div>

      {activeTab === 'collection' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex gap-4 items-center flex-1">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Period</label>
                <input 
                  type="month" 
                  value={period} 
                  onChange={(e) => setPeriod(e.target.value)} 
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-gray-900"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Search Student</label>
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search by name..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-gray-900"
                  />
                </div>
              </div>
            </div>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Student Name</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Plan Amount</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Paid</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Due</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSummary.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No records found for this period.</td></tr>
                    ) : (
                      filteredSummary.map(item => (
                        <tr key={item.studentId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                          <td className="px-6 py-4 text-gray-600">
                            {item.plan ? item.plan.amount : <span className="text-gray-400 italic">No Plan</span>}
                          </td>
                          <td className="px-6 py-4 text-green-600 font-medium">{item.paidAmount}</td>
                          <td className="px-6 py-4 text-red-600 font-medium">{item.dueAmount}</td>
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
                              <button 
                                onClick={() => openPaymentModal(item.studentId)}
                                className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline"
                              >
                                Collect Fee
                              </button>
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
              <div className="col-span-full text-center text-gray-500 p-8 bg-white rounded-xl border border-gray-100">No fee plans found.</div>
            ) : (
              feePlans.map(plan => (
                <div key={plan.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-yellow-50 text-yellow-700 text-xs font-bold px-2 py-1 rounded-bl-lg uppercase">
                    {plan.frequency}
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2 pr-8">{plan.name}</h3>
                  
                  <div className="flex items-baseline gap-1 mb-4 text-yellow-600">
                    <span className="text-sm font-medium">{plan.currency}</span>
                    <span className="text-2xl font-bold">{plan.amount}</span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                       <span className="w-16 text-gray-400">Board:</span>
                       <span className="font-medium">{plan.board}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="w-16 text-gray-400">Class:</span>
                       <span className="font-medium">{plan.standard}</span>
                    </div>
                    {plan.subject && (
                      <div className="flex items-center gap-2">
                        <span className="w-16 text-gray-400">Subject:</span>
                        <span className="font-medium">{plan.subject}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create Plan Modal */}
      <Modal isOpen={isPlanModalOpen} onClose={() => setIsPlanModalOpen(false)} title="Add Fee Plan">
        <form onSubmit={handleCreatePlan} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
            <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-gray-900" placeholder="e.g., Class 10 Monthly" value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
              <input required type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-gray-900" value={planForm.amount} onChange={e => setPlanForm({...planForm, amount: e.target.value})} />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
               <select required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-gray-900" value={planForm.frequency} onChange={e => setPlanForm({...planForm, frequency: e.target.value})}>
                 <option value="monthly">Monthly</option>
                 <option value="yearly">Yearly</option>
               </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Board *</label>
              <select required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-gray-900" value={planForm.board} onChange={e => setPlanForm({...planForm, board: e.target.value})}>
                <option value="">Select</option>
                {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Standard *</label>
              <select required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-gray-900" value={planForm.standard} onChange={e => setPlanForm({...planForm, standard: e.target.value})}>
                <option value="">Select</option>
                {STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject (Optional)</label>
            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-gray-900" value={planForm.subject} onChange={e => setPlanForm({...planForm, subject: e.target.value})} />
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button type="button" onClick={() => setIsPlanModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">Create Plan</button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title="Record Payment">
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Student *</label>
            <select 
              required 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-gray-900" 
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (INR) *</label>
              <input required type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-gray-900" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method *</label>
              <select required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-gray-900" value={payForm.method} onChange={e => setPayForm({...payForm, method: e.target.value})}>
                <option value="cash">Cash</option>
                <option value="online">Online</option>
                <option value="cheque">Cheque</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label>
            <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-gray-900" rows={2} value={payForm.note} onChange={e => setPayForm({...payForm, note: e.target.value})} />
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button type="button" onClick={() => setIsPayModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Record Payment</button>
          </div>
        </form>
      </Modal>

      {/* Assign Plan Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Fee Plan">
        <form onSubmit={handleAssignPlan} className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-sm text-yellow-800 mb-4">
            Assigning a plan will set the expected fee amount for this student. This allows tracking of dues.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Plan *</label>
            <select 
              required 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-gray-900" 
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

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button type="button" onClick={() => setIsAssignModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Assign Plan</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Fees;

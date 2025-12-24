import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDarkMode } from '../context/DarkModeContext';
import { api } from '../services/api';
import { DollarSign, CreditCard, TrendingUp, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

interface FeePlan {
  amount: number;
  currency: string;
  frequency: string;
  startMonth: any;
  isActive: boolean;
  lastUpdated?: any;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  note?: string;
  recordedAt?: any;
}

interface FeeStats {
  feePlan?: FeePlan;
  totalPaid: number;
  outstandingBalance: number;
  nextDueDate: string;
}

const StudentFees: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isDarkMode } = useDarkMode();
  const [stats, setStats] = useState<FeeStats>({
    totalPaid: 0,
    outstandingBalance: 0,
    nextDueDate: ''
  });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeeData();
  }, [user]);

  const loadFeeData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get student data which includes embedded fee plan
      let feePlan = null;
      let totalDue = 0;
      
      let studentDocId = user.uid; // Default to user.uid for API lookup
      
      try {
        const studentResponse = await api.get<any>(`/students/${user.uid}`);
        console.log('Student Response:', studentResponse);
        
        if (studentResponse.ok) {
          // Store the document ID for payment fetching
          studentDocId = studentResponse.id;
          console.log('Using Student Document ID for payments:', studentDocId);
          
          // Student data is directly in the response, not wrapped in a 'student' property
          console.log('Fee Plan:', studentResponse.feePlan);
          
          if (studentResponse.feePlan) {
            feePlan = studentResponse.feePlan;
            
            // Only calculate if plan is active
            if (feePlan.isActive) {
              // Use startMonth if available, otherwise use lastUpdated (when plan was assigned)
              const startValue = feePlan.startMonth || feePlan.lastUpdated;
              
              if (startValue) {
                const monthsElapsed = calculateMonthsElapsed(startValue);
                
                if (feePlan.frequency === 'monthly') {
                  totalDue = feePlan.amount * monthsElapsed;
                } else if (feePlan.frequency === 'yearly') {
                  totalDue = feePlan.amount;
                }
              } else {
                console.log('No start date available, using 1 month');
                // Default to 1 month if no start date
                totalDue = feePlan.amount;
              }
            }
          } else {
            console.log('No fee plan found in student data');
          }
        }
      } catch (feePlanError) {
        // Fee plan not assigned - continue with null
        console.error('Error fetching student data:', feePlanError);
      }
      
      // Get payment history using the DOCUMENT ID (not user ID)
      console.log('Fetching payments for student document ID:', studentDocId);
      const paymentResponse = await api.get<any>(`/students/${studentDocId}/fees/payments`);
      console.log('Payment Response:', paymentResponse);
      
      const paymentsList = paymentResponse.payments || paymentResponse.items || [];
      console.log('Payments List:', paymentsList);
      console.log('Number of payments:', paymentsList.length);
      
      setPayments(paymentsList);

      // Calculate total paid from payment history
      let totalPaid = 0;
      paymentsList.forEach((p: Payment) => {
        console.log('Processing payment:', p.amount);
        totalPaid += p.amount || 0;
      });
      
      console.log('Total Paid Calculated:', totalPaid);

      // Calculate next due date
      let nextDueDate = '';
      if (feePlan && feePlan.isActive) {
        nextDueDate = calculateNextDueDate(feePlan);
      }

      setStats({
        feePlan,
        totalPaid,
        outstandingBalance: Math.max(0, totalDue - totalPaid),
        nextDueDate
      });
    } catch (error: any) {
      console.error('Fee data error:', error);
      showToast(error.message || 'Failed to load fee data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthsElapsed = (startMonth: any): number => {
    if (!startMonth) {
      console.log('No startMonth provided, defaulting to 1 month');
      return 1;
    }
    
    let startDate: Date;
    
    try {
      // Handle different formats
      if (typeof startMonth === 'string') {
        const [year, month] = startMonth.split('-').map(Number);
        startDate = new Date(year, month - 1, 1);
      } else if (startMonth._seconds) {
        // Firestore timestamp format
        startDate = new Date(startMonth._seconds * 1000);
      } else if (startMonth.seconds) {
        startDate = new Date(startMonth.seconds * 1000);
      } else if (startMonth instanceof Date) {
        startDate = startMonth;
      } else {
        // Try to parse as date
        startDate = new Date(startMonth);
      }
      
      // Validate the date
      if (isNaN(startDate.getTime())) {
        console.log('Invalid date from startMonth, defaulting to 1 month');
        return 1;
      }
      
      const now = new Date();
      const months = (now.getFullYear() - startDate.getFullYear()) * 12 
                     + (now.getMonth() - startDate.getMonth()) + 1;
      console.log('Calculated months elapsed:', months);
      return Math.max(1, months);
    } catch (error) {
      console.error('Error calculating months elapsed:', error);
      return 1;
    }
  };

  const calculateNextDueDate = (plan: FeePlan): string => {
    if (!plan.startMonth) return '';
    
    let startDate: Date;
    
    // Handle different formats
    if (typeof plan.startMonth === 'string') {
      const [year, month] = plan.startMonth.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
    } else if (plan.startMonth._seconds) {
      startDate = new Date(plan.startMonth._seconds * 1000);
    } else if (plan.startMonth.seconds) {
      startDate = new Date(plan.startMonth.seconds * 1000);
    } else {
      startDate = new Date(plan.startMonth);
    }
    
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    if (plan.frequency === 'monthly') {
      // Next month
      let nextYear = currentYear;
      let nextMonth = currentMonth + 1;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear++;
      }
      return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
    } else if (plan.frequency === 'yearly') {
      // Next year, same month as start
      return `${startYear + 1}-${String(startMonth).padStart(2, '0')}-01`;
    }
    
    return '';
  };

  const formatDate = (dateObj: any) => {
    if (!dateObj) return '-';
    const timestamp = dateObj._seconds ? dateObj._seconds * 1000 : new Date(dateObj).getTime();
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPaymentMethodBadge = (method: string) => {
    const colors: { [key: string]: string } = {
      cash: isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800',
      online: isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800',
      cheque: isDarkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-800',
      card: isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800'
    };
    return colors[method] || (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800');
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen px-4 md:px-8 py-6 ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
      <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className={`text-3xl font-bold mb-2 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}><DollarSign size={40} className="text-purple-600" />Fee Management</h1>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>View your fee plan and payment history</p>
      </div>

      {/* Fee Plan Overview */}
      {stats.feePlan ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Fee Plan */}
          <div className={`rounded-lg shadow-sm border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center mb-4">
              <DollarSign className={`w-5 h-5 mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Current Fee Plan</h2>
            </div>
            <div className={`space-y-3 divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Amount</span>
                <span className={`font-medium ${isDarkMode ? 'text-white' : ''}`}>
                  {stats.feePlan.currency} {stats.feePlan.amount}
                </span>
              </div>
              <div className="flex justify-between pt-3">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Frequency</span>
                <span className={`font-medium capitalize ${isDarkMode ? 'text-white' : ''}`}>{stats.feePlan.frequency}</span>
              </div>
              <div className="flex justify-between pt-3">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Status</span>
                <span className={`flex items-center px-2 py-1 rounded text-sm font-medium ${isDarkMode ? 'bg-green-900 text-green-300' : 'text-green-700 bg-green-100'}`}>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Active
                </span>
              </div>
              {stats.nextDueDate && (
                <div className="flex justify-between pt-3">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Next Due Date</span>
                  <span className={`font-medium ${isDarkMode ? 'text-white' : ''}`}>{stats.nextDueDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-lg shadow-sm p-4 border-l-4 ${isDarkMode ? 'bg-gray-800 border-green-700' : 'bg-green-50 border-green-500'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>Total Paid</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                    {stats.feePlan.currency} {stats.totalPaid}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className={`rounded-lg shadow-sm p-4 border-l-4 ${stats.outstandingBalance > 0 ? (isDarkMode ? 'bg-gray-800 border-red-700' : 'bg-red-50 border-red-500') : (isDarkMode ? 'bg-gray-800 border-blue-700' : 'bg-blue-50 border-blue-500')}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${stats.outstandingBalance > 0 ? (isDarkMode ? 'text-red-400' : 'text-red-600') : (isDarkMode ? 'text-blue-400' : 'text-blue-600')}`}>
                    Outstanding Balance
                  </p>
                  <p className={`text-2xl font-bold ${stats.outstandingBalance > 0 ? (isDarkMode ? 'text-red-300' : 'text-red-700') : (isDarkMode ? 'text-blue-300' : 'text-blue-700')}`}>
                    {stats.feePlan.currency} {stats.outstandingBalance}
                  </p>
                </div>
                {stats.outstandingBalance > 0 ? (
                  <AlertCircle className="w-8 h-8 text-red-500" />
                ) : (
                  <CheckCircle className="w-8 h-8 text-blue-500" />
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`border-l-4 rounded-lg p-6 ${isDarkMode ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-500'}`}>
          <div className="flex items-start">
            <AlertCircle className={`w-5 h-5 mt-0.5 mr-3 flex-shrink-0 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <div>
              <h3 className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-900'}`}>No Fee Plan Assigned</h3>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-800'}`}>
                You don't have a fee plan assigned yet. Please contact your teacher/admin.
              </p>
              {stats.totalPaid > 0 && (
                <div className={`mt-3 p-3 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-blue-200'}`}>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>Total Payments Made:</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>₹{stats.totalPaid}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className={`rounded-lg shadow-sm border overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex items-center">
            <CreditCard className={`w-5 h-5 mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Payment History</h2>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className={`text-center py-12 px-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <CreditCard className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No payments recorded</h3>
            <p>You haven't made any payments yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`border-b ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>Date</th>
                  <th className={`px-6 py-3 text-left text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>Amount</th>
                  <th className={`px-6 py-3 text-left text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>Method</th>
                  <th className={`px-6 py-3 text-left text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>Note</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {payments.map((payment: Payment) => (
                  <tr key={payment.id} className={`${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                    <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      {formatDate(payment.recordedAt)}
                    </td>
                    <td className={`px-6 py-4 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      {payment.amount}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getPaymentMethodBadge(payment.method)}`}>
                        {payment.method}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {payment.note || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default StudentFees;

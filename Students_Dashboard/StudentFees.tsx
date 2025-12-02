import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
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
      cash: 'bg-green-100 text-green-800',
      online: 'bg-blue-100 text-blue-800',
      cheque: 'bg-purple-100 text-purple-800',
      card: 'bg-red-100 text-red-800'
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Fee Management</h1>
        <p className="text-gray-600">View your fee plan and payment history</p>
      </div>

      {/* Fee Plan Overview */}
      {stats.feePlan ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Current Fee Plan */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <DollarSign className="w-5 h-5 mr-2 text-gray-600" />
              <h2 className="text-xl font-semibold">Current Fee Plan</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount</span>
                <span className="font-medium">
                  {stats.feePlan.currency} {stats.feePlan.amount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Frequency</span>
                <span className="font-medium capitalize">{stats.feePlan.frequency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className="flex items-center text-green-700 bg-green-100 px-2 py-1 rounded text-sm">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Active
                </span>
              </div>
              {stats.nextDueDate && (
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-600">Next Due Date</span>
                  <span className="font-medium">{stats.nextDueDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg shadow-md p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Total Paid</p>
                  <p className="text-2xl font-bold text-green-700">
                    {stats.feePlan.currency} {stats.totalPaid}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className={`${stats.outstandingBalance > 0 ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'} rounded-lg shadow-md p-4 border-l-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${stats.outstandingBalance > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    Outstanding Balance
                  </p>
                  <p className={`text-2xl font-bold ${stats.outstandingBalance > 0 ? 'text-red-700' : 'text-blue-700'}`}>
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
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-900">No Fee Plan Assigned</h3>
              <p className="text-blue-800 text-sm mt-1">
                You don't have a fee plan assigned yet. Please contact your teacher/admin.
              </p>
              {stats.totalPaid > 0 && (
                <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                  <p className="text-sm font-medium text-gray-900">Total Payments Made:</p>
                  <p className="text-2xl font-bold text-green-600">₹{stats.totalPaid}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <div className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-gray-600" />
            <h2 className="text-xl font-semibold">Payment History</h2>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-12 px-6">
            <CreditCard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments recorded</h3>
            <p className="text-gray-600">You haven't made any payments yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Method</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((payment: Payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(payment.recordedAt)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {payment.amount}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getPaymentMethodBadge(payment.method)}`}>
                        {payment.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
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
  );
};

export default StudentFees;

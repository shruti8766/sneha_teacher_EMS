import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDarkMode } from '../context/DarkModeContext';
import { api } from '../services/api';
import { 
  BookOpen, 
  Clock, 
  AlertCircle,
  Loader2
} from 'lucide-react';


interface Homework {
  id: string;
  title: string;
  description: string;
  subject: string;
  board: string;
  standard: number;
  dueDate: string;
  assignedTo?: string[];
  status?: 'pending' | 'completed' | 'overdue';
  createdAt?: any;
}

interface Submission {
  id: string;
  homeworkId: string;
  studentId: string;
  submissionText: string;
  attachments?: string[];
  submittedAt: any;
  grade?: number;
  feedback?: string;
}

const StudentHomework: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isDarkMode } = useDarkMode();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomework();
  }, [user]); // Only reload when user changes, not when filter changes

  const loadHomework = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // First, get the student document to find the document ID
      let studentDocId = null;
      try {
        const studentResponse = await api.get<any>(`/students/${user.uid}`);
        const student = studentResponse.student || studentResponse;
        studentDocId = student.id;
        console.log('Student userId:', user.uid, 'Student documentId:', studentDocId);
      } catch (error) {
        console.log('Could not fetch student document, will only use userId');
      }
      
      // Load all homework and filter client-side by assignTo array
      const homeworkResponse = await api.get<any>(`/homework?limit=1000`);
      const allHomework = homeworkResponse.homework || homeworkResponse.items || [];
      
      // Filter homework assigned to this specific student (check both userId and document id)
      const hwList = allHomework.filter((hw: any) => {
        const assignTo = hw.assignTo || [];
        return assignTo.includes(user.uid) || (studentDocId && assignTo.includes(studentDocId));
      });
      
      console.log('All homework:', allHomework.length);
      console.log('Homework assigned to student:', hwList.length);
      
      setHomework(hwList);
    } catch (error: any) {
      showToast(error.message || 'Failed to load homework', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (hw: Homework) => {
    const dueDate = new Date(hw.dueDate);
    const now = new Date();
    
    if (dueDate < now) {
      return (
        <span className="flex items-center text-red-700 bg-red-100 px-3 py-1 rounded-full text-sm">
          <AlertCircle className="w-4 h-4 mr-1" />
          Overdue
        </span>
      );
    }
    
    return (
      <span className="flex items-center text-blue-700 bg-blue-100 px-3 py-1 rounded-full text-sm">
        <Clock className="w-4 h-4 mr-1" />
        Active
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
        <h1 className={`text-3xl font-bold mb-2 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}><BookOpen size={40} className="text-blue-600" />My Homework</h1>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>View and submit your assignments</p>
      </div>

      {/* Homework List */}
      {homework.length === 0 ? (
        <div className={`text-center py-12 rounded-lg shadow ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <BookOpen className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-xl font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No homework found</h3>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>You don't have any homework assignments yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {homework.map((hw) => (
            <div key={hw.id} className={`rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{hw.title}</h3>
                  <p className={isDarkMode ? 'text-gray-300 mb-3' : 'text-gray-600 mb-3'}>{hw.description}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className={`flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <BookOpen className="w-4 h-4 mr-1" />
                      {hw.subject}
                    </span>
                    <span className={`flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <Clock className="w-4 h-4 mr-1" />
                      Due: {formatDate(hw.dueDate)}
                    </span>
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                      {hw.board} - Std {hw.standard}
                    </span>
                  </div>
                </div>
                
                <div className="ml-4">
                  {getStatusBadge(hw)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentHomework;

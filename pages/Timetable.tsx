import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ApiListResponse, Schedule, Batch, Teacher } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { Loader2, Plus, Clock, MapPin, Edit2, Trash2, Calendar, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import Modal from '../components/Modal';
import { pushNotifications } from '../services/pushNotifications';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', 
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', 
  '18:00', '19:00', '20:00', '21:00'
];

const Timetable: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(0);
  const { showToast } = useToast();
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>(['Monday']);
  const [formData, setFormData] = useState({
    batchId: '',
    teacherId: '',
    subject: '',
    dayOfWeek: 'Monday' as Schedule['dayOfWeek'],
    startTime: '09:00',
    endTime: '10:30',
    room: '',
    recurring: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [availabilityChecking, setAvailabilityChecking] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (schedules.length > 0) {
      console.log('🎯 Schedules updated in state:', schedules);
      schedules.forEach(s => {
        console.log(`  - ${s.batchName} | ${s.subject} | ${s.dayOfWeek} ${s.startTime}-${s.endTime}`);
      });
    }
  }, [schedules]);

  useEffect(() => {
    if (editingSchedule) {
      console.log('📋 Form data for editing:', formData);
    }
  }, [isModalOpen, editingSchedule, formData]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('📚 Loading timetable data...');
      
      const [schedulesRes, batchesRes, teachersRes] = await Promise.all([
        api.get<{ ok: boolean; week?: string; schedules?: Record<string, Schedule[]> }>('/schedules/timetable'),
        api.get<ApiListResponse<Batch>>('/batches?limit=100'),
        api.get<ApiListResponse<Teacher>>('/teachers?limit=100')
      ]);
      
      console.log('📥 Raw schedules response:', schedulesRes);
      
      // Convert day-keyed schedules to flat array
      let schedulesList: Schedule[] = [];
      if (schedulesRes.schedules) {
        console.log('✅ Found schedules object:', schedulesRes.schedules);
        Object.entries(schedulesRes.schedules).forEach(([day, daySchedules]) => {
          console.log(`  ${day}:`, daySchedules);
          if (Array.isArray(daySchedules)) {
            // Add dayOfWeek to each schedule since it's organized by day
            const schedulesWithDay = daySchedules.map((s: any) => ({
              ...s,
              dayOfWeek: day as Schedule['dayOfWeek']
            }));
            schedulesList.push(...schedulesWithDay);
          }
        });
      } else if (Array.isArray(schedulesRes)) {
        console.log('✅ Schedules is array:', schedulesRes);
        schedulesList = schedulesRes;
      } else {
        console.warn('⚠️ Unexpected schedules format:', schedulesRes);
      }
      
      console.log('📊 Final schedules list:', schedulesList);
      console.log('📚 Batches:', batchesRes.items);
      console.log('👨‍🏫 Teachers:', teachersRes.items);
      
      // Enrich schedules with batchId and teacherId by looking up names
      const enrichedSchedules = schedulesList.map((schedule: any) => {
        const batch = batchesRes.items?.find((b: any) => b.name === schedule.batchName);
        const teacher = teachersRes.items?.find((t: any) => t.name === schedule.teacherName);
        
        return {
          ...schedule,
          batchId: schedule.batchId || batch?.id || '',
          teacherId: schedule.teacherId || teacher?.id || ''
        };
      });
      
      // Log detailed schedule info with teacher names
      console.log('📋 Schedule details after load:');
      enrichedSchedules.forEach((s: any) => {
        console.log(`  - ${s.subject} | ${s.dayOfWeek} ${s.startTime}-${s.endTime} | Teacher: ${s.teacherName} (ID: ${s.teacherId})`);
      });
      
      setSchedules(enrichedSchedules);
      setBatches(batchesRes.items || []);
      // Filter out inactive/deleted teachers - treat undefined/missing active field as true
      const activeTeachers = (teachersRes.items || []).filter(t => t.active !== false);
      setTeachers(activeTeachers);
    } catch (error) {
      // API not available - try fallback to GET /schedules
      console.error('❌ Failed to load timetable data:', error);
      console.log('🔄 Trying fallback GET /schedules endpoint...');
      
      try {
        const schedulesRes = await api.get<ApiListResponse<Schedule>>('/schedules');
        console.log('✅ Fallback schedules response:', schedulesRes);
        setSchedules(schedulesRes.items || []);
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        setSchedules([]);
      }
      
      try {
        const batchesRes = await api.get<ApiListResponse<Batch>>('/batches?limit=100');
        setBatches(batchesRes.items || []);
      } catch (e) {
        setBatches([]);
      }
      
      try {
        const teachersRes = await api.get<ApiListResponse<Teacher>>('/teachers?limit=100');
        // Filter out inactive/deleted teachers
        const activeTeachers = (teachersRes.items || []).filter(t => t.active !== false);
        setTeachers(activeTeachers);
      } catch (e) {
        setTeachers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const batch = batches.find(b => b.id === formData.batchId);
      const teacher = teachers.find(t => t.id === formData.teacherId);
      
      const daysToSchedule = editingSchedule ? [formData.dayOfWeek] : selectedDays;

      console.log('📤 Creating/Updating schedules for days:', daysToSchedule);
      console.log('📤 Schedule details:', {
        batchId: formData.batchId,
        teacherId: formData.teacherId,
        subject: formData.subject,
        startTime: formData.startTime,
        endTime: formData.endTime,
        room: formData.room,
      });

      // Check availability for each day
      for (const day of daysToSchedule) {
        if (!editingSchedule) {
          // Only check availability for new schedules, not edits
          console.log(`🔍 Checking availability for ${day} at ${formData.startTime}-${formData.endTime}`);
          try {
            const availResponse = await api.get<any>('/schedules/teacher-availability', {
              teacherId: formData.teacherId,
              dayOfWeek: day,
              startTime: formData.startTime,
              endTime: formData.endTime
            });
            
            console.log('✅ Availability check result:', availResponse);
            
            if (availResponse && availResponse.ok === false) {
              showToast(`Teacher not available on ${day} at ${formData.startTime}-${formData.endTime}`, 'error');
              setSubmitting(false);
              return;
            }
          } catch (error) {
            console.warn('⚠️ Availability check failed, proceeding anyway:', error);
          }
        }
      }

      if (editingSchedule) {
        // Edit single schedule
        const payload = {
          ...formData,
          batchName: batch?.name,
          teacherName: teacher?.name
        };
        console.log('✏️ Updating schedule:', editingSchedule.id, payload);
        const updateResponse = await api.put(`/schedules/${editingSchedule.id}`, payload);
        console.log('✅ Update response:', updateResponse);
        showToast('Schedule updated successfully');
      } else {
        // Create schedules for all selected days
        const createdSchedules = [];
        for (const day of daysToSchedule) {
          const payload = {
            batchId: formData.batchId,
            teacherId: formData.teacherId,
            subject: formData.subject,
            dayOfWeek: day,
            startTime: formData.startTime,
            endTime: formData.endTime,
            room: formData.room,
            recurring: formData.recurring,
            batchName: batch?.name,
            teacherName: teacher?.name
          };
          console.log(`📝 Creating schedule for ${day}:`, payload);
          const response = await api.post('/schedules', payload);
          console.log(`✅ Schedule created for ${day}:`, response);
          createdSchedules.push({
            day,
            scheduleId: response.scheduleId,
            notificationsCreated: response.notificationsCreated
          });

          // Automatically create an attendance session for this schedule
          try {
            const today = new Date();
            const dayIndex = DAYS_OF_WEEK.indexOf(day);
            const sessionDate = new Date(today);
            const currentDayIndex = today.getDay();
            // Adjust: Sunday is 0, Monday is 1, etc. But DAYS_OF_WEEK starts with Monday
            const adjustedCurrentDay = currentDayIndex === 0 ? 6 : currentDayIndex - 1;
            const daysUntil = (dayIndex - adjustedCurrentDay + 7) % 7;
            sessionDate.setDate(today.getDate() + daysUntil);

            const sessionPayload = {
              batchId: formData.batchId,
              date: sessionDate.toISOString().slice(0, 10),
              subject: formData.subject,
              startTime: formData.startTime,
              endTime: formData.endTime,
              topic: ''
            };
            console.log(`📚 Creating attendance session for ${day}:`, sessionPayload);
            const sessionResponse = await api.post('/attendance/sessions', sessionPayload);
            console.log(`✅ Attendance session created for ${day}:`, sessionResponse);
          } catch (err) {
            console.warn(`⚠️ Failed to create attendance session for ${day}:`, err);
            // Don't fail the schedule creation if session creation fails
          }
        }

        // Create messages and notifications for admin and students
        const totalNotifications = createdSchedules.reduce((sum, s) => sum + s.notificationsCreated, 0);
        const daysText = daysToSchedule.join(', ');
        
        // 1. Create a message for the admin about the schedule creation
        const adminScheduleMessage = {
          title: `📅 Schedule Created: ${batch?.name}`,
          content: `A new class schedule has been successfully created and shared with students.\n\n📚 Class Details:\n   Batch: ${batch?.name}\n   Subject: ${formData.subject}\n   Teacher: ${teacher?.name}\n   Time: ${formData.startTime} - ${formData.endTime}\n   Room: ${formData.room || 'To be assigned'}\n   Days: ${daysText}\n\n👥 Total Students Notified: ${totalNotifications}\n\nAll students in this batch have been automatically notified of their new schedule.`,
          type: 'announcement',
          priority: 'high',
          recipientType: 'board',
          board: 'admin'
        };

        try {
          const adminMsgRes = await api.post('/messages', adminScheduleMessage);
          console.log('✅ Admin notification message created');
        } catch (err) {
          console.warn('⚠️ Failed to create admin message:', err);
        }

        // 2. Create a message for students in the batch
        if (batch?.studentIds && batch.studentIds.length > 0) {
          const studentScheduleMessage = {
            title: `📚 New Class Schedule: ${formData.subject}`,
            content: `A new class schedule has been added for your batch.\n\n📋 Class Information:\n   Subject: ${formData.subject}\n   Batch: ${batch?.name}\n   Teacher: ${teacher?.name}\n   Time: ${formData.startTime} - ${formData.endTime}\n   Location: ${formData.room || 'To be announced'}\n   Days: ${daysText}\n\nPlease update your schedule accordingly and make a note of these timing.`,
            type: 'announcement',
            priority: 'high',
            recipientType: 'batch',
            batchId: formData.batchId,
            recipientIds: batch.studentIds
          };

          try {
            const studentMsgRes = await api.post('/messages', studentScheduleMessage);
            console.log(`✅ Schedule notification sent to ${batch.studentIds.length} student(s)`);
          } catch (err) {
            console.warn('⚠️ Failed to create student message:', err);
          }
        }

        // 3. Send browser push notification if enabled
        try {
          if (pushNotifications.isSupported() && pushNotifications.getPermission() === 'granted') {
            await pushNotifications.showNotification(`📅 Schedule Created: ${batch?.name}`, {
              body: `${formData.subject} - ${formData.startTime} to ${formData.endTime} on ${daysText}`,
              icon: '/favicon.ico',
              tag: 'schedule-created',
              data: {
                url: '/#/timetable'
              }
            });
            console.log('✅ Browser push notification sent');
          }
        } catch (err) {
          console.warn('⚠️ Failed to send push notification:', err);
        }

        showToast(`✅ Schedule created! ${totalNotifications} student(s) notified`);
      }

      setIsModalOpen(false);
      setFormData({
        batchId: '',
        teacherId: '',
        subject: '',
        dayOfWeek: 'Monday',
        startTime: '09:00',
        endTime: '10:30',
        room: '',
        recurring: true
      });
      setSelectedDays(['Monday']);
      setEditingSchedule(null);
      setAvailabilityMessage(null);
      
      // Wait a moment for backend to persist, then reload
      console.log('⏳ Waiting for data persistence...');
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('🔄 Reloading schedules...');
      loadData();
    } catch (error: any) {
      console.error('❌ Error creating/updating schedule:', error);
      showToast(error.message || 'Failed to save schedule', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (schedule: Schedule) => {
    console.log('✏️ Editing schedule:', schedule);
    setEditingSchedule(schedule);
    
    // Map batch name to batch ID
    const foundBatch = batches.find(b => b.name === schedule.batchName);
    const batchId = foundBatch?.id || schedule.batchId || '';
    console.log('🔍 Batch mapping:', {batchName: schedule.batchName, found: !!foundBatch, batchId});
    
    // Map teacher name to teacher ID
    const foundTeacher = teachers.find(t => t.name === schedule.teacherName);
    const teacherId = foundTeacher?.id || schedule.teacherId || '';
    console.log('🔍 Teacher mapping:', {teacherName: schedule.teacherName, found: !!foundTeacher, teacherId});
    
    const newFormData = {
      batchId,
      teacherId,
      subject: schedule.subject,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      room: schedule.room || '',
      recurring: schedule.recurring
    };
    console.log('📝 Setting form data:', newFormData);
    setFormData(newFormData);
    setSelectedDays([schedule.dayOfWeek]);
    setAvailabilityMessage(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (scheduleId: string) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await api.delete(`/schedules/${scheduleId}`);
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      showToast('Schedule deleted successfully');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete schedule', 'error');
    }
  };

  const getScheduleColor = (subject: string) => {
    const colors: { [key: string]: string } = {
      'Mathematics': 'bg-blue-100 border-blue-300 text-blue-900',
      'Physics': 'bg-purple-100 border-purple-300 text-purple-900',
      'Chemistry': 'bg-green-100 border-green-300 text-green-900',
      'Biology': 'bg-teal-100 border-teal-300 text-teal-900',
      'English': 'bg-pink-100 border-pink-300 text-pink-900',
      'History': 'bg-orange-100 border-orange-300 text-orange-900',
      'Geography': 'bg-yellow-100 border-yellow-300 text-yellow-900',
    };
    return colors[subject] || 'bg-gray-100 border-gray-300 text-gray-900';
  };

  const getSchedulesForDay = (day: string) => {
    return schedules.filter(s => s.dayOfWeek === day).sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });
  };

  const checkConflict = (schedule: Schedule, day: string, start: string, end: string) => {
    return schedules.some(s => 
      s.id !== schedule.id &&
      s.dayOfWeek === day &&
      s.teacherId === schedule.teacherId &&
      ((start >= s.startTime && start < s.endTime) ||
       (end > s.startTime && end <= s.endTime) ||
       (start <= s.startTime && end >= s.endTime))
    );
  };

  return (
    <div className={`space-y-4 min-h-screen px-3 md:px-6 py-4 ${isDarkMode ? 'bg-gray-900' : 'bg-blue-50'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            <CalendarDays className="text-red-600" size={28} />
            Class Timetable
          </h1>
          <p className={`mt-0.5 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Manage weekly class schedules</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingSchedule(null);
              setFormData({
                batchId: '',
                teacherId: '',
                subject: '',
                dayOfWeek: 'Monday',
                startTime: '09:00',
                endTime: '10:30',
                room: '',
                recurring: true
              });
              setSelectedDays(['Monday']);
              setAvailabilityMessage(null);
              setIsModalOpen(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5 font-medium shadow-sm text-sm"
          >
            <Plus size={18} /> Add Schedule
          </button>
        )}
      </div>

      {/* Week Navigation */}
      <div className={`rounded-lg shadow-sm border p-3 flex items-center justify-between ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <button
          onClick={() => setCurrentWeek(prev => prev - 1)}
          className={`p-1.5 rounded-lg transition ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
        >
          <ChevronLeft size={18} className={isDarkMode ? 'text-gray-300' : 'text-gray-700'} />
        </button>
        <div className="text-center">
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Week View</p>
          <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {currentWeek === 0 ? 'This Week' : currentWeek > 0 ? `${currentWeek} week(s) ahead` : `${Math.abs(currentWeek)} week(s) ago`}
          </p>
        </div>
        <button
          onClick={() => setCurrentWeek(prev => prev + 1)}
          className={`p-1.5 rounded-lg transition ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
        >
          <ChevronRight size={18} className={isDarkMode ? 'text-gray-300' : 'text-gray-700'} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : (
        <div className={`rounded-lg shadow-sm border overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className={`bg-gradient-to-r ${isDarkMode ? 'from-gray-700 to-gray-600' : 'from-blue-50 to-purple-50'}`}>
                  <th className={`border p-2 text-left text-xs font-semibold min-w-[80px] ${isDarkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
                    Time
                  </th>
                  {DAYS_OF_WEEK.map(day => (
                    <th key={day} className={`border p-2 text-center text-xs font-semibold min-w-[120px] ${isDarkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((time, idx) => {
                  if (idx === TIME_SLOTS.length - 1) return null;
                  const endTime = TIME_SLOTS[idx + 1];
                  
                  return (
                    <tr key={time} className={`transition ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                      <td className={`border p-2 text-xs font-medium ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                        {time}
                      </td>
                      {DAYS_OF_WEEK.map(day => {
                        const daySchedules = getSchedulesForDay(day);
                        if (daySchedules.length > 0 && idx === 0) {
                          console.log(`📅 ${day} schedules:`, daySchedules.map(s => `${s.subject} ${s.startTime}-${s.endTime}`));
                        }
                        const relevantSchedule = daySchedules.find(s => 
                          s.startTime <= time && s.endTime > time
                        );

                        return (
                          <td key={day} className={`border p-1.5 align-top ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            {relevantSchedule && relevantSchedule.startTime === time && (
                              <div
                                className={`${getScheduleColor(relevantSchedule.subject)} border-2 rounded-lg p-2 cursor-pointer hover:shadow-md transition group relative`}
                              >
                                <div className="font-semibold text-xs mb-0.5">{relevantSchedule.batchName}</div>
                                <div className="text-xs mb-0.5">{relevantSchedule.subject}</div>
                                <div className="text-xs flex items-center gap-0.5 mb-0.5">
                                  <Clock size={10} />
                                  {relevantSchedule.startTime} - {relevantSchedule.endTime}
                                </div>
                                {relevantSchedule.teacherName && (
                                  <div className="text-xs opacity-75">{relevantSchedule.teacherName}</div>
                                )}
                                {relevantSchedule.room && (
                                  <div className="text-xs flex items-center gap-0.5 mt-0.5">
                                    <MapPin size={10} />
                                    {relevantSchedule.room}
                                  </div>
                                )}
                                {isAdmin && (
                                  <div className="absolute top-1 right-1 opacity-100 flex gap-0.5">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(relevantSchedule);
                                      }}
                                      className="p-1 bg-white rounded hover:bg-blue-50 transition shadow-sm hover:shadow-md"
                                      title="Edit schedule"
                                    >
                                      <Edit2 size={14} className="text-blue-600" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(relevantSchedule.id);
                                      }}
                                      className="p-1 bg-white rounded hover:bg-red-50 text-red-600 transition shadow-sm hover:shadow-md"
                                      title="Delete schedule"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className={`rounded-xl shadow-sm border p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Subject Color Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Mathematics</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-100 border-2 border-purple-300 rounded"></div>
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Physics</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Chemistry</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-teal-100 border-2 border-teal-300 rounded"></div>
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Biology</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-pink-100 border-2 border-pink-300 rounded"></div>
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>English</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-100 border-2 border-orange-300 rounded"></div>
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>History</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-300 rounded"></div>
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Geography</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded"></div>
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Others</span>
          </div>
        </div>
      </div>

      {/* Add/Edit Schedule Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSchedule(null);
        }}
        title={editingSchedule ? `✏️ Edit Schedule - ${editingSchedule.subject}` : '➕ Add New Schedule'}
        isDarkMode={isDarkMode}
      >
        {editingSchedule && (
          <div className={`mb-4 p-3 rounded-lg border ${isDarkMode ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-900'}`}>
              <strong>Currently editing:</strong> {editingSchedule.subject} - {editingSchedule.batchName}
              <br />
              <strong>Current time:</strong> {editingSchedule.startTime} to {editingSchedule.endTime}
            </p>
          </div>
        )}
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Batch *</label>
              <select
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                value={formData.batchId}
                onChange={e => {
                  console.log('Batch changed to:', e.target.value);
                  setFormData({...formData, batchId: e.target.value});
                }}
              >
                <option value="">Select Batch</option>
                {batches.map(batch => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} ({batch.board} {batch.standard})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Teacher *</label>
              <select
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                value={formData.teacherId}
                onChange={e => {
                  console.log('Teacher changed to:', e.target.value);
                  setFormData({...formData, teacherId: e.target.value});
                }}
              >
                <option value="">Select Teacher</option>
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Subject *</label>
              <input
                required
                type="text"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                value={formData.subject}
                onChange={e => setFormData({...formData, subject: e.target.value})}
                placeholder="e.g., Mathematics"
              />
            </div>

            {editingSchedule ? (
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Day of Week *</label>
                <select
                  required
                  disabled
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-600 border-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-100 border-gray-300 text-gray-600 cursor-not-allowed'}`}
                  value={formData.dayOfWeek}
                >
                  <option>{formData.dayOfWeek}</option>
                </select>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cannot change day for existing schedule</p>
              </div>
            ) : (
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select Days *</label>
                <div className="grid grid-cols-2 gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <label key={day} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDays.includes(day)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDays([...selectedDays, day]);
                          } else {
                            setSelectedDays(selectedDays.filter(d => d !== day));
                          }
                          setFormData({...formData, dayOfWeek: selectedDays[0] as Schedule['dayOfWeek']});
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{day}</span>
                    </label>
                  ))}
                </div>
                {selectedDays.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Please select at least one day</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Start Time *</label>
              <input
                required
                type="time"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                value={formData.startTime}
                onChange={e => {
                  setFormData({...formData, startTime: e.target.value});
                  setAvailabilityMessage(null);
                }}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>End Time *</label>
              <input
                required
                type="time"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                value={formData.endTime}
                onChange={e => {
                  setFormData({...formData, endTime: e.target.value});
                  setAvailabilityMessage(null);
                }}
              />
            </div>
          </div>

          {!editingSchedule && formData.teacherId && selectedDays.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                setAvailabilityChecking(true);
                try {
                  let allAvailable = true;
                  const unavailableDays = [];

                  for (const day of selectedDays) {
                    try {
                      const response = await api.get<any>('/schedules/teacher-availability', {
                        teacherId: formData.teacherId,
                        dayOfWeek: day,
                        startTime: formData.startTime,
                        endTime: formData.endTime
                      });
                      
                      if (response && response.ok === false) {
                        allAvailable = false;
                        unavailableDays.push(day);
                      }
                    } catch (error) {
                      console.warn(`Could not check availability for ${day}:`, error);
                    }
                  }

                  if (allAvailable) {
                    setAvailabilityMessage({
                      text: `✅ Teacher is available on all ${selectedDays.length} selected day(s)`,
                      type: 'success'
                    });
                  } else {
                    setAvailabilityMessage({
                      text: `❌ Teacher is not available on: ${unavailableDays.join(', ')}`,
                      type: 'error'
                    });
                  }
                } catch (error) {
                  console.error('Error checking availability:', error);
                  setAvailabilityMessage({
                    text: '⚠️ Could not verify availability. You may proceed at your own risk.',
                    type: 'error'
                  });
                } finally {
                  setAvailabilityChecking(false);
                }
              }}
              disabled={availabilityChecking}
              className={`w-full px-4 py-2 border rounded-lg transition disabled:opacity-50 font-medium text-sm ${isDarkMode ? 'bg-purple-900 text-purple-300 border-purple-700 hover:bg-purple-800' : 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100'}`}
            >
              {availabilityChecking ? '🔍 Checking...' : '🔍 Check Teacher Availability'}
            </button>
          )}

          {availabilityMessage && (
            <div className={`p-3 rounded-lg text-sm border ${
              availabilityMessage.type === 'success'
                ? isDarkMode ? 'bg-green-900 text-green-300 border-green-700' : 'bg-green-50 text-green-800 border-green-300'
                : isDarkMode ? 'bg-red-900 text-red-300 border-red-700' : 'bg-red-50 text-red-800 border-red-300'
            }`}>
              {availabilityMessage.text}
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Room/Location</label>
            <input
              type="text"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              value={formData.room}
              onChange={e => setFormData({...formData, room: e.target.value})}
              placeholder="e.g., Room A1"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recurring"
              checked={formData.recurring}
              onChange={e => setFormData({...formData, recurring: e.target.checked})}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="recurring" className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Recurring weekly schedule
            </label>
          </div>

          <div className={`flex justify-end gap-3 mt-6 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingSchedule(null);
                setAvailabilityMessage(null);
              }}
              className={`px-4 py-2 rounded-lg transition ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Cancel
            </button>
            <button
              disabled={submitting || (!editingSchedule && selectedDays.length === 0)}
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
            >
              {submitting ? 'Saving...' : editingSchedule ? 'Update Schedule' : `Create ${selectedDays.length} Schedule${selectedDays.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Timetable;

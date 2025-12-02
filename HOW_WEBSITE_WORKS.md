# How Our Website Works - Simple Guide

## Overview
Our website is a **Coaching Center Management System** for Sneha Maths. It helps teachers manage students, homework, tests, fees, and attendance. Students can login to see their homework, tests, and attendance.

---

## 🏗️ Basic Structure

### Two Different Dashboards:
1. **Teacher/Admin Dashboard** - For teachers and administrators
2. **Student Dashboard** - For students to view their information

---

## 🔐 How Login Works

### Step 1: User Opens the Website
- Website shows a login page with email and password fields
- There's a nice information section showing what Sneha Maths offers

### Step 2: User Enters Email and Password
- Website sends this to the backend server
- Backend checks if the email and password are correct

### Step 3: Backend Responds
- If correct: Backend sends back user information (name, role, uid) and a sessionId
- The sessionId is like a "ticket" that proves you're logged in
- Website saves this ticket in browser's localStorage (like a small storage box)

### Step 4: Redirect Based on Role
- **If role = "student"** → Go to Student Dashboard (`/student/dashboard`)
- **If role = "teacher" or "admin"** → Go to Teacher Dashboard (`/dashboard`)

---

## 👨‍🏫 Teacher/Admin Dashboard

### What Teachers Can Do:

#### 1. **View Dashboard (Home Page)**
- Shows quick statistics:
  - Total number of students
  - Total number of teachers
  - Upcoming tests
  - Total batches
- Shows recent activity (who was added, what was updated)

#### 2. **Manage Students**
- **View all students** in a list with their:
  - Name, Email, Board (SSC/CBSE/ICSE), Standard (class)
  - Phone number, school name
- **Filter students** by board or standard
- **Add new student**:
  - Enter name, email, password, phone
  - Select board and standard
  - Add parent information
  - System creates a student account
- **Delete student** (only admin can do this)
- **Click on a student** to see full details

#### 3. **Manage Teachers**
- View all teachers
- Add new teachers with their subjects and experience
- Edit or deactivate teachers
- See each teacher's profile

#### 4. **Manage Batches**
- A "batch" is a group of students who study together
- Create new batches with:
  - Batch name, board, standard
  - Assign students to the batch
  - Assign teacher to the batch
  - Set timings
- View all batches
- Edit or delete batches

#### 5. **Assign Homework**
- **Create homework**:
  - Enter title and subject
  - Write description (what students need to do)
  - Set due date
  - Select which students should get this homework
- **Two ways to assign**:
  - **By Standard**: Automatically give to all students in a class
  - **Specific Students**: Choose individual students
- **View all homework** that was assigned
- **Edit or delete** homework

#### 6. **Manage Fees**
- Record fee payments from students
- See which students paid and which didn't
- View payment history
- Track pending fees

#### 7. **Mark Attendance**
- **Create attendance session**:
  - Select batch (group of students)
  - Select date and time
  - Enter subject and topic taught
- **Mark attendance**:
  - See list of all students in that batch
  - Mark each student as:
    - ✅ Present (green)
    - ❌ Absent (red)
    - ⏰ Late (yellow)
- **View past attendance** records
- **Edit attendance** if marked wrong

#### 8. **Create Tests**
- Add test details (name, subject, date/time)
- Select board and standard
- Set maximum marks
- Add test to system

#### 9. **Send Messages**
- Send announcements to students
- Students can view these in their dashboard

#### 10. **Upload Materials**
- Upload study materials (PDFs, notes)
- Students can download these

#### 11. **View Analytics**
- See charts and graphs
- Track student performance
- See attendance trends

---

## 👨‍🎓 Student Dashboard

### What Students Can Do:

#### 1. **View Dashboard (Home Page)**
- See quick overview:
  - How many homework assignments you have
  - Pending homework count
  - Your average test marks
  - Your attendance percentage
  - Number of unread messages
- Shows nice cards with icons and colors

#### 2. **View My Homework**
- See all homework assigned to you
- Each homework shows:
  - Title and description (what to do)
  - Subject name
  - Due date
  - Status (Active or Overdue in red)
- Homework turns red if you missed the due date
- Clean, card-based design

#### 3. **View Tests & Results**
- See all upcoming tests
- View test details:
  - Test name and subject
  - Date and time
  - Total marks
  - Board and standard
- (Future: View your test scores and results)

#### 4. **View My Attendance**
- See all your attendance records
- Shows:
  - Date of class
  - Subject taught
  - Topic covered
  - Your status (Present/Absent/Late)
  - Color coded: Green (present), Red (absent), Yellow (late)
- Calculate your attendance percentage

#### 5. **View My Fees**
- See all fee payments
- Check:
  - Payment amount
  - Payment date
  - Payment status (paid/pending)
  - Payment method
- View fee history

#### 6. **Read Messages**
- View announcements from teachers
- See important notifications
- Messages appear as cards with date and content

#### 7. **Download Materials**
- Access study materials uploaded by teachers
- Download notes, PDFs, and other files
- Organized by subject

#### 8. **View My Profile**
- See your personal information:
  - Name, email, phone
  - Board and standard
  - School name
  - Parent information
- Update basic details (in future)

---

## 🔄 How Data Flows (Technical but Simple)

### When Teacher Assigns Homework:

1. **Teacher fills form** → Enters title, subject, due date, selects students
2. **Frontend sends data** → Sends to backend server at `/homework` endpoint
3. **Backend saves** → Stores homework in database with student IDs
4. **Students see it** → When student opens their dashboard, frontend asks backend "show homework for this student ID"
5. **Backend filters** → Finds all homework where student ID is in the "assignTo" list
6. **Frontend displays** → Shows homework as cards on student's screen

### When Marking Attendance:

1. **Teacher creates session** → Selects batch, date, subject
2. **System shows student list** → Gets all students in that batch
3. **Teacher marks each student** → Present/Absent/Late
4. **Frontend sends all marks together** → One API call with all student statuses
5. **Backend saves each record** → Creates attendance record for each student
6. **Student can view** → Student sees their attendance when they check their dashboard

---

## 🎨 Navigation (Sidebar Menus)

### Teacher Sidebar (Blue Theme):
- 📊 Dashboard
- 👥 Students
- 👨‍🏫 Teachers
- 📚 Batches
- ✍️ Homework
- 💰 Fees
- 📝 Tests
- 📅 Attendance
- 💬 Messages
- 📄 Materials
- 📈 Analytics

### Student Sidebar (Green Theme):
- 📊 Dashboard
- 📖 My Homework
- 📝 Tests & Results
- 📅 Attendance
- 💰 Fees
- 💬 Messages
- 📄 Materials
- 👤 My Profile

---

## 🔒 Security Features

### Protected Routes:
- If you're not logged in → Redirected to login page
- Your sessionId is checked on every page
- If sessionId expires → Automatically logged out

### Role-Based Access:
- Students can only see their own data
- Teachers can see all students in their batches
- Admins can manage everything

---

## 💾 Data Storage

### In Browser (localStorage):
- Stores your sessionId (your login ticket)
- Stores basic user info (name, role, uid)
- Persists even if you close the browser

### In Backend (Firebase):
- All students, teachers, batches data
- All homework, tests, attendance records
- All fee payments and messages

---

## 🌐 API Communication

### How Frontend Talks to Backend:

#### Every Request Includes:
- Your sessionId in the header (proves who you are)
- The action you want (GET = read, POST = create, PUT = update, DELETE = delete)
- The data needed (example: homework details)

#### Common API Endpoints:

**For Students:**
- `GET /students` → Get all students
- `GET /students/{id}` → Get one student's details
- `POST /teachers/{teacherId}/students` → Add new student
- `DELETE /students/{id}` → Delete student

**For Homework:**
- `GET /homework` → Get all homework
- `POST /homework` → Create new homework
- `PUT /homework/{id}` → Update homework
- `DELETE /homework/{id}` → Delete homework

**For Attendance:**
- `GET /attendance/sessions` → Get all sessions
- `POST /attendance/sessions` → Create session
- `GET /attendance/sessions/{sessionId}` → Get attendance for a session
- `POST /attendance/bulk` → Mark attendance for multiple students

**For Login:**
- `POST /login` → Login with email/password

---

## 📱 Responsive Design

### Works on All Devices:
- **Desktop**: Full sidebar visible, large cards
- **Tablet**: Collapsible sidebar
- **Mobile**: Hamburger menu, stacked cards

### Sidebar Behavior:
- Desktop: Always visible, can collapse
- Mobile: Hidden by default, opens as overlay
- Has collapse/expand button

---

## 🎯 Key Features Summary

### For Teachers:
✅ One place to manage everything  
✅ Easy student management  
✅ Quick homework assignment  
✅ Fast attendance marking  
✅ Fee tracking  
✅ Real-time activity logs  

### For Students:
✅ See all homework in one place  
✅ Track your attendance  
✅ View test schedules  
✅ Check fee payments  
✅ Read teacher messages  
✅ Download study materials  

---

## 🔄 Update Flow (How Changes Appear)

### When Data Changes:
1. Teacher makes a change (example: assigns homework)
2. Frontend sends update to backend
3. Backend saves to database
4. Backend sends success response
5. Frontend updates the page (reloads data)
6. Change appears immediately on screen
7. Student refreshes → Sees the new homework

---

## 🎨 Color Coding

### Status Colors Used Throughout:
- 🟢 **Green** → Success, Present, Active
- 🔴 **Red** → Error, Absent, Overdue
- 🟡 **Yellow** → Warning, Late, Pending
- 🔵 **Blue** → Information, Teacher theme
- 🟢 **Light Green** → Student theme
- 🟣 **Purple** → Admin features

---

## 🚀 User Experience Flow

### First Time User (Student):
1. Receive email and password from admin
2. Open website → Login
3. Automatically directed to student dashboard
4. See welcome message and stats
5. Navigate using sidebar
6. View homework → See all assignments
7. Check attendance → See your records
8. Simple and clean!

### First Time User (Teacher):
1. Login with credentials
2. See teacher dashboard
3. Navigate to Students → See list
4. Add new student → Fill form
5. Create homework → Assign to students
6. Mark attendance → Select batch, mark students
7. Everything in one place!

---

## 🛠️ Technology Used (Simple Explanation)

### Frontend (What You See):
- **React** → Makes the website interactive
- **TypeScript** → Helps write better code
- **Tailwind CSS** → Makes it look beautiful
- **React Router** → Handles navigation between pages

### Backend (Behind the Scenes):
- **Firebase Functions** → Runs server code
- **Firestore** → Database that stores everything
- **Authentication** → Handles login security

### Communication:
- **REST API** → Frontend and backend talk using HTTP requests
- **JSON** → Data format (like a universal language for computers)

---

## 📊 Example User Journey

### Teacher Assigns Homework:
1. Click "Homework" in sidebar
2. Click "Add Homework" button
3. Fill in:
   - Title: "Algebra Practice"
   - Subject: "Mathematics"
   - Due Date: "15th December"
   - Description: "Complete exercises 1-10"
4. Select students (either by standard or specific)
5. Click "Assign"
6. Success! Homework appears in list

### Student Views Homework:
1. Login to student dashboard
2. See "2 Pending Homework" on dashboard
3. Click "My Homework" in sidebar
4. See list of all homework:
   - "Algebra Practice" - Due Dec 15 - Math
   - "Essay Writing" - Due Dec 20 - English
5. Click on any homework to read details
6. Complete and submit (feature in progress)

---

## 🎓 Key Points to Remember

1. **Two Separate Dashboards**: Students and Teachers have completely different views
2. **Everything is Connected**: When teacher assigns homework, students automatically see it
3. **Role-Based**: What you see depends on your role (student/teacher/admin)
4. **Real-Time Updates**: Changes appear immediately after saving
5. **Mobile Friendly**: Works perfectly on phones and tablets
6. **Secure**: Every action checks if you're allowed to do it
7. **Simple Navigation**: Clear sidebar with icons
8. **Color Coded**: Easy to understand status at a glance

---

## 🌟 Summary in One Paragraph

Our website is a complete coaching center management system where teachers can manage students, assign homework, mark attendance, record fees, and schedule tests - all from one place. Students get their own personalized dashboard where they can view their homework assignments, check attendance records, see test schedules, and track fee payments. The system automatically handles security (you must login), shows different content based on your role (student/teacher/admin), and keeps everything organized with a clean, colorful interface that works on any device!

---

**Created for Sneha Maths Coaching Center**  
*Making Education Management Simple!* 🎓✨

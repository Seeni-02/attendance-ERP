import React, { useState } from 'react';
import { Student } from '../types';
import { generateStudentId } from '../utils/helpers';

interface StudentRegistrationProps {
  className: string;
  existingStudents: Student[];
  onAddStudent: (student: Student) => void;
  onRemoveStudent: (studentId: string) => void;
  onSaveAndLock: (password: string) => void; // NOW ACCEPTS PASSWORD
  totalWorkingDays: number;
  onSwitchClass: () => void;
}

const StudentRegistration: React.FC<StudentRegistrationProps> = ({
  className,
  existingStudents,
  onAddStudent,
  onRemoveStudent,
  onSaveAndLock,
  totalWorkingDays,
  onSwitchClass
}) => {
  const [name, setName] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // NEW: Password states
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleAddStudent = () => {
    if (!name.trim()) { setError('Please enter student name'); return; }
    if (!registerNumber.trim()) { setError('Please enter register number'); return; }
    if (existingStudents.some(s => s.Register_Number === registerNumber.trim())) {
      setError('Register number already exists'); return;
    }
    if (!phone.trim() || phone.length < 10) {
      setError('Please enter valid 10-digit phone number'); return;
    }

    const newStudent: Student = {
      Student_ID: generateStudentId(className, existingStudents.length),
      Student_Name: name.trim(),
      Register_Number: registerNumber.trim(),
      Class: className,
      Parent_Phone: phone.trim(),
      Total_Days_Present: 0,
      Total_Days_Absent: 0,
      Leave_Days: 0,
      On_Duty_Days: 0,
      Zone: 'blue-star'
    };

    onAddStudent(newStudent);
    setName('');
    setRegisterNumber('');
    setPhone('');
    setError('');
  };

  const handleSave = () => {
    if (existingStudents.length === 0) {
      setError('Please add at least one student before saving');
      return;
    }
    // Show password setup instead of direct confirm
    setShowPasswordSetup(true);
    setPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handlePasswordSubmit = () => {
    if (!password) {
      setPasswordError('Please enter a password');
      return;
    }
    if (password.length < 4) {
      setPasswordError('Password must be at least 4 characters');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    // Move to final confirmation
    setShowPasswordSetup(false);
    setShowConfirm(true);
  };

  const confirmSave = () => {
    onSaveAndLock(password); // Pass password to parent
    setShowConfirm(false);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onSwitchClass}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to class selection"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Student Registration - {className}
              </h1>
              <p className="text-gray-500">Add students to your class. This data will be saved permanently.</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{existingStudents.length}</div>
            <div className="text-sm text-gray-500">Students Added</div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-700 text-sm">
            ⚠️ <strong>Important:</strong> You'll set a password before locking. This password will be needed
            to edit or remove students later.
          </p>
        </div>
      </div>

      {/* Add Student Form */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Student</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
            <input type="text" value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Enter full name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Register Number</label>
            <input type="text" value={registerNumber}
              onChange={(e) => { setRegisterNumber(e.target.value); setError(''); }}
              placeholder="e.g., 2024CS001"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone</label>
            <input type="tel" value={phone}
              onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
              placeholder="10-digit number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div className="flex items-end">
            <button onClick={handleAddStudent}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              + Add Student
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}
      </div>

      {/* Students List */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Students List</h2>
          <span className="text-sm text-gray-500">Total Working Days: {totalWorkingDays}</span>
        </div>

        {existingStudents.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-lg">No students added yet</p>
            <p className="text-sm">Add students using the form above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">#</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Student ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Register No.</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Parent Phone</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {existingStudents.map((student, index) => (
                  <tr key={student.Student_ID} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-600">{student.Student_ID}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{student.Student_Name}</td>
                    <td className="px-4 py-3 text-gray-600">{student.Register_Number}</td>
                    <td className="px-4 py-3 text-gray-600">{student.Parent_Phone}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => onRemoveStudent(student.Student_ID)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">Ready to save?</h3>
            <p className="text-sm text-gray-500">You'll set a password to protect student data</p>
          </div>
          <button onClick={handleSave}
            disabled={existingStudents.length === 0}
            className={`px-8 py-3 rounded-xl font-semibold transition-all ${
              existingStudents.length > 0
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}>
            🔐 Save & Lock Students
          </button>
        </div>
      </div>

      {/* ========== PASSWORD SETUP MODAL ========== */}
      {showPasswordSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔐</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Set Protection Password</h3>
              <p className="text-gray-500 text-sm mt-2">
                This password will be required to edit or remove students after locking.
                <br />
                <strong className="text-red-500">Remember this password!</strong>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                    placeholder="Enter password (min 4 characters)"
                    autoFocus
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500
                               focus:outline-none transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit(); }}
                  placeholder="Re-enter password"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500
                             focus:outline-none transition-colors"
                />
              </div>

              {/* Password strength indicator */}
              {password && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      password.length >= 8 ? 'w-full bg-green-500' :
                      password.length >= 6 ? 'w-2/3 bg-yellow-500' :
                      password.length >= 4 ? 'w-1/3 bg-orange-500' :
                      'w-1/6 bg-red-500'
                    }`}></div>
                  </div>
                  <span className={`text-xs font-medium ${
                    password.length >= 8 ? 'text-green-600' :
                    password.length >= 6 ? 'text-yellow-600' :
                    password.length >= 4 ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {password.length >= 8 ? 'Strong' :
                     password.length >= 6 ? 'Medium' :
                     password.length >= 4 ? 'Weak' : 'Too short'}
                  </span>
                </div>
              )}

              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
                  {passwordError}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowPasswordSetup(false); setPassword(''); setConfirmPassword(''); setPasswordError(''); }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                disabled={!password || !confirmPassword}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-all ${
                  password && confirmPassword
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-md'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Continue →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== FINAL CONFIRMATION MODAL ========== */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Confirm Save & Lock</h3>
              <p className="text-gray-600 mb-4">
                You are about to save <strong>{existingStudents.length} students</strong> for <strong>{className}</strong>.
              </p>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 mb-4">
                🔐 Password has been set. You'll need it to edit or remove students later.
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700 mb-6">
                ⚠️ Daily attendance can be marked without password. Password is only needed for
                editing/removing student data.
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowConfirm(false); setPassword(''); setConfirmPassword(''); }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={confirmSave}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold">
                  🔒 Yes, Save & Lock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentRegistration;
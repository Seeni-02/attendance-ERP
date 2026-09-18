import React, { useState } from 'react';
import { getTodayDate } from '../utils/helpers';

interface ClassSelectionProps {
  onSelectClass: (className: string, workingDays: number, date: string) => void;
  existingClasses: Record<string, boolean>;
  studentCounts: Record<string, number>;
  savedClassNames: string[];
  onAddNewClass: (className: string) => void;
  onDeleteClass: (className: string) => void;
}

const ClassSelection: React.FC<ClassSelectionProps> = ({
  onSelectClass,
  existingClasses,
  studentCounts,
  savedClassNames,
  onAddNewClass,
  onDeleteClass,
}) => {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(getTodayDate());
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [addClassError, setAddClassError] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleProceed = () => {
    if (!selectedClass) {
      setError('Please select a class');
      return;
    }

    onSelectClass(selectedClass, 0, currentDate);
  };

  const handleAddClass = () => {
    const trimmed = newClassName.trim().toUpperCase();

    if (!trimmed) {
      setAddClassError('Please enter a class name');
      return;
    }
    if (trimmed.length < 2) {
      setAddClassError('Class name must be at least 2 characters');
      return;
    }
    if (trimmed.length > 20) {
      setAddClassError('Class name must be 20 characters or less');
      return;
    }
    if (savedClassNames.includes(trimmed)) {
      setAddClassError(`Class "${trimmed}" already exists`);
      return;
    }

    onAddNewClass(trimmed);
    setNewClassName('');
    setAddClassError('');
    setShowAddClassModal(false);
    setSelectedClass(trimmed);
    setSearchQuery(trimmed);
    setIsDropdownOpen(false);
    onSelectClass(trimmed, 0, currentDate);
  };

  const handleDeleteClass = (className: string) => {
    onDeleteClass(className);
    if (selectedClass === className) {
      setSelectedClass(null);
    }
    setShowDeleteConfirm(null);
  };

  const filteredClasses = savedClassNames.filter(cls =>
    cls.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Attendance Management System</h1>
          <p className="text-gray-500 mt-2">Select your class or create a new one</p>
        </div>

        {/* Class Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Search & Select Class</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search class (e.g. 10th)"
              value={searchQuery}
              onFocus={() => setIsDropdownOpen(true)}
              onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedClass(null);
                setError('');
                setIsDropdownOpen(true);
              }}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
            />
            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {filteredClasses.length > 0 ? (
                  filteredClasses.map(cls => {
                    const classExists = existingClasses[cls];
                    const studentCount = studentCounts[cls] || 0;
                    return (
                      <div
                        key={cls}
                        onClick={() => {
                          setSelectedClass(cls);
                          setSearchQuery(cls);
                          setError('');
                          setIsDropdownOpen(false);
                        }}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-none flex justify-between items-center group"
                      >
                        <div>
                          <span className="font-semibold text-gray-800">{cls}</span>
                          <span className="text-xs text-gray-500 block">
                            {classExists ? `✅ ${studentCount} Students` : '📝 New Class'}
                          </span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(cls); setIsDropdownOpen(false); }}
                          className="text-red-400 hover:text-red-600 font-bold ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={`Delete ${cls}`}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-4 py-3 text-gray-500 text-sm">
                    No classes found. <span className="text-blue-600 font-semibold cursor-pointer" onMouseDown={() => { setShowAddClassModal(true); setNewClassName(searchQuery); }}>Create new?</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => { setShowAddClassModal(true); setAddClassError(''); setNewClassName(''); }}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              + Create New Class
            </button>
          </div>
        </div>

        {/* Date Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Today's Date</label>
          <input
            type="date"
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}

        {/* Proceed Button */}
        <button
          onClick={handleProceed}
          disabled={!selectedClass}
          className={`w-full py-4 rounded-xl font-semibold text-white transition-all duration-200 ${selectedClass
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
            : 'bg-gray-300 cursor-not-allowed'
            }`}
        >
          {selectedClass && existingClasses[selectedClass]
            ? `Continue to ${selectedClass} Attendance`
            : selectedClass
              ? `Setup ${selectedClass} Class`
              : 'Select a Class to Continue'}
        </button>

        {/* Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">📋 How it works:</h3>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>1. Create your classes using "+ Create New Class"</li>
            <li>2. Search and select a class to mark attendance</li>
            <li>3. Add students (saved permanently)</li>
            <li>4. Mark daily attendance</li>
            <li>5. Zones update automatically</li>
          </ul>
        </div>
      </div>

      {/* ADD CLASS MODAL */}
      {showAddClassModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Create New Class</h2>
              <p className="text-gray-500 text-sm mt-1">Enter the class name below</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Class Name</label>
              <input
                type="text"
                value={newClassName}
                onChange={(e) => { setNewClassName(e.target.value); setAddClassError(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddClass();
                  if (e.key === 'Escape') setShowAddClassModal(false);
                }}
                placeholder="e.g., CS-A, ECE-1, MECH-2A"
                maxLength={20}
                autoFocus
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500
                           focus:outline-none transition-colors text-center text-lg font-semibold uppercase"
              />
              <p className="text-xs text-gray-400 mt-1 text-center">{newClassName.trim().length}/20 characters</p>
            </div>

            {addClassError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
                {addClassError}
              </div>
            )}

            {newClassName.trim() && !addClassError && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center">
                Class "<strong>{newClassName.trim().toUpperCase()}</strong>" will be created
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowAddClassModal(false); setNewClassName(''); setAddClassError(''); }}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddClass}
                disabled={!newClassName.trim()}
                className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all duration-200 ${newClassName.trim()
                  ? 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 shadow-md'
                  : 'bg-gray-300 cursor-not-allowed'
                  }`}
              >
                Create Class
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Delete Class</h2>
              <p className="text-gray-500 text-sm mt-2">
                Are you sure you want to delete <strong className="text-red-600">{showDeleteConfirm}</strong>?
                <br /><span className="text-red-500 font-medium">All student data will be lost!</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDeleteClass(showDeleteConfirm)}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-md">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassSelection;
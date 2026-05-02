import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, Search, Copy, UserPlus, Eye, X } from 'lucide-react';

export default function AdmissionsManager({ db, setDb, showToast, showConfirm, currentUser, axios }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending'); // pending, approved, rejected, all
  const [selectedApp, setSelectedApp] = useState(null);

  const applications = db.admission_applications || [];
  
  const filteredApps = applications.filter(app => {
    const matchesSearch = app.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          app.phone.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = (app) => {
    showConfirm('Approve Admission', `Are you sure you want to approve admission for ${app.studentName}? This will create a new student account.`, async () => {
      const newStudentId = 's' + Date.now();
      const newStudent = {
        id: newStudentId,
        role: 'student',
        name: app.studentName,
        className: app.appliedClass,
        father_name: app.fatherName,
        mother_name: app.motherName,
        phone: app.phone,
        dob: app.dob,
        address: app.address,
        biometric_enrolled: 0,
        rollNo: 'TBD',
        key: 'stu123' // Default password for new students
      };

      try {
        await axios.post('/api/users', newStudent);
        await axios.put(`/api/admissions/${app.id}`, { status: 'approved', message: 'Approved and enrolled successfully.' });
        
        setDb(prev => ({
          ...prev,
          users: [...(prev.users || []), newStudent],
          admission_applications: prev.admission_applications.map(a => 
            a.id === app.id ? { ...a, status: 'approved', message: 'Approved and enrolled successfully.' } : a
          )
        }));
        showToast(`Admission approved. Student ID: ${newStudentId}`, 'success');
      } catch (err) {
        console.error("Failed to approve admission", err);
        showToast('Failed to approve admission', 'error');
      }
    });
  };

  const handleReject = async (app) => {
    const reason = window.prompt("Enter reason for rejection:");
    if (reason !== null) {
      try {
        await axios.put(`/api/admissions/${app.id}`, { status: 'rejected', message: reason || 'Rejected by administration.' });
        setDb(prev => ({
          ...prev,
          admission_applications: prev.admission_applications.map(a => 
            a.id === app.id ? { ...a, status: 'rejected', message: reason || 'Rejected by administration.' } : a
          )
        }));
        showToast('Admission rejected.', 'info');
      } catch (err) {
        console.error("Failed to reject admission", err);
        showToast('Failed to reject admission', 'error');
      }
    }
  };

  const copyAdmissionLink = () => {
    const link = `${window.location.origin}/enroll`;
    navigator.clipboard.writeText(link);
    showToast('Admission link copied to clipboard!', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Admissions Management</h2>
          <p className="text-slate-500">Review and process new student enrollments.</p>
        </div>
        <button onClick={copyAdmissionLink} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-800 transition-colors">
          <Copy size={18} /> Copy Admission Link
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by name or phone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {['pending', 'approved', 'rejected', 'all'].map(status => (
            <button 
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl font-bold capitalize whitespace-nowrap ${filterStatus === status ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-slate-100 text-slate-600 border-transparent'} border transition-colors`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredApps.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <UserPlus size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No applications found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                  <th className="p-4 font-bold">Student Details</th>
                  <th className="p-4 font-bold">Class</th>
                  <th className="p-4 font-bold">Contact</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApps.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{app.studentName}</div>
                      <div className="text-sm text-slate-500">DOB: {app.dob}</div>
                      <div className="text-xs text-slate-400 mt-1">Parents: {app.fatherName} & {app.motherName}</div>
                    </td>
                    <td className="p-4 font-bold text-slate-700">{app.appliedClass}</td>
                    <td className="p-4">
                      <div className="text-sm text-slate-800">{app.phone}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[150px]" title={app.address}>{app.address}</div>
                    </td>
                    <td className="p-4">
                      {app.status === 'pending' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700"><Clock size={12}/> Pending</span>}
                      {app.status === 'approved' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700"><CheckCircle size={12}/> Approved</span>}
                      {app.status === 'rejected' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700"><XCircle size={12}/> Rejected</span>}
                      {app.message && <div className="text-xs text-slate-500 mt-1 max-w-[150px] truncate" title={app.message}>{app.message}</div>}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setSelectedApp(app)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="View Details">
                          <Eye size={18} />
                        </button>
                        {app.status === 'pending' && (
                          <>
                            <button onClick={() => handleApprove(app)} className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors" title="Approve">
                              <CheckCircle size={18} />
                            </button>
                            <button onClick={() => handleReject(app)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="Reject">
                              <XCircle size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">Application Details</h3>
              <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Personal Information</h4>
                  <div className="space-y-3">
                    <div><span className="text-slate-500 text-sm">Student Name:</span> <div className="font-bold text-slate-800">{selectedApp.studentName}</div></div>
                    <div><span className="text-slate-500 text-sm">Date of Birth:</span> <div className="font-bold text-slate-800">{selectedApp.dob}</div></div>
                    <div><span className="text-slate-500 text-sm">Gender:</span> <div className="font-bold text-slate-800">{selectedApp.gender || 'N/A'}</div></div>
                    <div><span className="text-slate-500 text-sm">Blood Group:</span> <div className="font-bold text-slate-800">{selectedApp.bloodGroup || 'N/A'}</div></div>
                    <div><span className="text-slate-500 text-sm">Aadhaar Number:</span> <div className="font-bold text-slate-800">{selectedApp.aadhaarNumber || 'N/A'}</div></div>
                    <div><span className="text-slate-500 text-sm">Category:</span> <div className="font-bold text-slate-800">{selectedApp.category || 'N/A'}</div></div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Academic Information</h4>
                  <div className="space-y-3">
                    <div><span className="text-slate-500 text-sm">Class Applied For:</span> <div className="font-bold text-slate-800">{selectedApp.appliedClass}</div></div>
                    <div><span className="text-slate-500 text-sm">Previous School:</span> <div className="font-bold text-slate-800">{selectedApp.previousSchool || 'N/A'}</div></div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Parent/Guardian Details</h4>
                  <div className="space-y-3">
                    <div><span className="text-slate-500 text-sm">Father's Name:</span> <div className="font-bold text-slate-800">{selectedApp.fatherName}</div></div>
                    <div><span className="text-slate-500 text-sm">Mother's Name:</span> <div className="font-bold text-slate-800">{selectedApp.motherName}</div></div>
                    <div><span className="text-slate-500 text-sm">Annual Income:</span> <div className="font-bold text-slate-800">{selectedApp.annualIncome || 'N/A'}</div></div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Contact Information</h4>
                  <div className="space-y-3">
                    <div><span className="text-slate-500 text-sm">Phone Number:</span> <div className="font-bold text-slate-800">{selectedApp.phone}</div></div>
                    <div><span className="text-slate-500 text-sm">Emergency Contact:</span> <div className="font-bold text-slate-800">{selectedApp.emergencyContact || 'N/A'}</div></div>
                    <div><span className="text-slate-500 text-sm">Address:</span> <div className="font-bold text-slate-800">{selectedApp.address}</div></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setSelectedApp(null)} className="px-6 py-2 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                Close
              </button>
              {selectedApp.status === 'pending' && (
                <>
                  <button onClick={() => { setSelectedApp(null); handleReject(selectedApp); }} className="px-6 py-2 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                    Reject
                  </button>
                  <button onClick={() => { setSelectedApp(null); handleApprove(selectedApp); }} className="px-6 py-2 rounded-xl font-bold text-white bg-green-500 hover:bg-green-600 transition-colors shadow-md">
                    Approve Admission
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { ChevronLeft, Send, CheckCircle } from 'lucide-react';

export default function AdmissionForm({ onSubmit, onBack }) {
  const [formData, setFormData] = useState({
    studentName: '',
    fatherName: '',
    motherName: '',
    dob: '',
    gender: '',
    bloodGroup: '',
    aadhaarNumber: '',
    category: '',
    appliedClass: '',
    phone: '',
    emergencyContact: '',
    annualIncome: '',
    address: '',
    previousSchool: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(formData);
      setSubmitted(true);
    } catch (err) {
      setError('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md border border-slate-200">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-slate-800 mb-4">Application Submitted!</h2>
          <p className="text-slate-600 mb-8">Your admission form has been successfully sent to the administration. We will review it and get back to you shortly.</p>
          <button onClick={onBack} className="bg-slate-900 text-white px-8 py-3 rounded-full font-bold hover:bg-slate-800 transition-all">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12">
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center shadow-md sticky top-0 z-50">
        <button onClick={onBack} className="flex items-center gap-2 hover:text-orange-400 transition-colors font-medium">
          <ChevronLeft size={20} /> Back
        </button>
        <h1 className="text-xl font-bold ml-6">Admission Form 2026-27</h1>
      </header>

      <main className="max-w-3xl mx-auto mt-12 px-4">
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-lg border border-slate-200">
          <h2 className="text-3xl font-black mb-2 text-slate-900 text-center">Enroll Now</h2>
          <p className="text-slate-500 text-center mb-8">Fill out the details below to apply for admission at Vaidik Dharm Inter College.</p>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Details */}
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Student's Full Name *</label>
                  <input required type="text" name="studentName" value={formData.studentName} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Enter student's name" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Date of Birth *</label>
                  <input required type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Gender *</label>
                  <select required name="gender" value={formData.gender} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Blood Group</label>
                  <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none">
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Aadhaar Number</label>
                  <input type="text" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="12-digit Aadhaar number" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Category *</label>
                  <select required name="category" value={formData.category} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none">
                    <option value="">Select Category</option>
                    <option value="General">General</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Academic Details */}
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Academic Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Class Applied For *</label>
                  <select required name="appliedClass" value={formData.appliedClass} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none">
                    <option value="">Select Class</option>
                    <option value="6th">6th</option>
                    <option value="7th">7th</option>
                    <option value="8th">8th</option>
                    <option value="9th">9th</option>
                    <option value="10th">10th</option>
                    <option value="11th">11th</option>
                    <option value="12th">12th</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Previous School (if any)</label>
                  <input type="text" name="previousSchool" value={formData.previousSchool} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Name of previous school attended" />
                </div>
              </div>
            </div>

            {/* Parent/Guardian Details */}
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Parent/Guardian Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Father's Name *</label>
                  <input required type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Enter father's name" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Mother's Name *</label>
                  <input required type="text" name="motherName" value={formData.motherName} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Enter mother's name" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Annual Family Income</label>
                  <select name="annualIncome" value={formData.annualIncome} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none">
                    <option value="">Select Income Range</option>
                    <option value="Below 1 Lakh">Below 1 Lakh</option>
                    <option value="1 Lakh - 3 Lakhs">1 Lakh - 3 Lakhs</option>
                    <option value="3 Lakhs - 5 Lakhs">3 Lakhs - 5 Lakhs</option>
                    <option value="Above 5 Lakhs">Above 5 Lakhs</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Contact Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number *</label>
                  <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="10-digit mobile number" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Emergency Contact Number *</label>
                  <input required type="tel" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Alternate mobile number" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Residential Address *</label>
                  <textarea required name="address" value={formData.address} onChange={handleChange} rows="3" className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Enter full address"></textarea>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-bold">{error}</div>}
              <button disabled={isSubmitting} type="submit" className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70">
                {isSubmitting ? 'Submitting...' : (
                  <>
                    <Send size={20} /> Submit Application
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

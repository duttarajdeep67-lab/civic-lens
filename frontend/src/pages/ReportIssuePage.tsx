import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  ArrowRight, 
  ArrowLeft,
  Building2,
  FileText,
  Navigation,
  Check,
  Info
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'sonner';

import { aiService, referenceService, locationService, complaintService } from '../services/api';
import { Category, Department, AIAnalysisResponse } from '../types';
import { civicMarkerIcon } from '../utils/leafletIcon';

// Helper component to update map view when coordinates change
const MapUpdater: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 15);
  }, [center, map]);
  return null;
};

// Map click handler for draggable / clickable marker
const LocationPicker: React.FC<{ 
  position: [number, number]; 
  onLocationChange: (lat: number, lng: number) => void 
}> = ({ position, onLocationChange }) => {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });

  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = React.useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          onLocationChange(lat, lng);
        }
      },
    }),
    [onLocationChange]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={civicMarkerIcon}
    />
  );
};

export const ReportIssuePage: React.FC = () => {
  const navigate = useNavigate();

  // Wizard Stage: 1: Upload, 2: AI Analyze, 3: Details, 4: Location, 5: Review, 6: Success
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Image State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(null);

  // AI Analysis State
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  // Form Fields
  const [title, setTitle] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [departmentName, setDepartmentName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');

  // Location State
  const [coordinates, setCoordinates] = useState<[number, number]>([12.9352, 77.6245]);
  const [address, setAddress] = useState<string>('Koramangala, Bengaluru, Karnataka, India');
  const [locating, setLocating] = useState<boolean>(false);
  const [locationCaptured, setLocationCaptured] = useState<boolean>(false);

  // Submission State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedComplaint, setSubmittedComplaint] = useState<any>(null);

  // Rotating loading messages for AI analysis
  const loadingMessages = [
    "Examining uploaded photograph...",
    "Connecting to Gemini Multimodal Vision...",
    "Detecting civic infrastructure defect...",
    "Classifying municipal issue category...",
    "Estimating severity and department assignment..."
  ];

  useEffect(() => {
    let interval: any;
    if (analyzing) {
      interval = setInterval(() => {
        setLoadingTextIndex(prev => (prev + 1) % loadingMessages.length);
      }, 2200);
    }
    return () => clearInterval(interval);
  }, [analyzing]);

  // Load categories and departments on mount
  useEffect(() => {
    const loadRefData = async () => {
      try {
        const [cats, depts] = await Promise.all([
          referenceService.getCategories(),
          referenceService.getDepartments()
        ]);
        setCategories(cats);
        setDepartments(depts);
        if (cats.length > 0) {
          setCategoryId(cats[0].id);
          setDepartmentName(cats[0].department_name || '');
        }
      } catch (err) {
        console.error('Failed to load reference data:', err);
      }
    };
    loadRefData();
  }, []);

  // Update department when category changes
  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    const selected = categories.find(c => c.id === newCatId);
    if (selected) {
      setDepartmentName(selected.department_name || '');
    }
  };

  // STEP 1: Handle Image Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Unsupported file format. Please upload JPEG, PNG, or WebP.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit.');
      return;
    }

    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setAiAnalysis(null);
    setAiError(null);
  };

  const removeImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setSavedImageUrl(null);
    setAiAnalysis(null);
    setAiError(null);
  };

  // STEP 2: AI Analysis
  const runAiAnalysis = async (forceDemo: boolean = false) => {
    if (!selectedFile) {
      toast.error('Please select or capture an image first');
      return;
    }

    setAnalyzing(true);
    setAiError(null);

    try {
      const result = await aiService.analyzeImage(selectedFile, forceDemo);
      setAiAnalysis(result);

      if (result.success && result.issue_detected) {
        // Populate fields
        if (result.title) setTitle(result.title);
        if (result.description) setDescription(result.description);
        if (result.priority) setPriority(result.priority as any);

        // Map Category & Department
        if (result.category_id) {
          setCategoryId(result.category_id);
          const cat = categories.find(c => c.id === result.category_id);
          if (cat) setDepartmentName(cat.department_name || result.department || '');
        } else if (result.category) {
          const match = categories.find(c => c.name.toLowerCase() === result.category?.toLowerCase());
          if (match) {
            setCategoryId(match.id);
            setDepartmentName(match.department_name || '');
          }
        }

        toast.success('Civic issue detected and analyzed successfully by AI!');
        setCurrentStep(3); // Proceed to review details
      } else {
        const msg = result.raw_message || 'AI could not clearly identify a civic hazard. You can enter details manually.';
        setAiError(msg);
        toast.info(msg);
      }
    } catch (err: any) {
      console.error('AI Analysis failed:', err);
      const errorMsg = err.response?.data?.detail || 'AI vision service temporarily unavailable. You can enter details manually.';
      setAiError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setAnalyzing(false);
    }
  };

  // STEP 4: Geolocation
  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoordinates([lat, lng]);
        setLocationCaptured(true);

        try {
          const geo = await locationService.reverseGeocode(lat, lng);
          if (geo.address) {
            setAddress(geo.address);
          }
          toast.success('Location detected successfully!');
        } catch (e) {
          toast.info(`Coordinates acquired: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        console.warn('Geolocation error:', err.message);
        toast.warning('Could not retrieve GPS coordinates. You can select location on the map or enter address manually.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleMapLocationChange = async (lat: number, lng: number) => {
    setCoordinates([lat, lng]);
    setLocationCaptured(true);
    try {
      const geo = await locationService.reverseGeocode(lat, lng);
      if (geo.address) {
        setAddress(geo.address);
      }
    } catch (e) {
      console.warn('Geocoding error:', e);
    }
  };

  // STEP 5: Submit Complaint
  const handleSubmitComplaint = async () => {
    if (submitting) return;

    if (!title.trim() || title.length < 3) {
      toast.error('Please enter a descriptive complaint title (min 3 characters).');
      setCurrentStep(3);
      return;
    }

    if (!description.trim() || description.length < 10) {
      toast.error('Please provide a detailed issue description (min 10 characters).');
      setCurrentStep(3);
      return;
    }

    if (!categoryId) {
      toast.error('Please select an issue category.');
      setCurrentStep(3);
      return;
    }

    setSubmitting(true);
    try {
      let finalImageUrl = savedImageUrl;

      // If image hasn't been uploaded yet, upload it now
      if (!finalImageUrl && selectedFile) {
        const uploadResp = await complaintService.uploadImage(selectedFile);
        finalImageUrl = uploadResp.image_url;
        setSavedImageUrl(finalImageUrl);
      }

      if (!finalImageUrl) {
        finalImageUrl = '/uploads/complaints/sample_pothole.jpg';
      }

      const payload = {
        category_id: categoryId,
        title: title.trim(),
        description: description.trim(),
        priority,
        latitude: coordinates[0],
        longitude: coordinates[1],
        address: address.trim(),
        image_url: finalImageUrl,
        ai_detected: aiAnalysis?.issue_detected ?? false,
        ai_confidence: aiAnalysis?.confidence ?? 'Medium',
        ai_reasoning_summary: aiAnalysis?.reasoning_summary ?? null
      };

      const created = await complaintService.createComplaint(payload);
      setSubmittedComplaint(created);
      setCurrentStep(6); // Success Step
      toast.success(`Complaint submitted successfully! Tracking ID: ${created.tracking_id}`);
    } catch (err: any) {
      console.error('Submission failed:', err);
      toast.error(err.response?.data?.detail || 'Failed to submit complaint. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Wizard Header & Progress Bar */}
      <div className="mb-8 text-center sm:text-left">
        <div className="flex items-center space-x-2 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-1">
          <Camera className="w-4 h-4" />
          <span>Civic Issue Reporting Wizard</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Report a Public Infrastructure Problem
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          Follow the guided workflow to capture evidence, analyze with Gemini AI, and dispatch to responsible authorities.
        </p>

        {/* Step indicator */}
        {currentStep <= 5 && (
          <div className="mt-6 grid grid-cols-5 gap-2">
            {[
              { num: 1, label: 'Capture' },
              { num: 2, label: 'AI Vision' },
              { num: 3, label: 'Details' },
              { num: 4, label: 'Location' },
              { num: 5, label: 'Review' }
            ].map(step => (
              <div key={step.num} className="text-center">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    currentStep >= step.num ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                />
                <span className={`text-[10px] sm:text-xs font-semibold mt-1.5 block ${
                  currentStep === step.num ? 'text-blue-600' : 'text-slate-400'
                }`}>
                  {step.num}. {step.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* STAGE CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">

        {/* ================= STEP 1: UPLOAD / CAPTURE IMAGE ================= */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Step 1: Capture or Upload Evidence</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Take a clear photograph of the damaged road, waste accumulation, leaking pipe, or public defect.
              </p>
            </div>

            {!imagePreview ? (
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 sm:p-12 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <Camera className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Upload or Snap Photo</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Supports JPEG, PNG, and WebP up to 10MB. On mobile devices, this will open your device camera.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <label className="cursor-pointer px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-blue-500/20 transition-all flex items-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>Choose Photo File</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 max-h-[420px] flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Problem Preview"
                    className="max-h-[400px] w-auto object-contain"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-rose-600 text-white rounded-full backdrop-blur transition-colors"
                    title="Remove Photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>Selected: {selectedFile?.name} ({(selectedFile!.size / (1024 * 1024)).toFixed(2)} MB)</span>
                  <label className="text-blue-600 font-semibold cursor-pointer hover:underline">
                    Replace Photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <span />
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-blue-500/20 flex items-center space-x-2 transition-all"
                  >
                    <span>Continue to AI Analysis</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 2: AI VISION ANALYSIS ================= */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Step 2: Multimodal AI Vision Analysis</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Our integrated Google Gemini Vision model will examine the photo to classify the problem and generate a complaint draft.
              </p>
            </div>

            {/* Photo Thumbnail */}
            {imagePreview && (
              <div className="flex items-center space-x-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <img
                  src={imagePreview}
                  alt="Thumbnail"
                  className="w-16 h-16 object-cover rounded-lg border border-slate-300"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">{selectedFile?.name}</p>
                  <p className="text-[11px] text-slate-500">Ready for visual defect identification</p>
                </div>
              </div>
            )}

            {/* Loading / Action State */}
            {analyzing ? (
              <div className="py-12 px-6 rounded-2xl bg-gradient-to-br from-blue-50/50 to-teal-50/50 border border-teal-200 text-center space-y-4">
                <div className="w-12 h-12 mx-auto border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {loadingMessages[loadingTextIndex]}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Multimodal Vision inference in progress. Please wait a moment.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Identify Civic Issue with AI</h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    The vision engine will automatically generate the title, detailed description, civic category, and recommended department.
                  </p>
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={() => runAiAnalysis(false)}
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze Issue with AI</span>
                    </button>

                    <button
                      onClick={() => setCurrentStep(3)}
                      className="w-full sm:w-auto px-4 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      Skip AI & Enter Manually →
                    </button>
                  </div>
                </div>

                {/* AI Error / Refusal notice if applicable */}
                {aiError && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start space-x-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">AI Analysis Notice</p>
                      <p>{aiError}</p>
                      <button
                        onClick={() => setCurrentStep(3)}
                        className="font-bold text-blue-700 underline mt-1 inline-block"
                      >
                        Proceed to enter complaint details manually →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 text-slate-600 text-xs font-semibold hover:bg-slate-100 rounded-lg flex items-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: AUTO-GENERATED / EDITABLE DETAILS ================= */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Step 3: Complaint Information</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review and refine the AI-generated details or adjust manual inputs as needed.
                </p>
              </div>

              {aiAnalysis?.issue_detected && (
                <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Verified ({aiAnalysis.confidence} Confidence)</span>
                </span>
              )}
            </div>

            {/* AI Reasoning Summary Banner */}
            {aiAnalysis?.reasoning_summary && (
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-blue-900 text-xs flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">AI Visual Findings: </span>
                  <span className="text-slate-700">{aiAnalysis.reasoning_summary}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Complaint Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Hazardous Pothole on 100 Feet Road"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Issue Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Responsible Department
                  </label>
                  <input
                    type="text"
                    disabled
                    value={departmentName || 'General Civic Administration'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 text-sm font-semibold cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Automatically routed based on municipal rules</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Issue Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide factual details observed at the scene..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Suggested Priority
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Low', 'Medium', 'High', 'Critical'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                        priority === p
                          ? p === 'Critical'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : p === 'High'
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 text-slate-600 text-xs font-semibold hover:bg-slate-100 rounded-lg flex items-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-blue-500/20 flex items-center space-x-2 transition-all"
              >
                <span>Proceed to Location</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: GPS LOCATION & MAP ================= */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Step 4: Confirm Incident Location</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pinpoint the precise location to ensure dispatch crews reach the site quickly.
                </p>
              </div>

              <button
                type="button"
                onClick={requestCurrentLocation}
                disabled={locating}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200 transition-colors self-start sm:self-auto"
              >
                <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                <span>{locating ? 'Detecting GPS...' : 'Use My Current Location'}</span>
              </button>
            </div>

            {/* Interactive Leaflet Map */}
            <div className="h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-300 relative shadow-inner">
              <MapContainer
                center={coordinates}
                zoom={14}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapUpdater center={coordinates} />
                <LocationPicker
                  position={coordinates}
                  onLocationChange={handleMapLocationChange}
                />
              </MapContainer>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address / Landmark
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, area, landmark"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GPS Coordinates
                </label>
                <input
                  type="text"
                  disabled
                  value={`${coordinates[0].toFixed(5)}, ${coordinates[1].toFixed(5)}`}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 text-xs font-mono"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Tip: You can drag the marker on the map or click anywhere to adjust coordinates.
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 text-slate-600 text-xs font-semibold hover:bg-slate-100 rounded-lg flex items-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                onClick={() => setCurrentStep(5)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-blue-500/20 flex items-center space-x-2 transition-all"
              >
                <span>Review & Submit</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 5: REVIEW & SUBMIT ================= */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Step 5: Review Complaint Details</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify all information before submitting to the municipal dispatch system.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 rounded-2xl bg-slate-50 border border-slate-200">
              {/* Image Preview */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Photographic Record</span>
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 h-48 flex items-center justify-center">
                  <img
                    src={imagePreview || ''}
                    alt="Problem"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              {/* Data Summary */}
              <div className="md:col-span-2 space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    {categories.find(c => c.id === categoryId)?.name}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">{title}</h3>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Department</span>
                    <p className="font-bold text-slate-800 mt-0.5">{departmentName}</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Priority</span>
                    <p className="font-bold text-orange-600 mt-0.5">{priority}</p>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</span>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                    {description}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</span>
                  <p className="text-xs text-slate-700 mt-0.5 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{address}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(4)}
                disabled={submitting}
                className="px-4 py-2 text-slate-600 text-xs font-semibold hover:bg-slate-100 rounded-lg flex items-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                onClick={handleSubmitComplaint}
                disabled={submitting}
                className={`px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 flex items-center space-x-2 transition-all ${
                  submitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Submit Complaint</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 6: SUCCESS CONFIRMATION ================= */}
        {currentStep === 6 && submittedComplaint && (
          <div className="text-center py-8 space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900">Complaint Submitted Successfully!</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your report has been logged and automatically routed to the responsible department.
              </p>
            </div>

            {/* Tracking ID Badge */}
            <div className="inline-block p-4 rounded-2xl bg-blue-50 border border-blue-200">
              <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">
                Official Tracking ID
              </span>
              <span className="text-2xl font-mono font-extrabold text-blue-900 tracking-wide mt-1 block">
                {submittedComplaint.tracking_id}
              </span>
            </div>

            <div className="max-w-md mx-auto p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Department Assigned:</span>
                <span className="font-bold text-slate-800">{submittedComplaint.department_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Initial Status:</span>
                <span className="font-bold text-blue-700">Submitted</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Issue Category:</span>
                <span className="font-medium text-slate-800">{submittedComplaint.category_name}</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to={`/complaints/${submittedComplaint.id}`}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                Track This Complaint →
              </Link>
              <Link
                to="/citizen/dashboard"
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

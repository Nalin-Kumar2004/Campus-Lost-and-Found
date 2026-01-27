/**
 * POST ITEM PAGE - Progressive Multi-Step Form
 * 
 * MODERN UX FEATURES:
 * - 4-step wizard with progress indicator
 * - Live preview card (desktop)
 * - Step-by-step validation
 * - Save progress to localStorage
 * - Smooth animations
 * - Mobile-optimized
 * 
 * STEPS:
 * 1. Item Type & Category
 * 2. Basic Details
 * 3. Images Upload
 * 4. Review & Submit
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import itemsService from '../services/items.service';
import type { CreateItemData, ItemCategory } from '../services/items.service';
import type { ApiError } from '../types';
import { useToast } from '../contexts/ToastContext';
import { 
  ArrowLeft, 
  Upload, 
  X, 
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Calendar as CalendarIcon,
  MapPin,
  FileText,
  Image as ImageIcon,
  Eye,
  Search,
  CheckSquare,
  Wallet,
  Smartphone,
  Key,
  FileCheck,
  Shirt,
  ShoppingBag,
  BookOpen,
  Dumbbell,
  Package
} from 'lucide-react';
import { ButtonSpinner } from '../components/Spinner';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

/**
 * ZOD VALIDATION SCHEMA - Step-based validation
 */
const postItemSchema = z.object({
  type: z.enum(['LOST', 'FOUND'], {
    message: 'Please select item type',
  }),
  
  category: z.string()
    .min(1, 'Please select a category'),
  
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be less than 100 characters'),
  
  description: z.string()
    .min(20, 'Description must be at least 20 characters')
    .max(1000, 'Description must be less than 1000 characters'),
  
  location: z.string()
    .min(3, 'Location must be at least 3 characters')
    .max(200, 'Location must be less than 200 characters'),
  
  itemDate: z.string()
    .min(1, 'Please select the date'),
  
  currentLocation: z.string()
    .max(200, 'Current location must be less than 200 characters')
    .optional(),
  
  verificationQuestion: z.string()
    .max(200, 'Question must be less than 200 characters')
    .optional(),
  
  verificationAnswer: z.string()
    .max(200, 'Answer must be less than 200 characters')
    .optional(),
});

type PostItemFormData = z.infer<typeof postItemSchema>;

interface FilePreview {
  file: File;
  preview: string;
}

// Step configuration
const STEPS = [
  { number: 1, title: 'Type & Category', icon: FileText },
  { number: 2, title: 'Details', icon: MapPin },
  { number: 3, title: 'Images', icon: ImageIcon },
  { number: 4, title: 'Review', icon: Eye },
];

export default function PostItem() {
  const navigate = useNavigate();
  const toast = useToast();
  
  // Current step state
  const [currentStep, setCurrentStep] = useState(1);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    trigger,
    setValue,
  } = useForm<PostItemFormData>({
    resolver: zodResolver(postItemSchema),
    defaultValues: {
      type: 'LOST',
      category: '',
      verificationQuestion: '',
      verificationAnswer: '',
      currentLocation: '',
    },
  });

  const itemType = watch('type');
  const verificationQuestion = watch('verificationQuestion');
  
  // Watch all fields for preview
  const watchedFields = watch();

  const [images, setImages] = useState<FilePreview[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');



  // Validate and move to next step
  const handleNext = async () => {
    let fieldsToValidate: (keyof PostItemFormData)[] = [];
    
    // Step 1: Type & Category
    if (currentStep === 1) {
      fieldsToValidate = ['type', 'category'];
    }
    // Step 2: Details
    else if (currentStep === 2) {
      fieldsToValidate = ['title', 'description', 'location', 'itemDate'];
    }
    
    const isValid = await trigger(fieldsToValidate);
    
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploadError('');

    if (images.length + files.length > 5) {
      setUploadError('Maximum 5 images allowed');
      return;
    }

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setUploadError('Only image files are allowed');
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setUploadError('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => [
          ...prev,
          {
            file,
            preview: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: PostItemFormData) => {
    try {
      const base64Images: string[] = [];
      
      for (const image of images) {
        const base64 = await fileToBase64(image.file);
        base64Images.push(base64);
      }

      const payload: CreateItemData = {
        title: data.title,
        description: data.description,
        type: data.type,
        category: data.category as ItemCategory,
        location: data.location,
        itemDate: data.itemDate,
        contactInfo: data.currentLocation || undefined,
        images: base64Images.length > 0 ? base64Images : undefined,
      };

      const response = await itemsService.createItem(payload);

      toast.success('Item posted successfully! Redirecting to details...');
      navigate(`/items/${response.id}`);
      
    } catch (err) {
      const error = err as ApiError;
      console.error('Failed to post item:', error);
      toast.error(error.response?.data?.error || 'Failed to post item. Please try again.');
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
          </div>
        </div>
      </header>

      {/* PROGRESS INDICATOR */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-gray-200 sticky top-[73px] z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.number;
              const isCurrent = currentStep === step.number;
              
              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg' 
                        : isCurrent 
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-110' 
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`mt-2 text-xs sm:text-sm font-medium transition-colors ${
                      isCurrent ? 'text-indigo-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`h-1 flex-1 mx-2 rounded-full transition-all duration-500 ${
                      isCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* FORM SECTION */}
          <div className="lg:col-span-3">
            <div className="bg-white/80 backdrop-blur-xl border-2 border-white/60 rounded-2xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(99,102,241,0.15)]">
              <form onSubmit={handleSubmit(onSubmit)} onKeyDown={(e) => {
                // Completely prevent Enter key from submitting form anywhere
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}>
                {/* STEP 1: TYPE & CATEGORY */}
                {currentStep === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-5 duration-500">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">What happened?</h2>
                      <p className="text-sm text-gray-600">Let's start with the basics</p>
                    </div>

                    {/* Item Type */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Item Type *
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="relative cursor-pointer group">
                          <input
                            type="radio"
                            value="LOST"
                            {...register('type')}
                            className="peer sr-only"
                          />
                          <div className="relative p-4 border-2 border-gray-200 rounded-xl bg-white transition-all duration-300 peer-checked:border-red-500 peer-checked:bg-red-50 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 peer-checked:shadow-[0_8px_16px_rgba(239,68,68,0.2)] group-active:scale-95">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center transition-all duration-300 peer-checked:bg-red-200 peer-checked:scale-110">
                                <Search className="w-5 h-5 text-red-600" />
                              </div>
                              <div className="flex-1">
                                <span className="block font-bold text-gray-900">Lost Item</span>
                                <span className="text-xs text-gray-500">I lost something</span>
                              </div>
                            </div>
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-red-500/5 to-transparent opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
                          </div>
                        </label>

                        <label className="relative cursor-pointer group">
                          <input
                            type="radio"
                            value="FOUND"
                            {...register('type')}
                            className="peer sr-only"
                          />
                          <div className="relative p-4 border-2 border-gray-200 rounded-xl bg-white transition-all duration-300 peer-checked:border-green-500 peer-checked:bg-green-50 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 peer-checked:shadow-[0_8px_16px_rgba(34,197,94,0.2)] group-active:scale-95">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center transition-all duration-300 peer-checked:bg-green-200 peer-checked:scale-110">
                                <CheckSquare className="w-5 h-5 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <span className="block font-bold text-gray-900">Found Item</span>
                                <span className="text-xs text-gray-500">I found something</span>
                              </div>
                            </div>
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-green-500/5 to-transparent opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
                          </div>
                        </label>
                      </div>
                      {errors.type && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-4 h-4" />
                          {errors.type.message}
                        </p>
                      )}
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Category *
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {/* Wallet */}
                        <label className="relative cursor-pointer group">
                          <input
                            type="radio"
                            value="WALLET"
                            {...register('category')}
                            className="peer sr-only"
                          />
                          <div className="px-2.5 py-2 border-2 border-gray-200 rounded-lg bg-white transition-all duration-200 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 hover:border-gray-300 hover:shadow-sm hover:-translate-y-0.5 peer-checked:shadow-[0_4px_12px_rgba(99,102,241,0.15)] active:scale-95">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 transition-transform peer-checked:scale-110">
                                <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                              </div>
                              <span className="text-xs font-semibold text-gray-900 truncate">Wallet</span>
                            </div>
                          </div>
                        </label>

                        {/* Electronics */}
                        <label className="relative cursor-pointer group">
                          <input
                            type="radio"
                            value="ELECTRONICS"
                            {...register('category')}
                            className="peer sr-only"
                          />
                          <div className="px-2.5 py-2 border-2 border-gray-200 rounded-lg bg-white transition-all duration-200 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 hover:border-gray-300 hover:shadow-sm hover:-translate-y-0.5 peer-checked:shadow-[0_4px_12px_rgba(99,102,241,0.15)] active:scale-95">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 transition-transform peer-checked:scale-110">
                                <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                              </div>
                              <span className="text-xs font-semibold text-gray-900 truncate">Electronics</span>
                            </div>
                          </div>
                        </label>

                        {/* Keys */}
                        <label className="relative cursor-pointer group">
                          <input
                            type="radio"
                            value="KEYS"
                            {...register('category')}
                            className="peer sr-only"
                          />
                          <div className="px-2.5 py-2 border-2 border-gray-200 rounded-lg bg-white transition-all duration-200 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 hover:border-gray-300 hover:shadow-sm hover:-translate-y-0.5 peer-checked:shadow-[0_4px_12px_rgba(99,102,241,0.15)] active:scale-95">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 transition-transform peer-checked:scale-110">
                                <Key className="w-3.5 h-3.5 text-indigo-600" />
                              </div>
                              <span className="text-xs font-semibold text-gray-900 truncate">Keys</span>
                            </div>
                          </div>
                        </label>

                        {/* Documents */}
                        <label className="relative cursor-pointer group">
                          <input
                            type="radio"
                            value="DOCUMENTS"
                            {...register('category')}
                            className="peer sr-only"
                          />
                          <div className="px-2.5 py-2 border-2 border-gray-200 rounded-lg bg-white transition-all duration-200 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 hover:border-gray-300 hover:shadow-sm hover:-translate-y-0.5 peer-checked:shadow-[0_4px_12px_rgba(99,102,241,0.15)] active:scale-95">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 transition-transform peer-checked:scale-110">
                                <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                              </div>
                              <span className="text-xs font-semibold text-gray-900 truncate">Documents</span>
                            </div>
                          </div>
                        </label>

                        {/* Clothing */}
                        <label className="relative cursor-pointer group">
                          <input
                            type="radio"
                            value="CLOTHING"
                            {...register('category')}
                            className="peer sr-only"
                          />
                          <div className="px-2.5 py-2 border-2 border-gray-200 rounded-lg bg-white transition-all duration-200 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 hover:border-gray-300 hover:shadow-sm hover:-translate-y-0.5 peer-checked:shadow-[0_4px_12px_rgba(99,102,241,0.15)] active:scale-95">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 transition-transform peer-checked:scale-110">
                                <Shirt className="w-3.5 h-3.5 text-indigo-600" />
                              </div>
                              <span className="text-xs font-semibold text-gray-900 truncate">Clothing</span>
                            </div>
                          </div>
                        </label>

                        {/* Accessories */}
                        <label className="relative cursor-pointer group">
                          <input
                            type="radio"
                            value="ACCESSORIES"
                            {...register('category')}
                            className="peer sr-only"
                          />
                          <div className="px-2.5 py-2 border-2 border-gray-200 rounded-lg bg-white transition-all duration-200 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 hover:border-gray-300 hover:shadow-sm hover:-translate-y-0.5 peer-checked:shadow-[0_4px_12px_rgba(99,102,241,0.15)] active:scale-95">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 transition-transform peer-checked:scale-110">
                                <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                              </div>
                              <span className="text-xs font-semibold text-gray-900 truncate">Accessories</span>
                            </div>
                          </div>
                        </label>

                        {/* Books */}
                        <label className="relative cursor-pointer group">
                          <input
                            type="radio"
                            value="BOOKS"
                            {...register('category')}
                            className="peer sr-only"
                          />
                          <div className="px-2.5 py-2 border-2 border-gray-200 rounded-lg bg-white transition-all duration-200 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 hover:border-gray-300 hover:shadow-sm hover:-translate-y-0.5 peer-checked:shadow-[0_4px_12px_rgba(99,102,241,0.15)] active:scale-95">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 transition-transform peer-checked:scale-110">
                                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                              </div>
                              <span className="text-xs font-semibold text-gray-900 truncate">Books</span>
                            </div>
                          </div>
                        </label>

                        {/* Sports */}
                        <label className="relative cursor-pointer group">
                          <input
                            type="radio"
                            value="SPORTS"
                            {...register('category')}
                            className="peer sr-only"
                          />
                          <div className="px-2.5 py-2 border-2 border-gray-200 rounded-lg bg-white transition-all duration-200 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 hover:border-gray-300 hover:shadow-sm hover:-translate-y-0.5 peer-checked:shadow-[0_4px_12px_rgba(99,102,241,0.15)] active:scale-95">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 transition-transform peer-checked:scale-110">
                                <Dumbbell className="w-3.5 h-3.5 text-indigo-600" />
                              </div>
                              <span className="text-xs font-semibold text-gray-900 truncate">Sports</span>
                            </div>
                          </div>
                        </label>

                        {/* Other */}
                        <label className="relative cursor-pointer group">
                          <input
                            type="radio"
                            value="OTHER"
                            {...register('category')}
                            className="peer sr-only"
                          />
                          <div className="px-2.5 py-2 border-2 border-gray-200 rounded-lg bg-white transition-all duration-200 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 hover:border-gray-300 hover:shadow-sm hover:-translate-y-0.5 peer-checked:shadow-[0_4px_12px_rgba(99,102,241,0.15)] active:scale-95">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 transition-transform peer-checked:scale-110">
                                <Package className="w-3.5 h-3.5 text-indigo-600" />
                              </div>
                              <span className="text-xs font-semibold text-gray-900 truncate">Other</span>
                            </div>
                          </div>
                        </label>
                      </div>
                      {errors.category && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-4 h-4" />
                          {errors.category.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 2: DETAILS */}
                {currentStep === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-5 duration-500">
                    {/* Title */}
                    <div className="relative group">
                      <label htmlFor="title" className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">
                        Item Title *
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors group-focus-within:text-indigo-600" />
                        <input
                          id="title"
                          type="text"
                          placeholder="e.g., Black leather wallet with ID cards"
                          {...register('title')}
                          className="w-full pl-10 pr-12 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all hover:border-gray-300"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                          {watch('title')?.length || 0}/100
                        </span>
                      </div>
                      {errors.title && (
                        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                          <AlertCircle className="w-3 h-3" />
                          {errors.title.message}
                        </p>
                      )}
                    </div>

                    {/* Description */}
                    <div className="relative group">
                      <label htmlFor="description" className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">
                        Description *
                      </label>
                      <div className="relative">
                        <textarea
                          id="description"
                          rows={3}
                          placeholder="Provide detailed description including color, brand, distinctive features..."
                          {...register('description')}
                          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none hover:border-gray-300"
                        />
                        <span className="absolute right-3 bottom-2.5 text-xs text-gray-400 font-medium bg-white px-1">
                          {watch('description')?.length || 0}/1000
                        </span>
                      </div>
                      {errors.description && (
                        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                          <AlertCircle className="w-3 h-3" />
                          {errors.description.message}
                        </p>
                      )}
                    </div>

                    {/* Location & Date in a row */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Location */}
                      <div className="relative group">
                        <label htmlFor="location" className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">
                          {itemType === 'LOST' ? 'Last Seen Location *' : 'Found Location *'}
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors group-focus-within:text-indigo-600" />
                          <input
                            id="location"
                            type="text"
                            placeholder="e.g., Library 2nd Floor"
                            {...register('location')}
                            className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all hover:border-gray-300"
                          />
                        </div>
                        {errors.location && (
                          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                            <AlertCircle className="w-3 h-3" />
                            {errors.location.message}
                          </p>
                        )}
                      </div>

                      {/* Date */}
                      <div className="relative group">
                        <label htmlFor="itemDate" className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">
                          {itemType === 'LOST' ? 'Date Lost *' : 'Date Found *'}
                        </label>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-left text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all hover:border-gray-300",
                                !watch('itemDate') && "text-gray-400"
                              )}
                            >
                              <CalendarIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              {watch('itemDate') ? (
                                <span className="text-gray-900">{(() => {
                                  const [y, m, d] = watch('itemDate').split('-').map(Number);
                                  return format(new Date(y, m - 1, d), 'PPP');
                                })()}</span>
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 border-0 shadow-lg" align="start">
                            <Calendar
                              mode="single"
                              selected={watch('itemDate') ? (() => {
                                const [y, m, d] = watch('itemDate').split('-').map(Number);
                                return new Date(y, m - 1, d);
                              })() : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  const day = String(date.getDate()).padStart(2, '0');
                                  setValue('itemDate', `${year}-${month}-${day}`);
                                  setCalendarOpen(false);
                                }
                              }}
                              disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {errors.itemDate && (
                          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                            <AlertCircle className="w-3 h-3" />
                            {errors.itemDate.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Current Location - Only for FOUND items */}
                    {itemType === 'FOUND' && (
                      <div className="relative group animate-in fade-in slide-in-from-top-2 duration-300">
                        <label htmlFor="currentLocation" className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">
                          Where is it now? (Optional)
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors group-focus-within:text-indigo-600" />
                          <input
                            id="currentLocation"
                            type="text"
                            placeholder="e.g., Security Office, Building A"
                            {...register('currentLocation')}
                            className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all hover:border-gray-300"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: IMAGES */}
                {currentStep === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-5 duration-500">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Add photos</h2>
                      <p className="text-gray-600">Images help identify the item faster (optional)</p>
                    </div>

                    <div>
                      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/30 transition-all group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-12 h-12 mb-3 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                          <p className="text-sm text-gray-600 font-medium">
                            Click to upload images (max 5)
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            PNG, JPG up to 5MB each
                          </p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>

                      {uploadError && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-4 h-4" />
                          {uploadError}
                        </p>
                      )}

                      {images.length > 0 && (
                        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {images.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={image.preview}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-32 object-cover rounded-xl border-2 border-gray-200"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-lg"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 4: REVIEW */}
                {currentStep === 4 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-5 duration-500">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Review & Submit</h2>
                      <p className="text-sm text-gray-500">Confirm your details before posting</p>
                    </div>

                    {/* Compact Summary Grid */}
                    <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Type</span>
                        <p className={`text-sm font-semibold ${watchedFields.type === 'LOST' ? 'text-red-600' : 'text-green-600'}`}>
                          {watchedFields.type === 'LOST' ? 'Lost Item' : 'Found Item'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Category</span>
                        <p className="text-sm font-semibold text-gray-900">{watchedFields.category || '—'}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Title</span>
                        <p className="text-sm font-semibold text-gray-900 truncate">{watchedFields.title || '—'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Location</span>
                        <p className="text-sm font-semibold text-gray-900 truncate">{watchedFields.location || '—'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Date</span>
                        <p className="text-sm font-semibold text-gray-900">{watchedFields.itemDate || '—'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Images</span>
                        <p className="text-sm font-semibold text-gray-900">{images.length} uploaded</p>
                      </div>
                    </div>

                    {/* Verification for FOUND items - cleaner design */}
                    {itemType === 'FOUND' && (
                      <div className="p-4 bg-white rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <label htmlFor="verificationQuestion" className="text-sm font-semibold text-gray-700">
                            Verification Question
                          </label>
                          <span className="text-xs text-gray-400">Optional</span>
                        </div>
                        <input
                          id="verificationQuestion"
                          type="text"
                          placeholder="e.g., What sticker is on the laptop?"
                          {...register('verificationQuestion')}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                        />
                        {verificationQuestion && (
                          <div className="mt-3">
                            <label htmlFor="verificationAnswer" className="block text-sm font-semibold text-gray-700 mb-1.5">
                              Correct Answer
                            </label>
                            <input
                              id="verificationAnswer"
                              type="text"
                              placeholder="Enter the answer"
                              {...register('verificationAnswer')}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* NAVIGATION BUTTONS */}
                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 px-6 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-all"
                    >
                      Back
                    </button>
                  )}
                  
                  {currentStep < STEPS.length ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                    >
                      Continue
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit(onSubmit)}
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <ButtonSpinner />
                          Posting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          Post Item
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* LIVE PREVIEW SECTION - Desktop Only */}
          <div className="hidden lg:block lg:col-span-2">
            <div className="sticky top-[220px]">
              <div className="bg-white/80 backdrop-blur-xl border-2 border-white/60 rounded-2xl p-6 shadow-[0_8px_32px_rgba(99,102,241,0.15)]">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-600" />
                  Live Preview
                </h3>
                
                <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white">
                  {/* Preview Header */}
                  <div className={`p-4 ${watchedFields.type === 'LOST' ? 'bg-red-50 border-b-2 border-red-200' : 'bg-green-50 border-b-2 border-green-200'}`}>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      watchedFields.type === 'LOST' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                    }`}>
                      {watchedFields.type === 'LOST' ? (
                        <>
                          <Search className="w-3 h-3" />
                          LOST
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-3 h-3" />
                          FOUND
                        </>
                      )}
                    </span>
                  </div>

                  {/* Preview Image */}
                  {images.length > 0 && (
                    <img
                      src={images[0].preview}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                  )}

                  {/* Preview Content */}
                  <div className="p-4 space-y-3">
                    <h4 className="text-lg font-bold text-gray-900">
                      {watchedFields.title || 'Item title will appear here'}
                    </h4>
                    
                    {watchedFields.category && (
                      <div className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium">
                        {watchedFields.category}
                      </div>
                    )}

                    <p className="text-sm text-gray-600 line-clamp-3">
                      {watchedFields.description || 'Description will appear here...'}
                    </p>

                    {watchedFields.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        {watchedFields.location}
                      </div>
                    )}

                    {watchedFields.itemDate && (
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <CalendarIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{(() => {
                          const [y, m, d] = watchedFields.itemDate.split('-').map(Number);
                          return new Date(y, m - 1, d).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          });
                        })()}</span>
                      </div>
                    )}

                    {images.length > 1 && (
                      <p className="text-xs text-gray-500">
                        +{images.length - 1} more image{images.length > 2 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  PlusIcon, 
  PhotoIcon, 
  XMarkIcon,
  DocumentTextIcon, 
  DocumentIcon,
  CheckIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSquareIcon,
  TableCellsIcon,
  Cog6ToothIcon,
  CloudArrowUpIcon,
  ArrowsUpDownIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAdminApp } from '@/context/AdminAppContext';
import { useAppFirestore } from '@/hooks/useAppFirestore';
import { 
  addDoc, 
  collection, 
  deleteDoc,
  doc, 
  updateDoc, 
  getDoc, 
  Timestamp, 
  orderBy,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject, 
  UploadTaskSnapshot 
} from 'firebase/storage';
import { FirebaseApp } from 'firebase/app';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImage';
import { AnimatePresence, motion } from 'framer-motion';
import ConfirmationModal from '@/components/ConfirmationModal';

// Tag input with autocomplete
interface TagInputProps {
  tags: string[];
  setTags: (tags: string[]) => void;
  availableTags?: string[];
  setAvailableTags?: (tags: string[]) => void;
}

const TagInput = ({ tags, setTags, availableTags, setAvailableTags }: TagInputProps) => {
  const [inputValue, setInputValue] = useState('');
  const [localAvailableTags, setLocalAvailableTags] = useState<string[]>([
    'web', 'development', 'design', 'ui', 'ux', 'react', 'nextjs', 'hosting', 
    'technology', 'real estate', 'property', 'rental', 'sales', 'housing',
    'apartments', 'business', 'listings', 'events'
  ]);
  const [filteredTags, setFilteredTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (availableTags) {
      setLocalAvailableTags(availableTags);
    }
  }, [availableTags]);

  useEffect(() => {
    const filtered = localAvailableTags
      .filter(tag => !tags.includes(tag) && tag.toLowerCase().includes(inputValue.toLowerCase()))
      .slice(0, 5);
    setFilteredTags(filtered);
  }, [inputValue, tags, localAvailableTags]);

  const addTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag && !tags.includes(normalizedTag)) {
      setTags([...tags, normalizedTag]);
      
      if (!localAvailableTags.includes(normalizedTag)) {
        const updatedAvailableTags = [...localAvailableTags, normalizedTag];
        setLocalAvailableTags(updatedAvailableTags);
        
        if (setAvailableTags) {
          setAvailableTags(updatedAvailableTags);
        }
      }
      
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 border rounded-md p-2">
        {tags.map(tag => (
          <div key={tag} className="flex items-center bg-primary/10 text-primary px-2 py-1 rounded-full">
            <span>{tag}</span>
            <button 
              onClick={() => removeTag(tag)}
              className="ml-1 text-primary hover:text-primary/70"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
        <div className="relative flex-1 min-w-24">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputValue) {
                e.preventDefault();
                addTag(inputValue);
              } else if (e.key === ',' && inputValue) {
                e.preventDefault();
                addTag(inputValue.replace(',', ''));
              }
            }}
            className="w-full border-none focus:outline-none p-1"
            placeholder={tags.length === 0 ? "Add tags..." : ""}
          />
          {showSuggestions && filteredTags.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 z-10 bg-card border rounded-md shadow-md max-h-60 overflow-auto">
              {filteredTags.map(tag => (
                <div 
                  key={tag} 
                  className="px-3 py-2 hover:bg-muted cursor-pointer"
                  onClick={() => addTag(tag)}
                >
                  {tag}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple text editor component
const SimpleEditor = ({ value, onChange }: { value: string, onChange: (value: string) => void }) => {
  return (
    <div className="border rounded-md">
      <div className="border-b bg-muted p-2 flex space-x-2">
        <button 
          className="p-1 rounded hover:bg-muted/70" 
          onClick={() => {
            const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const before = text.substring(0, start);
            const after = text.substring(end);
            const newText = before + '**' + text.substring(start, end) + '**' + after;
            onChange(newText);
            // Focus and set selection after modification
            setTimeout(() => {
              textarea.focus();
              textarea.selectionStart = start + 2;
              textarea.selectionEnd = end + 2;
            }, 0);
          }}
          title="Bold"
        >
          <span className="font-bold">B</span>
        </button>
        <button 
          className="p-1 rounded hover:bg-muted/70" 
          onClick={() => {
            const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const before = text.substring(0, start);
            const after = text.substring(end);
            const newText = before + '*' + text.substring(start, end) + '*' + after;
            onChange(newText);
            setTimeout(() => {
              textarea.focus();
              textarea.selectionStart = start + 1;
              textarea.selectionEnd = end + 1;
            }, 0);
          }}
          title="Italic"
        >
          <span className="italic">I</span>
        </button>
        <button 
          className="p-1 rounded hover:bg-muted/70"
          onClick={() => {
            const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
            const start = textarea.selectionStart;
            const text = textarea.value;
            const before = text.substring(0, start);
            const after = text.substring(start);
            const newText = before + '# ' + after;
            onChange(newText);
            setTimeout(() => {
              textarea.focus();
              textarea.selectionStart = start + 2;
              textarea.selectionEnd = start + 2;
            }, 0);
          }}
          title="Heading"
        >
          <span className="font-bold">H</span>
        </button>
        <button 
          className="p-1 rounded hover:bg-muted/70"
          onClick={() => {
            const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
            const start = textarea.selectionStart;
            const text = textarea.value;
            const before = text.substring(0, start);
            const after = text.substring(start);
            const newText = before + '\n- ' + after;
            onChange(newText);
            setTimeout(() => {
              textarea.focus();
              textarea.selectionStart = start + 3;
              textarea.selectionEnd = start + 3;
            }, 0);
          }}
          title="List"
        >
          <span>• List</span>
        </button>
        <button 
          className="p-1 rounded hover:bg-muted/70"
          onClick={() => {
            const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
            const start = textarea.selectionStart;
            const text = textarea.value;
            const before = text.substring(0, start);
            const after = text.substring(start);
            const newText = before + '[Link text](url)' + after;
            onChange(newText);
            setTimeout(() => {
              textarea.focus();
              textarea.selectionStart = start + 1;
              textarea.selectionEnd = start + 10;
            }, 0);
          }}
          title="Link"
        >
          <span className="underline">Link</span>
        </button>
      </div>
      <textarea
        id="content-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[300px] p-4 focus:outline-none resize-y bg-card"
        placeholder="Write your content here... (Supports Markdown)"
      />
    </div>
  );
};

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BlogPost {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  imageUrl?: string;
  galleryImages?: string[];
  contentType: 'article' | 'page';
  status: 'draft' | 'published';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface BlogSettings {
  categories: string[];
  availableTags: string[];
}

// Content type selector component
const ContentTypeSelector = ({ 
  contentType, 
  setContentType 
}: { 
  contentType: 'article' | 'page', 
  setContentType: (type: 'article' | 'page') => void 
}) => {
  return (
    <div className="flex rounded-md border border-gray-300 overflow-hidden">
      <button
        className={`py-2 px-4 flex items-center ${contentType === 'article' ? 'bg-primary text-white' : 'bg-card text-gray-700 hover:bg-muted'}`}
        onClick={() => setContentType('article')}
      >
        <DocumentTextIcon className="w-5 h-5 mr-2" />
        Article
      </button>
      <button
        className={`py-2 px-4 flex items-center ${contentType === 'page' ? 'bg-primary text-white' : 'bg-card text-gray-700 hover:bg-muted'}`}
        onClick={() => setContentType('page')}
      >
        <DocumentIcon className="w-5 h-5 mr-2" />
        Page
      </button>
    </div>
  );
};

export default function BlogEditor() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { appFirebase } = useAdminApp();
  const { db, queryCollection, getDocument } = useAppFirestore();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [contentType, setContentType] = useState<'article' | 'page'>('article');
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState('');
  
  const [imageSrc, setImageSrc] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryUploadProgress, setGalleryUploadProgress] = useState<{file: File, progress: number}[]>([]);
  const [isDraggingGallery, setIsDraggingGallery] = useState(false);

  const [activeTab, setActiveTab] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');

  // Categories and tags for the blog
  const [categories, setCategories] = useState<string[]>([
    'News',
    'Updates',
    'Tutorials',
    'Announcements',
    'Features',
    'Case Studies',
    'Interviews',
    'Events'
  ]);
  
  const [availableTags, setAvailableTags] = useState<string[]>([
    'web', 'development', 'design', 'ui', 'ux', 'react', 'nextjs', 'hosting', 
    'technology', 'real estate', 'property', 'rental', 'sales', 'housing',
    'apartments', 'business', 'listings', 'events'
  ]);

  // Update modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    confirmButtonClass?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'Confirm',
    confirmButtonClass: 'bg-secondary hover:bg-secondary/90 text-secondary-foreground'
  });

  const fetchBlogPosts = useCallback(async () => {
    try {
      const posts = await queryCollection<BlogPost>('blogPosts', [orderBy('createdAt', 'desc')]);
      setBlogPosts(posts);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      toast.error('Failed to load blog posts');
    }
  }, [queryCollection]);

  const fetchBlogSettings = useCallback(async () => {
    try {
      const settingsDoc = await getDocument<BlogSettings>('settings', 'blogSettings');
      
      if (settingsDoc) {
        if (settingsDoc.categories) {
          setCategories(settingsDoc.categories);
        }
        if (settingsDoc.availableTags) {
          setAvailableTags(settingsDoc.availableTags);
        }
      }
    } catch (error) {
      console.error('Error fetching blog settings:', error);
      toast.error('Failed to load blog settings');
    }
  }, [getDocument]);

  // Get blog posts and settings on load
  useEffect(() => {
    // Only redirect if authentication is complete and user is not an admin
    if (!authLoading) {
      if (user?.isAdmin) {
        fetchBlogPosts();
        fetchBlogSettings();
      } else if (user === null) {
        // User is not logged in
        router.push('/login');
      } else if (!user.isAdmin) {
        // User is logged in but not an admin
        router.push('/dashboard');
      }
    }
  }, [user, authLoading, router, fetchBlogPosts, fetchBlogSettings]);

  const saveBlogSettings = async () => {
    if (!user?.isAdmin) return;
    
    setSettingsLoading(true);
    try {
      const settingsRef = doc(db, 'settings', 'blogSettings');
      await setDoc(settingsRef, {
        categories: categories,
        availableTags: availableTags,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      toast.success('Blog settings saved successfully');
    } catch (error) {
      console.error('Error saving blog settings:', error);
      toast.error('Failed to save blog settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSave = async (saveStatus: 'draft' | 'published' = 'draft') => {
    if (!title || !content || !category) {
      toast.error('Please fill in the required fields');
      return;
    }

    setLoading(true);
    try {
      const blogData = {
        title,
        content,
        category,
        tags,
        imageUrl: imageUrl || null,
        galleryImages: galleryImages.length > 0 ? galleryImages : null,
        contentType,
        status: saveStatus,
        createdAt: editMode ? blogPosts.find(post => post.id === editId)?.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (editMode && editId) {
        await updateDoc(doc(db, 'blogPosts', editId), blogData);
        toast.success(`Blog post updated and saved as ${saveStatus}!`);
      } else {
        await addDoc(collection(db, 'blogPosts'), blogData);
        toast.success(`Blog post created and saved as ${saveStatus}!`);
      }

      resetForm();
      fetchBlogPosts();
    } catch (error) {
      console.error('Error saving blog post:', error);
      toast.error('Failed to save blog post');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await updateDoc(doc(db, 'blogPosts', id), {
        status: 'published',
        updatedAt: serverTimestamp()
      });
      toast.success('Blog post published!');
      fetchBlogPosts();
    } catch (error) {
      console.error('Error publishing blog post:', error);
      toast.error('Failed to publish blog post');
    }
  };

  const handleUnpublish = async (id: string) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Unpublish Post',
      message: 'Are you sure you want to unpublish this post? It will be saved as a draft.',
      confirmText: 'Unpublish',
      confirmButtonClass: 'bg-secondary hover:bg-secondary/90 text-secondary-foreground',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'blogPosts', id), {
            status: 'draft',
            updatedAt: serverTimestamp()
          });
          toast.success('Blog post unpublished!');
          fetchBlogPosts();
        } catch (error) {
          console.error('Error unpublishing blog post:', error);
          toast.error('Failed to unpublish blog post');
        }
      }
    });
  };

  const handleEdit = (post: BlogPost) => {
    setTitle(post.title);
    setContent(post.content);
    setCategory(post.category);
    setTags(post.tags ?? []);
    setImageUrl(post.imageUrl ?? '');
    setGalleryImages(post.galleryImages ?? []);
    setContentType(post.contentType ?? 'article');
    setEditMode(true);
    setEditId(post.id);
  };

  const handleDelete = async (id: string) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Post',
      message: 'Are you sure you want to delete this post? This action cannot be undone.',
      confirmText: 'Delete',
      confirmButtonClass: 'bg-secondary hover:bg-secondary/90 text-secondary-foreground',
      onConfirm: async () => {
        try {
          const blogPostDoc = await getDoc(doc(db, 'blogPosts', id));
          const blogPostData = blogPostDoc.data();
          
          // Delete featured image from storage if it exists
          if (blogPostData?.imageUrl && blogPostData.imageUrl.includes('firebase') && appFirebase) {
            try {
              const imageRef = ref(appFirebase.storage, blogPostData.imageUrl);
              await deleteObject(imageRef);
            } catch (error) {
              console.log('Error deleting image or image not found:', error);
            }
          }
          
          // Delete gallery images from storage if they exist
          if (blogPostData?.galleryImages && blogPostData.galleryImages.length > 0 && appFirebase) {
            for (const imageUrl of blogPostData.galleryImages) {
              if (imageUrl.includes('firebase')) {
                try {
                  const imageRef = ref(appFirebase.storage, imageUrl);
                  await deleteObject(imageRef);
                } catch (error) {
                  console.log('Error deleting gallery image or image not found:', error);
                }
              }
            }
          }
          
          // Delete the document from Firestore
          await deleteDoc(doc(db, 'blogPosts', id));
          toast.success('Blog post deleted!');
          fetchBlogPosts();
        } catch (error) {
          console.error('Error deleting blog post:', error);
          toast.error('Failed to delete blog post');
        }
      }
    });
  };

  const resetForm = async () => {
    // If we're in edit mode and canceling, don't delete the images
    // If not in edit mode, we should delete any uploaded images from storage
    if (!editMode && appFirebase) {
      // Clean up any image uploads if not saving
      if (imageUrl && imageUrl.includes('firebase')) {
        try {
          const imageRef = ref(appFirebase.storage, imageUrl);
          await deleteObject(imageRef);
        } catch (error) {
          console.log('Error deleting featured image:', error);
        }
      }
      
      // Clean up gallery images
      for (const galleryImage of galleryImages) {
        if (galleryImage.includes('firebase')) {
          try {
            const imageRef = ref(appFirebase.storage, galleryImage);
            await deleteObject(imageRef);
          } catch (error) {
            console.log('Error deleting gallery image:', error);
          }
        }
      }
    }
    
    setTitle('');
    setContent('');
    setCategory('');
    setTags([]);
    setImageUrl('');
    setGalleryImages([]);
    setContentType('article');
    setEditMode(false);
    setEditId('');
  };

  const onCropComplete = (croppedArea: CropArea, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  // Upload image to Firebase Storage
  const dataURLtoBlob = (dataURL: string): Blob => {
    try {
      // Check if input is a data URL
      if (!dataURL.startsWith('data:')) {
        console.error('Input is not a data URL:', dataURL.substring(0, 30) + '...');
        throw new Error('Input is not a data URL');
      }
      
      // Split the data URL
      const arr = dataURL.split(',');
      if (arr.length !== 2) {
        console.error('Invalid data URL format');
        throw new Error('Invalid data URL format');
      }
      
      // Get MIME type
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      
      // Decode base64 data
      try {
        const bstr = atob(arr[1]);
        const n = bstr.length;
        const u8arr = new Uint8Array(n);
        
        for (let i = 0; i < n; i++) {
          u8arr[i] = bstr.charCodeAt(i);
        }
        
        return new Blob([u8arr], { type: mime });
      } catch (e) {
        console.error('Error decoding base64 data:', e);
        throw e;
      }
    } catch (error) {
      console.error('Error in dataURLtoBlob:', error);
      // Return a small empty blob as fallback
      return new Blob([], { type: 'image/jpeg' });
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      setLoading(true);
      if (!appFirebase || !user) {
        throw new Error('Firebase app not initialized or user not authenticated');
      }
      const storage = getStorage(appFirebase as unknown as FirebaseApp);
      const fileName = `${Date.now()}-${file.name}`;
      const storageRef = ref(storage, `blog/${user.uid}/featured/${fileName}`);
      
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot: UploadTaskSnapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload progress: ${progress}%`);
          },
          (error: Error) => {
            console.error('Error uploading image:', error);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleImageDelete = async () => {
    try {
      setLoading(true);
      if (!appFirebase) {
        throw new Error('Firebase app not initialized');
      }
      if (imageUrl && imageUrl.includes('firebase')) {
        const storage = getStorage(appFirebase as unknown as FirebaseApp);
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
      }
      setImageUrl('');
      toast.success('Featured image deleted!');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    } finally {
      setLoading(false);
    }
  };

  const handleCropSave = async () => {
    try {
      setLoading(true);
      // Get the cropped image as a data URL
      const croppedImageDataUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      let imageBlob: Blob;
      
      // Check if the result is a data URL or an object URL
      if (croppedImageDataUrl.startsWith('data:')) {
        // Convert the data URL to a Blob for upload
        imageBlob = dataURLtoBlob(croppedImageDataUrl);
      } else if (croppedImageDataUrl.startsWith('blob:')) {
        // If it's an object URL, fetch it and get the blob directly
        try {
          const response = await fetch(croppedImageDataUrl);
          imageBlob = await response.blob();
        } catch (error) {
          console.error('Error fetching from object URL:', error);
          toast.error('Failed to process cropped image');
          setLoading(false);
          return;
        }
      } else {
        console.error('Unexpected image format:', croppedImageDataUrl.substring(0, 30) + '...');
        toast.error('Unexpected image format');
        setLoading(false);
        return;
      }
      
      // Upload the Blob to Firebase Storage
      const uploadedImageUrl = await handleImageUpload(new File([imageBlob], "image.jpg", { type: imageBlob.type }));
      
      // Delete the old image if it exists and isn't the default
      if (imageUrl && imageUrl.includes('firebase') && editMode) {
        await handleImageDelete();
      }
      
      // Set the URL from Firebase
      setImageUrl(uploadedImageUrl);
      setImageSrc('');
      toast.success('Image cropped and saved!');
    } catch (error) {
      console.error('Error processing and uploading image:', error);
      toast.error('Failed to process image');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (index: number, value: string) => {
    const newCategories = [...categories];
    newCategories[index] = value;
    setCategories(newCategories);
  };

  const handleAddCategory = () => {
    setCategories([...categories, '']);
  };

  const handleRemoveCategory = (index: number) => {
    const newCategories = categories.filter((_, i) => i !== index);
    setCategories(newCategories);
  };

  const handleGalleryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingGallery(true);
    
    // Initialize upload queue with files and 0 progress
    const newUploads = Array.from(files).map(file => ({ file, progress: 0 }));
    setGalleryUploadProgress(newUploads);

    // Process each file
    for (const item of newUploads) {
      try {
        // Upload directly to Firebase Storage
        const uploadedImageUrl = await handleImageUpload(item.file);
        
        // Add to gallery images
        setGalleryImages(prev => [...prev, uploadedImageUrl]);
      } catch (error) {
        console.error('Error processing image:', error);
        toast.error(`Failed to process ${item.file.name}`);
      }
    }
    
    // Clear progress after short delay
    setTimeout(() => {
      setGalleryUploadProgress([]);
      setUploadingGallery(false);
    }, 500);
  };

  const handleGalleryDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingGallery(true);
  };

  const handleGalleryDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingGallery(false);
  };

  const handleGalleryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleGalleryDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingGallery(false);
    
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/')
    );
    
    if (files.length === 0) {
      toast.error('Please drop only image files');
      return;
    }
    
    setUploadingGallery(true);
    
    // Initialize upload queue
    const newUploads = files.map(file => ({ file, progress: 0 }));
    setGalleryUploadProgress(newUploads);
    
    // Process each file
    for (const item of newUploads) {
      try {
        // Upload directly to Firebase Storage
        const uploadedImageUrl = await handleImageUpload(item.file);
        
        // Add to gallery images
        setGalleryImages(prev => [...prev, uploadedImageUrl]);
      } catch (error) {
        console.error('Error processing image:', error);
        toast.error(`Failed to process ${item.file.name}`);
      }
    }
    
    // Clear progress after short delay
    setTimeout(() => {
      setGalleryUploadProgress([]);
      setUploadingGallery(false);
    }, 500);
  };

  const removeGalleryImage = async (index: number) => {
    const imageUrl = galleryImages[index];
    
    // If it's a Firebase Storage URL, delete from storage too
    if (imageUrl && imageUrl.includes('firebase')) {
      try {
        const storage = getStorage(appFirebase as unknown as FirebaseApp);
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
      } catch (error) {
        console.log('Error deleting image or image not found:', error);
      }
    }
    
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  };

  const reorderGalleryImages = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    setGalleryImages(prev => {
      const newImages = [...prev];
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);
      return newImages;
    });
  };

  // Update handleCancel to use the confirmation modal
  const handleCancel = () => {
    // Only show confirmation if there's data to lose
    if (title || content || category || tags.length > 0 || imageUrl || galleryImages.length > 0) {
      setConfirmationModal({
        isOpen: true,
        title: 'Discard Changes',
        message: 'Are you sure you want to discard all changes? This action cannot be undone.',
        confirmText: 'Discard',
        confirmButtonClass: 'bg-secondary hover:bg-secondary/90 text-secondary-foreground',
        onConfirm: async () => {
          await resetForm();
        }
      });
    } else {
      // If no data to lose, just reset directly
      resetForm();
    }
  };

  return (
    <div className="container mx-auto py-2">
      <div className="flex items-center mb-6">
        <PencilSquareIcon className="w-8 h-8 mr-3 text-primary" />
        <h1 className="text-2xl font-bold">Blog Editor</h1>
      </div>
      
      <div className="mb-6 bg-card rounded-lg shadow-sm p-2">
        <div className="flex">
          <button 
            onClick={() => setActiveTab(1)} 
            className={`flex items-center px-4 py-2.5 rounded-md mr-2 transition-colors ${activeTab === 1 ? 'bg-primary text-white' : 'bg-muted hover:bg-muted/70'}`}
          >
            <PencilSquareIcon className="w-5 h-5 mr-2" />
            Editor & List
          </button>
          <button 
            onClick={() => setActiveTab(2)} 
            className={`flex items-center px-4 py-2.5 rounded-md mr-2 transition-colors ${activeTab === 2 ? 'bg-primary text-white' : 'bg-muted hover:bg-muted/70'}`}
          >
            <TableCellsIcon className="w-5 h-5 mr-2" />
            Articles Table
          </button>
          <button 
            onClick={() => setActiveTab(3)} 
            className={`flex items-center px-4 py-2.5 rounded-md transition-colors ${activeTab === 3 ? 'bg-primary text-white' : 'bg-muted hover:bg-muted/70'}`}
          >
            <Cog6ToothIcon className="w-5 h-5 mr-2" />
            Settings
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 1 && (
          <motion.div
            key="tab1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-12 gap-6"
          >
            {/* Editor section */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              <div className="bg-card rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">
                  {editMode ? 'Edit Blog Post' : 'Create New Blog Post'}
                </h2>
                
                {/* Content type selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Content Type</label>
                  <ContentTypeSelector 
                    contentType={contentType} 
                    setContentType={setContentType} 
                  />
                </div>
                
                {/* Title */}
                <div className="mb-6">
                  <label htmlFor="title" className="block text-sm font-medium mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                    placeholder="Enter title"
                  />
                </div>
                
                {/* Featured Image Upload and Crop */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Featured Image
                  </label>
                  <div className="bg-muted rounded-lg p-4 border border-gray-200">
                    {imageUrl ? (
                      <div className="mb-4">
                        <div className="relative aspect-video w-full overflow-hidden rounded-md shadow-sm mb-2">
                          <Image 
                            src={imageUrl} 
                            alt="Featured image preview" 
                            fill
                            className="object-cover"
                          />
                          <button
                            onClick={() => setImageUrl('')}
                            className="absolute top-2 right-2 bg-gray-800/70 text-white p-1.5 rounded-full hover:bg-red-600/70 transition-colors"
                            title="Remove image"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 italic">
                          Current featured image
                        </p>
                      </div>
                    ) : (
                      <div className="mb-4 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-muted/30">
                        <PhotoIcon className="w-12 h-12 mx-auto text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">
                          No featured image selected
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Recommended size: 1200 × 675 pixels (16:9 ratio)
                        </p>
                      </div>
                    )}

                    {!imageSrc && (
                      <div className="flex items-center justify-center">
                        <label className="flex items-center justify-center px-4 py-2 bg-card border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-muted cursor-pointer">
                          <PhotoIcon className="w-5 h-5 mr-2 text-gray-500" />
                          {imageUrl ? 'Change image' : 'Select image'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  if (reader.result) {
                                    setImageSrc(reader.result as string);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="sr-only"
                          />
                        </label>
                      </div>
                    )}

                    {imageSrc && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Crop Image</h4>
                        <div className="relative w-full h-64 bg-muted rounded-md overflow-hidden border border-gray-200 mb-4">
                          <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={16 / 9}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                          />
                        </div>
                        
                        <div className="mb-4">
                          <label htmlFor="zoom" className="block text-xs font-medium text-gray-700 mb-1">
                            Zoom: {zoom.toFixed(1)}×
                          </label>
                          <input
                            type="range"
                            id="zoom"
                            min={1}
                            max={3}
                            step={0.1}
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => setImageSrc('')}
                            className="py-2 px-4 border border-gray-300 rounded-md hover:bg-muted text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleCropSave}
                            className="py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90 text-sm flex items-center"
                          >
                            <CheckIcon className="w-4 h-4 mr-1" />
                            Apply Crop
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Gallery Images */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Gallery Images
                  </label>
                  <div className="bg-muted rounded-lg p-4 border border-gray-200">
                    {galleryImages.length > 0 && (
                      <div className="mb-4">
                        <div className="grid grid-cols-4 gap-2">
                          {galleryImages.map((img, index) => (
                            <div 
                              key={index} 
                              className="relative group aspect-square rounded-md overflow-hidden border border-gray-200"
                            >
                              <Image 
                                src={img} 
                                alt={`Gallery image ${index + 1}`} 
                                fill 
                                className="object-cover"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <div className="flex space-x-1">
                                  {index > 0 && (
                                    <button
                                      onClick={() => reorderGalleryImages(index, index - 1)}
                                      className="p-1 bg-card rounded-full text-gray-700 hover:text-primary"
                                      title="Move left"
                                    >
                                      <ArrowsUpDownIcon className="w-4 h-4 -rotate-90" />
                                    </button>
                                  )}
                                  {index < galleryImages.length - 1 && (
                                    <button
                                      onClick={() => reorderGalleryImages(index, index + 1)}
                                      className="p-1 bg-card rounded-full text-gray-700 hover:text-primary"
                                      title="Move right"
                                    >
                                      <ArrowsUpDownIcon className="w-4 h-4 rotate-90" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => removeGalleryImage(index)}
                                    className="p-1 bg-card rounded-full text-red-500 hover:text-red-700"
                                    title="Remove image"
                                  >
                                    <XMarkIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          {galleryImages.length} image{galleryImages.length !== 1 ? 's' : ''} in gallery. Click and drag to reorder.
                        </p>
                      </div>
                    )}
                    
                    <div className="w-full">
                      <label
                        htmlFor="gallery-upload"
                        onDragEnter={handleGalleryDragEnter}
                        onDragOver={handleGalleryDragOver}
                        onDragLeave={handleGalleryDragLeave}
                        onDrop={handleGalleryDrop}
                        className={`w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
                          uploadingGallery 
                            ? 'bg-muted border-gray-300' 
                            : isDraggingGallery
                              ? 'bg-primary/5 border-primary'
                              : 'hover:bg-muted border-gray-300'
                        }`}
                      >
                        <PhotoIcon className={`w-8 h-8 mb-2 ${
                          isDraggingGallery ? 'text-primary' : 'text-gray-400'
                        }`} />
                        <span className={`text-sm ${
                          isDraggingGallery ? 'text-primary' : 'text-gray-500'
                        }`}>
                          {uploadingGallery 
                            ? 'Uploading...' 
                            : isDraggingGallery
                              ? 'Drop images here'
                              : 'Drag images here or click to upload gallery'}
                        </span>
                        <input
                          id="gallery-upload"
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleGalleryImageUpload}
                          className="hidden"
                          disabled={uploadingGallery || loading}
                        />
                      </label>
                    </div>
                    
                    {/* Upload progress indicators */}
                    {galleryUploadProgress.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {galleryUploadProgress.map((item, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div className="w-full bg-muted rounded-full h-2.5">
                              <div 
                                className="bg-primary h-2.5 rounded-full transition-all" 
                                style={{ width: `${item.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500">{item.file.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Loading indicator when uploading */}
                    {uploadingGallery && (
                      <div className="flex items-center justify-center mt-4">
                        <svg className="animate-spin h-5 w-5 text-primary mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm">Uploading to cloud storage...</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Category */}
                <div className="mb-6">
                  <label htmlFor="category" className="block text-sm font-medium mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Tags */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Tags
                  </label>
                  <TagInput 
                    tags={tags} 
                    setTags={setTags} 
                    availableTags={availableTags} 
                    setAvailableTags={setAvailableTags} 
                  />
                </div>
                
                {/* Content Editor */}
                <div className="mb-6">
                  <label htmlFor="content-editor" className="block text-sm font-medium mb-2">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <SimpleEditor value={content} onChange={setContent} />
                </div>
                
                {/* Save Button */}
                <div className="flex justify-end space-x-4">
                  {editMode && (
                    <button
                      onClick={handleCancel}
                      className="py-2 px-4 border border-gray-300 rounded-md hover:bg-muted"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={() => handleSave('draft')}
                    className="py-2 px-4 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 flex items-center"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <CheckIcon className="w-5 h-5 mr-1" />
                        {editMode ? 'Update as Draft' : 'Save as Draft'}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSave('published')}
                    className="py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Publishing...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <CloudArrowUpIcon className="w-5 h-5 mr-1" />
                        {editMode ? 'Update & Publish' : 'Save & Publish'}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Article List section */}
            <div className="col-span-12 lg:col-span-5">
              <div className="bg-card rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Blog Posts</h2>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setStatusFilter('all')} 
                      className={`px-3 py-1 text-xs rounded-md ${statusFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-muted'}`}
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setStatusFilter('draft')} 
                      className={`px-3 py-1 text-xs rounded-md ${statusFilter === 'draft' ? 'bg-gray-800 text-white' : 'bg-muted'}`}
                    >
                      Drafts
                    </button>
                    <button 
                      onClick={() => setStatusFilter('published')} 
                      className={`px-3 py-1 text-xs rounded-md ${statusFilter === 'published' ? 'bg-gray-800 text-white' : 'bg-muted'}`}
                    >
                      Published
                    </button>
                  </div>
                </div>
                
                {blogPosts.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-300" />
                    <p className="mt-2 text-gray-500">No blog posts yet</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                    {blogPosts
                      .filter(post => statusFilter === 'all' || post.status === statusFilter)
                      .map((post) => (
                      <div key={post.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 pr-4">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                post.contentType === 'article' 
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
                                  : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                              }`}>
                                {post.contentType}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                post.status === 'published' 
                                  ? 'bg-gg-100 text-green-800 dark:bg-gg-900/50 dark:text-green-300' 
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                              }`}>
                                {post.status}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-primary/10 dark:bg-primary/20 text-primary rounded-full">
                                {post.category}
                              </span>
                              {post.galleryImages && post.galleryImages.length > 0 && (
                                <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center">
                                  <PhotoIcon className="w-3 h-3 mr-1" /> 
                                  {post.galleryImages.length}
                                </span>
                              )}
                            </div>
                            <h3 className="font-medium mb-1">{post.title}</h3>
                            <p className="text-sm text-gray-500 mb-2">
                              {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : ''}
                              {post.updatedAt && post.createdAt && 
                               post.updatedAt.toDate().getTime() !== post.createdAt.toDate().getTime() && (
                                <span className="ml-2 italic">
                                  Updated: {post.updatedAt.toDate().toLocaleDateString()}
                                </span>
                              )}
                            </p>
                            {post.tags && post.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {post.tags.map(tag => (
                                  <span key={tag} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col space-y-2 items-end">
                            <button
                              onClick={() => handleEdit(post)}
                              className="text-indigo-600 hover:text-indigo-900 inline-flex items-center justify-end w-full"
                            >
                              <PencilIcon className="w-4 h-4 mr-1" />
                              Edit
                            </button>
                            {post.status === 'draft' ? (
                              <button
                                onClick={() => handlePublish(post.id)}
                                className="text-green-600 hover:text-green-900 inline-flex items-center justify-end w-full"
                              >
                                <CloudArrowUpIcon className="w-4 h-4 mr-1" />
                                Publish
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUnpublish(post.id)}
                                className="text-amber-600 hover:text-amber-900 inline-flex items-center justify-end w-full"
                              >
                                <EyeSlashIcon className="w-4 h-4 mr-1" />
                                Unpublish
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(post.id)}
                              className="text-red-600 hover:text-red-900 inline-flex items-center justify-end w-full"
                            >
                              <TrashIcon className="w-4 h-4 mr-1" />
                              Delete
                            </button>
                            <button
                              onClick={() => window.open(`/blog/${post.id}`, '_blank')}
                              className="text-gray-600 hover:text-gray-900 inline-flex items-center justify-end w-full"
                            >
                              <EyeIcon className="w-4 h-4 mr-1" />
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 2 && (
          <motion.div
            key="tab2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-card rounded-lg shadow-sm p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Articles Table</h2>
            <div className="mb-4 flex justify-between">
              <div>
                <button onClick={() => setContentType('article')} className={`px-4 py-2 ${contentType === 'article' ? 'bg-primary text-white' : 'bg-gray-200'} rounded-md mr-2`}>Articles</button>
                <button onClick={() => setContentType('page')} className={`px-4 py-2 ${contentType === 'page' ? 'bg-primary text-white' : 'bg-gray-200'} rounded-md`}>Pages</button>
              </div>
              <div>
                <button onClick={() => setStatusFilter('all')} className={`px-4 py-2 ${statusFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-muted hover:bg-muted/70'} rounded-md mr-2`}>All</button>
                <button onClick={() => setStatusFilter('draft')} className={`px-4 py-2 ${statusFilter === 'draft' ? 'bg-gray-800 text-white' : 'bg-muted hover:bg-muted/70'} rounded-md mr-2`}>Drafts</button>
                <button onClick={() => setStatusFilter('published')} className={`px-4 py-2 ${statusFilter === 'published' ? 'bg-gray-800 text-white' : 'bg-muted hover:bg-muted/70'} rounded-md`}>Published</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-muted">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Edit
                    </th>
                    <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delete
                    </th>
                    <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      View
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-gray-200">
                  {blogPosts
                    .filter(post => post.contentType === contentType)
                    .filter(post => statusFilter === 'all' || post.status === statusFilter)
                    .map((post) => (
                    <tr key={post.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-[200px] truncate">
                        <div className="truncate">{post.title}</div>
                        {post.galleryImages && post.galleryImages.length > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center">
                            <PhotoIcon className="w-3 h-3 mr-1" /> {post.galleryImages.length}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-[150px]">
                        <div className="truncate">{post.category}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          post.status === 'published' 
                            ? 'bg-gg-100 text-green-800 dark:bg-gg-900/50 dark:text-green-300' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                        }`}>
                          {post.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-[100px]">
                        <div>{post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : ''}</div>
                        {post.updatedAt && post.createdAt && 
                         post.updatedAt.toDate().getTime() !== post.createdAt.toDate().getTime() && (
                          <div className="text-xs text-gray-400 italic">
                            Updated: {post.updatedAt.toDate().toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-4 text-center">
                        <button
                          onClick={() => handleEdit(post)}
                          className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
                          title="Edit"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                      </td>
                      <td className="px-3 py-4 text-center">
                        {post.status === 'draft' ? (
                          <button
                            onClick={() => handlePublish(post.id)}
                            className="text-green-600 hover:text-green-900 inline-flex items-center"
                            title="Publish"
                          >
                            <CloudArrowUpIcon className="w-5 h-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnpublish(post.id)}
                            className="text-amber-600 hover:text-amber-900 inline-flex items-center"
                            title="Unpublish"
                          >
                            <EyeSlashIcon className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-4 text-center">
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="text-red-600 hover:text-red-900 inline-flex items-center"
                          title="Delete"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <button
                          onClick={() => window.open(`/blog/${post.id}`, '_blank')}
                          className="text-gray-600 hover:text-gray-900 inline-flex items-center"
                          title="View"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 3 && (
          <motion.div
            key="tab3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-card rounded-lg shadow-sm p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Settings</h2>
              <button
                onClick={saveBlogSettings}
                className="py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center"
                disabled={settingsLoading}
              >
                {settingsLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <CheckIcon className="w-5 h-5 mr-1" />
                    Save Settings
                  </span>
                )}
              </button>
            </div>
            <div className="mb-6">
              <h3 className="text-md font-medium mb-2">Categories</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex flex-wrap gap-2 mb-4">
                  {categories.map((category, index) => (
                    <div key={index} className="flex items-center bg-card border border-gray-300 rounded-full overflow-hidden pr-1 shadow-sm group hover:shadow transition-shadow">
                      <input
                        type="text"
                        value={category}
                        onChange={(e) => handleCategoryChange(index, e.target.value)}
                        className="py-1.5 px-3 outline-none text-sm w-auto min-w-[6rem] bg-transparent"
                      />
                      <button
                        onClick={() => handleRemoveCategory(index)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-full"
                        title="Remove category"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={handleAddCategory}
                    className="flex items-center border border-dashed border-gray-300 rounded-full py-1.5 px-3 text-sm text-gray-500 hover:bg-muted transition-colors"
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Add Category
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  These categories will be available in the dropdown when creating blog posts.
                </p>
              </div>
            </div>
            <div className="mb-6">
              <h3 className="text-md font-medium mb-2">Default Tags</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <TagInput 
                  tags={tags} 
                  setTags={setTags} 
                  availableTags={availableTags} 
                  setAvailableTags={setAvailableTags} 
                />
                <p className="text-sm text-gray-500 mt-2">
                  These tags will be available as suggestions when creating new blog posts.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Replace the inline modal with the reusable component */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        title={confirmationModal.title}
        message={confirmationModal.message}
        onConfirm={confirmationModal.onConfirm}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        confirmText={confirmationModal.confirmText}
        confirmButtonClass={confirmationModal.confirmButtonClass}
      />
    </div>
  );
} 
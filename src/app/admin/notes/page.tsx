'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db, storage } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  orderBy, 
  query, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Trash2, Paperclip, X, File, ChevronLeft, Search } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Timestamp;
  attachmentName?: string;
  attachmentUrl?: string;
}

export default function NotesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    fetchNotes();
  }, [user, router]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedNotes: Note[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedNotes.push({
          id: doc.id,
          title: data.title,
          content: data.content,
          createdAt: data.createdAt,
          attachmentName: data.attachmentName,
          attachmentUrl: data.attachmentUrl
        });
      });
      
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setFileName(e.target.files[0].name);
    }
  };

  const clearFileSelection = () => {
    setFile(null);
    setFileName('');
  };

  const createNote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('Please enter a title for your note');
      return;
    }
    
    if (!content.trim()) {
      alert('Please enter some content for your note');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const noteData: Record<string, unknown> = {
        title,
        content,
        createdAt: serverTimestamp(),
        userId: user?.uid
      };
      
      // Handle file upload if file exists
      if (file) {
        const fileId = uuidv4();
        const fileExtension = file.name.split('.').pop();
        const storageRef = ref(storage, `notes/${user?.uid}/${fileId}.${fileExtension}`);
        
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);
        
        noteData.attachmentName = file.name;
        noteData.attachmentUrl = downloadUrl;
      }
      
      await addDoc(collection(db, 'notes'), noteData);
      
      // Reset form
      setTitle('');
      setContent('');
      setFile(null);
      setFileName('');
      
      // Refresh notes list
      fetchNotes();
    } catch (error) {
      console.error('Error creating note:', error);
      alert('Failed to create note. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteNote = async (noteId: string, attachmentUrl?: string) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Delete the attachment from storage if it exists
      if (attachmentUrl) {
        const storageRef = ref(storage, attachmentUrl);
        await deleteObject(storageRef);
      }
      
      // Delete the note document
      await deleteDoc(doc(db, 'notes', noteId));
      
      // Update the UI
      setNotes(notes.filter(note => note.id !== noteId));
      
      // Close the drawer if the deleted note was selected
      if (selectedNote && selectedNote.id === noteId) {
        setSelectedNote(null);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (timestamp: Timestamp | null | undefined) => {
    if (!timestamp) return 'Just now';
    
    if (timestamp.toDate) {
      const date = timestamp.toDate();
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    }
    
    return 'Just now';
  };

  // Filter notes based on search query
  const filteredNotes = notes.filter(note => {
    if (!searchQuery.trim()) return true;
    
    const lowerCaseQuery = searchQuery.toLowerCase().trim();
    return (
      note.title.toLowerCase().includes(lowerCaseQuery) ||
      note.content.toLowerCase().includes(lowerCaseQuery)
    );
  });

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Notes</h1>
      
      <div className="grid grid-cols-12 gap-6">
        {/* Create Note Form - Left Column (4/12) */}
        <div className="col-span-4">
          <div className="bg-card rounded-lg border shadow-sm p-6 sticky top-6">
            <h2 className="text-xl font-semibold mb-4">Create New Note</h2>
            
            <form onSubmit={createNote}>
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium mb-1">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                  placeholder="Note title"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="content" className="block text-sm font-medium mb-1">
                  Content
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-2 border rounded-md min-h-32 bg-background"
                  placeholder="Note content"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="attachment" className="block text-sm font-medium mb-1">
                  Attachment (optional)
                </label>
                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer flex items-center p-2 text-sm border rounded-md bg-background hover:bg-accent/50">
                    <Paperclip className="h-4 w-4 mr-2" />
                    <span>{fileName || 'Choose file'}</span>
                    <input
                      type="file"
                      id="attachment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  
                  {fileName && (
                    <button
                      type="button"
                      onClick={clearFileSelection}
                      className="p-1 rounded-full bg-background hover:bg-accent/50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <Button
                type="submit"
                variant="primary"
                isLoading={submitting}
                disabled={submitting}
                className="w-full"
              >
                Save Note
              </Button>
            </form>
          </div>
        </div>
        
        {/* Notes List - Right Column (8/12) */}
        <div className="col-span-8">
          <div className="bg-card rounded-lg border shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Your Notes</h2>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes..."
                  className="pl-9 p-2 pr-4 border rounded-md bg-background w-full md:w-64"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>Loading notes...</p>
              </div>
            ) : notes.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>No notes yet. Create your first note using the form.</p>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>No notes match your search query.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNotes.map(note => (
                  <div 
                    key={note.id} 
                    className="border rounded-md p-4 bg-background hover:bg-accent/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedNote(note)}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">{note.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(note.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Note Detail Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-full md:w-1/2 lg:w-1/3 bg-card border-l shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
          selectedNote ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedNote && (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between border-b p-4">
              <button 
                onClick={() => setSelectedNote(null)} 
                className="p-2 rounded-full bg-background hover:bg-accent/50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-semibold">Note Details</h2>
              <button
                onClick={() => deleteNote(selectedNote.id, selectedNote.attachmentUrl)}
                className="p-2 rounded-full bg-background hover:bg-accent/50 text-red-500"
                title="Delete note"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <h1 className="text-2xl font-bold mb-2">{selectedNote.title}</h1>
              <p className="text-sm text-muted-foreground mb-6">
                {formatDate(selectedNote.createdAt)}
              </p>
              
              <div className="mb-6 border-b pb-6">
                <p className="whitespace-pre-wrap">{selectedNote.content}</p>
              </div>
              
              {selectedNote.attachmentUrl && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">Attachment</h3>
                  <a
                    href={selectedNote.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-3 bg-background rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <File className="h-5 w-5 mr-3" />
                    <span>{selectedNote.attachmentName || 'Attachment'}</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Backdrop */}
      {selectedNote && (
        <div 
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setSelectedNote(null)}
        />
      )}
    </div>
  );
} 
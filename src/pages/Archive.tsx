import React, { useState, useEffect } from 'react';
import { 
  Calendar, Users, Plus, X, Pencil, Trash2, ChevronRight, Folder, FolderPlus, 
  Download, Upload, FileSpreadsheet, ExternalLink, Search, Settings, FileText, Check,
  ArrowUpDown, ArrowUp, ArrowDown, FileCheck, Layers, Columns3, FolderTree
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, setDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { useAuth } from '../lib/auth';
import { 
  ArchiveYear, DEFAULT_ARCHIVE_ROLES, ArchiveRole, ArchiveFolder, 
  ArchiveFieldDefinition, ArchiveEntry, DEFAULT_ARCHIVE_FOLDERS 
} from '../types';
import { useBackButton } from '../hooks/useBackButton';

export default function Archive() {
  const { isAdmin } = useAuth();
  
  // Data State
  const [archives, setArchives] = useState<ArchiveYear[]>([]);
  const [folders, setFolders] = useState<ArchiveFolder[]>([]);
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<ArchiveYear | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<ArchiveFolder | null>(null);
  const [selectedSubFolder, setSelectedSubFolder] = useState<string>('');
  
  useBackButton(!!selectedFolder, () => setSelectedFolder(null));

  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [editingArchive, setEditingArchive] = useState<ArchiveYear | null>(null);
  
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<ArchiveFolder | null>(null);

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ArchiveEntry | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Admin Header Management Modal State
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
  const [editingHeaderField, setEditingHeaderField] = useState<ArchiveFieldDefinition | null>(null);
  const [headerName, setHeaderName] = useState('');
  const [headerType, setHeaderType] = useState<ArchiveFieldDefinition['type']>('text');
  const [headerRequired, setHeaderRequired] = useState(false);

  // Admin Sub-folder Management Modal State
  const [isSubFolderModalOpen, setIsSubFolderModalOpen] = useState(false);
  const [newSubFolderName, setNewSubFolderName] = useState('');
  
  // Sorting State (default: descending so latest years are at top)
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Form State: Year
  const [year, setYear] = useState('');
  const [roles, setRoles] = useState<ArchiveRole[]>([]);

  // Form State: Folder & Custom Fields
  const [folderName, setFolderName] = useState('');
  const [folderDesc, setFolderDesc] = useState('');
  const [folderSubFoldersStr, setFolderSubFoldersStr] = useState('');
  const [folderFields, setFolderFields] = useState<ArchiveFieldDefinition[]>([]);

  // Form State: Entry Data
  const [entryFormData, setEntryFormData] = useState<Record<string, any>>({});

  // Form State: CSV Upload
  const [uploadPreview, setUploadPreview] = useState<Record<string, any>[]>([]);
  const [uploadFileName, setUploadFileName] = useState('');

  // Synchronize active sub-folder when selected folder changes
  useEffect(() => {
    if (selectedFolder) {
      if (selectedFolder.subFolders && selectedFolder.subFolders.length > 0) {
        if (!selectedSubFolder || !selectedFolder.subFolders.includes(selectedSubFolder)) {
          setSelectedSubFolder(selectedFolder.subFolders[0]);
        }
      } else {
        setSelectedSubFolder('');
      }
    }
  }, [selectedFolder]);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    setLoading(true);
    await Promise.all([fetchArchives(), fetchFolders(), fetchEntries()]);
    setLoading(false);
  };

  const fetchArchives = async () => {
    let fetchedArchives: ArchiveYear[] = [];

    if (!isFirebaseConfigured || !db) {
      const localArchives = localStorage.getItem('local_archives');
      if (localArchives) {
        fetchedArchives = JSON.parse(localArchives);
      }
    } else {
      try {
        const q = query(collection(db, 'archives'), orderBy('year', 'desc'));
        const snapshot = await getDocs(q);
        fetchedArchives = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArchiveYear));
      } catch (error) {
        console.error("Error fetching archives:", error);
      }
    }

    // Sort archive years descending (latest year at the top, e.g. 2026, 2025... down to oldest)
    fetchedArchives.sort((a, b) => {
      const yearA = parseInt(a.year, 10) || 0;
      const yearB = parseInt(b.year, 10) || 0;
      if (yearB !== yearA) return yearB - yearA;
      return b.year.localeCompare(a.year, undefined, { numeric: true });
    });

    setArchives(fetchedArchives);
    if (fetchedArchives.length > 0) {
      setSelectedYear(prev => {
        if (prev) {
          return fetchedArchives.find(a => a.id === prev.id) || fetchedArchives[0];
        }
        return fetchedArchives[0];
      });
    } else {
      setSelectedYear(null);
    }
  };

  const fetchFolders = async () => {
    let fetchedFolders: ArchiveFolder[] = [];

    if (!isFirebaseConfigured || !db) {
      const localFolders = localStorage.getItem('local_archive_folders');
      if (localFolders) {
        fetchedFolders = JSON.parse(localFolders);
      } else {
        fetchedFolders = DEFAULT_ARCHIVE_FOLDERS;
        localStorage.setItem('local_archive_folders', JSON.stringify(DEFAULT_ARCHIVE_FOLDERS));
      }
    } else {
      try {
        const snapshot = await getDocs(collection(db, 'archive_folders'));
        if (!snapshot.empty) {
          fetchedFolders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArchiveFolder));
        }
      } catch (error) {
        console.error("Error fetching archive folders:", error);
      }
    }

    // Merge default built-in folders if not saved in Firestore yet
    const existingIds = new Set(fetchedFolders.map(f => f.id));
    const existingNames = new Set(fetchedFolders.map(f => f.name.trim().toLowerCase()));

    DEFAULT_ARCHIVE_FOLDERS.forEach(defaultF => {
      const hasId = existingIds.has(defaultF.id);
      const hasName = existingNames.has(defaultF.name.trim().toLowerCase());
      if (!hasId && !hasName) {
        fetchedFolders.push(defaultF);
      }
    });

    // Ensure KOHHRAN COMMITTEE HUN CHAN DAN folder has all required 7 fields and the 3 sub-folders
    const committeeFolder = fetchedFolders.find(f => 
      f.id === 'kohhran_committee_hun_chan_dan' || 
      f.name.trim().toLowerCase() === 'kohhran committee hun chan dan'
    );
    if (committeeFolder) {
      const standardHeaders: ArchiveFieldDefinition[] = [
        { id: 'hming', name: 'HMING', type: 'text', required: true },
        { id: 'urlawk_zan', name: 'Urlawk Zan', type: 'text' },
        { id: 'chawhma', name: 'Chawhma', type: 'text' },
        { id: 'chawhnu', name: 'Chawhnu', type: 'text' },
        { id: 'zan', name: 'Zan', type: 'text' },
        { id: 'ruai_chhun', name: 'Ruai chhun', type: 'text' },
        { id: 'ruai_zan', name: 'Ruai zan', type: 'text' }
      ];
      // If fields are empty or missing, ensure the standard 7 columns are set
      if (!committeeFolder.fields || committeeFolder.fields.length === 0) {
        committeeFolder.fields = standardHeaders;
      }
      // Ensure sub-folders are populated with Krismas, Kumthar, Good Friday & Easter
      if (!committeeFolder.subFolders || committeeFolder.subFolders.length === 0) {
        committeeFolder.subFolders = ['Krismas', 'Kumthar', 'Good Friday & Easter'];
      }
    }

    // Save to local cache
    localStorage.setItem('local_archive_folders', JSON.stringify(fetchedFolders));

    // If Firebase is active and user is admin, automatically seed or sync KOHHRAN COMMITTEE HUN CHAN DAN to Firestore
    if (isFirebaseConfigured && db && isAdmin) {
      const targetDefault = DEFAULT_ARCHIVE_FOLDERS.find(f => f.id === 'kohhran_committee_hun_chan_dan');
      if (targetDefault && (!existingIds.has(targetDefault.id) && !existingNames.has(targetDefault.name.trim().toLowerCase()))) {
        try {
          await setDoc(doc(db, 'archive_folders', targetDefault.id), targetDefault, { merge: true });
        } catch (e) {
          console.warn("Could not auto-seed folder in Firestore:", e);
        }
      } else if (committeeFolder && (!committeeFolder.subFolders || committeeFolder.subFolders.length < 3)) {
        try {
          await updateDoc(doc(db, 'archive_folders', committeeFolder.id), {
            subFolders: ['Krismas', 'Kumthar', 'Good Friday & Easter']
          });
        } catch (e) {
          console.warn("Could not sync subFolders in Firestore:", e);
        }
      }
    }

    setFolders(fetchedFolders);
    if (fetchedFolders.length > 0) {
      setSelectedFolder(prev => {
        if (prev) {
          return fetchedFolders.find(f => f.id === prev.id) || fetchedFolders[0];
        }
        return fetchedFolders[0];
      });
    }
  };

  const fetchEntries = async () => {
    let fetchedEntries: ArchiveEntry[] = [];

    if (!isFirebaseConfigured || !db) {
      const localEntries = localStorage.getItem('local_archive_entries');
      if (localEntries) {
        fetchedEntries = JSON.parse(localEntries);
      }
    } else {
      try {
        const snapshot = await getDocs(collection(db, 'archive_entries'));
        fetchedEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArchiveEntry));
      } catch (error) {
        console.error("Error fetching archive entries:", error);
      }
    }

    setEntries(fetchedEntries);
  };

  // --- Year Modal Handlers ---
  const openYearModal = (archive?: ArchiveYear) => {
    if (archive) {
      setEditingArchive(archive);
      setYear(archive.year);
      setRoles([...archive.roles]);
    } else {
      setEditingArchive(null);
      setYear(new Date().getFullYear().toString());
      setRoles(DEFAULT_ARCHIVE_ROLES.map(r => ({ role: r, personName: '' })));
    }
    setIsYearModalOpen(true);
  };

  const handleAddRole = () => {
    setRoles([...roles, { role: '', personName: '' }]);
  };

  const handleRoleChange = (index: number, field: keyof ArchiveRole, val: string) => {
    const newRoles = [...roles];
    newRoles[index][field] = val;
    setRoles(newRoles);
  };

  const handleRemoveRole = (index: number) => {
    const newRoles = [...roles];
    newRoles.splice(index, 1);
    setRoles(newRoles);
  };

  const handleSaveYear = async () => {
    if (!year) {
      alert("Please enter a year.");
      return;
    }

    const archiveData = { year, roles };

    if (!isFirebaseConfigured || !db) {
      const updatedArchives = [...archives];
      if (editingArchive) {
        const idx = updatedArchives.findIndex(a => a.id === editingArchive.id);
        if (idx !== -1) {
          updatedArchives[idx] = { ...editingArchive, ...archiveData };
        }
      } else {
        const newArchive: ArchiveYear = {
          id: 'local_archive_' + Date.now(),
          ...archiveData
        };
        updatedArchives.push(newArchive);
      }
      
      updatedArchives.sort((a, b) => parseInt(b.year) - parseInt(a.year));
      localStorage.setItem('local_archives', JSON.stringify(updatedArchives));
      setArchives(updatedArchives);
      setIsYearModalOpen(false);
      
      const updatedItem = editingArchive ? updatedArchives.find(a => a.id === editingArchive.id) : updatedArchives[0];
      if (updatedItem) setSelectedYear(updatedItem);
      return;
    }

    try {
      if (editingArchive?.id) {
        await updateDoc(doc(db, 'archives', editingArchive.id), archiveData);
      } else {
        await addDoc(collection(db, 'archives'), archiveData);
      }
      setIsYearModalOpen(false);
      await fetchArchives();
    } catch (error) {
      console.error("Error saving archive year:", error);
      alert("Failed to save archive year.");
    }
  };

  const handleDeleteYear = async (id: string) => {
    if (!confirm("Are you sure you want to delete this archive year?")) return;
    
    if (!isFirebaseConfigured || !db) {
      const updatedArchives = archives.filter(a => a.id !== id);
      localStorage.setItem('local_archives', JSON.stringify(updatedArchives));
      setArchives(updatedArchives);
      if (selectedYear?.id === id) {
        setSelectedYear(updatedArchives[0] || null);
      }
      return;
    }

    try {
      await deleteDoc(doc(db, 'archives', id));
      await fetchArchives();
    } catch (error) {
      console.error("Error deleting archive year:", error);
    }
  };

  // --- Folder Management Handlers ---
  const openFolderModal = (folder?: ArchiveFolder) => {
    if (folder) {
      setEditingFolder(folder);
      setFolderName(folder.name);
      setFolderDesc(folder.description || '');
      setFolderSubFoldersStr(folder.subFolders ? folder.subFolders.join(', ') : '');
      setFolderFields([...folder.fields]);
    } else {
      setEditingFolder(null);
      setFolderName('');
      setFolderDesc('');
      setFolderSubFoldersStr('');
      setFolderFields([
        { id: 'f_1', name: 'Title / Subject', type: 'text', required: true },
        { id: 'f_2', name: 'Details', type: 'textarea' },
        { id: 'f_3', name: 'Date', type: 'date' }
      ]);
    }
    setIsFolderModalOpen(true);
  };

  const handleAddFieldDefinition = () => {
    const newId = 'field_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    setFolderFields([...folderFields, { id: newId, name: '', type: 'text', required: false }]);
  };

  const handleFieldChange = (index: number, key: keyof ArchiveFieldDefinition, val: any) => {
    const updated = [...folderFields];
    updated[index] = { ...updated[index], [key]: val };
    setFolderFields(updated);
  };

  const handleRemoveFieldDefinition = (index: number) => {
    if (folderFields.length <= 1) {
      alert("A folder must have at least one custom field.");
      return;
    }
    const updated = [...folderFields];
    updated.splice(index, 1);
    setFolderFields(updated);
  };

  const handleSaveFolder = async () => {
    if (!folderName.trim()) {
      alert("Please enter a folder name.");
      return;
    }

    if (folderFields.some(f => !f.name.trim())) {
      alert("All fields must have a valid field name.");
      return;
    }

    const parsedSubFolders = folderSubFoldersStr
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const folderData: Partial<ArchiveFolder> = {
      name: folderName.trim(),
      description: folderDesc.trim(),
      fields: folderFields.map(f => ({
        ...f,
        name: f.name.trim()
      })),
      ...(parsedSubFolders.length > 0 ? { subFolders: parsedSubFolders } : {})
    };

    if (!isFirebaseConfigured || !db) {
      let updatedFolders = [...folders];
      if (editingFolder) {
        updatedFolders = updatedFolders.map(f => f.id === editingFolder.id ? { ...f, ...folderData } as ArchiveFolder : f);
      } else {
        const newFolder: ArchiveFolder = {
          id: 'folder_' + Date.now(),
          name: folderData.name!,
          description: folderData.description,
          fields: folderData.fields!,
          subFolders: folderData.subFolders,
          isBuiltIn: false
        };
        updatedFolders.push(newFolder);
      }

      localStorage.setItem('local_archive_folders', JSON.stringify(updatedFolders));
      setFolders(updatedFolders);
      setIsFolderModalOpen(false);
      const activeFolder = editingFolder 
        ? updatedFolders.find(f => f.id === editingFolder.id) 
        : updatedFolders[updatedFolders.length - 1];
      if (activeFolder) setSelectedFolder(activeFolder);
      return;
    }

    try {
      if (editingFolder?.id) {
        await setDoc(doc(db, 'archive_folders', editingFolder.id), folderData, { merge: true });
      } else {
        const docRef = await addDoc(collection(db, 'archive_folders'), {
          ...folderData,
          isBuiltIn: false
        });
        folderData.id = docRef.id;
      }
      setIsFolderModalOpen(false);
      await fetchFolders();
      if (editingFolder) {
        setSelectedFolder(prev => prev ? ({ ...prev, ...folderData } as ArchiveFolder) : null);
      }
    } catch (error) {
      console.error("Error saving folder:", error);
      alert("Failed to save folder.");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder?.isBuiltIn) {
      alert("Built-in folders cannot be deleted.");
      return;
    }

    if (!confirm(`Are you sure you want to delete folder "${folder?.name}" and all its records?`)) return;

    if (!isFirebaseConfigured || !db) {
      const updatedFolders = folders.filter(f => f.id !== folderId);
      localStorage.setItem('local_archive_folders', JSON.stringify(updatedFolders));
      setFolders(updatedFolders);
      
      const updatedEntries = entries.filter(e => e.folderId !== folderId);
      localStorage.setItem('local_archive_entries', JSON.stringify(updatedEntries));
      setEntries(updatedEntries);

      if (selectedFolder?.id === folderId) {
        setSelectedFolder(updatedFolders[0] || null);
      }
      return;
    }

    try {
      await deleteDoc(doc(db, 'archive_folders', folderId));
      await fetchFolders();
    } catch (error) {
      console.error("Error deleting folder:", error);
    }
  };

  // --- Dynamic Table Header Creation & Management Handlers ---
  const openAddHeaderModal = () => {
    setEditingHeaderField(null);
    setHeaderName('');
    setHeaderType('text');
    setHeaderRequired(false);
    setIsHeaderModalOpen(true);
  };

  const openEditHeaderModal = (field: ArchiveFieldDefinition) => {
    setEditingHeaderField(field);
    setHeaderName(field.name);
    setHeaderType(field.type);
    setHeaderRequired(field.required || false);
    setIsHeaderModalOpen(true);
  };

  const handleSaveHeader = async () => {
    if (!selectedFolder) return;
    const trimmed = headerName.trim();
    if (!trimmed) {
      alert("Please enter a header name.");
      return;
    }

    let updatedFields: ArchiveFieldDefinition[];

    if (editingHeaderField) {
      // Editing existing header
      updatedFields = selectedFolder.fields.map(f => {
        if (f.id === editingHeaderField.id) {
          return {
            ...f,
            name: trimmed,
            type: headerType,
            required: headerRequired
          };
        }
        return f;
      });
    } else {
      // Adding new header
      const newId = 'col_' + trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).substr(2, 4);
      const newField: ArchiveFieldDefinition = {
        id: newId,
        name: trimmed,
        type: headerType,
        required: headerRequired
      };
      updatedFields = [...selectedFolder.fields, newField];
    }

    await saveUpdatedFolderFields(updatedFields);
    setIsHeaderModalOpen(false);
  };

  const handleDeleteHeader = async (field: ArchiveFieldDefinition) => {
    if (!selectedFolder) return;
    if (selectedFolder.fields.length <= 1) {
      alert("The table must have at least one header column.");
      return;
    }

    if (!confirm(`Are you sure you want to remove header "${field.name}" from the table? Existing record values for this column will remain in the database.`)) {
      return;
    }

    const updatedFields = selectedFolder.fields.filter(f => f.id !== field.id);
    await saveUpdatedFolderFields(updatedFields);
  };

  const saveUpdatedFolderFields = async (updatedFields: ArchiveFieldDefinition[]) => {
    if (!selectedFolder) return;

    const updatedFolder: ArchiveFolder = {
      ...selectedFolder,
      fields: updatedFields
    };

    const updatedFolders = folders.map(f => f.id === selectedFolder.id ? updatedFolder : f);
    localStorage.setItem('local_archive_folders', JSON.stringify(updatedFolders));
    setFolders(updatedFolders);
    setSelectedFolder(updatedFolder);

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'archive_folders', selectedFolder.id), { fields: updatedFields }, { merge: true });
      } catch (err) {
        console.error("Error saving updated fields to Firestore:", err);
      }
    }
  };

  // --- Sub-folder Navigation & Management Handlers ---
  const openSubFolderModal = () => {
    setNewSubFolderName('');
    setIsSubFolderModalOpen(true);
  };

  const handleAddSubFolder = async () => {
    if (!selectedFolder) return;
    const trimmed = newSubFolderName.trim();
    if (!trimmed) {
      alert("Please enter a sub-folder name.");
      return;
    }

    const existing = selectedFolder.subFolders || [];
    if (existing.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      alert("A sub-folder with this name already exists.");
      return;
    }

    const updatedSubFolders = [...existing, trimmed];
    await saveUpdatedSubFolders(updatedSubFolders);
    setSelectedSubFolder(trimmed);
    setIsSubFolderModalOpen(false);
  };

  const handleDeleteSubFolder = async (subNameToDelete: string) => {
    if (!selectedFolder) return;
    if (!confirm(`Are you sure you want to delete sub-folder "${subNameToDelete}"?`)) return;

    const existing = selectedFolder.subFolders || [];
    const updatedSubFolders = existing.filter(s => s !== subNameToDelete);
    await saveUpdatedSubFolders(updatedSubFolders);
    if (selectedSubFolder === subNameToDelete) {
      setSelectedSubFolder(updatedSubFolders[0] || '');
    }
  };

  const saveUpdatedSubFolders = async (updatedSubFolders: string[]) => {
    if (!selectedFolder) return;

    const updatedFolder: ArchiveFolder = {
      ...selectedFolder,
      subFolders: updatedSubFolders
    };

    const updatedFolders = folders.map(f => f.id === selectedFolder.id ? updatedFolder : f);
    localStorage.setItem('local_archive_folders', JSON.stringify(updatedFolders));
    setFolders(updatedFolders);
    setSelectedFolder(updatedFolder);

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'archive_folders', selectedFolder.id), { subFolders: updatedSubFolders }, { merge: true });
      } catch (err) {
        console.error("Error saving sub-folders to Firestore:", err);
      }
    }
  };

  // Count records in a subfolder
  const getSubFolderCount = (subName: string) => {
    if (!selectedFolder || !selectedYear) return 0;
    const firstSub = selectedFolder.subFolders?.[0];
    return entries.filter(e => 
      e.archiveYearId === selectedYear.id && 
      e.folderId === selectedFolder.id && 
      (e.subFolder === subName || (!e.subFolder && subName === firstSub))
    ).length;
  };

  // Helper to safely get field value by ID, Name, or case-insensitive key
  const getRecordFieldValue = (record: ArchiveEntry, field: ArchiveFieldDefinition): string => {
    if (!record || !record.data) return '';
    // 1. Exact match on field.id
    if (record.data[field.id] !== undefined && record.data[field.id] !== null && record.data[field.id] !== '') {
      return String(record.data[field.id]);
    }
    // 2. Exact match on field.name
    if (record.data[field.name] !== undefined && record.data[field.name] !== null && record.data[field.name] !== '') {
      return String(record.data[field.name]);
    }
    // 3. Normalized / case-insensitive match
    const cleanFieldName = field.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanFieldId = field.id.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const [k, v] of Object.entries(record.data)) {
      if (v !== undefined && v !== null && v !== '') {
        const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanK === cleanFieldName || cleanK === cleanFieldId) {
          return String(v);
        }
      }
    }
    return '';
  };

  // --- Entry Handlers ---
  const openEntryModal = (entry?: ArchiveEntry) => {
    if (!selectedFolder || !selectedYear) return;

    if (entry) {
      setEditingEntry(entry);
      const initial: Record<string, any> = {};
      selectedFolder.fields.forEach(f => {
        initial[f.id] = getRecordFieldValue(entry, f);
      });
      setEntryFormData(initial);
    } else {
      setEditingEntry(null);
      const initial: Record<string, any> = {};
      selectedFolder.fields.forEach(f => {
        initial[f.id] = '';
      });
      setEntryFormData(initial);
    }
    setIsEntryModalOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!selectedFolder || !selectedYear) return;

    // Check required fields
    for (const f of selectedFolder.fields) {
      if (f.required && !entryFormData[f.id]?.toString().trim()) {
        alert(`Field "${f.name}" is required.`);
        return;
      }
    }

    const entryData: any = {
      archiveYearId: selectedYear.id,
      folderId: selectedFolder.id,
      data: entryFormData,
      createdAt: new Date().toISOString()
    };

    if (selectedFolder.subFolders && selectedFolder.subFolders.length > 0) {
      entryData.subFolder = selectedSubFolder || selectedFolder.subFolders[0];
    }

    // Special sync for Office Bearers folder to keep selectedYear.roles updated
    if (selectedFolder.id === 'office_bearers') {
      const updatedRoleList = [...(selectedYear.roles || [])];
      const roleVal = entryFormData['role'] || entryFormData['Post / Committee Role'] || '';
      const personVal = entryFormData['personName'] || entryFormData['Rawngbawltu Name'] || '';
      const phoneVal = entryFormData['phone'] || '';
      const remarksVal = entryFormData['remarks'] || '';

      if (roleVal || personVal) {
        if (editingEntry) {
          // If role matches, edit it or add
          const idx = updatedRoleList.findIndex(r => r.role === roleVal || r.personName === personVal);
          if (idx !== -1) {
            updatedRoleList[idx] = { role: roleVal, personName: personVal, phone: phoneVal, remarks: remarksVal };
          } else {
            updatedRoleList.push({ role: roleVal, personName: personVal, phone: phoneVal, remarks: remarksVal });
          }
        } else {
          updatedRoleList.push({ role: roleVal, personName: personVal, phone: phoneVal, remarks: remarksVal });
        }

        // Sync to year
        if (!isFirebaseConfigured || !db) {
          const updatedArchives = archives.map(a => a.id === selectedYear.id ? { ...a, roles: updatedRoleList } : a);
          localStorage.setItem('local_archives', JSON.stringify(updatedArchives));
          setArchives(updatedArchives);
          setSelectedYear({ ...selectedYear, roles: updatedRoleList });
        } else {
          try {
            await updateDoc(doc(db, 'archives', selectedYear.id), { roles: updatedRoleList });
            setSelectedYear({ ...selectedYear, roles: updatedRoleList });
          } catch (e) {
            console.error("Error syncing year roles:", e);
          }
        }
      }
    }

    if (!isFirebaseConfigured || !db) {
      let updatedEntries = [...entries];
      if (editingEntry && !editingEntry.id.startsWith('role_legacy_')) {
        updatedEntries = updatedEntries.map(e => e.id === editingEntry.id ? { 
          ...e, 
          data: entryFormData,
          subFolder: editingEntry.subFolder || (selectedFolder.subFolders && selectedFolder.subFolders.length > 0 ? (selectedSubFolder || selectedFolder.subFolders[0]) : undefined)
        } : e);
      } else {
        const newEntry: ArchiveEntry = {
          id: 'entry_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          ...entryData
        };
        updatedEntries.push(newEntry);
      }

      localStorage.setItem('local_archive_entries', JSON.stringify(updatedEntries));
      setEntries(updatedEntries);
      setIsEntryModalOpen(false);
      return;
    }

    try {
      if (editingEntry?.id && !editingEntry.id.startsWith('role_legacy_')) {
        const updatePayload: any = {
          archiveYearId: selectedYear.id,
          folderId: selectedFolder.id,
          data: entryFormData,
          updatedAt: new Date().toISOString()
        };
        if (selectedFolder.subFolders && selectedFolder.subFolders.length > 0) {
          updatePayload.subFolder = editingEntry.subFolder || selectedSubFolder || selectedFolder.subFolders[0];
        }
        await setDoc(doc(db, 'archive_entries', editingEntry.id), updatePayload, { merge: true });
      } else {
        await addDoc(collection(db, 'archive_entries'), entryData);
      }
      setIsEntryModalOpen(false);
      await fetchEntries();
    } catch (error) {
      console.error("Error saving archive entry:", error);
      alert("Failed to save entry.");
    }
  };

  const handleDeleteEntry = async (recordOrId: ArchiveEntry | string) => {
    const entryId = typeof recordOrId === 'string' ? recordOrId : recordOrId.id;
    const entryRecord = typeof recordOrId === 'string' ? entries.find(e => e.id === recordOrId) : recordOrId;
    
    // Generate helpful name for confirmation prompt
    let recordLabel = '';
    if (entryRecord && entryRecord.data) {
      const firstVal = Object.values(entryRecord.data).find(v => v && String(v).trim());
      if (firstVal) recordLabel = ` "${firstVal}"`;
    }

    if (!confirm(`Are you sure you want to delete this archive record${recordLabel}?`)) return;

    // Handle legacy role deletion
    if (entryId.startsWith('role_legacy_') && selectedYear) {
      const idx = parseInt(entryId.replace('role_legacy_', ''), 10);
      const updatedRoles = [...(selectedYear.roles || [])];
      if (!isNaN(idx) && idx >= 0 && idx < updatedRoles.length) {
        updatedRoles.splice(idx, 1);
        
        if (!isFirebaseConfigured || !db) {
          const updatedArchives = archives.map(a => a.id === selectedYear.id ? { ...a, roles: updatedRoles } : a);
          localStorage.setItem('local_archives', JSON.stringify(updatedArchives));
          setArchives(updatedArchives);
          setSelectedYear({ ...selectedYear, roles: updatedRoles });
        } else {
          try {
            await updateDoc(doc(db, 'archives', selectedYear.id), { roles: updatedRoles });
            setSelectedYear({ ...selectedYear, roles: updatedRoles });
            await fetchArchives();
          } catch (e) {
            console.error("Error deleting legacy role:", e);
          }
        }
        return;
      }
    }

    if (!isFirebaseConfigured || !db) {
      const updatedEntries = entries.filter(e => e.id !== entryId);
      localStorage.setItem('local_archive_entries', JSON.stringify(updatedEntries));
      setEntries(updatedEntries);
      return;
    }

    try {
      await deleteDoc(doc(db, 'archive_entries', entryId));
      await fetchEntries();
    } catch (error) {
      console.error("Error deleting entry:", error);
      alert("Failed to delete record from database.");
    }
  };

  const handleDeleteAllEntriesInFolder = async () => {
    if (!selectedFolder || !selectedYear) return;
    const currentList = getCurrentDisplayEntries();
    if (currentList.length === 0) return;

    const subNotice = (selectedFolder.subFolders && selectedFolder.subFolders.length > 0 && selectedSubFolder)
      ? ` > "${selectedSubFolder}"`
      : '';

    if (!confirm(`Are you sure you want to delete ALL ${currentList.length} records in "${selectedFolder.name}${subNotice}" for ${selectedYear.year}? This action cannot be undone.`)) {
      return;
    }

    if (!isFirebaseConfigured || !db) {
      const remainingEntries = entries.filter(e => !currentList.some(cl => cl.id === e.id));
      localStorage.setItem('local_archive_entries', JSON.stringify(remainingEntries));
      setEntries(remainingEntries);

      if (selectedFolder.id === 'office_bearers') {
        const updatedArchives = archives.map(a => a.id === selectedYear.id ? { ...a, roles: [] } : a);
        localStorage.setItem('local_archives', JSON.stringify(updatedArchives));
        setArchives(updatedArchives);
        setSelectedYear({ ...selectedYear, roles: [] });
      }
      alert(`Deleted ${currentList.length} records.`);
      return;
    }

    try {
      for (const entry of currentList) {
        if (entry.id && !entry.id.startsWith('role_legacy_')) {
          await deleteDoc(doc(db, 'archive_entries', entry.id));
        }
      }

      if (selectedFolder.id === 'office_bearers') {
        await updateDoc(doc(db, 'archives', selectedYear.id), { roles: [] });
        setSelectedYear({ ...selectedYear, roles: [] });
        await fetchArchives();
      }

      await fetchEntries();
      alert(`Successfully deleted ${currentList.length} records.`);
    } catch (error) {
      console.error("Error deleting all entries:", error);
      alert("Failed to delete all records.");
    }
  };

  // --- Excel & CSV Export / Template Handlers ---
  const downloadExcelTemplate = () => {
    if (!selectedFolder) return;

    const headers = selectedFolder.fields.map(f => f.name);
    // Create realistic sample row for the folder
    let sampleRow: string[] = [];
    if (selectedFolder.id === 'kohhran_committee_hun_chan_dan' || selectedFolder.name.includes('KOHHRAN COMMITTEE HUN CHAN DAN')) {
      sampleRow = ['Pu Lallawmawma', 'Tantu', 'Thuhriltu', 'Hruaitu', 'Thuhriltu', 'Puanphurtu', 'Ruai hruaitu'];
    } else if (selectedFolder.id === 'office_bearers') {
      sampleRow = ['Kohhran Chairman', 'Pu RK Thanga', '9862000000', 'Senior Elder'];
    } else {
      sampleRow = selectedFolder.fields.map(f => {
        if (f.type === 'date') return '2026-10-15';
        if (f.type === 'number') return '100';
        if (f.type === 'file') return 'https://example.com/document.pdf';
        return `Sample ${f.name}`;
      });
    }

    const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    worksheet['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 5, 16) }));

    const workbook = XLSX.utils.book_new();
    const safeSheetName = `${selectedFolder.name.substring(0, 18)} ${selectedSubFolder || ''}`.trim().substring(0, 31).replace(/[\\/?*[\]]/g, '');
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName || 'Template');

    const subPart = selectedSubFolder ? `_${selectedSubFolder.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
    const cleanFileName = `${selectedFolder.name.replace(/[^a-zA-Z0-9]/g, '_')}${subPart}_template.xlsx`;
    XLSX.writeFile(workbook, cleanFileName);
  };

  const downloadCSVTemplate = () => {
    if (!selectedFolder) return;

    const headers = selectedFolder.fields.map(f => f.name);
    let exampleRow: string[] = [];
    if (selectedFolder.id === 'kohhran_committee_hun_chan_dan' || selectedFolder.name.includes('KOHHRAN COMMITTEE HUN CHAN DAN')) {
      exampleRow = ['Pu Lallawmawma', 'Tantu', 'Thuhriltu', 'Hruaitu', 'Thuhriltu', 'Puanphurtu', 'Ruai hruaitu'];
    } else {
      exampleRow = selectedFolder.fields.map(f => {
        if (f.type === 'date') return 'YYYY-MM-DD';
        if (f.type === 'number') return '123';
        if (f.type === 'file') return 'https://example.com/file.pdf';
        return `Sample ${f.name}`;
      });
    }

    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      exampleRow.map(c => `"${c.replace(/"/g, '""')}"`).join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const subPart = selectedSubFolder ? `_${selectedSubFolder.replace(/[^a-z0-9]/gi, '_').toLowerCase()}` : '';
    link.setAttribute('download', `${selectedFolder.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}${subPart}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportFolderExcel = () => {
    if (!selectedFolder || !selectedYear) return;

    const currentRecords = getCurrentDisplayEntries();
    const headers = selectedFolder.fields.map(f => f.name);

    const rows = currentRecords.map(rec => {
      return selectedFolder.fields.map(f => getRecordFieldValue(rec, f));
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Auto-fit column widths nicely based on content
    const colWidths = headers.map((header, colIdx) => {
      let maxLen = header.length;
      rows.forEach(row => {
        const cellLen = (row[colIdx] ?? '').toString().length;
        if (cellLen > maxLen) maxLen = cellLen;
      });
      return { wch: Math.min(Math.max(maxLen + 4, 14), 45) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    const safeSheetName = `${selectedFolder.name.substring(0, 18)} ${selectedSubFolder || ''}`.trim().substring(0, 31).replace(/[\\/?*[\]]/g, '');
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName || 'Archive');

    const subPart = selectedSubFolder ? `_${selectedSubFolder.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
    const cleanFileName = `${selectedFolder.name.replace(/[^a-zA-Z0-9]/g, '_')}${subPart}_${selectedYear.year}.xlsx`;
    XLSX.writeFile(workbook, cleanFileName);
  };

  const exportCurrentFolderCSV = () => {
    if (!selectedFolder || !selectedYear) return;

    const currentRecords = getCurrentDisplayEntries();
    const headers = selectedFolder.fields.map(f => f.name);

    const rows = currentRecords.map(rec => {
      return selectedFolder.fields.map(f => getRecordFieldValue(rec, f));
    });

    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const subPart = selectedSubFolder ? `_${selectedSubFolder.replace(/[^a-z0-9]/gi, '_').toLowerCase()}` : '';
    link.setAttribute('download', `${selectedYear.year}_${selectedFolder.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}${subPart}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Unified Excel (.xlsx, .xls) and CSV Import Handler ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFolder) return;

    setUploadFileName(file.name);
    const fileNameLower = file.name.toLowerCase();

    try {
      let rawGrid: any[][] = [];

      if (fileNameLower.endsWith('.csv')) {
        const text = await file.text();
        rawGrid = parseCSV(text);
      } else {
        // Excel file (.xlsx, .xls)
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          alert("The uploaded Excel workbook contains no sheets.");
          return;
        }
        const worksheet = workbook.Sheets[firstSheetName];
        rawGrid = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
      }

      if (!rawGrid || rawGrid.length < 2) {
        alert("The uploaded file is empty or missing data rows.");
        return;
      }

      // Detect header row by scanning first 5 rows for highest match count
      let headerRowIndex = 0;
      let maxMatches = -1;

      for (let r = 0; r < Math.min(5, rawGrid.length); r++) {
        const row = rawGrid[r] || [];
        const rowStrings = row.map((cell: any) => (cell ?? '').toString().trim().toLowerCase());
        let matches = 0;
        selectedFolder.fields.forEach(field => {
          const fn = field.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          const fi = field.id.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (rowStrings.some((s: string) => {
            const cleanS = s.replace(/[^a-z0-9]/g, '');
            return cleanS === fn || cleanS === fi;
          })) {
            matches++;
          }
        });
        if (matches > maxMatches) {
          maxMatches = matches;
          headerRowIndex = r;
        }
      }

      const rawHeaders = (rawGrid[headerRowIndex] || []).map((h: any) => (h ?? '').toString().trim());
      const headerNamesLower = rawHeaders.map(h => h.toLowerCase());
      const dataRows = rawGrid.slice(headerRowIndex + 1);

      const mappedEntries: Record<string, any>[] = [];

      dataRows.forEach(row => {
        if (!Array.isArray(row)) return;
        const rowData: Record<string, any> = {};
        let hasValue = false;

        selectedFolder.fields.forEach((field, fIdx) => {
          const fieldNameLower = field.name.trim().toLowerCase();
          const cleanFieldName = fieldNameLower.replace(/[^a-z0-9]/g, '');
          const cleanFieldId = field.id.toLowerCase().replace(/[^a-z0-9]/g, '');

          // Find matching column index in file
          let colIdx = headerNamesLower.findIndex(h => {
            const cleanH = h.replace(/[^a-z0-9]/g, '');
            return cleanH === cleanFieldName || cleanH === cleanFieldId;
          });

          // Fallback to column index if no headers matched at all
          if (colIdx === -1 && maxMatches === 0 && row[fIdx] !== undefined) {
            colIdx = fIdx;
          }

          if (colIdx !== -1 && row[colIdx] !== undefined && row[colIdx] !== null) {
            const val = String(row[colIdx]).trim();
            rowData[field.id] = val;
            if (val) hasValue = true;
          } else {
            rowData[field.id] = '';
          }
        });

        // Fallback: if not mapped yet, map by index position if row has content
        if (!hasValue && row.some((c: any) => c !== undefined && c !== null && String(c).trim() !== '')) {
          selectedFolder.fields.forEach((field, i) => {
            if (row[i] !== undefined && row[i] !== null) {
              const val = String(row[i]).trim();
              rowData[field.id] = val;
              if (val) hasValue = true;
            }
          });
        }

        if (hasValue) {
          mappedEntries.push(rowData);
        }
      });

      if (mappedEntries.length === 0) {
        alert("No valid data rows could be imported from the file. Please check column headers.");
        return;
      }

      setUploadPreview(mappedEntries);
      setIsUploadModalOpen(true);
    } catch (err: any) {
      console.error("Error reading file:", err);
      alert("Failed to read file: " + (err?.message || "Unknown error"));
    } finally {
      e.target.value = '';
    }
  };

  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let currentRow: string[] = [];
    let currentVal = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          currentVal += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          currentVal += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentRow.push(currentVal.trim());
          currentVal = '';
        } else if (char === '\r' || char === '\n') {
          if (char === '\r' && nextChar === '\n') i++;
          currentRow.push(currentVal.trim());
          if (currentRow.some(c => c.length > 0)) lines.push(currentRow);
          currentRow = [];
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
    }
    if (currentVal || currentRow.length > 0) {
      currentRow.push(currentVal.trim());
      if (currentRow.some(c => c.length > 0)) lines.push(currentRow);
    }
    return lines;
  };

  const handleConfirmImport = async () => {
    if (!selectedFolder || !selectedYear || uploadPreview.length === 0) return;

    const targetSubFolder = (selectedFolder.subFolders && selectedFolder.subFolders.length > 0)
      ? (selectedSubFolder || selectedFolder.subFolders[0])
      : undefined;

    const newEntries: ArchiveEntry[] = uploadPreview.map(itemData => ({
      id: 'entry_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      archiveYearId: selectedYear.id,
      folderId: selectedFolder.id,
      subFolder: targetSubFolder,
      data: itemData,
      createdAt: new Date().toISOString()
    }));

    // If importing into office_bearers, update selectedYear.roles as well
    if (selectedFolder.id === 'office_bearers') {
      const newRoles: ArchiveRole[] = uploadPreview.map(d => ({
        role: d['role'] || d['Post / Committee Role'] || Object.values(d)[0] || '',
        personName: d['personName'] || d['Rawngbawltu Name'] || Object.values(d)[1] || '',
        phone: d['phone'] || '',
        remarks: d['remarks'] || ''
      }));

      const combinedRoles = [...(selectedYear.roles || []), ...newRoles];

      if (!isFirebaseConfigured || !db) {
        const updatedArchives = archives.map(a => a.id === selectedYear.id ? { ...a, roles: combinedRoles } : a);
        localStorage.setItem('local_archives', JSON.stringify(updatedArchives));
        setArchives(updatedArchives);
        setSelectedYear({ ...selectedYear, roles: combinedRoles });
      } else {
        try {
          await updateDoc(doc(db, 'archives', selectedYear.id), { roles: combinedRoles });
          setSelectedYear({ ...selectedYear, roles: combinedRoles });
        } catch (e) {
          console.error("Error updating year roles on import:", e);
        }
      }
    }

    if (!isFirebaseConfigured || !db) {
      const updatedEntries = [...entries, ...newEntries];
      localStorage.setItem('local_archive_entries', JSON.stringify(updatedEntries));
      setEntries(updatedEntries);
      setIsUploadModalOpen(false);
      setUploadPreview([]);
      alert(`Successfully imported ${newEntries.length} records!`);
      return;
    }

    try {
      for (const entry of newEntries) {
        const payload: any = {
          archiveYearId: entry.archiveYearId,
          folderId: entry.folderId,
          data: entry.data,
          createdAt: entry.createdAt
        };
        if (entry.subFolder) {
          payload.subFolder = entry.subFolder;
        }
        await addDoc(collection(db, 'archive_entries'), payload);
      }
      setIsUploadModalOpen(false);
      setUploadPreview([]);
      await fetchEntries();
      alert(`Successfully imported ${newEntries.length} records!`);
    } catch (error) {
      console.error("Error importing entries:", error);
      alert("Failed to import entries into database.");
    }
  };

  // Helper to extract a 4-digit year or numeric value from a string / any value
  const extractYearOrNumeric = (val: any): { isYear: boolean; num: number; raw: string } => {
    if (val === null || val === undefined) return { isYear: false, num: -Infinity, raw: '' };
    const str = String(val).trim();
    if (!str) return { isYear: false, num: -Infinity, raw: '' };

    // Look for 4-digit years (e.g. "1992", "2023", "1991-1992", "1991-92")
    const yearMatch = str.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/);
    if (yearMatch) {
      return { isYear: true, num: parseInt(yearMatch[1], 10), raw: str };
    }

    // Look for date strings
    const dateParsed = Date.parse(str);
    if (!isNaN(dateParsed) && str.length >= 8 && (str.includes('-') || str.includes('/'))) {
      return { isYear: true, num: dateParsed, raw: str };
    }

    // Look for general pure numbers
    const cleanedNum = parseFloat(str.replace(/[^0-9.-]/g, ''));
    if (!isNaN(cleanedNum) && !/[a-zA-Z]/.test(str)) {
      return { isYear: false, num: cleanedNum, raw: str };
    }

    return { isYear: false, num: -Infinity, raw: str };
  };

  // Find year/date field in folder if sortField is not explicitly set
  const getActiveSortField = (): { fieldId: string; isYear: boolean } | null => {
    if (sortField) {
      const fieldObj = selectedFolder?.fields.find(f => f.id === sortField || f.name === sortField);
      const isYear = fieldObj 
        ? /^(kum|year|date)$/i.test(fieldObj.name) || fieldObj.name.toLowerCase().includes('kum') || fieldObj.name.toLowerCase().includes('year') || fieldObj.type === 'date' 
        : false;
      return { fieldId: sortField, isYear };
    }

    if (!selectedFolder || selectedFolder.fields.length === 0) return null;

    // 1. Look for explicit field name containing 'kum', 'year', 'date'
    const yearField = selectedFolder.fields.find(f => {
      const n = f.name.trim().toLowerCase();
      const id = f.id.trim().toLowerCase();
      return (
        n === 'kum' || n === 'year' || n === 'date' || 
        id === 'kum' || id === 'year' || id === 'date' ||
        n.includes('kum') || n.includes('year') || f.type === 'date'
      );
    });

    if (yearField) {
      return { fieldId: yearField.id, isYear: true };
    }

    // 2. Fallback to the first column (e.g. Kum / Year in imported spreadsheets)
    return { fieldId: selectedFolder.fields[0].id, isYear: false };
  };

  const handleSort = (fieldId: string) => {
    const active = getActiveSortField();
    if (active?.fieldId === fieldId) {
      setSortDirection(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(fieldId);
      const fieldObj = selectedFolder?.fields.find(f => f.id === fieldId);
      const isYearOrDate = fieldObj 
        ? /^(kum|year|date)$/i.test(fieldObj.name) || fieldObj.name.toLowerCase().includes('kum') || fieldObj.name.toLowerCase().includes('year') || fieldObj.type === 'date'
        : false;
      // Default to 'desc' (latest year at the top) for years/dates, 'asc' for names
      setSortDirection(isYearOrDate ? 'desc' : 'asc');
    }
  };

  // --- Display Entry Merger (Backward compatibility for legacy roles) ---
  const getCurrentDisplayEntries = () => {
    if (!selectedFolder || !selectedYear) return [];

    let folderEntries = entries.filter(e => {
      if (e.archiveYearId !== selectedYear.id || e.folderId !== selectedFolder.id) return false;
      if (selectedFolder.subFolders && selectedFolder.subFolders.length > 0) {
        const firstSub = selectedFolder.subFolders[0];
        if (e.subFolder) {
          return e.subFolder === selectedSubFolder;
        } else {
          // Legacy records without explicit subFolder default to the first sub-folder (e.g. Krismas)
          return selectedSubFolder === firstSub;
        }
      }
      return true;
    });

    // If active folder is office_bearers and no explicit entries exist yet, convert selectedYear.roles to dynamic display format
    if (selectedFolder.id === 'office_bearers' && folderEntries.length === 0 && selectedYear.roles && selectedYear.roles.length > 0) {
      folderEntries = selectedYear.roles.map((r, i) => ({
        id: `role_legacy_${i}`,
        archiveYearId: selectedYear.id,
        folderId: 'office_bearers',
        data: {
          role: r.role,
          personName: r.personName,
          phone: r.phone || '',
          remarks: r.remarks || ''
        }
      }));
    }

    // Apply search filter if query is present
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      folderEntries = folderEntries.filter(entry => {
        return Object.values(entry.data).some(val => 
          val && val.toString().toLowerCase().includes(q)
        );
      });
    }

    // Apply Sorting: latest years at the top, oldest year at the bottom by default
    const activeSort = getActiveSortField();
    if (activeSort) {
      const targetId = activeSort.fieldId;
      const targetName = selectedFolder?.fields.find(f => f.id === targetId)?.name || targetId;

      folderEntries.sort((a, b) => {
        const rawA = a.data[targetId] !== undefined ? a.data[targetId] : a.data[targetName];
        const rawB = b.data[targetId] !== undefined ? b.data[targetId] : b.data[targetName];

        const parsedA = extractYearOrNumeric(rawA);
        const parsedB = extractYearOrNumeric(rawB);

        // If both have extracted numbers/years
        if (parsedA.num !== -Infinity && parsedB.num !== -Infinity) {
          if (parsedA.num !== parsedB.num) {
            return sortDirection === 'desc' ? parsedB.num - parsedA.num : parsedA.num - parsedB.num;
          }
        }

        // If only one has extracted number/year
        if (parsedA.num !== -Infinity && parsedB.num === -Infinity) {
          return sortDirection === 'desc' ? -1 : 1;
        }
        if (parsedB.num !== -Infinity && parsedA.num === -Infinity) {
          return sortDirection === 'desc' ? 1 : -1;
        }

        // Fallback string locale comparison
        const strA = parsedA.raw.toLowerCase();
        const strB = parsedB.raw.toLowerCase();
        return sortDirection === 'desc'
          ? strB.localeCompare(strA, undefined, { numeric: true, sensitivity: 'base' })
          : strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    return folderEntries;
  };

  const displayEntries = getCurrentDisplayEntries();

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight uppercase">Church Archives</h1>
          <p className="mt-1 text-stone-500 font-sans text-xs uppercase tracking-widest">
            Historical records, committee minutes, and official document archives
          </p>
        </div>
        
        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <button 
                onClick={() => openFolderModal()}
                className="bg-white border border-[#ecece0] text-[#5A5A40] px-3.5 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#fcfaf7] transition font-sans flex items-center gap-1.5 shadow-sm"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                Folder Manager
              </button>

              <button 
                onClick={() => openYearModal()}
                className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2 shrink-0 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Year
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-stone-500 font-sans">Loading archives...</div>
      ) : (
        <div className="space-y-4 w-full">
          
          {/* Top Archive Controls Bar: Years & Folders */}
          <div className="bg-white rounded-2xl border border-[#e0e0d5] p-3.5 sm:p-4 shadow-sm space-y-3">
            
            {/* Row 1: Years Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-[#ecece0]">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 mr-1 text-[#5A5A40]">
                  <Calendar className="w-4 h-4" />
                  <span className="text-[11px] uppercase font-bold tracking-wider font-sans">
                    Archive Year:
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-1.5">
                  {archives.map((archive) => {
                    const isActive = selectedYear?.id === archive.id;
                    return (
                      <div key={archive.id} className="relative group flex items-center">
                        <button
                          onClick={() => setSelectedYear(archive)}
                          className={`px-3 py-1.5 rounded-xl font-serif italic text-base transition-all flex items-center gap-1.5 border ${
                            isActive
                              ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-sm font-semibold'
                              : 'bg-[#fcfaf7] text-[#2d2d2a] border-[#ecece0] hover:border-stone-400 hover:bg-white'
                          }`}
                        >
                          <span>{archive.year}</span>
                        </button>

                        {/* Admin Edit/Delete Year on Hover */}
                        {isAdmin && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ml-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); openYearModal(archive); }}
                              className="p-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200"
                              title="Edit Year"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteYear(archive.id); }}
                              className="p-1 rounded-md bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                              title="Delete Year"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {archives.length === 0 && (
                    <span className="text-xs text-stone-400 font-sans italic">No archive years found.</span>
                  )}
                </div>
              </div>

              {isAdmin && (
                <button 
                  onClick={() => openYearModal()}
                  className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40] hover:bg-[#5A5A40] hover:text-white flex items-center gap-1 font-sans px-3 py-1.5 bg-[#fcfaf7] rounded-xl border border-[#ecece0] transition"
                >
                  <Plus className="w-3 h-3" /> Add Year
                </button>
              )}
            </div>

            {/* Row 2: Folders Selector */}
            {selectedYear && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 mr-1 text-[#5A5A40]">
                    <Folder className="w-4 h-4" />
                    <span className="text-[11px] uppercase font-bold tracking-wider font-sans">
                      Folders ({selectedYear.year}):
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {folders.map((folder) => {
                      const isFolderActive = selectedFolder?.id === folder.id;
                      return (
                        <div key={folder.id} className="relative group">
                          <button
                            onClick={() => setSelectedFolder(folder)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-sans transition-all flex items-center gap-1.5 border ${
                              isFolderActive
                                ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-sm'
                                : 'bg-[#fcfaf7] text-stone-600 border-[#ecece0] hover:border-stone-400 hover:text-[#5A5A40]'
                            }`}
                          >
                            <Folder className={`w-3.5 h-3.5 ${isFolderActive ? 'text-white' : 'text-[#5A5A40]'}`} />
                            <span>{folder.name}</span>

                            {/* Admin Rename Button directly on Tab Pill */}
                            {isAdmin && (
                              <span 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  openFolderModal(folder); 
                                }}
                                className={`ml-0.5 p-0.5 rounded hover:bg-black/10 transition-colors cursor-pointer ${
                                  isFolderActive ? 'text-white/80 hover:text-white' : 'text-stone-400 hover:text-[#5A5A40]'
                                }`}
                                title="Rename / Edit Folder"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </button>

                          {/* Admin Hover Actions for Deleting custom folders */}
                          {isAdmin && !folder.isBuiltIn && (
                            <div className="absolute -top-2 -right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 bg-white shadow-md rounded-lg p-0.5 border border-[#ecece0] z-10">
                              <button 
                                onClick={(e) => { e.stopPropagation(); openFolderModal(folder); }}
                                className="p-1 hover:text-[#5A5A40] text-stone-400 rounded"
                                title="Rename or Edit Fields"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                                className="p-1 hover:text-red-500 text-stone-400 rounded"
                                title="Delete Folder"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {isAdmin && (
                  <button 
                    onClick={() => openFolderModal()}
                    className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40] hover:bg-[#5A5A40] hover:text-white flex items-center gap-1 font-sans px-3 py-1.5 bg-[#fcfaf7] rounded-xl border border-[#ecece0] transition"
                  >
                    <Plus className="w-3 h-3" /> Create Folder
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Full-Width Selected Folder Main Content Card */}
          {selectedYear ? (
            selectedFolder ? (
              <div className="bg-white rounded-2xl border border-[#e0e0d5] shadow-sm overflow-hidden w-full">
                
                {/* Header Banner */}
                <div className="p-4 sm:p-5 border-b border-[#e0e0d5] bg-[#fcfaf7]">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider font-sans">
                          {selectedYear.year} Archive Record
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-xl sm:text-2xl font-serif italic text-[#5A5A40]">
                          {selectedFolder.name}
                        </h2>
                        {isAdmin && (
                          <button 
                            onClick={() => openFolderModal(selectedFolder)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-sans font-bold text-[#5A5A40] bg-stone-200/60 hover:bg-stone-300/80 rounded-md transition"
                            title="Rename Folder or Edit Fields"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Rename / Edit</span>
                          </button>
                        )}
                      </div>
                      {selectedFolder.description && (
                        <p className="text-xs text-stone-500 font-sans mt-0.5">
                          {selectedFolder.description}
                        </p>
                      )}
                    </div>

                    {/* Top Action Toolbar */}
                    <div className="flex flex-wrap items-center gap-2">
                      
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input 
                          type="text" 
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Search records..."
                          className="pl-7 pr-3 py-1.5 bg-white border border-[#ecece0] rounded-lg text-xs font-sans focus:outline-none focus:ring-1 focus:ring-[#5A5A40] w-36 sm:w-44"
                        />
                        {searchQuery && (
                          <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Excel (.xlsx) Download Button */}
                      <button 
                        onClick={exportFolderExcel}
                        className="bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider font-sans flex items-center gap-1.5 transition shadow-sm"
                        title="Download / Export all records in this folder as Excel spreadsheet (.xlsx)"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        Download Excel
                      </button>

                      {/* Excel Template (.xlsx) */}
                      <button 
                        onClick={downloadExcelTemplate}
                        className="bg-white border border-[#ecece0] text-stone-700 hover:text-[#5A5A40] px-2.5 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider font-sans flex items-center gap-1.5 transition shadow-sm"
                        title="Download blank Excel (.xlsx) template with column headers"
                      >
                        <Download className="w-3.5 h-3.5 text-stone-500" />
                        Template
                      </button>

                      {/* Admin Import Excel (.xlsx / .xls / .csv) Button */}
                      {isAdmin && (
                        <label className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider font-sans flex items-center gap-1.5 transition cursor-pointer shadow-sm">
                          <Upload className="w-3.5 h-3.5" />
                          Import Excel
                          <input 
                            type="file" 
                            accept=".xlsx, .xls, .csv" 
                            onChange={handleFileUpload}
                            className="hidden" 
                          />
                        </label>
                      )}

                      {/* Export CSV Data Button */}
                      <button 
                        onClick={exportCurrentFolderCSV}
                        className="bg-white border border-[#ecece0] text-stone-600 hover:text-[#5A5A40] px-2 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider font-sans flex items-center gap-1 transition shadow-sm"
                        title="Export records as CSV"
                      >
                        CSV
                      </button>

                      {/* Admin Clear All Records Button */}
                      {isAdmin && displayEntries.length > 0 && (
                        <button 
                          onClick={handleDeleteAllEntriesInFolder}
                          className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition font-sans flex items-center gap-1 shrink-0 shadow-sm"
                          title="Delete all records in this folder"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                          Clear All ({displayEntries.length})
                        </button>
                      )}

                      {/* Admin Add Header Button */}
                      {isAdmin && (
                        <button 
                          onClick={openAddHeaderModal}
                          className="bg-stone-100 border border-stone-300 hover:bg-stone-200 text-stone-800 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider font-sans flex items-center gap-1.5 transition shadow-sm"
                          title="Create / Add a new column header to this table"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#5A5A40]" />
                          <Columns3 className="w-3.5 h-3.5 text-[#5A5A40]" />
                          Add Header
                        </button>
                      )}

                      {/* Admin Add Entry Button */}
                      {isAdmin && (
                        <button 
                          onClick={() => openEntryModal()}
                          className="bg-[#5A5A40] text-white px-3.5 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider hover:bg-[#4a4a35] transition font-sans flex items-center gap-1.5 shrink-0 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Record
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-Folders Navigation Bar (Displayed Before the Table) */}
                {selectedFolder.subFolders && selectedFolder.subFolders.length > 0 && (
                  <div className="bg-[#fcfaf7] border-b border-[#e0e0d5] px-4 py-2.5 sm:px-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 text-stone-500 mr-1">
                        <FolderTree className="w-4 h-4 text-[#5A5A40]" />
                        <span className="text-[10px] uppercase font-bold tracking-widest font-sans">
                          Sub-Folders:
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {selectedFolder.subFolders.map(sub => {
                          const isActive = selectedSubFolder === sub;
                          const count = getSubFolderCount(sub);

                          // Visual icon prefix for key Christian calendar festivals
                          let iconBadge = '';
                          if (/krismas|christmas/i.test(sub)) iconBadge = '🎄 ';
                          else if (/kumthar|new year/i.test(sub)) iconBadge = '🎆 ';
                          else if (/good friday|easter/i.test(sub)) iconBadge = '✝️ ';

                          return (
                            <div key={sub} className="relative group flex items-center">
                              <button
                                onClick={() => setSelectedSubFolder(sub)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sans transition-all flex items-center gap-1.5 border shadow-sm ${
                                  isActive
                                    ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                                    : 'bg-white text-stone-700 border-[#ecece0] hover:border-[#5A5A40]/50 hover:text-[#5A5A40]'
                                }`}
                              >
                                <span>{iconBadge}{sub}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                  isActive ? 'bg-white/25 text-white' : 'bg-stone-100 text-stone-500'
                                }`}>
                                  {count}
                                </span>
                              </button>

                              {/* Admin Delete Sub-Folder */}
                              {isAdmin && selectedFolder.subFolders && selectedFolder.subFolders.length > 1 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteSubFolder(sub); }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 p-1 text-stone-400 hover:text-red-500 rounded-md hover:bg-red-50"
                                  title={`Delete sub-folder "${sub}"`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Admin Add Sub-Folder Button */}
                    {isAdmin && (
                      <button
                        onClick={openSubFolderModal}
                        className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40] hover:bg-[#5A5A40] hover:text-white px-3 py-1.5 rounded-xl border border-dashed border-[#5A5A40]/40 flex items-center gap-1.5 transition font-sans bg-white shadow-xs"
                      >
                        <Plus className="w-3 h-3" /> Add Sub-Folder
                      </button>
                    )}
                  </div>
                )}

                {/* Table of Entries */}
                <div className="overflow-x-auto w-full">
                  <table className="min-w-full divide-y divide-[#ecece0] font-sans">
                    <thead className="bg-[#fcfaf7]">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest w-10">
                          #
                        </th>
                        {selectedFolder.fields.map(field => {
                          const activeSort = getActiveSortField();
                          const isSorted = activeSort?.fieldId === field.id;

                          return (
                            <th 
                              key={field.id} 
                              scope="col" 
                              className="px-4 py-3 text-left text-[10px] font-bold text-stone-500 uppercase tracking-widest whitespace-nowrap group select-none relative"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div 
                                  onClick={() => handleSort(field.id)}
                                  className="flex items-center gap-1.5 cursor-pointer hover:text-[#5A5A40] transition"
                                  title={`Click to sort by ${field.name}`}
                                >
                                  <span>{field.name}</span>
                                  {field.required && <span className="text-red-500 font-normal">*</span>}
                                  {isSorted ? (
                                    sortDirection === 'desc' ? (
                                      <ArrowDown className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />
                                    ) : (
                                      <ArrowUp className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />
                                    )
                                  ) : (
                                    <ArrowUpDown className="w-3 h-3 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                  )}
                                </div>

                                {/* Admin Header Controls: Edit & Delete */}
                                {isAdmin && (
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-stone-100/90 rounded px-1 py-0.5 border border-stone-200">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); openEditHeaderModal(field); }}
                                      className="p-0.5 text-stone-500 hover:text-[#5A5A40] transition"
                                      title={`Edit Header "${field.name}"`}
                                    >
                                      <Pencil className="w-2.5 h-2.5" />
                                    </button>
                                    {selectedFolder.fields.length > 1 && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteHeader(field); }}
                                        className="p-0.5 text-stone-400 hover:text-red-500 transition"
                                        title={`Delete Column "${field.name}"`}
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </th>
                          );
                        })}

                        {/* Admin Inline "+ Header" Column Header */}
                        {isAdmin && (
                          <th scope="col" className="px-3 py-3 text-left whitespace-nowrap w-24">
                            <button 
                              onClick={openAddHeaderModal}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-[#5A5A40] hover:text-white text-[#5A5A40] rounded-lg text-[9px] uppercase font-bold tracking-widest transition border border-dashed border-[#5A5A40]/40"
                              title="Create a new header column for this table"
                            >
                              <Plus className="w-3 h-3" /> Header
                            </button>
                          </th>
                        )}

                        {isAdmin && (
                          <th scope="col" className="px-4 py-3 text-right text-[10px] font-bold text-stone-400 uppercase tracking-widest w-20">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#ecece0]">
                      {displayEntries.map((record, index) => (
                        <tr key={record.id} className="hover:bg-[#f5f5f0]/50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-stone-400 font-mono">
                            {index + 1}
                          </td>

                          {selectedFolder.fields.map(field => {
                            const strVal = getRecordFieldValue(record, field);

                            // Render URL / File fields as clickable links
                            const isLink = field.type === 'file' || strVal.startsWith('http://') || strVal.startsWith('https://');

                            return (
                              <td key={field.id} className="px-4 py-3 text-xs font-medium text-[#2d2d2a] whitespace-normal">
                                {isLink && strVal ? (
                                  <a 
                                    href={strVal} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="inline-flex items-center gap-1.5 text-[#5A5A40] hover:underline font-bold"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                    View Attachment
                                  </a>
                                ) : (
                                  strVal || <span className="text-stone-300 font-normal italic">-</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Placeholder cell for Admin inline Header column */}
                          {isAdmin && (
                            <td className="px-3 py-3 whitespace-nowrap text-stone-200 text-xs">
                              -
                            </td>
                          )}

                          {isAdmin && (
                            <td className="px-4 py-3 whitespace-nowrap text-right text-xs">
                              <div className="flex items-center justify-end gap-1">
                                <button 
                                  onClick={() => openEntryModal(record)}
                                  className="p-1 text-stone-400 hover:text-[#5A5A40] transition rounded-md hover:bg-stone-100"
                                  title="Edit Record"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteEntry(record)}
                                  className="p-1 text-stone-400 hover:text-red-500 transition rounded-md hover:bg-red-50"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}

                      {displayEntries.length === 0 && (
                        <tr>
                          <td colSpan={selectedFolder.fields.length + (isAdmin ? 3 : 1)} className="px-6 py-12 text-center text-sm text-stone-500 italic font-sans">
                            {searchQuery ? 'No records match your search filter.' : `No entries found in "${selectedFolder.name}${selectedSubFolder ? ' > ' + selectedSubFolder : ''}" for ${selectedYear.year}. Click "Add Record" or "Import Excel" to begin.`}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-stone-500 font-sans italic bg-white border border-[#e0e0d5] rounded-2xl">
                Please select a Folder from the list above.
              </div>
            )
          ) : (
            <div className="text-center py-12 text-stone-500 font-sans italic bg-white border border-[#e0e0d5] rounded-2xl">
              Please select a Year from the archive list above to view records.
            </div>
          )}
        </div>
      )}

      {/* --- MODAL 1: Add / Edit Archive Year --- */}
      {isYearModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-2xl shadow-xl border border-[#e0e0d5] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white shrink-0">
              <h2 className="text-xl font-serif italic text-[#5A5A40]">
                {editingArchive ? `Edit Archive Year ${editingArchive.year}` : 'Add New Archive Year'}
              </h2>
              <button onClick={() => setIsYearModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 font-sans">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Year</label>
                <input 
                  type="text" 
                  value={year} 
                  onChange={e => setYear(e.target.value)}
                  placeholder="e.g. 2026"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <div className="flex justify-between items-end mb-4">
                  <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest">Default Office Bearers (Rawngbawltu)</label>
                  <button 
                    onClick={handleAddRole}
                    className="text-[#5A5A40] text-[10px] uppercase font-bold tracking-widest flex items-center hover:underline"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Role
                  </button>
                </div>
                <div className="space-y-3">
                  {roles.map((r, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <input 
                          type="text" 
                          value={r.role} 
                          onChange={e => handleRoleChange(i, 'role', e.target.value)}
                          placeholder="Role (e.g. Kohhran Chairman)"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] font-semibold text-[#5A5A40]"
                        />
                      </div>
                      <div className="flex-[2]">
                        <input 
                          type="text" 
                          value={r.personName} 
                          onChange={e => handleRoleChange(i, 'personName', e.target.value)}
                          placeholder="Person Name"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>
                      <button 
                        onClick={() => handleRemoveRole(i)}
                        className="p-3 text-stone-400 hover:text-red-500 bg-white border border-[#ecece0] rounded-xl transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {roles.length === 0 && (
                    <div className="text-sm text-stone-500 italic p-4 text-center border border-dashed border-[#ecece0] rounded-xl bg-white">
                      No roles defined. Click "Add Role" to begin.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsYearModalOpen(false)}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 font-sans border border-[#ecece0]"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveYear}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans"
              >
                Save Year
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Create / Edit Archive Folder & Custom Fields --- */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-2xl shadow-xl border border-[#e0e0d5] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white shrink-0">
              <h2 className="text-xl font-serif italic text-[#5A5A40]">
                {editingFolder ? `Manage Folder: ${editingFolder.name}` : 'Create New Archive Folder'}
              </h2>
              <button onClick={() => setIsFolderModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 font-sans">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Folder Name *</label>
                <input 
                  type="text" 
                  value={folderName} 
                  onChange={e => setFolderName(e.target.value)}
                  placeholder="e.g. Financial Reports, Committee Minutes, Sunday School"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] font-semibold text-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Description / Notes</label>
                <input 
                  type="text" 
                  value={folderDesc} 
                  onChange={e => setFolderDesc(e.target.value)}
                  placeholder="Brief description of what records are kept in this folder"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">
                  Sub-Folders (Optional, comma-separated)
                </label>
                <input 
                  type="text" 
                  value={folderSubFoldersStr} 
                  onChange={e => setFolderSubFoldersStr(e.target.value)}
                  placeholder="e.g. Krismas, Kumthar, Good Friday & Easter"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Specify sub-folders separated by commas (e.g. Krismas, Kumthar, Good Friday & Easter). Records will be partitioned by sub-folder tabs.
                </p>
              </div>

              {/* Custom Fields Definition Editor */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest">
                      Custom Fields (Columns for this Folder)
                    </label>
                    <p className="text-[11px] text-stone-400">
                      Define the custom data fields that each entry in this folder will contain.
                    </p>
                  </div>
                  <button 
                    onClick={handleAddFieldDefinition}
                    className="text-[#5A5A40] text-[10px] uppercase font-bold tracking-widest flex items-center hover:underline shrink-0"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Field
                  </button>
                </div>

                <div className="space-y-3">
                  {folderFields.map((field, idx) => (
                    <div key={field.id || idx} className="bg-white p-3.5 border border-[#ecece0] rounded-2xl flex flex-col sm:flex-row gap-3 items-center">
                      
                      {/* Field Name Input */}
                      <div className="flex-1 w-full">
                        <label className="block text-[9px] uppercase font-bold text-stone-400 mb-0.5">Field Name</label>
                        <input 
                          type="text"
                          value={field.name}
                          onChange={e => handleFieldChange(idx, 'name', e.target.value)}
                          placeholder="e.g. Document Title, Date, Author"
                          className="w-full p-2.5 border border-[#ecece0] rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>

                      {/* Field Type Select */}
                      <div className="w-full sm:w-36">
                        <label className="block text-[9px] uppercase font-bold text-stone-400 mb-0.5">Type</label>
                        <select 
                          value={field.type}
                          onChange={e => handleFieldChange(idx, 'type', e.target.value)}
                          className="w-full p-2.5 border border-[#ecece0] rounded-xl text-xs font-sans focus:outline-none focus:ring-1 focus:ring-[#5A5A40] bg-white"
                        >
                          <option value="text">Short Text</option>
                          <option value="textarea">Long Text / Paragraph</option>
                          <option value="date">Date</option>
                          <option value="number">Number</option>
                          <option value="file">File / URL Link</option>
                        </select>
                      </div>

                      {/* Required Checkbox */}
                      <div className="flex items-center gap-1.5 pt-4 sm:pt-4 shrink-0">
                        <input 
                          type="checkbox"
                          id={`req_${idx}`}
                          checked={field.required || false}
                          onChange={e => handleFieldChange(idx, 'required', e.target.checked)}
                          className="w-4 h-4 accent-[#5A5A40] rounded"
                        />
                        <label htmlFor={`req_${idx}`} className="text-xs text-stone-600 font-sans select-none cursor-pointer">
                          Required
                        </label>
                      </div>

                      {/* Delete Field */}
                      <button 
                        onClick={() => handleRemoveFieldDefinition(idx)}
                        className="p-2 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition sm:mt-4 shrink-0"
                        title="Remove Field"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsFolderModalOpen(false)}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 font-sans border border-[#ecece0]"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveFolder}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans"
              >
                Save Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: Add / Edit Record Entry --- */}
      {isEntryModalOpen && selectedFolder && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-lg shadow-xl border border-[#e0e0d5] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider font-sans block">
                  {selectedFolder.name}{selectedSubFolder ? ` > ${selectedSubFolder}` : ''} ({selectedYear?.year})
                </span>
                <h2 className="text-xl font-serif italic text-[#5A5A40]">
                  {editingEntry ? 'Edit Archive Record' : 'Add New Archive Record'}
                </h2>
              </div>
              <button onClick={() => setIsEntryModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 font-sans">
              {selectedFolder.fields.map(field => {
                const val = entryFormData[field.id] !== undefined ? entryFormData[field.id] : (entryFormData[field.name] || '');

                return (
                  <div key={field.id}>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">
                      {field.name} {field.required && <span className="text-red-500">*</span>}
                    </label>

                    {field.type === 'textarea' ? (
                      <textarea 
                        rows={3}
                        value={val}
                        onChange={e => setEntryFormData({ ...entryFormData, [field.id]: e.target.value })}
                        placeholder={`Enter ${field.name}...`}
                        className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                      />
                    ) : field.type === 'file' ? (
                      <div className="space-y-1.5">
                        <input 
                          type="text"
                          value={val}
                          onChange={e => setEntryFormData({ ...entryFormData, [field.id]: e.target.value })}
                          placeholder="Paste document / file URL (e.g. Google Drive, PDF link)"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                        <p className="text-[10px] text-stone-400">
                          Enter a valid URL or cloud storage link for attachment documents.
                        </p>
                      </div>
                    ) : (
                      <input 
                        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                        value={val}
                        onChange={e => setEntryFormData({ ...entryFormData, [field.id]: e.target.value })}
                        placeholder={`Enter ${field.name}...`}
                        className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsEntryModalOpen(false)}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 font-sans border border-[#ecece0]"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEntry}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans"
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: CSV / Excel Upload Preview Modal --- */}
      {isUploadModalOpen && selectedFolder && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-3xl shadow-xl border border-[#e0e0d5] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider font-sans block">
                  Import Preview ({uploadFileName})
                </span>
                <h2 className="text-xl font-serif italic text-[#5A5A40]">
                  Confirm Excel / CSV Import into "{selectedFolder.name}{selectedSubFolder ? ` > ${selectedSubFolder}` : ''}"
                </h2>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 font-sans">
              <div className="flex items-center justify-between text-xs text-stone-600 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                <span>
                  Found <strong>{uploadPreview.length}</strong> record(s) ready to import into <strong>{selectedFolder.name}{selectedSubFolder ? ` (${selectedSubFolder})` : ''}</strong> for <strong>{selectedYear?.year}</strong>.
                </span>
                <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider">
                  Mapped to {selectedFolder.fields.length} Custom Fields
                </span>
              </div>

              <div className="overflow-x-auto border border-[#ecece0] rounded-2xl bg-white max-h-80">
                <table className="min-w-full divide-y divide-[#ecece0] text-xs">
                  <thead className="bg-[#fcfaf7]">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-stone-400 uppercase tracking-wider">#</th>
                      {selectedFolder.fields.map(f => (
                        <th key={f.id} className="px-4 py-3 text-left font-bold text-stone-400 uppercase tracking-wider whitespace-nowrap">
                          {f.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ecece0]">
                    {uploadPreview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#f5f5f0]/50">
                        <td className="px-4 py-2.5 font-mono text-stone-400">{idx + 1}</td>
                        {selectedFolder.fields.map(f => (
                          <td key={f.id} className="px-4 py-2.5 text-stone-700 font-medium whitespace-nowrap">
                            {row[f.id] || <span className="text-stone-300 italic">-</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => { setIsUploadModalOpen(false); setUploadPreview([]); }}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 font-sans border border-[#ecece0]"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmImport}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Confirm Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 5: Admin Create / Edit Table Header --- */}
      {isHeaderModalOpen && selectedFolder && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-md shadow-xl border border-[#e0e0d5] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider font-sans block">
                  {selectedFolder.name}
                </span>
                <h2 className="text-xl font-serif italic text-[#5A5A40]">
                  {editingHeaderField ? `Edit Header: "${editingHeaderField.name}"` : 'Create New Table Header'}
                </h2>
              </div>
              <button onClick={() => setIsHeaderModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 font-sans">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">
                  Header Name / Title *
                </label>
                <input 
                  type="text" 
                  value={headerName} 
                  onChange={e => setHeaderName(e.target.value)}
                  placeholder="e.g. Ruai Chhumtu, Phone Number, Remarks"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm font-semibold text-[#5A5A40] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  autoFocus
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  This text will appear as the column header in the table and in Excel downloads.
                </p>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">
                  Data Type
                </label>
                <select 
                  value={headerType}
                  onChange={e => setHeaderType(e.target.value as any)}
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm font-sans focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                >
                  <option value="text">Short Text (e.g. Names, Roles, Duty assignments)</option>
                  <option value="textarea">Long Text / Paragraph (e.g. Descriptions, Notes)</option>
                  <option value="date">Date (YYYY-MM-DD)</option>
                  <option value="number">Number (Amounts, Counts)</option>
                  <option value="file">File / URL Link (Attachments, Google Drive)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox"
                  id="header_req_check"
                  checked={headerRequired}
                  onChange={e => setHeaderRequired(e.target.checked)}
                  className="w-4 h-4 accent-[#5A5A40] rounded"
                />
                <label htmlFor="header_req_check" className="text-xs text-stone-700 select-none cursor-pointer">
                  Required field when adding or editing a record
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsHeaderModalOpen(false)}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 font-sans border border-[#ecece0]"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveHeader}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {editingHeaderField ? 'Update Header' : 'Add Header to Table'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 6: Admin Add Sub-Folder --- */}
      {isSubFolderModalOpen && selectedFolder && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-md shadow-xl border border-[#e0e0d5] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider font-sans block">
                  {selectedFolder.name}
                </span>
                <h2 className="text-xl font-serif italic text-[#5A5A40]">
                  Add Sub-Folder
                </h2>
              </div>
              <button onClick={() => setIsSubFolderModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 font-sans">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">
                  Sub-Folder Title *
                </label>
                <input 
                  type="text" 
                  value={newSubFolderName} 
                  onChange={e => setNewSubFolderName(e.target.value)}
                  placeholder="e.g. Krismas, Kumthar, Good Friday & Easter, Centenary"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm font-semibold text-[#5A5A40] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  autoFocus
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Records in this folder will be segregated under this sub-folder tab.
                </p>
              </div>

              {selectedFolder.subFolders && selectedFolder.subFolders.length > 0 && (
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1.5">
                    Existing Sub-Folders
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedFolder.subFolders.map(s => (
                      <span key={s} className="px-2.5 py-1 bg-white border border-[#ecece0] rounded-lg text-xs font-semibold text-stone-600">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsSubFolderModalOpen(false)}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 font-sans border border-[#ecece0]"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddSubFolder}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Sub-Folder
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

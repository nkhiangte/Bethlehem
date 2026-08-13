import React, { useState, useEffect } from 'react';
import { 
  Calendar, Users, Plus, X, Pencil, Trash2, ChevronRight, Folder, FolderPlus, 
  Download, Upload, FileSpreadsheet, ExternalLink, Search, Settings, FileText, Check 
} from 'lucide-react';
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
  
  // Form State: Year
  const [year, setYear] = useState('');
  const [roles, setRoles] = useState<ArchiveRole[]>([]);

  // Form State: Folder & Custom Fields
  const [folderName, setFolderName] = useState('');
  const [folderDesc, setFolderDesc] = useState('');
  const [folderFields, setFolderFields] = useState<ArchiveFieldDefinition[]>([]);

  // Form State: Entry Data
  const [entryFormData, setEntryFormData] = useState<Record<string, any>>({});

  // Form State: CSV Upload
  const [uploadPreview, setUploadPreview] = useState<Record<string, any>[]>([]);
  const [uploadFileName, setUploadFileName] = useState('');

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
          // Merge default built-in folders if not saved in Firestore yet
          const existingIds = new Set(fetchedFolders.map(f => f.id));
          DEFAULT_ARCHIVE_FOLDERS.forEach(defaultF => {
            if (!existingIds.has(defaultF.id)) {
              fetchedFolders.push(defaultF);
            }
          });
        } else {
          // Initialize defaults if empty
          fetchedFolders = DEFAULT_ARCHIVE_FOLDERS;
        }
      } catch (error) {
        console.error("Error fetching archive folders:", error);
        fetchedFolders = DEFAULT_ARCHIVE_FOLDERS;
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
      setFolderFields([...folder.fields]);
    } else {
      setEditingFolder(null);
      setFolderName('');
      setFolderDesc('');
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

    const folderData: Partial<ArchiveFolder> = {
      name: folderName.trim(),
      description: folderDesc.trim(),
      fields: folderFields.map(f => ({
        ...f,
        name: f.name.trim()
      }))
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

  // --- Entry Handlers ---
  const openEntryModal = (entry?: ArchiveEntry) => {
    if (!selectedFolder || !selectedYear) return;

    if (entry) {
      setEditingEntry(entry);
      setEntryFormData({ ...entry.data });
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

    const entryData = {
      archiveYearId: selectedYear.id,
      folderId: selectedFolder.id,
      data: entryFormData,
      createdAt: new Date().toISOString()
    };

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
      if (editingEntry) {
        updatedEntries = updatedEntries.map(e => e.id === editingEntry.id ? { ...e, data: entryFormData } : e);
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
      if (editingEntry?.id) {
        await updateDoc(doc(db, 'archive_entries', editingEntry.id), { data: entryFormData });
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

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this archive record?")) return;

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
    }
  };

  // --- CSV Template & Export Handlers ---
  const downloadCSVTemplate = () => {
    if (!selectedFolder) return;

    const headers = selectedFolder.fields.map(f => f.name);
    // Create an example row
    const exampleRow = selectedFolder.fields.map(f => {
      if (f.type === 'date') return 'YYYY-MM-DD';
      if (f.type === 'number') return '123';
      if (f.type === 'file') return 'https://example.com/file.pdf';
      return `Sample ${f.name}`;
    });

    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      exampleRow.map(c => `"${c.replace(/"/g, '""')}"`).join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedFolder.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCurrentFolderCSV = () => {
    if (!selectedFolder || !selectedYear) return;

    const currentRecords = getCurrentDisplayEntries();
    const headers = selectedFolder.fields.map(f => f.name);

    const rows = currentRecords.map(rec => {
      return selectedFolder.fields.map(f => {
        const val = rec.data[f.id] || rec.data[f.name] || '';
        return (val ?? '').toString();
      });
    });

    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedYear.year}_${selectedFolder.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CSV Import Parser ---
  const handleCSVFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFolder) return;

    setUploadFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const parsedLines = parseCSV(text);
      if (parsedLines.length < 2) {
        alert("The uploaded CSV file is empty or missing data rows.");
        return;
      }

      const headers = parsedLines[0].map(h => h.trim().toLowerCase());
      const dataRows = parsedLines.slice(1);

      // Map header strings to field IDs
      const mappedEntries: Record<string, any>[] = [];

      dataRows.forEach(row => {
        const rowData: Record<string, any> = {};
        let hasValue = false;

        selectedFolder.fields.forEach(field => {
          const fieldNameLower = field.name.trim().toLowerCase();
          // Find matching column index
          const colIdx = headers.findIndex(h => h === fieldNameLower || h.includes(fieldNameLower) || fieldNameLower.includes(h));

          if (colIdx !== -1 && row[colIdx] !== undefined) {
            rowData[field.id] = row[colIdx].trim();
            if (row[colIdx].trim()) hasValue = true;
          } else {
            rowData[field.id] = '';
          }
        });

        // Fallback: if header index didn't match cleanly, map by index position
        if (!hasValue && row.length > 0) {
          selectedFolder.fields.forEach((field, i) => {
            if (row[i] !== undefined) {
              rowData[field.id] = row[i].trim();
              if (row[i].trim()) hasValue = true;
            }
          });
        }

        if (hasValue) {
          mappedEntries.push(rowData);
        }
      });

      setUploadPreview(mappedEntries);
      setIsUploadModalOpen(true);
    };

    reader.readAsText(file);
    e.target.value = '';
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

    const newEntries: ArchiveEntry[] = uploadPreview.map(itemData => ({
      id: 'entry_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      archiveYearId: selectedYear.id,
      folderId: selectedFolder.id,
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
        await addDoc(collection(db, 'archive_entries'), {
          archiveYearId: entry.archiveYearId,
          folderId: entry.folderId,
          data: entry.data,
          createdAt: entry.createdAt
        });
      }
      setIsUploadModalOpen(false);
      setUploadPreview([]);
      await fetchEntries();
      alert(`Successfully imported ${newEntries.length} records!`);
    } catch (error) {
      console.error("Error importing entries:", error);
      alert("Failed to import CSV entries.");
    }
  };

  // --- Display Entry Merger (Backward compatibility for legacy roles) ---
  const getCurrentDisplayEntries = () => {
    if (!selectedFolder || !selectedYear) return [];

    let folderEntries = entries.filter(e => e.archiveYearId === selectedYear.id && e.folderId === selectedFolder.id);

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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Archive Year Selector */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xs uppercase tracking-widest font-bold text-stone-400 font-sans">
                Archive Years
              </h2>
            </div>

            <div className="space-y-2.5 max-h-[75vh] overflow-y-auto pr-1">
              {archives.map((archive) => {
                const isActive = selectedYear?.id === archive.id;

                return (
                  <div
                    key={archive.id}
                    className={`group relative rounded-[20px] border transition-all ${
                      isActive
                        ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-md'
                        : 'bg-white text-[#2d2d2a] border-[#e0e0d5] hover:border-stone-400'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedYear(archive)}
                      className="w-full text-left p-3.5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 pr-8">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 font-sans ${
                          isActive ? 'bg-white/20 text-white' : 'bg-[#fcfaf7] border border-[#ecece0] text-[#5A5A40]'
                        }`}>
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-serif italic text-base leading-tight">
                            {archive.year}
                          </h3>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                        isActive ? 'text-white/80' : 'text-stone-300'
                      }`} />
                    </button>

                    {/* Admin Edit/Delete Year */}
                    {isAdmin && (
                      <div className="absolute top-2.5 right-8 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); openYearModal(archive); }}
                          className={`p-1.5 rounded-lg border transition ${
                            isActive 
                              ? 'bg-white/20 text-white border-white/30 hover:bg-white/35' 
                              : 'bg-[#fcfaf7] text-stone-500 border-[#ecece0] hover:text-[#5A5A40]'
                          }`}
                          title="Edit Year"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteYear(archive.id); }}
                          className={`p-1.5 rounded-lg border transition ${
                            isActive 
                              ? 'bg-red-900/40 text-red-100 border-red-500/30 hover:bg-red-800/55' 
                              : 'bg-red-50 text-red-500 border-red-100 hover:text-red-700 hover:bg-red-100'
                          }`}
                          title="Delete Year"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {archives.length === 0 && (
                <div className="text-center py-6 text-stone-400 font-sans italic">No archives found.</div>
              )}
            </div>
          </div>

          {/* Right Column: Folder Tabs & Data Records */}
          <div className="lg:col-span-9 space-y-6">
            {selectedYear ? (
              <div className="space-y-6">
                
                {/* Folder Navigation Tabs */}
                <div className="bg-white rounded-[24px] border border-[#e0e0d5] p-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ecece0] pb-3 mb-3">
                    <div className="flex items-center gap-2 px-2">
                      <Folder className="w-4 h-4 text-[#5A5A40]" />
                      <span className="text-xs uppercase font-bold text-[#5A5A40] tracking-widest font-sans">
                        Archive Folders ({selectedYear.year})
                      </span>
                    </div>

                    {/* Admin Add Folder Shortcut */}
                    {isAdmin && (
                      <button 
                        onClick={() => openFolderModal()}
                        className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40] hover:underline flex items-center gap-1 font-sans px-2"
                      >
                        <Plus className="w-3 h-3" /> Create Folder
                      </button>
                    )}
                  </div>

                  {/* Folder Tab Pills */}
                  <div className="flex flex-wrap gap-2">
                    {folders.map((folder) => {
                      const isFolderActive = selectedFolder?.id === folder.id;

                      return (
                        <div key={folder.id} className="relative group">
                          <button
                            onClick={() => setSelectedFolder(folder)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-semibold font-sans transition-all flex items-center gap-2 border ${
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
                                className={`ml-1 p-1 rounded hover:bg-black/10 transition-colors cursor-pointer ${
                                  isFolderActive ? 'text-white/80 hover:text-white' : 'text-stone-400 hover:text-[#5A5A40]'
                                }`}
                                title="Rename / Edit Folder"
                              >
                                <Pencil className="w-3 h-3" />
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
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                                className="p-1 hover:text-red-500 text-stone-400 rounded"
                                title="Delete Folder"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Folder Main Content Card */}
                {selectedFolder ? (
                  <div className="bg-white rounded-[32px] border border-[#e0e0d5] shadow-sm overflow-hidden">
                    
                    {/* Header Banner */}
                    <div className="p-6 sm:p-8 border-b border-[#e0e0d5] bg-[#fcfaf7]">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider font-sans">
                              {selectedYear.year} Archive Record
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <h2 className="text-2xl sm:text-3xl font-serif italic text-[#5A5A40]">
                              {selectedFolder.name}
                            </h2>
                            {isAdmin && (
                              <button 
                                onClick={() => openFolderModal(selectedFolder)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-sans font-bold text-[#5A5A40] bg-stone-200/60 hover:bg-stone-300/80 rounded-lg transition"
                                title="Rename Folder or Edit Fields"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Rename / Edit</span>
                              </button>
                            )}
                          </div>
                          <h2 className="text-2xl font-serif italic text-[#5A5A40]">{selectedFolder.name}</h2>
                          {selectedFolder.description && (
                            <p className="text-xs text-stone-500 font-sans mt-1">
                              {selectedFolder.description}
                            </p>
                          )}
                        </div>

                        {/* Top Action Toolbar */}
                        <div className="flex flex-wrap items-center gap-2">
                          
                          {/* Search Input */}
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input 
                              type="text" 
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              placeholder="Search folder records..."
                              className="pl-8 pr-3 py-2 bg-white border border-[#ecece0] rounded-xl text-xs font-sans focus:outline-none focus:ring-1 focus:ring-[#5A5A40] w-48"
                            />
                            {searchQuery && (
                              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Template Download Button */}
                          <button 
                            onClick={downloadCSVTemplate}
                            className="bg-white border border-[#ecece0] text-stone-700 hover:text-[#5A5A40] px-3 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest font-sans flex items-center gap-1.5 transition shadow-sm"
                            title="Download CSV Template tailored for this folder's fields"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-[#5A5A40]" />
                            Template
                          </button>

                          {/* Export CSV Data Button */}
                          <button 
                            onClick={exportCurrentFolderCSV}
                            className="bg-white border border-[#ecece0] text-stone-700 hover:text-[#5A5A40] px-3 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest font-sans flex items-center gap-1.5 transition shadow-sm"
                            title="Export all current records to CSV"
                          >
                            <Download className="w-3.5 h-3.5 text-[#5A5A40]" />
                            Export CSV
                          </button>

                          {/* Admin CSV Upload Button */}
                          {isAdmin && (
                            <label className="bg-white border border-[#ecece0] text-stone-700 hover:text-[#5A5A40] px-3 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest font-sans flex items-center gap-1.5 transition cursor-pointer shadow-sm">
                              <Upload className="w-3.5 h-3.5 text-[#5A5A40]" />
                              Upload CSV
                              <input 
                                type="file" 
                                accept=".csv" 
                                onChange={handleCSVFileUpload}
                                className="hidden" 
                              />
                            </label>
                          )}

                          {/* Admin Add Entry Button */}
                          {isAdmin && (
                            <button 
                              onClick={() => openEntryModal()}
                              className="bg-[#5A5A40] text-white px-3.5 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-1.5 shrink-0 shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Record
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Table of Entries */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-[#ecece0] font-sans">
                        <thead className="bg-[#fcfaf7]">
                          <tr>
                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest w-12">
                              #
                            </th>
                            {selectedFolder.fields.map(field => (
                              <th 
                                key={field.id} 
                                scope="col" 
                                className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest whitespace-nowrap"
                              >
                                {field.name}
                              </th>
                            ))}
                            {isAdmin && (
                              <th scope="col" className="px-6 py-4 text-right text-[10px] font-bold text-stone-400 uppercase tracking-widest w-24">
                                Actions
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-[#ecece0]">
                          {displayEntries.map((record, index) => (
                            <tr key={record.id} className="hover:bg-[#f5f5f0]/50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-xs text-stone-400 font-mono">
                                {index + 1}
                              </td>

                              {selectedFolder.fields.map(field => {
                                const rawVal = record.data[field.id] !== undefined 
                                  ? record.data[field.id] 
                                  : record.data[field.name];

                                const strVal = (rawVal ?? '').toString();

                                // Render URL / File fields as clickable links
                                const isLink = field.type === 'file' || strVal.startsWith('http://') || strVal.startsWith('https://');

                                return (
                                  <td key={field.id} className="px-6 py-4 text-xs font-semibold text-[#2d2d2a] whitespace-normal max-w-xs break-words">
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

                              {isAdmin && (
                                <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button 
                                      onClick={() => openEntryModal(record)}
                                      className="p-1.5 text-stone-400 hover:text-[#5A5A40] transition rounded-lg hover:bg-stone-100"
                                      title="Edit Record"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteEntry(record.id)}
                                      className="p-1.5 text-stone-400 hover:text-red-500 transition rounded-lg hover:bg-red-50"
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
                              <td colSpan={selectedFolder.fields.length + (isAdmin ? 2 : 1)} className="px-6 py-12 text-center text-sm text-stone-500 italic font-sans">
                                {searchQuery ? 'No records match your search filter.' : `No entries found in "${selectedFolder.name}" for ${selectedYear.year}. Click "Add Record" or "Upload CSV" to begin.`}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-stone-500 font-sans italic bg-white border border-[#e0e0d5] rounded-[32px]">
                    Please select a Folder from the list above.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-stone-500 font-sans italic bg-white border border-[#e0e0d5] rounded-[32px]">
                Please select a Year from the archive list on the left to view records.
              </div>
            )}
          </div>
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
                  {selectedFolder.name} ({selectedYear?.year})
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

      {/* --- MODAL 4: CSV Upload Preview Modal --- */}
      {isUploadModalOpen && selectedFolder && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-3xl shadow-xl border border-[#e0e0d5] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider font-sans block">
                  Import Preview ({uploadFileName})
                </span>
                <h2 className="text-xl font-serif italic text-[#5A5A40]">
                  Confirm CSV Import into "{selectedFolder.name}"
                </h2>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 font-sans">
              <div className="flex items-center justify-between text-xs text-stone-600 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                <span>
                  Found <strong>{uploadPreview.length}</strong> record(s) ready to import for <strong>{selectedYear?.year}</strong>.
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

    </div>
  );
}

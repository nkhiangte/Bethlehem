import { useAuth } from '../lib/auth';
import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Plus, X, Pencil, Trash2, Upload, ArrowLeft, Search, FolderPlus, Folder, FileText, Calendar, Tag, AlertCircle, Sliders, ListPlus, Settings, Check } from 'lucide-react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { 
  RecordCategory, 
  RecordSubcategory, 
  ChurchRecord, 
  DamloKanRecord, 
  Upa, 
  RecordFieldDefinition,
  DEFAULT_RECORD_CATEGORIES, 
  DEFAULT_RECORD_SUBCATEGORIES 
} from '../types';
import Papa from 'papaparse';

export default function Records() {
  const { isAdmin } = useAuth();
  
  // Data states
  const [categories, setCategories] = useState<RecordCategory[]>(DEFAULT_RECORD_CATEGORIES);
  const [subcategories, setSubcategories] = useState<RecordSubcategory[]>(DEFAULT_RECORD_SUBCATEGORIES);
  const [churchRecords, setChurchRecords] = useState<ChurchRecord[]>([]);
  const [damloKanRecords, setDamloKanRecords] = useState<DamloKanRecord[]>([]);
  const [upas, setUpas] = useState<Upa[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Navigation
  const [activeCategoryId, setActiveCategoryId] = useState<string>('church_records');
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RecordCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catFields, setCatFields] = useState<RecordFieldDefinition[]>([]);

  // Subcategory Modal State
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<RecordSubcategory | null>(null);
  const [subCatCategoryId, setSubCatCategoryId] = useState('');
  const [subCatName, setSubCatName] = useState('');
  const [subCatDescription, setSubCatDescription] = useState('');
  const [subCatFields, setSubCatFields] = useState<RecordFieldDefinition[]>([]);

  // Field Editor Form State
  const [fieldEditorTarget, setFieldEditorTarget] = useState<'category' | 'subcategory' | null>(null);
  const [isFieldFormOpen, setIsFieldFormOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'number' | 'date' | 'select' | 'textarea'>('text');
  const [fieldOptions, setFieldOptions] = useState('');
  const [fieldRequired, setFieldRequired] = useState(false);

  // Record Entry Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ChurchRecord | null>(null);
  const [recordCategoryId, setRecordCategoryId] = useState('');
  const [recordSubcategoryId, setRecordSubcategoryId] = useState('');
  const [recordCustomValues, setRecordCustomValues] = useState<Record<string, any>>({});
  
  // Record Form Fields
  const [recordMemberName, setRecordMemberName] = useState('');
  const [recordDate, setRecordDate] = useState('');
  const [recordDetails, setRecordDetails] = useState('');
  const [recordOfficiant, setRecordOfficiant] = useState('');
  const [recordBirthDate, setRecordBirthDate] = useState('');
  const [recordGroomName, setRecordGroomName] = useState('');
  const [recordBrideName, setRecordBrideName] = useState('');
  const [recordDeathReason, setRecordDeathReason] = useState('');
  const [recordFamilyMembers, setRecordFamilyMembers] = useState('');
  const [recordUpaBial, setRecordUpaBial] = useState('');
  const [recordMonth, setRecordMonth] = useState('');
  const [recordAge, setRecordAge] = useState('');
  const [recordTawngtaisaktu, setRecordTawngtaisaktu] = useState('');
  const [recordThlanmualaHunHmangtu, setRecordThlanmualaHunHmangtu] = useState('');
  const [recordKohhranAtang, setRecordKohhranAtang] = useState('');
  const [recordHmun, setRecordHmun] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await fetchCategoriesAndSubcategories();

    if (!isFirebaseConfigured || !db) {
      const localDamlo = localStorage.getItem('local_damlo_kan');
      if (localDamlo) setDamloKanRecords(JSON.parse(localDamlo));
      
      const localUpas = localStorage.getItem('local_upas');
      if (localUpas) setUpas(JSON.parse(localUpas));

      const localRecords = localStorage.getItem('local_church_records');
      if (localRecords) {
        setChurchRecords(JSON.parse(localRecords));
      } else {
        setChurchRecords([]);
      }
      setLoading(false);
      return;
    }

    try {
      const uSnap = await getDocs(query(collection(db, 'upas'), orderBy('name', 'asc')));
      setUpas(uSnap.docs.map(d => ({ id: d.id, ...d.data() } as Upa)));

      const dSnap = await getDocs(query(collection(db, 'damlokan'), orderBy('month', 'desc')));
      setDamloKanRecords(dSnap.docs.map(d => ({ id: d.id, ...d.data() } as DamloKanRecord)));

      const rSnap = await getDocs(query(collection(db, 'records'), orderBy('date', 'desc')));
      setChurchRecords(rSnap.docs.map(d => ({ id: d.id, ...d.data() } as ChurchRecord)));
    } catch (error) {
      console.error("Error fetching records data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoriesAndSubcategories = async () => {
    let mergedCats = [...DEFAULT_RECORD_CATEGORIES];
    let mergedSubs = [...DEFAULT_RECORD_SUBCATEGORIES];

    if (!isFirebaseConfigured || !db) {
      const localCats = localStorage.getItem('local_record_categories');
      if (localCats) {
        const parsed: RecordCategory[] = JSON.parse(localCats);
        parsed.forEach(c => {
          if (c.id !== 'damlo_kan' && !mergedCats.some(mc => mc.id === c.id)) mergedCats.push(c);
          else if (c.id !== 'damlo_kan') {
            const idx = mergedCats.findIndex(mc => mc.id === c.id);
            mergedCats[idx] = c;
          }
        });
      }
      const localSubs = localStorage.getItem('local_record_subcategories');
      if (localSubs) {
        const parsed: RecordSubcategory[] = JSON.parse(localSubs);
        parsed.forEach(s => {
          if (!mergedSubs.some(ms => ms.id === s.id)) mergedSubs.push(s);
          else {
            const idx = mergedSubs.findIndex(ms => ms.id === s.id);
            mergedSubs[idx] = s;
          }
        });
      }
      
      // Clean up legacy damlo_kan category
      mergedCats = mergedCats.filter(c => c.id !== 'damlo_kan');
      mergedSubs = mergedSubs.map(s => s.categoryId === 'damlo_kan' ? { ...s, categoryId: 'church_records' } : s);

      setCategories(mergedCats);
      setSubcategories(mergedSubs);
      return;
    }

    try {
      const catSnap = await getDocs(collection(db, 'record_categories'));
      const customCats = catSnap.docs.map(d => ({ id: d.id, ...d.data() } as RecordCategory));
      customCats.forEach(c => {
        if (c.id !== 'damlo_kan') {
          const idx = mergedCats.findIndex(mc => mc.id === c.id);
          if (idx !== -1) mergedCats[idx] = c;
          else mergedCats.push(c);
        }
      });

      const subSnap = await getDocs(collection(db, 'record_subcategories'));
      const customSubs = subSnap.docs.map(d => ({ id: d.id, ...d.data() } as RecordSubcategory));
      customSubs.forEach(s => {
        const idx = mergedSubs.findIndex(ms => ms.id === s.id);
        if (idx !== -1) mergedSubs[idx] = s;
        else mergedSubs.push(s);
      });

      mergedCats = mergedCats.filter(c => c.id !== 'damlo_kan');
      mergedSubs = mergedSubs.map(s => s.categoryId === 'damlo_kan' ? { ...s, categoryId: 'church_records' } : s);

      setCategories(mergedCats);
      setSubcategories(mergedSubs);
    } catch (error) {
      console.error("Error fetching categories & subcategories:", error);
      const localCats = localStorage.getItem('local_record_categories');
      if (localCats) {
        const parsed: RecordCategory[] = JSON.parse(localCats);
        parsed.forEach(c => {
          if (c.id !== 'damlo_kan' && !mergedCats.some(mc => mc.id === c.id)) mergedCats.push(c);
        });
      }
      const localSubs = localStorage.getItem('local_record_subcategories');
      if (localSubs) {
        const parsed: RecordSubcategory[] = JSON.parse(localSubs);
        parsed.forEach(s => {
          if (!mergedSubs.some(ms => ms.id === s.id)) mergedSubs.push(s);
        });
      }
      mergedCats = mergedCats.filter(c => c.id !== 'damlo_kan');
      mergedSubs = mergedSubs.map(s => s.categoryId === 'damlo_kan' ? { ...s, categoryId: 'church_records' } : s);

      setCategories(mergedCats);
      setSubcategories(mergedSubs);
    }
  };

  // --- FIELD DEFINITION HELPERS ---
  const openAddFieldForm = (target: 'category' | 'subcategory') => {
    setFieldEditorTarget(target);
    setEditingFieldId(null);
    setFieldName('');
    setFieldType('text');
    setFieldOptions('');
    setFieldRequired(false);
    setIsFieldFormOpen(true);
  };

  const openEditFieldForm = (target: 'category' | 'subcategory', field: RecordFieldDefinition) => {
    setFieldEditorTarget(target);
    setEditingFieldId(field.id);
    setFieldName(field.name);
    setFieldType(field.type);
    setFieldOptions(field.options?.join(', ') || '');
    setFieldRequired(!!field.required);
    setIsFieldFormOpen(true);
  };

  const handleSaveFieldDefinition = () => {
    if (!fieldName.trim() || !fieldEditorTarget) return;

    const optionsArr = fieldType === 'select'
      ? fieldOptions.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const fieldData: RecordFieldDefinition = {
      id: editingFieldId || 'f_' + Date.now(),
      name: fieldName.trim(),
      type: fieldType,
      options: optionsArr,
      required: fieldRequired,
    };

    if (fieldEditorTarget === 'category') {
      if (editingFieldId) {
        setCatFields(prev => prev.map(f => f.id === editingFieldId ? fieldData : f));
      } else {
        setCatFields(prev => [...prev, fieldData]);
      }
    } else {
      if (editingFieldId) {
        setSubCatFields(prev => prev.map(f => f.id === editingFieldId ? fieldData : f));
      } else {
        setSubCatFields(prev => [...prev, fieldData]);
      }
    }

    setIsFieldFormOpen(false);
    setEditingFieldId(null);
    setFieldName('');
    setFieldType('text');
    setFieldOptions('');
    setFieldRequired(false);
  };

  const handleDeleteFieldDefinition = (target: 'category' | 'subcategory', fieldId: string) => {
    if (target === 'category') {
      setCatFields(prev => prev.filter(f => f.id !== fieldId));
    } else {
      setSubCatFields(prev => prev.filter(f => f.id !== fieldId));
    }
  };

  // --- CATEGORY ACTIONS ---
  const openCategoryModal = (category?: RecordCategory) => {
    setIsFieldFormOpen(false);
    setEditingFieldId(null);
    if (category) {
      setEditingCategory(category);
      setCatName(category.name);
      setCatDescription(category.description || '');
      setCatFields(category.fields ? [...category.fields] : []);
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatDescription('');
      setCatFields([]);
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) return;

    const categoryData: Partial<RecordCategory> = {
      name: catName.trim(),
      description: catDescription.trim(),
      fields: catFields,
    };

    if (!isFirebaseConfigured || !db) {
      const localCats = localStorage.getItem('local_record_categories');
      let currentLocalCats: RecordCategory[] = localCats ? JSON.parse(localCats) : [];
      if (editingCategory) {
        currentLocalCats = currentLocalCats.map(c => c.id === editingCategory.id ? { ...c, ...categoryData } as RecordCategory : c);
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...categoryData } as RecordCategory : c));
      } else {
        const newCat: RecordCategory = {
          id: 'cat_' + Date.now(),
          name: catName.trim(),
          description: catDescription.trim(),
          isBuiltIn: false,
          fields: catFields,
        };
        currentLocalCats.push(newCat);
        setCategories(prev => [...prev, newCat]);
      }
      localStorage.setItem('local_record_categories', JSON.stringify(currentLocalCats));
      setIsCategoryModalOpen(false);
      return;
    }

    try {
      if (editingCategory) {
        await updateDoc(doc(db, 'record_categories', editingCategory.id), categoryData);
      } else {
        const newDoc = await addDoc(collection(db, 'record_categories'), {
          ...categoryData,
          isBuiltIn: false,
          createdAt: new Date().toISOString()
        });
        setActiveCategoryId(newDoc.id);
      }
      setIsCategoryModalOpen(false);
      fetchCategoriesAndSubcategories();
    } catch (error) {
      console.error("Error saving category:", error);
      // Local fallback
      const localCats = localStorage.getItem('local_record_categories');
      let currentLocalCats: RecordCategory[] = localCats ? JSON.parse(localCats) : [];
      if (editingCategory) {
        currentLocalCats = currentLocalCats.map(c => c.id === editingCategory.id ? { ...c, ...categoryData } as RecordCategory : c);
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...categoryData } as RecordCategory : c));
      } else {
        const newCat: RecordCategory = {
          id: 'cat_' + Date.now(),
          name: catName.trim(),
          description: catDescription.trim(),
          isBuiltIn: false,
          fields: catFields,
        };
        currentLocalCats.push(newCat);
        setCategories(prev => [...prev, newCat]);
        setActiveCategoryId(newCat.id);
      }
      localStorage.setItem('local_record_categories', JSON.stringify(currentLocalCats));
      setIsCategoryModalOpen(false);
    }
  };

  const handleDeleteCategory = async (cat: RecordCategory) => {
    if (cat.isBuiltIn) {
      alert("Built-in categories cannot be deleted.");
      return;
    }

    if (!confirm(`Are you sure you want to delete category "${cat.name}"? Subcategories and records in this category will also be removed.`)) {
      return;
    }

    if (!isFirebaseConfigured || !db) {
      const localCats = localStorage.getItem('local_record_categories');
      if (localCats) {
        const parsed: RecordCategory[] = JSON.parse(localCats);
        const filtered = parsed.filter(c => c.id !== cat.id);
        localStorage.setItem('local_record_categories', JSON.stringify(filtered));
      }
      setCategories(prev => prev.filter(c => c.id !== cat.id));
      setActiveCategoryId('church_records');
      setActiveSubcategoryId(null);
      return;
    }

    try {
      await deleteDoc(doc(db, 'record_categories', cat.id));
      if (activeCategoryId === cat.id) {
        setActiveCategoryId('church_records');
        setActiveSubcategoryId(null);
      }
      fetchCategoriesAndSubcategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Failed to delete category.");
    }
  };

  // --- SUBCATEGORY ACTIONS ---
  const openSubcategoryModal = (subcat?: RecordSubcategory) => {
    setIsFieldFormOpen(false);
    setEditingFieldId(null);
    if (subcat) {
      setEditingSubcategory(subcat);
      setSubCatCategoryId(subcat.categoryId);
      setSubCatName(subcat.name);
      setSubCatDescription(subcat.description || '');
      setSubCatFields(subcat.fields ? [...subcat.fields] : []);
    } else {
      setEditingSubcategory(null);
      setSubCatCategoryId(activeCategoryId);
      setSubCatName('');
      setSubCatDescription('');
      setSubCatFields([]);
    }
    setIsSubcategoryModalOpen(true);
  };

  const handleSaveSubcategory = async () => {
    if (!subCatName.trim() || !subCatCategoryId) return;

    const subcatData: Partial<RecordSubcategory> = {
      categoryId: subCatCategoryId,
      name: subCatName.trim(),
      description: subCatDescription.trim(),
      fields: subCatFields,
    };

    if (!isFirebaseConfigured || !db) {
      const localSubs = localStorage.getItem('local_record_subcategories');
      let currentLocalSubs: RecordSubcategory[] = localSubs ? JSON.parse(localSubs) : [];
      if (editingSubcategory) {
        currentLocalSubs = currentLocalSubs.map(s => s.id === editingSubcategory.id ? { ...s, ...subcatData } as RecordSubcategory : s);
        setSubcategories(prev => prev.map(s => s.id === editingSubcategory.id ? { ...s, ...subcatData } as RecordSubcategory : s));
      } else {
        const newSub: RecordSubcategory = {
          id: 'sub_' + Date.now(),
          categoryId: subCatCategoryId,
          name: subCatName.trim(),
          description: subCatDescription.trim(),
          code: 'custom_' + Date.now(),
          isBuiltIn: false,
          fields: subCatFields,
        };
        currentLocalSubs.push(newSub);
        setSubcategories(prev => [...prev, newSub]);
      }
      localStorage.setItem('local_record_subcategories', JSON.stringify(currentLocalSubs));
      setIsSubcategoryModalOpen(false);
      return;
    }

    try {
      if (editingSubcategory) {
        await updateDoc(doc(db, 'record_subcategories', editingSubcategory.id), subcatData);
      } else {
        await addDoc(collection(db, 'record_subcategories'), {
          ...subcatData,
          code: 'custom_' + Date.now(),
          isBuiltIn: false,
          createdAt: new Date().toISOString()
        });
      }
      setIsSubcategoryModalOpen(false);
      fetchCategoriesAndSubcategories();
    } catch (error) {
      console.error("Error saving subcategory:", error);
      // Local fallback
      const localSubs = localStorage.getItem('local_record_subcategories');
      let currentLocalSubs: RecordSubcategory[] = localSubs ? JSON.parse(localSubs) : [];
      if (editingSubcategory) {
        currentLocalSubs = currentLocalSubs.map(s => s.id === editingSubcategory.id ? { ...s, ...subcatData } as RecordSubcategory : s);
        setSubcategories(prev => prev.map(s => s.id === editingSubcategory.id ? { ...s, ...subcatData } as RecordSubcategory : s));
      } else {
        const newSub: RecordSubcategory = {
          id: 'sub_' + Date.now(),
          categoryId: subCatCategoryId,
          name: subCatName.trim(),
          description: subCatDescription.trim(),
          code: 'custom_' + Date.now(),
          isBuiltIn: false,
          fields: subCatFields,
        };
        currentLocalSubs.push(newSub);
        setSubcategories(prev => [...prev, newSub]);
      }
      localStorage.setItem('local_record_subcategories', JSON.stringify(currentLocalSubs));
      setIsSubcategoryModalOpen(false);
    }
  };

  const handleDeleteSubcategory = async (sub: RecordSubcategory) => {
    if (sub.isBuiltIn) {
      alert("Built-in subcategories cannot be deleted.");
      return;
    }

    if (!confirm(`Are you sure you want to delete subcategory "${sub.name}"?`)) {
      return;
    }

    if (!isFirebaseConfigured || !db) {
      const localSubs = localStorage.getItem('local_record_subcategories');
      if (localSubs) {
        const parsed: RecordSubcategory[] = JSON.parse(localSubs);
        const filtered = parsed.filter(s => s.id !== sub.id);
        localStorage.setItem('local_record_subcategories', JSON.stringify(filtered));
      }
      setSubcategories(prev => prev.filter(s => s.id !== sub.id));
      if (activeSubcategoryId === sub.id) {
        setActiveSubcategoryId(null);
      }
      return;
    }

    try {
      await deleteDoc(doc(db, 'record_subcategories', sub.id));
      if (activeSubcategoryId === sub.id) {
        setActiveSubcategoryId(null);
      }
      fetchCategoriesAndSubcategories();
    } catch (error) {
      console.error("Error deleting subcategory:", error);
      alert("Failed to delete subcategory.");
    }
  };

  // --- RECORD ENTRY ACTIONS ---
  const openRecordModal = (record?: ChurchRecord) => {
    const curCatId = activeCategoryId;
    const curSubCat = subcategories.find(s => s.id === activeSubcategoryId || s.code === activeSubcategoryId);
    const curSubCatId = curSubCat ? curSubCat.id : (subcategories.find(s => s.categoryId === curCatId)?.id || '');

    if (record) {
      setEditingRecord(record);
      setRecordCategoryId(record.categoryId || curCatId);
      setRecordSubcategoryId(record.subcategoryId || curSubCatId);
      setRecordMemberName(record.memberName || '');
      setRecordDate(record.date || new Date().toISOString().split('T')[0]);
      setRecordDetails(record.details || '');
      setRecordOfficiant(record.officiant || '');
      setRecordBirthDate(record.birthDate || '');
      setRecordGroomName(record.groomName || '');
      setRecordBrideName(record.brideName || '');
      setRecordDeathReason(record.deathReason || '');
      setRecordFamilyMembers(record.familyMembers || '');
      setRecordUpaBial(record.upaBial || '');
      setRecordMonth(record.month || '');
      setRecordAge(record.age !== undefined && record.age !== null ? String(record.age) : '');
      setRecordTawngtaisaktu(record.tawngtaisaktu || '');
      setRecordThlanmualaHunHmangtu(record.thlanmualaHunHmangtu || '');
      setRecordKohhranAtang(record.kohhranAtang || '');
      setRecordHmun(record.hmun || record.location || '');
      setRecordCustomValues(record.customFields || {});
    } else {
      setEditingRecord(null);
      setRecordCategoryId(curCatId);
      setRecordSubcategoryId(curSubCatId);
      setRecordMemberName('');
      setRecordDate(new Date().toISOString().split('T')[0]);
      setRecordDetails('');
      setRecordOfficiant('');
      setRecordBirthDate('');
      setRecordGroomName('');
      setRecordBrideName('');
      setRecordDeathReason('');
      setRecordFamilyMembers('');
      setRecordUpaBial(upas[0]?.bial || '');
      setRecordMonth(new Date().toISOString().slice(0, 7));
      setRecordAge('');
      setRecordTawngtaisaktu('');
      setRecordThlanmualaHunHmangtu('');
      setRecordKohhranAtang('');
      setRecordHmun('');
      setRecordCustomValues({});
    }
    setIsRecordModalOpen(true);
  };

  const handleSaveRecord = async () => {
    const selectedSub = subcategories.find(s => s.id === recordSubcategoryId);
    const subTypeCode = selectedSub?.code || selectedSub?.id || 'general';

    let nameToSave = recordMemberName;
    if (subTypeCode === 'marriage' && (recordGroomName || recordBrideName)) {
      nameToSave = `${recordGroomName} & ${recordBrideName}`;
    }

    const data: Partial<ChurchRecord> = {
      categoryId: recordCategoryId,
      subcategoryId: recordSubcategoryId,
      type: subTypeCode,
      memberName: nameToSave.trim(),
      date: recordDate,
      details: recordDetails.trim(),
      officiant: recordOfficiant.trim(),
      upaBial: recordUpaBial,
      month: recordMonth,
      age: recordAge,
      customFields: recordCustomValues,
    };

    if (subTypeCode === 'baptism') {
      data.birthDate = recordBirthDate;
    } else if (subTypeCode === 'marriage') {
      data.groomName = recordGroomName.trim();
      data.brideName = recordBrideName.trim();
      data.hmun = recordHmun.trim();
    } else if (subTypeCode === 'death') {
      data.deathReason = recordDeathReason;
      data.tawngtaisaktu = recordTawngtaisaktu.trim();
      data.thlanmualaHunHmangtu = recordThlanmualaHunHmangtu.trim();
    } else if (['pem', 'dawnsawn', 'testimonial_received', 'testimonial_disbursement'].includes(subTypeCode)) {
      data.familyMembers = recordFamilyMembers;
      data.kohhranAtang = recordKohhranAtang.trim();
    }

    if (!isFirebaseConfigured || !db) {
      const updated = [...churchRecords];
      if (editingRecord) {
        const idx = updated.findIndex(r => r.id === editingRecord.id);
        if (idx !== -1) updated[idx] = { ...editingRecord, ...data } as ChurchRecord;
      } else {
        updated.push({ id: 'local_rec_' + Date.now(), ...data } as ChurchRecord);
      }
      updated.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      localStorage.setItem('local_church_records', JSON.stringify(updated));
      setChurchRecords(updated);
      setIsRecordModalOpen(false);
      return;
    }

    try {
      if (editingRecord?.id) {
        await updateDoc(doc(db, 'records', editingRecord.id), data);
      } else {
        await addDoc(collection(db, 'records'), data);
      }
      setIsRecordModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving record entry:", error);
      alert("Failed to save record entry.");
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record entry?")) return;
    
    if (!isFirebaseConfigured || !db) {
      const updated = churchRecords.filter(r => r.id !== id);
      localStorage.setItem('local_church_records', JSON.stringify(updated));
      setChurchRecords(updated);
      return;
    }

    try {
      await deleteDoc(doc(db, 'records', id));
      fetchData();
    } catch (error) {
      console.error("Error deleting record entry:", error);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSubcategoryId) return;

    const currentSubcat = subcategories.find(s => s.id === activeSubcategoryId || s.code === activeSubcategoryId);
    const subTypeCode = currentSubcat?.code || currentSubcat?.id || 'general';

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const newRecords: Partial<ChurchRecord>[] = results.data.map((row: any) => {
          let rec: Partial<ChurchRecord> = {
            categoryId: activeCategoryId,
            subcategoryId: currentSubcat?.id || activeSubcategoryId,
            type: subTypeCode,
            date: row['Date'] || row['Ni'] || row['Inneih Ni'] || row['Baptisma Ni'] || row['Thih Ni'] || row['Pem Ni'] || row['Dawnsawn Ni'] || new Date().toISOString().split('T')[0],
            officiant: row['Officiant'] || row['Pastor'] || row['Inneih tirtu'] || row['Vuitu'] || '',
            details: row['Details'] || row['Veng'] || '',
            upaBial: row['Upa Bial'] || row['Bial'] || '',
          };

          if (subTypeCode === 'baptism') {
            rec.memberName = row['Name'] || row['Hming'] || '';
            rec.birthDate = row['Birth Date'] || row['Pian Ni'] || '';
          } else if (subTypeCode === 'marriage') {
            rec.groomName = row['Groom'] || row['Moneitu'] || '';
            rec.brideName = row['Bride'] || row['Mo'] || '';
            rec.memberName = row['Name'] || row['Hming'] || `${rec.groomName} & ${rec.brideName}`;
          } else if (subTypeCode === 'death') {
            rec.memberName = row['Name'] || row['Hming'] || '';
            rec.deathReason = row['Reason'] || row['Thih Chhan'] || '';
          } else if (['pem', 'dawnsawn', 'testimonial_received', 'testimonial_disbursement'].includes(subTypeCode)) {
            rec.memberName = row['Name'] || row['Hming'] || '';
            rec.familyMembers = row['Family Members'] || row['Chhungkaw Member Zat'] || '';
          } else {
            rec.memberName = row['Name'] || row['Hming'] || '';
          }

          return rec;
        });

        if (!isFirebaseConfigured || !db) {
          const updated = [...churchRecords];
          newRecords.forEach((nr, i) => {
            updated.push({ id: `local_rec_${Date.now()}_${i}`, ...nr } as ChurchRecord);
          });
          updated.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          localStorage.setItem('local_church_records', JSON.stringify(updated));
          setChurchRecords(updated);
          alert(`Successfully imported ${newRecords.length} records locally.`);
        } else {
          try {
            for (const nr of newRecords) {
              await addDoc(collection(db, 'records'), nr);
            }
            fetchData();
            alert(`Successfully imported ${newRecords.length} records.`);
          } catch (error) {
            console.error("Error importing records:", error);
            alert("Failed to import records.");
          }
        }
      },
      error: (error) => {
        console.error("CSV Parse Error:", error);
        alert("Failed to parse CSV file.");
      }
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper functions
  const currentCategory = categories.find(c => c.id === activeCategoryId) || categories[0];
  const categorySubcategories = subcategories.filter(s => s.categoryId === activeCategoryId);
  const currentSubcategory = subcategories.find(s => s.id === activeSubcategoryId || s.code === activeSubcategoryId);

  // Filter records for the currently selected subcategory
  const filteredSubcategoryRecords = churchRecords.filter(record => {
    if (!currentSubcategory) return false;
    
    const isMarriageRecord = !!(record.groomName || record.brideName || record.pasalHming || record.moHming);

    let isSubMatch = record.subcategoryId === currentSubcategory.id || 
                     record.type === currentSubcategory.code || 
                     record.type === currentSubcategory.id;

    if (currentSubcategory.code === 'marriage') {
      isSubMatch = isMarriageRecord || record.subcategoryId === 'marriage' || record.type === 'marriage' || record.type === 'inneih';
    } else if (currentSubcategory.code === 'damlokan') {
      isSubMatch = !isMarriageRecord && (record.subcategoryId === 'damlokan' || record.subcategoryId === 'damlokan_general' || record.type === 'damlokan_general' || record.categoryId === 'damlo_kan');
    }

    if (!isSubMatch) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (record.memberName && record.memberName.toLowerCase().includes(q)) ||
      (record.groomName && record.groomName.toLowerCase().includes(q)) ||
      (record.brideName && record.brideName.toLowerCase().includes(q)) ||
      (record.details && record.details.toLowerCase().includes(q)) ||
      (record.officiant && record.officiant.toLowerCase().includes(q)) ||
      (record.date && record.date.includes(q)) ||
      (record.deathReason && record.deathReason.toLowerCase().includes(q)) ||
      (record.tawngtaisaktu && record.tawngtaisaktu.toLowerCase().includes(q)) ||
      (record.thlanmualaHunHmangtu && record.thlanmualaHunHmangtu.toLowerCase().includes(q)) ||
      (record.kohhranAtang && record.kohhranAtang.toLowerCase().includes(q)) ||
      (record.hmun && record.hmun.toLowerCase().includes(q)) ||
      (record.upaBial && record.upaBial.toLowerCase().includes(q)) ||
      (record.age && String(record.age).toLowerCase().includes(q))
    );
  });

  const renderInlineFieldForm = () => (
    <div className="p-4 bg-white border border-[#5A5A40]/30 rounded-2xl space-y-3 shadow-sm mt-3 font-sans">
      <div className="flex justify-between items-center pb-2 border-b border-[#ecece0]">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A5A40]">
          {editingFieldId ? 'Edit Custom Field' : 'New Custom Field'}
        </h4>
        <button type="button" onClick={() => setIsFieldFormOpen(false)} className="text-stone-400 hover:text-stone-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="block text-[9px] uppercase font-bold text-stone-500 tracking-widest mb-1">Field Label / Name</label>
        <input
          type="text"
          value={fieldName}
          onChange={e => setFieldName(e.target.value)}
          placeholder="e.g. Certificate No., Amount, Location, Receipt ID"
          className="w-full p-2.5 bg-[#fcfaf7] border border-[#ecece0] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[9px] uppercase font-bold text-stone-500 tracking-widest mb-1">Field Type</label>
          <select
            value={fieldType}
            onChange={e => setFieldType(e.target.value as any)}
            className="w-full p-2.5 bg-[#fcfaf7] border border-[#ecece0] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
          >
            <option value="text">Short Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="select">Dropdown (Select)</option>
            <option value="textarea">Long Text (Textarea)</option>
          </select>
        </div>

        <div className="flex items-center pt-3">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-stone-700">
            <input
              type="checkbox"
              checked={fieldRequired}
              onChange={e => setFieldRequired(e.target.checked)}
              className="rounded border-[#ecece0] text-[#5A5A40] focus:ring-[#5A5A40]"
            />
            <span>Required Field</span>
          </label>
        </div>
      </div>

      {fieldType === 'select' && (
        <div>
          <label className="block text-[9px] uppercase font-bold text-stone-500 tracking-widest mb-1">Dropdown Options (Comma separated)</label>
          <input
            type="text"
            value={fieldOptions}
            onChange={e => setFieldOptions(e.target.value)}
            placeholder="Option 1, Option 2, Option 3"
            className="w-full p-2.5 bg-[#fcfaf7] border border-[#ecece0] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-[#ecece0]">
        <button
          type="button"
          onClick={() => setIsFieldFormOpen(false)}
          className="px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold text-stone-500 hover:bg-stone-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSaveFieldDefinition}
          className="px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold bg-[#5A5A40] text-white hover:bg-[#4a4a35]"
        >
          {editingFieldId ? 'Update Field' : 'Add Field'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight uppercase">Records Registry</h1>
          <p className="mt-1 text-stone-500 text-xs uppercase tracking-widest">
            {currentCategory?.description || 'Digital registry of church records and sacrament histories'}
          </p>
        </div>

        {/* Global Admin Buttons */}
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openCategoryModal()}
              className="bg-white text-[#5A5A40] border border-[#ecece0] px-3.5 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-stone-50 transition flex items-center gap-1.5 shadow-sm"
            >
              <FolderPlus className="w-3.5 h-3.5 text-[#5A5A40]" />
              + Category
            </button>

            <button
              onClick={() => openSubcategoryModal()}
              className="bg-white text-[#5A5A40] border border-[#ecece0] px-3.5 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-stone-50 transition flex items-center gap-1.5 shadow-sm"
            >
              <Tag className="w-3.5 h-3.5 text-[#5A5A40]" />
              + Subcategory
            </button>

            <button
              onClick={() => openRecordModal()}
              className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              New Entry
            </button>
          </div>
        )}
      </div>

      {/* Main Categories Navigation Bar */}
      <div className="flex items-center space-x-2 border-b border-[#e0e0d5] pb-px overflow-x-auto no-scrollbar">
        {categories.map(cat => {
          const isActive = activeCategoryId === cat.id;
          return (
            <div key={cat.id} className="relative group flex items-center shrink-0">
              <button
                onClick={() => {
                  setActiveCategoryId(cat.id);
                  setActiveSubcategoryId(null);
                  setSearchQuery('');
                }}
                className={`px-5 py-3 text-xs uppercase font-bold tracking-widest transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  isActive ? 'border-[#5A5A40] text-[#5A5A40]' : 'border-transparent text-stone-400 hover:text-stone-600'
                }`}
              >
                <Folder className="w-4 h-4" />
                {cat.name}
              </button>

              {isAdmin && (
                <div className="flex items-center opacity-80 group-hover:opacity-100 transition-opacity pr-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openCategoryModal(cat);
                    }}
                    className="p-1 text-stone-400 hover:text-[#5A5A40]"
                    title="Edit Category & Fields"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  {!cat.isBuiltIn && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(cat);
                      }}
                      className="p-1 text-red-400 hover:text-red-600"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* VIEW LEVEL 1: Subcategories Grid for the Selected Category */}
      {!activeSubcategoryId ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-serif italic text-[#5A5A40]">
                {currentCategory?.name} Subcategories
              </h2>
              <p className="text-xs text-stone-500 font-sans mt-0.5">
                Select a subcategory to browse or manage its records
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => openSubcategoryModal()}
                className="bg-[#fcfaf7] text-[#5A5A40] border border-[#ecece0] px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-stone-50 transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Subcategory
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categorySubcategories.map(sub => {
              // Count records in this subcategory
              const recCount = churchRecords.filter(r => {
                const isMarriage = !!(r.groomName || r.brideName || r.pasalHming || r.moHming);
                if (sub.code === 'marriage') {
                  return isMarriage || r.subcategoryId === 'marriage' || r.type === 'marriage' || r.type === 'inneih';
                }
                if (sub.code === 'damlokan') {
                  return !isMarriage && (r.subcategoryId === 'damlokan' || r.subcategoryId === 'damlokan_general' || r.type === 'damlokan_general' || r.categoryId === 'damlo_kan');
                }
                return r.subcategoryId === sub.id || r.type === sub.code || r.type === sub.id;
              }).length;

              return (
                <div
                  key={sub.id}
                  onClick={() => setActiveSubcategoryId(sub.id)}
                  className="bg-white p-6 rounded-2xl border border-[#ecece0] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all text-left group flex flex-col justify-between min-h-[130px] cursor-pointer relative"
                >
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[#5A5A40] font-serif italic text-xl group-hover:text-[#4a4a35] transition-colors">
                        {sub.name}
                      </span>
                      {isAdmin && (
                        <div className="flex items-center gap-1 z-10" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => openSubcategoryModal(sub)}
                            className="p-1 text-stone-400 hover:text-[#5A5A40]"
                            title="Edit Subcategory & Fields"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {!sub.isBuiltIn && (
                            <button
                              onClick={() => handleDeleteSubcategory(sub)}
                              className="p-1 text-red-400 hover:text-red-600"
                              title="Delete Subcategory"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {sub.description && (
                      <p className="text-xs text-stone-500 line-clamp-2 mt-1">{sub.description}</p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[#f5f5f0] flex justify-between items-center text-[10px] uppercase font-bold text-stone-400">
                    <div className="flex items-center gap-2">
                      <span>{recCount} {recCount === 1 ? 'Record' : 'Records'}</span>
                      {sub.fields && sub.fields.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-[#f0f0e8] text-[#5A5A40] rounded text-[9px] flex items-center gap-1 font-semibold">
                          <Sliders className="w-2.5 h-2.5" />
                          {sub.fields.length} {sub.fields.length === 1 ? 'field' : 'fields'}
                        </span>
                      )}
                    </div>
                    <span className="text-[#5A5A40] group-hover:translate-x-1 transition-transform">
                      View Entries &rarr;
                    </span>
                  </div>
                </div>
              );
            })}

            {categorySubcategories.length === 0 && (
              <div className="col-span-full p-12 text-center text-sm text-stone-500 italic bg-white rounded-2xl border border-dashed border-[#d0d0c5]">
                No subcategories created for this category yet.
                {isAdmin && (
                  <div className="mt-3">
                    <button
                      onClick={() => openSubcategoryModal()}
                      className="text-[#5A5A40] underline font-semibold text-xs uppercase tracking-wider"
                    >
                      + Create First Subcategory
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW LEVEL 2: Entries List inside Selected Subcategory */
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setActiveSubcategoryId(null);
                  setSearchQuery('');
                }}
                className="p-2.5 bg-white rounded-full border border-[#ecece0] text-stone-500 hover:bg-stone-50 transition shadow-sm"
                title="Back to Subcategories"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-stone-400">
                  <span>{currentCategory?.name}</span>
                  <span>/</span>
                  <span className="text-[#5A5A40]">{currentSubcategory?.name}</span>
                </div>
                <h2 className="text-2xl font-serif italic text-[#5A5A40]">
                  {currentSubcategory?.name} Entries
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
              {/* Search Bar */}
              <div className="relative flex-1 lg:flex-initial min-w-[200px]">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search records..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-[#ecece0] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isAdmin && (
                <>
                  <input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#fcfaf7] text-[#5A5A40] border border-[#ecece0] px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-stone-50 transition flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Import CSV
                  </button>

                  <button
                    onClick={() => openRecordModal()}
                    className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Record
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-[32px] shadow-sm border border-[#e0e0d5] overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-sm text-stone-500 italic">Loading records...</div>
            ) : (
              <div className="overflow-x-auto">
                {(() => {
                  const subCode = currentSubcategory?.code;

                  // 1. Marriage (Inneih)
                  if (subCode === 'marriage') {
                    return (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#fcfaf7] border-b border-[#ecece0] text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                            <th className="p-4 pl-6">Moneitu</th>
                            <th className="p-4">Mo</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Hmun</th>
                            <th className="p-4">Inneih tirtu</th>
                            {isAdmin && <th className="p-4 pr-6 text-right">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ecece0] text-sm text-[#2d2d2a]">
                          {filteredSubcategoryRecords.map((record) => (
                            <tr key={record.id} className="hover:bg-[#f5f5f0]/50 transition">
                              <td className="p-4 pl-6 font-semibold text-[#5A5A40]">
                                {record.groomName || record.pasalHming || '-'}
                              </td>
                              <td className="p-4 font-semibold text-[#5A5A40]">
                                {record.brideName || record.moHming || '-'}
                              </td>
                              <td className="p-4 text-stone-600">{record.date || '-'}</td>
                              <td className="p-4 text-stone-600">{record.hmun || record.location || '-'}</td>
                              <td className="p-4 text-stone-600">{record.officiant || '-'}</td>
                              {isAdmin && (
                                <td className="p-4 pr-6 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button 
                                      onClick={() => openRecordModal(record)} 
                                      className="p-1.5 text-stone-400 hover:text-[#5A5A40] hover:bg-white border border-[#ecece0] rounded-lg transition"
                                      title="Edit Record Entry"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteRecord(record.id)} 
                                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-100 rounded-lg transition"
                                      title="Delete Record Entry"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  }

                  // 2. Death (Mitthi)
                  if (subCode === 'death') {
                    return (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#fcfaf7] border-b border-[#ecece0] text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                            <th className="p-4 pl-6">Hming</th>
                            <th className="p-4">Kum</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Thih Chhan</th>
                            <th className="p-4">Vuitu</th>
                            <th className="p-4">Tawngtaisaktu</th>
                            <th className="p-4">Thlanmuala hun hmangtu</th>
                            <th className="p-4">Upa Bial</th>
                            {isAdmin && <th className="p-4 pr-6 text-right">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ecece0] text-sm text-[#2d2d2a]">
                          {filteredSubcategoryRecords.map((record) => (
                            <tr key={record.id} className="hover:bg-[#f5f5f0]/50 transition">
                              <td className="p-4 pl-6 font-semibold text-[#5A5A40]">{record.memberName || '-'}</td>
                              <td className="p-4 text-stone-600">{record.age !== undefined && record.age !== null && record.age !== '' ? record.age : '-'}</td>
                              <td className="p-4 text-stone-600">{record.date || '-'}</td>
                              <td className="p-4 text-stone-600">{record.deathReason || '-'}</td>
                              <td className="p-4 text-stone-600">{record.officiant || '-'}</td>
                              <td className="p-4 text-stone-600">{record.tawngtaisaktu || '-'}</td>
                              <td className="p-4 text-stone-600">{record.thlanmualaHunHmangtu || '-'}</td>
                              <td className="p-4 text-stone-600">{record.upaBial || '-'}</td>
                              {isAdmin && (
                                <td className="p-4 pr-6 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button 
                                      onClick={() => openRecordModal(record)} 
                                      className="p-1.5 text-stone-400 hover:text-[#5A5A40] hover:bg-white border border-[#ecece0] rounded-lg transition"
                                      title="Edit Record Entry"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteRecord(record.id)} 
                                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-100 rounded-lg transition"
                                      title="Delete Record Entry"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  }

                  // 3. Baptism
                  if (subCode === 'baptism') {
                    return (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#fcfaf7] border-b border-[#ecece0] text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                            <th className="p-4 pl-6">Hming</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Pian Ni</th>
                            <th className="p-4">Upa Bial</th>
                            <th className="p-4">Officiant</th>
                            {isAdmin && <th className="p-4 pr-6 text-right">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ecece0] text-sm text-[#2d2d2a]">
                          {filteredSubcategoryRecords.map((record) => (
                            <tr key={record.id} className="hover:bg-[#f5f5f0]/50 transition">
                              <td className="p-4 pl-6 font-semibold text-[#5A5A40]">{record.memberName || '-'}</td>
                              <td className="p-4 text-stone-600">{record.date || '-'}</td>
                              <td className="p-4 text-stone-600">{record.birthDate || '-'}</td>
                              <td className="p-4 text-stone-600">{record.upaBial || '-'}</td>
                              <td className="p-4 text-stone-600">{record.officiant || '-'}</td>
                              {isAdmin && (
                                <td className="p-4 pr-6 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button 
                                      onClick={() => openRecordModal(record)} 
                                      className="p-1.5 text-stone-400 hover:text-[#5A5A40] hover:bg-white border border-[#ecece0] rounded-lg transition"
                                      title="Edit Record Entry"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteRecord(record.id)} 
                                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-100 rounded-lg transition"
                                      title="Delete Record Entry"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  }

                  // 4. Testimonial / Pem / Dawnsawn
                  if (['pem', 'dawnsawn', 'testimonial_received', 'testimonial_disbursement'].includes(subCode || '')) {
                    return (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#fcfaf7] border-b border-[#ecece0] text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                            <th className="p-4 pl-6">Hming</th>
                            <th className="p-4">Kohhran atang</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Chhungkaw Member Zat</th>
                            {isAdmin && <th className="p-4 pr-6 text-right">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ecece0] text-sm text-[#2d2d2a]">
                          {filteredSubcategoryRecords.map((record) => (
                            <tr key={record.id} className="hover:bg-[#f5f5f0]/50 transition">
                              <td className="p-4 pl-6 font-semibold text-[#5A5A40]">{record.memberName || '-'}</td>
                              <td className="p-4 text-stone-600">{record.kohhranAtang || '-'}</td>
                              <td className="p-4 text-stone-600">{record.date || '-'}</td>
                              <td className="p-4 text-stone-600">{record.familyMembers || '-'}</td>
                              {isAdmin && (
                                <td className="p-4 pr-6 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button 
                                      onClick={() => openRecordModal(record)} 
                                      className="p-1.5 text-stone-400 hover:text-[#5A5A40] hover:bg-white border border-[#ecece0] rounded-lg transition"
                                      title="Edit Record Entry"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteRecord(record.id)} 
                                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-100 rounded-lg transition"
                                      title="Delete Record Entry"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  }

                  // 5. Default / General Table
                  return (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#fcfaf7] border-b border-[#ecece0] text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                          <th className="p-4 pl-6">Hming</th>
                          <th className="p-4">Date</th>
                          <th className="p-4">Officiant / Leader</th>
                          <th className="p-4">Details</th>
                          {isAdmin && <th className="p-4 pr-6 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ecece0] text-sm text-[#2d2d2a]">
                        {filteredSubcategoryRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-[#f5f5f0]/50 transition">
                            <td className="p-4 pl-6 font-semibold text-[#5A5A40]">
                              {record.memberName || record.groomName || 'Unnamed Record'}
                            </td>
                            <td className="p-4 text-stone-600">{record.date || '-'}</td>
                            <td className="p-4 text-stone-600">{record.officiant || '-'}</td>
                            <td className="p-4 text-stone-600">{record.details || '-'}</td>
                            {isAdmin && (
                              <td className="p-4 pr-6 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button 
                                    onClick={() => openRecordModal(record)} 
                                    className="p-1.5 text-stone-400 hover:text-[#5A5A40] hover:bg-white border border-[#ecece0] rounded-lg transition"
                                    title="Edit Record Entry"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteRecord(record.id)} 
                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-100 rounded-lg transition"
                                    title="Delete Record Entry"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}

                {filteredSubcategoryRecords.length === 0 && (
                  <div className="p-12 text-center text-sm text-stone-500 italic">
                    {searchQuery ? `No records matching "${searchQuery}"` : `No records logged under "${currentSubcategory?.name}" yet.`}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT CATEGORY */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto py-10">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-lg shadow-xl border border-[#e0e0d5] overflow-hidden my-auto">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-serif italic text-[#5A5A40]">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 font-sans max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Category Name</label>
                <input
                  type="text"
                  value={catName}
                  onChange={e => setCatName(e.target.value)}
                  placeholder="e.g. Finance & Audit Records"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Description (Optional)</label>
                <textarea
                  value={catDescription}
                  onChange={e => setCatDescription(e.target.value)}
                  placeholder="e.g. Registry for church financial statements and audits"
                  rows={2}
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] resize-none"
                />
              </div>

              {/* Custom Fields Builder */}
              <div className="pt-4 border-t border-[#e0e0d5] space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold text-[#5A5A40] tracking-widest flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    Custom Category Fields ({catFields.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => openAddFieldForm('category')}
                    className="text-[10px] uppercase font-bold tracking-wider text-[#5A5A40] bg-[#e8e8dc] hover:bg-[#deded0] px-2.5 py-1 rounded-lg transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Field
                  </button>
                </div>

                {catFields.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {catFields.map(field => (
                      <div key={field.id} className="flex items-center justify-between p-2.5 bg-white border border-[#ecece0] rounded-xl text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-700">{field.name}</span>
                          <span className="px-1.5 py-0.5 bg-stone-100 border border-stone-200 rounded text-[9px] font-mono text-stone-500 uppercase">
                            {field.type}
                          </span>
                          {field.required && (
                            <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider">Required</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditFieldForm('category', field)}
                            className="p-1 text-stone-400 hover:text-[#5A5A40]"
                            title="Edit Field"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFieldDefinition('category', field.id)}
                            className="p-1 text-stone-400 hover:text-red-500"
                            title="Delete Field"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 italic bg-white/50 p-3 rounded-xl border border-dashed border-[#d0d0c5]">
                    No custom fields added. Click "+ Add Field" to create fields like Certificate ID, Amount, Location, etc.
                  </p>
                )}

                {/* Inline Field Editor Form */}
                {isFieldFormOpen && fieldEditorTarget === 'category' && renderInlineFieldForm()}
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 sticky bottom-0 z-10">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 border border-[#ecece0]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCategory}
                className="px-5 py-2.5 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35]"
              >
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT SUBCATEGORY */}
      {isSubcategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto py-10">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-lg shadow-xl border border-[#e0e0d5] overflow-hidden my-auto">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-serif italic text-[#5A5A40]">
                {editingSubcategory ? 'Edit Subcategory' : 'Add New Subcategory'}
              </h2>
              <button onClick={() => setIsSubcategoryModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 font-sans max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Parent Category</label>
                <select
                  value={subCatCategoryId}
                  onChange={e => setSubCatCategoryId(e.target.value)}
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Subcategory Name</label>
                <input
                  type="text"
                  value={subCatName}
                  onChange={e => setSubCatName(e.target.value)}
                  placeholder="e.g. Audit Statements"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Description (Optional)</label>
                <textarea
                  value={subCatDescription}
                  onChange={e => setSubCatDescription(e.target.value)}
                  placeholder="e.g. Yearly financial audits"
                  rows={2}
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] resize-none"
                />
              </div>

              {/* Custom Fields Builder */}
              <div className="pt-4 border-t border-[#e0e0d5] space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold text-[#5A5A40] tracking-widest flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    Custom Subcategory Fields ({subCatFields.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => openAddFieldForm('subcategory')}
                    className="text-[10px] uppercase font-bold tracking-wider text-[#5A5A40] bg-[#e8e8dc] hover:bg-[#deded0] px-2.5 py-1 rounded-lg transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Field
                  </button>
                </div>

                {subCatFields.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {subCatFields.map(field => (
                      <div key={field.id} className="flex items-center justify-between p-2.5 bg-white border border-[#ecece0] rounded-xl text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-700">{field.name}</span>
                          <span className="px-1.5 py-0.5 bg-stone-100 border border-stone-200 rounded text-[9px] font-mono text-stone-500 uppercase">
                            {field.type}
                          </span>
                          {field.required && (
                            <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider">Required</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditFieldForm('subcategory', field)}
                            className="p-1 text-stone-400 hover:text-[#5A5A40]"
                            title="Edit Field"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFieldDefinition('subcategory', field.id)}
                            className="p-1 text-stone-400 hover:text-red-500"
                            title="Delete Field"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 italic bg-white/50 p-3 rounded-xl border border-dashed border-[#d0d0c5]">
                    No custom fields added. Click "+ Add Field" to create fields like Receipt ID, Amount, Location, etc.
                  </p>
                )}

                {/* Inline Field Editor Form */}
                {isFieldFormOpen && fieldEditorTarget === 'subcategory' && renderInlineFieldForm()}
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 sticky bottom-0 z-10">
              <button
                type="button"
                onClick={() => setIsSubcategoryModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 border border-[#ecece0]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSubcategory}
                className="px-5 py-2.5 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35]"
              >
                Save Subcategory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD / EDIT RECORD ENTRY */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto py-10">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-xl shadow-xl border border-[#e0e0d5] overflow-hidden my-auto">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-serif italic text-[#5A5A40]">
                {editingRecord ? 'Edit Record Entry' : 'Add Record Entry'}
              </h2>
              <button onClick={() => setIsRecordModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Category</label>
                  <select
                    value={recordCategoryId}
                    onChange={e => {
                      const newCatId = e.target.value;
                      setRecordCategoryId(newCatId);
                      const availableSubs = subcategories.filter(s => s.categoryId === newCatId);
                      if (availableSubs.length > 0) {
                        setRecordSubcategoryId(availableSubs[0].id);
                      }
                    }}
                    className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Subcategory</label>
                  <select
                    value={recordSubcategoryId}
                    onChange={e => setRecordSubcategoryId(e.target.value)}
                    className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  >
                    {subcategories.filter(s => s.categoryId === recordCategoryId).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Subcategory Specific Fields */}
              {(() => {
                const selSub = subcategories.find(s => s.id === recordSubcategoryId);
                const subCode = selSub?.code || selSub?.id || 'general';

                if (subCode === 'baptism') {
                  return (
                    <>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Hming (Name)</label>
                        <input
                          type="text"
                          value={recordMemberName}
                          onChange={e => setRecordMemberName(e.target.value)}
                          placeholder="e.g. Lalramhluna"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Pian Ni (Birth Date)</label>
                          <input
                            type="date"
                            value={recordBirthDate}
                            onChange={e => setRecordBirthDate(e.target.value)}
                            className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Baptisma Ni (Date)</label>
                          <input
                            type="date"
                            value={recordDate}
                            onChange={e => setRecordDate(e.target.value)}
                            className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Pastor / Officiant</label>
                        <input
                          type="text"
                          value={recordOfficiant}
                          onChange={e => setRecordOfficiant(e.target.value)}
                          placeholder="e.g. Rev. Lalthangliana"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>
                    </>
                  );
                }

                if (subCode === 'marriage') {
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Moneitu</label>
                          <input
                            type="text"
                            value={recordGroomName}
                            onChange={e => setRecordGroomName(e.target.value)}
                            placeholder="Moneitu hming"
                            className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Mo</label>
                          <input
                            type="text"
                            value={recordBrideName}
                            onChange={e => setRecordBrideName(e.target.value)}
                            placeholder="Mo hming"
                            className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Date</label>
                          <input
                            type="date"
                            value={recordDate}
                            onChange={e => setRecordDate(e.target.value)}
                            className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Hmun</label>
                          <input
                            type="text"
                            value={recordHmun}
                            onChange={e => setRecordHmun(e.target.value)}
                            placeholder="e.g. Khatla Kohhran Biak In"
                            className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Inneih tirtu</label>
                        <input
                          type="text"
                          value={recordOfficiant}
                          onChange={e => setRecordOfficiant(e.target.value)}
                          placeholder="e.g. Rev. Lalthangliana"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>
                    </>
                  );
                }

                if (subCode === 'death') {
                  return (
                    <>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Hming (Name)</label>
                        <input
                          type="text"
                          value={recordMemberName}
                          onChange={e => setRecordMemberName(e.target.value)}
                          placeholder="e.g. Lalropuia"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Kum (Age)</label>
                          <input
                            type="text"
                            value={recordAge}
                            onChange={e => setRecordAge(e.target.value)}
                            placeholder="e.g. 68"
                            className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Bial (Upa Bial)</label>
                          {upas.length > 0 ? (
                            <select
                              value={recordUpaBial}
                              onChange={e => setRecordUpaBial(e.target.value)}
                              className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                            >
                              <option value="">-- Choose Bial --</option>
                              {Array.from(new Set(upas.map(u => u.bial))).filter(Boolean).map(bialVal => (
                                <option key={bialVal} value={bialVal}>{bialVal}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={recordUpaBial}
                              onChange={e => setRecordUpaBial(e.target.value)}
                              placeholder="e.g. Bial 1"
                              className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                            />
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Thih Ni (Date)</label>
                        <input
                          type="date"
                          value={recordDate}
                          onChange={e => setRecordDate(e.target.value)}
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Thih Chhan (Reason)</label>
                        <input
                          type="text"
                          value={recordDeathReason}
                          onChange={e => setRecordDeathReason(e.target.value)}
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Vuitu</label>
                        <input
                          type="text"
                          value={recordOfficiant}
                          onChange={e => setRecordOfficiant(e.target.value)}
                          placeholder="e.g. Rev. Lalthangliana"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Tawngtaisaktu</label>
                        <input
                          type="text"
                          value={recordTawngtaisaktu}
                          onChange={e => setRecordTawngtaisaktu(e.target.value)}
                          placeholder="e.g. Upa Zokhuma"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Thlanmuala hun hmangtu</label>
                        <input
                          type="text"
                          value={recordThlanmualaHunHmangtu}
                          onChange={e => setRecordThlanmualaHunHmangtu(e.target.value)}
                          placeholder="e.g. T.Upa Lalrinliana"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>
                    </>
                  );
                }

                if (['testimonial_received', 'dawnsawn', 'pem'].includes(subCode)) {
                  return (
                    <>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Hming (Name)</label>
                        <input
                          type="text"
                          value={recordMemberName}
                          onChange={e => setRecordMemberName(e.target.value)}
                          placeholder="e.g. Lalropuia"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Kohhran atang</label>
                          <input
                            type="text"
                            value={recordKohhranAtang}
                            onChange={e => setRecordKohhranAtang(e.target.value)}
                            placeholder="e.g. Khatla Kohhran"
                            className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Date</label>
                          <input
                            type="date"
                            value={recordDate}
                            onChange={e => setRecordDate(e.target.value)}
                            className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Chhungkaw Member Zat</label>
                        <input
                          type="text"
                          value={recordFamilyMembers}
                          onChange={e => setRecordFamilyMembers(e.target.value)}
                          placeholder="e.g. 4"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>
                    </>
                  );
                }

                // Default / Custom Subcategory Form (including Damlo Kan)
                return (
                  <>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Hming / Title / Name</label>
                      <input
                        type="text"
                        value={recordMemberName}
                        onChange={e => setRecordMemberName(e.target.value)}
                        placeholder="Name or Title of entry..."
                        className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Date</label>
                        <input
                          type="date"
                          value={recordDate}
                          onChange={e => setRecordDate(e.target.value)}
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Officiant / Leader (Optional)</label>
                        <input
                          type="text"
                          value={recordOfficiant}
                          onChange={e => setRecordOfficiant(e.target.value)}
                          placeholder="Person in charge"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Custom Category & Subcategory Fields */}
              {(() => {
                const cat = categories.find(c => c.id === recordCategoryId);
                const sub = subcategories.find(s => s.id === recordSubcategoryId);
                const catFieldsList = cat?.fields || [];
                const subFieldsList = sub?.fields || [];
                const allCustomFields = [...catFieldsList, ...subFieldsList];

                if (allCustomFields.length === 0) return null;

                return (
                  <div className="pt-4 border-t border-[#e0e0d5] space-y-3 font-sans">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#5A5A40] uppercase tracking-wider">
                      <Sliders className="w-4 h-4" />
                      Custom Category & Subcategory Fields
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {allCustomFields.map(field => {
                        const val = recordCustomValues[field.id] ?? recordCustomValues[field.name] ?? '';
                        return (
                          <div key={field.id} className={field.type === 'textarea' ? 'col-span-full' : ''}>
                            <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">
                              {field.name} {field.required && <span className="text-red-500">*</span>}
                            </label>

                            {field.type === 'text' && (
                              <input
                                type="text"
                                value={val}
                                onChange={e => setRecordCustomValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                placeholder={`Enter ${field.name}...`}
                                className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                                required={field.required}
                              />
                            )}

                            {field.type === 'number' && (
                              <input
                                type="number"
                                value={val}
                                onChange={e => setRecordCustomValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                placeholder={`Enter ${field.name}...`}
                                className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                                required={field.required}
                              />
                            )}

                            {field.type === 'date' && (
                              <input
                                type="date"
                                value={val}
                                onChange={e => setRecordCustomValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                                required={field.required}
                              />
                            )}

                            {field.type === 'select' && (
                              <select
                                value={val}
                                onChange={e => setRecordCustomValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                                required={field.required}
                              >
                                <option value="">-- Choose {field.name} --</option>
                                {field.options?.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            )}

                            {field.type === 'textarea' && (
                              <textarea
                                value={val}
                                onChange={e => setRecordCustomValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                placeholder={`Enter ${field.name}...`}
                                rows={2}
                                className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] resize-none"
                                required={field.required}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Details / Notes</label>
                <textarea
                  value={recordDetails}
                  onChange={e => setRecordDetails(e.target.value)}
                  rows={3}
                  placeholder="Additional notes or descriptions..."
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 sticky bottom-0 z-10">
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(false)}
                className="px-6 py-2.5 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 border border-[#ecece0]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRecord}
                className="px-6 py-2.5 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35]"
              >
                Save Record Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

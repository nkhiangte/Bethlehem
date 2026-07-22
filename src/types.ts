export interface Upa {
  id: string;
  name: string;
  bio: string;
  bial: string; // Area
  phone: string;
  imageUrl?: string;
  mapImageUrl?: string;
  mapDescription?: string;
  sortOrder?: number;
}

export interface Member {
  id: string;
  name: string;
  address: string;
  phone: string;
  upaBial: string;
  familyHead: string;
  dob?: string;
  dzk?: boolean;
}

export interface RecordFieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  options?: string[];
  required?: boolean;
}

export interface RecordCategory {
  id: string;
  name: string;
  description?: string;
  isBuiltIn?: boolean;
  fields?: RecordFieldDefinition[];
}

export interface RecordSubcategory {
  id: string;
  categoryId: string;
  name: string;
  code?: string;
  description?: string;
  isBuiltIn?: boolean;
  fields?: RecordFieldDefinition[];
}

export type RecordType = string;

export interface ChurchRecord {
  id: string;
  memberId?: string;
  memberName: string;
  type: RecordType;
  categoryId?: string;
  subcategoryId?: string;
  date: string;
  details?: string;
  officiant?: string;
  birthDate?: string;
  groomName?: string;
  brideName?: string;
  deathReason?: string;
  familyMembers?: string;
  upaBial?: string;
  month?: string;
  customFields?: Record<string, any>;
  [key: string]: any;
}

export const DEFAULT_RECORD_CATEGORIES: RecordCategory[] = [
  { id: 'church_records', name: 'Church Records', description: 'Digital registry of church records and sacraments', isBuiltIn: true },
];

export const DEFAULT_RECORD_SUBCATEGORIES: RecordSubcategory[] = [
  { id: 'baptism', categoryId: 'church_records', name: 'Baptisma', code: 'baptism', isBuiltIn: true },
  { id: 'marriage', categoryId: 'church_records', name: 'Inneih', code: 'marriage', isBuiltIn: true },
  { id: 'death', categoryId: 'church_records', name: 'Mitthi', code: 'death', isBuiltIn: true },
  { id: 'pem', categoryId: 'church_records', name: 'Pem (Emigrate)', code: 'pem', isBuiltIn: true },
  { id: 'dawnsawn', categoryId: 'church_records', name: 'Dawnsawn (Immigrate)', code: 'dawnsawn', isBuiltIn: true },
  { id: 'testimonial_received', categoryId: 'church_records', name: 'Testimonial dawn', code: 'testimonial_received', isBuiltIn: true },
  { id: 'testimonial_disbursement', categoryId: 'church_records', name: 'Testimonial pekchhuah', code: 'testimonial_disbursement', isBuiltIn: true },
  { id: 'converted', categoryId: 'church_records', name: 'Pawl dang atanga lo pakai', code: 'converted', isBuiltIn: true },
  { id: 'damlokan', categoryId: 'church_records', name: 'Damlo Kan', code: 'damlokan', isBuiltIn: true },
];

export interface ProgramRole {
  role: string;
  value: string;
}

export interface InkhawmProgramme {
  id: string;
  title: string;
  date: string;
  time: string;
  roles: ProgramRole[];
}

export const DEFAULT_PROGRAM_ROLES: Record<string, string[]> = {
  'Pathianni (Sunday) Chawhma': ['Tantu', 'Zirlai', 'Zirtirtu'],
  'Pathianni (Sunday) Chawhnu': ['Tantu', 'Thuhriltu'],
  'Pathianni (Sunday) Zan': ['Thuhriltu'],
  'Thawhtanni Zan (KTP)': ['Hruaitu', 'Tantu', 'Thuhriltu'],
  'Thawhlehni Zan (Kohhran Hmeichhia)': ['Hruaitu', 'Tantu', 'Thuhriltu'],
  'Nilai Zan': ['Hruaitu', 'Tantu', 'Thupui Hawngtu'],
  'Inrinni Zan': ['Hruaitu', 'Tantu', 'Thuhriltu']
};

export const PROGRAM_TITLES = Object.keys(DEFAULT_PROGRAM_ROLES);

export interface ArchiveRole {
  role: string;
  personName: string;
}

export interface ArchiveYear {
  id: string;
  year: string;
  roles: ArchiveRole[];
}

export const DEFAULT_ARCHIVE_ROLES = [
  'Kohhran Chairman',
  'Kohhran Vice Chairman',
  'Secretary',
  'Treasurer',
  'Fin Secretary',
  'Sunday School Suptd',
  'Sunday School Secretary'
];

export interface TawngtaiHruaituDay {
  date: number;
  dayName: string;
  zingLeader: string;
  tlaiLeader: string;
}

export interface TawngtaiHruaituMonth {
  id: string;
  yearMonth: string; // e.g. "2026-07"
  days: TawngtaiHruaituDay[];
}

export interface CommitteeBearer {
  title: string;
  name: string;
}

export interface Committee {
  id: string;
  name: string;
  bearers: CommitteeBearer[];
}

export const DEFAULT_COMMITTEES = [
  'Kohhran Committee',
  'Ramthar',
  'Building',
  'Sunday School'
];

export const DEFAULT_COMMITTEE_BEARERS = [
  'Chairman',
  'Vice Chairman',
  'Secretary',
  'Asst. Secretary',
  'Treasurer',
  'Financial Secretary'
];

export interface FellowshipBearer {
  title: string;
  name: string;
}

export interface Fellowship {
  id: string;
  name: string;
  bearers: FellowshipBearer[];
}

export const DEFAULT_FELLOWSHIPS = [
  'Kohhran Hmeichhia',
  'KTP',
  'Kohhran Pavalai Pawl'
];

export const DEFAULT_FELLOWSHIP_BEARERS = [
  'Leader/Chairman',
  'Asst. Leader/Vice Chairman',
  'Secretary',
  'Asst. Secretary',
  'Treasurer',
  'Financial Secretary'
];

export interface DamloKanRecord {
  id: string;
  name: string; // Hming
  month: string; // Thla
  upaBial: string; // Upa Bial
}

export interface NewsArticle {
  id: string;
  title: string;
  content: string; // Rich text (HTML or Markdown)
  date: string;
  author?: string;
  imageUrl?: string;
}

export interface GalleryFolder {
  id: string;
  name: string;
  parentFolderId: string | null;
  date: string;
}

export interface GalleryImage {
  id: string;
  title: string;
  imageUrl: string;
  date: string;
  folderId?: string | null;
}

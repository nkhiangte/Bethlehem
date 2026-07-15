import { useState, useEffect } from 'react';
import { Calendar, Users, FileText, UserCircle2 } from 'lucide-react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { Member, Upa, InkhawmProgramme, ChurchRecord } from '../types';

export default function Dashboard() {
  const [memberCount, setMemberCount] = useState(0);
  const [upaCount, setUpaCount] = useState(0);
  const [programCount, setProgramCount] = useState(0);
  const [recordCount, setRecordCount] = useState(0);
  
  const [upcomingPrograms, setUpcomingPrograms] = useState<InkhawmProgramme[]>([]);
  const [recentRecords, setRecentRecords] = useState<ChurchRecord[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!isFirebaseConfigured || !db) return;

    try {
      const membersSnap = await getDocs(collection(db, 'members'));
      setMemberCount(membersSnap.size);

      const upasSnap = await getDocs(collection(db, 'upas'));
      setUpaCount(upasSnap.size);

      const programsSnap = await getDocs(query(collection(db, 'programs'), orderBy('date', 'desc'), limit(5)));
      setProgramCount(programsSnap.size); // This is just the recent count, but that's fine for now or we can query all if needed, but size of all is better for stat
      const allProgramsSnap = await getDocs(collection(db, 'programs'));
      setProgramCount(allProgramsSnap.size);
      
      const programsData = programsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InkhawmProgramme));
      setUpcomingPrograms(programsData);

      const recordsSnap = await getDocs(query(collection(db, 'records'), orderBy('date', 'desc'), limit(5)));
      const allRecordsSnap = await getDocs(collection(db, 'records'));
      setRecordCount(allRecordsSnap.size);

      const recordsData = recordsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChurchRecord));
      setRecentRecords(recordsData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const stats = [
    { 
      name: 'Total Members', 
      value: memberCount, 
      icon: Users,
    },
    { 
      name: 'Active Elders', 
      value: upaCount, 
      icon: UserCircle2,
    },
    { 
      name: 'Programs', 
      value: programCount, 
      icon: Calendar,
    },
    { 
      name: 'Records', 
      value: recordCount, 
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight uppercase">Dashboard Overview</h1>
        <p className="mt-1 text-stone-500 font-sans text-xs uppercase tracking-widest">Bethlehem Kohhran Administration</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-[32px] p-6 shadow-sm border border-[#e0e0d5] flex items-center">
            <div className="p-3 bg-[#fcfaf7] border border-[#ecece0] rounded-2xl text-[#5A5A40]">
              <stat.icon className="w-6 h-6" />
            </div>
            <div className="ml-4 font-sans flex-1">
              <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-1">{stat.name}</p>
              <p className="text-2xl font-serif text-[#5A5A40] leading-none">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#e0e0d5]">
          <h3 className="text-[#5A5A40] text-xs uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#5A5A40] rounded-full"></span> Upcoming Programs
          </h3>
          <div className="space-y-4 font-sans">
            {upcomingPrograms.map((program) => (
              <div key={program.id} className="p-4 bg-[#fcfaf7] border border-[#ecece0] rounded-2xl flex flex-col sm:flex-row justify-between">
                <div className="flex-1">
                  <p className="text-[10px] text-stone-400 uppercase font-bold">{program.date} • {program.time}</p>
                  <h4 className="text-lg font-serif italic text-[#5A5A40] mt-1 mb-2">{program.title}</h4>
                  <div className="space-y-1">
                    {program.roles.map((r, i) => (
                      <p key={i} className="text-sm text-stone-500">
                        <span className="font-semibold text-[#2d2d2a]">{r.role}:</span> {r.value}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {upcomingPrograms.length === 0 && (
              <p className="text-sm text-stone-500 italic">No upcoming programs.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#e0e0d5]">
          <h3 className="text-[#5A5A40] text-xs uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#5A5A40] rounded-full"></span> Recent Records
          </h3>
          <div className="space-y-4 font-sans">
            {recentRecords.map((record) => (
              <div key={record.id} className="p-4 border border-[#ecece0] rounded-2xl opacity-90 flex justify-between items-start bg-[#fcfaf7]">
                <div>
                  <p className="text-[10px] text-stone-400 uppercase font-bold">{record.date}</p>
                  <h4 className="text-md font-serif italic text-[#5A5A40] mt-1">{record.memberName}</h4>
                  <p className="text-xs text-stone-500 mt-1">{record.details}</p>
                </div>
                <span className="text-[9px] uppercase tracking-wider font-bold border border-[#ecece0] px-2 py-1 rounded-md bg-white text-stone-500 shrink-0">
                  {record.type.replace('_', ' ')}
                </span>
              </div>
            ))}
            {recentRecords.length === 0 && (
              <p className="text-sm text-stone-500 italic">No recent records.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

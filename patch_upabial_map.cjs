const fs = require('fs');
let content = fs.readFileSync('src/pages/UpaBial.tsx', 'utf8');

content = content.replace(`  const [elderImageUrl, setElderImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);`, `  const [elderImageUrl, setElderImageUrl] = useState('');
  const [mapImageUrl, setMapImageUrl] = useState('');
  const [mapDescription, setMapDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMapFile, setSelectedMapFile] = useState<File | null>(null);`);

content = content.replace(`  const openBialModal = (upa?: Upa) => {
    if (upa) {
      setEditingUpa(upa);
      setElderName(upa.name);
      setBialName(upa.bial);
      setElderPhone(upa.phone);
      setElderBio(upa.bio || '');
      setElderImageUrl(upa.imageUrl || '');
    } else {
      setEditingUpa(null);
      setElderName('');
      setBialName('');
      setElderPhone('');
      setElderBio('');
      setElderImageUrl('');
      setSelectedFile(null);
    }
    setIsBialModalOpen(true);
  };`, `  const openBialModal = (upa?: Upa) => {
    if (upa) {
      setEditingUpa(upa);
      setElderName(upa.name);
      setBialName(upa.bial);
      setElderPhone(upa.phone);
      setElderBio(upa.bio || '');
      setElderImageUrl(upa.imageUrl || '');
      setMapImageUrl(upa.mapImageUrl || '');
      setMapDescription(upa.mapDescription || '');
    } else {
      setEditingUpa(null);
      setElderName('');
      setBialName('');
      setElderPhone('');
      setElderBio('');
      setElderImageUrl('');
      setMapImageUrl('');
      setMapDescription('');
    }
    setSelectedFile(null);
    setSelectedMapFile(null);
    setIsBialModalOpen(true);
  };`);

content = content.replace(`  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };`, `  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleMapFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedMapFile(e.target.files[0]);
    }
  };`);

content = content.replace(`      let finalImageUrl = elderImageUrl;
      if (selectedFile) {
        finalImageUrl = await uploadImageToImgbb(selectedFile);
      }

      const upaData = {
        name: elderName,
        bial: bialName,
        phone: elderPhone,
        bio: elderBio,
        imageUrl: finalImageUrl
      };`, `      let finalImageUrl = elderImageUrl;
      if (selectedFile) {
        finalImageUrl = await uploadImageToImgbb(selectedFile);
      }

      let finalMapImageUrl = mapImageUrl;
      if (selectedMapFile) {
        finalMapImageUrl = await uploadImageToImgbb(selectedMapFile);
      }

      if (!finalMapImageUrl) {
        alert("Khawngaihin Bial Map thlalak (image) thun rawh. (Mandatory)");
        setIsUploading(false);
        return;
      }

      const upaData = {
        name: elderName,
        bial: bialName,
        phone: elderPhone,
        bio: elderBio,
        imageUrl: finalImageUrl,
        mapImageUrl: finalMapImageUrl,
        mapDescription: mapDescription
      };`);

content = content.replace(`              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Upa Image (Optional)</label>`, `              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Bial Map Description (Optional)</label>
                <textarea 
                  value={mapDescription} 
                  onChange={e => setMapDescription(e.target.value)}
                  placeholder="e.g. This area covers the northern part..."
                  rows={2}
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] resize-none mb-4"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Bial Map Image (Mandatory) *</label>
                <div className="flex items-center gap-4 mb-4">
                  {mapImageUrl && !selectedMapFile && (
                    <img src={mapImageUrl} alt="Map Preview" className="w-16 h-16 rounded-xl object-cover border border-[#ecece0]" />
                  )}
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleMapFileChange}
                    className="w-full p-2 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Upa Image (Optional)</label>`);

fs.writeFileSync('src/pages/UpaBial.tsx', content);

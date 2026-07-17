const fs = require('fs');
let content = fs.readFileSync('src/pages/UpaBial.tsx', 'utf8');

const oldFunc = `  const handleSaveBial = async () => {
    if (!elderName || !bialName || !elderPhone) {
      alert("Khawngaihin a hming, bial leh phone number ziah hmaih suh.");
      return;
    }

    const upaData = {
      name: elderName,
      bial: bialName,
      phone: elderPhone,
      bio: elderBio
    };

    if (!isFirebaseConfigured || !db) {
      // Local fallback
      const updatedUpas = [...upas];
      if (editingUpa) {
        const idx = updatedUpas.findIndex(u => u.id === editingUpa.id);
        if (idx !== -1) {
          updatedUpas[idx] = { ...editingUpa, ...upaData };
        }
      } else {
        const newUpa: Upa = {
          id: 'local_upa_' + Date.now(),
          ...upaData
        };
        updatedUpas.push(newUpa);
      }
      localStorage.setItem('local_upas', JSON.stringify(updatedUpas));
      setUpas(updatedUpas);
      setIsBialModalOpen(false);
      // Select the newly added or updated Bial
      const updatedItem = editingUpa ? updatedUpas.find(u => u.id === editingUpa.id) : updatedUpas[updatedUpas.length - 1];
      if (updatedItem) setSelectedUpa(updatedItem);
      return;
    }

    try {
      if (editingUpa?.id) {
        await updateDoc(doc(db, 'upas', editingUpa.id), upaData);
      } else {
        await addDoc(collection(db, 'upas'), upaData);
      }
      setIsBialModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error("Error saving elder/bial:", error);
      alert("Failed to save elder/bial.");
    }
  };`;

const newFunc = `  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSaveBial = async () => {
    if (!elderName || !bialName || !elderPhone) {
      alert("Khawngaihin a hming, bial leh phone number ziah hmaih suh.");
      return;
    }

    if (!isFirebaseConfigured || !db) {
      alert("Firebase not configured.");
      return;
    }

    setIsUploading(true);
    try {
      let finalImageUrl = elderImageUrl;
      if (selectedFile) {
        finalImageUrl = await uploadImageToImgbb(selectedFile);
      }

      const upaData = {
        name: elderName,
        bial: bialName,
        phone: elderPhone,
        bio: elderBio,
        imageUrl: finalImageUrl
      };

      if (editingUpa?.id) {
        await updateDoc(doc(db, 'upas', editingUpa.id), upaData);
      } else {
        await addDoc(collection(db, 'upas'), upaData);
      }
      setIsBialModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error("Error saving elder/bial:", error);
      alert("Failed to save elder/bial.");
    } finally {
      setIsUploading(false);
    }
  };`;

content = content.replace(oldFunc, newFunc);
fs.writeFileSync('src/pages/UpaBial.tsx', content);

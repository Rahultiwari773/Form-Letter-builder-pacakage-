const fs = require('fs');
let file = fs.readFileSync('src/LetterBuilder.js', 'utf8');

// 1. Add handleDeleteCurrent
const deleteFunc = `
  const handleDeleteCurrent = async () => {
    if (!currentTemplateId) return;
    try {
      setIsSaving(true);
      if (apiConfig?.deleteDocument) await apiConfig.deleteDocument(currentTemplateId);
      
      setCurrentTemplateId(null);
      setDocName("New Blank Document");
      setSections({});
      setSectionList([]);
      setLogo(null);
      
      if (Platform.OS === 'web') {
        window.alert('Document deleted successfully.');
      } else {
        Alert.alert('Success', 'Document deleted successfully.');
      }
    } catch (error) {
      console.warn("Failed to delete document", error);
      if (Platform.OS === 'web') {
        window.alert('Failed to delete document. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete document. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };
`;
file = file.replace(/(const handleSaveDraft = async \(\) => \{)/, deleteFunc + '\n  $1');

// 2. Rename Save Template to Update Template
file = file.replace(
  /\{isSaving \? "Saving\.\.\." : "Save Template"\}/,
  '{isSaving ? "Saving..." : currentTemplateId ? "Update Template" : "Save Template"}'
);

// 3. Add Delete Button next to Save
const deleteBtn = `
              {currentTemplateId && apiConfig?.deleteDocument && (
                <Pressable
                  style={({ pressed }) => [
                    styles.saveBtn,
                    { backgroundColor: '#EF4444' },
                    isSaving && { opacity: 0.7 },
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                  ]}
                  onPress={handleDeleteCurrent}
                  disabled={isSaving}
                >
                  <Feather name="trash-2" size={16} color="#FFFFFF" />
                  <RNText style={styles.saveBtnText}>
                    {isSaving ? "Deleting..." : "Delete"}
                  </RNText>
                </Pressable>
              )}
`;
file = file.replace(
  /(<Pressable[\s\S]*?onPress=\{handleSave\}[\s\S]*?<\/Pressable>)/,
  '$1' + deleteBtn
);

// 4. Add Upload/Paste button to the toolbar
file = file.replace(
  /(<IconButton name="file-text" label="Templates" onPress=\{\(\) => setShowTemplates\(true\)\} type="Feather" \/>)/,
  `$1\n                <IconButton name="upload-cloud" label="Upload/Paste" onPress={() => { setShowTemplates(true); setActiveTemplatesTab('upload'); }} type="Feather" />`
);

fs.writeFileSync('src/LetterBuilder.js', file);
console.log("UI Buttons updated!");

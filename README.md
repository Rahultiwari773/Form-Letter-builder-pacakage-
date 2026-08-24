# react-native-letter-builder

A reusable, drag-and-drop letter builder component for React Native and Expo applications.

## Installation

```bash
npm install react-native-letter-builder
```

You also need to install peer dependencies:
```bash
npm install react-native-gesture-handler react-native-reanimated @expo/vector-icons expo-print expo-sharing @react-native-async-storage/async-storage expo-image-picker expo-document-picker html2pdf.js pdfjs-dist mammoth
```

## Usage

```jsx
import React, from 'react';
import LetterBuilder from 'react-native-letter-builder';

export default function App() {
  const apiConfig = {
    fetchDocuments: async () => {
      // API call to fetch templates
      return await fetch('/api/templates');
    },
    deleteDocument: async (id) => {
      // API call to delete a template
      return await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    }
  };

  const variables = {
    EmployeeName: "John Doe",
    CompanyName: "Acme Corp",
    JobTitle: "Software Engineer",
    JoiningDate: "2026-09-01"
  };

  const handleSave = async (docData) => {
    // API call to create document
    return await fetch('/api/templates', { method: 'POST', body: JSON.stringify(docData) });
  };

  const handleUpdate = async (docData) => {
    // API call to update existing document
    return await fetch(`/api/templates/${docData.id}`, { method: 'PUT', body: JSON.stringify(docData) });
  };

  const handleExport = (exportData) => {
    console.log("PDF Exported!", exportData);
  };

  return (
    <LetterBuilder 
      apiConfig={apiConfig}
      variables={variables}
      onSave={handleSave}
      onUpdate={handleUpdate}
      onExport={handleExport}
      // initialTemplate={{ ... }} // Optionally pass a preset template
    />
  );
}
```

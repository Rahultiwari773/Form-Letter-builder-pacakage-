import React from 'react';

export interface ApiConfig {
  /**
   * Function to fetch existing library documents/templates.
   * Should return an array of document objects.
   */
  fetchDocuments?: () => Promise<any[]>;
  /**
   * Function to delete a document/template by ID.
   */
  deleteDocument?: (id: string | number) => Promise<void>;
}

export interface LetterBuilderProps {
  /**
   * API configuration for fetching and deleting documents.
   * If omitted, the 'My Files' library button will be hidden.
   */
  apiConfig?: ApiConfig;
  /**
   * Variables to pre-fill dynamic fields like {{EmployeeName}}.
   * Example: { EmployeeName: "John Doe", CompanyName: "Acme Corp" }
   */
  variables?: Record<string, string>;
  /**
   * Initial template object to load into the builder.
   */
  initialTemplate?: any;
  /**
   * Callback fired when the user clicks save on a new document.
   * If omitted along with onUpdate, the Save button will be hidden.
   */
  onSave?: (docData: any) => Promise<any>;
  /**
   * Callback fired when the user clicks save on an existing document.
   * If omitted along with onSave, the Save button will be hidden.
   */
  onUpdate?: (docData: any) => Promise<any>;
  /**
   * Callback fired when a PDF is generated and exported.
   * @param exportData Metadata about the export, e.g. { uri: string, type: string }
   */
  onExport?: (exportData: { uri?: string; type: string }) => void;
  /**
   * Custom fonts configuration
   */
  fonts?: {
    fontFamily: {
      regular: string;
      bold: string;
      semiBold: string;
      medium: string;
    };
  };
}

declare const LetterBuilder: React.FC<LetterBuilderProps>;
export default LetterBuilder;

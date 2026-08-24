import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  SafeAreaView, View, ScrollView, TextInput, StyleSheet,
  Pressable, Image, Modal, Alert, Text as RNText, StatusBar, Platform, useWindowDimensions, TouchableOpacity, ActivityIndicator
} from "react-native";
import { GestureHandlerRootView, GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Feather, MaterialCommunityIcons, FontAwesome, MaterialIcons, Octicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import html2pdf from "html2pdf.js";



const FontsProvider = { fontFamily: { regular: 'System', bold: 'System', semiBold: 'System', medium: 'System' } };
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import FormBuilder from './DragDrown';

if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
}

export const formatCssDimension = (value, defaultUnit = 'px') => {
  if (value === undefined || value === null || value === '') return '';
  const str = String(value).trim();
  if (!str) return '';

  const parts = str.split(/\s+/).map(part => {
    let cleaned = part.replace(/^0+(?=\d)/, '');
    if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
      if (cleaned === '0') return '0px';
      return `${cleaned}${defaultUnit}`;
    }
    return cleaned;
  });

  return parts.join(' ');
};

export const renderMarkdownText = (text, baseStyle) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <RNText key={index} style={[baseStyle, { fontWeight: 'bold', fontFamily: FontsProvider ? FontsProvider.fontFamily.bold : 'sans-serif-medium' }]}>
          {part.slice(2, -2)}
        </RNText>
      );
    }
    return <RNText key={index} style={baseStyle}>{part}</RNText>;
  });
};

export const createSectionItem = (fieldType) => {
  const newId = `sec_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  let defaultLabel = 'CUSTOM TEXT BLOCK';
  let defaultContent = 'Add your custom letter content here...';
  let defaultHeaders;
  let defaultRows;
  let defaultBold = false;

  if (fieldType === 'headerInfo' || fieldType === 'header') {
    defaultLabel = 'COMPANY LETTERHEAD & LOGO';
    defaultContent = 'YOUR COMPANY NAME\nðŸ“ +91 98765 43210  |  âœ‰ï¸ info@company.com  |  ðŸŒ www.company.com';
    defaultBold = true;
  } else if (fieldType === 'signature') {
    defaultLabel = 'SIGNATURE BLOCK';
    defaultContent = 'Sincerely,\n\n_______________________\n[Authorized Signatory]\nHR Manager | Your Company';
  } else if (fieldType === 'subject') {
    defaultLabel = 'SUBJECT LINE';
    defaultContent = 'Subject: [Write letter subject / title here]';
    defaultBold = true;
  } else if (fieldType === 'recipient') {
    defaultLabel = 'RECIPIENT BLOCK';
    defaultContent = '[Recipient Name]\n[Company Name]\n[Address Line 1]\n[City, State, Zip]';
  } else if (fieldType === 'dateRef') {
    defaultLabel = 'DATE & REF NO.';
    defaultContent = 'Date: {{currentDate}}\nRef No: {{referenceNumber}}';
  } else if (fieldType === 'stamp') {
    defaultLabel = 'STAMP & SEAL';
    defaultContent = '[Company Seal / Stamp]';
  } else if (fieldType === 'terms') {
    defaultLabel = 'TERMS & CLAUSES';
    defaultContent = '1. Term of Employment:\n2. Compensation:\n3. Confidentiality:\n4. Termination:';
  } else if (fieldType === 'formInput') {
    defaultLabel = 'TEXT INPUT';
    defaultContent = 'form_element';
  } else if (fieldType === 'formTextArea') {
    defaultLabel = 'TEXT AREA';
    defaultContent = 'form_element';
  } else if (fieldType === 'formDatePicker') {
    defaultLabel = 'DATE PICKER';
    defaultContent = 'form_element';
  } else if (fieldType === 'formFileUpload') {
    defaultLabel = 'FILE UPLOAD';
    defaultContent = 'form_element';
  } else if (fieldType === 'formRadio') {
    defaultLabel = 'RADIO BUTTONS';
    defaultContent = 'form_element';
  } else if (fieldType === 'formCheckbox') {
    defaultLabel = 'CHECKBOX';
    defaultContent = 'form_element';
  } else if (fieldType === 'formToggle') {
    defaultLabel = 'TOGGLE SWITCH';
    defaultContent = 'form_element';
  } else if (fieldType === 'formRating') {
    defaultLabel = 'STAR RATING';
    defaultContent = 'form_element';
  } else if (fieldType === 'formDropdown') {
    defaultLabel = 'DROPDOWN';
    defaultContent = 'form_element';
  } else if (fieldType === 'formSubmit') {
    defaultLabel = 'SUBMIT BUTTON';
    defaultContent = 'Submit Form';
    defaultBold = true;
  } else if (fieldType === 'table') {
    defaultLabel = 'CUSTOM TABLE';
    defaultContent = '';
    defaultHeaders = ['Description', 'Amount (â‚¹)'];
    defaultRows = [['Item 1', '1000'], ['Item 2', '2000']];
  } else if (fieldType === 'spacer') {
    defaultLabel = 'EMPTY SPACER';
    defaultContent = '';
  }

  return {
    id: newId,
    type: fieldType === 'customText' ? 'custom' : fieldType,
    label: defaultLabel,
    content: defaultContent,
    enabled: true,
    headers: defaultHeaders,
    rows: defaultRows,
    fontSize: 11,
    align: 'left',
    bold: defaultBold,
    color: '#1F2937',
    width: '100%'
  };
};

export const balanceSectionWidths = (newList, dropTargetIdx, side) => {
  if (!newList || newList.length === 0) return newList;
  const list = newList.map(item => ({ ...item }));

  const getNumWidth = (w) => {
    if (!w) return 100;
    const num = parseFloat(String(w).replace('%', '').replace('px', ''));
    return isNaN(num) ? 100 : num;
  };

  // 1. Explicit side-by-side drop (user dragged & dropped onto left or right side of a specific element)
  if (dropTargetIdx !== undefined && (side === 'left' || side === 'right')) {
    const droppedItem = list[dropTargetIdx];
    const neighborIdx = side === 'left' ? dropTargetIdx + 1 : dropTargetIdx - 1;
    if (droppedItem && neighborIdx >= 0 && neighborIdx < list.length) {
      const neighbor = list[neighborIdx];
      const neighborW = getNumWidth(neighbor.width);
      if (neighborW >= 90) {
        neighbor.width = '50%';
        droppedItem.width = '50%';
      } else {
        droppedItem.width = neighbor.width || '50%';
      }
    }
  }

  // 2. Clean up any element that is now ALONE in its row (restore alone elements to 100% if auto-split)
  let currentRow = [];
  let currentSum = 0;

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const w = getNumWidth(item.width);

    if (w >= 90) {
      if (currentRow.length === 1) {
        const single = currentRow[0];
        if ((single.width === '50%' || single.width === '33.33%') && !String(single.width).includes('px')) {
          single.width = '100%';
        }
      }
      currentRow = [];
      currentSum = 0;
    } else {
      if (currentSum + w > 100.5) {
        if (currentRow.length === 1) {
          const single = currentRow[0];
          if ((single.width === '50%' || single.width === '33.33%') && !String(single.width).includes('px')) {
            single.width = '100%';
          }
        }
        currentRow = [item];
        currentSum = w;
      } else {
        currentRow.push(item);
        currentSum += w;
      }
    }
  }

  if (currentRow.length === 1) {
    const single = currentRow[0];
    if ((single.width === '50%' || single.width === '33.33%') && !String(single.width).includes('px')) {
      single.width = '100%';
    }
  }

  return list;
};

export const templates = {
  blank: {
    docName: "Blank Letter",
    sections: {
      headerInfo: { content: "ðŸ“ž +91 98765 43210  |  âœ‰ï¸ info@company.com  |  ðŸŒ www.company.com" },
      sender: { content: "" },
      company: { content: "Your Company\nCorporate Headquarters" },
      date: { content: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
      recipient: { content: "Recipient Name\nAddress" },
      subject: { content: "RE: SUBJECT LINE" },
      salutation: { content: "Dear Sir/Madam," },
      body: { content: "Start typing your letter content here..." },
      closing: { content: "Sincerely," },
      signature: { content: "Authorized Signatory\nYour Company" }
    }
  },
  joining: {
    docName: "Joining Confirmation Letter",
    sections: {
      headerInfo: { content: "ðŸ“ž +91 98765 43210  |  âœ‰ï¸ info@company.com  |  ðŸŒ www.company.com" },
      sender: { content: "" },
      company: { content: "Your Company\nCorporate HR Department\nCorporate Headquarters" },
      date: { content: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
      recipient: { content: "To: {{EmployeeName}}\nEmployee ID: {{EmployeeID}}\nDesignation: {{JobTitle}}" },
      subject: { content: "RE: OFFICIAL CONFIRMATION OF APPOINTMENT & JOINING" },
      salutation: { content: "Dear {{EmployeeName}}," },
      body: { content: "We are pleased to officially confirm your appointment with {{CompanyName}} as {{JobTitle}}, with your joining date recorded as {{JoiningDate}}.\n\nYour assigned employee identification number is {{EmployeeID}}. Please submit all required onboarding documents including identity proof, academic transcripts, bank details, and prior employment clearance certificates to the HR team within seven (7) working days.\n\nWe are confident that your expertise and dedication will be a valuable asset to our organization. We wish you a long, productive, and rewarding career with {{CompanyName}}." },
      closing: { content: "Warm regards,\n\nSincerely," },
      signature: { content: "Head of Human Resources\n{{CompanyName}}" }
    }
  },
  offer: {
    docName: "Offer Letter",
    sections: {
      headerInfo: { content: "ðŸ“ž +91 98765 43210  |  âœ‰ï¸ info@company.com  |  ðŸŒ www.company.com" },
      sender: { content: "" },
      company: { content: "Your Company\nCorporate HR Department\nCorporate Headquarters" },
      date: { content: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
      recipient: { content: "{{CandidateName}}\n{{CandidateAddress}}" },
      subject: { content: "RE: JOB OFFER LETTER - {{JobTitle}}" },
      salutation: { content: "Dear {{CandidateName}}," },
      body: { content: "Following our recent discussions and interview process, we are delighted to extend an offer of employment for the position of {{JobTitle}} at {{CompanyName}}.\n\nYour annual Cost to Company (CTC) will be â‚¹ {{Salary}} per annum, payable in monthly installments subject to applicable statutory deductions. Your anticipated joining date will be {{JoiningDate}}.\n\nThis offer is contingent upon successful completion of background checks and verification of references. Please sign and return a duplicate copy of this letter by {{DeadlineDate}} to confirm your acceptance." },
      closing: { content: "We look forward to welcoming you to the team!\n\nSincerely," },
      signature: { content: "Head of Talent Acquisition\n{{CompanyName}}" }
    }
  },
  salary: {
    docName: "Salary Certificate",
    sections: {
      headerInfo: { content: "ðŸ“ž +91 98765 43210  |  âœ‰ï¸ info@company.com  |  ðŸŒ www.company.com" },
      sender: { content: "" },
      company: { content: "Payroll Division\nYour Company\nCorporate Headquarters" },
      date: { content: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
      recipient: { content: "To Whomsoever It May Concern" },
      subject: { content: "RE: SALARY CERTIFICATE FOR {{EmployeeName}}" },
      salutation: { content: "Dear Sir/Madam," },
      body: { content: "This is to certify that {{EmployeeName}} is currently employed with {{CompanyName}} holding the position of {{JobTitle}}.\n\nTheir regular monthly salary remuneration structure for {{Month}} is set forth in detail below:" },
      table: {
        enabled: true,
        headers: ["Component", "Monthly Amount (â‚¹)"],
        rows: [
          ["Basic Salary", "{{BasicSalary}}"],
          ["House Rent Allowance (HRA)", "{{HRA}}"],
          ["Special Allowances", "{{Allowances}}"],
          ["Deductions (Tax / PF)", "{{Deductions}}"],
          ["Performance Bonus", "{{Bonus}}"],
          ["Total Net Payable", "â‚¹ {{NetSalary}}"]
        ],
        align: 'left',
        fontSize: 14,
        color: "#323130"
      },
      closing: { content: "This certificate is issued upon employee request for official documentation purposes.\n\nSincerely," },
      signature: { content: "HR Manager / Payroll Officer\n{{CompanyName}}" }
    }
  },
  professionalSalary: {
    docName: "Professional Salary Slip",
    sections: {
      headerInfo: { content: "ðŸ“ž +91 98765 43210  |  âœ‰ï¸ info@company.com  |  ðŸŒ www.company.com" },
      sender: { content: "" },
      company: { content: "Your Company\nCorporate HR Department\nPayroll Division" },
      date: { content: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
      recipient: { content: "Employee Name: {{EmployeeName}}\nDesignation: {{JobTitle}}\nSalary Month: {{Month}}" },
      subject: { content: "CONFIDENTIAL: SALARY SLIP FOR {{Month}}" },
      salutation: { content: "Dear {{EmployeeName}}," },
      body: { content: "Please find below the detailed breakdown of your salary earnings and deductions for the month of {{Month}}:" },
      table: {
        enabled: true,
        headers: ["Salary Component", "Amount (â‚¹)"],
        rows: [
          ["Basic Salary", "{{BasicSalary}}"],
          ["House Rent Allowance (HRA)", "{{HRA}}"],
          ["Special Allowances", "{{Allowances}}"],
          ["Performance Bonus", "{{Bonus}}"],
          ["Deductions", "{{Deductions}}"],
          ["PF / ESIC / PT (Employee)", "{{PF_ESIC_PT}}"],
          ["Employer PF Contribution", "{{Employer_PF}}"],
          ["Net Salary Payable", "â‚¹ {{NetSalary}}"]
        ],
        align: 'left',
        fontSize: 14,
        color: "#111827"
      },
      closing: { content: "This is a computer-generated salary slip and does not require a physical signature.\n\nWarm regards," },
      signature: { content: "Authorized Signatory\nYour Company" }
    }
  },
  exit: {
    docName: "Exit & Relieving Letter",
    sections: {
      headerInfo: { content: "ðŸ“ž +91 98765 43210  |  âœ‰ï¸ info@company.com  |  ðŸŒ www.company.com" },
      sender: { content: "" },
      company: { content: "Corporate HR Department\nYour Company\nCorporate Headquarters" },
      date: { content: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
      recipient: { content: "To Whomsoever It May Concern" },
      subject: { content: "RE: RELIEVING LETTER & SERVICE EXPERIENCE CERTIFICATE" },
      salutation: { content: "Dear {{EmployeeName}}," },
      body: { content: "This is to certify that {{EmployeeName}} (Employee ID: {{EmployeeID}}) was employed with {{CompanyName}} as {{JobTitle}} from {{JoiningDate}} to {{LastWorkingDate}}.\n\nDuring their employment, {{EmployeeName}} performed their duties with commendable dedication, integrity, and diligence. All company equipment, credentials, and financial obligations have been fully cleared.\n\nWe place on record our appreciation for their services to {{CompanyName}} and wish them success in all future endeavors." },
      closing: { content: "With best regards,\n\nSincerely," },
      signature: { content: "Head of Human Resources\n{{CompanyName}}" }
    }
  },
  experience: {
    docName: "Experience Letter",
    sections: {
      headerInfo: { content: "ðŸ“ž +91 98765 43210  |  âœ‰ï¸ info@company.com  |  ðŸŒ www.company.com" },
      sender: { content: "" },
      company: { content: "HR Department\nYour Company\nCorporate Headquarters" },
      date: { content: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
      recipient: { content: "To Whomsoever It May Concern" },
      subject: { content: "RE: EXPERIENCE CERTIFICATE" },
      salutation: { content: "" },
      body: { content: "This is to certify that {{EmployeeName}} was employed with {{CompanyName}} from {{JoiningDate}} to {{LastWorkingDate}}.\n\nDuring their tenure, they held the position of {{JobTitle}}. They have been a dedicated and hardworking member of our team.\n\nWe wish them all the best in their future endeavors." },
      closing: { content: "Sincerely," },
      signature: { content: "HR Manager\n{{CompanyName}}" }
    }
  }
};

const PAGE_WIDTH = 550;

const Text = ({ children, style, weight = "400" }) => {
  let fontFamily = FontsProvider.fontFamily.regular;
  if (weight === "700" || weight === "bold") fontFamily = FontsProvider.fontFamily.bold;
  if (weight === "600") fontFamily = FontsProvider.fontFamily.semiBold;
  if (weight === "500") fontFamily = FontsProvider.fontFamily.medium;

  return (
    <RNText style={[{ color: "#323130", fontWeight: weight, fontFamily, fontSize: 16 }, style]}>{children}</RNText>
  );
};

const IconButton = ({ name, onPress, active, color = "#444", size = 18, type, label, onMouseDown, onTouchStart }) => {
  let IconSet = Feather;
  if (type) IconSet = { Feather, MaterialCommunityIcons, FontAwesome, MaterialIcons, Octicons }[type];
  else if (name.startsWith('format-')) IconSet = MaterialIcons;

  return (
    <Pressable
      onPress={onPress}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={[styles.ribbonBtn, active && styles.ribbonBtnActive]}
    >
      <IconSet name={name} size={size} color={active ? "#0078d4" : color} />
      {label && <RNText style={[styles.btnLabel, active && { color: '#0078d4' }]}>{label}</RNText>}
    </Pressable>
  );
};

const SectionTextInput = React.memo(({ item, idx, setSectionList, fontFamily, isSelected, setActiveSection, secId }) => {
  const [localValue, setLocalValue] = useState(item.content);
  const [isFocused, setIsFocused] = useState(false);
  const isWebPlatform = Platform.OS === 'web';

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(item.content);
    }
  }, [item.content, isFocused]);

  // useRef-based debounce is stable across renders and won't lose pending timeouts on re-render
  const debounceTimerRef = useRef(null);
  const debouncedUpdate = useCallback((val) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setSectionList(prev => {
        const updated = [...prev];
        if (updated[idx]) {
          updated[idx] = { ...updated[idx], content: val };
        }
        return updated;
      });
    }, 400);
  }, [idx, setSectionList]);

  // Spacer: render as a plain View so height is pixel-exact
  if (item.type === 'spacer') {
    return (
      <View
        style={[
          isSelected ? styles.activeInput : styles.inactiveInput,
          {
            width: '100%',
            height: item.minHeight || 40,
            minHeight: item.minHeight || 40,
            backgroundColor: isSelected ? '#F0F9FF' : '#F8FAFC',
            borderRadius: 4,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: isSelected ? '#93C5FD' : '#CBD5E1',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 12,
          }
        ]}
      >
        {isSelected && (
          <RNText style={{ fontSize: 10, color: '#94A3B8', fontStyle: 'italic' }}>
            â†• Empty Spacer â€” {item.minHeight || 40}px
          </RNText>
        )}
      </View>
    );
  }

  const minH = item.minHeight || 25;

  const inputEl = (
    <TextInput
      multiline
      scrollEnabled={false}
      placeholder={`Type ${item.label || item.type}...`}
      placeholderTextColor="#d3d3d3"
      onFocus={() => {
        setIsFocused(true);
        setActiveSection(secId);
      }}
      value={localValue}
      onChangeText={(t) => {
        setLocalValue(t);
        debouncedUpdate(t);
      }}
      onBlur={() => {
        setIsFocused(false);
        setSectionList(prev => {
          const updated = [...prev];
          if (updated[idx]) {
            updated[idx].content = localValue;
          }
          return updated;
        });
      }}
      style={[
        styles.letterInput,
        isSelected ? styles.activeInput : styles.inactiveInput,
        {
          width: '100%',
          textAlign: item.align || 'left',
          fontSize: item.fontSize || 11,
          lineHeight: Math.round((item.fontSize || 11) * 1.3),
          fontWeight: item.bold ? 'bold' : 'normal',
          fontStyle: item.italic ? 'italic' : 'normal',
          textDecorationLine: item.underlineStyle && item.underlineStyle !== 'none' ? 'underline' : 'none',
          color: item.color || '#1F2937',
          marginBottom: 0,
          fontFamily: fontFamily,
          outlineStyle: 'none',
          borderBottomWidth: item.underlineStyle === 'double' ? 3 : item.underlineStyle === 'dashed' ? 1 : 0,
          borderStyle: item.underlineStyle === 'dashed' ? 'dashed' : 'solid'
        }
      ]}
    />
  );

  const hasUnderline = item.underlineStyle && item.underlineStyle !== 'none';
  const borderBottomStyle = item.underlineStyle === 'dashed' ? 'dashed' : item.underlineStyle === 'double' ? 'double' : 'solid';
  const borderBottomWidth = item.underlineStyle === 'double' ? 3 : hasUnderline ? 2 : 0;

  // On web: wrap in a flexible container with visible underline border support
  if (isWebPlatform) {
    return (
      <View
        style={{
          width: '100%',
          marginBottom: item.type === 'headerInfo' ? 4 : 8,
          borderBottomWidth: borderBottomWidth,
          borderBottomColor: item.color || '#1F2937',
          borderStyle: borderBottomStyle,
          paddingBottom: hasUnderline ? 2 : 0
        }}
      >
        {inputEl}
      </View>
    );
  }

  return React.cloneElement(inputEl, {
    style: [
      styles.letterInput,
      isSelected ? styles.activeInput : styles.inactiveInput,
      {
        width: '100%',
        textAlign: item.align || 'left',
        fontSize: item.fontSize || 11,
        fontWeight: item.bold ? 'bold' : 'normal',
        fontStyle: item.italic ? 'italic' : 'normal',
        textDecorationLine: item.underlineStyle && item.underlineStyle !== 'none' ? 'underline' : 'none',
        color: item.color || '#1F2937',
        marginBottom: item.type === 'headerInfo' ? 8 : 12,
        minHeight: minH,
        fontFamily: fontFamily,
        outlineStyle: 'none',
        borderBottomWidth: item.underlineStyle === 'double' ? 3 : item.underlineStyle === 'dashed' ? 1 : 0,
        borderStyle: item.underlineStyle === 'dashed' ? 'dashed' : 'solid'
      }
    ]
  });
});

const TableCellInput = React.memo(({ initialValue, idx, rIdx, cIdx, setSectionList }) => {
  const [localValue, setLocalValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(initialValue);
    }
  }, [initialValue, isFocused]);

  const cellDebounceRef = useRef(null);
  const debouncedUpdate = useCallback((val) => {
    if (cellDebounceRef.current) clearTimeout(cellDebounceRef.current);
    cellDebounceRef.current = setTimeout(() => {
      setSectionList(prev => {
        const updated = [...prev];
        if (updated[idx] && updated[idx].rows) {
          const nr = updated[idx].rows.map((r, ri) =>
            ri === rIdx ? r.map((c, ci) => ci === cIdx ? val : c) : r
          );
          updated[idx] = { ...updated[idx], rows: nr };
        }
        return updated;
      });
    }, 400);
  }, [idx, rIdx, cIdx, setSectionList]);

  return (
    <TextInput
      value={localValue}
      onChangeText={(t) => {
        setLocalValue(t);
        debouncedUpdate(t);
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
        setSectionList(prev => {
          const updated = [...prev];
          if (updated[idx] && updated[idx].rows) {
            const nr = [...updated[idx].rows];
            nr[rIdx] = [...nr[rIdx]];
            nr[rIdx][cIdx] = localValue;
            updated[idx].rows = nr;
          }
          return updated;
        });
      }}
      style={{ flex: 1, color: '#334155', padding: 4, marginHorizontal: 2 }}
    />
  );
});

const TableHeaderInput = React.memo(({ initialValue, idx, headerIdx, setSectionList }) => {
  const [localValue, setLocalValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(initialValue);
    }
  }, [initialValue, isFocused]);

  const headerDebounceRef = useRef(null);
  const debouncedUpdate = useCallback((val) => {
    if (headerDebounceRef.current) clearTimeout(headerDebounceRef.current);
    headerDebounceRef.current = setTimeout(() => {
      setSectionList(prev => {
        const updated = [...prev];
        if (updated[idx] && updated[idx].headers) {
          const nh = updated[idx].headers.map((h, i) => i === headerIdx ? val : h);
          updated[idx] = { ...updated[idx], headers: nh };
        }
        return updated;
      });
    }, 400);
  }, [idx, headerIdx, setSectionList]);

  return (
    <TextInput
      value={localValue}
      onChangeText={(t) => {
        setLocalValue(t);
        debouncedUpdate(t);
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
        setSectionList(prev => {
          const updated = [...prev];
          if (updated[idx] && updated[idx].headers) {
            const nh = [...updated[idx].headers];
            nh[headerIdx] = localValue;
            updated[idx].headers = nh;
          }
          return updated;
        });
      }}
      style={{ flex: 1, fontWeight: 'bold', color: '#0F172A', padding: 4, marginHorizontal: 2, backgroundColor: '#F8FAFC', borderRadius: 4 }}
    />
  );
});

const BASE_SECTIONS = [
  { id: 'sec_headerInfo', type: 'headerInfo', label: 'HEADER INFO', content: 'ðŸ“ž +91 98765 43210  |  âœ‰ï¸ info@company.com  |  ðŸŒ www.company.com', fontSize: 10, align: 'center', color: '#1F2937' },
  { id: 'sec_sender', type: 'sender', label: 'SENDER', content: '', fontSize: 11, align: 'left', color: '#1F2937' },
  { id: 'sec_company', type: 'company', label: 'COMPANY', content: 'Your Company\nCorporate HR Department\nPayroll Division', fontSize: 11, align: 'left', color: '#1F2937' },
  { id: 'sec_date', type: 'date', label: 'DATE', content: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), fontSize: 11, align: 'left', color: '#1F2937' },
  { id: 'sec_recipient', type: 'recipient', label: 'RECIPIENT', content: 'Employee Name: {{EmployeeName}}\nDesignation: {{JobTitle}}\nSalary Month: {{Month}}', fontSize: 11, align: 'left', color: '#1F2937' },
  { id: 'sec_subject', type: 'subject', label: 'SUBJECT', content: 'CONFIDENTIAL: SALARY SLIP FOR {{Month}}', fontSize: 12, bold: true, align: 'left', color: '#1F2937' },
  { id: 'sec_salutation', type: 'salutation', label: 'SALUTATION', content: 'Dear {{EmployeeName}},', fontSize: 11, align: 'left', color: '#1F2937' },
  { id: 'sec_body', type: 'body', label: 'BODY', content: 'Please find below the detailed breakdown of your salary earnings and deductions for the month of {{Month}}:', fontSize: 11, align: 'left', color: '#1F2937' },
  { id: 'sec_table', type: 'table', label: 'TABLE', enabled: true, headers: ['Salary Component', 'Amount (â‚¹)'], rows: [['Basic Salary', '{{BasicSalary}}'], ['House Rent Allowance (HRA)', '{{HRA}}'], ['Special Allowances', '{{Allowances}}'], ['Performance Bonus', '{{Bonus}}'], ['Deductions', '{{Deductions}}'], ['Net Salary Payable', 'â‚¹ {{NetSalary}}']], fontSize: 10, align: 'left', color: '#111827' },
  { id: 'sec_closing', type: 'closing', label: 'CLOSING', content: 'This is a computer-generated salary slip and does not require a physical signature.\n\nWarm regards,', fontSize: 11, align: 'left', color: '#1F2937' },
  { id: 'sec_signature', type: 'signature', label: 'SIGNATURE', content: 'Authorized Signatory\nYour Company', fontSize: 11, align: 'left', color: '#1F2937' }
];

export default function LetterEditorPro({ apiConfig = {}, variables = {}, initialTemplate = null, onSave, onUpdate, onExport, fonts }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isLargeScreen = width >= 1024;
  const pageScale = isMobile ? Math.min(1, Math.max(0.55, (width - 16) / PAGE_WIDTH)) : 1;
  const previewModalWidth = isMobile ? (width * 0.96 - 24) : Math.min(width * 0.9 - 40, 780);
  const previewScale = Math.min(1, Math.max(0.45, previewModalWidth / PAGE_WIDTH));
  const isWeb = Platform.OS === 'web';
  const A4PageWrapper = isWeb ? 'div' : View;
  const [docName, setDocName] = useState("Professional Salary Slip");
  const [currentTemplateId, setCurrentTemplateId] = useState(null);



  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingLibrary, setIsFetchingLibrary] = useState(false);
  const [activeSection, setActiveSection] = useState('body');
  const [selectedSections, setSelectedSections] = useState(new Set());
  const [savedLibrary, setSavedLibrary] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [validationErrors, setValidationErrors] = useState([]);

  const handleDocumentPick = async (itemId) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'image/*',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/csv'
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const file = result.assets[0];
        const fileData = {
          name: file.name || file.uri.split('/').pop() || 'Uploaded Document',
          size: file.size ? `${(file.size / 1024).toFixed(1)} KB` : '',
          uri: file.uri,
          mimeType: file.mimeType || file.type || ''
        };
        setUploadedFiles(prev => ({ ...prev, [itemId]: fileData }));
        setFormValues(prev => ({ ...prev, [itemId]: file.uri }));
        setValidationErrors(prev => prev.filter(id => id !== itemId));
      }
    } catch (err) {
      console.error('Error picking document:', err);
    }
  };

  const handleRemoveFile = (itemId) => {
    setUploadedFiles(prev => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
    setFormValues(prev => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  };

  const validateForm = () => {
    const requiredItems = sectionList.filter(item => item.required && ['formInput', 'formTextArea', 'formDatePicker', 'formFileUpload', 'formRadio', 'formCheckbox', 'formToggle', 'formRating', 'formDropdown'].includes(item.type));
    const missing = [];
    requiredItems.forEach(item => {
      const val = formValues[item.id];
      const fileVal = uploadedFiles[item.id];
      if (!val && !fileVal) {
        missing.push(item.id);
      }
    });

    setValidationErrors(missing);
    if (missing.length > 0) {
      if (Platform.OS === 'web') {
        window.alert('Form Incomplete: Please fill out all required fields marked with *.');
      } else {
        Alert.alert('Form Incomplete', 'Please fill out all required fields marked with *.');
      }
    } else {
      if (Platform.OS === 'web') {
        window.alert('Form Submitted Successfully!');
      } else {
        Alert.alert('Success', 'Form Submitted Successfully!');
      }
    }
  };
  // ===== FORMS INTEGRATION STATE =====
  const [formEditorMode, setFormEditorMode] = useState(null); // null = letter mode, 'edit' | 'preview' = form mode
  const [formEditorForm, setFormEditorForm] = useState(null); // the form object being edited/previewed
  const [formsCollapsed, setFormsCollapsed] = useState(false);
  const [formsList, setFormsList] = useState([]);
  const [showFormNameModal, setShowFormNameModal] = useState(false);
  const [formToDelete, setFormToDelete] = useState(null);
  const FORMS_STORAGE_KEY = 'form_builder_forms';

  // Load forms from storage
  const loadFormsFromStorage = useCallback(async () => {
    try {
      const savedForms = await AsyncStorage.getItem(FORMS_STORAGE_KEY);
      if (savedForms) {
        setFormsList(JSON.parse(savedForms));
      }
    } catch (error) {
      console.error('Error loading forms:', error);
    }
  }, []);

  useEffect(() => {
    loadFormsFromStorage();
  }, [loadFormsFromStorage]);

  // Reload forms when returning from FormBuilder
  const handleBackFromFormBuilder = useCallback(() => {
    setFormEditorMode(null);
    setFormEditorForm(null);
    loadFormsFromStorage(); // refresh the list
  }, [loadFormsFromStorage]);

  const handleFormEdit = useCallback((form) => {
    setFormEditorForm(form);
    setFormEditorMode('edit');
  }, []);

  const handleFormPreview = useCallback((form) => {
    setFormEditorForm(form);
    setFormEditorMode('preview');
  }, []);

  const handleFormDelete = useCallback(async (formId) => {
    try {
      const savedForms = await AsyncStorage.getItem(FORMS_STORAGE_KEY);
      if (savedForms) {
        const forms = JSON.parse(savedForms);
        const updated = forms.filter(f => f.id !== formId);
        await AsyncStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(updated));
        setFormsList(updated);
      }
    } catch (error) {
      console.error('Error deleting form:', error);
    }
  }, []);

  const handleCreateNewForm = useCallback(() => {
    // Create a new form and immediately open it in edit mode
    const newForm = {
      id: `form-${Date.now()}`,
      name: `New Form ${formsList.length + 1}`,
      createdAt: new Date().toISOString(),
      fields: [],
      rows: [],
      fieldCount: 0,
      rowCount: 0,
    };

    // Save to storage
    const updatedForms = [...formsList, newForm];
    setFormsList(updatedForms);
    AsyncStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(updatedForms));

    // Open in edit mode
    setFormEditorForm(newForm);
    setFormEditorMode('edit');
  }, [formsList]);
  // ===== END FORMS INTEGRATION STATE =====
  const [showLibrary, setShowLibrary] = useState(false);
  const [activeLibraryTab, setActiveLibraryTab] = useState('all');
  const [pageCount, setPageCount] = useState(1);
  const [logo, setLogo] = useState("https://cdn-icons-png.flaticon.com/512/187/187879.png");
  const [logoSize, setLogoSize] = useState(80);
  const [customLogos, setCustomLogos] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  const [showLogoSelector, setShowLogoSelector] = useState(false);
  const [fontFamily, setFontFamily] = useState('sans-serif');

  const [pageBorder, setPageBorder] = useState(false);
  const [showWatermark, setShowWatermark] = useState(true);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.08);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [watermarkType, setWatermarkType] = useState('logo');
  const [watermarkAlignment, setWatermarkAlignment] = useState('center');
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    name: "Your Company",
    address: "Corporate HR Department\nCorporate Headquarters",
    phone: "+91 98765 43210",
    email: "info@company.com",
    website: "www.company.com"
  });
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeTemplatesTab, setActiveTemplatesTab] = useState('standard');
  const [dynamicVars, setDynamicVars] = useState(variables || {});
  useEffect(() => {
    if (variables) {
      setDynamicVars(prev => ({ ...prev, ...variables }));
    }
  }, [variables]);
  const [showVariableModal, setShowVariableModal] = useState(false);
  const previewPdfRef = useRef(null);

  // Dynamic Re-orderable Section Array
  const [sectionList, setSectionList] = useState([...BASE_SECTIONS]);


  const [showUploadScanModal, setShowUploadScanModal] = useState(false);
  const [uploadedFileText, setUploadedFileText] = useState("");
  const [scanResult, setScanResult] = useState(null);

  const [dropIndicatorIndex, setDropIndicatorIndex] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyIndexRef = useRef(-1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const MAX_HISTORY = 50;

  const updateSectionListWithHistory = useCallback((newSections) => {
    setSectionList(prev => {
      const nextList = typeof newSections === 'function' ? newSections(prev) : newSections;

      setHistory(prevHistory => {
        const sliced = prevHistory.slice(0, historyIndexRef.current + 1);
        sliced.push(nextList);
        const capped = sliced.length > MAX_HISTORY ? sliced.slice(-MAX_HISTORY) : sliced;
        historyIndexRef.current = capped.length - 1;
        setHistoryIndex(historyIndexRef.current);
        return capped;
      });

      return nextList;
    });
  }, []);

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      setHistoryIndex(historyIndexRef.current);
      setSectionList(history[historyIndexRef.current]);
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < history.length - 1) {
      historyIndexRef.current += 1;
      setHistoryIndex(historyIndexRef.current);
      setSectionList(history[historyIndexRef.current]);
    }
  };

  const updateActiveSectionProp = (prop, value) => {
    if (!activeSection && selectedSections.size === 0) return;
    updateActiveSection({ [prop]: value });
  };


  const addTableColumn = (sectionIdx) => {
    setSectionList(prev => {
      const updated = [...prev];
      const sec = updated[sectionIdx];
      if (sec && sec.type === 'table') {
        const headers = sec.headers || [];
        const rows = sec.rows || [];
        const nextColNum = headers.length + 1;
        sec.headers = [...headers, `Column ${nextColNum}`];
        sec.rows = rows.map(r => [...r, '']);
      }
      return updated;
    });
  };

  const removeTableColumn = (sectionIdx) => {
    setSectionList(prev => {
      const updated = [...prev];
      const sec = updated[sectionIdx];
      if (sec && sec.type === 'table') {
        const headers = sec.headers || [];
        const rows = sec.rows || [];
        if (headers.length > 1) {
          sec.headers = headers.slice(0, -1);
          sec.rows = rows.map(r => r.slice(0, -1));
        }
      }
      return updated;
    });
  };

  const addTableRow = (sectionIdx) => {
    setSectionList(prev => {
      const updated = [...prev];
      const sec = updated[sectionIdx];
      if (sec && sec.type === 'table') {
        const headers = sec.headers || [];
        const rows = sec.rows || [];
        const colCount = headers.length || 2;
        const newRow = Array(colCount).fill('');
        sec.rows = [...rows, newRow];
      }
      return updated;
    });
  };

  const removeTableRow = (sectionIdx) => {
    setSectionList(prev => {
      const updated = [...prev];
      const sec = updated[sectionIdx];
      if (sec && sec.type === 'table') {
        const rows = sec.rows || [];
        if (rows.length > 1) {
          sec.rows = rows.slice(0, -1);
        }
      }
      return updated;
    });
  };


  const sections = useMemo(() => {
    const updatedSecs = {};
    sectionList.forEach(item => {
      updatedSecs[item.id || item.type] = item;
    });
    return updatedSecs;
  }, [sectionList]);


  const moveSectionUp = (index) => {
    if (index <= 0) return;
    const newList = [...sectionList];
    const temp = newList[index];
    newList[index] = newList[index - 1];
    newList[index - 1] = temp;
    setSectionList(newList);
  };

  const moveSectionDown = (index) => {
    if (index >= sectionList.length - 1) return;
    const newList = [...sectionList];
    const temp = newList[index];
    newList[index] = newList[index + 1];
    newList[index + 1] = temp;
    setSectionList(newList);
  };

  const duplicateSectionItem = (index) => {
    const itemToClone = sectionList[index];
    const cloned = JSON.parse(JSON.stringify(itemToClone));
    const uniqueId = `sec_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    cloned.id = uniqueId;
    cloned.label = `${itemToClone.label || itemToClone.type.toUpperCase()} (Copy)`;
    const newList = [...sectionList];
    newList.splice(index + 1, 0, cloned);
    setSectionList(newList);
    setActiveSection(uniqueId);
  };

  const removeSectionItem = (index) => {
    if (sectionList.length <= 1) return; // Guard: silently block, no blocking Alert
    setSectionList(prev => {
      const newList = prev.filter((_, i) => i !== index);
      // Schedule focus update off the critical render path
      if (newList.length > 0) {
        setTimeout(() => setActiveSection(newList[0].id), 0);
      }
      return newList;
    });
  };

  const addNewField = (fieldType = 'customText') => {
    const newSec = createSectionItem(fieldType);
    setSectionList(prev => balanceSectionWidths([...prev, newSec]));
    setActiveSection(newSec.id);
  };

  // PDF & Document Binary Code Sanitizer Function
  const cleanRawDocumentText = (input) => {
    if (!input) return "";
    let cleaned = String(input);

    // Check if input contains raw PDF binary objects or streams
    if (cleaned.includes("%PDF") || cleaned.includes("obj") || cleaned.includes("stream") || cleaned.includes("endobj")) {
      const pdfTextMatches = cleaned.match(/\(([^()]{3,})\)/g);
      if (pdfTextMatches && pdfTextMatches.length > 0) {
        cleaned = pdfTextMatches.map(m => m.slice(1, -1)).join("\n");
      } else {
        cleaned = cleaned.replace(/%PDF-\d\.\d/g, "");
        cleaned = cleaned.replace(/<<[\s\S]*?>>/g, "");
        cleaned = cleaned.replace(/\d+\s+\d+\s+obj[\s\S]*?endobj/gi, "");
        cleaned = cleaned.replace(/stream[\s\S]*?endstream/gi, "");
        cleaned = cleaned.replace(/xref[\s\S]*?trailer/gi, "");
        cleaned = cleaned.replace(/startxref[\s\S]*/gi, "");
      }
    }

    // Strip unprintable non-ASCII binary control characters
    cleaned = cleaned.replace(/[^\x20-\x7E\t\r\n]/g, " ");

    // Remove Logo Placeholder tokens
    cleaned = cleaned.replace(/COMPANY LOGO|\[Logo Placeholder\]|Logo Placeholder/gi, "");

    // Restore structural line breaks before keywords if PDF text stream is concatenated
    const restoreLineBreakPatterns = [
      /(Ref\.?\s*No\.?:)/gi,
      /(Date of Issue:)/gi,
      /(SALARY CERTIFICATE)/gi,
      /(OFFER LETTER)/gi,
      /(EXPERIENCE CERTIFICATE)/gi,
      /(RELIEVING LETTER)/gi,
      /(APPOINTMENT LETTER)/gi,
      /(JOINING LETTER)/gi,
      /(TO WHOMSOEVER IT MAY CONCERN)/gi,
      /(This is to certify that)/gi,
      /(As per the company's official records)/gi,
      /(As per our records)/gi,
      /(SALARY COMPONENT)/gi,
      /(The above salary information)/gi,
      /(For\s+\[?Company Name\]?)/gi,
      /(Authorized Signatory)/gi,
      /(HR Manager)/gi,
      /(COMPANY SEAL)/gi,
      /(Corporate Office Address)/gi,
      /(Date:)/gi,
      /(To,)/gi,
      /(Subject:)/gi,
      /(Dear\s+)/gi,
      /(Employee Details)/gi,
      /(Employee Acknowledgement)/gi
    ];

    restoreLineBreakPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, "\n\n$1");
    });

    // Remove leftover PDF syntax keywords, logo placeholders, and unprintable binary tokens
    const filteredLines = cleaned.split('\n')
      .map(l => l.trim())
      .filter(l => {
        if (!l || l.length < 2) return false;
        const lower = l.toLowerCase();
        if (lower === "company logo" || lower === "[logo placeholder]" || lower === "logo placeholder") return false;
        if (lower.startsWith("%pdf") || lower.startsWith("endobj") || lower.startsWith("stream") || lower.startsWith("endstream") || lower.startsWith("xref") || lower.startsWith("reportlab")) return false;
        if (l.match(/^[0-9\s\/\\]+$/) || l.match(/^obj\s/i) || l.match(/^r\s\d/i)) return false;
        return true;
      });

    return filteredLines.join('\n');
  };

  // Structured Section Generator from Raw Text / PDF Text
  const generateSectionsFromRawText = (rawInput) => {
    const rawText = cleanRawDocumentText(rawInput);
    if (!rawText || !rawText.trim()) return [];

    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const sections = [];
    let currentBodyLines = [];
    let tableRows = [];
    let tableHeaders = [];
    let isInsideTable = false;

    const parseSalaryRow = (line) => {
      const match = line.match(/^(.*?)\s+(\[\s*Amount\s*\]|\d+[\d,.]*|\u2014|-)\s+(\[\s*Amount\s*\]|\d+[\d,.]*|\u2014|-)$/i);
      if (match) {
        return [match[1].trim(), match[2].trim(), match[3].trim()];
      }
      const parts = line.split(/\s{2,}|\t/).filter(Boolean);
      if (parts.length >= 3) return [parts[0], parts[1], parts[2]];
      if (parts.length === 2) return [parts[0], parts[1], "-"];
      return [line, "-", "-"];
    };

    lines.forEach((line, idx) => {
      const lower = line.toLowerCase();

      // 1. Detect Company Name / Registered Office Header (Only at top of document)
      if (idx <= 1 && (lower.includes("your company name") || lower.includes("registered office:") || lower.includes("company address"))) {
        if (currentBodyLines.length > 0) {
          sections.push({
            id: `sec_scan_${Date.now()}_${idx}_b`,
            type: 'body',
            label: 'BODY PARAGRAPH',
            content: currentBodyLines.join('\n'),
            fontSize: 11, align: 'left', color: '#1F2937'
          });
          currentBodyLines = [];
        }
        sections.push({
          id: `sec_scan_${Date.now()}_${idx}_comp`,
          type: 'company',
          label: 'COMPANY HEADER',
          content: line,
          fontSize: 13, bold: true, align: 'center', color: '#0F172A'
        });
        return;
      }

      // 2. Detect Reference Number & Date Row
      if (lower.includes("ref. no.") || lower.includes("date:") || lower.includes("date of issue")) {
        if (currentBodyLines.length > 0) {
          sections.push({
            id: `sec_scan_${Date.now()}_${idx}_b`,
            type: 'body',
            label: 'BODY PARAGRAPH',
            content: currentBodyLines.join('\n'),
            fontSize: 11, align: 'left', color: '#1F2937'
          });
          currentBodyLines = [];
        }
        sections.push({
          id: `sec_scan_${Date.now()}_ref`,
          type: 'headerInfo',
          label: 'REF & DATE',
          content: line,
          fontSize: 10, align: 'left', color: '#475569'
        });
        return;
      }

      // 3. Detect Table Headers & Rows
      if (lower.includes("salary component") || lower.includes("monthly") || lower.includes("annual")) {
        if (currentBodyLines.length > 0) {
          sections.push({
            id: `sec_scan_${Date.now()}_${idx}_b`,
            type: 'body',
            label: 'BODY PARAGRAPH',
            content: currentBodyLines.join('\n'),
            fontSize: 11, align: 'left', color: '#1F2937'
          });
          currentBodyLines = [];
        }
        isInsideTable = true;
        tableHeaders = ["SALARY COMPONENT", "MONTHLY (INR)", "ANNUAL (INR)"];
        return;
      }

      if (isInsideTable) {
        if (lower.includes("the above salary") || lower.includes("for [company") || lower.includes("sincerely") || lower.includes("authorized signatory") || lower.includes("company seal")) {
          isInsideTable = false;
          if (tableRows.length > 0) {
            sections.push({
              id: `sec_scan_${Date.now()}_tbl`,
              type: 'table',
              label: 'SALARY DETAILS TABLE',
              enabled: true,
              headers: tableHeaders,
              rows: tableRows,
              fontSize: 10, align: 'left', color: '#111827'
            });
            tableRows = [];
          }
        } else {
          const parsedCell = parseSalaryRow(line);
          tableRows.push(parsedCell);
          return;
        }
      }

      // 4. Detect Subject / Document Title
      if (lower.startsWith("re:") || lower.includes("salary certificate") || lower.includes("offer letter") || lower.includes("experience certificate") || lower.startsWith("subject:")) {
        if (currentBodyLines.length > 0) {
          sections.push({
            id: `sec_scan_${Date.now()}_${idx}_b`,
            type: 'body',
            label: 'BODY PARAGRAPH',
            content: currentBodyLines.join('\n'),
            fontSize: 11, align: 'left', color: '#1F2937'
          });
          currentBodyLines = [];
        }
        sections.push({
          id: `sec_scan_${Date.now()}_${idx}_s`,
          type: 'subject',
          label: 'DOCUMENT TITLE',
          content: line,
          fontSize: 14, bold: true, align: 'center', color: '#0F172A'
        });
      } else if (lower.includes("to whomsoever it may concern") || lower.startsWith("dear ") || lower.startsWith("to ")) {
        if (currentBodyLines.length > 0) {
          sections.push({
            id: `sec_scan_${Date.now()}_${idx}_b`,
            type: 'body',
            label: 'BODY PARAGRAPH',
            content: currentBodyLines.join('\n'),
            fontSize: 11, align: 'left', color: '#1F2937'
          });
          currentBodyLines = [];
        }
        sections.push({
          id: `sec_scan_${Date.now()}_${idx}_sal`,
          type: 'salutation',
          label: 'RECIPIENT / SALUTATION',
          content: line,
          fontSize: 11, bold: true, align: 'left', color: '#1F2937'
        });
      } else if (lower.includes("sincerely") || lower.includes("authorized signatory") || lower.includes("hr manager") || lower.includes("for [company") || lower.includes("company seal")) {
        if (currentBodyLines.length > 0) {
          sections.push({
            id: `sec_scan_${Date.now()}_${idx}_b`,
            type: 'body',
            label: 'BODY PARAGRAPH',
            content: currentBodyLines.join('\n'),
            fontSize: 11, align: 'left', color: '#1F2937'
          });
          currentBodyLines = [];
        }
        sections.push({
          id: `sec_scan_${Date.now()}_${idx}_c`,
          type: 'signature',
          label: 'SIGNATURE BLOCK',
          content: line,
          fontSize: 11, bold: true, align: 'left', color: '#0F172A'
        });
      } else {
        currentBodyLines.push(line);
      }
    });

    if (tableRows.length > 0) {
      sections.push({
        id: `sec_scan_${Date.now()}_tbl_end`,
        type: 'table',
        label: 'SALARY DETAILS TABLE',
        enabled: true,
        headers: tableHeaders.length > 0 ? tableHeaders : ["SALARY COMPONENT", "MONTHLY (INR)", "ANNUAL (INR)"],
        rows: tableRows,
        fontSize: 10, align: 'left', color: '#111827'
      });
    }

    if (currentBodyLines.length > 0) {
      sections.push({
        id: `sec_scan_${Date.now()}_end`,
        type: 'body',
        label: 'BODY CONTENT',
        content: currentBodyLines.join('\n'),
        fontSize: 11, align: 'left', color: '#1F2937'
      });
    }

    return sections;
  };

  // Automated Template Upload Scanner & Validation Function
  const scanUploadedTemplateText = (rawInput) => {
    const rawText = cleanRawDocumentText(rawInput);
    if (!rawText || !rawText.trim()) {
      setScanResult({
        isValid: false,
        score: 0,
        message: "Uploaded template content is empty or contains non-readable binary data.",
        placeholders: [],
        sections: []
      });
      return;
    }

    // 1. Scan for Variable Placeholders {{...}} and [Bracket Tags]
    const placeholderRegex = /\{\{([^}]+)\}\}|\[([A-Za-z0-9\s_]+)\]/g;
    const placeholders = [];
    let match;
    while ((match = placeholderRegex.exec(rawText)) !== null) {
      const phName = match[1] || match[2];
      if (phName && !placeholders.includes(phName) && !phName.toLowerCase().includes("logo")) {
        placeholders.push(phName);
      }
    }

    // 2. Parse Text into Dynamic Canvas Sections
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const scannedSections = [];
    let currentBodyLines = [];
    let tableRows = [];
    let tableHeaders = [];
    let isInsideTable = false;

    // Helper to parse salary table rows with Amount / Numeric values
    const parseSalaryRow = (line) => {
      const match = line.match(/^(.*?)\s+(\[\s*Amount\s*\]|\d+[\d,.]*|\u2014|-)\s+(\[\s*Amount\s*\]|\d+[\d,.]*|\u2014|-)$/i);
      if (match) {
        return [match[1].trim(), match[2].trim(), match[3].trim()];
      }
      const parts = line.split(/\s{2,}|\t/).filter(Boolean);
      if (parts.length >= 3) return [parts[0], parts[1], parts[2]];
      if (parts.length === 2) return [parts[0], parts[1], "-"];
      return [line, "-", "-"];
    };

    lines.forEach((line, idx) => {
      const lower = line.toLowerCase();

      // 1. Detect Company Name / Registered Office Header
      if (lower.includes("your company name") || lower.includes("registered office:") || lower.includes("company logo")) {
        if (currentBodyLines.length > 0) {
          scannedSections.push({
            id: `sec_scan_${Date.now()}_${idx}_b`,
            type: 'body',
            label: 'BODY PARAGRAPH',
            content: currentBodyLines.join('\n'),
            fontSize: 11, align: 'left', color: '#1F2937'
          });
          currentBodyLines = [];
        }
        scannedSections.push({
          id: `sec_scan_${Date.now()}_comp`,
          type: 'company',
          label: 'COMPANY HEADER',
          content: line,
          fontSize: 14, bold: true, align: 'center', color: '#0F172A'
        });
        return;
      }

      // 2. Detect Reference Number & Date Row
      if (lower.includes("ref. no.") || lower.includes("date:") || lower.includes("date of issue")) {
        if (currentBodyLines.length > 0) {
          scannedSections.push({
            id: `sec_scan_${Date.now()}_${idx}_b`,
            type: 'body',
            label: 'BODY PARAGRAPH',
            content: currentBodyLines.join('\n'),
            fontSize: 11, align: 'left', color: '#1F2937'
          });
          currentBodyLines = [];
        }
        scannedSections.push({
          id: `sec_scan_${Date.now()}_ref`,
          type: 'headerInfo',
          label: 'REF & DATE',
          content: line,
          fontSize: 10, align: 'left', color: '#475569'
        });
        return;
      }

      // 3. Detect Table Headers & Rows
      if (lower.includes("salary component") || lower.includes("monthly") || lower.includes("annual")) {
        if (currentBodyLines.length > 0) {
          scannedSections.push({
            id: `sec_scan_${Date.now()}_${idx}_b`,
            type: 'body',
            label: 'BODY PARAGRAPH',
            content: currentBodyLines.join('\n'),
            fontSize: 11, align: 'left', color: '#1F2937'
          });
          currentBodyLines = [];
        }
        isInsideTable = true;
        tableHeaders = ["SALARY COMPONENT", "MONTHLY (INR)", "ANNUAL (INR)"];
        return;
      }

      if (isInsideTable) {
        if (lower.includes("the above salary") || lower.includes("for [company") || lower.includes("sincerely") || lower.includes("authorized signatory") || lower.startsWith("re:") || lower.startsWith("subject:")) {
          isInsideTable = false;
          if (tableRows.length > 0) {
            scannedSections.push({
              id: `sec_scan_${Date.now()}_tbl`,
              type: 'table',
              label: 'SALARY DETAILS TABLE',
              enabled: true,
              headers: tableHeaders,
              rows: tableRows,
              fontSize: 10, align: 'left', color: '#111827'
            });
            tableRows = [];
          }
        } else {
          const parsedCell = parseSalaryRow(line);
          tableRows.push(parsedCell);
          return;
        }
      }

      // 4. Detect Subject / Document Title
      if (lower.startsWith("re:") || lower.includes("salary certificate") || lower.includes("offer letter") || lower.includes("experience certificate") || lower.startsWith("subject:")) {
        if (currentBodyLines.length > 0) {
          scannedSections.push({
            id: `sec_scan_${Date.now()}_${idx}_b`,
            type: 'body',
            label: 'BODY PARAGRAPH',
            content: currentBodyLines.join('\n'),
            fontSize: 11, align: 'left', color: '#1F2937'
          });
          currentBodyLines = [];
        }
        scannedSections.push({
          id: `sec_scan_${Date.now()}_${idx}_s`,
          type: 'subject',
          label: 'DOCUMENT TITLE',
          content: line,
          fontSize: 14, bold: true, align: 'center', color: '#0F172A'
        });
      } else if (lower.includes("to whomsoever it may concern") || lower.startsWith("dear ") || lower.startsWith("to ")) {
        if (currentBodyLines.length > 0) {
          scannedSections.push({
            id: `sec_scan_${Date.now()}_${idx}_b`,
            type: 'body',
            label: 'BODY PARAGRAPH',
            content: currentBodyLines.join('\n'),
            fontSize: 11, align: 'left', color: '#1F2937'
          });
          currentBodyLines = [];
        }
        scannedSections.push({
          id: `sec_scan_${Date.now()}_${idx}_sal`,
          type: 'salutation',
          label: 'RECIPIENT / SALUTATION',
          content: line,
          fontSize: 11, bold: true, align: 'left', color: '#1F2937'
        });
      } else if (lower.includes("sincerely") || lower.includes("authorized signatory") || lower.includes("hr manager") || lower.includes("for [company") || lower.includes("company seal")) {
        if (currentBodyLines.length > 0) {
          scannedSections.push({
            id: `sec_scan_${Date.now()}_${idx}_b`,
            type: 'body',
            label: 'BODY PARAGRAPH',
            content: currentBodyLines.join('\n'),
            fontSize: 11, align: 'left', color: '#1F2937'
          });
          currentBodyLines = [];
        }
        scannedSections.push({
          id: `sec_scan_${Date.now()}_${idx}_c`,
          type: 'signature',
          label: 'SIGNATURE BLOCK',
          content: line,
          fontSize: 11, bold: true, align: 'left', color: '#0F172A'
        });
      } else {
        currentBodyLines.push(line);
      }
    });

    if (tableRows.length > 0) {
      scannedSections.push({
        id: `sec_scan_${Date.now()}_tbl_end`,
        type: 'table',
        label: 'SALARY DETAILS TABLE',
        enabled: true,
        headers: tableHeaders.length > 0 ? tableHeaders : ["SALARY COMPONENT", "MONTHLY (INR)", "ANNUAL (INR)"],
        rows: tableRows,
        fontSize: 10, align: 'left', color: '#111827'
      });
    }

    if (currentBodyLines.length > 0) {
      scannedSections.push({
        id: `sec_scan_${Date.now()}_end`,
        type: 'body',
        label: 'BODY CONTENT',
        content: currentBodyLines.join('\n'),
        fontSize: 11, align: 'left', color: '#1F2937'
      });
    }

    const hrKeywords = [
      'certificate', 'letter', 'offer', 'appointment', 'salary', 'experience',
      'relieving', 'confirmation', 'agreement', 'to whomsoever', 'dear', 'employee',
      'company', 'sincerely', 'regards', 'signatory', 'manager', 'designation',
      'ctc', 'joining', 'employment', 'subject', 're:', 'non-disclosure', 'nda',
      'policy', 'corporate', 'hr@'
    ];

    const textLower = rawText.toLowerCase(); // Fix: was undefined, caused ReferenceError in some browsers
    const foundKeywords = hrKeywords.filter(kw => textLower.includes(kw));

    // Reject non-HR files (e.g., code snippets, SQL queries, receipts, HTML markup)
    const isNonLetterCode = textLower.includes("import react") || textLower.includes("function()") || textLower.includes("select * from") || textLower.includes("<html") || textLower.includes("<div");

    const isCompanyTemplateValid = !isNonLetterCode && (foundKeywords.length >= 1 || placeholders.length > 0 || scannedSections.length >= 2);

    if (!isCompanyTemplateValid) {
      setScanResult({
        isValid: true,
        score: 15,
        message: "âš ï¸ WARNING: The uploaded file doesn't look like a standard HR template. However, you can still proceed and edit it.",
        placeholders: placeholders,
        sections: scannedSections.length > 0 ? scannedSections : [{
          id: `sec_scan_${Date.now()}_body`,
          type: 'body',
          label: 'EXTRACTED DOCUMENT TEXT',
          content: rawText,
          fontSize: 11, align: 'left', color: '#1F2937'
        }]
      });
      return;
    }

    setScanResult({
      isValid: true,
      score: 100,
      message: `SCAN STATUS: VERIFIED TRUE (100% VALID COMPANY TEMPLATE). Found ${placeholders.length} placeholders and ${scannedSections.length} template sections.`,
      placeholders,
      sections: scannedSections
    });
  };

  const syncTemplateToBackend = async (docData) => {
    try {
      console.log("[BACKEND SYNC] Transmitting template payload to API:", docData);

      let response = null;
      const saveAction = docData.id ? onUpdate : onSave;
      if (saveAction) {
        response = await saveAction(docData).catch((error) => {
          console.warn("Error calling save/update action:", error);
          if (Platform.OS === 'web') {
            window.alert('Failed to save document. Please try again.');
          } else {
            Alert.alert('Error', 'Failed to save document. Please try again.');
          }
          return null;
        });
      }

      if (response && (response.status === 200 || response.status === 201)) {
        console.log("Template & element field positions successfully stored in backend database:", response.data);
      }
    } catch (error) {
      console.warn("Backend template position sync info:", error?.message || error);
    }
  };

  const applyScannedTemplateToCanvas = async () => {
    let targetSections = (scanResult && scanResult.sections && scanResult.sections.length > 0)
      ? scanResult.sections
      : generateSectionsFromRawText(uploadedFileText);

    if (!targetSections || targetSections.length === 0) {
      targetSections = generateSectionsFromRawText(uploadedFileText);
    }

    if (!targetSections || targetSections.length === 0) {
      targetSections = [
        {
          id: `sec_scan_${Date.now()}`,
          type: 'body',
          label: 'UPLOADED COMPANY TEMPLATE',
          content: uploadedFileText || 'Uploaded company letter template content...',
          fontSize: 11, align: 'left', color: '#1F2937'
        }
      ];
    }

    setSectionList(targetSections);
    setActiveSection(targetSections[0].id);
    setDocName("Uploaded Company Template");
    setShowUploadScanModal(false);

    const templateId = Date.now().toString();
    const formattedTargetSections = targetSections.map((sec, index) => ({
      ...sec,
      orderIndex: index,
      position: {
        x: sec.position?.x || 0,
        y: sec.position?.y || (index * 60)
      }
    }));

    const uploadedDocData = {
      id: templateId,
      docName: "Uploaded Company Template",
      sections,
      sectionList: formattedTargetSections,
      logoSize,
      logo,
      pos: { x: translateX.value, y: translateY.value },
      fontFamily,
      pageBorder
    };

    console.log("local in store object", uploadedDocData);

    try {
      const existingLib = await AsyncStorage.getItem("letter_library_list");
      let libArray = existingLib ? JSON.parse(existingLib) : [];
      libArray.push(uploadedDocData);
      await AsyncStorage.setItem("letter_library_list", JSON.stringify(libArray));
      setSavedLibrary(libArray);
    } catch (e) {
      console.error("Local storage template save error:", e);
    }

    await syncTemplateToBackend(uploadedDocData);
    Alert.alert("Success", "Scanned template applied to canvas and saved!");
  };

  const handleTemplateFileUpload = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,.docx,.pdf,.json,.rtf,.html,.doc';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileName = file.name || "";
        const fileType = file.type || "";
        const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

        const invalidExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.mp4', '.avi', '.mov', '.mkv', '.webm', '.mp3', '.wav', '.ogg', '.flac', '.zip', '.exe'];
        const isMedia = fileType.startsWith('image/') || fileType.startsWith('video/') || fileType.startsWith('audio/') || invalidExtensions.includes(extension);

        if (isMedia) {
          setScanResult({
            isValid: false,
            score: 0,
            message: `âŒ REJECTED: "${fileName}" is an Image, Video, or Audio file. Only document text templates (.txt, .docx, .pdf) are allowed!`,
            placeholders: [],
            sections: []
          });
          return;
        }

        // PDF FILE EXTRACTION
        if (extension === '.pdf' || fileType === 'application/pdf') {
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const arrayBuffer = event.target.result;
              let extractedText = "";

              // 1. Try pdfjsLib with disableWorker: true to avoid CORS blocks
              try {
                if (pdfjsLib && pdfjsLib.getDocument) {
                  const loadingTask = pdfjsLib.getDocument({
                    data: new Uint8Array(arrayBuffer),
                    disableWorker: true,
                    isEvalSupported: false
                  });
                  const pdf = await loadingTask.promise;
                  let fullText = [];

                  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    const pageItems = textContent.items.map(item => item.str);
                    fullText.push(pageItems.join(" "));
                  }
                  extractedText = fullText.join("\n\n");
                }
              } catch (pdfJsErr) {
                console.warn("pdfjsLib worker warning, trying stream decoder fallback:", pdfJsErr);
              }

              // 2. Fallback to Stream Decoder if pdfjsLib worker failed or returned empty
              if (!extractedText || !extractedText.trim()) {
                try {
                  const decoder = new TextDecoder('utf-8');
                  const rawString = decoder.decode(arrayBuffer);
                  const matches = rawString.match(/\(([^()]{2,})\)/g);
                  if (matches && matches.length > 0) {
                    const strings = matches
                      .map(m => m.slice(1, -1).trim())
                      .filter(s => s.length > 0 && !s.startsWith('/') && !s.startsWith('%') && !s.includes('Font'));
                    extractedText = strings.join('\n');
                  }
                } catch (decErr) {
                  console.warn("PDF Stream decoder error:", decErr);
                }
              }

              const cleanedText = cleanRawDocumentText(extractedText);
              if (cleanedText && cleanedText.trim()) {
                setUploadedFileText(cleanedText);
                scanUploadedTemplateText(cleanedText);
              } else {
                setScanResult({
                  isValid: false,
                  score: 0,
                  message: `âš ï¸ Could not parse text from PDF "${fileName}". Please ensure the file contains valid text.`,
                  placeholders: [],
                  sections: []
                });
              }
            } catch (pdfErr) {
              console.error("PDF Parsing error:", pdfErr);
            }
          };
          reader.readAsArrayBuffer(file);
          return;
        }

        // DOCX FILE EXTRACTION
        if (extension === '.docx') {
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const arrayBuffer = event.target.result;
              const result = await mammoth.extractRawText({ arrayBuffer });
              const extractedText = result.value || "";
              const cleanedText = cleanRawDocumentText(extractedText);
              setUploadedFileText(cleanedText);
              scanUploadedTemplateText(cleanedText);
            } catch (docxErr) {
              console.error("Docx Parsing error:", docxErr);
            }
          };
          reader.readAsArrayBuffer(file);
          return;
        }

        // PLAIN TEXT / JSON EXTRACTION
        const reader = new FileReader();
        reader.onload = (event) => {
          const rawContent = event.target.result || "";
          const cleanedText = cleanRawDocumentText(rawContent);
          setUploadedFileText(cleanedText);
          scanUploadedTemplateText(cleanedText);
        };
        reader.onerror = () => {
          setScanResult({
            isValid: false,
            score: 0,
            message: `âš ï¸ Could not extract text from "${fileName}". Please ensure the file contains valid text.`,
            placeholders: [],
            sections: []
          });
        };
        reader.readAsText(file);
      };
      input.click();
    } else {
      Alert.alert("File Upload", "Please paste your template text below or choose a document text file.");
    }
  };

  // Auto-Save Effect â€” debounced 2s after last change, does NOT depend on derived `sections`
  useEffect(() => {
    const saveTimer = setTimeout(async () => {
      // Prevent saving completely blank, untouched templates as drafts to avoid clutter (even if title changed)
      if (sectionList.length === 0 && !logo) {
        return;
      }

      try {
        let templateId = currentTemplateId;
        if (!templateId) {
          templateId = Date.now().toString();
          setCurrentTemplateId(templateId);
        }

        const formattedSectionList = sectionList.map((sec, index) => ({
          ...sec,
          orderIndex: index,
          position: {
            x: sec.position?.x || 0,
            y: sec.position?.y || (index * 60)
          }
        }));

        // Build sections map locally â€” do NOT read from `sections` state to avoid double-trigger
        const sectionsMap = {};
        sectionList.forEach(item => { sectionsMap[item.id || item.type] = item; });

        const docData = {
          id: templateId,
          docName,
          sections: sectionsMap,
          sectionList: formattedSectionList,
          logoSize,
          logo,
          pos: { x: translateX.value, y: translateY.value },
          fontFamily,
          pageBorder,
          isDraft: true
        };
        console.log("docdata ", docData)
        const existingLib = await AsyncStorage.getItem("letter_library_list");
        let libArray = existingLib ? JSON.parse(existingLib) : [];

        const existingIdx = libArray.findIndex(t => t.id === templateId);
        if (existingIdx > -1) {
          const wasDraft = libArray[existingIdx].isDraft !== false;
          docData.isDraft = wasDraft;
          libArray[existingIdx] = docData;
        } else {
          libArray.push(docData);
        }

        await AsyncStorage.setItem("letter_library_list", JSON.stringify(libArray));
        await AsyncStorage.setItem("letter_builder_last_active_id", templateId);
        // Defer library state update so it doesn't block the current render cycle
        setTimeout(() => setSavedLibrary(libArray), 0);
      } catch (e) {
        console.error("Auto-save failed", e);
      }
    }, 2000); // 2s debounce â€” gives deletions & typing breathing room

    return () => clearTimeout(saveTimer);
  }, [sectionList, docName, logo, logoSize, fontFamily, pageBorder, currentTemplateId]);




  const extractVariables = () => {
    const vars = {};
    const regex = /{{(.*?)}}/g;
    Object.keys(sections).forEach(key => {
      if (key === 'table') {
        const s = sections.table;
        if (s.enabled) {
          s.headers.forEach(h => {
            let match;
            while ((match = regex.exec(h)) !== null) vars[match[1]] = dynamicVars[match[1]] || "";
          });
          s.rows.forEach(r => r.forEach(c => {
            let match;
            while ((match = regex.exec(c)) !== null) vars[match[1]] = dynamicVars[match[1]] || "";
          }));
        }
      } else {
        const section = sections[key];
        let match;
        while ((match = regex.exec(section.content)) !== null) {
          vars[match[1]] = dynamicVars[match[1]] || "";
        }
      }
    });
    if (Object.keys(vars).length > 0) {
      setDynamicVars(vars);
      setShowVariableModal(true);
    } else {
      Alert.alert("No Variables Found", "Add variables using {{VariableName}} syntax in any text section.");
    }
  };

  const applyDynamicVariables = () => {
    setSectionList(prevList => prevList.map(item => {
      if (item.type === 'table' && item.enabled) {
        const newHeaders = item.headers.map(h => {
          let hC = h;
          Object.keys(dynamicVars).forEach(v => { hC = hC.replace(new RegExp(`{{${v}}}`, 'g'), dynamicVars[v]); });
          return hC;
        });
        const newRows = item.rows.map(r => r.map(c => {
          let cC = c;
          Object.keys(dynamicVars).forEach(v => { cC = cC.replace(new RegExp(`{{${v}}}`, 'g'), dynamicVars[v]); });
          return cC;
        }));
        return { ...item, headers: newHeaders, rows: newRows };
      } else if (typeof item.content === 'string') {
        let content = item.content;
        Object.keys(dynamicVars).forEach(varName => {
          const regex = new RegExp(`{{${varName}}}`, 'g');
          content = content.replace(regex, dynamicVars[varName]);
        });
        return { ...item, content };
      }
      return item;
    }));
    setShowVariableModal(false);
  };

  const applyCompanyDetails = async (customDetails) => {
    const details = customDetails || companyInfo;

    const companyLines = [];
    if (details.name) companyLines.push(`**${details.name}**`);
    if (details.address) companyLines.push(details.address);
    const companyContent = companyLines.join("\n");

    const infoParts = [];
    if (details.phone) infoParts.push(`ðŸ“ž ${details.phone}`);
    if (details.email) infoParts.push(`âœ‰ï¸ ${details.email}`);
    if (details.website) infoParts.push(`ðŸŒ ${details.website}`);
    const headerInfoContent = infoParts.join("  |  ");

    setSectionList(prevList => prevList.map(item => {
      if (item.type === 'company') return { ...item, content: companyContent || item.content };
      if (item.type === 'headerInfo') return { ...item, content: headerInfoContent || item.content };
      return item;
    }));

    try {
      await AsyncStorage.setItem("letter_builder_company_details", JSON.stringify(details));
    } catch (e) {
      console.error("Error saving company details", e);
    }

    setShowCompanyModal(false);
  };

  const handleNewBlankTemplate = () => {
    setDocName("New Custom Letter");
    setCurrentTemplateId(null);
    setLogo(null);
    setSectionList([]);
    setActiveSection(null);
    setShowTemplates(false);
  };

  const applyTemplate = (templateKey) => {
    if (templateKey === 'blank') {
      handleNewBlankTemplate();
      return;
    }
    setCurrentTemplateId(null); // Reset for new custom save
    const template = templates[templateKey];
    if (template) {
      setDocName(template.docName);
      setLogo(template.logo || "https://cdn-icons-png.flaticon.com/512/187/187879.png");
      setLogoSize(template.logoSize || 80);
      translateX.value = 40;
      translateY.value = 20;
      setPageCount(1);
      setActiveSection(null);

      const currentCompanyContent = (sections.company && sections.company.content) ? sections.company.content : "";
      const isCustomCompany = currentCompanyContent &&
        !currentCompanyContent.includes("Company Name") &&
        currentCompanyContent.trim().length > 0;

      const configuredCompanyLines = [];
      if (companyInfo.name) configuredCompanyLines.push(companyInfo.name);
      if (companyInfo.address) configuredCompanyLines.push(companyInfo.address);
      const configuredCompanyContent = configuredCompanyLines.join("\n");

      const configuredInfoParts = [];
      if (companyInfo.phone) configuredInfoParts.push(`ðŸ“ž ${companyInfo.phone}`);
      if (companyInfo.email) configuredInfoParts.push(`âœ‰ï¸ ${companyInfo.email}`);
      if (companyInfo.website) configuredInfoParts.push(`ðŸŒ ${companyInfo.website}`);
      const configuredHeaderInfoContent = configuredInfoParts.join("  |  ");

      const newSectionList = [];
      Object.keys(template.sections).forEach(tplKey => {
        const baseItem = BASE_SECTIONS.find(b => b.type === tplKey) || { id: `sec_${tplKey}`, type: tplKey, label: tplKey.toUpperCase() };
        const tplSec = template.sections[tplKey];

        let finalItem = { ...baseItem, ...tplSec };
        if (tplKey === 'company') {
          const contentToUse = configuredCompanyContent || (isCustomCompany ? currentCompanyContent : tplSec.content);
          finalItem.content = contentToUse;
        } else if (tplKey === 'headerInfo' && configuredHeaderInfoContent) {
          finalItem.content = configuredHeaderInfoContent;
        }
        newSectionList.push(finalItem);
      });
      setSectionList(newSectionList);
    }
    setShowTemplates(false);
  };

  // Performance refs â€” used by rAF throttlers and scan debouncer to prevent excessive work on slow PCs
  const dragOverRafRef = useRef(null);   // throttles onDragOver DOM queries on A4 canvas
  const resizeRafRef = useRef(null);     // throttles onDrag resize handle DOM reads
  const scanDebounceRef = useRef(null);  // debounces heavy regex scan on textarea input
  const itemDragRafRef = useRef(null);   // throttles onDragOver on individual items

  const translateX = useSharedValue(40);
  const translateY = useSharedValue(20);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = translateX.value;
      contextY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = contextX.value + e.translationX;
      translateY.value = contextY.value + e.translationY;
    });

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  useEffect(() => {
    fetchLibrary();
    loadCompanyDetails();
    loadLastActiveDraft();
    console.log("Ussefect 1");
  }, []);

  const loadLastActiveDraft = async () => {
    try {
      const lastActiveId = await AsyncStorage.getItem("letter_builder_last_active_id");
      if (lastActiveId) {
        const data = await AsyncStorage.getItem("letter_library_list");
        if (data) {
          const libArray = JSON.parse(data);
          const lastItem = libArray.find(item => item.id === lastActiveId);
          if (lastItem) {
            setCurrentTemplateId(lastItem.id);
            setDocName(lastItem.docName);
            if (lastItem.sectionList && Array.isArray(lastItem.sectionList)) {
              setSectionList(lastItem.sectionList);
            } else if (lastItem.sections) {
              const newList = [];
              Object.keys(lastItem.sections).forEach(key => {
                const baseItem = BASE_SECTIONS.find(b => b.type === key) || { id: `sec_${key}`, type: key, label: key.toUpperCase() };
                newList.push({ ...baseItem, ...lastItem.sections[key] });
              });
              setSectionList(newList);
            }
            setLogo(lastItem.logo);
            setLogoSize(lastItem.logoSize);
            if (lastItem.pos) {
              translateX.value = lastItem.pos.x;
              translateY.value = lastItem.pos.y;
            }
          }
        }
      }
    } catch (e) {
      console.error("Error loading last active draft", e);
    }
  };

  const loadCompanyDetails = async () => {
    try {
      const savedDetails = await AsyncStorage.getItem("letter_builder_company_details");
      if (savedDetails) {
        const parsed = JSON.parse(savedDetails);
        setCompanyInfo(parsed);
      }
    } catch (e) {
      console.error("Error loading company details", e);
    }
  };

  const fetchLibrary = async () => {
    setIsFetchingLibrary(true);
    try {
      const data = await AsyncStorage.getItem("letter_library_list");
      let libArray = data ? JSON.parse(data) : [];

      const predefinedList = Object.keys(templates).map((key) => ({
        id: `predefined_${key}`,
        docName: templates[key].docName,
        sections: templates[key].sections,
        logoSize: 80,
        logo: "https://cdn-icons-png.flaticon.com/512/187/187879.png",
        pos: { x: 40, y: 20 },
        fontFamily: "sans-serif",
        pageBorder: false,
      }));

      let updated = false;
      predefinedList.forEach((pref) => {
        if (!libArray.some((item) => item.docName === pref.docName || item.id === pref.id)) {
          libArray.push(pref);
          updated = true;
        }
      });

      // Fetch from backend API
      try {
        let res = null;
        if (apiConfig.fetchDocuments) {
          res = await apiConfig.fetchDocuments().catch((error) => {
            console.warn("Error calling apiConfig.fetchDocuments:", error);
            if (Platform.OS === 'web') {
              window.alert('Failed to load library documents. Please check your connection.');
            } else {
              Alert.alert('Error', 'Failed to load library documents. Please check your connection.');
            }
            return null;
          });
        }

        if (res && res.data) {
          const backendTemplates = Array.isArray(res.data) ? res.data : (res.data.data || []);
          backendTemplates.forEach(bt => {
            const formatted = {
              id: bt.templateId || bt.id,
              docName: bt.doc_name || bt.docName || bt.name || 'Backend Template',
              sections: bt.sections || {},
              sectionList: bt.section_list || bt.sectionList || [],
              logoSize: bt.logo_size || bt.logoSize || 80,
              logo: bt.logo || null,
              pos: bt.pos || bt.logoPosition || { x: 40, y: 20 },
              fontFamily: bt.font_family || bt.fontFamily || "Inter",
              pageBorder: bt.page_border !== undefined ? bt.page_border : (bt.pageBorder !== undefined ? bt.pageBorder : "none"),
            };

            const existingIdx = libArray.findIndex(item => item.id === formatted.id);
            if (existingIdx > -1) {
              libArray[existingIdx] = { ...libArray[existingIdx], ...formatted };
              updated = true;
            } else {
              libArray.push(formatted);
              updated = true;
            }
          });
        }
      } catch (backendErr) {
        console.warn("Failed to fetch templates from backend", backendErr);
      }

      if (updated || !data) {
        await AsyncStorage.setItem("letter_library_list", JSON.stringify(libArray));
      }
      setSavedLibrary(libArray);
    } catch (err) {
      console.error("Error fetching library:", err);
    }
  };

  const getActiveItem = () => {
    if (!activeSection) return {};
    const byId = sectionList.find(s => s.id === activeSection);
    if (byId) return byId;
    const byType = sectionList.find(s => s.type === activeSection);
    if (byType) return byType;
    return (sections && sections[activeSection]) || {};
  };

  // Memoized active item â€” replaces 15+ repeated sectionList.find() calls in toolbar JSX.
  // Recomputes only when sectionList or activeSection changes, not on every keystroke.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const activeItem = useMemo(() => getActiveItem(), [sectionList, activeSection]);

  // Returns all currently selected items (multi + active)
  const getSelectedItems = () => {
    if (selectedSections.size > 0) {
      return sectionList.filter(s => selectedSections.has(s.id));
    }
    const single = getActiveItem();
    return (single && single.id) ? [single] : [];
  };

  const updateActiveSection = (updater) => {
    // If multiple sections are selected, apply to all of them
    if (selectedSections.size > 0) {
      setSectionList(prevList =>
        prevList.map(item => {
          if (selectedSections.has(item.id)) {
            return typeof updater === 'function' ? updater(item) : { ...item, ...updater };
          }
          return item;
        })
      );
      return;
    }
    // Single active section
    if (!activeSection) return;
    setSectionList(prevList => {
      const hasIdMatch = prevList.some(item => item.id === activeSection);
      return prevList.map(item => {
        const isMatch = hasIdMatch ? (item.id === activeSection) : (item.type === activeSection);
        if (isMatch) {
          const updated = typeof updater === 'function' ? updater(item) : { ...item, ...updater };
          return updated;
        }
        return item;
      });
    });
  };

  const toggleStyle = (styleKey) => {
    updateActiveSection(item => ({ ...item, [styleKey]: !item[styleKey] }));
  };

  const setAlignment = (alignValue) => {
    updateActiveSection({ align: alignValue });
  };

  const adjustFontSize = (delta) => {
    updateActiveSection(item => ({ ...item, fontSize: Math.min(32, Math.max(8, (item.fontSize || 12) + delta)) }));
  };

  const applyColorToSection = (colorValue) => {
    updateActiveSection({ color: colorValue });
  };

  // Stable ref to always call the latest updateActiveSection without recreating the throttle
  const updateActiveSectionRef = useRef(updateActiveSection);
  updateActiveSectionRef.current = updateActiveSection;

  const colorThrottleRef = useRef({ lastCall: 0, timeout: null });
  const throttledApplyColor = useCallback((color) => {
    const now = Date.now();
    const t = colorThrottleRef.current;
    if (now - t.lastCall >= 100) {
      t.lastCall = now;
      updateActiveSectionRef.current({ color });
    } else {
      clearTimeout(t.timeout);
      t.timeout = setTimeout(() => {
        t.lastCall = Date.now();
        updateActiveSectionRef.current({ color });
      }, 100);
    }
  }, []); // stable â€” uses refs internally, does not need to re-create on section change

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      const newUri = result.assets[0].uri;
      setCustomLogos([newUri, ...customLogos]);
      setLogo(newUri);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    let templateId = currentTemplateId || Date.now().toString();
    setCurrentTemplateId(templateId);

    const formattedSectionList = sectionList.map((sec, index) => ({
      ...sec,
      orderIndex: index,
      position: {
        x: sec.position?.x || 0,
        y: sec.position?.y || (index * 60)
      }
    }));

    const docData = {
      id: templateId,
      docName,
      sections,
      sectionList: formattedSectionList,
      logoSize,
      logo,
      pos: { x: translateX.value, y: translateY.value },
      fontFamily,
      pageBorder,
      isDraft: false
    };

    const existingLib = await AsyncStorage.getItem("letter_library_list");
    let libArray = existingLib ? JSON.parse(existingLib) : [];

    const existingIdx = libArray.findIndex(t => t.id === templateId);
    if (existingIdx > -1) {
      libArray[existingIdx] = docData;
    } else {
      libArray.push(docData);
    }

    await AsyncStorage.setItem("letter_library_list", JSON.stringify(libArray));
    await AsyncStorage.setItem("letter_builder_last_active_id", templateId);
    setSavedLibrary(libArray);

    // Sync template with Backend API
    await syncTemplateToBackend(docData);

    setIsSaving(false);
    Alert.alert("Success", `Document "${docName}" saved successfully!`);
  };


  const handleSaveAsForm = async () => {
    try {
      setIsSaving(true);

      // Convert LetterBuilder sectionList to FormBuilder format
      // FormBuilder expects: { fields: [...], rows: [...] }

      let newFormFields = [];
      let newRows = [];

      // We will treat each section as a row with 1 column for simplicity
      sectionList.forEach((sec, idx) => {
        const fieldTypeMap = {
          'formInput': 'text',
          'formTextArea': 'textarea',
          'formFileUpload': 'file',
          'formToggle': 'toggle',
          'formRating': 'rating',
          'formDatePicker': 'date',
          'formDropdown': 'dropdown',
          'formRadio': 'radio',
          'formCheckbox': 'checkbox',
          'customText': 'textarea',
          'headerInfo': 'label',
          'subject': 'label',
          'recipient': 'label',
          'dateRef': 'label',
          'signature': 'label',
          'stamp': 'label',
          'terms': 'label',
          'table': 'label',
          'spacer': 'label'
        };

        const mappedType = fieldTypeMap[sec.type] || 'text';

        const field = {
          uniqueId: sec.id,
          type: mappedType,
          label: sec.fieldLabel || sec.type,
          placeholder: sec.placeholder || '',
          required: !!sec.required,
          options: sec.options || [],
          customStyle: {
            width: sec.width,
            padding: sec.padding,
            margin: sec.margin,
            align: sec.align
          }
        };

        newFormFields.push(field);

        newRows.push({
          rowId: idx + 1,
          columns: 1,
          alignment: sec.align || 'start',
          spacing: 'normal',
          fields: [field]
        });
      });

      const newForm = {
        id: `form-${Date.now()}`,
        name: docName || 'Converted Form',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fields: newFormFields,
        rows: newRows,
        fieldCount: newFormFields.length,
        rowCount: newRows.length,
      };

      const savedForms = await AsyncStorage.getItem(FORMS_STORAGE_KEY);
      let forms = savedForms ? JSON.parse(savedForms) : [];
      forms.push(newForm);

      await AsyncStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(forms));
      setFormsList(forms); // update sidebar

      Alert.alert("Success", `Document saved as Form "${newForm.name}"!`);
    } catch (error) {
      console.error('Error saving as form:', error);
      Alert.alert("Error", "Failed to save as Form.");
    } finally {
      setIsSaving(false);
    }
  };

  
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

  const handleSaveDraft = async () => {
    setIsSaving(true);
    let templateId = currentTemplateId || Date.now().toString();
    setCurrentTemplateId(templateId);

    const formattedSectionList = sectionList.map((sec, index) => ({
      ...sec,
      orderIndex: index,
      position: {
        x: sec.position?.x || 0,
        y: sec.position?.y || (index * 60)
      }
    }));

    const docData = {
      id: templateId,
      docName,
      sections,
      sectionList: formattedSectionList,
      logoSize,
      logo,
      pos: { x: translateX.value, y: translateY.value },
      fontFamily,
      pageBorder,
      isDraft: true
    };

    const existingLib = await AsyncStorage.getItem("letter_library_list");
    let libArray = existingLib ? JSON.parse(existingLib) : [];

    const existingIdx = libArray.findIndex(t => t.id === templateId);
    if (existingIdx > -1) {
      libArray[existingIdx] = docData;
    } else {
      libArray.push(docData);
    }

    await AsyncStorage.setItem("letter_library_list", JSON.stringify(libArray));
    await AsyncStorage.setItem("letter_builder_last_active_id", templateId);
    setSavedLibrary(libArray);

    setIsSaving(false);
    Alert.alert("Draft Saved", `Draft "${docName}" saved locally!`);
  };

  const deleteFromLibrary = async (id) => {
    try {
      (onDeleteDocument ? (apiConfig.deleteDocument ? await apiConfig.deleteDocument(id) : null) : null);
    } catch (error) {
      console.warn("Failed to delete document from backend API", error);
    }
    const updatedLib = savedLibrary.filter(item => item.id !== id);
    setSavedLibrary(updatedLib);
    await AsyncStorage.setItem("letter_library_list", JSON.stringify(updatedLib));

    const lastActiveId = await AsyncStorage.getItem("letter_builder_last_active_id");
    if (lastActiveId === id) {
      await AsyncStorage.removeItem("letter_builder_last_active_id");
    }
  };
  const loadFromLibrary = (item) => {
    setCurrentTemplateId(item.id);
    setDocName(item.docName);
    if (item.sectionList && Array.isArray(item.sectionList)) {
      setSectionList(item.sectionList);
    } else if (item.sections) {
      const newList = [];
      Object.keys(item.sections).forEach(key => {
        const baseItem = BASE_SECTIONS.find(b => b.type === key) || { id: `sec_${key}`, type: key, label: key.toUpperCase() };
        newList.push({ ...baseItem, ...item.sections[key] });
      });
      setSectionList(newList);
    }
    setLogo(item.logo);
    setLogoSize(item.logoSize);
    translateX.value = item.pos.x;
    translateY.value = item.pos.y;
    setShowLibrary(false);

    // Save as last active template
    AsyncStorage.setItem("letter_builder_last_active_id", item.id).catch(err => console.warn(err));
  };

  const cycleUnderline = () => {
    const underlineTypes = ['none', 'solid', 'double', 'dashed'];
    const activeItem = getActiveItem();
    const currentStyle = activeItem ? (activeItem.underlineStyle || 'none') : 'none';
    const nextIndex = (underlineTypes.indexOf(currentStyle) + 1) % underlineTypes.length;
    const nextStyle = underlineTypes[nextIndex];
    updateActiveSection({ underlineStyle: nextStyle });
  };

  const getUnderlineIcon = () => {
    const activeItem = getActiveItem();
    const style = activeItem ? activeItem.underlineStyle : 'none';
    if (style === 'double') return "format-underline-double";
    if (style === 'dashed') return "format-line-style";
    return "format-underline";
  };






  const ensureBase64Image = async (url) => {
    if (!url) return "";
    if (url.startsWith("data:image")) return url;
    if (Platform.OS !== "web") return url;

    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn("Fetch base64 image warning, using canvas fallback:", err);
    }

    return new Promise((resolve) => {
      try {
        const img = new window.Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || img.width || 100;
            canvas.height = img.naturalHeight || img.height || 100;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL("image/png");
            resolve(dataURL);
          } catch (e) {
            resolve(url);
          }
        };
        img.onerror = () => resolve(url);
        img.src = url;
      } catch (e) {
        resolve(url);
      }
    });
  };

  const exportPDF = async () => {
    let logoToUse = logo;
    if (Platform.OS === "web" && logo) {
      logoToUse = await ensureBase64Image(logo);
    }
    const content = generateWebPDFContent(sections, logoToUse, logoSize, translateX.value, translateY.value, showWatermark, watermarkOpacity, watermarkType, watermarkText);

    if (Platform.OS === "web") {
      // âœ… WEB â†’ DOWNLOAD PDF
      const element = document.createElement("div");
      element.style.width = "210mm";
      element.style.backgroundColor = "#ffffff";
      element.style.color = "#1F2937";
      element.innerHTML = content;

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${docName.replace(/\s+/g, '_')}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(opt).from(element).save();
      if (onExport) onExport({ type: 'pdf' });
    } else {
      // âœ… ANDROID / IOS
      const { uri } = await Print.printToFileAsync({
        html: content,
        base64: false,
      });

      await shareAsync(uri);
      if (onExport) onExport({ uri, type: 'pdf' });
    }
  };

  const handleWebDownload = async (item) => {
    let logoToUse = item.logo;
    if (Platform.OS === "web" && item.logo) {
      logoToUse = await ensureBase64Image(item.logo);
    }
    const content = generateWebPDFContent(
      item.sections,
      logoToUse,
      item.logoSize,
      (item.pos && item.pos.x !== undefined) ? item.pos.x : 40,
      (item.pos && item.pos.y !== undefined) ? item.pos.y : 20,
      item.showWatermark !== false,
      item.watermarkOpacity || 0.08
    );

    if (Platform.OS === "web") {
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "-9999px";
      container.innerHTML = content;
      document.body.appendChild(container);

      await new Promise((res) => setTimeout(res, 250));

      await html2pdf()
        .from(container)
        .set({
          margin: 0,
          filename: `${item.docName || docName}.pdf`,
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
          },
        })
        .save();

      document.body.removeChild(container);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ flex: 1 }}>
          <View style={styles.container}>

            {/* HEADER */}
            <View style={styles.appHeader}>
              <View style={styles.appHeaderLeft}>
                <View style={styles.titleInputWrapper}>
                  <Feather name="edit-3" size={14} color="#64748B" style={{ marginLeft: 12 }} />
                  <TextInput
                    style={styles.docTitleInput}
                    value={docName}
                    onChangeText={setDocName}
                    placeholder="Document Title..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={styles.draftBadge}>
                  <View style={styles.draftDot} />
                  <RNText style={styles.draftBadgeText}>Auto-Save Active</RNText>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Pressable
                  style={({ pressed }) => [
                    styles.saveBtn,
                    { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' },
                    isSaving && { opacity: 0.7 },
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                  ]}
                  onPress={handleSaveDraft}
                  disabled={isSaving}
                >
                  <Feather name="save" size={16} color="#475569" style={{ marginRight: 8 }} />
                  <RNText style={[styles.saveBtnText, { color: '#475569' }]}>
                    {isSaving ? "Saving..." : "Save Draft"}
                  </RNText>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.saveBtn,
                    isSaving && styles.saveBtnSaving,
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                  ]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <Feather
                    name={isSaving ? "refresh-cw" : "check-circle"}
                    size={16}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <RNText style={styles.saveBtnText}>
                    {isSaving ? "Saving..." : currentTemplateId ? "Update Template" : "Save Template"}
                  </RNText>
                </Pressable>
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

              </View>
            </View>

            {/* TOOLBAR */}
            <View style={styles.toolbar}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', width: '100%', paddingHorizontal: 5, paddingVertical: 8, gap: 10, justifyContent: 'flex-start' }}>
                {apiConfig?.fetchDocuments && (
                  <>
                    <IconButton name="folder" label="My Files" onPress={() => { setActiveLibraryTab('all'); setShowLibrary(true); }} type="Feather" />
                    <IconButton name="edit-2" label="Drafts" onPress={() => { setActiveLibraryTab('drafts'); setShowLibrary(true); }} type="Feather" />
                  </>
                )}
                <IconButton name="file-plus" label="New Blank" onPress={handleNewBlankTemplate} type="Feather" />
                <IconButton name="file-text" label="Templates" onPress={() => setShowTemplates(true)} type="Feather" />
                <IconButton name="upload-cloud" label="Upload/Paste" onPress={() => { setShowTemplates(true); setActiveTemplatesTab('upload'); }} type="Feather" />
                <IconButton name="upload-cloud" label="Scan" onPress={() => setShowUploadScanModal(true)} type="Feather" />
                <IconButton name="image" label="Logo" onPress={() => setShowLogoSelector(true)} />
                <IconButton name="layers" label="Watermark" active={showWatermark} onPress={() => setShowWatermarkModal(true)} type="Feather" />
                <View style={styles.ribbonDivider} />
                <IconButton name="plus-circle" label="+ Text Field" onPress={() => addNewField('customText')} type="Feather" />
                <IconButton name="grid" label="+ Table" onPress={() => addNewField('table')} type="Feather" />
                <IconButton name="square" label="+ Spacer" onPress={() => addNewField('spacer')} type="Feather" />
                <View style={styles.ribbonDivider} />
                <IconButton name="eye" label="Preview" onPress={() => setShowPreview(true)} />
                <View style={styles.vDivider} />

                <View style={styles.toolGroup}>
                  {Platform.OS === 'web' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <input
                        type="color"
                        value={activeItem?.color || '#000000'}
                        onChange={(e) => throttledApplyColor(e.target.value)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          border: '2px solid #E2E8F0',
                          cursor: 'pointer',
                          padding: 0,
                          backgroundColor: 'transparent',
                          outline: 'none',
                          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                          boxSizing: 'border-box'
                        }}
                      />
                      <RNText style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>Color</RNText>
                    </View>
                  ) : (
                    ['#000000', '#d83b01', '#0078d4', '#107c10'].map((color) => (
                      <Pressable
                        key={color}
                        onPress={() => applyColorToSection(color)}
                        style={[styles.colorCircle, { backgroundColor: color }, activeItem?.color === color && styles.colorCircleActive]}
                      />
                    ))
                  )}
                </View>
                <View style={styles.vDivider} />
                <View style={styles.toolGroup}>
                  <IconButton name="type" label="Serif" active={fontFamily === 'serif'} onPress={() => setFontFamily('serif')} />
                  <IconButton name="format-bold" type="MaterialIcons" active={!!activeItem?.bold} onPress={() => toggleStyle('bold')} />
                  <IconButton name="format-italic" type="MaterialIcons" active={!!activeItem?.italic} onPress={() => toggleStyle('italic')} />
                  <IconButton name={getUnderlineIcon()} type="MaterialCommunityIcons" active={activeItem?.underlineStyle && activeItem?.underlineStyle !== "none"} color={(activeItem?.underlineStyle && activeItem?.underlineStyle !== "none") ? "#0078d4" : "#444"} onPress={cycleUnderline} />
                </View>

                {/* MULTI-SELECT INDICATOR */}
                {selectedSections.size > 1 && (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    backgroundColor: '#EFF6FF', borderRadius: 6,
                    paddingHorizontal: 10, paddingVertical: 4,
                    borderWidth: 1, borderColor: '#BFDBFE', marginRight: 6
                  }}>
                    <Feather name="layers" size={13} color="#0078d4" />
                    <RNText style={{ fontSize: 11, fontWeight: '700', color: '#0078d4' }}>
                      {selectedSections.size} fields selected
                    </RNText>
                    <Pressable onPress={() => setSelectedSections(new Set())} style={{ marginLeft: 2 }}>
                      <Feather name="x" size={12} color="#0078d4" />
                    </Pressable>
                  </View>
                )}

                <View style={styles.vDivider} />

                <View style={[styles.toolGroup, styles.formatGroup]}>
                  <IconButton name="format-align-left" active={activeItem?.align === 'left'} onPress={() => setAlignment('left')} />
                  <IconButton name="format-align-center" active={activeItem?.align === 'center'} onPress={() => setAlignment('center')} />
                  <IconButton name="format-align-right" active={activeItem?.align === 'right'} onPress={() => setAlignment('right')} />
                </View>

                <View style={styles.vDivider} />

                <View style={styles.toolGroup}>
                  <IconButton name="minus" size={14} onPress={() => adjustFontSize(-1)} />
                  <View style={styles.fontSizeBox}><Text weight="700">{(activeItem?.fontSize) || 12}pt</Text></View>
                  <IconButton name="plus" size={14} onPress={() => adjustFontSize(1)} />
                </View>

                <View style={styles.vDivider} />

                <View style={styles.toolGroup}>
                  <Text style={{ fontSize: 10, color: '#666', marginRight: 5 }}>Logo:</Text>
                  <IconButton name="minus" size={14} onPress={() => setLogoSize(Math.max(30, logoSize - 10))} />
                  <View style={styles.fontSizeBox}><Text weight="700">{logoSize}</Text></View>
                  <IconButton name="plus" size={14} onPress={() => setLogoSize(Math.min(200, logoSize + 10))} />
                </View>

                <View style={styles.vDivider} />

                <View style={styles.toolGroup}>
                  <Text style={{ fontSize: 10, color: '#666', marginRight: 5 }}>Width:</Text>
                  <IconButton name="minus" size={14} onPress={() => {
                    let current = parseFloat((activeItem?.width || '100').replace('%', ''));
                    let next = Math.max(10, current - 5);
                    updateActiveSection({ width: `${next}%` });
                  }} />
                  <View style={[styles.fontSizeBox, { flexDirection: 'row', alignItems: 'center' }]}>
                    <TextInput
                      style={{ fontWeight: '700', fontSize: 11, textAlign: 'center', width: 24, padding: 0, outlineStyle: 'none', color: '#1E293B' }}
                      keyboardType="numeric"
                      value={activeItem?.width === '' ? '' : String(Math.round(parseFloat((activeItem?.width ?? '100').replace('%', ''))))}
                      onChangeText={(text) => {
                        if (text === '') {
                          updateActiveSection({ width: '' });
                        } else {
                          let val = parseInt(text.replace(/[^0-9]/g, ''));
                          if (!isNaN(val)) updateActiveSection({ width: `${Math.min(100, val)}%` });
                        }
                      }}
                    />
                    <Text style={{ fontWeight: '700', fontSize: 11, color: '#1E293B' }}>%</Text>
                  </View>
                  <IconButton name="plus" size={14} onPress={() => {
                    let current = parseFloat((activeItem?.width || '100').replace('%', ''));
                    let next = Math.min(100, current + 5);
                    updateActiveSection({ width: `${next}%` });
                  }} />
                  <View style={{ width: 1, height: 15, backgroundColor: '#E2E8F0', marginHorizontal: 4 }} />
                  <Pressable onPress={() => updateActiveSection({ width: '100%' })} style={[styles.ribbonBtn, (activeItem?.width === '100%' || !activeItem?.width) ? styles.ribbonBtnActive : {}]}><Text style={[{ fontSize: 11 }, (activeItem?.width === '100%' || !activeItem?.width) && { color: '#0078d4' }]}>100%</Text></Pressable>
                  <Pressable onPress={() => updateActiveSection({ width: '50%' })} style={[styles.ribbonBtn, activeItem?.width === '50%' ? styles.ribbonBtnActive : {}]}><Text style={[{ fontSize: 11 }, activeItem?.width === '50%' && { color: '#0078d4' }]}>50%</Text></Pressable>
                  <Pressable onPress={() => updateActiveSection({ width: '33.33%' })} style={[styles.ribbonBtn, activeItem?.width === '33.33%' ? styles.ribbonBtnActive : {}]}><Text style={[{ fontSize: 11 }, activeItem?.width === '33.33%' && { color: '#0078d4' }]}>33%</Text></Pressable>
                </View>

                <View style={styles.vDivider} />

                <View style={styles.toolGroup}>
                  <Text style={{ fontSize: 10, color: '#666', marginRight: 5 }}>H:</Text>
                  <IconButton name="minus" size={14} onPress={() => updateActiveSection(item => ({ ...item, minHeight: Math.max(1, (item.minHeight || 25) - 5) }))} />
                  <View style={styles.fontSizeBox}>
                    <TextInput
                      style={{ fontWeight: '700', fontSize: 11, textAlign: 'center', width: 30, padding: 0, outlineStyle: 'none', color: '#1E293B' }}
                      keyboardType="numeric"
                      value={String(activeItem?.minHeight ?? 25)}
                      onChangeText={(text) => {
                        if (text === '') {
                          updateActiveSection(item => ({ ...item, minHeight: '' }));
                        } else {
                          let val = parseInt(text.replace(/[^0-9]/g, ''));
                          if (!isNaN(val) && val >= 1) updateActiveSection(item => ({ ...item, minHeight: val }));
                        }
                      }}
                    />
                    <Text style={{ fontWeight: '700', fontSize: 10, color: '#94A3B8' }}>px</Text>
                  </View>
                  <IconButton name="plus" size={14} onPress={() => updateActiveSection(item => ({ ...item, minHeight: (item.minHeight || 25) + 5 }))} />
                </View>
              </View>
            </View>

            {/* MAIN EDITOR */}
            <View style={[styles.mainContent, isMobile && { flexDirection: 'column' }]}>
              {isMobile ? (
                <View style={styles.mobileSectionBar}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, gap: 8, alignItems: 'center' }}>
                    {sectionList.map((item, idx) => (
                      <Pressable key={item.id || idx} onPress={() => setActiveSection(item.id)} style={[styles.mobileSideItem, activeSection === item.id && styles.mobileSideItemActive]}>
                        <Feather name={item.type === 'table' ? 'grid' : 'align-left'} size={12} color={activeSection === item.id ? '#0078d4' : '#666'} />
                        <Text style={[styles.mobileSideItemText, activeSection === item.id && { color: '#0078d4', fontWeight: '700' }]}>{item.label || item.type.toUpperCase()}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <View style={[styles.sidebar, { width: 260, backgroundColor: '#FFFFFF', padding: 14 }]}>
                  {/* LEFT SIDEBAR CONTENT PALETTE */}
                  <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    <View style={{ marginBottom: 20 }}>
                      <Text weight="700" style={styles.sidebarTitle}>+ ADD ELEMENTS</Text>
                      <View style={{ gap: 4 }}>
                        <Pressable
                          onPress={handleNewBlankTemplate}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#EFF6FF',
                            paddingVertical: 7,
                            paddingHorizontal: 10,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: '#BFDBFE',
                            marginBottom: 4
                          }}
                        >
                          <Feather name="file-plus" size={14} color="#0078d4" style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#0078d4' }}>+ Start Blank Canvas</Text>
                        </Pressable>

                        {[
                          { type: 'headerInfo', label: '+ Company Letterhead', icon: 'award', color: '#0284C7' },
                          { type: 'customText', label: '+ Text Paragraph', icon: 'type', color: '#0078d4' },
                          { type: 'subject', label: '+ Subject Line', icon: 'file-text', color: '#F59E0B' },
                          { type: 'recipient', label: '+ Recipient Address', icon: 'user', color: '#3B82F6' },
                          { type: 'dateRef', label: '+ Date & Ref No.', icon: 'calendar', color: '#6366F1' },
                          { type: 'signature', label: '+ Signature Block', icon: 'pen-tool', color: '#8B5CF6' },
                          { type: 'stamp', label: '+ Stamp & Seal', icon: 'award', color: '#F43F5E' },
                          { type: 'terms', label: '+ Terms & Clauses', icon: 'list', color: '#14B8A6' },
                          { type: 'table', label: '+ Data / Salary Table', icon: 'grid', color: '#10B981' },
                          { type: 'spacer', label: '+ Empty Spacer', icon: 'square', color: '#94A3B8' },
                          { type: 'formInput', label: '+ Text Input', icon: 'type', color: '#10B981' },
                          { type: 'formTextArea', label: '+ Text Area', icon: 'align-left', color: '#10B981' },
                          { type: 'formDatePicker', label: '+ Date Picker', icon: 'calendar', color: '#3B82F6' },
                          { type: 'formFileUpload', label: '+ File Upload', icon: 'upload-cloud', color: '#3B82F6' },
                          { type: 'formRadio', label: '+ Radio Buttons', icon: 'target', color: '#8B5CF6' },
                          { type: 'formCheckbox', label: '+ Checkbox', icon: 'check-square', color: '#F59E0B' },
                          { type: 'formToggle', label: '+ Toggle Switch', icon: 'toggle-right', color: '#F59E0B' },
                          { type: 'formDropdown', label: '+ Dropdown', icon: 'chevron-down', color: '#6366F1' },
                          { type: 'formRating', label: '+ Star Rating', icon: 'star', color: '#6366F1' },
                          { type: 'formSubmit', label: '+ Submit Button', icon: 'play-circle', color: '#2563EB' },

                        ].map(el => {
                          if (isWeb) {
                            return (
                              <div
                                key={el.type}
                                onClick={(e) => {
                                  e.preventDefault();
                                  addNewField(el.type);
                                }}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.effectAllowed = 'copy';
                                  e.dataTransfer.setData('newFieldType', el.type);
                                }}
                                style={{
                                  display: 'flex', flexDirection: 'row', alignItems: 'center',
                                  backgroundColor: '#FFFFFF', padding: '7px 10px',
                                  borderRadius: 6, border: '1px solid #CBD5E1',
                                  cursor: 'grab', userSelect: 'none', marginBottom: 4
                                }}
                              >
                                <Feather name={el.icon} size={14} color={el.color} style={{ marginRight: 8 }} />
                                <RNText style={{ fontSize: 12, fontWeight: '600', color: '#1E293B' }}>{el.label}</RNText>
                              </div>
                            );
                          }
                          return (
                            <Pressable
                              key={el.type}
                              onPress={() => addNewField(el.type)}
                              style={{
                                flexDirection: 'row', alignItems: 'center',
                                backgroundColor: '#FFFFFF', paddingVertical: 7, paddingHorizontal: 10,
                                borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1', marginBottom: 4
                              }}
                            >
                              <Feather name={el.icon} size={14} color={el.color} style={{ marginRight: 8 }} />
                              <Text style={{ fontSize: 12, fontWeight: '600', color: '#1E293B' }}>{el.label}</Text>
                            </Pressable>
                          );
                        })}

                        <Pressable
                          onPress={() => setPageCount(p => Math.min(p + 1, 3))}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#FFFFFF',
                            paddingVertical: 7,
                            paddingHorizontal: 10,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: '#CBD5E1',
                            marginTop: 4
                          }}
                        >
                          <Feather name="file-plus" size={14} color="#8B5CF6" style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#1E293B' }}>+ Add Page ({pageCount})</Text>
                        </Pressable>
                      </View>
                    </View>

                    {/* CANVAS STRUCTURE PANEL */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <Text weight="700" style={styles.sidebarTitle}>CANVAS SECTIONS ({sectionList.length})</Text>
                    </View>

                    {sectionList.map((item, idx) => {
                      const isWeb = Platform.OS === 'web';
                      const sideDragProps = isWeb ? {
                        draggable: activeSection !== item.id,
                        onDragStart: (e) => {
                          e.dataTransfer.setData("text/plain", String(idx));
                        },
                        onDragOver: (e) => {
                          e.preventDefault();
                        },
                        onDrop: (e) => {
                          e.preventDefault();
                          const srcIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
                          if (!isNaN(srcIdx) && srcIdx !== idx) {
                            setSectionList(prev => {
                              const updated = [...prev];
                              const [moved] = updated.splice(srcIdx, 1);
                              updated.splice(idx, 0, moved);
                              return updated;
                            });
                          }
                        }
                      } : {};

                      return (
                        <Pressable
                          key={item.id || idx}
                          onPress={() => setActiveSection(item.id)}
                          {...sideDragProps}
                          style={[
                            styles.sideItem,
                            activeSection === item.id && styles.sideItemActive,
                            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: activeSection === item.id ? '#BFDBFE' : '#F1F5F9', marginBottom: 4 }
                          ]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <Feather name={item.type === 'table' ? 'grid' : 'align-left'} size={13} color={activeSection === item.id ? '#0078d4' : '#64748B'} style={{ marginRight: 6 }} />
                            <Text numberOfLines={1} style={[styles.sideItemText, activeSection === item.id && { color: '#0078d4', fontWeight: '700' }, { fontSize: 12, flex: 1 }]}>{item.label || item.type.toUpperCase()}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                            <Pressable onPress={(e) => { e.stopPropagation(); moveSectionUp(idx); }} disabled={idx === 0} hitSlop={4} style={{ opacity: idx === 0 ? 0.3 : 1 }}>
                              <Feather name="arrow-up" size={12} color="#64748B" />
                            </Pressable>
                            <Pressable onPress={(e) => { e.stopPropagation(); moveSectionDown(idx); }} disabled={idx === sectionList.length - 1} hitSlop={4} style={{ opacity: idx === sectionList.length - 1 ? 0.3 : 1 }}>
                              <Feather name="arrow-down" size={12} color="#64748B" />
                            </Pressable>
                            <Pressable onPress={(e) => { e.stopPropagation(); duplicateSectionItem(idx); }} hitSlop={4}>
                              <Feather name="copy" size={12} color="#94A3B8" />
                            </Pressable>
                            <Pressable onPress={(e) => { e.stopPropagation(); removeSectionItem(idx); }} hitSlop={4}>
                              <Feather name="trash-2" size={12} color="#EF4444" />
                            </Pressable>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <ScrollView
                style={{ flex: 1, height: '100%', backgroundColor: '#F1F5F9' }}
                showsVerticalScrollIndicator={true}
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={[styles.canvasContainer, isMobile && { paddingHorizontal: 4, paddingVertical: 12 }]}
              >
                {[...Array(pageCount)].map((_, i) => (
                  <View key={i} style={[
                    styles.pageShadow,
                    pageBorder && { borderWidth: 2, borderColor: '#323130' },
                    {
                      marginBottom: 25 + Math.max(0, 800 * (zoomLevel - 1)),
                      marginHorizontal: Math.max(0, (PAGE_WIDTH * (zoomLevel - 1)) / 2)
                    },
                    isMobile && { transform: [{ scale: pageScale }], marginBottom: -PAGE_WIDTH * (1 - pageScale) * 0.3 }
                  ]}>
                    <A4PageWrapper
                      style={Object.assign({}, StyleSheet.flatten(styles.a4Page), { fontFamily: fontFamily, transform: [{ scale: zoomLevel }], transformOrigin: 'top center' }, isMobile ? { padding: 30 } : {})}
                      {...(isWeb ? {
                        onDragOver: (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const isNew = Array.from(e.dataTransfer.types).some(t => t.toLowerCase() === 'newfieldtype');
                          e.dataTransfer.dropEffect = isNew ? 'copy' : 'move';
                          // rAF throttle â€” prevents 60-120 querySelectorAll+getBoundingClientRect calls/sec on slow PCs
                          if (dragOverRafRef.current) return;
                          const clientY = e.clientY;
                          const container = e.currentTarget;
                          dragOverRafRef.current = requestAnimationFrame(() => {
                            dragOverRafRef.current = null;
                            const children = Array.from(container.querySelectorAll('[id^="sec_card_"]'));
                            let insertIndex = children.length;
                            for (let i = 0; i < children.length; i++) {
                              const rect = children[i].getBoundingClientRect();
                              const midY = rect.top + rect.height / 2;
                              if (clientY >= rect.top && clientY <= rect.bottom) {
                                insertIndex = clientY < midY ? i : i + 1;
                                break;
                              } else if (clientY < rect.top) {
                                insertIndex = i;
                                break;
                              }
                            }
                            setDropIndicatorIndex(insertIndex);
                          });
                        },
                        onDragLeave: (e) => {
                          if (dragOverRafRef.current) {
                            cancelAnimationFrame(dragOverRafRef.current);
                            dragOverRafRef.current = null;
                          }
                          setDropIndicatorIndex(null);
                        },
                        onDrop: (e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          let insertIndex = dropIndicatorIndex !== null ? dropIndicatorIndex : sectionList.length;
                          setDropIndicatorIndex(null);

                          const newFieldType = e.dataTransfer.getData('newFieldType');
                          if (newFieldType) {
                            const newSec = createSectionItem(newFieldType);
                            setSectionList(prev => {
                              const updated = [...prev];
                              updated.splice(insertIndex, 0, newSec);
                              return balanceSectionWidths(updated, insertIndex, 'row');
                            });
                            setActiveSection(newSec.id);
                          } else {
                            const srcIdxStr = e.dataTransfer.getData('text/plain');
                            const srcIdx = parseInt(srcIdxStr, 10);
                            if (!isNaN(srcIdx)) {
                              setSectionList(prev => {
                                const updated = [...prev];
                                const [moved] = updated.splice(srcIdx, 1);
                                if (insertIndex > srcIdx) insertIndex -= 1;
                                updated.splice(insertIndex, 0, moved);
                                return balanceSectionWidths(updated, insertIndex, 'row');
                              });
                            }
                          }
                        }
                      } : {})}
                    >
                      {showWatermark && (
                        <View pointerEvents="none" style={[styles.watermarkContainer, { justifyContent: watermarkAlignment.includes('top') ? 'flex-start' : watermarkAlignment.includes('bottom') ? 'flex-end' : 'center', alignItems: watermarkAlignment.includes('left') ? 'flex-start' : watermarkAlignment.includes('right') ? 'flex-end' : 'center', padding: 40 }]}>
                          {watermarkType === 'text' && watermarkText ? (
                            <View style={{ transform: [{ rotate: '-45deg' }], opacity: watermarkOpacity, width: '100%', alignItems: 'center' }}>
                              <RNText style={{ fontSize: 70, fontWeight: 'bold', color: '#000', textAlign: 'center' }}>{watermarkText}</RNText>
                            </View>
                          ) : logo ? (
                            <Image source={{ uri: logo }} style={[styles.watermarkImage, { opacity: watermarkOpacity }]} />
                          ) : null}
                        </View>
                      )}
                      {i === 0 && logo && (
                        <GestureDetector gesture={panGesture}>
                          <Animated.View style={[styles.floatingLogo, animatedLogoStyle, { width: logoSize, height: logoSize }]}>
                            <Image source={{ uri: logo }} style={styles.fullImg} />
                            <View style={styles.dragHandle}><MaterialIcons name="open-with" size={10} color="white" /></View>
                          </Animated.View>
                        </GestureDetector>
                      )}
                      <View style={{ marginTop: 60, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                        {sectionList.map((item, idx) => {
                          const secId = item.id || item.type;
                          const isSelected = activeSection === secId || activeSection === item.type;
                          const CardWrapper = isWeb ? 'div' : View;
                          const HeaderBarWrapper = isWeb ? 'div' : View;

                          const wrapperProps = isWeb ? {
                            onClick: (e) => {
                              if (e && e.ctrlKey) {
                                e.preventDefault();
                                setSelectedSections(prev => {
                                  const next = new Set(prev);
                                  if (next.has(secId)) { next.delete(secId); }
                                  else { next.add(secId); if (activeSection) next.add(activeSection); }
                                  return next;
                                });
                              } else {
                                setSelectedSections(new Set());
                                setActiveSection(secId);
                              }
                            },
                            // Always draggable â€” dragging and clicking are separate gestures
                            draggable: true,
                            onDragStart: (e) => {
                              e.stopPropagation();
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', String(idx));
                            },
                            onDragOver: (e) => {
                              e.preventDefault();
                              const currentTarget = e.currentTarget;
                              const clientX = e.clientX;
                              const rect = currentTarget.getBoundingClientRect();

                              // Trigger side-by-side drop if mouse is within 25% of the left or right edges
                              const edgeThreshold = Math.min(rect.width * 0.25, 100);
                              const isLeftEdge = clientX < rect.left + edgeThreshold;
                              const isRightEdge = clientX > rect.right - edgeThreshold;

                              if (isLeftEdge || isRightEdge) {
                                e.stopPropagation(); // Stop bubbling to A4PageWrapper (prevent horizontal line)
                                setDropIndicatorIndex(null); // Clear horizontal indicator
                                const isNew = Array.from(e.dataTransfer.types).some(t => t.toLowerCase() === 'newfieldtype');
                                e.dataTransfer.dropEffect = isNew ? 'copy' : 'move';
                                if (itemDragRafRef.current) return;
                                itemDragRafRef.current = requestAnimationFrame(() => {
                                  itemDragRafRef.current = null;
                                  if (isRightEdge) {
                                    currentTarget.style.borderTop = '';
                                    currentTarget.style.borderLeft = '';
                                    currentTarget.style.borderRight = '3px solid #0078d4';
                                  } else {
                                    currentTarget.style.borderTop = '';
                                    currentTarget.style.borderRight = '';
                                    currentTarget.style.borderLeft = '3px solid #0078d4';
                                  }
                                });
                              } else {
                                // Mouse is in the middle (top/bottom zones) -> Let it bubble to A4PageWrapper!
                                currentTarget.style.borderTop = '';
                                currentTarget.style.borderLeft = '';
                                currentTarget.style.borderRight = '';
                              }
                            },
                            onDragLeave: (e) => {
                              if (itemDragRafRef.current) {
                                cancelAnimationFrame(itemDragRafRef.current);
                                itemDragRafRef.current = null;
                              }
                              e.currentTarget.style.borderTop = '';
                              e.currentTarget.style.borderLeft = '';
                              e.currentTarget.style.borderRight = '';
                            },
                            onDrop: (e) => {
                              e.preventDefault();
                              const rect = e.currentTarget.getBoundingClientRect();
                              const edgeThreshold = Math.min(rect.width * 0.25, 100);
                              const isLeftEdge = e.clientX < rect.left + edgeThreshold;
                              const isRightEdge = e.clientX > rect.right - edgeThreshold;

                              if (isLeftEdge || isRightEdge) {
                                e.stopPropagation(); // Stop A4PageWrapper from handling it
                                if (itemDragRafRef.current) {
                                  cancelAnimationFrame(itemDragRafRef.current);
                                  itemDragRafRef.current = null;
                                }
                                const side = isRightEdge ? 'right' : 'left';
                                e.currentTarget.style.borderTop = '';
                                e.currentTarget.style.borderLeft = '';
                                e.currentTarget.style.borderRight = '';

                                const targetIdx = isRightEdge ? idx + 1 : idx;
                                const newFieldType = e.dataTransfer.getData('newFieldType');
                                if (newFieldType) {
                                  // Dropped from sidebar
                                  const newSec = createSectionItem(newFieldType);
                                  setSectionList(prev => {
                                    const updated = [...prev];
                                    updated.splice(targetIdx, 0, newSec);
                                    return balanceSectionWidths(updated, targetIdx, side);
                                  });
                                  setActiveSection(newSec.id);
                                } else {
                                  // Reordering existing cards
                                  const srcIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                                  if (!isNaN(srcIdx)) {
                                    setSectionList(prev => {
                                      const updated = [...prev];
                                      const [moved] = updated.splice(srcIdx, 1);
                                      let finalInsertIdx = targetIdx;
                                      if (srcIdx < targetIdx) finalInsertIdx -= 1;
                                      updated.splice(finalInsertIdx, 0, moved);
                                      return balanceSectionWidths(updated, finalInsertIdx, side);
                                    });
                                  }
                                }
                              } else {
                                // Dropped in the middle zone -> bubble to A4PageWrapper to insert Above/Below!
                                e.currentTarget.style.borderTop = '';
                                e.currentTarget.style.borderLeft = '';
                                e.currentTarget.style.borderRight = '';
                              }
                            },
                            style: {
                              margin: item.margin ? formatCssDimension(item.margin) : '4px 0',
                              padding: item.padding ? formatCssDimension(item.padding) : (item.width && item.width !== '100%' ? '0 4px' : '0'),
                              borderRadius: '6px',
                              width: item.width ? formatCssDimension(item.width, '%') : '100%',
                              boxSizing: 'border-box',
                              position: 'relative',
                              cursor: activeSection !== secId ? 'move' : 'default',
                              outline: selectedSections.has(secId) ? '2px solid #7C3AED' : 'none',
                              outlineOffset: selectedSections.has(secId) ? '2px' : '0px'
                            }
                          } : {
                            onTouchStart: () => setActiveSection(secId),
                            style: {
                              marginVertical: item.margin ? (parseFloat(item.margin) || 4) : 4,
                              paddingHorizontal: item.padding ? (parseFloat(item.padding) || 0) : (item.width && item.width !== '100%' ? 4 : 0),
                              borderRadius: 4,
                              width: item.width || '100%',
                              position: 'relative'
                            }
                          };

                          const headerDragProps = isWeb ? {
                            style: {
                              display: 'flex',
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              backgroundColor: '#EFF6FF',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid #BFDBFE',
                              position: 'absolute',
                              top: -34,
                              left: 0,
                              minWidth: item.width && parseFloat(item.width) <= 50 ? 180 : 240,
                              maxWidth: '100%',
                              zIndex: 10,
                              height: 30
                            }
                          } : {
                            style: {
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              backgroundColor: '#EFF6FF',
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: '#BFDBFE',
                              position: 'absolute',
                              top: -36,
                              left: item.width && item.width !== '100%' ? 4 : 0,
                              minWidth: 260,
                              zIndex: 10,
                              height: 32
                            }
                          };

                          if (item.type === 'table') {
                            if (!item.enabled && !isSelected) return null;
                            const s = item;
                            return (

                              <React.Fragment key={secId}>
                                {dropIndicatorIndex === idx && (
                                  <View style={{ width: '100%', height: 4, backgroundColor: '#0078d4', marginVertical: 4, borderRadius: 2 }} />
                                )}

                                <CardWrapper key={secId} id={`sec_card_${idx}`} {...wrapperProps}>

                                  {isSelected && (
                                    <View
                                      style={{
                                        position: 'absolute', right: -6, bottom: -6, width: 12, height: 12, backgroundColor: '#0078d4', borderRadius: 6, cursor: 'se-resize', zIndex: 100
                                      }}
                                      draggable
                                      onDragStart={(e) => {
                                        e.stopPropagation();
                                        e.dataTransfer.setDragImage(new Image(), 0, 0); // Hide default drag image
                                      }}
                                      onDrag={(e) => {
                                        e.stopPropagation();
                                        if (e.clientX && e.clientY) {
                                          // rAF throttle â€” prevents excessive getBoundingClientRect calls during resize drag
                                          if (resizeRafRef.current) return;
                                          const parentEl = e.currentTarget.parentElement;
                                          const clientX = e.clientX;
                                          resizeRafRef.current = requestAnimationFrame(() => {
                                            resizeRafRef.current = null;
                                            const rect = parentEl.getBoundingClientRect();
                                            parentEl.style.width = Math.max(50, (clientX - rect.left) / zoomLevel) + 'px';
                                          });
                                        }
                                      }}
                                      onDragEnd={(e) => {
                                        e.stopPropagation();
                                        if (resizeRafRef.current) { cancelAnimationFrame(resizeRafRef.current); resizeRafRef.current = null; }
                                        const finalWidth = e.currentTarget.parentElement.style.width;
                                        updateActiveSectionProp('width', finalWidth);
                                      }}
                                    />
                                  )}

                                  <View style={[{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, overflow: 'hidden', backgroundColor: 'white' }, isSelected ? styles.activeInput : styles.inactiveInput]}>
                                    {isSelected && (
                                      <HeaderBarWrapper {...headerDragProps}>
                                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                          <Pressable
                                            onPress={(e) => { if (e && e.stopPropagation) e.stopPropagation(); moveSectionUp(idx); }}
                                            disabled={idx === 0}
                                            style={{ padding: 4, opacity: idx === 0 ? 0.3 : 1 }}
                                          >
                                            <Feather name="arrow-up" size={14} color="#1E293B" />
                                          </Pressable>
                                          <Pressable
                                            onPress={(e) => { if (e && e.stopPropagation) e.stopPropagation(); moveSectionDown(idx); }}
                                            disabled={idx === sectionList.length - 1}
                                            style={{ padding: 4, opacity: idx === sectionList.length - 1 ? 0.3 : 1 }}
                                          >
                                            <Feather name="arrow-down" size={14} color="#1E293B" />
                                          </Pressable>
                                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF' }}>{item.label || 'TABLE'}</Text>
                                          <View style={{ width: 1, height: 14, backgroundColor: '#BFDBFE', marginHorizontal: 2 }} />
                                          <Pressable onPress={(e) => { e.stopPropagation(); addTableColumn(idx); }} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#CBD5E1' }}>
                                            <Feather name="plus" size={10} color="#0078d4" style={{ marginRight: 2 }} />
                                            <Text style={{ fontSize: 10, fontWeight: '600', color: '#0078d4' }}>Col</Text>
                                          </Pressable>
                                          <Pressable onPress={(e) => { e.stopPropagation(); removeTableColumn(idx); }} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#CBD5E1' }}>
                                            <Feather name="minus" size={10} color="#EF4444" style={{ marginRight: 2 }} />
                                            <Text style={{ fontSize: 10, fontWeight: '600', color: '#EF4444' }}>Col</Text>
                                          </Pressable>
                                          <Pressable onPress={(e) => { e.stopPropagation(); addTableRow(idx); }} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#CBD5E1' }}>
                                            <Feather name="plus" size={10} color="#0078d4" style={{ marginRight: 2 }} />
                                            <Text style={{ fontSize: 10, fontWeight: '600', color: '#0078d4' }}>Row</Text>
                                          </Pressable>
                                          <Pressable onPress={(e) => { e.stopPropagation(); removeTableRow(idx); }} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#CBD5E1' }}>
                                            <Feather name="minus" size={10} color="#EF4444" style={{ marginRight: 2 }} />
                                            <Text style={{ fontSize: 10, fontWeight: '600', color: '#EF4444' }}>Row</Text>
                                          </Pressable>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                          <Pressable
                                            onPress={(e) => {
                                              if (e && e.stopPropagation) e.stopPropagation();
                                              setSectionList(prev => prev.map((sec, i) =>
                                                i === idx ? { ...sec, enabled: !sec.enabled } : sec
                                              ));
                                            }}
                                            style={{ padding: 3 }}
                                          >
                                            <Text style={{ fontSize: 11, fontWeight: '600', color: item.enabled ? '#EF4444' : '#3B82F6' }}>{item.enabled ? 'Disable' : 'Enable'}</Text>
                                          </Pressable>
                                          <Pressable
                                            onPress={(e) => { if (e && e.stopPropagation) e.stopPropagation(); duplicateSectionItem(idx); }}
                                            style={{ padding: 3 }}
                                          >
                                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#0078d4' }}>Duplicate</Text>
                                          </Pressable>
                                          <Pressable
                                            onPress={(e) => { if (e && e.stopPropagation) e.stopPropagation(); removeSectionItem(idx); }}
                                            style={{ padding: 3 }}
                                          >
                                            <Feather name="trash-2" size={13} color="#EF4444" />
                                          </Pressable>
                                        </View>
                                      </HeaderBarWrapper>
                                    )}
                                    {s.enabled && (
                                      <View style={{ padding: 10 }} onTouchStart={() => setActiveSection(secId)}>
                                        <View style={{ flexDirection: 'row', borderBottomWidth: 2, borderColor: '#CBD5E1', paddingBottom: 4, marginBottom: 4 }}>
                                          {(s.headers || []).map((h, i) => (
                                            <TableHeaderInput key={`h-${i}`} initialValue={h} idx={idx} headerIdx={i} setSectionList={setSectionList} />
                                          ))}
                                        </View>
                                        {(s.rows || []).map((row, rIdx) => (
                                          <View key={`r-${rIdx}`} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#E2E8F0', paddingVertical: 4 }}>
                                            {row.map((cell, cIdx) => (
                                              <TableCellInput key={`c-${rIdx}-${cIdx}`} initialValue={cell} idx={idx} rIdx={rIdx} cIdx={cIdx} setSectionList={setSectionList} />
                                            ))}
                                          </View>
                                        ))}
                                      </View>
                                    )}
                                  </View>
                                </CardWrapper>
                              </React.Fragment>
                            );
                          }

                          if (item.type === 'spacer') {
                            return (

                              <React.Fragment key={secId}>
                                {dropIndicatorIndex === idx && (
                                  <View style={{ width: '100%', height: 4, backgroundColor: '#0078d4', marginVertical: 4, borderRadius: 2 }} />
                                )}

                                <CardWrapper key={secId} id={`sec_card_${idx}`} {...wrapperProps}>

                                  {isSelected && (
                                    <View
                                      style={{
                                        position: 'absolute', right: -6, bottom: -6, width: 12, height: 12, backgroundColor: '#0078d4', borderRadius: 6, cursor: 'se-resize', zIndex: 100
                                      }}
                                      draggable
                                      onDragStart={(e) => {
                                        e.stopPropagation();
                                        e.dataTransfer.setDragImage(new Image(), 0, 0); // Hide default drag image
                                      }}
                                      onDrag={(e) => {
                                        e.stopPropagation();
                                        if (e.clientX && e.clientY) {
                                          // rAF throttle â€” prevents excessive getBoundingClientRect calls during resize drag
                                          if (resizeRafRef.current) return;
                                          const parentEl = e.currentTarget.parentElement;
                                          const clientX = e.clientX;
                                          resizeRafRef.current = requestAnimationFrame(() => {
                                            resizeRafRef.current = null;
                                            const rect = parentEl.getBoundingClientRect();
                                            parentEl.style.width = Math.max(50, (clientX - rect.left) / zoomLevel) + 'px';
                                          });
                                        }
                                      }}
                                      onDragEnd={(e) => {
                                        e.stopPropagation();
                                        if (resizeRafRef.current) { cancelAnimationFrame(resizeRafRef.current); resizeRafRef.current = null; }
                                        const finalWidth = e.currentTarget.parentElement.style.width;
                                        updateActiveSectionProp('width', finalWidth);
                                      }}
                                    />
                                  )}

                                  {isSelected && (
                                    <HeaderBarWrapper {...headerDragProps}>
                                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                        <Pressable onPress={(e) => { if (e && e.stopPropagation) e.stopPropagation(); moveSectionUp(idx); }} disabled={idx === 0} style={{ opacity: idx === 0 ? 0.3 : 1, padding: 2 }}>
                                          <Feather name="arrow-up" size={13} color="#1E293B" />
                                        </Pressable>
                                        <Pressable onPress={(e) => { if (e && e.stopPropagation) e.stopPropagation(); moveSectionDown(idx); }} disabled={idx === sectionList.length - 1} style={{ opacity: idx === sectionList.length - 1 ? 0.3 : 1, padding: 2 }}>
                                          <Feather name="arrow-down" size={13} color="#1E293B" />
                                        </Pressable>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF', letterSpacing: 0.5 }}>EMPTY SPACER</Text>
                                      </View>
                                      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                                        <Pressable onPress={(e) => { if (e && e.stopPropagation) e.stopPropagation(); duplicateSectionItem(idx); }} style={{ padding: 2 }}>
                                          <Feather name="copy" size={13} color="#0078d4" />
                                        </Pressable>
                                        <Pressable onPress={(e) => { if (e && e.stopPropagation) e.stopPropagation(); removeSectionItem(idx); }} style={{ padding: 2 }}>
                                          <Feather name="trash-2" size={13} color="#EF4444" />
                                        </Pressable>
                                      </View>
                                    </HeaderBarWrapper>
                                  )}
                                  <Pressable onPress={() => setActiveSection(secId)} style={{ height: item.minHeight || 25, width: '100%', borderWidth: isSelected ? 1 : 0, borderColor: '#BFDBFE', borderStyle: 'dashed', backgroundColor: isSelected ? '#F8FAFC' : 'transparent', justifyContent: 'center', alignItems: 'center', borderRadius: 4 }}>
                                    {isSelected && <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: 'bold' }}>SPACER (INVISIBLE ON PDF)</Text>}
                                  </Pressable>
                                </CardWrapper>
                              </React.Fragment>
                            );
                          }

                          // All sections are kept visible in the editor so that any field can be selected and edited.
                          const hasContent = item.content ? item.content.trim().length > 0 : false;

                          return (

                            <React.Fragment key={secId}>
                              {dropIndicatorIndex === idx && (
                                <View style={{ width: '100%', height: 4, backgroundColor: '#0078d4', marginVertical: 4, borderRadius: 2 }} />
                              )}

                              <CardWrapper key={secId} id={`sec_card_${idx}`} {...wrapperProps}>

                                {isSelected && (
                                  <View
                                    style={{
                                      position: 'absolute', right: -6, bottom: -6, width: 12, height: 12, backgroundColor: '#0078d4', borderRadius: 6, cursor: 'se-resize', zIndex: 100
                                    }}
                                    draggable
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      e.dataTransfer.setDragImage(new Image(), 0, 0); // Hide default drag image
                                    }}
                                    onDrag={(e) => {
                                      e.stopPropagation();
                                      if (e.clientX && e.clientY) {
                                        // rAF throttle â€” prevents excessive getBoundingClientRect calls during resize drag
                                        if (resizeRafRef.current) return;
                                        const parentEl = e.currentTarget.parentElement;
                                        const clientX = e.clientX;
                                        resizeRafRef.current = requestAnimationFrame(() => {
                                          resizeRafRef.current = null;
                                          const rect = parentEl.getBoundingClientRect();
                                          parentEl.style.width = Math.max(50, (clientX - rect.left) / zoomLevel) + 'px';
                                        });
                                      }
                                    }}
                                    onDragEnd={(e) => {
                                      e.stopPropagation();
                                      if (resizeRafRef.current) { cancelAnimationFrame(resizeRafRef.current); resizeRafRef.current = null; }
                                      const finalWidth = e.currentTarget.parentElement.style.width;
                                      updateActiveSectionProp('width', finalWidth);
                                    }}
                                  />
                                )}

                                {isSelected && (
                                  <HeaderBarWrapper {...headerDragProps}>
                                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                      <Pressable
                                        onPress={(e) => { if (e && e.stopPropagation) e.stopPropagation(); moveSectionUp(idx); }}
                                        disabled={idx === 0}
                                        style={{ opacity: idx === 0 ? 0.3 : 1, padding: 2 }}
                                      >
                                        <Feather name="arrow-up" size={13} color="#1E293B" />
                                      </Pressable>
                                      <Pressable
                                        onPress={(e) => { if (e && e.stopPropagation) e.stopPropagation(); moveSectionDown(idx); }}
                                        disabled={idx === sectionList.length - 1}
                                        style={{ opacity: idx === sectionList.length - 1 ? 0.3 : 1, padding: 2 }}
                                      >
                                        <Feather name="arrow-down" size={13} color="#1E293B" />
                                      </Pressable>
                                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF', letterSpacing: 0.5 }}>{item.label || item.type.toUpperCase()}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                                      <Pressable
                                        onPress={(e) => { if (e && e.stopPropagation) e.stopPropagation(); duplicateSectionItem(idx); }}
                                        style={{ padding: 2 }}
                                      >
                                        <Feather name="copy" size={13} color="#0078d4" />
                                      </Pressable>
                                      <Pressable
                                        onPress={(e) => { if (e && e.stopPropagation) e.stopPropagation(); removeSectionItem(idx); }}
                                        style={{ padding: 2 }}
                                      >
                                        <Feather name="trash-2" size={13} color="#EF4444" />
                                      </Pressable>
                                    </View>
                                  </HeaderBarWrapper>
                                )}
                                {item.type === 'formSubmit' ? (
                                  <View pointerEvents="none" style={{ marginVertical: 8, width: '100%', alignItems: item.align || 'center' }}>
                                    <View style={{ backgroundColor: '#2563EB', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 6 }}>
                                      <RNText style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>{item.content || 'Submit Form'}</RNText>
                                    </View>
                                  </View>
                                ) : item.type === 'formInput' ? (
                                  <View pointerEvents="none" style={{ marginVertical: 8, width: '100%' }}>
                                    {item.label !== false && <RNText style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>{item.fieldLabel || 'Text Input'} {item.required && <RNText style={{ color: 'red' }}>*</RNText>}</RNText>}
                                    <TextInput
                                      style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, padding: 10, fontSize: 14, color: '#334155' }}
                                      placeholder={item.placeholder || 'Enter text here...'}
                                      editable={false}
                                    />
                                  </View>
                                ) : item.type === 'formTextArea' ? (
                                  <View pointerEvents="none" style={{ marginVertical: 8, width: '100%' }}>
                                    {item.label !== false && <RNText style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>{item.fieldLabel || 'Text Area'} {item.required && <RNText style={{ color: 'red' }}>*</RNText>}</RNText>}
                                    <TextInput
                                      style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, padding: 10, fontSize: 14, color: '#334155', height: 80, textAlignVertical: 'top' }}
                                      placeholder={item.placeholder || 'Enter details here...'}
                                      editable={false}
                                      multiline={true}
                                    />
                                  </View>
                                ) : item.type === 'formFileUpload' ? (
                                  <View pointerEvents="none" style={{ marginVertical: 8, width: '100%' }}>
                                    {item.label !== false && <RNText style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>{item.fieldLabel || 'File Upload'} {item.required && <RNText style={{ color: 'red' }}>*</RNText>}</RNText>}
                                    <View style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1', borderRadius: 6, padding: 20 }}>
                                      <Feather name="upload-cloud" size={24} color="#94A3B8" style={{ marginBottom: 8 }} />
                                      <RNText style={{ color: '#94A3B8', fontSize: 13 }}>{item.placeholder || 'Click to upload a file'}</RNText>
                                    </View>
                                  </View>
                                ) : item.type === 'formToggle' ? (
                                  <View pointerEvents="none" style={{ marginVertical: 8, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    {item.label !== false && <RNText style={{ fontSize: 13, fontWeight: '600', color: '#334155' }}>{item.fieldLabel || 'Toggle Switch'} {item.required && <RNText style={{ color: 'red' }}>*</RNText>}</RNText>}
                                    <View style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: '#E2E8F0', padding: 2, justifyContent: 'center' }}>
                                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 2 }} />
                                    </View>
                                  </View>
                                ) : item.type === 'formRating' ? (
                                  <View pointerEvents="none" style={{ marginVertical: 8, width: '100%' }}>
                                    {item.label !== false && <RNText style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>{item.fieldLabel || 'Rating'} {item.required && <RNText style={{ color: 'red' }}>*</RNText>}</RNText>}
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Feather key={star} name="star" size={24} color="#CBD5E1" />
                                      ))}
                                    </View>
                                  </View>
                                ) : item.type === 'formDatePicker' ? (
                                  <View pointerEvents="none" style={{ marginVertical: 8, width: '100%' }}>
                                    {item.label !== false && <RNText style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>{item.fieldLabel || 'Date Picker'} {item.required && <RNText style={{ color: 'red' }}>*</RNText>}</RNText>}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, padding: 10 }}>
                                      <Feather name="calendar" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                                      <RNText style={{ color: '#94A3B8', fontSize: 14 }}>{item.placeholder || 'Select a date'}</RNText>
                                    </View>
                                  </View>
                                ) : item.type === 'formRadio' ? (
                                  <View pointerEvents="none" style={{ marginVertical: 8, width: '100%' }}>
                                    {item.label !== false && <RNText style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8 }}>{item.fieldLabel || 'Select an option'} {item.required && <RNText style={{ color: 'red' }}>*</RNText>}</RNText>}
                                    <View style={{ gap: 8 }}>
                                      {(item.options && item.options.length > 0 ? item.options : ['Option 1', 'Option 2']).map((opt, i) => (
                                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                          <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#CBD5E1', marginRight: 8 }} />
                                          <RNText style={{ fontSize: 14, color: '#475569' }}>{opt}</RNText>
                                        </View>
                                      ))}
                                    </View>
                                  </View>
                                ) : item.type === 'formCheckbox' ? (
                                  <View pointerEvents="none" style={{ marginVertical: 8, width: '100%' }}>
                                    {item.label !== false && <RNText style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8 }}>{item.fieldLabel || 'Select options'} {item.required && <RNText style={{ color: 'red' }}>*</RNText>}</RNText>}
                                    <View style={{ gap: 8 }}>
                                      {(item.options && item.options.length > 0 ? item.options : ['Option 1', 'Option 2']).map((opt, i) => (
                                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                          <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: '#CBD5E1', marginRight: 8 }} />
                                          <RNText style={{ fontSize: 14, color: '#475569' }}>{opt}</RNText>
                                        </View>
                                      ))}
                                    </View>
                                  </View>
                                ) : item.type === 'formDropdown' ? (
                                  <View pointerEvents="none" style={{ marginVertical: 8, width: '100%' }}>
                                    {item.label !== false && <RNText style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>{item.fieldLabel || 'Dropdown'} {item.required && <RNText style={{ color: 'red' }}>*</RNText>}</RNText>}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, padding: 10 }}>
                                      <RNText style={{ color: '#94A3B8', fontSize: 14 }}>{item.placeholder || 'Select from list'}</RNText>
                                      <Feather name="chevron-down" size={16} color="#94A3B8" />
                                    </View>
                                  </View>
                                ) : (
                                  <SectionTextInput
                                    item={item}
                                    idx={idx}
                                    setSectionList={setSectionList}
                                    fontFamily={fontFamily}
                                    isSelected={isSelected}
                                    setActiveSection={setActiveSection}
                                    secId={secId}
                                  />
                                )}
                                {item.type === 'headerInfo' && hasContent && (
                                  <View style={styles.headerLine} />
                                )}
                              </CardWrapper>
                            </React.Fragment>
                          );
                        })}

                        {dropIndicatorIndex === sectionList.length && (
                          <View style={{ width: '100%', height: 4, backgroundColor: '#0078d4', marginVertical: 4, borderRadius: 2 }} />
                        )}

                      </View>
                    </A4PageWrapper>
                  </View>
                ))
                }
              </ScrollView>

              {/* RIGHT PROPERTIES SIDEBAR â€” uses memoized activeItem (no repeated find() call) */}
              {!isMobile && activeSection && (
                <View style={[styles.sidebar, { width: 280, backgroundColor: '#FFFFFF', padding: 14, borderLeftWidth: 1, borderColor: '#E2E8F0' }]}>
                  <Text style={{ fontWeight: '700', fontSize: 12, color: '#0F172A', marginBottom: 12 }}>ELEMENT PROPERTIES</Text>
                  <ScrollView>
                    <View style={{ gap: 12 }}>
                      <View>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569', marginBottom: 4 }}>Width</Text>
                        <TextInput
                          value={activeItem?.width !== undefined && activeItem?.width !== null ? String(activeItem.width) : '100%'}
                          onChangeText={(t) => updateActiveSectionProp('width', t)}
                          placeholder="e.g. 100%, 50%, 200px"
                          style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 4, padding: 6, fontSize: 12 }}
                        />
                      </View>
                      <View>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569', marginBottom: 4 }}>Padding</Text>
                        <TextInput
                          value={activeItem?.padding !== undefined && activeItem?.padding !== null ? String(activeItem.padding) : ''}
                          onChangeText={(t) => updateActiveSectionProp('padding', t)}
                          placeholder="0px (e.g. 10px, 5px 10px)"
                          style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 4, padding: 6, fontSize: 12 }}
                        />
                      </View>
                      <View>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569', marginBottom: 4 }}>Margin</Text>
                        <TextInput
                          value={activeItem?.margin !== undefined && activeItem?.margin !== null ? String(activeItem.margin) : ''}
                          onChangeText={(t) => updateActiveSectionProp('margin', t)}
                          placeholder="0px (e.g. 10px, 0px 23px)"
                          style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 4, padding: 6, fontSize: 12 }}
                        />
                      </View>
                      <View>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569', marginBottom: 4 }}>Alignment</Text>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <IconButton name="align-left" type="Feather" onPress={() => updateActiveSectionProp('align', 'left')} active={(activeItem?.align || 'left') === 'left'} />
                          <IconButton name="align-center" type="Feather" onPress={() => updateActiveSectionProp('align', 'center')} active={activeItem?.align === 'center'} />
                          <IconButton name="align-right" type="Feather" onPress={() => updateActiveSectionProp('align', 'right')} active={activeItem?.align === 'right'} />
                        </View>
                      </View>
                    </View>

                    {['formInput', 'formTextArea', 'formDatePicker', 'formFileUpload', 'formRadio', 'formCheckbox', 'formToggle', 'formRating', 'formDropdown', 'formSubmit'].includes(activeItem?.type) && (
                      <View style={{ marginTop: 12 }}>
                        <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 6 }} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#0F172A', marginBottom: 8, textTransform: 'uppercase' }}>Form Fields</Text>

                        {activeItem?.type !== 'formSubmit' && (
                          <View style={{ marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569' }}>Label</Text>
                              <Pressable onPress={() => updateActiveSectionProp('label', activeItem?.label === false ? true : false)}>
                                <Text style={{ fontSize: 10, color: '#3B82F6', fontWeight: '600' }}>
                                  {activeItem?.label === false ? 'Show' : 'Hide'}
                                </Text>
                              </Pressable>
                            </View>
                            {activeItem?.label !== false && (
                              <TextInput
                                value={activeItem?.fieldLabel || ''}
                                onChangeText={(t) => updateActiveSectionProp('fieldLabel', t)}
                                placeholder={activeItem?.type.replace('form', '')}
                                style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 4, padding: 6, fontSize: 12 }}
                              />
                            )}
                          </View>
                        )}

                        {['formInput', 'formTextArea', 'formDatePicker', 'formFileUpload', 'formDropdown'].includes(activeItem?.type) && (
                          <View style={{ marginBottom: 12 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569', marginBottom: 4 }}>Placeholder</Text>
                            <TextInput
                              value={activeItem?.placeholder || ''}
                              onChangeText={(t) => updateActiveSectionProp('placeholder', t)}
                              placeholder="Placeholder text"
                              style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 4, padding: 6, fontSize: 12 }}
                            />
                          </View>
                        )}

                        {['formRadio', 'formCheckbox', 'formDropdown'].includes(activeItem?.type) && (
                          <View style={{ marginBottom: 12 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569', marginBottom: 4 }}>Options (Comma Separated)</Text>
                            <TextInput
                              value={(activeItem?.options || []).join(',')}
                              onChangeText={(t) => updateActiveSectionProp('options', t.split(','))}
                              placeholder="Option 1,Option 2,Option 3"
                              style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 4, padding: 6, fontSize: 12 }}
                            />
                          </View>
                        )}

                        {activeItem?.type !== 'formSubmit' && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 12 }}>
                            <Pressable
                              onPress={() => updateActiveSectionProp('required', !activeItem?.required)}
                              style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: activeItem?.required ? '#2563EB' : '#CBD5E1', backgroundColor: activeItem?.required ? '#2563EB' : 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}
                            >
                              {activeItem?.required && <Feather name="check" size={12} color="#FFF" />}
                            </Pressable>
                            <Text style={{ fontSize: 12, color: '#475569', fontWeight: '500' }}>Required Field</Text>
                          </View>
                        )}

                        {activeItem?.type === 'formSubmit' && (
                          <View style={{ marginBottom: 12 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569', marginBottom: 4 }}>Button Text</Text>
                            <TextInput
                              value={activeItem?.content || ''}
                              onChangeText={(t) => updateActiveSectionProp('content', t)}
                              placeholder="Submit Form"
                              style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 4, padding: 6, fontSize: 12 }}
                            />
                          </View>
                        )}
                      </View>
                    )}

                  </ScrollView>
                </View>
              )}

            </View>

            {/* COMPANY DETAILS MODAL */}
            <Modal visible={showCompanyModal} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={[styles.centeredModalContent, { width: '85%', maxWidth: 450 }]}>
                  <View style={styles.modalHeader}>
                    <Text weight="700" style={{ fontSize: 16 }}>Company Details</Text>
                    <Pressable onPress={() => setShowCompanyModal(false)}><Feather name="x" size={22} color="#333" /></Pressable>
                  </View>
                  <ScrollView style={{ maxHeight: 420 }}>
                    <View style={{ gap: 12 }}>
                      <View>
                        <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 4, color: '#475569' }}>Company Name</Text>
                        <TextInput style={styles.modalInput} value={companyInfo.name} onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, name: text }))} placeholder="e.g. Your Company" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 4, color: '#475569' }}>Address / Subtitle</Text>
                        <TextInput multiline style={[styles.modalInput, { minHeight: 60 }]} value={companyInfo.address} onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, address: text }))} placeholder="e.g. Corporate HR Department&#10;Corporate Headquarters" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 4, color: '#475569' }}>Phone Number</Text>
                        <TextInput style={styles.modalInput} value={companyInfo.phone} onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, phone: text }))} placeholder="e.g. +91 98765 43210" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 4, color: '#475569' }}>Email Address</Text>
                        <TextInput style={styles.modalInput} value={companyInfo.email} onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, email: text }))} placeholder="e.g. info@company.com" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 4, color: '#475569' }}>Website</Text>
                        <TextInput style={styles.modalInput} value={companyInfo.website} onChangeText={(text) => setCompanyInfo(prev => ({ ...prev, website: text }))} placeholder="e.g. www.company.com" />
                      </View>
                    </View>
                  </ScrollView>
                  <Pressable style={styles.primaryButton} onPress={() => applyCompanyDetails(companyInfo)}>
                    <Text style={styles.primaryButtonText}>Apply Company Details</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>

            {/* WATERMARK SETTINGS MODAL */}
            <Modal visible={showWatermarkModal} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={[styles.centeredModalContent, { width: '85%', maxWidth: 450 }]}>
                  <View style={styles.modalHeader}>
                    <Text weight="700" style={{ fontSize: 16 }}>Watermark Settings</Text>
                    <Pressable onPress={() => setShowWatermarkModal(false)}><Feather name="x" size={22} color="#333" /></Pressable>
                  </View>
                  <ScrollView style={{ padding: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <Text style={{ fontWeight: '600' }}>Enable Watermark</Text>
                      <Pressable
                        onPress={() => setShowWatermark(!showWatermark)}
                        style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: showWatermark ? '#2563EB' : '#CBD5E1', padding: 2, justifyContent: 'center' }}
                      >
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF', alignSelf: showWatermark ? 'flex-end' : 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 }} />
                      </Pressable>
                    </View>

                    {showWatermark && (
                      <>
                        <Text style={{ fontWeight: '600', marginBottom: 8, marginTop: 10 }}>Watermark Type</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                          <Pressable onPress={() => setWatermarkType('logo')} style={{ flex: 1, padding: 10, borderWidth: 1, borderColor: watermarkType === 'logo' ? '#2563EB' : '#CBD5E1', borderRadius: 6, alignItems: 'center', backgroundColor: watermarkType === 'logo' ? '#EFF6FF' : '#FFF' }}>
                            <Text style={{ color: watermarkType === 'logo' ? '#2563EB' : '#334155', fontWeight: '600' }}>Company Logo</Text>
                          </Pressable>
                          <Pressable onPress={() => setWatermarkType('text')} style={{ flex: 1, padding: 10, borderWidth: 1, borderColor: watermarkType === 'text' ? '#2563EB' : '#CBD5E1', borderRadius: 6, alignItems: 'center', backgroundColor: watermarkType === 'text' ? '#EFF6FF' : '#FFF' }}>
                            <Text style={{ color: watermarkType === 'text' ? '#2563EB' : '#334155', fontWeight: '600' }}>Custom Text</Text>
                          </Pressable>
                        </View>

                        {watermarkType === 'text' && (
                          <View style={{ marginBottom: 20 }}>
                            <Text style={{ fontWeight: '600', marginBottom: 8 }}>Watermark Text</Text>
                            <TextInput
                              style={styles.modalInput}
                              value={watermarkText}
                              onChangeText={setWatermarkText}
                              placeholder="e.g. CONFIDENTIAL"
                            />
                          </View>
                        )}

                        <Text style={{ fontWeight: '600', marginBottom: 8 }}>Alignment</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                          {[
                            { id: 'top-left', label: 'Top Left' },
                            { id: 'top-right', label: 'Top Right' },
                            { id: 'center', label: 'Center' },
                            { id: 'bottom-left', label: 'Bottom Left' },
                            { id: 'bottom-right', label: 'Bottom Right' }
                          ].map((pos) => (
                            <Pressable
                              key={pos.id}
                              onPress={() => setWatermarkAlignment(pos.id)}
                              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: watermarkAlignment === pos.id ? '#2563EB' : '#F1F5F9' }}
                            >
                              <Text style={{ fontSize: 12, color: watermarkAlignment === pos.id ? '#FFF' : '#475569', fontWeight: '600' }}>{pos.label}</Text>
                            </Pressable>
                          ))}
                        </View>

                        <Text style={{ fontWeight: '600', marginBottom: 8 }}>Opacity ({Math.round(watermarkOpacity * 100)}%)</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                          {[0.05, 0.08, 0.15, 0.30, 0.50].map((val) => (
                            <Pressable
                              key={val}
                              onPress={() => setWatermarkOpacity(val)}
                              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: watermarkOpacity === val ? '#2563EB' : '#F1F5F9' }}
                            >
                              <Text style={{ fontSize: 12, color: watermarkOpacity === val ? '#FFF' : '#475569', fontWeight: '600' }}>{Math.round(val * 100)}%</Text>
                            </Pressable>
                          ))}
                        </View>
                      </>
                    )}

                    <Pressable
                      style={[styles.saveBtn, { marginTop: 10 }]}
                      onPress={() => setShowWatermarkModal(false)}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700' }}>Done</Text>
                    </Pressable>
                  </ScrollView>
                </View>
              </View>
            </Modal>

            {/* TEMPLATE UPLOAD & SCAN VALIDATION MODAL */}
            <Modal visible={showUploadScanModal} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={[styles.centeredModalContent, { width: isMobile ? '92%' : 520 }]}>
                  <View style={styles.modalHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="upload-cloud" size={20} color="#0078d4" />
                      <Text weight="700" style={{ fontSize: 16 }}>Scan & Upload Template</Text>
                    </View>
                    <Pressable onPress={() => setShowUploadScanModal(false)}><Feather name="x" size={22} color="#333" /></Pressable>
                  </View>
                  <ScrollView style={{ maxHeight: 420 }}>
                    <View style={{ gap: 14, paddingVertical: 10 }}>
                      <Text style={{ fontSize: 12, color: '#475569', lineHeight: 18 }}>
                        Upload or paste your template text below. The scanner automatically extracts placeholders (e.g., <Text style={{ fontWeight: '700', color: '#0078d4' }}>{"{{EmployeeName}}"}</Text>), validates document structure, and populates the canvas.
                      </Text>

                      {/* FILE UPLOAD ACTION BUTTON */}
                      <Pressable
                        onPress={handleTemplateFileUpload}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justify: 'center',
                          gap: 10,
                          backgroundColor: '#F0F9FF',
                          borderWidth: 1.5,
                          borderStyle: 'dashed',
                          borderColor: '#0284C7',
                          paddingVertical: 14,
                          paddingHorizontal: 16,
                          borderRadius: 10,
                          cursor: 'pointer'
                        }}
                      >
                        <Feather name="upload" size={20} color="#0284C7" />
                        <View>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0369A1' }}>Click to Upload Document Template (.docx, .pdf, .txt)</Text>
                          <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>âš ï¸ Note: Images, Videos, and Audio files are strictly rejected.</Text>
                        </View>
                      </Pressable>

                      {/* PRE-FILL SAMPLE PDF TEMPLATE TEXT */}
                      <Pressable
                        onPress={() => {
                          const samplePdfText = `YOUR COMPANY NAME\nCompany Address, City, State, PIN Code | Phone: +91 XXXXX XXXXX | Email: hr@company.com\n\nSALARY CERTIFICATE\n\nTo Whomsoever It May Concern,\n\nThis is to certify that Mr./Ms. {{EmployeeName}}, Employee ID {{EmployeeID}}, is employed with YOUR COMPANY NAME as {{JobTitle}} in the {{Department}} department since 01 January 2024.\n\nAs per our records, the employee's current salary details are as follows:\n\nSalary Component\tMonthly Amount (INR)\tAnnual Amount (INR)\nBasic Salary\t30,000\t3,60,000\nHouse Rent Allowance (HRA)\t12,000\t1,44,000\nConveyance Allowance\t3,000\t36,000\nOther Allowances\t5,000\t60,000\nGross Salary\t50,000\t6,00,000\nTotal CTC\t-\t6,50,000\n\nThe above salary details are based on the records maintained by the company. This certificate is issued at the request of the employee for official purposes.\n\nDate of Issue: 11 August 2026\n\nAuthorized Signatory\t\t\t\tHR Manager\nYOUR COMPANY NAME\t\t\t\tHuman Resources Department`;
                          setUploadedFileText(samplePdfText);
                          scanUploadedTemplateText(samplePdfText);
                        }}
                        style={{
                          backgroundColor: '#EFF6FF',
                          borderWidth: 1,
                          borderColor: '#BFDBFE',
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          alignSelf: 'flex-start',
                          cursor: 'pointer'
                        }}
                      >
                        <Feather name="file-text" size={14} color="#0078d4" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#0078d4' }}>ðŸ“‹ Load Sample Salary Certificate PDF Text</Text>
                      </Pressable>

                      <TextInput
                        multiline
                        style={[styles.modalInput, { minHeight: 120, textAlignVertical: 'top', fontSize: 12, fontFamily: 'monospace' }]}
                        placeholder={`Or paste template text here...\n\nExample:\nTo: {{EmployeeName}}\nDesignation: {{JobTitle}}\n\nRE: APPOINTMENT CONFIRMATION\nDear {{EmployeeName}},\n\nWe are pleased to confirm your appointment.`}
                        value={uploadedFileText}
                        onChangeText={(t) => {
                          setUploadedFileText(t);
                          // Debounce heavy regex scan â€” was running on every keystroke causing lag on slow PCs
                          if (scanDebounceRef.current) clearTimeout(scanDebounceRef.current);
                          scanDebounceRef.current = setTimeout(() => scanUploadedTemplateText(t), 500);
                        }}
                      />

                      {scanResult && (
                        <View style={{ padding: 12, borderRadius: 8, backgroundColor: scanResult.isValid ? '#F0FDF4' : '#FEF2F2', borderWidth: 1, borderColor: scanResult.isValid ? '#BBF7D0' : '#FECACA' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Feather name={scanResult.isValid ? "check-circle" : "alert-triangle"} size={16} color={scanResult.isValid ? "#16A34A" : "#DC2626"} />
                              <Text style={{ fontSize: 13, fontWeight: '700', color: scanResult.isValid ? "#15803D" : "#B91C1C" }}>
                                SCAN STATUS: {scanResult.isValid ? "VERIFIED TRUE (100% VALID)" : "FAILED"}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: scanResult.isValid ? "#15803D" : "#B91C1C" }}>
                              Score: {scanResult.score}%
                            </Text>
                          </View>

                          <Text style={{ fontSize: 11, color: '#334155', marginBottom: 6 }}>{scanResult.message}</Text>

                          {scanResult.placeholders && scanResult.placeholders.length > 0 && (
                            <View style={{ marginTop: 4 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#1E293B', marginBottom: 4 }}>Detected Placeholders ({scanResult.placeholders.length}):</Text>
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                                {scanResult.placeholders.map((ph, idx) => (
                                  <View key={idx} style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#1E40AF' }}>{"{{"}{ph}{"}}"}</Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </ScrollView>

                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' }}>
                    <Pressable
                      style={{
                        backgroundColor: '#F1F5F9',
                        paddingHorizontal: 18,
                        paddingVertical: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        cursor: 'pointer'
                      }}
                      onPress={() => setShowUploadScanModal(false)}
                    >
                      <Text style={{ color: '#475569', fontWeight: '600', fontSize: 13 }}>Cancel</Text>
                    </Pressable>

                    <Pressable
                      style={{
                        backgroundColor: '#0078d4',
                        paddingHorizontal: 24,
                        paddingVertical: 10,
                        borderRadius: 8,
                        elevation: 3,
                        shadowColor: '#0078d4',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        cursor: 'pointer'
                      }}
                      onPress={applyScannedTemplateToCanvas}
                    >
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Apply to Canvas</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>

            {/* TEMPLATES MODAL */}
            <Modal visible={showTemplates} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={[styles.logoModal, { width: 380 }]}>
                  <Text weight="700" style={{ marginBottom: 12, textAlign: 'center', fontSize: 16 }}>Choose a Template</Text>

                  {/* Tab Selector */}
                  <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 8, padding: 4, marginBottom: 15 }}>
                    <Pressable
                      style={{ flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center', backgroundColor: activeTemplatesTab === 'standard' ? '#FFFFFF' : 'transparent', cursor: 'pointer' }}
                      onPress={() => setActiveTemplatesTab('standard')}
                    >
                      <RNText style={{ fontSize: 12, fontWeight: '700', color: activeTemplatesTab === 'standard' ? '#0078d4' : '#64748B' }}>Standard Templates</RNText>
                    </Pressable>
                    <Pressable
                      style={{ flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center', backgroundColor: activeTemplatesTab === 'custom' ? '#FFFFFF' : 'transparent', cursor: 'pointer' }}
                      onPress={() => setActiveTemplatesTab('custom')}
                    >
                      <RNText style={{ fontSize: 12, fontWeight: '700', color: activeTemplatesTab === 'custom' ? '#0078d4' : '#64748B' }}>My Uploads ({savedLibrary.filter(item => !item.id.startsWith('predefined_')).length})</RNText>
                    </Pressable>
                  </View>

                  <ScrollView style={{ maxHeight: 320 }}>
                    {activeTemplatesTab === 'standard' ? (
                      Object.keys(templates).map(key => (
                        <Pressable key={key} style={styles.templateBtn} onPress={() => applyTemplate(key)}>
                          <Feather name="file-text" size={18} color="#0078d4" style={{ marginRight: 10 }} />
                          <Text style={{ fontWeight: '500', color: '#333' }}>{templates[key].docName}</Text>
                        </Pressable>
                      ))
                    ) : (
                      savedLibrary.filter(item => !item.id.startsWith('predefined_')).length === 0 ? (
                        <Text style={[styles.emptyText, { marginVertical: 20 }]}>No uploaded templates.</Text>
                      ) : (
                        savedLibrary.filter(item => !item.id.startsWith('predefined_')).map(item => (
                          <Pressable key={item.id} style={styles.templateBtn} onPress={() => { loadFromLibrary(item); setShowTemplates(false); }}>
                            <Feather name="file-text" size={18} color="#10B981" style={{ marginRight: 10 }} />
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Text style={{ fontWeight: '500', color: '#333' }}>{item.docName}</Text>
                                {item.isDraft && (
                                  <View style={{ backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 }}>
                                    <RNText style={{ fontSize: 8, color: '#475569', fontWeight: '700' }}>Draft</RNText>
                                  </View>
                                )}
                              </View>
                            </View>
                          </Pressable>
                        ))
                      )
                    )}
                  </ScrollView>
                  <Pressable style={styles.closeModalBtn} onPress={() => setShowTemplates(false)}>
                    <Text style={{ color: 'white' }}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>

            {/* LOGO SELECTOR */}
            <Modal visible={showLogoSelector} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={styles.logoModal}>
                  <Text weight="700" style={{ marginBottom: 15, textAlign: 'center' }}>Choose Your Logo</Text>
                  {logo && (
                    <Pressable
                      style={{
                        backgroundColor: '#FEF2F2',
                        borderColor: '#FCA5A5',
                        borderWidth: 1,
                        paddingVertical: 10,
                        borderRadius: 8,
                        marginBottom: 15,
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}
                      onPress={() => {
                        setLogo(null);
                        setShowLogoSelector(false);
                      }}
                    >
                      <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 13 }}>Remove Current Logo</Text>
                    </Pressable>
                  )}
                  <ScrollView contentContainerStyle={styles.rowWrap}>
                    <Pressable style={styles.uploadBox} onPress={pickImage}>
                      <Feather name="plus" size={24} color="#0078d4" />
                    </Pressable>
                    {customLogos.map((uri, index) => (
                      <Pressable key={`custom-${index}`} onPress={() => { setLogo(uri); setShowLogoSelector(false) }}>
                        <Image source={{ uri }} style={styles.presetLogo} />
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Pressable style={styles.closeModalBtn} onPress={() => setShowLogoSelector(false)}><Text style={{ color: 'white' }}>Close</Text></Pressable>
                </View>
              </View>
            </Modal>

            <Modal visible={showLibrary} transparent={true} animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={[styles.centeredModalContent, { width: '75%', maxWidth: 500 }]}>
                  <View style={styles.modalHeader}>
                    <Text weight="700" style={{ fontSize: 16 }}>
                      {activeLibraryTab === 'drafts' ? 'Drafts' : 'Saved Letters'}
                    </Text>
                    <Pressable onPress={() => setShowLibrary(false)}><Feather name="x" size={24} /></Pressable>
                  </View>

                  <ScrollView style={{ maxHeight: 400 }}>
                    {isFetchingLibrary ? (
                      <ActivityIndicator size="large" color="#0078d4" style={{ marginTop: 20 }} />
                    ) : savedLibrary.filter(item => activeLibraryTab === 'drafts' ? item.isDraft : !item.isDraft).length === 0 ? (
                      <Text style={styles.emptyText}>No {activeLibraryTab === 'drafts' ? 'draft' : 'saved'} letters.</Text>
                    ) : (
                      savedLibrary
                        .filter(item => activeLibraryTab === 'drafts' ? item.isDraft : !item.isDraft)
                        .map((item) => (
                          <View key={item.id} style={styles.libraryItem}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Text weight="700">{item.docName}</Text>
                                {item.isDraft && (
                                  <View style={{ backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <RNText style={{ fontSize: 9, color: '#475569', fontWeight: '700' }}>Draft</RNText>
                                  </View>
                                )}
                              </View>
                              <Text style={{ fontSize: 10, color: '#666' }}>{new Date(parseInt(item.id)).toLocaleDateString()}</Text>
                            </View>
                            <View style={styles.libraryActions}>
                              <IconButton name="edit-2" color="#10b981" onPress={() => { loadFromLibrary(item); setShowLibrary(false); }} />
                              <IconButton name="eye" color="#5c2d91" onPress={() => { loadFromLibrary(item); setShowPreview(true); }} />
                              <IconButton name="download" color="#0078d4" onPress={() => handleWebDownload(item)} />
                              <IconButton name="trash-2" color="#d32f2f" onPress={() => deleteFromLibrary(item.id)} />
                            </View>
                          </View>
                        ))
                    )}
                  </ScrollView>
                </View>
              </View>
            </Modal>

            {/* DOCUMENT PREVIEW MODAL */}
            <Modal visible={showPreview} transparent={true} animationType="fade">
              <View style={styles.modalOverlay}>
                <View
                  style={{
                    width: isMobile ? '96%' : '90%',
                    maxWidth: 820,
                    height: isMobile ? '94%' : '88%',
                    maxHeight: 900,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    overflow: 'hidden',
                    elevation: 24,
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.2,
                    shadowRadius: 24
                  }}
                >
                  {/* Sticky Header Bar */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      backgroundColor: '#FFFFFF',
                      borderBottomWidth: 1,
                      borderColor: '#E2E8F0',
                      zIndex: 10
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Pressable
                        onPress={() => setShowPreview(false)}
                        style={({ pressed }) => [
                          {
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            backgroundColor: '#F1F5F9',
                            alignItems: 'center',
                            justify: 'center',
                            cursor: 'pointer'
                          },
                          pressed && { opacity: 0.7 }
                        ]}
                      >
                        <Feather name="x" size={18} color="#475569" />
                      </Pressable>
                      <View>
                        <RNText style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
                          Document Preview
                        </RNText>
                        <RNText style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>
                          {docName || "Untitled Letter"} â€¢ A4 Format ({pageCount} {pageCount === 1 ? 'Page' : 'Pages'})
                        </RNText>
                      </View>
                    </View>

                    <Pressable
                      style={({ pressed }) => [
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          backgroundColor: '#2563EB',
                          paddingHorizontal: 18,
                          paddingVertical: 9,
                          borderRadius: 8,
                          shadowColor: '#2563EB',
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 0.3,
                          shadowRadius: 6,
                          elevation: 3,
                          cursor: 'pointer'
                        },
                        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                      ]}
                      onPress={exportPDF}
                    >
                      <Feather name="download" size={15} color="#FFFFFF" />
                      <RNText style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                        Export PDF
                      </RNText>
                    </Pressable>
                  </View>

                  {/* Scrollable Preview Canvas Workspace */}
                  <ScrollView
                    style={{ flex: 1, backgroundColor: '#F1F5F9' }}
                    contentContainerStyle={{
                      paddingVertical: 30,
                      paddingHorizontal: 16,
                      alignItems: 'center',
                      minHeight: '100%'
                    }}
                    showsVerticalScrollIndicator={true}
                  >
                    <View
                      style={[
                        styles.pageShadow,
                        {
                          width: PAGE_WIDTH,
                          transform: [{ scale: previewScale }],
                          transformOrigin: 'top center',
                          marginBottom: Math.max(20, 750 * (1 - previewScale) * -0.8),
                          borderRadius: 4,
                          overflow: 'hidden'
                        }
                      ]}
                    >
                      <View style={styles.a4Page} collapsable={false} ref={previewPdfRef}>
                        {showWatermark && (
                          <View pointerEvents="none" style={[styles.watermarkContainer, { justifyContent: watermarkAlignment.includes('top') ? 'flex-start' : watermarkAlignment.includes('bottom') ? 'flex-end' : 'center', alignItems: watermarkAlignment.includes('left') ? 'flex-start' : watermarkAlignment.includes('right') ? 'flex-end' : 'center', padding: 40 }]}>
                            {watermarkType === 'text' && watermarkText ? (
                              <View style={{ transform: [{ rotate: '-45deg' }], opacity: watermarkOpacity, width: '100%', alignItems: 'center' }}>
                                <RNText style={{ fontSize: 70, fontWeight: 'bold', color: '#000', textAlign: 'center' }}>{watermarkText}</RNText>
                              </View>
                            ) : logo ? (
                              <Image source={{ uri: logo }} style={[styles.watermarkImage, { opacity: watermarkOpacity }]} />
                            ) : null}
                          </View>
                        )}
                        {logo && (
                          <Image
                            source={{ uri: logo }}
                            style={[
                              styles.fullImg,
                              {
                                position: 'absolute',
                                left: translateX.value,
                                top: translateY.value,
                                width: logoSize,
                                height: logoSize
                              }
                            ]}
                          />
                        )}
                        <View style={{ marginTop: 60, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          {sectionList.map((item, idx) => {
                            const key = item.id || item.type;
                            const wStyle = { width: item.width || '100%', paddingRight: item.width && item.width !== '100%' ? 8 : 0 };

                            if (item.type === 'spacer') {
                              return <View key={key} style={[wStyle, { minHeight: item.minHeight || 25 }]} />;
                            }

                            if (item.type === 'table') {
                              const s = item;
                              if (!s.enabled) return null;
                              return (
                                <View key={key} style={[wStyle, { marginVertical: 10 }]}>
                                  <View style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 4, overflow: 'hidden' }}>
                                    <View style={{ flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderColor: '#CBD5E1' }}>
                                      {(s.headers || []).map((h, i) => (
                                        <RNText key={`hp-${i}`} style={{ flex: 1, padding: 8, fontWeight: 'bold', fontFamily: FontsProvider.fontFamily.bold, fontSize: 13, color: '#0F172A', textAlign: 'left', borderRightWidth: i < (s.headers.length - 1) ? 1 : 0, borderColor: '#CBD5E1' }}>{h}</RNText>
                                      ))}
                                    </View>
                                    {(s.rows || []).map((row, rIdx) => (
                                      <View key={`rp-${rIdx}`} style={{ flexDirection: 'row', borderBottomWidth: rIdx < (s.rows.length - 1) ? 1 : 0, borderColor: '#E2E8F0' }}>
                                        {row.map((cell, cIdx) => (
                                          <RNText key={`cp-${rIdx}-${cIdx}`} style={{ flex: 1, padding: 8, fontFamily: FontsProvider.fontFamily.regular, fontSize: 12, color: '#334155', borderRightWidth: cIdx < (row.length - 1) ? 1 : 0, borderColor: '#E2E8F0' }}>{cell}</RNText>
                                        ))}
                                      </View>
                                    ))}
                                  </View>
                                </View>
                              );
                            }


                            if (item.type === 'formSubmit') {
                              return (
                                <View key={key} style={[wStyle, { alignItems: item.align || 'center', marginVertical: 10 }]}>
                                  <Pressable
                                    onPress={() => validateForm()}
                                    style={{ backgroundColor: '#2563EB', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 6, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 }}
                                  >
                                    <RNText style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>{item.content || 'Submit Form'}</RNText>
                                  </Pressable>
                                </View>
                              );
                            }

                            if (['formInput', 'formTextArea', 'formDatePicker', 'formFileUpload', 'formRadio', 'formCheckbox', 'formToggle', 'formRating', 'formDropdown'].includes(item.type)) {
                              const isErr = validationErrors.includes(item.id);
                              return (
                                <View key={key} style={[wStyle, { marginVertical: 8 }]}>
                                  {item.label !== false && (
                                    <RNText style={{ fontSize: 13, fontWeight: '600', color: isErr ? '#EF4444' : '#334155', marginBottom: 6 }}>
                                      {item.fieldLabel || item.type.replace('form', '')} {item.required && <RNText style={{ color: '#EF4444' }}>*</RNText>}
                                    </RNText>
                                  )}

                                  {item.type === 'formInput' && (
                                    <TextInput
                                      style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: isErr ? '#EF4444' : '#CBD5E1', borderRadius: 6, padding: 10, fontSize: 14, color: '#0F172A' }}
                                      placeholder={item.placeholder || 'Enter value...'}
                                      value={formValues[item.id] || ''}
                                      onChangeText={(t) => {
                                        setFormValues(prev => ({ ...prev, [item.id]: t }));
                                        setValidationErrors(prev => prev.filter(id => id !== item.id));
                                      }}
                                      editable={true}
                                    />
                                  )}

                                  {item.type === 'formDatePicker' && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: isErr ? '#EF4444' : '#CBD5E1', borderRadius: 6, padding: 8 }}>
                                      <Feather name="calendar" size={16} color="#64748B" style={{ marginRight: 8 }} />
                                      <TextInput
                                        style={{ flex: 1, fontSize: 14, color: '#0F172A', outlineStyle: 'none' }}
                                        placeholder={item.placeholder || 'YYYY-MM-DD'}
                                        value={formValues[item.id] || ''}
                                        onChangeText={(t) => {
                                          setFormValues(prev => ({ ...prev, [item.id]: t }));
                                          setValidationErrors(prev => prev.filter(id => id !== item.id));
                                        }}
                                      />
                                    </View>
                                  )}

                                  {item.type === 'formTextArea' && (
                                    <TextInput
                                      style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: isErr ? '#EF4444' : '#CBD5E1', borderRadius: 6, padding: 10, fontSize: 14, color: '#0F172A', height: 90, textAlignVertical: 'top' }}
                                      placeholder={item.placeholder || 'Enter details...'}
                                      value={formValues[item.id] || ''}
                                      onChangeText={(t) => {
                                        setFormValues(prev => ({ ...prev, [item.id]: t }));
                                        setValidationErrors(prev => prev.filter(id => id !== item.id));
                                      }}
                                      editable={true}
                                      multiline={true}
                                    />
                                  )}

                                  {item.type === 'formFileUpload' && (
                                    uploadedFiles[item.id] ? (
                                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC', borderRadius: 8, padding: 14 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                                          <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                                            <Feather name="file-text" size={18} color="#16A34A" />
                                          </View>
                                          <View style={{ flex: 1 }}>
                                            <RNText style={{ fontSize: 13, fontWeight: '600', color: '#15803D' }} numberOfLines={1}>
                                              {uploadedFiles[item.id].name}
                                            </RNText>
                                            {!!uploadedFiles[item.id].size && (
                                              <RNText style={{ fontSize: 11, color: '#16A34A' }}>
                                                {uploadedFiles[item.id].size}
                                              </RNText>
                                            )}
                                          </View>
                                        </View>
                                        <Pressable
                                          onPress={() => handleRemoveFile(item.id)}
                                          style={{ padding: 6, borderRadius: 6, backgroundColor: '#FEE2E2', cursor: 'pointer' }}
                                        >
                                          <Feather name="x" size={16} color="#EF4444" />
                                        </Pressable>
                                      </View>
                                    ) : (
                                      <Pressable
                                        onPress={() => handleDocumentPick(item.id)}
                                        style={({ pressed }) => [{
                                          alignItems: 'center',
                                          justify: 'center',
                                          backgroundColor: pressed ? '#F1F5F9' : '#F8FAFC',
                                          borderWidth: 1.5,
                                          borderStyle: 'dashed',
                                          borderColor: isErr ? '#EF4444' : '#CBD5E1',
                                          borderRadius: 8,
                                          padding: 20,
                                          cursor: 'pointer'
                                        }]}
                                      >
                                        <Feather name="upload-cloud" size={26} color="#3B82F6" style={{ marginBottom: 6 }} />
                                        <RNText style={{ color: '#0F172A', fontSize: 13, fontWeight: '600' }}>
                                          {item.placeholder || 'Click to upload a file'}
                                        </RNText>
                                        <RNText style={{ color: '#94A3B8', fontSize: 11, marginTop: 4 }}>
                                          PDF, DOCX, PNG, JPG (Max 10MB)
                                        </RNText>
                                      </Pressable>
                                    )
                                  )}

                                  {item.type === 'formToggle' && (
                                    <Pressable
                                      onPress={() => {
                                        setFormValues(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                                        setValidationErrors(prev => prev.filter(id => id !== item.id));
                                      }}
                                      style={{ flexDirection: 'row', alignItems: 'center', cursor: 'pointer' }}
                                    >
                                      <View style={{ width: 46, height: 26, borderRadius: 13, backgroundColor: formValues[item.id] ? '#2563EB' : '#E2E8F0', padding: 3, justifyContent: 'center' }}>
                                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', alignSelf: formValues[item.id] ? 'flex-end' : 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 2 }} />
                                      </View>
                                      <RNText style={{ marginLeft: 10, fontSize: 13, fontWeight: '500', color: '#334155' }}>
                                        {formValues[item.id] ? 'Enabled' : 'Disabled'}
                                      </RNText>
                                    </Pressable>
                                  )}

                                  {item.type === 'formRating' && (
                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                      {[1, 2, 3, 4, 5].map((star) => {
                                        const activeStar = (formValues[item.id] || 0) >= star;
                                        return (
                                          <Pressable
                                            key={star}
                                            onPress={() => {
                                              setFormValues(prev => ({ ...prev, [item.id]: star }));
                                              setValidationErrors(prev => prev.filter(id => id !== item.id));
                                            }}
                                            style={{ cursor: 'pointer', padding: 2 }}
                                          >
                                            <Feather name="star" size={26} color={activeStar ? "#F59E0B" : "#CBD5E1"} />
                                          </Pressable>
                                        );
                                      })}
                                    </View>
                                  )}

                                  {item.type === 'formRadio' && (
                                    <View style={{ gap: 8 }}>
                                      {(item.options && item.options.length > 0 ? item.options : ['Option 1', 'Option 2']).map((opt, i) => {
                                        const selected = formValues[item.id] === opt;
                                        return (
                                          <Pressable
                                            key={i}
                                            onPress={() => {
                                              setFormValues(prev => ({ ...prev, [item.id]: opt }));
                                              setValidationErrors(prev => prev.filter(id => id !== item.id));
                                            }}
                                            style={{ flexDirection: 'row', alignItems: 'center', cursor: 'pointer' }}
                                          >
                                            <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: selected ? '#2563EB' : '#CBD5E1', alignItems: 'center', justifyContent: 'center', marginRight: 8, backgroundColor: '#FFF' }}>
                                              {selected && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' }} />}
                                            </View>
                                            <RNText style={{ fontSize: 14, color: '#334155' }}>{opt}</RNText>
                                          </Pressable>
                                        );
                                      })}
                                    </View>
                                  )}

                                  {item.type === 'formCheckbox' && (
                                    <View style={{ gap: 8 }}>
                                      {(item.options && item.options.length > 0 ? item.options : ['Option 1', 'Option 2']).map((opt, i) => {
                                        const currentList = Array.isArray(formValues[item.id]) ? formValues[item.id] : [];
                                        const checked = currentList.includes(opt);
                                        return (
                                          <Pressable
                                            key={i}
                                            onPress={() => {
                                              const nextList = checked ? currentList.filter(x => x !== opt) : [...currentList, opt];
                                              setFormValues(prev => ({ ...prev, [item.id]: nextList }));
                                              if (nextList.length > 0) {
                                                setValidationErrors(prev => prev.filter(id => id !== item.id));
                                              }
                                            }}
                                            style={{ flexDirection: 'row', alignItems: 'center', cursor: 'pointer' }}
                                          >
                                            <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: checked ? '#2563EB' : '#CBD5E1', backgroundColor: checked ? '#2563EB' : '#FFF', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                                              {checked && <Feather name="check" size={12} color="#FFF" />}
                                            </View>
                                            <RNText style={{ fontSize: 14, color: '#334155' }}>{opt}</RNText>
                                          </Pressable>
                                        );
                                      })}
                                    </View>
                                  )}

                                  {item.type === 'formDropdown' && (
                                    <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: isErr ? '#EF4444' : '#CBD5E1', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                                      {Platform.OS === 'web' ? (
                                        <select
                                          value={formValues[item.id] || ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setFormValues(prev => ({ ...prev, [item.id]: val }));
                                            setValidationErrors(prev => prev.filter(id => id !== item.id));
                                          }}
                                          style={{ width: '100%', padding: '6px', border: 'none', background: 'transparent', fontSize: '14px', color: '#0F172A', outline: 'none', cursor: 'pointer' }}
                                        >
                                          <option value="" disabled>{item.placeholder || 'Select from list'}</option>
                                          {(item.options && item.options.length > 0 ? item.options : ['Option 1', 'Option 2']).map((opt, i) => (
                                            <option key={i} value={opt}>{opt}</option>
                                          ))}
                                        </select>
                                      ) : (
                                        <TextInput
                                          style={{ fontSize: 14, color: '#0F172A', paddingVertical: 6 }}
                                          placeholder={item.placeholder || 'Select from list'}
                                          value={formValues[item.id] || ''}
                                          onChangeText={(t) => setFormValues(prev => ({ ...prev, [item.id]: t }))}
                                        />
                                      )}
                                    </View>
                                  )}
                                </View>
                              );
                            }

                            const hasContent = item.content ? item.content.trim().length > 0 : false;
                            if (item.type !== 'table' && item.type !== 'spacer' && !hasContent) return null;
                            return (
                              <View key={key} style={wStyle}>
                                <View style={{ minHeight: item.minHeight || 25 }}>
                                  {renderMarkdownText(item.content, {
                                    textAlign: item.align || 'left',
                                    fontSize: (item.fontSize || 11) + 3,
                                    fontFamily: item.bold ? FontsProvider.fontFamily.bold : FontsProvider.fontFamily.regular,
                                    fontWeight: item.bold ? 'bold' : 'normal',
                                    fontStyle: item.italic ? 'italic' : 'normal',
                                    textDecorationLine: item.underlineStyle && item.underlineStyle !== 'none' ? 'underline' : 'none',
                                    marginBottom: item.type === 'headerInfo' ? 5 : 15,
                                    color: item.color || '#1F2937'
                                  })}
                                </View>
                                {item.type === 'headerInfo' && hasContent && <View style={styles.headerLine} />}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  appHeader: {
    height: 68,
    backgroundColor: "#FFFFFF",
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    zIndex: 10
  },
  appHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  titleInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden'
  },
  docTitleInput: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: 240,
    outlineStyle: 'none'
  },
  draftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  draftDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981'
  },
  draftBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B'
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
    cursor: 'pointer'
  },
  saveBtnSaving: {
    backgroundColor: '#3B82F6',
    opacity: 0.85
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3
  },
  primaryBtn: { backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  toolbar: { minHeight: 62, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, zIndex: 5 },
  toolGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  vDivider: { width: 1, height: 24, backgroundColor: '#E2E8F0', marginHorizontal: 10 },
  ribbonDivider: { width: 1, height: 22, backgroundColor: '#E2E8F0', marginHorizontal: 6 },
  ribbonBtn: { minWidth: 52, paddingHorizontal: 8, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginHorizontal: 2, cursor: 'pointer' },
  ribbonBtnActive: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  btnLabel: { fontSize: 10, marginTop: 2, color: '#64748B', fontWeight: '600', textAlign: 'center' },
  fontSizeBox: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' },
  mainContent: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 260, backgroundColor: '#FFFFFF', borderRightWidth: 1, borderColor: '#E2E8F0', padding: 16, zIndex: 1, userSelect: 'none', WebkitUserSelect: 'none' },
  sidebarTitle: { fontSize: 11, color: '#94A3B8', marginBottom: 12, letterSpacing: 1.2, fontWeight: '700', textTransform: 'uppercase', userSelect: 'none', WebkitUserSelect: 'none' },
  sideItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 4, userSelect: 'none', WebkitUserSelect: 'none' },
  sideItemActive: { backgroundColor: '#EFF6FF' },
  sideItemText: { fontSize: 13, color: '#475569', fontWeight: '500', userSelect: 'none', WebkitUserSelect: 'none' },
  canvasContainer: { paddingVertical: 40, paddingHorizontal: 20, alignItems: 'center', width: '100%', flexGrow: 1 },
  pageShadow: { elevation: 20, shadowColor: '#0F172A', shadowOpacity: 0.14, shadowRadius: 28, shadowOffset: { width: 0, height: 14 } },
  a4Page: { width: PAGE_WIDTH, minHeight: 750, backgroundColor: '#FFFFFF', padding: 50, borderRadius: 4 },
  floatingLogo: { position: 'absolute', zIndex: 99, borderStyle: 'dashed', borderWidth: 2, borderColor: '#3B82F6', padding: 4, borderRadius: 4 },
  fullImg: { width: '100%', height: '100%', resizeMode: 'contain' },
  dragHandle: { position: 'absolute', top: -10, left: -10, backgroundColor: '#3B82F6', borderRadius: 12, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
  letterInput: { width: '100%', paddingHorizontal: 4, paddingVertical: 2, marginBottom: 0, borderRadius: 6, backgroundColor: 'transparent', outlineStyle: 'none' },
  activeInput: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.35)', borderRadius: 6 },
  inactiveInput: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'transparent' },
  headerLine: { height: 1, backgroundColor: '#E2E8F0', width: '100%', marginBottom: 25, marginTop: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 20, color: '#0F172A', fontWeight: '700' },
  modalBody: { maxHeight: 400, marginVertical: 12 },
  modalInput: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, backgroundColor: '#F8FAFC', fontSize: 15, color: '#334155' },
  primaryButton: { backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 16, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  primaryButtonText: { color: 'white', fontWeight: '700', fontSize: 16 },
  centeredModalContent: { width: '85%', maxWidth: 500, backgroundColor: 'white', borderRadius: 16, padding: 24, elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12 },
  previewNavCenter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderColor: '#E2E8F0' },
  exportPdfBtnSmall: { backgroundColor: '#2563EB', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  logoModal: { backgroundColor: 'white', padding: 24, borderRadius: 16, width: 340, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 15 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  uploadBox: { width: 60, height: 60, borderStyle: 'dashed', borderWidth: 2, borderColor: '#94A3B8', alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#F8FAFC' },
  presetLogo: { width: 60, height: 60, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  closeModalBtn: { backgroundColor: '#EF4444', padding: 12, borderRadius: 8, marginTop: 24, alignItems: 'center' },
  colorCircle: { width: 24, height: 24, borderRadius: 12, marginHorizontal: 4, borderWidth: 2, borderColor: 'transparent' },
  colorCircleActive: { borderColor: '#CBD5E1', transform: [{ scale: 1.15 }], shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2 },
  libraryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  libraryActions: { flexDirection: 'row', gap: 12 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginVertical: 30, fontSize: 15 },
  templateBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#F1F5F9', backgroundColor: '#F8FAFC', borderRadius: 12, marginBottom: 10 },
  watermarkContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
    pointerEvents: 'none',
  },
  watermarkImage: {
    width: 320,
    height: 320,
    resizeMode: 'contain',
  },
  formatGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mobileSectionBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    zIndex: 5,
  },
  mobileSideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  mobileSideItemActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  mobileSideItemText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  }
});

export const generateWebPDFContent = (targetSections, targetLogo, targetLogoSize, tX, tY, targetShowWatermark = true, targetWatermarkOpacity = 0.08, targetWatermarkType = 'logo', targetWatermarkText = 'CONFIDENTIAL') => {
  const logoX = tX !== undefined && tX !== null ? tX : 40;
  const logoY = tY !== undefined && tY !== null ? tY : 20;
  const logoDim = targetLogoSize || 80;

  const secArray = Array.isArray(targetSections)
    ? targetSections
    : Object.keys(targetSections || {}).map(k => ({ ...targetSections[k], type: targetSections[k].type || k, key: k }));

  const sectionsHTML = secArray.map((s) => {
    if (!s) return "";
    const key = s.type || s.key || "";

    const secWidth = formatCssDimension(s.width, '%') || '100%';
    const secMargin = formatCssDimension(s.margin);
    const secPadding = formatCssDimension(s.padding);

    if (key === 'spacer' || s.type === 'spacer') {
      return `<div style="width: ${secWidth}; min-height: ${s.minHeight || 25}px; box-sizing: border-box; display: block; ${secMargin ? `margin: ${secMargin};` : ''} ${secPadding ? `padding: ${secPadding};` : ''}"></div>`;
    }

    if (key === 'table' || s.type === 'table') {
      if (!s.enabled) return "";
      const headers = s.headers || [];
      const colWidthPct = headers.length > 0 ? (100 / headers.length).toFixed(2) : '50';
      let tableHtml = `<div style="width: ${secWidth}; box-sizing: border-box; ${secPadding ? `padding: ${secPadding};` : (s.width && s.width !== '100%' ? 'padding-right: 12px;' : '')} ${secMargin ? `margin: ${secMargin};` : ''}"><table style="width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 12px; font-size: ${s.fontSize || 10}pt; text-align: ${s.align || 'left'}; color: ${s.color || '#1F2937'}; table-layout: fixed;">`;
      tableHtml += `<thead><tr>`;
      for (let i = 0; i < headers.length; i++) {
        tableHtml += `<th style="border: 1px solid #D1D5DB; padding: 7px 10px; background-color: #F3F4F6; font-weight: 600; text-align: left; width: ${colWidthPct}%; word-break: break-word;">${headers[i]}</th>`;
      }
      tableHtml += `</tr></thead><tbody>`;
      const rows = s.rows || [];
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        const isHighlight = (row || []).some(cell => String(cell).toLowerCase().includes("net salary") || String(cell).toLowerCase().includes("total"));
        const rowBg = isHighlight ? "background-color: #F9FAFB; font-weight: 600;" : "";
        tableHtml += `<tr style="${rowBg}">`;
        for (let c = 0; c < row.length; c++) {
          tableHtml += `<td style="border: 1px solid #E5E7EB; padding: 6px 10px; width: ${colWidthPct}%; word-break: break-word;">${row[c]}</td>`;
        }
        tableHtml += `</tr>`;
      }
      tableHtml += `</tbody></table></div>`;
      return tableHtml;
    }

    if (key !== 'table' && key !== 'spacer' && (!s.content || !s.content.trim())) return "";

    const isUnderlined = s.underline === true || (s.underlineStyle && s.underlineStyle !== "none" && s.underlineStyle !== "undefined");

    let textDecoration = "";
    let borderBottom = "";
    if (s.underlineStyle === "double") {
      borderBottom = `border-bottom: 2px double ${s.color || "#1F2937"}; display: inline-block;`;
    } else if (s.underlineStyle === "dashed") {
      borderBottom = `border-bottom: 1px dashed ${s.color || "#1F2937"}; display: inline-block;`;
    } else if (isUnderlined || s.underlineStyle === "solid") {
      textDecoration = "text-decoration: underline;";
    }

    const rawContent = s.content || "";
    const lines = rawContent.split("\n");
    const formattedContent = lines
      .map((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return "<br />";
        let styledLine = trimmedLine.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        if (textDecoration || borderBottom) {
          styledLine = `<span style="${textDecoration} ${borderBottom}">${styledLine}</span>`;
        }
        return styledLine;
      })
      .join("<br />");

    const mb = key === "headerInfo" ? "6px" : key === "subject" ? "8px" : "8px";
    const computedMargin = secMargin || `0 0 ${mb}`;
    const computedPadding = secPadding || (s.width && s.width !== '100%' ? '0 12px 0 0' : '0');

    return `
      <div style="
        width: ${secWidth};
        box-sizing: border-box;
        padding: ${computedPadding};
        margin: ${computedMargin};
        text-align: ${s.align || 'left'};
        font-size: ${s.fontSize || 11}pt;
        font-weight: ${s.bold ? "bold" : "normal"};
        font-style: ${s.italic ? "italic" : "normal"};
        color: ${s.color || '#1F2937'};
        line-height: 1.4;
      ">
        <div style="min-height: ${s.minHeight || 25}px;">
          ${formattedContent}
        </div>
        ${key === "headerInfo" && s.content && s.content.trim()
        ? '<hr style="border:none;border-top:1px solid #E5E7EB;margin:6px 0 12px;" />'
        : ""}
      </div>
    `;
  }).join("");

  return `
    <div style="
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #1F2937;
      padding: 50px;
      width: 210mm;
      min-height: 297mm;
      box-sizing: border-box;
      background-color: #ffffff;
      line-height: 1.4;
      position: relative;
      overflow: hidden;
    ">

      ${targetShowWatermark && targetLogo ? `
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 320px;
          height: 320px;
          opacity: ${targetWatermarkOpacity};
          pointer-events: none;
          z-index: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <img src="${targetLogo}" style="max-width: 100%; max-height: 100%; object-fit: contain; border: 0; display: block;" />
        </div>
      ` : ""}

      ${targetLogo ? `
        <div style="
          position: absolute;
          left: ${logoX}px;
          top: ${logoY}px;
          width: ${logoDim}px;
          height: ${logoDim}px;
          z-index: 10;
        ">
          <img src="${targetLogo}" width="${logoDim}" height="${logoDim}" style="width: ${logoDim}px; height: ${logoDim}px; max-width: ${logoDim}px; max-height: ${logoDim}px; object-fit: contain; border: 0; display: block;" />
        </div>
      ` : ""}

      <div style="margin-top: 60px; display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: flex-start;">
        ${sectionsHTML}
      </div>
    </div>
  `;
};

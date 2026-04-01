// src/components/HarvardCV.tsx
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

type Education = {
  id: number;
  school: string;
  major: string;
  gpa: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
};

type Experience = {
  id: number;
  role: string;
  company: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
};

type Project = {
  id: number;
  name: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
};

type Achievement = {
  id: number;
  name: string;
  year: string;
};

type CustomSection = {
  id: number;
  title: string;
  content: string;
};

type CVData = {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    linkedin: string;
    summary: string;
  };
  educations: Education[];
  experiences: Experience[];
  projects: Project[];
  achievements: Achievement[];
  customSections: CustomSection[];
  skills: {
    hard: string;
    soft: string;
  };
};

// Register Font Times New Roman (Wajib buat Harvard Style)
Font.register({
  family: 'Times-Roman',
  src: 'https://db.onlinewebfonts.com/t/32441506567156636049eb850b53f02a.ttf'
});
Font.register({
  family: 'Times-Bold',
  src: 'https://db.onlinewebfonts.com/t/f3a5a836f3534b3d7b83884d852f3605.ttf'
});
Font.register({
  family: 'Times-Italic',
  src: 'https://db.onlinewebfonts.com/t/a6e9744155fb21cb17079207e4d9c79e.ttf' 
});

const styles = StyleSheet.create({
  page: { 
    padding: 30, // Margin halaman sedikit diperkecil biar muat banyak
    fontFamily: 'Times-Roman', 
    fontSize: 10.5, // Ukuran font standar CV
    lineHeight: 1.4 
  },
  // --- HEADER SECTION ---
  header: { 
    textAlign: 'center', 
    marginBottom: 7
  },
  name: { 
    fontSize: 15, 
    fontFamily: 'Times-Bold', 
    textTransform: 'uppercase', 
    marginBottom: 8 
  },
  contact: { 
    fontSize: 10, 
    color: '#000',
    marginBottom: 2
  },
  link: {
    color: '#000',
    textDecoration: 'none'
  },
  
  // --- SECTION TITLES ---
  sectionTitle: { 
    fontSize: 11, 
    fontFamily: 'Times-Bold', 
    textTransform: 'uppercase', 
    marginTop: 12, 
    marginBottom: 6, 
    borderBottomWidth: 1, 
    borderBottomColor: '#000', 
    paddingBottom: 2 
  },
  
  // --- CONTENT ---
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end',
    marginBottom: 2 
  },
  bold: { fontFamily: 'Times-Bold' },
  italic: { fontFamily: 'Times-Italic' },
  
  // --- BULLETS ---
  bulletPoint: { 
    flexDirection: 'row', 
    marginLeft: 10, 
    marginBottom: 2 
  },
  bullet: { 
    width: 10, 
    fontSize: 14, // Bullet agak besar
    marginTop: -2
  },
  bulletText: { 
    flex: 1,
    textAlign: 'justify' // Rata kanan kiri biar rapi
  }
});

// Helper untuk memecah teks bullet points
const BulletList = ({ text }: { text: string }) => {
  if (!text?.trim()) return null;
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const items = lines
    .map((line) => line.replace(/^(•|-|\*)\s*/, '').trim())
    .filter((line) => line.length > 0);

  if (items.length === 0) {
    items.push(text.trim());
  }
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletPoint}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>{item.trim()}</Text>
        </View>
      ))}
    </View>
  );
};

const formatDateRange = (startDate?: string, endDate?: string, isCurrent?: boolean) => {
  const start = startDate?.trim();
  const end = endDate?.trim();

  if (isCurrent) {
    return start ? `${start} - Present` : 'Present';
  }

  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  if (end) return end;
  return '';
};

// Main Document Component
export const HarvardCV = ({ data }: { data: CVData }) => {
  // Format Link LinkedIn (hapus https://www. biar pendek & rapi)
  const displayLinkedin = data.personalInfo.linkedin 
    ? data.personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') 
    : '';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER: Fix Jarak & Layout */}
        <View style={styles.header}>
          <Text style={styles.name}>{data.personalInfo.fullName}</Text>
          <Text style={styles.contact}>
            {data.personalInfo.email}  |  {data.personalInfo.phone}  {displayLinkedin ? `|  ${displayLinkedin}` : ''}
          </Text>
        </View>

        {/* SUMMARY */}
        {data.personalInfo.summary && (
          <View>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={{ textAlign: 'justify' }}>{data.personalInfo.summary}</Text>
          </View>
        )}

        {/* EDUCATION */}
        {data.educations.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Education</Text>
            {data.educations.map((edu) => (
              <View key={edu.id} style={{ marginBottom: 8 }}>
                <View style={styles.row}>
                  <Text style={styles.bold}>{edu.school}</Text>
                  <Text>{formatDateRange(edu.startDate, edu.endDate, edu.isCurrent)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.italic}>
                    {edu.major} {edu.gpa ? `| GPA: ${edu.gpa}` : ''}
                  </Text>
                </View>
                <BulletList text={edu.description || ''} />
              </View>
            ))}
          </View>
        )}

        {/* EXPERIENCE */}
        {data.experiences.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Experience</Text>
            {data.experiences.map((exp) => (
              <View key={exp.id} style={{ marginBottom: 10 }}>
                <View style={styles.row}>
                  <Text style={styles.bold}>{exp.role}, {exp.company}</Text>
                  <Text>{formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}</Text>
                </View>
                <BulletList text={exp.description} />
              </View>
            ))}
          </View>
        )}

        {/* PROJECTS */}
        {data.projects.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Projects</Text>
            {data.projects.map((proj) => (
              <View key={proj.id} style={{ marginBottom: 8 }}>
                <View style={styles.row}>
                  <Text style={styles.bold}>{proj.name} | {proj.role}</Text>
                  <Text>{formatDateRange(proj.startDate, proj.endDate)}</Text>
                </View>
                <BulletList text={proj.description} />
              </View>
            ))}
          </View>
        )}

        {/* SKILLS (Dipisah dari Awards) */}
        {(data.skills.hard || data.skills.soft) && (
          <View>
            <Text style={styles.sectionTitle}>Skills</Text>
            {data.skills.hard && (
              <Text style={{ marginBottom: 3 }}>
                <Text style={styles.bold}>Hard Skills: </Text> {data.skills.hard}
              </Text>
            )}
            {data.skills.soft && (
              <Text>
                <Text style={styles.bold}>Soft Skills: </Text> {data.skills.soft}
              </Text>
            )}
          </View>
        )}

        {/* AWARDS (Judul Sendiri) */}
        {data.achievements.length > 0 && data.achievements[0].name !== '' && (
          <View>
            <Text style={styles.sectionTitle}>Honors & Awards</Text>
            {data.achievements.map((ach) => (
               <View key={ach.id} style={styles.bulletPoint}>
                 <Text style={styles.bullet}>•</Text>
                 <Text style={styles.bulletText}>
                   {ach.name} {ach.year ? `(${ach.year})` : ''}
                 </Text>
               </View>
            ))}
          </View>
        )}

        {data.customSections
          .filter((section) => section.title.trim() || section.content.trim())
          .map((section) => (
            <View key={section.id}>
              <Text style={styles.sectionTitle}>{section.title || 'Custom Section'}</Text>
              <BulletList text={section.content} />
            </View>
          ))}

      </Page>
    </Document>
  );
};
# CV Builder AI

CV Builder AI membantu kamu membuat CV profesional dengan template siap pakai, dibantu AI yang bisa memperbaiki kalimat dan menerjemahkan ke Bahasa Inggris. Bisa juga mengimpor CV lama dari PDF. Gratis, tanpa daftar.

---

## ✨ Fitur Utama

- **Template CV profesional** — pilih dari template Harvard atau Modern
- **AI Writing Assistant** — perbaiki kalimat dan terjemahkan ke Bahasa Inggris secara otomatis
- **Import dari PDF / DOCX** — unggah CV lama, AI akan memparsing isinya secara otomatis
- **Export ke PDF** — unduh CV siap kirim langsung dari browser
- **Tanpa daftar akun** — langsung pakai, gratis

---

## 🛠 Tech Stack

| Kategori | Library / Framework |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) + [React 19](https://react.dev) |
| Bahasa | TypeScript |
| Styling | Tailwind CSS v4 |
| AI | [Groq SDK](https://groq.com) |
| PDF | [@react-pdf/renderer](https://react-pdf.org), [unpdf](https://github.com/unjs/unpdf) |
| DOCX | [mammoth](https://github.com/mwilliamson/mammoth.js) |
| Icons | [lucide-react](https://lucide.dev) |

---

## 🚀 Menjalankan Secara Lokal

### 1. Clone repositori

```bash
git clone https://github.com/dewandaca/cvbuilder.git
cd cvbuilder
```

### 2. Install dependencies

```bash
npm install
```

### 3. Buat file `.env.local`

Salin contoh environment variable berikut dan isi dengan nilai yang sesuai:

```env
# Groq API Key untuk fitur AI
GROQ_API_KEY=your_groq_api_key_here
```

> Dapatkan API key gratis di [console.groq.com](https://console.groq.com)

### 4. Jalankan development server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

---

## 📁 Struktur Proyek

```
src/
├── app/
│   ├── page.tsx          # Landing page
│   ├── actions.ts        # Server Actions (AI calls)
│   ├── cv-builder/
│   │   └── page.tsx      # Halaman utama CV Builder
│   └── api/
│       └── ai/
│           └── parse-cv/ # API route untuk parsing CV dari PDF/DOCX
├── components/
│   ├── HarvardCV.tsx     # Template CV gaya Harvard
│   ├── ModernCV.tsx      # Template CV gaya Modern
│   ├── preview/          # Komponen preview PDF
│   └── ui/               # Komponen UI reusable
├── lib/                  # Utility functions
└── types/                # TypeScript type definitions
```

---

## 📜 Scripts

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Jalankan development server |
| `npm run build` | Build untuk production |
| `npm run start` | Jalankan production server |
| `npm run lint` | Cek kode dengan ESLint |

---

## 📄 Lisensi

Proyek ini bersifat pribadi dan tidak untuk didistribusikan secara publik.
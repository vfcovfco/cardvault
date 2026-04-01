import { useState, useRef, useEffect } from "react";
import {
  collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInWithPopup, signOut, onAuthStateChanged,
} from "firebase/auth";
import { auth, db, googleProvider } from "./firebase.js";
import {
  Search, Camera, User, Building2, Phone, Mail, Globe, MapPin,
  X, Plus, Check, Edit3, Download, Trash2, ChevronDown, Loader2,
  FileText, ScanLine, Grid3x3, List, Filter, LogOut, Cloud, CloudOff, RefreshCw,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const TAG_COLORS = [
  "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700", "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700",
  "bg-orange-100 text-orange-700", "bg-pink-100 text-pink-800",
];
const getTagColor = (tag) => TAG_COLORS[tag.charCodeAt(0) % TAG_COLORS.length];

const SOURCE_BADGE = {
  scan:   { label: "掃描", color: "bg-blue-50 text-blue-600" },
  csv:    { label: "CSV",  color: "bg-amber-50 text-amber-600" },
  manual: { label: "手動", color: "bg-gray-100 text-gray-500" },
};

const AUTH_ERRORS = {
  "auth/email-already-in-use":  "此 Email 已被註冊",
  "auth/invalid-email":         "Email 格式不正確",
  "auth/weak-password":         "密碼至少需要 6 個字元",
  "auth/user-not-found":        "找不到此帳號",
  "auth/wrong-password":        "密碼錯誤",
  "auth/invalid-credential":    "帳號或密碼錯誤",
  "auth/too-many-requests":     "嘗試次數過多，請稍後再試",
  "auth/popup-closed-by-user":  "視窗已關閉，請重試",
  "auth/popup-blocked":         "彈出視窗被封鎖，請允許後重試",
};

// ─── Firestore helpers ────────────────────────────────────────────────────────
const contactsRef = (uid) => collection(db, "users", uid, "contacts");
const contactRef  = (uid, id) => doc(db, "users", uid, "contacts", id);

// ─── Image compression helper ─────────────────────────────────────────────────
const compressImage = (dataUrl) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.src = dataUrl;
  });

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ contact }) {
  const initials = contact.nameZh
    ? contact.nameZh.slice(-2)
    : (contact.nameEn?.slice(0, 2) ?? "?");
  const hue = ((contact.id?.charCodeAt(0) ?? 65) * 40) % 360;
  return (
    <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
      style={{ background: `hsl(${hue},60%,55%)` }}
    >
      {initials}
    </div>
  );
}

// ─── TagChip ──────────────────────────────────────────────────────────────────
function TagChip({ tag, onRemove }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getTagColor(tag)}`}>
      {tag}
      {onRemove && (
        <button onClick={() => onRemove(tag)} className="hover:opacity-60 leading-none">
          <X size={10} />
        </button>
      )}
    </span>
  );
}

// ─── ContactCard ──────────────────────────────────────────────────────────────
function ContactCard({ contact, onEdit, onDelete, onSelect, isSelected, viewMode }) {
  if (viewMode === "list") {
    return (
      <div className={`flex items-center gap-4 px-4 py-3 bg-white border rounded-xl transition-all
        ${isSelected ? "border-blue-400 bg-blue-50/30" : "border-gray-100 hover:border-gray-200 hover:shadow-sm"}`}>
        <input type="checkbox" checked={isSelected} onChange={() => onSelect(contact.id)}
          className="w-4 h-4 accent-blue-500 flex-shrink-0" />
        <Avatar contact={contact} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{contact.nameZh}</span>
            {contact.nameEn && <span className="text-gray-400 text-sm">{contact.nameEn}</span>}
            <span className={`text-xs px-1.5 py-0.5 rounded-md ${SOURCE_BADGE[contact.source]?.color}`}>
              {SOURCE_BADGE[contact.source]?.label}
            </span>
          </div>
          <div className="text-sm text-gray-500">{contact.title} · {contact.company}</div>
        </div>
        <div className="hidden md:flex items-center gap-4 text-sm text-gray-400">
          {contact.phone && <span className="flex items-center gap-1"><Phone size={12} />{contact.phone}</span>}
          {contact.email && <span className="flex items-center gap-1 max-w-[200px] truncate"><Mail size={12} />{contact.email}</span>}
        </div>
        <div className="hidden lg:flex flex-wrap gap-1 max-w-[200px]">
          {contact.tags?.map(t => <TagChip key={t} tag={t} />)}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onEdit(contact)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-500 transition-colors"><Edit3 size={15} /></button>
          <button onClick={() => onDelete(contact.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-2xl p-4 transition-all
      ${isSelected ? "border-blue-400 shadow-md bg-blue-50/20" : "border-gray-100 hover:border-gray-200 hover:shadow-md"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={isSelected} onChange={() => onSelect(contact.id)} className="w-4 h-4 accent-blue-500" />
          <Avatar contact={contact} />
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOURCE_BADGE[contact.source]?.color}`}>
          {SOURCE_BADGE[contact.source]?.label}
        </span>
      </div>
      <div className="mb-3">
        <div className="font-bold text-gray-900 text-base leading-tight">{contact.nameZh}</div>
        {contact.nameEn && <div className="text-sm text-gray-400">{contact.nameEn}</div>}
        <div className="text-sm text-gray-600 mt-0.5">{contact.title}</div>
        <div className="text-sm font-medium text-gray-700 flex items-center gap-1 mt-0.5">
          <Building2 size={12} className="text-gray-400 flex-shrink-0" />{contact.company}
        </div>
      </div>
      <div className="space-y-1 mb-3 text-xs text-gray-500">
        {contact.phone && <div className="flex items-center gap-1.5"><Phone size={11} />{contact.phone}</div>}
        {contact.email && <div className="flex items-center gap-1.5 truncate"><Mail size={11} />{contact.email}</div>}
      </div>
      {contact.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {contact.tags.map(t => <TagChip key={t} tag={t} />)}
        </div>
      )}
      {contact.note && <div className="text-xs text-gray-400 italic truncate mb-3">💬 {contact.note}</div>}
      <div className="flex items-center gap-1 pt-2 border-t border-gray-50">
        <button onClick={() => onEdit(contact)} className="flex-1 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center gap-1 transition-colors">
          <Edit3 size={12} />編輯
        </button>
        <button onClick={() => onDelete(contact.id)} className="flex-1 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-red-50 hover:text-red-500 flex items-center justify-center gap-1 transition-colors">
          <Trash2 size={12} />刪除
        </button>
      </div>
    </div>
  );
}

// ─── LoginScreen ──────────────────────────────────────────────────────────────
function LoginScreen({ onEmailLogin, onGoogleLogin, loading, googleLoading }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode]         = useState("login");
  const [error, setError]       = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError("請填寫 Email 和密碼"); return; }
    const err = await onEmailLogin(email, password, mode);
    if (err) setError(err);
  };

  const handleGoogle = async () => {
    setError("");
    const err = await onGoogleLogin();
    if (err) setError(err);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-xl border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ScanLine size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-1">CardVault</h1>
          <p className="text-gray-400 text-sm">AI 名片管理 · 跨裝置即時同步</p>
        </div>

        <button
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="w-full py-3 border-2 border-gray-200 rounded-2xl font-semibold text-gray-700 flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all mb-4"
        >
          {googleLoading ? <Loader2 size={18} className="animate-spin" /> : (
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.4 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.3C29.4 35.5 26.8 36 24 36c-5.2 0-9.6-3.5-11.2-8.4l-6.6 5.1C9.5 39.5 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.2 5.3C41.2 35.5 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"/>
            </svg>
          )}
          使用 Google 帳號登入
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-300">或用 Email</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          <button onClick={() => setMode("login")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "login" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>登入</button>
          <button onClick={() => setMode("register")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "register" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>註冊</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="your@email.com"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">密碼</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••"
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 transition-colors" />
          </div>
          {error && <div className="bg-red-50 text-red-500 text-xs rounded-xl px-3 py-2.5">{error}</div>}
          <button onClick={handleSubmit} disabled={loading || googleLoading}
            className="w-full py-3 bg-gray-900 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 size={18} className="animate-spin" /> : (mode === "login" ? "登入" : "建立帳號")}
          </button>
        </div>

        <p className="text-xs text-gray-300 text-center mt-5">登入後資料自動同步至所有裝置 ☁️</p>
      </div>
    </div>
  );
}

// ─── ScanModal ────────────────────────────────────────────────────────────────
function ScanModal({ onClose, onSave }) {
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [error, setError]         = useState(null);
  const fileRef = useRef();

  const handleFile = (f) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  // ── 直接從前端呼叫 Gemini API ────────────────────────────────────────────
  const extractData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 壓縮圖片，避免過大
      const compressed = await compressImage(preview);
      const base64 = compressed.split(",")[1];

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      console.log("API KEY:", apiKey ? `存在，長度${apiKey.length}` : "❌ 未定義");
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: "image/jpeg", data: base64 } },
                { text: `從這張名片擷取資訊，只回傳 JSON，不要有任何其他文字、說明或 markdown：
{"nameZh":"","nameEn":"","title":"","company":"","email":"","phone":"","address":"","website":""}` }
              ]
            }],
            generationConfig: { temperature: 0, maxOutputTokens: 1024 }
          })
        }
      );

      const data = await r.json();

      if (data.error) throw new Error(data.error.message);

      console.log("Gemini raw response:", JSON.stringify(data));
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      // 容錯解析：用正則抓出 JSON 物件
      const match = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : "{}");
      setExtracted({ ...parsed, tags: [], note: "" });

    } catch (e) {
  console.error("Gemini error FULL:", e);
      setError("辨識失敗，請重試或手動填寫");
      setExtracted({ nameZh: "", nameEn: "", title: "", company: "", email: "", phone: "", address: "", website: "", tags: [], note: "" });
    }
    setLoading(false);
  };

  const handleSave = () => {
    onSave({
      ...extracted,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      source: "scan",
      synced: { notion: false, phoneContacts: false },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-3xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ScanLine className="text-blue-500" size={20} />
            <span className="font-bold text-gray-900">掃描名片</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!preview ? (
            <div
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current.click()}
              className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
            >
              <Camera className="mx-auto text-gray-300 mb-3" size={44} />
              <p className="font-medium text-gray-600 mb-1">點擊上傳名片照片</p>
              <p className="text-sm text-gray-400">或拖拽圖片到這裡 · JPG / PNG</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img src={preview} alt="名片預覽" className="w-full rounded-xl object-contain max-h-52 bg-gray-50" />
                <button
                  onClick={() => { setPreview(null); setFile(null); setExtracted(null); setError(null); }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                >
                  <X size={14} />
                </button>
              </div>

              {!extracted && (
                <button onClick={extractData} disabled={loading}
                  className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-600 disabled:opacity-60 transition-colors">
                  {loading
                    ? <><Loader2 size={18} className="animate-spin" />AI 辨識中...</>
                    : <><ScanLine size={18} />開始辨識</>}
                </button>
              )}

              {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

              {extracted && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Check size={16} className="text-green-500" />辨識完成，請確認後儲存
                  </div>
                  {[
                    ["nameZh", "中文姓名"],
                    ["nameEn", "英文姓名"],
                    ["title",  "職稱"],
                    ["company","公司"],
                    ["email",  "Email"],
                    ["phone",  "電話"],
                    ["address","地址"],
                    ["website","網站"],
                    ["note",   "備註"],
                  ].map(([k, label]) => (
                    <div key={k}>
                      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                      <input
                        value={extracted[k] || ""}
                        onChange={e => setExtracted(p => ({ ...p, [k]: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {extracted && (
          <div className="px-5 pb-5 pt-3 border-t border-gray-100">
            <button onClick={handleSave}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors">
              儲存並同步
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EditModal ────────────────────────────────────────────────────────────────
function EditModal({ contact, onClose, onSave }) {
  const [form, setForm]     = useState({ ...contact });
  const [newTag, setNewTag] = useState("");

  const addTag = () => {
    if (newTag.trim() && !form.tags?.includes(newTag.trim())) {
      setForm(p => ({ ...p, tags: [...(p.tags || []), newTag.trim()] }));
      setNewTag("");
    }
  };
  const removeTag = t => setForm(p => ({ ...p, tags: p.tags.filter(x => x !== t) }));

  const exportVCard = () => {
    const vcf = `BEGIN:VCARD\nVERSION:3.0\nFN:${form.nameEn || form.nameZh}\nN:${form.nameZh};;;\nORG:${form.company}\nTITLE:${form.title}\nTEL:${form.phone}\nEMAIL:${form.email}\nADR:${form.address}\nURL:${form.website}\nEND:VCARD`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([vcf], { type: "text/vcard" }));
    a.download = `${form.nameZh || form.nameEn || "contact"}.vcf`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-3xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2"><Edit3 size={18} className="text-gray-500" /><span className="font-bold text-gray-900">編輯聯絡人</span></div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {[
            ["nameZh",  "中文姓名", User],
            ["nameEn",  "英文姓名", User],
            ["title",   "職稱",     Filter],
            ["company", "公司",     Building2],
            ["email",   "Email",    Mail],
            ["phone",   "電話",     Phone],
            ["address", "地址",     MapPin],
            ["website", "網站",     Globe],
          ].map(([k, label, Icon]) => (
            <div key={k}>
              <label className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Icon size={11} />{label}</label>
              <input value={form[k] || ""} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">備註</label>
            <textarea value={form.note || ""} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-2 block">標籤</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {form.tags?.map(t => <TagChip key={t} tag={t} onRemove={removeTag} />)}
            </div>
            <div className="flex gap-2">
              <input value={newTag} onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTag()}
                placeholder="輸入標籤後按 Enter"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              <button onClick={addTag} className="px-3 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"><Plus size={16} /></button>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-gray-100 space-y-2">
          <button onClick={exportVCard} className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
            <Download size={15} />匯出 vCard (.vcf)
          </button>
          <button onClick={() => { onSave(form); onClose(); }}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors">
            儲存並同步
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CSVImportModal ───────────────────────────────────────────────────────────
function CSVImportModal({ onClose, onImport }) {
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState([]);
  const fileRef = useRef();

  const mapRow = row => ({
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    createdAt: new Date().toISOString(),
    nameZh:  row["姓名"] || row["中文姓名"] || row["name"] || "",
    nameEn:  row["英文姓名"] || "",
    title:   row["職稱"]  || row["title"]   || "",
    company: row["公司"]  || row["company"] || "",
    email:   row["Email"] || row["email"]   || "",
    phone:   row["電話"]  || row["phone"]   || "",
    address: row["地址"]  || "",
    website: row["website"] || "",
    note:    row["備註"]  || "",
    tags:    (row["標籤"] || "").split(";").map(t => t.trim()).filter(Boolean),
    source: "csv",
    synced: { notion: false, phoneContacts: false },
  });

  const handleFile = f => {
    const reader = new FileReader();
    reader.onload = e => {
      const lines = e.target.result.trim().split("\n")
        .map(l => l.split(",").map(c => c.trim().replace(/^"|"$/g, "")));
      const headers = lines[0];
      const parsed = lines.slice(1).map(row => {
        const o = {};
        headers.forEach((h, i) => { o[h] = row[i] || ""; });
        return mapRow(o);
      });
      setRows(parsed);
      setStep(2);
    };
    reader.readAsText(f, "utf-8");
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2"><FileText size={18} className="text-amber-500" /><span className="font-bold text-gray-900">CSV 匯入</span></div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {step === 1 ? (
            <div onClick={() => fileRef.current.click()}
              className="border-2 border-dashed border-amber-200 rounded-2xl p-12 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-colors">
              <FileText className="mx-auto text-amber-300 mb-3" size={44} />
              <p className="font-medium text-gray-600 mb-1">點擊上傳 CSV 檔案</p>
              <p className="text-sm text-gray-400">支援欄位：姓名 / 公司 / 職稱 / 電話 / Email / 標籤</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-50 text-green-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                <Check size={16} /><span>解析完成：<strong>{rows.length}</strong> 筆聯絡人</span>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {rows.slice(0, 10).map((r, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50">
                    <Avatar contact={r} />
                    <div>
                      <div className="font-medium text-sm text-gray-800">{r.nameZh || r.nameEn}</div>
                      <div className="text-xs text-gray-400">{r.company} · {r.title}</div>
                    </div>
                  </div>
                ))}
                {rows.length > 10 && <p className="text-xs text-center text-gray-400 py-2">...還有 {rows.length - 10} 筆</p>}
              </div>
            </div>
          )}
        </div>

        {step === 2 && (
          <div className="px-5 pb-5 pt-3 border-t border-gray-100">
            <button onClick={() => { onImport(rows); onClose(); }}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors">
              匯入 {rows.length} 筆並同步
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]                   = useState(null);
  const [authReady, setAuthReady]         = useState(false);
  const [emailLoading, setEmailLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [contacts, setContacts]     = useState([]);
  const [dbLoading, setDbLoading]   = useState(false);
  const [syncStatus, setSyncStatus] = useState("idle");

  const [searchQuery, setSearchQuery]       = useState("");
  const [searchMode, setSearchMode]         = useState("all");
  const [selectedIds, setSelectedIds]       = useState([]);
  const [viewMode, setViewMode]             = useState("grid");
  const [activeTag, setActiveTag]           = useState(null);
  const [showScan, setShowScan]             = useState(false);
  const [showCSV, setShowCSV]               = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [toast, setToast]                   = useState(null);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // ── Auth listener ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthReady(true); });
    return unsub;
  }, []);

  // ── Firestore real-time listener ───────────────────────────────────────────
  useEffect(() => {
    if (!user) { setContacts([]); return; }
    setDbLoading(true);
    const q = query(contactsRef(user.uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q,
      snap => {
        setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setDbLoading(false);
        setSyncStatus("ok");
      },
      err => {
        console.error(err);
        setDbLoading(false);
        setSyncStatus("error");
      }
    );
    return unsub;
  }, [user]);

  // ── Auth handlers ──────────────────────────────────────────────────────────
  const handleEmailLogin = async (email, password, mode) => {
    setEmailLoading(true);
    try {
      if (mode === "register") await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setEmailLoading(false);
      return AUTH_ERRORS[e.code] || e.message;
    }
    setEmailLoading(false);
    return null;
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setGoogleLoading(false);
      return AUTH_ERRORS[e.code] || "Google 登入失敗，請重試";
    }
    setGoogleLoading(false);
    return null;
  };

  const handleLogout = async () => {
    await signOut(auth);
    setContacts([]);
    setSyncStatus("idle");
    showToast("已登出");
  };

  // ── Data handlers ──────────────────────────────────────────────────────────
  const saveContact = async contact => {
    if (!user) return;
    setSyncStatus("syncing");
    try {
      const { id, ...data } = contact;
      await setDoc(contactRef(user.uid, id), { ...data, updatedAt: new Date().toISOString() }, { merge: true });
      setSyncStatus("ok");
    } catch (e) {
      setSyncStatus("error");
      showToast("⚠️ 同步失敗，請重試");
    }
  };

  const handleDelete = async id => {
    if (!user) return;
    setContacts(p => p.filter(c => c.id !== id));
    setSelectedIds(p => p.filter(x => x !== id));
    try { await deleteDoc(contactRef(user.uid, id)); showToast("🗑️ 已刪除"); }
    catch (e) { showToast("⚠️ 刪除失敗"); }
  };

  const handleScanSave  = async c => { await saveContact(c); showToast("✅ 名片已儲存並同步"); };
  const handleEditSave  = async c => { await saveContact(c); showToast("✅ 已更新並同步"); };

  const handleCSVImport = async rows => {
    setSyncStatus("syncing");
    try {
      await Promise.all(rows.map(r => saveContact(r)));
      setSyncStatus("ok");
      showToast(`✅ 已匯入並同步 ${rows.length} 筆`);
    } catch (e) {
      setSyncStatus("error");
      showToast("⚠️ 部分匯入失敗");
    }
  };

  const batchDelete = async () => {
    const ids = [...selectedIds];
    setContacts(p => p.filter(c => !ids.includes(c.id)));
    setSelectedIds([]);
    await Promise.all(ids.map(id => deleteDoc(contactRef(user.uid, id))));
    showToast(`🗑️ 已刪除 ${ids.length} 筆`);
  };

  const batchExportVCard = () => {
    const sel = contacts.filter(c => selectedIds.includes(c.id));
    const vcf = sel.map(c =>
      `BEGIN:VCARD\nVERSION:3.0\nFN:${c.nameEn || c.nameZh}\nN:${c.nameZh};;;\nORG:${c.company}\nTITLE:${c.title}\nTEL:${c.phone}\nEMAIL:${c.email}\nEND:VCARD`
    ).join("\n\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([vcf], { type: "text/vcard" }));
    a.download = "contacts.vcf";
    a.click();
    showToast(`📥 已匯出 ${sel.length} 筆`);
  };

  const handleSelect = id => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const allTags  = [...new Set(contacts.flatMap(c => c.tags || []))].sort();
  const filtered = contacts.filter(c => {
    if (activeTag && !c.tags?.includes(activeTag)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (searchMode === "company") return c.company?.toLowerCase().includes(q);
    if (searchMode === "nameZh")  return c.nameZh?.toLowerCase().includes(q);
    if (searchMode === "nameEn")  return c.nameEn?.toLowerCase().includes(q);
    if (searchMode === "tag")     return c.tags?.some(t => t.toLowerCase().includes(q));
    return Object.values(c).join(" ").toLowerCase().includes(q);
  });

  // ── Loading / Auth gate ────────────────────────────────────────────────────
  if (!authReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ScanLine size={22} className="text-white" />
          </div>
          <Loader2 size={24} className="animate-spin text-gray-400 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        onEmailLogin={handleEmailLogin}
        onGoogleLogin={handleGoogleLogin}
        loading={emailLoading}
        googleLoading={googleLoading}
      />
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center">
              <ScanLine size={16} className="text-white" />
            </div>
            <span className="font-black text-gray-900 text-lg hidden sm:block">CardVault</span>
          </div>

          <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-400 transition-colors">
            <Search size={15} className="text-gray-400 flex-shrink-0" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜尋聯絡人..."
              className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder-gray-400 min-w-0" />
            <div className="relative flex-shrink-0">
              <select value={searchMode} onChange={e => setSearchMode(e.target.value)}
                className="appearance-none bg-transparent text-xs text-gray-500 pr-4 cursor-pointer focus:outline-none">
                <option value="all">全部</option>
                <option value="company">公司</option>
                <option value="nameZh">中文姓名</option>
                <option value="nameEn">英文姓名</option>
                <option value="tag">標籤</option>
              </select>
              <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100 select-none">
              {syncStatus === "syncing" && <><Loader2 size={11} className="animate-spin text-blue-400" /><span className="text-gray-400">同步中</span></>}
              {syncStatus === "ok"      && <><Cloud size={11} className="text-green-500" /><span className="text-gray-400">已同步</span></>}
              {syncStatus === "error"   && <><CloudOff size={11} className="text-red-400" /><span className="text-red-400">失敗</span></>}
              {syncStatus === "idle"    && <><RefreshCw size={11} className="text-gray-300" /><span className="text-gray-300">待機</span></>}
            </div>
            <button onClick={() => setViewMode(v => v === "grid" ? "list" : "grid")}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hidden md:flex">
              {viewMode === "grid" ? <List size={18} /> : <Grid3x3 size={18} />}
            </button>
            <button onClick={() => setShowCSV(true)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 hidden sm:flex items-center gap-1.5">
              <FileText size={15} />CSV
            </button>
            <button onClick={() => setShowScan(true)}
              className="px-3 py-2 text-sm bg-gray-900 text-white rounded-xl hover:bg-gray-800 flex items-center gap-1.5 font-medium">
              <Camera size={15} />掃描
            </button>

            <div className="relative group">
              <button className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 hover:border-gray-400 transition-colors flex-shrink-0">
                {user.photoURL
                  ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                      {(user.displayName || user.email)?.[0]?.toUpperCase()}
                    </div>
                }
              </button>
              <div className="absolute right-0 top-10 bg-white border border-gray-100 rounded-2xl shadow-xl p-3 min-w-[190px] opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
                <div className="px-2 pb-2 border-b border-gray-50 mb-2">
                  <p className="font-semibold text-sm text-gray-800 truncate">{user.displayName || "用戶"}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  <p className="text-xs text-gray-300 mt-1">共 {contacts.length} 位聯絡人</p>
                </div>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors">
                  <LogOut size={14} />登出
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4 flex gap-5">
        {/* Sidebar */}
        <aside className="w-48 flex-shrink-0 hidden md:block">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 sticky top-20">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Filter size={11} />標籤篩選
            </div>
            <button onClick={() => setActiveTag(null)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm mb-1 flex items-center justify-between ${!activeTag ? "bg-gray-900 text-white font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
              <span>全部</span>
              <span className={`text-xs ${!activeTag ? "text-white/70" : "text-gray-400"}`}>{contacts.length}</span>
            </button>
            {allTags.map(tag => (
              <button key={tag} onClick={() => setActiveTag(t => t === tag ? null : tag)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm mb-1 flex items-center justify-between ${activeTag === tag ? "bg-blue-500 text-white font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
                <span className="truncate">{tag}</span>
                <span className={`text-xs flex-shrink-0 ${activeTag === tag ? "text-white/70" : "text-gray-400"}`}>
                  {contacts.filter(c => c.tags?.includes(tag)).length}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {activeTag && <span>標籤：<strong className="text-gray-800">{activeTag}</strong> · </span>}
              共 <strong className="text-gray-900">{filtered.length}</strong> 位聯絡人
              {searchQuery && <span> · <strong className="text-blue-600">「{searchQuery}」</strong></span>}
            </p>
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">已選 {selectedIds.length}</span>
              )}
              <button onClick={() => setViewMode(v => v === "grid" ? "list" : "grid")}
                className="p-1.5 rounded-lg hover:bg-white text-gray-400 md:hidden">
                <Grid3x3 size={16} />
              </button>
            </div>
          </div>

          {dbLoading ? (
            <div className="text-center py-20">
              <Loader2 size={32} className="animate-spin mx-auto mb-3 text-blue-400" />
              <p className="text-sm text-gray-400">從雲端載入聯絡人...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <User size={48} className="mx-auto mb-3 opacity-20" />
              <p className="font-medium">
                {contacts.length === 0 ? "還沒有聯絡人" : "沒有符合條件的聯絡人"}
              </p>
              <p className="text-sm mt-1">
                {contacts.length === 0 ? "點擊右上角「掃描」開始建立" : "試試調整搜尋條件"}
              </p>
            </div>
          ) : (
            <div className={viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              : "space-y-2"}>
              {filtered.map(c => (
                <ContactCard key={c.id} contact={c}
                  onEdit={setEditingContact} onDelete={handleDelete}
                  onSelect={handleSelect} isSelected={selectedIds.includes(c.id)}
                  viewMode={viewMode} />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Batch action bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-2xl px-5 py-3 flex items-center gap-4 shadow-2xl z-40">
          <span className="text-sm font-medium">已選 {selectedIds.length} 筆</span>
          <button onClick={batchExportVCard} className="flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition-colors">
            <Download size={14} />匯出 vCard
          </button>
          <button onClick={batchDelete} className="flex items-center gap-1.5 text-sm bg-red-500/80 hover:bg-red-500 px-3 py-1.5 rounded-xl transition-colors">
            <Trash2 size={14} />刪除
          </button>
          <button onClick={() => setSelectedIds([])} className="p-1.5 hover:bg-white/10 rounded-xl">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Mobile FAB */}
      <div className="fixed bottom-6 right-4 sm:hidden z-30">
        <button onClick={() => setShowScan(true)}
          className="w-14 h-14 bg-gray-900 text-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-gray-800 transition-colors">
          <Camera size={22} />
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}

      {showScan && <ScanModal onClose={() => setShowScan(false)} onSave={handleScanSave} />}
      {showCSV  && <CSVImportModal onClose={() => setShowCSV(false)} onImport={handleCSVImport} />}
      {editingContact && (
        <EditModal contact={editingContact} onClose={() => setEditingContact(null)} onSave={handleEditSave} />
      )}
    </div>
  );
}

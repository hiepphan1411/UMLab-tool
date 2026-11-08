// Đọc tiếng Anh bằng giọng máy (Web Speech API, dùng giọng có sẵn của Windows) + tuỳ chọn hiển thị (IPA, nghĩa).
import { create } from 'zustand';

export type Accent = 'en-GB' | 'en-US';

interface SpeechPrefs {
  rate: number;
  accent: Accent;
  showIpa: boolean;
  showMeaning: boolean;
  /** Hiện IPA cả câu dưới mẫu câu / template / bài mẫu. */
  sentenceIpa: boolean;
  set(p: Partial<Omit<SpeechPrefs, 'set'>>): void;
}

const KEY = 'umlab.vstep.speech';

function read(): Partial<SpeechPrefs> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<SpeechPrefs>;
  } catch {
    return {};
  }
}

export const useSpeechPrefs = create<SpeechPrefs>((set, get) => ({
  rate: 0.9,
  accent: 'en-GB',
  showIpa: true,
  showMeaning: true,
  sentenceIpa: false,
  ...read(),
  set(p) {
    set(p);
    const { rate, accent, showIpa, showMeaning, sentenceIpa } = { ...get(), ...p };
    try {
      localStorage.setItem(KEY, JSON.stringify({ rate, accent, showIpa, showMeaning, sentenceIpa }));
    } catch {}
  },
}));

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
const MALE = /david|mark|george|guy|ryan|james|male/i;
const FEMALE = /zira|hazel|susan|aria|jenny|libby|sonia|female/i;

function voices(): SpeechSynthesisVoice[] {
  return synth?.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en')) ?? [];
}

function pickVoice(gender?: 'male' | 'female'): SpeechSynthesisVoice | undefined {
  const { accent } = useSpeechPrefs.getState();
  const all = voices();
  const byAccent = all.filter((v) => v.lang.replace('_', '-').toLowerCase() === accent.toLowerCase());
  const pool = byAccent.length ? byAccent : all;
  if (gender === 'male') return pool.find((v) => MALE.test(v.name)) ?? all.find((v) => MALE.test(v.name)) ?? pool[0];
  if (gender === 'female')
    return pool.find((v) => FEMALE.test(v.name)) ?? all.find((v) => FEMALE.test(v.name)) ?? pool[0];
  return pool[0];
}

export const canSpeak = () => !!synth;

export function stopSpeaking(): void {
  synth?.cancel();
}

/** Đọc một đoạn; trả Promise xong khi đọc hết (hoặc bị dừng). */
export function speak(text: string, o: { gender?: 'male' | 'female'; rate?: number } = {}): Promise<void> {
  return new Promise((done) => {
    if (!synth || !text.trim()) return done();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(o.gender);
    if (v) u.voice = v;
    u.lang = v?.lang ?? useSpeechPrefs.getState().accent;
    u.rate = o.rate ?? useSpeechPrefs.getState().rate;
    u.onend = () => done();
    u.onerror = () => done();
    synth.speak(u);
  });
}

export function sayNow(text: string): void {
  stopSpeaking();
  void speak(text);
}

/** Đọc lời thoại: dòng "Man:"/"Woman:"/"Speaker 1:" đổi giọng nam/nữ. */
export async function speakScript(script: string, isCancelled: () => boolean): Promise<void> {
  stopSpeaking();
  let gender: 'male' | 'female' = 'female';
  for (const raw of script.split(/\n+/)) {
    if (isCancelled()) return;
    const m = /^\s*([A-Za-z][\w .]{0,20}?)\s*\d*\s*:\s*(.*)$/.exec(raw);
    let line = raw;
    if (m) {
      const who = m[1].toLowerCase();
      if (/^(man|boy|mr|male|he|john|tom|peter|david)/.test(who)) gender = 'male';
      else if (/^(woman|girl|mrs|ms|female|she|mary|anna|lisa|kate)/.test(who)) gender = 'female';
      line = m[2];
    }
    await speak(line, { gender });
  }
}

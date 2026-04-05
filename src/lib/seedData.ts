import { db } from '../firebase';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';

export const defaultLessons = [
  {
    title: "Introduction to Computer",
    category: "Basics",
    level: "Basic",
    textContent: "A computer is an electronic device that processes data. It has two main parts: Hardware and Software. Hardware are the physical parts you can touch, like the keyboard and CPU. Software are the programs that run on the computer. For visually impaired users, the most important software is a Screen Reader, which speaks out what is on the screen.",
    language: "en",
    order: 1,
    audioUrl: ""
  },
  {
    title: "കമ്പ്യൂട്ടർ - ഒരു ആമുഖം",
    category: "അടിസ്ഥാനം",
    level: "Basic",
    textContent: "വിവരങ്ങൾ സംസ്കരിക്കാൻ ഉപയോഗിക്കുന്ന ഒരു ഇലക്ട്രോണിക് ഉപകരണമാണ് കമ്പ്യൂട്ടർ. ഇതിന് പ്രധാനമായും രണ്ട് ഭാഗങ്ങളുണ്ട്: ഹാർഡ്‌വെയറും സോഫ്റ്റ്‌വെയറും. കീബോർഡ്, സി.പി.യു എന്നിവ പോലെ നമുക്ക് തൊടാൻ കഴിയുന്ന ഭാഗങ്ങളാണ് ഹാർഡ്‌വെയർ. കമ്പ്യൂട്ടറിൽ പ്രവർത്തിക്കുന്ന പ്രോഗ്രാമുകളെ സോഫ്റ്റ്‌വെയർ എന്ന് വിളിക്കുന്നു. കാഴ്ചപരിമിതിയുള്ളവർക്ക് സ്ക്രീനിലുള്ള കാര്യങ്ങൾ വായിച്ചു കേൾപ്പിക്കുന്ന 'സ്ക്രീൻ റീഡർ' ആണ് ഏറ്റവും പ്രധാനപ്പെട്ട സോഫ്റ്റ്‌വെയർ.",
    language: "ml",
    order: 1,
    audioUrl: ""
  },
  {
    title: "Keyboard Usage",
    category: "Basics",
    level: "Basic",
    textContent: "The keyboard is the primary input device for visually impaired users. It has several sections: \n1. Alphanumeric keys (Letters and Numbers)\n2. Function keys (F1 to F12 at the top)\n3. Navigation keys (Arrow keys, Home, End, Page Up, Page Down)\n4. Numeric keypad (on the right side)\n5. Modifier keys (Ctrl, Alt, Shift, and the Windows key). \nLearning the position of these keys is essential for independent computer usage.",
    language: "en",
    order: 2,
    audioUrl: ""
  },
  {
    title: "കീബോർഡ് ഉപയോഗം",
    category: "അടിസ്ഥാനം",
    level: "Basic",
    textContent: "കാഴ്ചപരിമിതിയുള്ളവർക്ക് കമ്പ്യൂട്ടർ പ്രവർത്തിപ്പിക്കാനുള്ള പ്രധാന ഉപകരണം കീബോർഡ് ആണ്. ഇതിൽ പ്രധാനമായും താഴെ പറയുന്ന ഭാഗങ്ങളുണ്ട്: \n1. അക്ഷരങ്ങളും അക്കങ്ങളും ഉള്ള കീകൾ\n2. ഫംഗ്ഷൻ കീകൾ (മുകളിൽ കാണുന്ന F1 മുതൽ F12 വരെ)\n3. നാവിഗേഷൻ കീകൾ (ആരോ കീകൾ, ഹോം, എൻഡ് തുടങ്ങിയവ)\n4. നമ്പറുകൾ മാത്രമുള്ള കീപാഡ് (വലതുവശത്ത്)\n5. മോഡിഫയർ കീകൾ (Ctrl, Alt, Shift, Windows കീ). \nഈ കീകളുടെ സ്ഥാനം മനസ്സിലാക്കുന്നത് കമ്പ്യൂട്ടർ സ്വതന്ത്രമായി ഉപയോഗിക്കാൻ അത്യാവശ്യമാണ്.",
    language: "ml",
    order: 2,
    audioUrl: ""
  },
  {
    title: "How to Stop (Ctrl Key)",
    category: "Basics",
    level: "Basic",
    textContent: "When using a screen reader, it can sometimes talk too much. The most important key to remember is the 'Control' (Ctrl) key. Pressing the Ctrl key once will immediately stop the screen reader from speaking. This is very useful when you want to stop the computer from reading a long text or when you have heard enough information.",
    language: "en",
    order: 3,
    audioUrl: ""
  },
  {
    title: "വായന നിർത്താൻ (Ctrl കീ)",
    category: "അടിസ്ഥാനം",
    level: "Basic",
    textContent: "സ്ക്രീൻ റീഡർ ഉപയോഗിക്കുമ്പോൾ, അത് ചിലപ്പോൾ ഒരുപാട് കാര്യങ്ങൾ ഒരേസമയം വായിച്ചേക്കാം. അത് നിർത്താൻ ഏറ്റവും പ്രധാനമായി ഓർക്കേണ്ടത് 'കൺട്രോൾ' (Ctrl) കീ ആണ്. Ctrl കീ ഒരു തവണ അമർത്തിയാൽ സ്ക്രീൻ റീഡർ വായന ഉടൻ തന്നെ നിർത്തും. വലിയൊരു ലേഖനം വായിക്കുമ്പോഴോ അല്ലെങ്കിൽ നിങ്ങൾക്ക് ആവശ്യമുള്ള വിവരം ലഭിച്ചു കഴിഞ്ഞാലോ വായന നിർത്താൻ ഇത് വളരെ ഉപകാരപ്രദമാണ്.",
    language: "ml",
    order: 3,
    audioUrl: ""
  },
  {
    title: "NVDA Screen Reader & Shortcuts",
    category: "Screen Reader",
    level: "Basic",
    textContent: "NVDA (NonVisual Desktop Access) is a free screen reader for Windows. \nUseful Shortcuts:\n- NVDA + N: Open NVDA Menu\n- NVDA + Q: Exit NVDA\n- NVDA + S: Speech Mode (Talk, Beep, Off)\n- NVDA + Down Arrow: Read from current position\n- NVDA + Up Arrow: Read current line\n- NVDA + T: Read window title\n- Ctrl: Stop speech immediately.",
    language: "en",
    order: 4,
    audioUrl: ""
  },
  {
    title: "NVDA സ്ക്രീൻ റീഡറും ഷോർട്ട്കട്ടുകളും",
    category: "സ്ക്രീൻ റീഡർ",
    level: "Basic",
    textContent: "വിൻഡോസ് കമ്പ്യൂട്ടറുകൾക്കായി സൗജന്യമായി ലഭിക്കുന്ന ഒരു സ്ക്രീൻ റീഡറാണ് NVDA. \nപ്രധാന ഷോർട്ട്കട്ടുകൾ:\n- NVDA + N: NVDA മെനു തുറക്കാൻ\n- NVDA + Q: NVDA നിർത്താൻ\n- NVDA + S: സ്പീച്ച് മോഡ് മാറ്റാൻ\n- NVDA + Down Arrow: തുടർച്ചയായി വായിക്കാൻ\n- NVDA + Up Arrow: നിലവിലുള്ള വരി വായിക്കാൻ\n- NVDA + T: വിൻഡോയുടെ പേര് അറിയാൻ\n- Ctrl: വായന പെട്ടെന്ന് നിർത്താൻ.",
    language: "ml",
    order: 4,
    audioUrl: ""
  },
  {
    title: "Sample Audio Lesson",
    category: "Basics",
    level: "Basic",
    textContent: "This is a sample lesson with an embedded audio player. You can listen to the audio below:\n\n<audio controls class='w-full mt-4'>\n  <source src='https://drive.google.com/uc?export=download&id=1AbCDeFg12345' type='audio/mp3'>\n</audio>",
    language: "en",
    order: 5,
    audioUrl: ""
  },
  {
    title: "ഓഡിയോ പാഠം മാതൃക",
    category: "അടിസ്ഥാനം",
    level: "Basic",
    textContent: "ഇതൊരു ഓഡിയോ പാഠത്തിന്റെ മാതൃകയാണ്. താഴെ നൽകിയിരിക്കുന്ന പ്ലെയർ ഉപയോഗിച്ച് നിങ്ങൾക്ക് ഇത് കേൾക്കാം:\n\n<audio controls class='w-full mt-4'>\n  <source src='https://drive.google.com/uc?export=download&id=1AbCDeFg12345' type='audio/mp3'>\n</audio>",
    language: "ml",
    order: 5,
    audioUrl: ""
  }
];

export const seedLessons = async () => {
  const lessonsCol = collection(db, 'lessons');
  const snapshot = await getDocs(lessonsCol);
  const existingTitles = snapshot.docs.map(doc => doc.data().title);
  
  let addedCount = 0;
  for (const lesson of defaultLessons) {
    if (!existingTitles.includes(lesson.title)) {
      console.log(`Seeding lesson: ${lesson.title}`);
      await addDoc(lessonsCol, {
        ...lesson,
        createdAt: new Date()
      });
      addedCount++;
    }
  }
  
  return addedCount > 0;
};

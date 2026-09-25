import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useOffline } from '../../context/OfflineContext';

export default function KrishiSetuAIAssistant({ isOpen, setIsOpen }) {
  const { lang, setLang, t } = useLanguage();
  const { isOnline, lastSavedLocation } = useOffline();

  const [messages, setMessages] = useState(() => {
    return [
      {
        id: 'msg_welcome',
        sender: 'ai',
        text: {
          en: 'Hello! I am your KrishiSetu AI Assistant. Ask me about nearby mandi prices, net transport outcomes, quality grading, or FPO pooling.',
          mr: 'नमस्कार! मी तुमचा कृषी-सेतू एआय सहाय्यक आहे. मला जवळील बाजार भाव, वाहतूक खर्च वजा जाता निव्वळ नफा, गुणवत्ता प्रतवारी किंवा FPO पूलिंगबद्दल विचारा.',
          hi: 'नमस्ते! मैं आपका कृषि-सेतु एआई सहायक हूँ। मुझसे निकटतम मंडी भाव, परिवहन लागत घटाकर शुद्ध मुनाफा, गुणवत्ता ग्रेडिंग या FPO पूलिंग के बारे में पूछें.',
        },
        time: '09:30 AM',
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Global trigger for Voice button in Navbar
  useEffect(() => {
    const handleVoiceTrigger = () => {
      setIsOpen(true);
      startVoiceListening();
    };
    window.addEventListener('krishisetu_open_voice', handleVoiceTrigger);
    return () => window.removeEventListener('krishisetu_open_voice', handleVoiceTrigger);
  }, []);

  const getKnowledgeResponse = (query, currentLang) => {
    const q = query.toLowerCase();

    // 1. Tomato prices / prices
    if (q.includes('tomato') || q.includes('टोमॅटो') || q.includes('टमाटर') || q.includes('price') || q.includes('भाव') || q.includes('दाम')) {
      if (currentLang === 'mr') {
        return 'बारामती एपीएमसीमध्ये आज टोमॅटोचा मॉडेल भाव ₹१,६५५/क्विंटल आहे. पुणे गुलटेकडी येथे ₹१,८२०/क्विंटल आहे. परंतु ८४.५ किमी वाहतूक खर्च (₹२१०/क्विंटल) वजा करता, बारामतीमध्ये तुम्हाला ₹१,६५५ चा उत्तम निव्वळ नफा मिळतो!';
      }
      if (currentLang === 'hi') {
        return 'बारामती एपीएमसी में आज टमाटर का मॉडल भाव ₹1,655/क्विंटल है. पुणे गुलटेकड़ी में ₹1,820/क्विंटल है. लेकिन ₹210 परिवहन खर्च घटाकर, बारामती एपीएमसी में आपको ₹45/क्विंटल अधिक शुद्ध मुनाफा मिलेगा!';
      }
      return "Today's modal tomato price at Baramati APMC is ₹1,655/qtl (0 km). Pune Gultekdi is ₹1,820/qtl, but after subtracting ₹210/qtl transport cost for 84.5 km, selling at Baramati APMC yields ₹45/qtl higher net return!";
    }

    // 2. Best net return / Mandi comparison
    if (q.includes('net') || q.includes('return') || q.includes('mandi') || q.includes('नफा') || q.includes('तुलना') || q.includes('मुनाफा')) {
      if (currentLang === 'mr') {
        return 'निव्वळ नफा विश्लेषण (Net Mandi Compare): \n१. बारामती APMC: ₹१,६५५/क्विंटल (वाहतूक ₹०) = निव्वळ ₹१,६५५ \n२. पुणे गुलटेकडी: ₹१,८२० (वाहतूक ₹२१०) = निव्वळ ₹१,६१० \n३. पंढरपूर APMC: ₹१,७४० (वाहतूक ₹१४५) = निव्वळ ₹१,५९५ \nसल्ला: बारामती क्लस्टर शेतकऱ्यांसाठी आज बारामती APMC सर्वोत्तम आहे!';
      }
      if (currentLang === 'hi') {
        return 'शुद्ध लाभ तुलना (Net Mandi Compare): \n1. बारामती APMC: ₹1,655/क्विंटल (परिवहन ₹0) = शुद्ध ₹1,655 \n2. पुणे गुलटेकड़ी: ₹1,820 (परिवहन ₹210) = शुद्ध ₹1,610 \n3. पंढरपुर APMC: ₹1,740 (परिवहन ₹145) = शुद्ध ₹1,595 \nसलाह: आज बारामती APMC में बेचना सबसे अधिक लाभदायक है!';
      }
      return 'Net Mandi Compare Analysis: \n1. Baramati APMC: ₹1,655/qtl (₹0 transport) = Net ₹1,655 \n2. Pune Gultekdi: ₹1,820/qtl (₹210 transport) = Net ₹1,610 \n3. Pandharpur APMC: ₹1,740/qtl (₹145 transport) = Net ₹1,595 \nRecommendation: Baramati APMC gives the maximum in-hand profit today!';
    }

    // 3. FPO Pooling
    if (q.includes('pool') || q.includes('fpo') || q.includes('पूल') || q.includes('एकत्रीकरण')) {
      if (currentLang === 'mr') {
        return 'एफपीओ पूलिंग (FPO Pooling) मध्ये शेतकरी आपली पिके एकत्र करतात (उदा. ४५० किलो + ७५० किलो = १,२०० किलो). यामुळे मोठे संस्थात्मक खरेदीदार (Corporate Buyers) थेट शेतावरून जास्त दराने खरेदी करतात आणि वाहतूक खर्च ४०% वाचतो!';
      }
      if (currentLang === 'hi') {
        return 'एफपीओ पूलिंग (FPO Pooling) में किसान अपनी छोटी फसलों को जोड़कर बड़ा लॉट बनाते हैं (जैसे 450 kg + 750 kg = 1,200 kg). इससे कॉर्पोरेट खरीदार 15-20% बेहतर भाव देते हैं और माल ढुलाई लागत 40% घट जाती है!';
      }
      return 'FPO Pooling combines multiple smallholder harvests (e.g. 450 kg + 750 kg = 1,200 kg batch). This unlocks bulk institutional buyer bids at premium rates and reduces collective freight costs by up to 40%!';
    }

    // 4. Offline mode
    if (q.includes('offline') || q.includes('ऑफलाइन') || q.includes('sync') || q.includes('सिंक')) {
      if (currentLang === 'mr') {
        return 'ऑफलाइन मोडमध्ये तुम्ही इंटरनेट नसतानाही पिके नोंदवू शकता आणि पूलिंग करू शकता. तुमचा डेटा सुरक्षित स्थानिक ब्राउझर मेमरीमध्ये जतन होतो आणि इंटरनेट सुरू होताच आपोआप थेट बाजारपेठेशी सिंक होतो!';
      }
      if (currentLang === 'hi') {
        return 'ऑफलाइन मोड में आप बिना इंटरनेट के भी फसल लॉट दर्ज कर सकते हैं. सभी डेटा स्थानीय स्टोरेज में कतारबद्ध रहेगा और इंटरनेट जुड़ते ही स्वचालित रूप से सिंक हो जाएगा!';
      }
      return 'In Offline Mode, you can draft crop lots and join pools without active internet. All actions queue safely in your local browser storage and auto-sync to the APMC grid the moment your connection is restored!';
    }

    // 5. Quality Grading
    if (q.includes('grade') || q.includes('quality') || q.includes('प्रत') || q.includes('गुणवत्ता')) {
      if (currentLang === 'mr') {
        return 'एआय व्हिज्युअल प्रतवारी ३ निकषांवर कार्य करते: एकसमान रंग (Uniformity), डागांचे प्रमाण (<५% Grade A साठी) आणि आकार. ग्रेड A उत्पादनास बाजारात १०-१५% जास्त प्रिमियम मिळतो.';
      }
      if (currentLang === 'hi') {
        return 'एआई विजुअल ग्रेडिंग 3 मानकों पर जांची जाती है: एकसमान रंग, दोष रहित सतह (<5% ग्रेड A के लिए) और आकार. ग्रेड A फसल को बाज़ार में 10-15% अतिरिक्त प्रीमियम मिलता है.';
      }
      return 'Visual AI grading assesses 3 parameters: color uniformity, defect tolerance (<5% for Grade A), and size calibration. Grade A produce commands a 10-15% price premium from agribusiness buyers.';
    }

    // Default Fallback
    if (currentLang === 'mr') {
      return `मी तुमचे स्थान (${lastSavedLocation}) आणि चालू बाजार भाव तपासले आहेत. तुम्ही जवळील बाजार भाव, FPO पूलिंग किंवा थेट खरेदीदार ऑफर्सबद्दल अधिक विचारू शकता.`;
    }
    if (currentLang === 'hi') {
      return `मैंने आपका स्थान (${lastSavedLocation}) और चालू मंडी भाव जांचे हैं. आप निकटतम मंडियों, FPO पूलिंग या ग्रेडिंग के बारे में कोई भी प्रश्न पूछ सकते हैं.`;
    }
    return `I checked your location (${lastSavedLocation}) and live APMC grid data. Feel free to ask about nearby mandi prices, net transport outcomes, quality grading, or FPO pooling.`;
  };

  const handleSend = (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      const responseText = getKnowledgeResponse(query, lang);
      const aiMsg = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      speakText(responseText);
    }, 450);
  };

  const speakText = (text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (lang === 'mr') utterance.lang = 'mr-IN';
      else if (lang === 'hi') utterance.lang = 'hi-IN';
      else utterance.lang = 'en-IN';

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  const startVoiceListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      handleSend(lang === 'mr' ? 'माझ्या जवळ टोमॅटोचा भाव काय आहे?' : lang === 'hi' ? 'मेरे पास टमाटर का भाव क्या है?' : "What is today's tomato price near me?");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang === 'mr' ? 'mr-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) {
          handleSend(transcript);
        }
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: `msg_welcome_${Date.now()}`,
        sender: 'ai',
        text: {
          en: 'Hello! I am your KrishiSetu AI Assistant. Ask me about nearby mandi prices, net transport outcomes, quality grading, or FPO pooling.',
          mr: 'नमस्कार! मी तुमचा कृषी-सेतू एआय सहाय्यक आहे. मला जवळील बाजार भाव, वाहतूक खर्च वजा जाता निव्वळ नफा, गुणवत्ता प्रतवारी किंवा FPO पूलिंगबद्दल विचारा.',
          hi: 'नमस्ते! मैं आपका कृषि-सेतु एआई सहायक हूँ। मुझसे निकटतम मंडी भाव, परिवहन लागत घटाकर शुद्ध मुनाफा, गुणवत्ता ग्रेडिंग या FPO पूलिंग के बारे में पूछें.',
        },
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-[#2A5124] hover:bg-[#1f3c1b] text-white p-3.5 md:px-5 md:py-3.5 rounded-full shadow-2xl flex items-center gap-2.5 border-2 border-[#D3D67A] transition-all hover:scale-105 active:scale-95 cursor-pointer group"
        title="Open KrishiSetu AI Assistant"
      >
        <div className="relative">
          <span className="text-xl">🤖</span>
          <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'} ring-2 ring-[#2A5124]`}></span>
        </div>
        <span className="hidden md:inline font-bold text-sm tracking-tight text-[#D3D67A]">
          {t('ai_assistant_title', 'KrishiSetu AI')}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[410px] h-[540px] max-h-[85vh] bg-white dark:bg-[#132215] rounded-2xl shadow-2xl border-2 border-stone-200/90 dark:border-[#D1BF4B]/30 border-t-4 border-t-[#255919] dark:border-t-[#D1BF4B] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
      {/* Header matching screenshot */}
      <div className="bg-gradient-to-r from-[#255919] to-[#1e3e15] dark:from-[#132215] dark:to-[#162719] text-white px-4 py-3 border-b border-emerald-800/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-700/60 border border-[#D1BF4B]/50 flex items-center justify-center text-base">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm leading-tight text-white">
                {t('ai_assistant_title', 'KrishiSetu AI Assistant')}
              </h3>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isOnline ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40' : 'bg-amber-500/30 text-amber-200 border border-amber-400/40'}`}>
                {isOnline ? 'Online' : 'Offline Mode'}
              </span>
            </div>
            <p className="text-[11px] text-stone-300 font-medium flex items-center gap-1">
              <span>📍</span> {lastSavedLocation}
            </p>
          </div>
        </div>

        {/* Language & Actions */}
        <div className="flex items-center gap-1.5">
          <div className="bg-black/30 rounded-lg p-0.5 flex text-[10px] font-bold border border-white/10">
            {['mr', 'hi', 'en'].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-1.5 py-0.5 rounded transition ${lang === l ? 'bg-[#D1BF4B] text-[#255919]' : 'text-stone-300 hover:text-white'}`}
              >
                {l === 'mr' ? 'मराठी' : l === 'hi' ? 'हिंदी' : 'EN'}
              </button>
            ))}
          </div>

          <button
            onClick={clearChat}
            className="p-1.5 text-stone-300 hover:text-white rounded hover:bg-white/10 transition"
            title="Clear Chat"
          >
            🗑️
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-stone-300 hover:text-white rounded hover:bg-white/10 transition font-bold"
            title="Close Assistant"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAF7] dark:bg-[#132215]">
        {messages.map((m) => {
          const isAi = m.sender === 'ai';
          const textContent = typeof m.text === 'object' ? (m.text[lang] || m.text.en) : m.text;

          return (
            <div
              key={m.id}
              className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}
            >
              {isAi && (
                <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400 mb-1 px-1">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300">🌾 KrishiSetu AI</span>
                  <span>•</span>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded-full border border-emerald-300 dark:border-emerald-800">
                    Live APMC
                  </span>
                  <button
                    onClick={() => speakText(textContent)}
                    className="p-1 text-stone-500 hover:text-emerald-700 dark:hover:text-[#D1BF4B] transition"
                    title="Read Aloud"
                  >
                    🔊
                  </button>
                </div>
              )}

              <div
                className={`max-w-[88%] p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed shadow-xs whitespace-pre-line ${
                  isAi
                    ? 'bg-white dark:bg-[#162719] text-stone-800 dark:text-stone-100 border border-stone-200/80 dark:border-emerald-900/60 rounded-tl-xs'
                    : 'bg-gradient-to-r from-[#255919] to-[#386b24] text-white rounded-tr-xs font-medium shadow-xs'
                }`}
              >
                {textContent}
              </div>

              <span className="text-[10px] text-stone-400 mt-1 px-1">
                {m.time}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompt chips */}
      <div className="px-3 py-2 bg-stone-100/90 dark:bg-[#162719] border-t border-stone-200/80 dark:border-emerald-900/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-[11px]">
        {[
          { key: 'ask_tomato', fallback: "What is today's tomato price near me?" },
          { key: 'ask_net', fallback: 'Which mandi gives me the best net return?' },
          { key: 'ask_fpo', fallback: 'How does FPO pooling work?' },
          { key: 'ask_offline', fallback: 'How does offline mode sync work?' },
        ].map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => handleSend(t(chip.key, chip.fallback))}
            className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white dark:bg-[#182b1c] text-stone-700 dark:text-stone-200 border border-stone-300/80 dark:border-emerald-800/60 hover:border-emerald-500 dark:hover:border-emerald-600 transition shadow-2xs font-medium"
          >
            {t(chip.key, chip.fallback)}
          </button>
        ))}
      </div>

      {/* Input footer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-white dark:bg-[#132215] border-t border-stone-200 dark:border-emerald-900/60 flex items-center gap-2 shrink-0"
      >
        <button
          type="button"
          onClick={startVoiceListening}
          className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-center shrink-0 ${
            isListening
              ? 'bg-red-500 text-white border-red-600 animate-pulse'
              : 'bg-stone-100 hover:bg-stone-200 dark:bg-[#182b1c] dark:hover:bg-[#203a25] text-stone-700 dark:text-stone-200 border-stone-300 dark:border-emerald-800/60'
          }`}
          title="Speak your question (Voice Input)"
        >
          🎙️
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? 'Listening...' : t('ai_input_placeholder', 'Type or speak your question...')}
          className="flex-1 bg-stone-50 dark:bg-[#162719] text-stone-900 dark:text-stone-100 text-xs md:text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-emerald-900/60 focus:outline-none focus:ring-2 focus:ring-[#2A5124] dark:focus:ring-[#D3D67A]"
        />

        <button
          type="submit"
          disabled={!input.trim()}
          className="bg-[#2A5124] hover:bg-[#1e3b1a] dark:bg-[#D3D67A] dark:hover:bg-[#c2c56a] text-white dark:text-[#1c3618] p-2.5 rounded-xl font-bold transition disabled:opacity-40 cursor-pointer shadow-md flex items-center justify-center shrink-0"
          title="Send"
        >
          ➤
        </button>
      </form>
    </div>
  );
}

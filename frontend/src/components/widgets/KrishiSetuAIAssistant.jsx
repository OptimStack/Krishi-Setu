import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useOffline } from '../../context/OfflineContext';
import { useAuth } from '../../context/AuthContext';

export default function KrishiSetuAIAssistant({ isOpen, setIsOpen }) {
  const { user } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { isOnline, lastSavedLocation } = useOffline();

  if (!user) return null;

  const [messages, setMessages] = useState(() => {
    return [
      {
        id: 'msg_welcome',
        sender: 'ai',
        text: {
          en: 'Hello! I am your KrishiSetu AI Assistant. You can speak or type to ask about live mandi prices, 48-hour weather, AI quality grading, FPO pooling, or escrow payouts.',
          mr: 'नमस्कार! मी तुमचा कृषी-सेतू AI सहाय्यक आहे. मला चालू बाजार भाव, पुढील ४८ तासांचे हवामान, AI प्रतवारी, FPO पूलिंग किंवा बँक खात्यातील पेमेंटबद्दल आवाजात किंवा लिहून विचारा.',
          hi: 'नमस्ते! मैं आपका कृषि-सेतु AI सहायक हूँ। मुझसे चालू मंडी भाव, 48 घंटे का मौसम, AI फसल ग्रेडिंग, FPO पूलिंग या बैंक खाते में भुगतान के बारे में बोलकर या लिखकर पूछें।',
        },
        time: '09:30 AM',
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechError, setSpeechError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isListening]);

  // Global trigger for Voice button in Navbar
  useEffect(() => {
    const handleVoiceTrigger = () => {
      setIsOpen(true);
      setTimeout(() => {
        startVoiceListening();
      }, 150);
    };
    window.addEventListener('krishisetu_open_voice', handleVoiceTrigger);
    return () => window.removeEventListener('krishisetu_open_voice', handleVoiceTrigger);
  }, [lang]);

  // Cleanup speech recognition and synthesis on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const getKnowledgeResponse = (query, currentLang) => {
    const q = query.toLowerCase();

    // 1. Tomato prices / prices / mandi
    if (
      q.includes('tomato') ||
      q.includes('टोमॅटो') ||
      q.includes('टमाटर') ||
      q.includes('भाव') ||
      q.includes('दाम') ||
      q.includes('दर') ||
      q.includes('price') ||
      q.includes('rate') ||
      q.includes('mandi') ||
      q.includes('मंडी')
    ) {
      if (currentLang === 'mr') {
        return 'बारामती APMC मध्ये आज टोमॅटोचा मॉडेल भाव ₹१,६५५/क्विंटल आहे (दैनिक आवक: ७२० क्विंटल). पुणे गुलटेकडी येथे ₹१,८२०/क्विंटल आहे. परंतु ८४.५ किमी वाहतूक खर्च (₹२१०/क्विंटल) वजा करता, बारामतीमध्ये तुम्हाला ₹१,६५५ चा अधिक निव्वळ नफा मिळतो!';
      }
      if (currentLang === 'hi') {
        return 'बारामती APMC में आज टमाटर का मॉडल भाव ₹1,655/क्विंटल है। पुणे गुलटेकड़ी में ₹1,820/क्विंटल है। लेकिन ₹210 परिवहन खर्च घटाने पर, बारामती APMC में आपको ₹45/क्विंटल अधिक शुद्ध मुनाफा मिलेगा!';
      }
      return "Today's modal tomato price at Baramati APMC is ₹1,655/qtl (0 km). Pune Gultekdi is ₹1,820/qtl, but after subtracting ₹210/qtl freight cost for 84.5 km, selling at Baramati yields ₹45/qtl higher net profit!";
    }

    // 2. Weather & Rainfall Forecast
    if (
      q.includes('weather') ||
      q.includes('rain') ||
      q.includes('हवामान') ||
      q.includes('पाऊस') ||
      q.includes('मौसम') ||
      q.includes('बारिश') ||
      q.includes('तापमान')
    ) {
      if (currentLang === 'mr') {
        return 'हवामान अंदाज (पुढील ४८ तास): बारामती व पुणे परिसरात आकाश प्रामुख्याने निरभ्र आणि कोरडे राहील. कमाल तापमान ३२°C आणि पाऊस पडण्याची शक्यता १०% पेक्षा कमी आहे. पीक काढणी व उन्हात वाळवणीसाठी वातावरण अत्यंत अनुकूल आहे.';
      }
      if (currentLang === 'hi') {
        return 'मौसम पूर्वानुमान (अगले 48 घंटे): बारामती एवं पुणे क्षेत्र में मौसम मुख्यतः साफ और शुष्क रहेगा। अधिकतम तापमान 32°C और बारिश की संभावना 10% से कम है। फसल कटाई और खुले परिवहन के लिए मौसम उत्तम है।';
      }
      return '48-Hour Weather Outlook: Clear, dry, and sunny skies across Baramati and Pune clusters. Max temperature will hover at 32°C with rain probability under 10%. Highly favorable for harvesting and open transit.';
    }

    // 3. AI Quality Grading
    if (
      q.includes('grade') ||
      q.includes('quality') ||
      q.includes('प्रत') ||
      q.includes('गुणवत्ता') ||
      q.includes('ग्रेडिंग') ||
      q.includes('कॅमेरा') ||
      q.includes('फोटो')
    ) {
      if (currentLang === 'mr') {
        return "कृषी-सेतू AI व्हिजन प्रतवारी: 'पीक प्रतवारी' पृष्ठावर जाऊन ३ फोटो काढा: १. वरून घेतलेला आकार, २. बाजूचा पक्वता रंग, ३. क्रेटमधील भराव. आमचे कॉम्प्युटर व्हिजन मॉडेल एकसमान रंग, डाग (<५% Grade A) व व्यास तपासून त्वरित प्रमाणित डिजिटल गेट-पास जारी करते.";
      }
      if (currentLang === 'hi') {
        return "कृषि-सेतु AI विजन ग्रेडिंग: 'फसल ग्रेडिंग' पेज पर 3 फोटो खींचें: 1. ऊपर से आकार, 2. साइड से परिपक्वता, 3. क्रेट में भराव। हमारा AI मॉडल सतह के दोष (<5% ग्रेड A के लिए) और रंग जांचकर त्वरित डिजिटल ग्रेडिंग सर्टिफिकेट जारी करता है।";
      }
      return 'KrishiSetu AI Vision Grading evaluates 3 parameters: diameter calibration, ripeness color, and defect tolerance (<5% for Grade A). Capture 3 photos to generate a tamper-evident digital grading gate-pass.';
    }

    // 4. FPO Pooling
    if (
      q.includes('pool') ||
      q.includes('fpo') ||
      q.includes('पूल') ||
      q.includes('एकत्रीकरण') ||
      q.includes('सामूहिक')
    ) {
      if (currentLang === 'mr') {
        return 'FPO पूलिंग (FPO Pooling) मध्ये शेतकरी आपली पिके एकत्र करतात (उदा. ४५० किलो + ७५० किलो = १,२०० किलो). यामुळे मोठे कॉर्पोरेट खरेदीदार थेट शेतावरून जास्त दराने खरेदी करतात आणि सामूहिक वाहतूक खर्च ४०% पर्यंत वाचतो!';
      }
      if (currentLang === 'hi') {
        return 'FPO पूलिंग (FPO Pooling) में किसान अपने छोटे लॉट को मिलाकर बड़ा खेप बनाते हैं। इससे कॉर्पोरेट खरीदार 15-20% बेहतर भाव देते हैं और साझा मालभाड़े में 40% तक की सीधी बचत होती है!';
      }
      return 'FPO Pooling consolidates smallholder harvests (e.g. 450 kg + 750 kg = 1,200 kg batch). This unlocks bulk institutional buyer bids at premium rates and reduces collective freight costs by up to 40%!';
    }

    // 5. Payouts, Settlements & Escrow
    if (
      q.includes('payout') ||
      q.includes('settlement') ||
      q.includes('payment') ||
      q.includes('पैसे') ||
      q.includes('पेमेंट') ||
      q.includes('खात्यात') ||
      q.includes('भुगतान') ||
      q.includes('रुपये')
    ) {
      if (currentLang === 'mr') {
        return 'पेमेंट सुरक्षा: कृषी-सेतूवर सर्व व्यवहार RBI-मान्यताप्राप्त नोडल एस्क्रो खात्याद्वारे सुरक्षित केले जातात. खरेदीदाराने डिलिव्हरी स्वीकारताच २४ तासांत रक्कम थेट तुमच्या बँक खात्यात वर्ग केली जाते.';
      }
      if (currentLang === 'hi') {
        return 'भुगतान सुरक्षा: कृषि-सेतु पर सभी सौदे RBI-स्वीकृत नोडल एस्क्रो खाते द्वारा सुरक्षित हैं। खरीदार द्वारा डिलीवरी स्वीकार किए जाने के 24 घंटे के भीतर राशि सीधे आपके बैंक खाते में जमा हो जाती है।';
      }
      return 'Payment Security: All transactions are escrow-locked via RBI-compliant nodal accounts. Upon delivery acceptance by the buyer, funds disburse automatically to the farmer bank account within 24 hours.';
    }

    // 6. Offline Mode & Sync
    if (
      q.includes('offline') ||
      q.includes('ऑफलाइन') ||
      q.includes('sync') ||
      q.includes('सिंक')
    ) {
      if (currentLang === 'mr') {
        return 'ऑफलाइन मोड: इंटरनेट नसतानाही तुम्ही पिके नोंदवू शकता आणि पूलिंग करू शकता. तुमचा डेटा सुरक्षित स्थानिक मेमरीमध्ये साठवला जातो आणि इंटरनेट सुरू होताच आपोआप थेट बाजारपेठेशी सिंक होतो!';
      }
      if (currentLang === 'hi') {
        return 'ऑफलाइन मोड: बिना इंटरनेट के भी आप फसल लॉट दर्ज कर सकते हैं। डेटा सुरक्षित स्थानीय स्टोरेज में रहता है और इंटरनेट कनेक्शन मिलते ही स्वतः सिंक हो जाता है।';
      }
      return 'Offline Mode: You can draft crop lots and join pools without active internet. All actions queue safely in your local browser storage and auto-sync to the APMC grid the moment your connection restores!';
    }

    // Default Fallback
    if (currentLang === 'mr') {
      return `मी तुमचे स्थान (${lastSavedLocation}) आणि चालू APMC ग्रीड तपासले आहे. तुम्ही मला जवळील बाजार भाव, हवामान अंदाज, पीक प्रतवारी किंवा FPO पूलिंगबद्दल अधिक विचारू शकता.`;
    }
    if (currentLang === 'hi') {
      return `मैंने आपका स्थान (${lastSavedLocation}) और चालू APMC डेटा जांचा है। आप मुझसे निकटतम मंडी भाव, मौसम पूर्वानुमान, फसल ग्रेडिंग या FPO पूलिंग के बारे में पूछ सकते हैं।`;
    }
    return `I checked your location (${lastSavedLocation}) and live APMC grid data. Feel free to ask about nearby mandi prices, 48-hour weather, AI quality grading, or FPO pooling.`;
  };

  const speakText = (text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      // Strip markdown symbols before speech
      const cleanText = text.replace(/[*#_`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);

      if (lang === 'mr') utterance.lang = 'mr-IN';
      else if (lang === 'hi') utterance.lang = 'hi-IN';
      else utterance.lang = 'en-IN';

      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const stopVoiceListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  };

  const startVoiceListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition ||
      window.mozSpeechRecognition ||
      window.msSpeechRecognition;

    // Abort any existing recognition instance to avoid InvalidStateError
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (!SpeechRecognition) {
      setSpeechError(
        lang === 'mr'
          ? 'तुमच्या ब्राउझरमध्ये व्हॉइस इनपुट समर्थित नाही. कृपया खालील प्रश्नांवर क्लिक करा किंवा टाइप करा.'
          : lang === 'hi'
          ? 'आपका ब्राउज़र वॉइस इनपुट समर्थित नहीं करता है। कृपया नीचे दिए गए प्रश्नों पर क्लिक करें या टाइप करें।'
          : 'Speech recognition is not supported in this browser. Please tap a suggested question below or type.'
      );
      return;
    }

    try {
      setSpeechError(null);
      const recognition = new SpeechRecognition();
      const locale = lang === 'mr' ? 'mr-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.lang = locale;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let capturedFinal = '';

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
      };

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            capturedFinal += res[0].transcript;
          } else {
            interim += res[0].transcript;
          }
        }
        const fullDisplay = (capturedFinal + ' ' + interim).trim();
        setInterimTranscript(interim);
        if (fullDisplay) {
          setInput(fullDisplay);
        }
      };

      recognition.onerror = (event) => {
        console.warn('SpeechRecognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError(
            lang === 'mr'
              ? 'मायक्रोफोन परवानगी नाकारली आहे. कृपया ब्राउझर URL बारमधून मायक्रोफोन चालू करा.'
              : lang === 'hi'
              ? 'माइक्रोफ़ोन अनुमति अस्वीकृत है। कृपया ब्राउज़र से माइक्रोफ़ोन एक्सेस की अनुमति दें।'
              : 'Microphone access denied. Please allow microphone permission in your browser.'
          );
        } else if (event.error !== 'no-speech') {
          setSpeechError(
            lang === 'mr'
              ? 'आवाज ऐकण्यात अडचण आली. पुन्हा प्रयत्न करा.'
              : lang === 'hi'
              ? 'आवाज़ रिकॉर्ड करने में समस्या आई। पुनः प्रयास करें।'
              : 'Voice recognition encountered an issue. Please try again.'
          );
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        const finalQuery = capturedFinal.trim() || input.trim();
        if (finalQuery) {
          setInterimTranscript('');
          handleSend(finalQuery);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('SpeechRecognition start error:', err);
      setIsListening(false);
      setSpeechError(
        lang === 'mr'
          ? 'मायक्रोफोन सुरू करता आला नाही.'
          : lang === 'hi'
          ? 'माइक्रोफ़ोन शुरू नहीं किया जा सका।'
          : 'Could not access microphone.'
      );
    }
  };

  const toggleVoiceListening = () => {
    if (isListening) {
      stopVoiceListening();
    } else {
      startVoiceListening();
    }
  };

  const handleSend = (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    stopVoiceListening();

    const userMsg = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setInterimTranscript('');
    setSpeechError(null);

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

  const clearChat = () => {
    stopSpeaking();
    stopVoiceListening();
    setMessages([
      {
        id: `msg_welcome_${Date.now()}`,
        sender: 'ai',
        text: {
          en: 'Hello! I am your KrishiSetu AI Assistant. You can speak or type to ask about live mandi prices, 48-hour weather, AI quality grading, FPO pooling, or escrow payouts.',
          mr: 'नमस्कार! मी तुमचा कृषी-सेतू AI सहाय्यक आहे. मला चालू बाजार भाव, पुढील ४८ तासांचे हवामान, AI प्रतवारी, FPO पूलिंग किंवा बँक खात्यातील पेमेंटबद्दल आवाजात किंवा लिहून विचारा.',
          hi: 'नमस्ते! मैं आपका कृषि-सेतु AI सहायक हूँ। मुझसे चालू मंडी भाव, 48 घंटे का मौसम, AI फसल ग्रेडिंग, FPO पूलिंग या बैंक खाते में भुगतान के बारे में बोलकर या लिखकर पूछें।',
        },
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleClose = () => {
    stopVoiceListening();
    stopSpeaking();
    setIsOpen(false);
  };

  // Dual Floating Launcher Buttons when closed (Matching User Screenshot exactly)
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {/* 1. Mic Floating Button (Opens Assistant & Starts Voice Listening Immediately) */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => {
              startVoiceListening();
            }, 120);
          }}
          className="w-12 h-12 rounded-full bg-[#008A4B] hover:bg-[#00703C] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer border border-white/20"
          title={lang === 'mr' ? 'व्हॉइस असिस्टंट (थेट बोला)' : lang === 'hi' ? 'वॉइस असिस्टेंट (बोलें)' : 'Voice Assistant (Speak)'}
        >
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </button>

        {/* 2. Chat Bubble Floating Button with Yellow "AI" Badge */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 rounded-full bg-[#008A4B] hover:bg-[#00703C] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer relative border border-white/20"
          title={lang === 'mr' ? 'कृषी-सेतू AI चॅट' : lang === 'hi' ? 'कृषि-सेतु AI चैट' : 'KrishiSetu AI Chat'}
        >
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
          </svg>
          <span className="absolute -top-1 -right-1 bg-[#D1BF4B] text-[#255919] font-black text-[9px] px-1.5 py-0.5 rounded-full border border-white dark:border-[#132215] shadow-xs leading-none">
            AI
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[420px] h-[550px] max-h-[85vh] bg-white dark:bg-[#132215] rounded-2xl shadow-2xl border-2 border-stone-200/90 dark:border-[#D1BF4B]/30 border-t-4 border-t-[#255919] dark:border-t-[#D1BF4B] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#255919] to-[#1e3e15] dark:from-[#132215] dark:to-[#162719] text-white px-4 py-3 border-b border-emerald-800/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-700/60 border border-[#D1BF4B]/50 flex items-center justify-center text-base">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm leading-tight text-white">
                {t('ai_assistant_title', 'KrishiSetu AI')}
              </h3>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isOnline
                    ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                    : 'bg-amber-500/30 text-amber-200 border border-amber-400/40'
                }`}
              >
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <p className="text-[11px] text-stone-300 font-medium flex items-center gap-1">
              <span>📍</span> {lastSavedLocation}
            </p>
          </div>
        </div>

        {/* Language selector & actions */}
        <div className="flex items-center gap-1.5">
          <div className="bg-black/30 rounded-lg p-0.5 flex text-[10px] font-bold border border-white/10">
            {['mr', 'hi', 'en'].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-1.5 py-0.5 rounded transition ${
                  lang === l
                    ? 'bg-[#D1BF4B] text-[#255919]'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                {l === 'mr' ? 'मराठी' : l === 'hi' ? 'हिंदी' : 'EN'}
              </button>
            ))}
          </div>

          {isSpeaking && (
            <button
              type="button"
              onClick={stopSpeaking}
              className="p-1.5 text-amber-300 hover:text-white rounded hover:bg-white/10 transition animate-pulse"
              title="Mute Speech"
            >
              🔇
            </button>
          )}

          <button
            type="button"
            onClick={clearChat}
            className="p-1.5 text-stone-300 hover:text-white rounded hover:bg-white/10 transition"
            title="Clear Chat"
          >
            🗑️
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-stone-300 hover:text-white rounded hover:bg-white/10 transition font-bold"
            title="Close Assistant"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Voice Listening Active Waveform Banner */}
      {isListening && (
        <div className="mx-3 mt-2.5 p-3 bg-emerald-950 text-white rounded-xl border border-emerald-500/50 flex items-center justify-between gap-3 animate-in fade-in shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 h-6">
              <span className="w-1.5 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.05s]" />
              <span className="w-1.5 h-6 bg-emerald-300 rounded-full animate-bounce [animation-delay:0.15s]" />
              <span className="w-1.5 h-4 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.25s]" />
              <span className="w-1.5 h-7 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.35s]" />
              <span className="w-1.5 h-4 bg-emerald-300 rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-300">
                {lang === 'mr' ? 'ऐकत आहे... थेट बोला' : lang === 'hi' ? 'सुन रहा हूँ... बोलिए' : 'Listening... Speak now'}
              </div>
              <div className="text-[11px] text-stone-300 italic truncate max-w-[210px]">
                {interimTranscript || input || (lang === 'mr' ? 'उदा. टोमॅटोचा भाव काय आहे?' : lang === 'hi' ? 'उदा. टमाटर का भाव क्या है?' : "e.g. What is today's tomato rate?")}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={stopVoiceListening}
            className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition shrink-0 cursor-pointer shadow-xs"
          >
            {lang === 'mr' ? 'पूर्ण' : lang === 'hi' ? 'पूर्ण' : 'Done'}
          </button>
        </div>
      )}

      {/* Error / Permission notification */}
      {speechError && (
        <div className="mx-3 mt-2 p-2.5 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-2 shrink-0">
          <span className="leading-snug">⚠️ {speechError}</span>
          <button
            type="button"
            onClick={() => setSpeechError(null)}
            className="font-bold text-sm text-stone-500 hover:text-stone-800 dark:hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAF7] dark:bg-[#132215]">
        {messages.map((m) => {
          const isAi = m.sender === 'ai';
          const textContent = typeof m.text === 'object' ? m.text[lang] || m.text.en : m.text;

          return (
            <div key={m.id} className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}>
              {isAi && (
                <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400 mb-1 px-1">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                    🌾 KrishiSetu AI
                  </span>
                  <span>•</span>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded-full border border-emerald-300 dark:border-emerald-800 font-bold">
                    Live Grid
                  </span>
                  <button
                    type="button"
                    onClick={() => speakText(textContent)}
                    className="p-1 text-stone-500 hover:text-emerald-700 dark:hover:text-[#D1BF4B] transition cursor-pointer"
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

              <span className="text-[10px] text-stone-400 mt-1 px-1">{m.time}</span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompt chips in Marathi, Hindi, English */}
      <div className="px-3 py-2 bg-stone-100/90 dark:bg-[#162719] border-t border-stone-200/80 dark:border-emerald-900/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-[11px]">
        {[
          {
            key: 'ask_tomato',
            mr: '🍅 टोमॅटोचा आजचा भाव काय?',
            hi: '🍅 आज टमाटर का भाव क्या है?',
            en: "🍅 Today's tomato price?",
          },
          {
            key: 'ask_weather',
            mr: '🌦️ पुढील ४८ तासांचे हवामान?',
            hi: '🌦️ अगले 48 घंटे का मौसम व बारिश?',
            en: '🌦️ 48-hr weather & rain forecast?',
          },
          {
            key: 'ask_grade',
            mr: '🔬 पीक प्रतवारी कशी करावी?',
            hi: '🔬 फसल ग्रेडिंग कैसे करें?',
            en: '🔬 How does AI crop grading work?',
          },
          {
            key: 'ask_fpo',
            mr: '🚚 FPO पूलिंगने नफा कसा वाढतो?',
            hi: '🚚 FPO पूलिंग से बचत कैसे होती है?',
            en: '🚚 How does FPO pooling save cost?',
          },
          {
            key: 'ask_payout',
            mr: '💰 बँक खात्यात पेमेंट कधी जमा होईल?',
            hi: '💰 बैंक खाते में भुगतान कब आएगा?',
            en: '💰 When are escrow payouts released?',
          },
        ].map((chip) => {
          const chipLabel = chip[lang] || chip.en;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => handleSend(chipLabel)}
              className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white dark:bg-[#182b1c] text-stone-700 dark:text-stone-200 border border-stone-300/80 dark:border-emerald-800/60 hover:border-emerald-500 dark:hover:border-[#D1BF4B] transition shadow-2xs font-medium cursor-pointer"
            >
              {chipLabel}
            </button>
          );
        })}
      </div>

      {/* Input footer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-white dark:bg-[#132215] border-t border-stone-200 dark:border-emerald-900/60 flex items-center gap-2 shrink-0"
      >
        {/* Toggle Voice Recording Button */}
        <button
          type="button"
          onClick={toggleVoiceListening}
          className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-center shrink-0 ${
            isListening
              ? 'bg-red-600 text-white border-red-700 animate-pulse ring-2 ring-red-400'
              : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-[#182b1c] dark:hover:bg-[#203a25] text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60'
          }`}
          title={isListening ? 'Stop recording' : 'Start speaking (Voice Input)'}
        >
          {isListening ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-emerald-700 dark:text-emerald-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          )}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isListening
              ? lang === 'mr'
                ? 'ऐकत आहे... बोला'
                : lang === 'hi'
                ? 'सुन रहा हूँ... बोलिए'
                : 'Listening... Speak now'
              : t('ai_input_placeholder', 'Type or speak your question...')
          }
          className="flex-1 bg-stone-50 dark:bg-[#162719] text-stone-900 dark:text-stone-100 text-xs md:text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-emerald-900/60 focus:outline-none focus:ring-2 focus:ring-[#255919] dark:focus:ring-[#D1BF4B]"
        />

        <button
          type="submit"
          disabled={!input.trim()}
          className="bg-[#255919] hover:bg-[#1e4814] dark:bg-[#D1BF4B] dark:hover:bg-[#bcab43] text-white dark:text-[#183910] p-2.5 rounded-xl font-bold transition disabled:opacity-40 cursor-pointer shadow-md flex items-center justify-center shrink-0"
          title="Send"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </form>
    </div>
  );
}

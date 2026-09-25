import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const translations = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    grade_crop: 'Grade Crop',
    market_prices: 'Market Prices',
    sale_advisor: 'Sale Advisor',
    pooling: 'Pooling',
    my_products: 'My Products',
    settlement: 'Settlement',
    logout: 'Logout',
    start_selling: 'Start Selling',

    // Top Bar
    voice: 'Voice',
    online: 'Online',
    offline: 'Offline',
    location_grid: 'Baramati Cluster, Pune | Live APMC Grid: Pune Cluster',
    national_portal: 'National Agriculture Portal (Live)',

    // Greetings & Headers
    greeting: 'Namaste',
    online_status_line: 'Online • Real-Time Pune APMC Connected • Live Market Feed Active',
    offline_status_line: 'Offline Mode • Local Queue Active • Cached Mandi Rates',
    current_farm_location: 'Current Farm Location',
    accuracy_manual: 'Accuracy: Manual (Taluka/District)',
    change_location: 'Change Location',

    // KPI Cards
    todays_best_net: "Today's Best Net",
    current_crop_grade: 'Current Crop Grade',
    external_ai_estimate: 'External Visual AI Estimate',
    active_pool_progress: 'Active Pool Progress',
    pending_payment: 'Pending Payment',
    released_in_nodal: 'Released in Nodal Account',

    // Map & Journey
    mandi_map_title: 'Farm & Nearby Mandi Map',
    mandi_map_subtitle: 'Dynamic routes and travel times originating from Baramati Cluster, Pune',
    mandis_found: '22 Mandis Found',
    journey_title: 'END-TO-END MARKET LINKAGE JOURNEY',
    step1: '1. Capture 3 Photos',
    step2: '2. External AI Grade',
    step3: '3. Net Mandi Compare',
    step4: '4. FPO Group Pooling',
    step5: '5. Nodal Payout',

    // Sections
    recent_lots: 'Recent Lots',
    recent_lots_subtitle: 'Your active and verified crop lots in the system',
    nearby_mandis: 'Nearby Mandis',
    near_baramati: 'Near Baramati Cluster',
    direct_buyer_offers: 'Direct Buyer Offers',
    direct_buyer_offers_subtitle: 'Verified buyers offering to buy your produce directly.',
    your_harvest_listings: 'Your Harvest Produce Lots',

    // Offline Banner
    offline_banner_title: 'You are offline. Crop drafts and pool requests are safely queued in your local browser and will sync automatically when back online.',
    offline_mode_badge: 'Offline Mode',
    offline_mode_desc: 'Simulated local storage queue is active. You can create lots and join pools; they will synchronize when connection is restored.',
    offline_bullet_1: 'Last saved location: Baramati Cluster, Pune',
    offline_bullet_2: 'Cached mandi rates available',
    offline_bullet_3: 'Live buyer offers and payments pause until back online',

    // AI Assistant
    ai_assistant_title: 'KrishiSetu AI Assistant',
    ai_welcome: 'Hello! I am your KrishiSetu AI Assistant. Ask me about nearby mandi prices, net transport outcomes, quality grading, or FPO pooling.',
    ai_input_placeholder: 'Type or speak your question...',
    ask_tomato: "What is today's tomato price near me?",
    ask_net: 'Which mandi gives me the best net return?',
    ask_fpo: 'How does FPO pooling work?',
    ask_offline: 'How does offline mode sync work?',
  },

  mr: {
    // Navigation
    dashboard: 'डॅशबोर्ड',
    grade_crop: 'पीक प्रतवारी (Grade)',
    market_prices: 'बाजार भाव',
    sale_advisor: 'विक्री सल्लागार',
    pooling: 'एफपीओ गट एकत्रीकरण',
    my_products: 'माझी उत्पादने',
    settlement: 'पैसे जमा (Settlement)',
    logout: 'लॉगआउट',
    start_selling: 'पिकांची विक्री सुरू करा',

    // Top Bar
    voice: 'व्हॉइस सहाय्यक',
    online: 'ऑनलाइन',
    offline: 'ऑफलाइन',
    location_grid: 'बारामती क्लस्टर, पुणे | थेट एपीएमसी ग्रिड: पुणे क्लस्टर',
    national_portal: 'राष्ट्रीय कृषी पोर्टल (थेट)',

    // Greetings & Headers
    greeting: 'नमस्कार',
    online_status_line: 'ऑनलाइन • रिअल-टाइम पुणे APMC कनेक्टेड • थेट बाजार भाव सुरू',
    offline_status_line: 'ऑफलाइन मोड • स्थानिक रांग सक्रिय • जतन केलेले बाजार भाव',
    current_farm_location: 'शेतकऱ्याचे चालू स्थान',
    accuracy_manual: 'अचूकता: मॅन्युअल (तालुका/जिल्हा)',
    change_location: 'स्थान बदला',

    // KPI Cards
    todays_best_net: 'आजचा सर्वोत्तम नफा दर',
    current_crop_grade: 'चालू पीक प्रत (Grade)',
    external_ai_estimate: 'एआय व्हिज्युअल प्रतवारी अंदाज',
    active_pool_progress: 'सक्रिय पूल प्रगती',
    pending_payment: 'प्रलंबित रक्कम',
    released_in_nodal: 'नोडल खात्यातून हस्तांतरित',

    // Map & Journey
    mandi_map_title: 'शेत व जवळील बाजार समित्यांचा नकाशा',
    mandi_map_subtitle: 'बारामती क्लस्टर, पुणे येथून थेट मार्ग आणि प्रवासाचा वेळ',
    mandis_found: '२२ बाजार समित्या उपलब्ध',
    journey_title: 'थेट शेतकरी ते खरेदीदार बाजार जोडणी प्रवास',
    step1: '१. पिकांचे ३ फोटो घ्या',
    step2: '२. एआय प्रतवारी (Grade)',
    step3: '३. निव्वळ बाजार भाव तुलना',
    step4: '४. एफपीओ गट संकलन',
    step5: '५. बँक खात्यात थेट पैसे',

    // Sections
    recent_lots: 'नुकतीच नोंदवलेली पिके',
    recent_lots_subtitle: 'तुमच्या सक्रिय आणि पडताळणी झालेल्या पिकांची यादी',
    nearby_mandis: 'जवळील बाजार समित्या',
    near_baramati: 'बारामती क्लस्टर जवळ',
    direct_buyer_offers: 'खरेदीदारांच्या थेट ऑफर्स',
    direct_buyer_offers_subtitle: 'नोंदणीकृत खरेदीदारांकडून थेट खरेदीच्या ऑफर्स.',
    your_harvest_listings: 'तुमच्या उत्पादनांची संपूर्ण यादी',

    // Offline Banner
    offline_banner_title: 'तुम्ही सध्या ऑफलाइन आहात. पिकांचे मसुदे आणि पूलिंग विनंत्या तुमच्या ब्राउझरमध्ये सुरक्षितपणे जतन केल्या आहेत आणि इंटरनेट सुरू होताच आपोआप सिंक होतील.',
    offline_mode_badge: 'ऑफलाइन मोड',
    offline_mode_desc: 'स्थानिक स्टोरेज रांग सुरू आहे. तुम्ही पिके नोंदवू शकता आणि पूलिंग करू शकता; इंटरनेट सुरू झाल्यावर सिंक होईल.',
    offline_bullet_1: 'शेवटचे जतन केलेले स्थान: बारामती क्लस्टर, पुणे',
    offline_bullet_2: 'कॅश केलेले कृषी उत्पन्न बाजार भाव उपलब्ध',
    offline_bullet_3: 'थेट खरेदीदारांच्या ऑफर्स व पेमेंट परत ऑनलाइन होईपर्यंत थांबवले आहेत',

    // AI Assistant
    ai_assistant_title: 'कृषी-सेतू एआय सहाय्यक',
    ai_welcome: 'नमस्कार! मी तुमचा कृषी-सेतू एआय सहाय्यक आहे. मला जवळील बाजार भाव, वाहतूक खर्च वजा जाता निव्वळ नफा, गुणवत्ता प्रतवारी किंवा FPO पूलिंगबद्दल विचारा.',
    ai_input_placeholder: 'तुमचा प्रश्न टाइप करा किंवा बोला...',
    ask_tomato: 'माझ्या जवळ टोमॅटोचा आजचा भाव काय आहे?',
    ask_net: 'कोणत्या बाजारपेठेत मला सर्वाधिक निव्वळ नफा मिळेल?',
    ask_fpo: 'एफपीओ पूलिंग कसे काम करते?',
    ask_offline: 'ऑफलाइन मोडमध्ये डेटा कसा सिंक होतो?',
  },

  hi: {
    // Navigation
    dashboard: 'डैशबोर्ड',
    grade_crop: 'फसल ग्रेडिंग',
    market_prices: 'मंडी भाव',
    sale_advisor: 'बिक्री सलाहकार',
    pooling: 'एफपीओ समूह पूलिंग',
    my_products: 'मेरे उत्पाद',
    settlement: 'भुगतान विवरण',
    logout: 'लॉगआउट',
    start_selling: 'फसल बेचना शुरू करें',

    // Top Bar
    voice: 'वॉयस सहायक',
    online: 'ऑनलाइन',
    offline: 'ऑफलाइन',
    location_grid: 'बारामती क्लस्टर, पुणे | लाइव एपीएमसी ग्रिड: पुणे क्लस्टर',
    national_portal: 'राष्ट्रीय कृषि पोर्टल (लाइव)',

    // Greetings & Headers
    greeting: 'नमस्ते',
    online_status_line: 'ऑनलाइन • रियल-टाइम पुणे APMC कनेक्टेड • लाइव मार्केट फीड सक्रिय',
    offline_status_line: 'ऑफलाइन मोड • स्थानीय कतार सक्रिय • सहेजे गए मंडी भाव',
    current_farm_location: 'किसान का वर्तमान स्थान',
    accuracy_manual: 'सटीकता: मैन्युअल (तालुका/ज़िला)',
    change_location: 'स्थान बदलें',

    // KPI Cards
    todays_best_net: 'आज का सर्वोत्तम शुद्ध लाभ',
    current_crop_grade: 'वर्तमान फसल ग्रेड',
    external_ai_estimate: 'एआई विजुअल ग्रेडिंग अनुमान',
    active_pool_progress: 'सक्रिय पूल प्रगति',
    pending_payment: 'लंबित भुगतान',
    released_in_nodal: 'नोडल खाते में स्वीकृत',

    // Map & Journey
    mandi_map_title: 'खेत और निकटतम मंडी नक्शा',
    mandi_map_subtitle: 'बारामती क्लस्टर, पुणे से लाइव मार्ग और यात्रा समय',
    mandis_found: '२२ मंडियां उपलब्ध',
    journey_title: 'संपूर्ण कृषि बाजार संपर्क यात्रा',
    step1: '१. फसल के ३ फोटो लें',
    step2: '२. एआई गुणवत्ता ग्रेडिंग',
    step3: '३. शुद्ध मंडी भाव तुलना',
    step4: '४. एफपीओ समूह पूलिंग',
    step5: '५. बैंक खाते में सीधा भुगतान',

    // Sections
    recent_lots: 'हाल की फसलें',
    recent_lots_subtitle: 'प्रणाली में आपकी सक्रिय और सत्यापित फसलें',
    nearby_mandis: 'निकटतम मंडियां',
    near_baramati: 'बारामती क्लस्टर के पास',
    direct_buyer_offers: 'खरीदारों के सीधे ऑफर्स',
    direct_buyer_offers_subtitle: 'पंजीकृत खरीदारों से सीधी फसल खरीद के प्रस्ताव।',
    your_harvest_listings: 'आपकी फसलों की सूची',

    // Offline Banner
    offline_banner_title: 'आप ऑफलाइन हैं। फसल ड्राफ्ट और पूल अनुरोध आपके स्थानीय ब्राउज़र में सुरक्षित रूप से कतारबद्ध हैं और ऑनलाइन आने पर स्वचालित रूप से सिंक हो जाएंगे।',
    offline_mode_badge: 'ऑफलाइन मोड',
    offline_mode_desc: 'सिम्युलेटेड लोकल स्टोरेज कतार सक्रिय है। आप फसल जोड़ सकते हैं और पूल में शामिल हो सकते हैं; इंटरनेट जुड़ने पर सिंक हो जाएंगे।',
    offline_bullet_1: 'अंतिम सहेजा गया स्थान: बारामती क्लस्टर, पुणे',
    offline_bullet_2: 'कैश्ड मंडी भाव उपलब्ध हैं',
    offline_bullet_3: 'लाइव खरीदार ऑफर और भुगतान ऑनलाइन होने तक स्थगित रहेंगे',

    // AI Assistant
    ai_assistant_title: 'कृषि-सेतु एआई सहायक',
    ai_welcome: 'नमस्ते! मैं आपका कृषि-सेतु एआई सहायक हूँ। मुझसे निकटतम मंडी भाव, परिवहन लागत घटाकर शुद्ध मुनाफा, गुणवत्ता ग्रेडिंग या FPO पूलिंग के बारे में पूछें।',
    ai_input_placeholder: 'अपना प्रश्न टाइप करें या बोलें...',
    ask_tomato: 'मेरे पास आज टमाटर का भाव क्या है?',
    ask_net: 'कौन सी मंडी मुझे सबसे ज्यादा शुद्ध मुनाफा देगी?',
    ask_fpo: 'एफपीओ पूलिंग कैसे काम करती है?',
    ask_offline: 'ऑफलाइन मोड में डेटा कैसे सुरक्षित रहता है?',
  }
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('krishisetu_lang') || 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('krishisetu_lang', lang);
    } catch {}
  }, [lang]);

  const t = (key, fallback) => {
    const dict = translations[lang] || translations.en;
    return dict[key] || translations.en[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

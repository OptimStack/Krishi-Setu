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

    recent_lots: 'Recent Lots',
    recent_lots_subtitle: 'Your active and verified crop lots in the system',
    your_harvest_produce_lots: 'Your Harvest Produce Lots',
    your_harvest_produce_lots_desc: 'Your active, graded, and verified harvest produce lots in the system',
    nearby_mandis: 'Nearby Mandis',
    near_baramati: 'Near Baramati Cluster',
    direct_buyer_offers: 'Direct Buyer Offers',
    direct_buyer_offers_subtitle: 'Verified buyers offering to buy your produce directly.',
    buyer_procurement: 'Buyer Procurement',
    buyer_procurement_subtitle: 'Verified corporate buyers procuring directly at official Mandi modal rates. Zero commission, direct escrow credit.',
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
    // Buyer Navigation & Subpages
    buyer_nav_marketplace: 'Marketplace',
    buyer_nav_offers: 'My Offers',
    buyer_nav_delivery: 'Delivery Acceptance',
    buyer_nav_trades: 'Trades & Settlements',

    // Buyer Marketplace
    b2b_marketplace_title: 'B2B Wholesale Agri Marketplace',
    b2b_marketplace_subtitle: 'Procure FPO-verified, escrow-protected aggregated consignments. Connected directly to farms.',
    rbi_compliant_escrow: 'RBI-Compliant Escrow',
    available_pools: 'Available Pools',
    total_stock: 'Total Stock',
    total_market_value: 'Total Market Value',
    registered_buyers: 'Registered Buyers',
    direct_farmer_lots: 'Direct Farmer Lots',
    aggregated_fpo_pools: 'Aggregated FPO Pools',
    filter_label: 'Filter:',
    clear_filter: 'Clear',
    view_product_details: 'View Product Details',
    reserve_pool: 'Reserve Pool',
    already_reserved: 'Already Reserved',
    fpo_inspected: 'FPO Inspected',
    fpo_certified: 'FPO Certified',
    available_volume: 'Available Volume',
    asking_rate: 'Asking Rate',
    producer_label: 'Producer:',
    ai_quality_score: 'AI Quality Score:',
    lot_id: 'Lot ID:',
    pool_fill_progress: 'Pool Fill Progress',
    freight_saved: 'Freight Saved',
    est_total_value: 'Est. Total Value:',
    auth_escrow_title: 'Authorize Nodal Escrow Hold',
    zero_advance_protection: 'Zero-Advance Escrow Protection',
    confirm_reserve: 'Confirm & Reserve',
    cancel: 'Cancel',

    // Buyer Orders & RFQs
    procurement_orders_title: 'Procurement Orders & RFQs',
    procurement_orders_subtitle: 'Publish direct purchase requirements to FPOs or track existing contracts.',
    broadcast_new_rfq: 'Broadcast New RFQ',
    target_ceiling_price: 'Target Ceiling Price',
    quality_tolerance: 'Quality Tolerance',
    total_procurement_commitment: 'Total Procurement Commitment',
    delivery_destination: 'Delivery Destination',
    fulfillment_progress: 'Fulfillment Progress',
    contributing_farmers: 'Contributing Farmers',
    fully_fulfilled: 'Fully Fulfilled ✓',
    remaining: 'remaining',
    min_supply_lot: 'Min supply lot',
    delivery_deadline: 'Delivery deadline',

    // Buyer Delivery
    delivery_acceptance_title: 'Delivery Acceptance & Payout Release',
    delivery_acceptance_subtitle: 'Inspect arrived consignments against digital weigh-slips. Release funds or log quality adjustments within 24 hours.',
    no_active_deliveries: 'You have no active deliveries. Reserve a pool in the B2B Marketplace first.',
    consignment: 'Consignment',
    consignment_value: 'Consignment Value:',
    assigned_fpo: 'Assigned FPO',
    verified_bulk_weight: 'Verified Bulk Weight',
    assigned_transporter: 'Assigned Transporter',
    contract_price: 'Contract Price',
    ondc_ready_logistics: 'ONDC Protocol Ready Logistics',
    vehicle_arrival_inspection: 'Vehicle Arrival & Quality Inspection',
    vehicle_arrival_desc: 'Scan the vehicle gate QR pass and match crates against the FPO digital weigh-slip before releasing the nodal escrow payment.',
    raise_dispute: 'Raise Quality/Weight Dispute',
    confirm_delivery: 'Confirm Delivery & Release Funds',
    delivery_accepted_payout: 'Delivery Accepted & Payment Released',
    dispute_raised_funds_held: 'Dispute Raised — Funds on Nodal Hold',
    my_procurement_bids: 'My Procurement Bids & Orders (FPO Linkage)',
    withdraw_bid: 'Withdraw Bid',

    // Buyer Trades
    trades_title: 'Auction Trades & Settlements',
    trades_subtitle: 'Double-auction cleared contracts, nodal escrow locks, clearing vouchers, and instant bank UTR settlement.',
    cleared_volume: 'Cleared Volume',
    total_settled: 'Total Settled',
    pending_escrow: 'Pending Escrow',
    clearing_ledger: 'Auction Clearing Ledger & Vouchers',
    pay_and_settle: 'Pay & Settle',
    settled_badge: 'Settled ✓',
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

    recent_lots: 'नुकतीच नोंदवलेली पिके',
    recent_lots_subtitle: 'तुमच्या सक्रिय आणि पडताळणी झालेल्या पिकांची यादी',
    your_harvest_produce_lots: 'तुमचे काढणी केलेले पिकांचे लॉट्स',
    your_harvest_produce_lots_desc: 'तुमचे सक्रिय, प्रतवारी प्रमाणित व तपासणी केलेले पिकांचे लॉट्स',
    nearby_mandis: 'जवळील बाजार समित्या',
    near_baramati: 'बारामती क्लस्टर जवळ',
    direct_buyer_offers: 'खरेदीदारांच्या थेट ऑफर्स',
    direct_buyer_offers_subtitle: 'नोंदणीकृत खरेदीदारांकडून थेट खरेदीच्या ऑफर्स.',
    buyer_procurement: 'खरेदीदार खरेदी मागण्या',
    buyer_procurement_subtitle: 'अधिकृत बाजार समिती दराने थेट खरेदी करणाऱ्या नामांकित कंपन्यांच्या मागण्या. शून्य दलाली व थेट बँक जमा.',
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

    // Buyer Navigation & Subpages (Marathi)
    buyer_nav_marketplace: 'बाजारपेठ (Marketplace)',
    buyer_nav_offers: 'माझ्या ऑफर्स (My Offers)',
    buyer_nav_delivery: 'डिलिव्हरी स्वीकृती (Delivery)',
    buyer_nav_trades: 'व्यवहार व सेटलमेंट (Trades)',

    // Buyer Marketplace (Marathi)
    b2b_marketplace_title: 'बी2बी घाऊक कृषी बाजार',
    b2b_marketplace_subtitle: 'एफपीओ-सत्यापित, एस्क्रो-संरक्षित एकत्रित कन्साइनमेंट. थेट शेतांशी जोडलेले.',
    rbi_compliant_escrow: 'RBI-अनुपालित एस्क्रो',
    available_pools: 'उपलब्ध पूल',
    total_stock: 'एकूण माल',
    total_market_value: 'एकूण बाजार मूल्य',
    registered_buyers: 'नोंदणीकृत खरेदीदार',
    direct_farmer_lots: 'थेट शेतकरी लॉट्स',
    aggregated_fpo_pools: 'एकत्रित एफपीओ पूल',
    filter_label: 'फिल्टर:',
    clear_filter: 'साफ करा',
    view_product_details: 'उत्पादन तपशील पहा',
    reserve_pool: 'पूल राखीव करा',
    already_reserved: 'आधीच राखीव',
    fpo_inspected: 'एफपीओ तपासणी केलेले',
    fpo_certified: 'एफपीओ प्रमाणित',
    available_volume: 'उपलब्ध प्रमाण',
    asking_rate: 'मागणी दर',
    producer_label: 'उत्पादक:',
    ai_quality_score: 'एआय गुणवत्ता स्कोर:',
    lot_id: 'लॉट क्र:',
    pool_fill_progress: 'पूल भरण्याची प्रगती',
    freight_saved: 'वाहतूक बचत',
    est_total_value: 'एकूण अंदाजित मूल्य:',
    auth_escrow_title: 'नोडल एस्क्रो निधी अधिकृत करा',
    zero_advance_protection: 'शून्य-अ‍ॅडव्हान्स एस्क्रो सुरक्षा',
    confirm_reserve: 'निश्चित करा व राखीव करा',
    cancel: 'रद्द करा',

    // Buyer Orders & RFQs (Marathi)
    procurement_orders_title: 'खरेदी मागण्या आणि RFQs',
    procurement_orders_subtitle: 'एफपीओकडे थेट खरेदी मागण्या प्रसिद्ध करा किंवा अस्तित्वातील करारांचा मागोवा घ्या.',
    broadcast_new_rfq: '+ नवीन RFQ पाठवा',
    target_ceiling_price: 'कमाल खरेदी दर',
    quality_tolerance: 'गुणवत्ता निकष',
    total_procurement_commitment: 'एकूण खरेदी रक्कम',
    delivery_destination: 'डिलिव्हरी ठिकाण',
    fulfillment_progress: 'पूर्तता प्रगती',
    contributing_farmers: 'सहभागी शेतकरी',
    fully_fulfilled: 'पूर्ण भरले ✓',
    remaining: 'उर्वरित',
    min_supply_lot: 'किमान पुरवठा लॉट',
    delivery_deadline: 'डिलिव्हरी अंतिम मुदत',

    // Buyer Delivery (Marathi)
    delivery_acceptance_title: 'डिलिव्हरी स्वीकृती व पेमेंट वितरण',
    delivery_acceptance_subtitle: 'डिजिटल वजन पावतीनुसार मालाची तपासणी करा. २४ तासांत निधी वितरित करा किंवा गुणवत्ता तक्रार नोंदवा.',
    no_active_deliveries: 'आपल्याकडे सध्या कोणतीही सक्रिय डिलिव्हरी नाही. प्रथम B2B बाजारपेठेत पूल राखीव करा.',
    consignment: 'कन्साइनमेंट',
    consignment_value: 'कन्साइनमेंट मूल्य:',
    assigned_fpo: 'नेमलेली एफपीओ',
    verified_bulk_weight: 'सत्यापित वजन',
    assigned_transporter: 'वाहतूकदार वाहन',
    contract_price: 'करार दर',
    ondc_ready_logistics: 'ONDC प्रोटोकॉल लॉजिस्टिक्स',
    vehicle_arrival_inspection: 'वाहन आगमन व गुणवत्ता तपासणी',
    vehicle_arrival_desc: 'वाहनाचा गेट क्यूआर पास स्कॅन करा आणि नोडल एस्क्रो पेमेंट जारी करण्यापूर्वी एफपीओ डिजिटल वजन पावतीशी क्रेट्सची जुळणी करा.',
    raise_dispute: 'गुणवत्ता/वजन तक्रार नोंदवा',
    confirm_delivery: 'डिलिव्हरी स्वीकारा व पैसे जमा करा',
    delivery_accepted_payout: 'डिलिव्हरी स्वीकारली व पेमेंट वितरित केले',
    dispute_raised_funds_held: 'तक्रार नोंदवली — निधी नोडल होल्डवर',
    my_procurement_bids: 'माझ्या थेट खरेदी बोली (FPO Linkage)',
    withdraw_bid: 'बोली मागे घ्या',

    // Buyer Trades (Marathi)
    trades_title: 'लिलाव व्यवहार आणि पूर्तता',
    trades_subtitle: 'डबल-ऑक्शन क्लिअरिंग व्यवहार, नोडल एस्क्रो लॉक्स, क्लिअरिंग व्हाउचर आणि त्वरित बँक UTR सेटलमेंट.',
    cleared_volume: 'क्लिअर झालेले प्रमाण',
    total_settled: 'एकूण सेटलमेंट',
    pending_escrow: 'प्रलंबित एस्क्रो',
    clearing_ledger: 'लिलाव क्लिअरिंग लेजर आणि व्हाउचर',
    pay_and_settle: 'पैसे भरा व सेटल करा',
    settled_badge: 'पूर्ण झाले ✓',
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

    recent_lots: 'हाल की फसलें',
    recent_lots_subtitle: 'प्रणाली में आपकी सक्रिय और सत्यापित फसलें',
    your_harvest_produce_lots: 'आपकी उपज के पंजीकृत लॉट्स',
    your_harvest_produce_lots_desc: 'आपके सक्रिय, श्रेणीबद्ध और प्रमाणित फसल लॉट्स',
    nearby_mandis: 'निकटतम मंडियां',
    near_baramati: 'बारामती क्लस्टर के पास',
    direct_buyer_offers: 'खरीदारों के सीधे ऑफर्स',
    direct_buyer_offers_subtitle: 'पंजीकृत खरीदारों से सीधी फसल खरीद के प्रस्ताव।',
    buyer_procurement: 'खरीदार खरीद मांग',
    buyer_procurement_subtitle: 'आधिकारिक मंडी भाव पर सीधे खरीद करने वाली कंपनियों की मांगें। शून्य कमीशन और सीधा बैंक भुगतान।',
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

    // Buyer Navigation & Subpages (Hindi)
    buyer_nav_marketplace: 'मार्केटप्लेस (Marketplace)',
    buyer_nav_offers: 'मेरे ऑफर्स (My Offers)',
    buyer_nav_delivery: 'वितरण स्वीकृति (Delivery)',
    buyer_nav_trades: 'व्यापार व निपटान (Trades)',

    // Buyer Marketplace (Hindi)
    b2b_marketplace_title: 'बी2बी थोक कृषि मंडी',
    b2b_marketplace_subtitle: 'एफपीओ-सत्यापित, एस्क्रो-संरक्षित समूहीकृत खेप। सीधे खेतों से जुड़े हुए।',
    rbi_compliant_escrow: 'RBI-अनुरूप एस्क्रो',
    available_pools: 'उपलब्ध पूल',
    total_stock: 'कुल स्टॉक',
    total_market_value: 'कुल बाज़ार मूल्य',
    registered_buyers: 'पंजीकृत खरीदार',
    direct_farmer_lots: 'सीधे किसान लॉट',
    aggregated_fpo_pools: 'समूहीकृत एफपीओ पूल',
    filter_label: 'फ़िल्टर:',
    clear_filter: 'हटाएं',
    view_product_details: 'उत्पाद विवरण देखें',
    reserve_pool: 'पूल आरक्षित करें',
    already_reserved: 'पहले से आरक्षित',
    fpo_inspected: 'एफपीओ द्वारा जांचा गया',
    fpo_certified: 'एफपीओ प्रमाणित',
    available_volume: 'उपलब्ध मात्रा',
    asking_rate: 'मांग दर',
    producer_label: 'उत्पादक:',
    ai_quality_score: 'एआई गुणवत्ता स्कोर:',
    lot_id: 'लॉट आईडी:',
    pool_fill_progress: 'पूल भराव प्रगति',
    freight_saved: 'भाड़ा बचत',
    est_total_value: 'कुल अनुमानित मूल्य:',
    auth_escrow_title: 'नोडल एस्क्रो होल्ड अधिकृत करें',
    zero_advance_protection: 'शून्य-अग्रिम एस्क्रो सुरक्षा',
    confirm_reserve: 'पुष्टि करें और आरक्षित करें',
    cancel: 'रद्द करें',

    // Buyer Orders & RFQs (Hindi)
    procurement_orders_title: 'खरीद आदेश और आरएफक्यू',
    procurement_orders_subtitle: 'एफपीओ को प्रत्यक्ष खरीद आवश्यकताएं प्रकाशित करें या मौजूदा अनुबंधों को ट्रैक करें।',
    broadcast_new_rfq: '+ नया आरएफक्यू भेजें',
    target_ceiling_price: 'अधिकतम खरीद दर',
    quality_tolerance: 'गुणवत्ता सहनशीलता',
    total_procurement_commitment: 'कुल खरीद प्रतिबद्धता',
    delivery_destination: 'वितरण गंतव्य',
    fulfillment_progress: 'पूर्ति प्रगति',
    contributing_farmers: 'योगदानकर्ता किसान',
    fully_fulfilled: 'पूरी तरह संपन्न ✓',
    remaining: 'शेष',
    min_supply_lot: 'न्यूनतम आपूर्ति लॉट',
    delivery_deadline: 'वितरण अंतिम तिथि',

    // Buyer Delivery (Hindi)
    delivery_acceptance_title: 'वितरण स्वीकृति और भुगतान जारी',
    delivery_acceptance_subtitle: 'डिजिटल वजन पर्ची के अनुसार माल का निरीक्षण करें। 24 घंटे में भुगतान जारी करें या गुणवत्ता समायोजन दर्ज करें।',
    no_active_deliveries: 'आपके पास कोई सक्रिय वितरण नहीं है। पहले बी2बी मार्केटप्लेस में पूल आरक्षित करें।',
    consignment: 'कंसाइनमेंट',
    consignment_value: 'कंसाइनमेंट मूल्य:',
    assigned_fpo: 'नियुक्त एफपीओ',
    verified_bulk_weight: 'सत्यापित वजन',
    assigned_transporter: 'ट्रांसपोर्टर वाहन',
    contract_price: 'अनुबंध दर',
    ondc_ready_logistics: 'ओएनडीसी प्रोटोकॉल लॉजिस्टिक्स',
    vehicle_arrival_inspection: 'वाहन आगमन एवं गुणवत्ता निरीक्षण',
    vehicle_arrival_desc: 'वाहन का गेट क्यूआर पास स्कैन करें और नोडल एस्क्रो भुगतान जारी करने से पहले एफपीओ डिजिटल वजन पर्ची से क्रेट का मिलान करें।',
    raise_dispute: 'गुणवत्ता/वजन विवाद दर्ज करें',
    confirm_delivery: 'वितरण स्वीकारें और भुगतान जारी करें',
    delivery_accepted_payout: 'वितरण स्वीकृत और भुगतान जारी',
    dispute_raised_funds_held: 'विवाद दर्ज — धनराशि नोडल होल्ड पर',
    my_procurement_bids: 'मेरी प्रत्यक्ष खरीद बोलियां (FPO Linkage)',
    withdraw_bid: 'बोली वापस लें',

    // Buyer Trades (Hindi)
    trades_title: 'नीलामी व्यापार और निपटान',
    trades_subtitle: 'डबल-नीलामी संपन्न अनुबंध, नोडल एस्क्रो लॉक, क्लीयरिंग वाउचर और तत्काल बैंक यूटीआर निपटान।',
    cleared_volume: 'क्लीयर मात्रा',
    total_settled: 'कुल निपटान',
    pending_escrow: 'लंबित एस्क्रो',
    clearing_ledger: 'नीलामी क्लीयरिंग बहीखाता और वाउचर',
    pay_and_settle: 'भुगतान करें और निपटाएं',
    settled_badge: 'निपटारा संपन्न ✓',
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

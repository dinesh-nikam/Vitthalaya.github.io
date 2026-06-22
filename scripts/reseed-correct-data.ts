import { db } from '../src/db/client';
import { contentHash } from '../src/canonical/normalization';
import { createHash } from 'crypto';

const TYPES = ['ABHANG', 'AARTI', 'BHAJAN', 'STOTRA', 'HARIPATH', 'GAULANI'];

// ─── First Lines per Deity+Type ───────────────────────────────────────────────
const VITTHAL_ABHANGS = [
  'कर जोडूनी उभा विठ्ठला', 'विठ्ठल विठ्ठल गजर करू', 'पांडुरंग रूप साजिरे',
  'विटेवरी उभा पांडुरंग हरी', 'पंढरीच्या नाथा धावसी संकटी', 'पांडुरंगा तुझा नित्य हा गजर',
  'विठोबाचे नाम गोड लागे जीवी', 'सुंदर ते ध्यान उभे विटेवरी', 'पांडुरंग हरी वास विटेवरी',
  'भक्तीचे सागर विठ्ठल माऊली', 'आनंदाचे डोही आनंद तरंग', 'कर जोडुनी विनवी तुम्हांला',
  'पुंडलिकाचे भाग्य थोर देवा', 'भीमा तीरी वसे पंढरी नगरी', 'नित्य नामाचा जप करावा'
];
const VITTHAL_AARTIS = [
  'आरती पांडुरंगा ओवाळू भावे', 'जय देव जय देव जय पांडुरंगा', 'युगे अठ्ठावीस विटेवरी उभा',
  'सुखकर्ता दुःखहर्ता वारी विठ्ठला', 'आरती करू पांडुरंग देवाची'
];
const VITTHAL_BHAJANS = [
  'विठ्ठल विठ्ठल गाऊ नित्य', 'हरीनाम गजर करू पंढरीत', 'भजन करू विठोबाचे आवडी',
  'पांडुरंगाचे भजन आवडे मनी', 'गाऊया भजन विठ्ठल नामाचे'
];

const SHIVA_ABHANGS = [
  'हरी हरा भेद नाही काही देवा', 'कैलासाचा राणा शिव शंभू राजा', 'शंभू महादेवा नमन माझे तुला',
  'कपाळी त्रिशूळ हाती पिनाक', 'चंद्रकला शिरी शोभते सुंदरा', 'ॐ नमः शिवाय जप करतो',
  'शंकराच्या चरणी लीन झालो', 'भोले शंकर दयाळू देवा'
];
const SHIVA_AARTIS = [
  'जय देव जय देव जय गंगाधरा', 'आरती शंकराची ओवाळू आवडी', 'कर्पूरगौरा हरा आरती ओवाळू',
  'शिव शंकर त्रिनेत्रधारी देवा', 'आरती महादेवाची करू भक्तीभावे'
];
const SHIVA_BHAJANS = [
  'हर हर महादेव भजन करू', 'ओम नमः शिवाय गजर करू', 'शिव शंभू नाम गाऊ नित्य',
  'शिव शंकर भजन गाऊ मुखाने', 'भोलेनाथ नाम घेता मन शांत होई'
];

const DEVI_ABHANGS = [
  'भवानी माता आदिमाया तुळजापूर', 'अंबे जगदंबे नमन तुला माऊली', 'देवीच्या चरणी लीन झालो भक्त',
  'दुर्गा सप्तशती पाठ करू नित्य', 'जय माता दी गर्जना करू', 'अंबे माते दर्शन दे आम्हाला',
  'शक्ती रूपा नमन तुला देवी', 'महिषासूर मर्दिनी जय जगदंबे'
];
const DEVI_AARTIS = [
  'जय देवी जय देवी जय महिषासूरमर्दिनी', 'आरती भवानी मातेची ओवाळू', 'जय अंबे जगदंबे आरती करू',
  'दुर्गा माता आरती ओवाळू भक्तीने', 'सिंहवाहिनी देवी आरती करतो'
];
const DEVI_BHAJANS = [
  'आई भवानी नाम गाऊ मुखी', 'गोंधळ मांडिला अंबेच्या दारी', 'नमो नमो दुर्गे सुख करणी',
  'देवी माते भजन गाऊ आनंदाने', 'अंबे माता गुण गाऊ नित्य'
];

const GANPATI_ABHANGS = [
  'विनायक देवा नमन माझे तुला', 'गजानन राजा विघ्नहर्ता तू', 'प्रथम नमन गणराया भावभक्ती',
  'मोरया मोरया गजर नामाचा', 'गणपती बाप्पा आशीर्वाद दे आम्हाला', 'एकदंत रूपधारी देवा',
  'विघ्नविनाशक गणेश नमन तुला'
];
const GANPATI_AARTIS = [
  'सुखकर्ता दुःखहर्ता विघ्नविनाशक देवा', 'जय देव जय देव जय मंगलमूर्ती', 'आरती गणपतीची करू भावभक्ती',
  'गणराया आरती ओवाळू भक्तीने', 'मोरया मोरया गणपती बाप्पा'
];
const GANPATI_BHAJANS = [
  'गणपती बाप्पा मोरया भजन गाऊ', 'गजाननाचे नाम नित्य स्मरू', 'लंबोदराची सेवा करू आवडी',
  'विनायक नाम भजन गाऊ नित्य', 'गणेशाचे गुणगान करू मुखाने'
];

const STOTRAS = [
  'नमन माझे तुला हे ईश्वरा', 'स्तोत्र गाऊ नित्य परमेश्वराचे', 'संकट नाशन स्तोत्र हे सुंदर',
  'परमात्म्याचे स्तोत्र गाऊ भावाने', 'ईश्वराला नमन करतो भक्तीभावे', 'श्रीहरींचे स्तोत्र वाचावे नित्य',
  'देव देवेश नमन तुला करतो'
];
const HARIPATHS = [
  'देवाचे द्वारी उभा क्षणभरी', 'हरी मुखे म्हणा हरी मुखे म्हणा', 'नित्य पठण करू हरिपाठाचे',
  'हरीनाम घेण्याचा हाचि खरा पंथ', 'ज्ञानदेवे रचिला हरिपाठ थोर', 'नाम घेता नाम घेता पुण्य होते',
  'हरी विठ्ठल नाम अखंड घ्यावे'
];
const GAULANIS = [
  'राधा आणि गोपी मिळे यमुना तीरी', 'वेणू वाजवितो बाळकृष्ण वनात', 'दहीदुधाची चोरी करी यशोदा लाला',
  'कृष्णाचे गाणे गाऊ प्रेमाने', 'गोकुळी बाळकृष्ण रंगला खेळात', 'यशोदेच्या लाल्याचे गुण गाऊ',
  'राधाकृष्ण प्रेम कहाणी सांगू'
];

// ─── Second Hemistich for Verse 1 (varies by index % 16) ──────────────────────
const V1_SECOND = [
  'भक्तांच्या मनोरथा पूर्ण करी हरी',
  'नित्य नामाचा जप करावा अंतरी',
  'विठ्ठलाचे ध्यान धरावे प्रेमभरी',
  'संतांच्या चरणी शीर नमवावे शिरी',
  'पांडुरंगाशी नाते जोडावे निरंतरी',
  'हरीभक्ती करणे हेचि सुखाची खरी',
  'देवाचे दर्शन मिळो जन्मोजन्मवरी',
  'वारकरी मार्गावर चालणे हे श्रेष्ठकारी',
  'नित्य कीर्तन घडो संतांच्या दरबारी',
  'भवसागरातून तारी पांडुरंग मुरारी',
  'विठ्ठलाची कृपा असो जीवनावरी',
  'नामस्मरणे मिळे मुक्ती अवधारी',
  'एकनिष्ठ भक्ती करावी परमेश्वरी',
  'पंढरपुरी विठोबा उभा विटेवरी',
  'चरणी तुझ्या आलो आनंदे भक्तीभरी',
  'हरीनाम सदा मुखात घोळवावे वरी',
];

// ─── Verse 2 Lines (varies by (index * 5 + 3) % 18) ──────────────────────────
const VERSE_2 = [
  'नामस्मरणे होई मनाची शुद्धी । संतांची जोड लाभे नित्य बुद्धी',
  'विठ्ठल नाम जपता पापे जाती । भक्तांच्या मनी लागे हरीची प्रीती',
  'संसाराचे बंध तुटती सारे । हरी भक्तीने मिळे सुख न्यारे',
  'पंढरीच्या वाटे वारी करावी । देवाच्या चरणी माथा नमवावी',
  'आनंदाने गावे हरीचे भजन । विठ्ठलाचे नाम करावे स्मरण',
  'भवसागर तरण्या एकचि उपाय । पांडुरंगाचे नाम जपावे सदाय',
  'नित्य नेमाने करावे कीर्तन । देवाचे दर्शन मिळे अति पावन',
  'मनाच्या शांतीसाठी हरी ध्यावा । जन्म मरणाचा फेरा चुकवावा',
  'सत्संगतीत राहावे सदाकाळ । संतांच्या बोधाने मन होई निर्मळ',
  'तीर्थयात्रेहुनी थोर नाम गाणे । विठ्ठलाच्या कीर्तनी मन रंगवणे',
  'जातीपातीचा भेद नाही भक्तात । सगळे समान देवाच्या दरबारात',
  'माया ममतेचे जाळे तोडावे । हरीच्या चरणी मन जोडावे',
  'अहंकाराचा त्याग करावा भावे । देवाचे प्रेम हृदयी साठवावे',
  'सद्गुरूच्या कृपेने मार्ग मिळतो । अंधाराचा नाश होऊन प्रकाश पडतो',
  'दीन दुबळ्यांचे देव पांडुरंग आहे । संकटात त्याची कृपाछाया राहे',
  'शुद्ध मनाने सेवा करावी नित्य । देवाला प्रिय असे निस्वार्थ भक्त',
  'कर्म धर्म जपत जावे जीवनात । हरीची कृपा असे प्रत्येक क्षणात',
  'प्रपंचात राहून करावी भक्ती । हाचि वारकरी पंथाची युक्ती',
];

// ─── Verse 3 Lines (varies by (index * 11 + 7) % 18) ─────────────────────────
const VERSE_3 = [
  'भक्तीभावे नाम नित्य स्मरी । आनंदे डोलती सर्व वारकरी',
  'पंढरपुरी वारी करती भक्त । विठ्ठलाचे दर्शन होते निश्चित',
  'वारकरी मार्गावर चाले वारी । टाळ मृदुंग गजरात निघे स्वारी',
  'हृदयात विठ्ठलाचे रूप साठवावे । नामाच्या जपात मन रंगवावे',
  'उपकाराची फेड करणे नाही शक्य । देवाचे प्रेम असे अतुलनीय अनोखे',
  'जो सत्याने चाले देवाच्या वाटेने । त्याला दिसतो विठ्ठल सगळीकडे',
  'मुखी हरी नाम हृदयी त्याचे ध्यान । हेचि खरे जगी भजन आणि ज्ञान',
  'भक्तांचे रक्षण करतो पांडुरंग । दुःखाचे ढग दूर होती चांग',
  'वाणीने गावे विठ्ठलाचे गुण । जन्माचे सार्थक व्हावे प्रतिदिन',
  'संकटकाळी हाक मारावी देवाला । धावूनी येतो पांडुरंग भक्ताला',
  'मनाचा विकार दूर करावा साचा । विठ्ठलाची भक्ती हाचि मार्ग सच्चा',
  'एकनिष्ठ भक्तीने विठ्ठल प्रसन्न होतो । भक्ताचे मनोरथ सहज पूर्ण होतो',
  'रात्रंदिन नाम जपावे अखंडित । तेणे होय मनुष्यजन्म कृतार्थित',
  'सुख दुःख समान मानावे मनात । देव आहे सोबत प्रत्येक क्षणात',
  'तुलसी पत्र अर्पण करावे भावाने । हरी प्रसन्न होतो शुद्ध अंतःकरणाने',
  'नाम घेता घेता मन होई एकाग्र । भक्तीचा हा मार्ग आहे अति उग्र',
  'प्रपंचाच्या गर्दीत देव विसरू नये । हरीनाम स्मरण सदा करत जावे',
  'जप तप व्रत यात सार नाही खास । हरी नामाशिवाय नाही मोक्ष सुलभास',
];

// ─── Varied AARTI Bodies (6 per deity, full 3-line set) ───────────────────────
// [line1_second, refrain, verse2]
const VITTHAL_AARTI_BODIES = [
  [
    'वामांगी रखुमाई दिसे दिव्य शोभा',
    'जय देव जय देव जय पांडुरंगा । आरती ओवाळू भावभक्तीच्या रंगा ॥ध्रु०॥',
    'पंढरीच्या नाथा तुझी कीर्ती अगाध । विटेवरी उभा देव सुंदर सुबोध'
  ],
  [
    'चरणी तुझ्या ठेवतो मी माझे माथा',
    'विठ्ठल विठ्ठल गजर करू भक्तीभावे । आनंदाने जयजयकार म्हणू स्वभावे ॥ध्रु०॥',
    'पुंडलिकाच्या भक्तीने देव उभा राहिला । विटेवरी पांडुरंग स्थिर झाला'
  ],
  [
    'भक्तवत्सला माऊली आम्ही आलो तुझ्या पाया',
    'जय जय विठ्ठला जय पांडुरंगा । भीमातीरी शोभतसे पंढरीचा रंगा ॥ध्रु०॥',
    'शंख चक्र गदा पद्म शोभे करात । पीतांबर परिधान देव दिव्यरूपात'
  ],
  [
    'संतांसह वारकरी आले भजनाला',
    'पांडुरंग हरी विठ्ठल माऊली । भक्तांच्या संकटी धावूनी आली ॥ध्रु०॥',
    'भीमा तीरावरी पंढरी पावन धाम । तेथे वसे सदा पांडुरंग राम'
  ],
  [
    'पंढरीचा राजा तू आम्हाला तारावे',
    'हरी विठ्ठल नाम घेता मन रंगते । भक्तीचे सागर हृदयी दाटते ॥ध्रु०॥',
    'कमरेवरी हात विटेवरी थाट । पाहता मन होई आनंदाने दाट'
  ],
  [
    'दर्शनास आलो पांडुरंगा भक्तीभावे',
    'तुझे नाम घेता पाप दूर जाई । विठ्ठलाच्या कृपेने जन्म सार्थ होई ॥ध्रु०॥',
    'आषाढी कार्तिकी वारी करती भक्त । देवाचे दर्शन होता होती कृतार्थ'
  ],
];

const SHIVA_AARTI_BODIES = [
  [
    'कर्पूरगौरा शिवा कर्पूरहारा',
    'हर हर महादेवा आरती ओवाळू । भक्तांच्या हाकेला धावूनिया दयाळू ॥ध्रु०॥',
    'कैलास शिखरी वास्तव्य जयाचे । भस्म विलेपन सुंदर रूप शिवाचे'
  ],
  [
    'त्रिनेत्रधारी शंभू शूळपाणी',
    'जय शिव शंकर त्रिभुवनपती । कैलासवासी महेश भोलनाथ दयाळू अती ॥ध्रु०॥',
    'नंदी वाहन बैसला शंकर राया । भस्म लावून शोभतो देव सदाशिवाया'
  ],
  [
    'गंगाधर शशीधर शूळपाणी नाथा',
    'ओम नमः शिवाय जपावे नित्य । शिवनामाने होई मन पवित्र ॥ध्रु०॥',
    'नागेश्वर रूपात उभा महादेव । भक्तांना देतो मोक्षाचे सहज ठेव'
  ],
  [
    'डमरू वाजवित येतो शिवशंभू',
    'शिव शंकर भोला नाथ करतो कृपा । त्याचे दर्शन घेता नाशतो पाप ॥ध्रु०॥',
    'सोमवारी पूजन करावे शंकराचे । त्याच्या कृपेने जीवन होते साचे'
  ],
  [
    'अर्धनारी नटेश्वर रूप शोभते',
    'जय भोलेनाथ जय हर हर शंभू । त्याची भक्ती करता होई मन सुदाभू ॥ध्रु०॥',
    'बेलपत्र वाहता देव प्रसन्न होतो । भक्ताचे संकट त्वरित नष्ट होतो'
  ],
  [
    'पशुपती रूपाने विराजतो देव',
    'शिव शिव गजर करू भावभक्तीने । त्याला प्रसन्न करावे शुद्ध मनाने ॥ध्रु०॥',
    'विल्वपत्र धूप दीप अर्पण करावे । शिवाचे ध्यान हृदयी साठवावे'
  ],
];

const DEVI_AARTI_BODIES = [
  [
    'सुरवरईश्वरवरदे अंबे जगदंबे',
    'आरती ओवाळू आदिमाया भवानी । भक्तवत्सला माऊली कृपाळू नयनी ॥ध्रु०॥',
    'सिंहारूढ माता शोभते दिव्य रूपात । अज्ञान अंधार नाशी क्षणार्धात'
  ],
  [
    'महिषासूर मर्दिनी नमन तुला माते',
    'जय माता दी गर्जना करू भक्तीने । देवी प्रसन्न होई शुद्ध अंतःकरणाने ॥ध्रु०॥',
    'नवरात्रात पूजन करावे देवीचे । भक्तांना रक्षण देते कुलस्वामिनीचे'
  ],
  [
    'शक्तीरूपा चंडिका नमन माते',
    'अंबे जगदंबे दुर्गा भवानी । भक्तांच्या संकटी धावते रणचंडी ॥ध्रु०॥',
    'कुंकवाचे बोट लावता कपाळाला । देवी प्रसन्न होती भक्ताला'
  ],
  [
    'त्रिभुवनपालिनी देवी वंदन तुला',
    'जय जगदंबे आई जय जगदंबे । तुझ्या कृपेने भक्त होती स्वयंभू ॥ध्रु०॥',
    'तुळजापुरी अंबे भवानी विराजे । भक्तांच्या मनोकामना सहज पूर्ण होते'
  ],
  [
    'दश भुजाधारी महिषासूर मर्दिनी',
    'दुर्गे दुर्गे दुर्गे सावर आम्हाला । तुझ्या कृपेने तारशील भक्ताला ॥ध्रु०॥',
    'चंद्र सूर्याची आभा तुझ्या मुखावर । देवी तू शोभसी सर्वांवर थोर'
  ],
  [
    'सर्वमंगल मांगल्ये शिवे सर्वार्थसाधिके',
    'आई भवानी माऊली धाव रे धाव । आम्हा भक्तांचा करावा परिहार ॥ध्रु०॥',
    'सिंधूपती कन्या लक्ष्मी सरस्वती । देवी तू एकट्याने धारण करसी जगती'
  ],
];

const GANPATI_AARTI_BODIES = [
  [
    'चरणी तुझ्या आलो भावभक्तीचा ठेवा',
    'जय देव जय देव जय मंगलमूर्ती । दर्शनमात्रे होय कामनापूर्ती ॥ध्रु०॥',
    'लंबोदर पीतांबर लल्लाटी शेंदूर । दुःख निवारून देई सुख भरपूर'
  ],
  [
    'गजानना श्री गणराया विनंती तुला',
    'सुखकर्ता दुःखहर्ता विघ्नविनाशक देवा । भक्तांच्या संकटात धावे तू सदैव ॥ध्रु०॥',
    'मूषकवाहन मोदकप्रिय शुंडादंड देवा । तुझे दर्शन होता मन होते सद्भावा'
  ],
  [
    'विनायक गणेशा नमन माझे तुला',
    'गणपती बाप्पा मोरया पुढच्या वर्षी लवकर या । तुमच्या आगमनाने होई आनंदमया ॥ध्रु०॥',
    'चतुर्थीला पूजा करावी भक्तीभावे । मोदक नैवेद्य अर्पण करावे'
  ],
  [
    'एकदंत महाकाय विघ्नहर्ता देवा',
    'जय गणेश जय गणेश जय गणेश देवा । माता जाकी पार्वती पिता महादेवा ॥ध्रु०॥',
    'तुझे स्मरण करता विघ्ने दूर होती । लक्ष्मी सिद्धी ऋद्धी साथीला येती'
  ],
  [
    'शुभकार्याला प्रथम स्मरावे गणराया',
    'मंगलमूर्ती मोरया गणपती देवा । तुमच्या चरणी राहू आम्ही सदैवा ॥ध्रु०॥',
    'हरिदूर्वा शमीपत्र वाहता देवाला । गणेश प्रसन्न होऊनी रक्षी भक्ताला'
  ],
  [
    'धूम्रकेतू पीठावर बैसले सुंदर',
    'गजाननाची आरती करावी नित्य । विघ्नेश्वराच्या कृपेने होई जीव पवित्र ॥ध्रु०॥',
    'सिद्धिविनायक नामे संकट नाशे । भक्तांच्या जीवनात सुखाचे रंग दाटे'
  ],
];

// ─── Varied HARIPATH Bodies (8 sets: [line1_second, refrain, verse2]) ─────────
const HARIPATH_BODIES = [
  [
    'तेणे मुक्ती चारी साधिलेल्या',
    'हरी मुखे म्हणा हरी मुखे म्हणा । पुण्याची गणना कोण करी ॥ध्रु०॥',
    'हरी भक्तीविना नाही अन्य गती । संतांची हेची असे नित्य उक्ती'
  ],
  [
    'त्याचि चरण मनी धरावे',
    'नाम घेता नाम घेता पुण्य होते थोर । हरी भजता जीव पावे मोक्षाचे दोर ॥ध्रु०॥',
    'विठ्ठलाचे नाम म्हणता पाप नाशे । संसाराचे बंधन सहज तुटत जाते'
  ],
  [
    'हरीनाम हेचि जगी खरे तप',
    'राम कृष्ण गोविंद हरी म्हणावे मुखी । तेणे होई जीवन सार्थक सुखी ॥ध्रु०॥',
    'नामस्मरण हेचि पूजा सर्वोत्तम । तेणे मिळे मोक्ष आणि ब्रह्मानंद परम'
  ],
  [
    'ज्ञानदेवे सांगितले हरीपाठाचे सार',
    'वाचे गावे गुण हरीचे नित्याने । मनी राहो विठ्ठल त्याचे भक्तीने ॥ध्रु०॥',
    'संत तुकाराम म्हणे नाम घ्यावे सदा । तेणे होई जीव मुक्त या भवबाधा'
  ],
  [
    'पारायण करता हरीपाठाचे',
    'हरी हरी हरी म्हणत जावे मुखाने । देवाचे भजन करावे प्रेमाने ॥ध्रु०॥',
    'जो नित्य वाचतो हा हरिपाठ जगी । त्याला मिळे मोक्ष जन्मोजन्मी'
  ],
  [
    'नामस्मरणे दूर होती सारे दोष',
    'विठ्ठल नाम जपता जप घडे अखंड । हरीभक्तीने तुटे जन्ममृत्यूचे ब्रंड ॥ध्रु०॥',
    'एका नामाच्या आधारे जगावे जगी । हरी नाम सोडू नये कधी सांगे रागी'
  ],
  [
    'हरीनाम हेचि जीवाचे सार',
    'नित्य पारायण करावे हरिपाठाचे । भक्तीचे फळ मिळे जन्माचे साचे ॥ध्रु०॥',
    'ज्याने केले नाम जप त्याचे पुण्य थोर । त्याला मिळे देवाचे अनंत दरबार'
  ],
  [
    'पठण करता होई मनाची शुद्धी',
    'हरी मुखे म्हणता मन होई उजळ । तेणे जाती पापे होई जीव निर्मळ ॥ध्रु०॥',
    'संत सांगती नाम घ्यावे एकभावाने । देवापाशी जाण्याचा हाचि मार्ग खाणे'
  ],
];

// ─── Varied GAULANI Bodies (8 sets: [line1_second, verse2, verse3]) ───────────
const GAULANI_BODIES = [
  [
    'वेणू वाजवितो बाळकृष्ण वनात',
    'यशोदेचा कान्हा गोकुळीचा राजा । दहीदुधाची चोरी करी सखा माझा',
    'गौळणी निघाल्या मथुरेच्या बाजारी । आडवी उभा कृष्ण यमुना तीरी'
  ],
  [
    'मोरपिसाचा मुकुट घातला गोपाळाने',
    'वृंदावनात खेळे कृष्ण गोपींसंगे । राधेच्या प्रेमाने रंगे मन रंगे',
    'कदंब वृक्षावरी बसे बाळकृष्ण । वेणुनादाने जाहले वन चेतन'
  ],
  [
    'गोकुळात कृष्ण खेळतो आनंदाने',
    'माखनचोराने चोरले दहीहंडी । गोपींच्या मनात लागली खोडी',
    'कालिया नागाचे मर्दन केले कृष्णाने । गोकुळाचे रक्षण केले भक्तीभावाने'
  ],
  [
    'यमुनेच्या काठी खेळे गोविंद',
    'राधे तू का रुसलीस सांग मला आता । कृष्णाचे प्रेम आहे खरे अनंता',
    'गोपींसंगे होळी खेळे बाळकृष्ण । रंगाने माखले सारे वृंदावन'
  ],
  [
    'नंद यशोदेचा लाडका कान्हा',
    'गाय वासरे चारतो वनात कृष्ण । त्याच्या वेणूनादाने जग झाले प्रसन्न',
    'भक्तांच्या हृदयात वास करी गोपाळ । त्याच्या नामाने जाती सारी विकाराळ'
  ],
  [
    'मुरली वाजवत आला मुरारी',
    'गोपींचे वस्त्र चोरले कृष्णाने खेळाने । हसत खेळत राहे तो नित्य नियमाने',
    'द्वारकेचा राजा असे पांडुरंग हरी । त्याचे नाम घेता सुटे संसार फेरी'
  ],
  [
    'सुदामाचा मित्र पांडुरंग देवा',
    'पोहे खाऊनी सुदाम्याचे केले उद्धार । कृष्णाची मैत्री असे सागरापार',
    'भक्तवत्सल कृष्ण धावतो भक्तांसाठी । त्याच्या प्रेमाची नाही कोणती मिठी'
  ],
  [
    'गोपींच्या मनात वसे श्रीकृष्ण',
    'वेणूनाद ऐकता मन होई बेभान । कृष्णाच्या प्रेमात झाले जग मशगुल',
    'राधाकृष्णाचे प्रेम अनंत काळाचे । त्यांच्या नामस्मरणाने होई जीव साचे'
  ],
];

// ─── Meanings ─────────────────────────────────────────────────────────────────
const MEANINGS = [
  'या रचनेत देवाच्या नामस्मरणाचे आणि भक्तीचे महत्त्व स्पष्ट केले आहे.',
  'संसारातील दुःखातून मुक्ती मिळवण्यासाठी नामस्मरण करणे हाच खरा मार्ग आहे.',
  'संतांच्या सहवासात राहून देवाचे संकीर्तन केल्याने मनात सुख आणि शांती नांदते.',
  'मनाची शुद्धता आणि परोपकार या गुणांशिवाय ईश्वर भक्ती अपूर्ण असल्याचे सांगितले आहे.',
  'या रचनेत वारकरी परंपरेतील भक्तीमार्गाचे महत्त्व अधोरेखित केले आहे.',
  'पंढरपूरची यात्रा आणि विठ्ठलाचे दर्शन हे भक्तांचे परम ध्येय असल्याचे येथे सांगितले.',
  'हरीनाम हेचि सर्व साधनांचे सार असल्याचे या रचनेत विशद केले आहे.',
  'शुद्ध मनाने केलेली भक्ती देवाला प्रिय असते असा संदेश या रचनेतून मिळतो.',
];

function getDeterministicUuid(input: string): string {
  const hash = createHash('md5').update(input).digest('hex');
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}

function getMarathiTitleAndLyrics(
  index: number,
  type: string,
  deityName: string,
  saintName: string,
  saintSlug: string
) {
  let firstLine = '';

  // Select first line based on deity and type
  if (deityName === 'विठ्ठल') {
    if (type === 'AARTI') firstLine = VITTHAL_AARTIS[index % VITTHAL_AARTIS.length];
    else if (type === 'BHAJAN') firstLine = VITTHAL_BHAJANS[index % VITTHAL_BHAJANS.length];
    else firstLine = VITTHAL_ABHANGS[index % VITTHAL_ABHANGS.length];
  } else if (deityName === 'शिव') {
    if (type === 'AARTI') firstLine = SHIVA_AARTIS[index % SHIVA_AARTIS.length];
    else if (type === 'BHAJAN') firstLine = SHIVA_BHAJANS[index % SHIVA_BHAJANS.length];
    else firstLine = SHIVA_ABHANGS[index % SHIVA_ABHANGS.length];
  } else if (deityName === 'देवी') {
    if (type === 'AARTI') firstLine = DEVI_AARTIS[index % DEVI_AARTIS.length];
    else if (type === 'BHAJAN') firstLine = DEVI_BHAJANS[index % DEVI_BHAJANS.length];
    else firstLine = DEVI_ABHANGS[index % DEVI_ABHANGS.length];
  } else if (deityName === 'गणपती') {
    if (type === 'AARTI') firstLine = GANPATI_AARTIS[index % GANPATI_AARTIS.length];
    else if (type === 'BHAJAN') firstLine = GANPATI_BHAJANS[index % GANPATI_BHAJANS.length];
    else firstLine = GANPATI_ABHANGS[index % GANPATI_ABHANGS.length];
  } else {
    firstLine = 'हरीचे नाम मुखी सदा असू द्या';
  }

  // Override first lines for special types
  if (type === 'HARIPATH') firstLine = HARIPATHS[index % HARIPATHS.length];
  else if (type === 'GAULANI') firstLine = GAULANIS[index % GAULANIS.length];
  else if (type === 'STOTRA') firstLine = STOTRAS[index % STOTRAS.length];

  const title = `${firstLine} (क्रमांक ${index})`;

  // ── Select varied body verses using different index moduli ──────────────────
  const v1SecondIdx = index % V1_SECOND.length;
  const v2Idx = (index * 5 + 3) % VERSE_2.length;
  const v3Idx = (index * 11 + 7) % VERSE_3.length;

  let lyricsLines: string[] = [];
  let meaning = MEANINGS[index % MEANINGS.length];

  if (type === 'AARTI') {
    // Pick a varied body set for this deity
    let bodySet: string[][];
    if (deityName === 'विठ्ठल') bodySet = VITTHAL_AARTI_BODIES;
    else if (deityName === 'शिव') bodySet = SHIVA_AARTI_BODIES;
    else if (deityName === 'देवी') bodySet = DEVI_AARTI_BODIES;
    else bodySet = GANPATI_AARTI_BODIES;

    const body = bodySet[(index * 7 + 2) % bodySet.length];
    lyricsLines = [
      `${firstLine} । ${body[0]} ॥१॥`,
      body[1],
      `${body[2]} ॥२॥`,
    ];
    meaning = `ह्या आरतीत ${deityName} देवाची मंगल आरती ओवाळली आहे. भक्तीभावे देवाची सेवा करणे हेच जीवनाचे सार आहे.`;

  } else if (type === 'HARIPATH') {
    const body = HARIPATH_BODIES[(index * 3 + 1) % HARIPATH_BODIES.length];
    lyricsLines = [
      `${firstLine} । ${body[0]} ॥१॥`,
      body[1],
      `${body[2]} ॥२॥`,
    ];
    meaning = `या हरिपाठात हरी नामस्मरणाचे महत्त्व स्पष्ट केले आहे. नाम घेणे हाचि मोक्षाचा सरळ मार्ग आहे.`;

  } else if (type === 'GAULANI') {
    const body = GAULANI_BODIES[(index * 7 + 5) % GAULANI_BODIES.length];
    lyricsLines = [
      `${firstLine} । ${body[0]} ॥१॥`,
      `${body[1]} ॥२॥`,
      `${body[2]} ॥३॥`,
    ];
    meaning = `ह्या गौळणीत गोकुळातील श्रीकृष्णाच्या गोड लीलांचे वर्णन केले आहे.`;

  } else {
    // ABHANG, BHAJAN, STOTRA — use fully varied verses
    lyricsLines = [
      `${firstLine} । ${V1_SECOND[v1SecondIdx]} ॥१॥`,
      `${VERSE_2[v2Idx]} ॥२॥`,
      `${VERSE_3[v3Idx]} ॥३॥`,
    ];
    meaning = MEANINGS[(index * 3) % MEANINGS.length];
  }

  // ── Saint Signature (Verse 4) — traditional mudra ──────────────────────────
  let signature = '';
  if (saintSlug === 'tukaram-maharaj') {
    signature = `तुका म्हणे शरण आलो पाया । हरी चरणी विलीन केली काया ॥४॥`;
  } else if (saintSlug === 'dnyaneshwar-maharaj') {
    signature = `ज्ञानदेवा शरण पांडुरंगा । भक्तीचा हा वाहे नित्य नवा गंगा ॥४॥`;
  } else if (saintSlug === 'namdev-maharaj') {
    signature = `नामा म्हणे भक्तीचे हे सुख । विठ्ठलाचे नाव घेता पळाले दुःख ॥४॥`;
  } else if (saintSlug === 'eknath-maharaj') {
    signature = `एका जनार्दनी शरण हरी । मोक्ष मिळे आम्हाला संतांच्या दारी ॥४॥`;
  } else {
    signature = `संतांचे हे वचन थोर । नाम घेता आनंद होय फार अपार ॥४॥`;
  }
  lyricsLines.push(signature);

  return { title, fullText: lyricsLines.join('\n'), meaning };
}

async function main() {
  console.log('--- STARTING ACCURATE DATABASE RE-SEEDING (v2: Rich Varied Lyrics) ---');

  const dbSaints = await db.saint.findMany({
    where: { slug: { in: ['tukaram-maharaj', 'dnyaneshwar-maharaj', 'namdev-maharaj', 'eknath-maharaj'] } },
    select: { id: true, nameMarathi: true, slug: true }
  });
  const dbDeities = await db.deity.findMany({
    where: { nameMarathi: { in: ['विठ्ठल', 'शिव', 'देवी', 'गणपती'] } },
    select: { id: true, nameMarathi: true }
  });
  const dbCategories = await db.category.findMany({ select: { id: true, slug: true } });
  const categoryMap = new Map(dbCategories.map((c: any) => [c.slug, c.id]));

  if (dbSaints.length === 0 || dbDeities.length === 0) {
    console.error('Saints or Deities not found!');
    process.exit(1);
  }

  // Delete existing scale data
  console.log('Deleting existing category associations...');
  const deletedAssociations = await db.categoryComposition.deleteMany({
    where: { composition: { source: 'Scale Test Data Generator' } }
  });
  console.log(`Deleted ${deletedAssociations.count} category association mappings.`);

  console.log('Deleting existing scale-test compositions...');
  const deletedComps = await db.composition.deleteMany({ where: { source: 'Scale Test Data Generator' } });
  console.log(`Deleted ${deletedComps.count} scale compositions.`);

  // Insert 1,000,000 corrected compositions
  const count = 1000000;
  const CHUNK_SIZE = 5000;
  let insertedComps = 0;
  let insertedMappings = 0;
  const start = Date.now();

  console.log(`Ingesting ${count.toLocaleString()} correct compositions in batches of ${CHUNK_SIZE}...`);

  for (let i = 0; i < count; i += CHUNK_SIZE) {
    const chunkLimit = Math.min(CHUNK_SIZE, count - i);
    const compositions: any[] = [];
    const compCategories: any[] = [];

    for (let j = 0; j < chunkLimit; j++) {
      const index = i + j + 1;
      const saint = dbSaints[index % dbSaints.length];
      const deity = dbDeities[index % dbDeities.length];
      const type = TYPES[index % TYPES.length];

      const { title, fullText, meaning } = getMarathiTitleAndLyrics(
        index, type, deity.nameMarathi, saint.nameMarathi, saint.slug
      );

      const hash = contentHash(fullText + index);
      const slug = `comp-scale-${index}-${hash.substring(0, 8)}`;
      const compId = getDeterministicUuid(slug);

      compositions.push({
        id: compId,
        titleMarathi: title,
        titleTranslit: `Scale Composition ${index}`,
        slug,
        type,
        fullText,
        meaning,
        saintId: saint.id,
        deityId: deity.id,
        region: 'महाराष्ट्र',
        source: 'Scale Test Data Generator',
        reviewed: true,
        contentHash: hash,
        audioLinks: '[]'
      });

      // Category mapping by type
      const typeCatId = categoryMap.get(type.toLowerCase());
      if (typeCatId) compCategories.push({ compositionId: compId, categoryId: typeCatId });

      // Extra Vitthal category mapping
      if (deity.nameMarathi === 'विठ्ठल') {
        const vitthalCatId = categoryMap.get('vitthal');
        if (vitthalCatId) compCategories.push({ compositionId: compId, categoryId: vitthalCatId });
      }
    }

    try {
      await db.composition.createMany({ data: compositions, skipDuplicates: true });
      insertedComps += compositions.length;
      await db.categoryComposition.createMany({ data: compCategories, skipDuplicates: true });
      insertedMappings += compCategories.length;
      const progress = ((insertedComps / count) * 100).toFixed(1);
      process.stdout.write(`\r  → Ingested: ${insertedComps.toLocaleString()} / ${count.toLocaleString()} (${progress}%) [Mappings: ${insertedMappings.toLocaleString()}]`);
    } catch (err: any) {
      console.error(`\nError in batch starting at ${i}:`, err);
      process.exit(1);
    }
  }

  const duration = (Date.now() - start) / 1000;
  console.log(`\n\n🟢 Scale Re-seeding Complete!`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Compositions Re-seeded:  ${insertedComps.toLocaleString()}`);
  console.log(`Category Mappings Created: ${insertedMappings.toLocaleString()}`);
  console.log(`Execution Time:         ${duration.toFixed(2)} seconds`);
  console.log(`Ingestion Speed:        ${Math.round(insertedComps / duration).toLocaleString()} compositions/sec`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch((err) => {
  console.error('❌ Reseed failed:', err);
  process.exit(1);
});

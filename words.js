// Game content: word categories (Estonian). Category ids are English; labels and words are shown to players.
const WORD_CATEGORIES = [
  {
    id: 'places',
    label: 'Kohad',
    words: [
      'lennujaam', 'raamatukogu', 'haigla', 'kool', 'kino', 'rand', 'loomaaed', 'kirik', 'turg', 'pank',
      'bensiinijaam', 'juuksur', 'jõusaal', 'saun', 'teater', 'muuseum', 'restoran', 'apteek', 'postkontor', 'rongijaam',
      'sadam', 'mänguväljak', 'kalmistu', 'vangla', 'hotell', 'kontor', 'ujula', 'lasteaed', 'kaubanduskeskus', 'laut',
    ],
  },
  {
    id: 'food',
    label: 'Toit ja jook',
    words: [
      'pannkook', 'kartul', 'verivorst', 'kama', 'pitsa', 'sushi', 'supp', 'leib', 'juust', 'mesi',
      'šokolaad', 'jäätis', 'kohv', 'tee', 'piim', 'kali', 'õun', 'banaan', 'maasikas', 'seen',
      'hapukapsas', 'pelmeenid', 'hamburger', 'omlett', 'tort', 'kringel', 'sült', 'räim', 'kiluvõileib', 'popkorn',
    ],
  },
  {
    id: 'animals',
    label: 'Loomad',
    words: [
      'koer', 'kass', 'hobune', 'lehm', 'siga', 'lammas', 'kana', 'part', 'hunt', 'karu',
      'ilves', 'rebane', 'jänes', 'siil', 'põder', 'metssiga', 'orav', 'kaelkirjak', 'elevant', 'lõvi',
      'tiiger', 'ahv', 'pingviin', 'delfiin', 'hai', 'kilpkonn', 'madu', 'konn', 'öökull', 'kotkas',
    ],
  },
  {
    id: 'jobs',
    label: 'Ametid',
    words: [
      'arst', 'õpetaja', 'politseinik', 'tuletõrjuja', 'kokk', 'pagar', 'piloot', 'bussijuht', 'ehitaja', 'talunik',
      'programmeerija', 'müüja', 'postiljon', 'hambaarst', 'medõde', 'näitleja', 'laulja', 'kunstnik', 'ajakirjanik', 'advokaat',
      'kohtunik', 'raamatupidaja', 'elektrik', 'torulukksepp', 'kosmonaut', 'sõdur', 'treener', 'fotograaf', 'kalur', 'teadlane',
    ],
  },
  {
    id: 'sports',
    label: 'Sport ja vaba aeg',
    words: [
      'jalgpall', 'korvpall', 'võrkpall', 'tennis', 'sulgpall', 'ujumine', 'suusatamine', 'uisutamine', 'jäähoki', 'kergejõustik',
      'kõrgushüpe', 'maadlus', 'poks', 'jooksmine', 'jalgrattasõit', 'rallisõit', 'golf', 'male', 'bowling', 'kalapüük',
      'matkamine', 'purjetamine', 'sõudmine', 'jooga', 'tantsimine', 'ronimine', 'lauatennis', 'kiiking', 'orienteerumine', 'lumelauasõit',
    ],
  },
  {
    id: 'home',
    label: 'Kodu',
    words: [
      'diivan', 'külmkapp', 'pliit', 'mikrolaineahi', 'pesumasin', 'tolmuimeja', 'voodi', 'padi', 'tekk', 'vaip',
      'peegel', 'kardin', 'lamp', 'televiisor', 'seinakell', 'kahvel', 'lusikas', 'nuga', 'taldrik', 'kruus',
      'hambahari', 'seep', 'rätik', 'vann', 'dušš', 'riidekapp', 'tool', 'laud', 'uks', 'aken',
    ],
  },
  {
    id: 'transport',
    label: 'Transport',
    words: [
      'auto', 'buss', 'tramm', 'troll', 'rong', 'lennuk', 'helikopter', 'laev', 'praam', 'paat',
      'jalgratas', 'tõukeratas', 'mootorratas', 'takso', 'veoauto', 'traktor', 'rakett', 'allveelaev', 'kanuu', 'purjekas',
      'kiirabiauto', 'tuletõrjeauto', 'kuumaõhupall', 'suusad', 'kelk', 'rula', 'hobuvanker', 'lift', 'eskalaator', 'mopeed',
    ],
  },
  {
    id: 'estonia',
    label: 'Eesti',
    words: [
      'laulupidu', 'jaanipäev', 'Kalevipoeg', 'Lotte', 'Saaremaa', 'Hiiumaa', 'Kihnu', 'Toompea', 'Vana Toomas', 'Pikk Hermann',
      'Suur Munamägi', 'Peipsi järv', 'Emajõgi', 'raba', 'rehielamu', 'vastlapäev', 'mardipäev', 'kadripäev', 'rahvariided', 'Tartu',
      'Pärnu', 'Narva', 'Kuressaare', 'Lennusadam', 'Kumu', 'Kadriorg', 'Lahemaa', 'Soomaa', 'kodukohvik', 'teletorn',
    ],
  },
  {
    id: 'nature',
    label: 'Loodus',
    words: [
      'mets', 'meri', 'jõgi', 'järv', 'mägi', 'vulkaan', 'kõrb', 'saar', 'kosk', 'koobas',
      'liivaluide', 'vikerkaar', 'äike', 'välk', 'lumi', 'vihm', 'udu', 'tuul', 'päike', 'kuu',
      'täht', 'pilv', 'jäämägi', 'kask', 'kuusk', 'tamm', 'sammal', 'lill', 'muru', 'kivi',
    ],
  },
  {
    id: 'items',
    label: 'Esemed',
    words: [
      'vihmavari', 'prillid', 'võti', 'rahakott', 'telefon', 'kõrvaklapid', 'seljakott', 'kohver', 'pastakas', 'käärid',
      'haamer', 'kruvikeeraja', 'taskulamp', 'küünal', 'tikutoos', 'kaamera', 'raamat', 'ajaleht', 'kindad', 'müts',
      'sall', 'kingad', 'kummikud', 'käekell', 'sõrmus', 'kaelakee', 'pall', 'nukk', 'kitarr', 'klaver',
    ],
  },
];

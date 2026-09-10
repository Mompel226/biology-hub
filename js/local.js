/* ============================================================
   Biology Hub — the local layer (NLCS Jeju edition)
   ------------------------------------------------------------
   EVERYTHING IN THIS FILE IS SCHOOL-SPECIFIC, AND THIS IS THE
   ONLY FILE THAT DIFFERS FROM THE OPEN EDITION.

   js/shelves.js is the register every school shares: the four
   shelves, the year groups, what is open, the image credits.
   This file adds what belongs to NLCS Jeju alone — the doors
   for the school's own clubs and societies, its own links — and
   renames the site.

   The open edition (repo igcse-biology-hub) carries the same
   files with this one replaced by a stub. So a change made to
   the shared files reaches both; a change made here reaches
   only the school. Run `node tools/sync-edition.mjs` to push
   the shared files across.

   site    strings that name the school
   entry   THE FRONT OF THE BUILDING. Present, it stands a page of doors in
           front of the revision hub: the first (`hero`, view "revision")
           leads into the hub, the rest into a section each. The open
           edition has no entry, so its index.html is the revision hub
           itself, as it always was, with no way back to a school it does
           not belong to. Each entry door needs an image at
           assets/doors/<id>-900|1400|1800, like a shelf.
   sections
           the pages behind the entry doors. Each is a masthead and the
           wide banner doors below that carry its `kind`. Adding a club or
           a society is still one entry in `doors`; it lands on the page
           whose kind it names, and its name appears on that page's entry
           door by itself.
   doors   the wide doors, one per club, society or activity.
           `kind` decides the band a door falls under: "cca" for a
           co-curricular activity, "society" for a society. js/hub.js
           declares the bands and their order; adding another club or
           society here is all it takes for it to appear.
           `ground` is the flat colour at the banner's left edge — the
           words fade out of it, so it must match the image.
           `plate` is the banner's own pixel size, [w,h] — the door's
           box is cut to that shape, so a banner drawn short is not
           given a deep box with the picture adrift in it. Default
           [1800,614].
           `bleed` says the banner is drawn to be cut at the sides. The
           open door then fills its height with it instead of fitting it
           whole, which shows it half as large again — only set it if
           nothing that must be read comes near either end.
           `motion` is the moving part of the banner, given as the
           geometry of what is printed on it, in the plate's own
           coordinates. js/hub.js draws it live on top, so it lands on
           the printed art at every size. Change the banner and these
           numbers change with it.
   open    extra entries in "Open now"
   credits extra image credits
   ============================================================ */
window.HUB_LOCAL = {

  /* Where a hand-in goes. The same deployed Apps Script every lab posts to — see the
     README, "Would you like to see how your students are doing?". This is a school's own
     address, so it lives here and not in the shared register. */
  submitUrl:'https://script.google.com/macros/s/AKfycbzwjMHaa88OL_GzR8wZ2mV6a8rs1CKYahbW5iOTQPyzWzCGIrAZPApGsP2oujK34tRc/exec',

  site: {
    title:'Biology Hub — NLCS Jeju',
    description:'Biology at NLCS Jeju behind five doors: IGCSE revision — Foundations, the human body, Plants, Life on Earth — then the school\'s co-curricular activities, its student societies, Bryant, and student enterprises. Cambridge IGCSE 0610, with IB as a layer.',
    eyebrow:'Cambridge IGCSE Biology 0610 · NLCS Jeju',
    maker:'Made by <strong>Dr Daniel Mompel Riera</strong> · Biology, NLCS Jeju',
    byline:'Made by <strong>Dr Daniel Mompel Riera</strong> · NLCS Jeju · <a href="mailto:dmompelriera@nlcsjeju.kr">dmompelriera@nlcsjeju.kr</a>'
  },

  /* ── the front of the building ─────────────────────────────
     One movement per door, in the second person. The section doors take their chips and
     their "n doors" line from the doors below by themselves, so a club added there appears
     on its entry door without another edit. */
  entry: {
    crumb:'Biology Hub',
    eyebrow:'NLCS Jeju · Biology',
    title:'Biology <em>Hub</em>',
    lede:'Five doors. The first is where you revise: to learn, and to be ready for the IGCSE. The other four are what Biology at NLCS Jeju offers beyond the curriculum.',
    /* said once over the row of four, so no door has to say it for itself */
    rowLabel:'Beyond the curriculum',
    docTitle:'Biology Hub — NLCS Jeju',
    /* what the revision page calls itself once you are through the first door */
    revisionTitle:'IGCSE <em>Revision</em>',
    revisionDocTitle:'IGCSE Revision — Biology Hub, NLCS Jeju',

    doors: [
      { id:'revision', hero:true, view:'revision', eyebrow:'01 · Revision',
        title:'IGCSE <em>Revision</em>', sub:'the whole subject, shelf by shelf',
        blurb:'Here you go in to revise: to learn it properly, and to be ready when the IGCSE comes. Four shelves, one for each part of the subject: behind each is a map you point at, and behind the map are the labs, where the questions mark themselves.',
        topics:[ {t:'Foundations'}, {t:'The human body'}, {t:'Plants'}, {t:'Life on Earth'} ],
        status:'live', accent:'#4FC3F7', tone:'dark', focus:'50% 50%',
        alt:'Sea anemones from Ernst Haeckel\u2019s Kunstformen der Natur, 1904: a plate crowded with anemones in yellow, pink and violet on a dark sea floor' },

      { id:'ccas', view:'ccas', eyebrow:'02 · Co-curricular activities',
        title:'CCAs', sub:'after lessons',
        blurb:'Here you do biology with your hands after lessons: an aquarium to keep alive, a forum to stand up in, a journal to write for.',
        status:'live', accent:'#2DD4BF', tone:'dark', focus:'55% 50%',
        alt:'Koi in a pond, seen from above, with lotus leaves at the edge' },

      { id:'societies', view:'societies', eyebrow:'03 · Student societies',
        title:'Societies', sub:'run by students',
        blurb:'Here you do science the way it is really done, and then publish it: a question of your own, evidence, a paper your peers read before anyone else does.',
        status:'live', accent:'#B8860B', tone:'light', focus:'50% 14%',
        alt:'Charles Darwin\u2019s notebook page of 1837: the first sketch of a tree of life, under the words I think' },

      { id:'bryant', view:'bryant', eyebrow:'04 · The activity programme',
        title:'Bryant', sub:'on Saturday mornings',
        blurb:'Here you spend a Saturday morning going beyond the timetable, in a programme named after a climber: Sophie Bryant, mathematician, headmistress of North London Collegiate, the first woman in England to hold a Doctor of Science, and twice up the Matterhorn.',
        topics:[ {t:'Mathematician'}, {t:'Headmistress, 1895\u20131918'}, {t:'Matterhorn, twice'} ],
        /* the words' panel frosts the lower two thirds of a tile, so her face has to sit in the
           top third: the picture is pushed up until it does */
        status:'live', detail:'Who she was', accent:'#C9A227', tone:'dark', focus:'50% 100%',
        alt:'Sophie Bryant, photographed in the 1880s or early 1890s: a woman in a dark high-collared dress, looking straight at the camera' },

      { id:'enterprises', view:'enterprises', eyebrow:'05 · Community enterprises',
        title:'Enterprises', sub:'for the community',
        blurb:'Here you give something back. An enterprise here is a project for the people around us, on Jeju and across Korea, and it is measured by who it helps, not by what it makes. A blood donation drive is one of them.',
        status:'live', accent:'#FF6B6B', tone:'dark', focus:'50% 50%',
        alt:'Human blood under a scanning electron microscope: red blood cells, a white blood cell and a platelet' }
    ]
  },

  sections: [
    { id:'ccas', kind:'cca', label:'Co-curricular activities',
      eyebrow:'NLCS Jeju · Co-curricular activities', title:'Co-curricular <em>activities</em>',
      lede:'Biology after lessons. Each of these has a home of its own, and its door takes you there.' },
    { id:'societies', kind:'society', label:'Societies',
      eyebrow:'NLCS Jeju · Societies', title:'Student <em>societies</em>',
      lede:'Run by students, for students. Each door leads to the society\u2019s own site.' },
    { id:'bryant', kind:'bryant', label:'Bryant',
      eyebrow:'NLCS Jeju · Bryant', title:'<em>Bryant</em>',
      lede:'The co-curricular and activity programme, on Saturday mornings, named after the second headmistress of North London Collegiate. Its doors will stand here as they open; hers is up already.' },
    { id:'enterprises', kind:'enterprise', label:'Enterprises',
      eyebrow:'NLCS Jeju · Enterprises', title:'Community <em>enterprises</em>',
      lede:'Student projects for the people around us, on Jeju and across Korea. An enterprise here is measured by who it helps, not by what it makes. This section is being set up; its doors will stand here.' }
  ],

  doors: [
    { id:'bioguardians', kind:'cca', eyebrow:'CCA · Beyond the syllabus',
      title:'<em>BioGuardians</em> — a living aquarium',
      blurb:'Here you look after living things: a real aquarium at NLCS Jeju, kept healthy by the students who run it. BioCoders builds what helps — a camera that learns the fish, sensors on the water, lights on a timer — and every species they document becomes a card in Habitat Clash, because caring for nature should be fun too.',
      topics:[ {t:'Fish, plants, water'}, {t:'Camera'}, {t:'Sensors'}, {t:'Habitat Clash'} ],
      status:'local', url:'http://bioguardians.local/', detail:'Opens on the school network',
      accent:'#2A8C7A', tone:'light', ground:'#F7EBD5', focus:'50% 50%',
      alt:'The BioGuardians banner: a koi, cattails, water lilies, a heron, a frog, lotus, an eel and beetles, one to each letter' },

    { id:'medical-review', kind:'cca', eyebrow:'CCA · Medicine and research',
      title:'<em>Medical Review</em> — a forum and a journal',
      blurb:'Here you take a question in medicine and follow it the way a researcher would: you read what has already been published, weigh it, write it up, and then stand in front of a panel and say what you found. A teacher registers you in the summer, the research runs through the autumn, the forum is held in the spring, and the strongest reviews are published in the journal that follows.',
      topics:[ {t:'Reading the literature'}, {t:'Writing a review'}, {t:'The forum'}, {t:'The journal'} ],
      status:'live', url:'https://medicalreviewkorea.org/', detail:'Years 10 to 12 · through a teacher',
      accent:'#5FA5FF', focus:'50% 50%', ground:'#00265C',
      /* Shorter than the other two, and cut at both ends: the wordmark is very wide for its
         height, so on a deep plate it sat in a sea of blue and shrank again when the door
         opened. The trace runs off the left and the rule off the right — those ends are
         meant to go. The wordmark itself keeps to 760-1319, which survives the cut at every
         width the page is used at. */
      plate:[1800, 420], bleed:true,
      /* the trace printed on the plate, so a beat can run along it into the wordmark.
         underWords is where a shut door lays its own words over the plate: the light holds
         off until past them, so it never reads as a line struck through the title. */
      motion:{ underWords:[640, 790], trace:{ colour:'#FFE2E4', width:4.8, seconds:2.1,
        d:'M0 210 H300 L316 198 L332 222 L348 204 L364 210 H470 L488 190 L504 210 L518 132 ' +
          'L538 292 L556 172 L572 210 H766' } },
      alt:'The Medical Review banner: the wordmark in white on royal blue, the red pulse from its own logo carried across the plate' },

    { id:'snhs', kind:'society', eyebrow:'Society · Student research',
      title:'<em>Science NHS</em> — research, written up and published',
      blurb:'Here you do science the way it is really done: you choose a question of your own, design a method, gather the evidence and write it up so that someone else could follow every step. The society reads the work, edits it, and publishes the strongest papers in its own journal, free for anyone to read.',
      topics:[ {t:'A question of your own'}, {t:'Method and evidence'}, {t:'Peer review'}, {t:'The journal'} ],
      status:'live', url:'https://nlcsjejusnhs.org/', detail:'Open access · student-led',
      accent:'#22C3B0', focus:'50% 50%', ground:'#08101D',
      /* the three rings printed on the plate — one electron runs each, going out where
         the rings themselves pass behind the society's name */
      motion:{ fadeOut:[930, 1035],
               orbits:{ cx:690, cy:307, rx:452, ry:170, r:6.5, seconds:7.4,
                        colour:'#FFF0C2', glow:'#E3B93C' } },
      alt:'The Science National Honor Society banner: the society crest in gold and purple on navy, standing on the orbits of the atom it carries, with an electron running each ring' },

    /* A section with nothing in it yet still needs to say what it is for. These two doors
       wear their section\u2019s own picture (`img`) and stay shut. Replace each with the real
       doors when there is something to open — one entry per activity, as above. */
    /* The Bryant page opens with the woman it is named after. `hero` makes this a full-width
       door like the one on the front, words always out, rather than a banner. */
    { id:'sophie-bryant', kind:'bryant', hero:true, name:'Sophie Bryant',
      eyebrow:'Dr Sophie Bryant \u00B7 1850\u20131922',
      title:'The woman it is <em>named after</em>',
      blurb:'Sophie Bryant taught mathematics at North London Collegiate from 1875 and led the school from 1895 to 1918. In 1884 she became the first woman in England to be awarded a Doctor of Science. She rowed, swam and cycled, twice climbed the Matterhorn, and died in the Alps at 72, walking near Chamonix. The programme that carries her name takes you out beyond the timetable in her spirit.',
      topics:[ {t:'Dublin, 1850'}, {t:'DSc, 1884'}, {t:'Headmistress, 1895\u20131918'}, {t:'Royal Commission, 1894'}, {t:'Matterhorn, twice'} ],
      status:'live', url:'https://en.wikipedia.org/wiki/Sophie_Bryant', detail:'Her life, in full', go:'Read more',
      accent:'#C9A227', tone:'dark', focus:'100% 50%',
      alt:'Sophie Bryant, photographed in the 1880s or early 1890s, at the right of a dark plate: a woman in a dark high-collared dress, looking straight at the camera' },

    /* A section with nothing in it yet still needs to say what it is for: one shut door, full
       width like a hero, wearing the section\u2019s own picture (`img`). Replace it with the real
       doors when there is something to open \u2014 one entry per enterprise, like the clubs above. */
    { id:'enterprises-soon', kind:'enterprise', hero:true, img:'enterprises', eyebrow:'Enterprises \u00B7 Coming',
      title:'The doors are <em>not up yet</em>',
      blurb:'When this section opens, each enterprise will have a door here: what it does, who it helps, and how you join. A blood donation drive is one of them. Nothing to open for now.',
      status:'planned', url:null, note:'Enterprises is not open yet. Nothing here to click, for now.',
      accent:'#FF6B6B', tone:'dark', focus:'50% 50%',
      alt:'Human blood under a scanning electron microscope: red blood cells, a white blood cell and a platelet' }
  ],

  open: [],

  credits: [
    { door:'BioGuardians', text:'banner by Daniel Mompel Riera for the BioGuardians CCA', licence:'', url:'' },
    { door:'Medical Review', text:'banner set from the Medical Review wordmark, used with permission', licence:'', url:'https://medicalreviewkorea.org/' },
    { door:'Science NHS', text:'banner set from the society crest, used with permission', licence:'', url:'https://nlcsjejusnhs.org/' },
    { door:'Revision',    text:'sea anemones, Ernst Haeckel, Kunstformen der Natur (1904), plate 49', licence:'public domain',
      url:'https://commons.wikimedia.org/wiki/File:Haeckel_Actiniae.jpg' },
    { door:'CCAs',        text:'koi pond, GeorgeTan#5', licence:'CC0',
      url:'https://commons.wikimedia.org/wiki/File:Koi_pond_-_Flickr_-_GeorgeTan%5E5.jpg' },
    { door:'Societies',   text:'Darwin\u2019s notebook B, 1837 \u2014 the first tree', licence:'public domain',
      url:'https://commons.wikimedia.org/wiki/File:Darwin_Tree_1837.png' },
    { door:'Bryant',      text:'Sophie Bryant, photomechanical print, Rijksmuseum', licence:'CC0',
      url:'https://commons.wikimedia.org/wiki/File:Portret_van_Sophie_Bryant,_RP-F-2001-7-232E-14.jpg' },
    { door:'Enterprises', text:'human blood, SEM, Bruce Wetzel and Harry Schaefer, NCI', licence:'public domain, shown as a duotone',
      url:'https://commons.wikimedia.org/wiki/File:SEM_blood_cells.jpg' }
  ]
};

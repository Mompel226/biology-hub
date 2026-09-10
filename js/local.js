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
    /* The Veterinary Society's site is its own repository, veterinary-society, so its members
       can edit it. The plate here is a flat ground; the mark is drawn by the page
       (`motion.draw`): small and whole in the band while the door is shut, then big beside the
       words when it opens, with the magazine's other animals drawing in on the right. The
       numbers come from tools/mark.py in that repository. */
    { id:'vetsoc', kind:'society', name:'Veterinary Society', eyebrow:'Society \u00B7 Animals and medicine',
      title:'<em>Veterinary Society</em> \u2014 cases, hands, and the animals of Jeju',
      blurb:'Here you do what a vet does, in miniature: work through real clinical cases, learn to suture and to take blood on a model, read how an animal behaves and how a dog learns, and write it up. The society\u2019s magazine, Island Immunity, is on its site, with the address to write to if you want to join.',
      topics:[ {t:'Clinical cases'}, {t:'Suturing \u00B7 taking blood'}, {t:'Animal behaviour'}, {t:'Island Immunity, issue 1'} ],
      status:'live', url:'https://mompel226.github.io/veterinary-society/', detail:'Chair: Henry Yuan', go:'Visit',
      accent:'#F5A623', ground:'#12262B', plate:[1800, 614],
      motion:{ draw:{"groups": [{"id": "head", "shut": {"x": 1024, "y": 236, "s": 0.36}, "open": {"x": 26, "y": 44, "s": 1.24}, "paths": [{"d": "M 230 74 C 214 48 200 20 196 -8 C 214 10 234 40 244 68", "width": 9, "colour": "#F3E7C9", "at": 0.0, "seconds": 0.25}, {"d": "M 266 70 C 276 38 290 14 304 -4 C 306 24 292 52 276 74", "width": 9, "colour": "#F3E7C9", "at": 0.1, "seconds": 0.25}, {"d": "M 248 72 C 238 108 198 148 160 190 C 128 226 94 254 66 282 C 44 304 38 330 56 344 C 76 358 104 352 124 338 C 150 330 196 338 240 334 C 290 330 326 296 322 246 C 318 210 288 178 246 164", "width": 9, "colour": "#F3E7C9", "at": 0.3, "seconds": 0.95}, {"d": "M 252 70 C 238 84 226 104 222 124", "width": 5, "colour": "#9DB7AE", "at": 0.5, "seconds": 0.2}, {"d": "M 292 68 C 348 100 384 180 390 300", "width": 6, "colour": "#9DB7AE", "at": 0.55, "seconds": 0.4}, {"d": "M 300 92 C 332 132 346 190 344 258", "width": 5, "colour": "#9DB7AE", "at": 0.62, "seconds": 0.35}, {"d": "M 314 122 C 348 160 362 214 362 280", "width": 5, "colour": "#9DB7AE", "at": 0.69, "seconds": 0.35}, {"d": "M 326 160 C 364 200 378 246 380 300", "width": 5, "colour": "#9DB7AE", "at": 0.76, "seconds": 0.35}, {"d": "M 300 326 C 320 352 336 384 346 420", "width": 6, "colour": "#9DB7AE", "at": 0.95, "seconds": 0.3}, {"d": "M 64 298 C 74 292 84 294 90 302", "width": 6, "colour": "#F3E7C9", "at": 1.15, "seconds": 0.18}, {"d": "M 70 332 C 84 336 98 336 110 330", "width": 5, "colour": "#F3E7C9", "at": 1.22, "seconds": 0.18}], "marks": [{"cx": 222, "cy": 156, "r": 27, "colour": "#F3E7C9", "width": 8, "fill": "none", "at": 1.28}, {"cx": 222, "cy": 156, "r": 12, "fill": "#F5A623", "at": 1.36}]}, {"id": "name", "shut": {"x": 1196, "y": 292, "s": 1}, "open": {"x": 612, "y": 318, "s": 1.58}, "text": [{"x": 0, "y": 0, "text": "Veterinary", "size": 58, "family": "Fraunces, Georgia, serif", "style": "italic", "weight": 400, "fill": "#F3E7C9", "at": 1.45}, {"x": 0, "y": 56, "text": "Society", "size": 58, "family": "Fraunces, Georgia, serif", "style": "normal", "weight": 400, "fill": "#F3E7C9", "at": 1.55}, {"x": 3, "y": 90, "text": "NLCS JEJU", "size": 15, "family": "'IBM Plex Mono', monospace", "spacing": 4, "fill": "#9DB7AE", "at": 1.65}]}, {"id": "hen", "open": {"x": 1150, "y": 70, "s": 0.78}, "onlyOpen": true, "paths": [{"d": "M 92 70 C 126 48 180 58 188 104 C 194 144 156 168 112 166 C 72 164 46 140 50 106 C 54 86 70 74 92 70", "width": 5, "colour": "#9DB7AE", "at": 1.55, "seconds": 0.55}, {"d": "M 72 80 C 54 60 58 26 84 18 C 110 10 128 30 118 54 C 112 68 100 72 92 70", "width": 5, "colour": "#9DB7AE", "at": 2.05, "seconds": 0.3}, {"d": "M 62 36 L 38 44 L 62 52", "width": 4, "colour": "#9DB7AE", "at": 2.3, "seconds": 0.12}, {"d": "M 80 20 C 78 4 90 2 92 14 C 96 0 110 2 108 16 C 114 8 124 12 122 26", "width": 4, "colour": "#9DB7AE", "at": 2.4, "seconds": 0.2}, {"d": "M 68 56 C 62 70 76 76 82 64", "width": 3, "colour": "#9DB7AE", "at": 2.55, "seconds": 0.1}, {"d": "M 180 80 C 198 54 214 46 228 32 M 186 90 C 208 76 224 76 236 70 M 188 102 C 208 100 222 106 230 114", "width": 4, "colour": "#9DB7AE", "at": 2.6, "seconds": 0.3}, {"d": "M 104 166 L 104 190 M 92 192 L 118 192 M 130 165 L 132 190 M 120 192 L 146 192", "width": 4, "colour": "#9DB7AE", "at": 2.85, "seconds": 0.2}], "marks": [{"cx": 94, "cy": 36, "r": 4, "fill": "#9DB7AE", "at": 3.0}]}, {"id": "pig", "open": {"x": 1130, "y": 330, "s": 0.86}, "onlyOpen": true, "paths": [{"d": "M 72 64 C 112 32 222 32 262 66 C 292 92 290 140 258 158 C 220 176 112 176 74 152 C 46 134 44 86 72 64", "width": 5, "colour": "#9DB7AE", "at": 1.25, "seconds": 0.6}, {"d": "M 46 96 C 30 98 28 124 46 126 C 62 128 64 94 46 96", "width": 4, "colour": "#9DB7AE", "at": 1.8, "seconds": 0.2}, {"d": "M 40 106 L 40 108 M 40 116 L 40 118", "width": 5, "colour": "#9DB7AE", "at": 1.95, "seconds": 0.08}, {"d": "M 60 134 C 70 142 82 140 90 132", "width": 4, "colour": "#9DB7AE", "at": 2.0, "seconds": 0.12}, {"d": "M 102 54 L 112 20 L 140 50", "width": 5, "colour": "#9DB7AE", "at": 2.05, "seconds": 0.2}, {"d": "M 274 86 C 300 70 306 100 288 104 C 278 104 278 92 288 90", "width": 4, "colour": "#9DB7AE", "at": 2.2, "seconds": 0.25}, {"d": "M 102 172 L 102 190 M 130 175 L 130 190 M 200 175 L 200 190 M 232 170 L 234 190", "width": 5, "colour": "#9DB7AE", "at": 2.4, "seconds": 0.25}], "marks": [{"cx": 78, "cy": 86, "r": 4, "fill": "#9DB7AE", "at": 2.55}]}, {"id": "cow", "open": {"x": 1440, "y": 40, "s": 1.02}, "onlyOpen": true, "paths": [{"d": "M 96 92 C 84 140 84 200 98 236 C 104 272 176 272 182 236 C 196 200 196 140 184 92 C 174 56 106 56 96 92", "width": 5, "colour": "#9DB7AE", "at": 1.75, "seconds": 0.7}, {"d": "M 94 104 C 62 92 30 98 30 116 C 30 132 66 130 94 116", "width": 4, "colour": "#9DB7AE", "at": 2.3, "seconds": 0.3}, {"d": "M 186 104 C 218 92 250 98 250 116 C 250 132 214 130 186 116", "width": 4, "colour": "#9DB7AE", "at": 2.3, "seconds": 0.3}, {"d": "M 102 72 C 76 60 52 40 54 8 C 64 22 84 34 108 44", "width": 4, "colour": "#9DB7AE", "at": 2.55, "seconds": 0.3}, {"d": "M 178 72 C 204 60 228 40 226 8 C 216 22 196 34 172 44", "width": 4, "colour": "#9DB7AE", "at": 2.55, "seconds": 0.3}, {"d": "M 112 232 C 114 242 124 242 126 232 M 154 232 C 156 242 166 242 168 232", "width": 3, "colour": "#9DB7AE", "at": 2.85, "seconds": 0.15}], "marks": [{"cx": 118, "cy": 152, "r": 4, "fill": "#9DB7AE", "at": 2.9}, {"cx": 162, "cy": 152, "r": 4, "fill": "#9DB7AE", "at": 2.95}]}]} },
      alt:'The Veterinary Society mark: a stethoscope drawn as a horse\u2019s head, the chest piece its eye, beside the words Veterinary Society, NLCS Jeju' },

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
    { door:'Veterinary Society', text:'mark drawn for the society by Daniel Mompel Riera: a stethoscope that is a horse\u2019s head', licence:'', url:'https://mompel226.github.io/veterinary-society/' },
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

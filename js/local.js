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
   doors   extra doors, standing full width beneath the four shelves.
           `kind` decides the band a door falls under: "cca" for a
           co-curricular activity, "society" for a society. js/hub.js
           declares the bands and their order; adding another club or
           society here is all it takes for it to appear.
           `ground` is the flat colour at the banner's left edge — the
           words fade out of it, so it must match the image.
           `motion` is the moving part of the banner, given as the
           geometry of what is printed on it, in the banner's own
           1800x614 coordinates. js/hub.js draws it live on top, so it
           lands on the printed art at every size. Change the banner and
           these numbers change with it.
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
    description:'Every interactive Biology app at NLCS Jeju behind four doors — Foundations, the human body, Plants, Life on Earth — and beneath them the school\'s own clubs and societies: BioGuardians, Medical Review and the Science National Honor Society. Cambridge IGCSE 0610, with IB as a layer.',
    eyebrow:'Cambridge IGCSE Biology 0610 · NLCS Jeju',
    maker:'Made by <strong>Dr Daniel Mompel Riera</strong> · Biology, NLCS Jeju',
    byline:'Made by <strong>Dr Daniel Mompel Riera</strong> · NLCS Jeju · <a href="mailto:dmompelriera@nlcsjeju.kr">dmompelriera@nlcsjeju.kr</a>'
  },

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
      accent:'#5FA5FF', focus:'50% 50%', ground:'#02265C',
      /* the trace printed on the plate, so a beat can run along it into the wordmark.
         fadeIn is where the printed line itself comes up out of the ground — past the
         words a shut door lays over its left third. */
      motion:{ fadeIn:[470, 720], trace:{ colour:'#FFE2E4', width:5.2, seconds:2.1,
        d:'M470 307 H700 L716 291 L734 323 L750 299 L766 307 H840 L856 285 L872 307 L886 243 ' +
          'L904 371 L920 271 L936 307 H1000 L1014 295 L1028 319 L1042 303 L1056 307 H1136' } },
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
      alt:'The Science National Honor Society banner: the society crest in gold and purple on navy, standing on the orbits of the atom it carries, with an electron running each ring' }
  ],

  open: [],

  credits: [
    { door:'BioGuardians', text:'banner by Daniel Mompel Riera for the BioGuardians CCA', licence:'', url:'' },
    { door:'Medical Review', text:'banner set from the Medical Review wordmark, used with permission', licence:'', url:'https://medicalreviewkorea.org/' },
    { door:'Science NHS', text:'banner set from the society crest, used with permission', licence:'', url:'https://nlcsjejusnhs.org/' }
  ]
};

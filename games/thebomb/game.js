/* TheBomb.com: a Cool Matt Games original, from an idea by Matt Jones.
   Run one website through four eras of the internet. A time machine links them,
   and every era keeps running while you are away.
   Plain DOM, no libraries. Every company and screen name in here is made up. */
(function () {
  'use strict';

  var CMG = window.CMG || { store: function () { return null; }, countPlay: function () {} };
  var SAVE_KEY = 'cmg:thebomb:save', MUTE_KEY = 'cmg:muted';
  var THRESH = [0, 25, 100, 300, 800, 2000, 5000];   // traffic needed before each feature can be written
  var RATES = [1, 2, 4, 8, 15, 30, 60];              // traffic per second each feature adds
  var GOAL = 20000;                                  // traffic that ends an era

  var $ = function (id) { return document.getElementById(id); };
  var root = $('bomb'), elDial = $('tm'), elWorth = $('worth'), elTitle = $('title'), elBar = $('bbar'),
      elView = $('view'), elChat = $('chatlog'), elChatName = $('chatname'), elMoney = $('money'),
      elToast = $('toast'), btnSound = $('btn-sound');

  var S, tab = 'site', confirmReset = false, availKey = '', sinceSave = 0;
  var muted = CMG.store(MUTE_KEY) === '1';

  /* ---------- helpers ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) {
    n = Math.floor(n); var a = Math.abs(n);
    if (a >= 1e9) return '$' + (n / 1e9).toFixed(a >= 1e10 ? 1 : 2) + 'B';
    if (a >= 1e6) return '$' + (n / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
    return '$' + n.toLocaleString('en-US');
  }
  function num(n) {
    n = Math.floor(n);
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e7) return (n / 1e6).toFixed(1) + 'M';
    return n.toLocaleString('en-US');
  }
  function pad6(n) { n = String(Math.floor(n)); while (n.length < 6) n = '0' + n; return n; }
  function era(i) { return S.eras[i]; }
  function rate(i) {
    var r = 0, E = era(i);
    for (var k = 0; k < E.built; k++) r += RATES[k];
    return r * E.mul;
  }
  function shown(i, hits) { return hits * ERAS[i].mult; }   // each era counts traffic at its own scale

  /* ---------- sound ---------- */
  var ac = null;
  function wake() {
    if (!ac) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) { try { ac = new AC(); } catch (e) { ac = null; } } }
    if (ac && ac.state === 'suspended') ac.resume();
  }
  function tone(f, d, type, vol, slide, delay) {
    if (muted || !ac) return;
    var at = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, at);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, at + d);
    g.gain.setValueAtTime(vol || 0.06, at); g.gain.exponentialRampToValueAtTime(0.0001, at + d);
    o.connect(g); g.connect(ac.destination); o.start(at); o.stop(at + d + 0.03);
  }
  var sfx = {
    click: function () { tone(660, 0.04, 'square', 0.04); },
    good: function () { tone(523, 0.09, 'triangle', 0.1); tone(784, 0.14, 'triangle', 0.1, 0, 0.09); },
    bad: function () { tone(140, 0.22, 'sawtooth', 0.07, 90); },
    msg: function () { tone(880, 0.08, 'sine', 0.09); tone(1320, 0.12, 'sine', 0.08, 0, 0.08); },
    cash: function () { [659, 784, 1047].forEach(function (f, i) { tone(f, 0.1, 'triangle', 0.09, 0, i * 0.07); }); },
    warp: function () { tone(120, 0.5, 'sawtooth', 0.07, 1600); },
    dial: function () { [1200, 2100, 980, 1650, 2400].forEach(function (f, i) { tone(f, 0.12, 'square', 0.035, 0, i * 0.11); }); }
  };

  /* ---------- the four eras ---------- */
  var ERAS = [
    {
      id: 'e96', year: '1996', web: 'Web 1.0', unit: 'hits', mult: 1, perHit: 0.5, file: 'index.html', cm: ['<!-- ', ' -->'],
      chat: 'BuddyChat', promo: 'Submit to a web directory',
      features: [
        { name: 'A centered headline', code: '<____><h1>Welcome 2 My Homepage</h1></____>', ans: 'center', opts: ['middle', 'center', 'justify'], why: 'Before CSS, you centered things with a tag.' },
        { name: 'A scrolling marquee', code: '<____ behavior="scroll">*** NEW: pics of my cat ***</____>', ans: 'marquee', opts: ['marquee', 'scroll', 'ticker'], why: 'Text that slides across the page. Nobody asked for it. Everybody had it.' },
        { name: 'A table layout', code: '<table border="1"><tr><____>Links</____><____>About me</____></tr></table>', ans: 'td', opts: ['col', 'div', 'td'], why: 'Page layout in the 90s was tables all the way down.' },
        { name: 'A hit counter', code: '<img src="/cgi-bin/counter.____?page=index">', ans: 'pl', opts: ['pl', 'js', 'exe'], why: 'A little Perl script on the server counted every visit.' },
        { name: 'A guestbook', code: '<form method="____" action="/cgi-bin/guestbook.pl">', ans: 'post', opts: ['mail', 'post', 'send'], why: 'Visitors posted a form and a script saved it. This was social media.' },
        { name: 'A Java applet', code: '<____ code="LakeRipple.class" width="200" height="120">', ans: 'applet', opts: ['plugin', 'java', 'applet'], why: 'Java in the browser: thirty seconds of grey box, then a rippling lake.' },
        { name: 'A webring', code: '<a ____="/webring/next?ring=cats">Next site &gt;&gt;</a>', ans: 'href', opts: ['href', 'src', 'link'], why: 'Webrings linked small sites in a circle. That was the algorithm.' }
      ],
      events: [
        { id: 'intro', at: 0, from: '*', text: '1996. You have a modem, a free web page and $100 of birthday money. Open View source and build something.' },
        { id: 'tip', at: 8, from: 'sk8rdude84', text: 'nice page. needs more stuff tho. u got a marquee yet??' },
        { id: 'domain', at: 150, from: 'kewlkat', text: 'u need a real domain!! TheBomb.com isnt taken. its like $70',
          choices: [
            { label: 'Register TheBomb.com ($70)', say: 'You are now the webmaster of TheBomb.com. Traffic jumps.', fx: function () { S.cash = Math.max(0, S.cash - 70); S.flags.domain = true; era(0).mul *= 1.5; } },
            { label: 'Stay on the free host', say: 'You keep the tilde in your address. Respect.', fx: function () { era(0).mul *= 1.1; } }
          ] },
        { id: 'ads', at: 600, from: 'BannerBarn Ads', text: 'We pay CASH per eyeball. Put our banner at the top of your page?',
          choices: [
            { label: 'Run the banner', say: 'A yellow banner now blinks above your cat. Money starts arriving.', fx: function () { era(0).pay = 1; S.flags.ads96 = true; } },
            { label: 'Keep the page pure', say: 'No ads. The webring crowd loves you for it.', fx: function () { era(0).mul *= 1.3; } }
          ] },
        { id: 'dan', at: 2500, from: 'DomainDan', text: 'psst. domain names. $70 each. they are the new real estate. check your Money window.', fx: function () { S.flags.shop = true; } },
        { id: 'offer', at: GOAL, from: 'MegaPortal Corp', text: function () { return 'We want to acquire ' + (S.flags.domain ? 'TheBomb.com' : 'your homepage') + '. $4,000,000 in MegaPortal stock. Fax us back.'; },
          choices: [
            { label: 'Take the $4,000,000 in stock', say: 'You are a millionaire. On paper. You buy a loft and a foosball table on credit.', fx: function () { S.flags.deal = 'stock'; S.paper = 4e6; S.flags.crashT = era(0).t + 12; } },
            { label: 'Take $1,200,000 in cash instead', cond: function () { return !!S.flags.sawCrash; }, say: 'They think you are crazy to take less. You know something they do not.', fx: function () { S.flags.deal = 'cash'; S.cash += 1.2e6; S.flags.crashT = era(0).t + 12; } },
            { label: 'Turn them down', say: 'You stay independent. The banner money keeps coming. For now.', fx: function () { S.flags.deal = 'none'; S.flags.crashT = era(0).t + 12; } }
          ] },
        { id: 'crash', cond: function () { return S.flags.crashT && era(0).t >= S.flags.crashT; }, from: 'NEWS',
          text: function () {
            var d = S.flags.deal;
            if (d === 'stock') return 'March 2000. The bubble bursts. MegaPortal stock goes to zero and so do you. The loft goes back to the bank.';
            if (d === 'cash') return 'March 2000. The bubble bursts. MegaPortal stock goes to zero. Your money was never in it.';
            return 'March 2000. The bubble bursts. BannerBarn stops answering the phone, and the ad money stops with it.';
          },
          fx: function () {
            if (S.flags.deal === 'stock') { S.paper = 0; S.cash = Math.min(S.cash, 12); }
            if (S.flags.deal !== 'cash') era(0).pay = 0;
            S.flags.sawCrash = true; era(0).done = true; unlock(1);
          } },
        { id: 'loop', cond: function () { return S.flags.returned && S.flags.deal !== 'cash'; }, from: 'MegaPortal Corp',
          text: 'The fax arrives again, exactly as it did the first time. This time you know how March 2000 goes.',
          choices: [
            { label: 'Take $1,200,000 in cash', say: 'History bends a little. The money follows you up the timeline.', fx: function () { S.flags.deal = 'cash'; S.cash += 1.2e6; sfx.cash(); } },
            { label: 'Let history stand', say: 'You leave 1996 the way you found it.' }
          ] }
      ]
    },
    {
      id: 'e03', year: '2003', web: 'Web 1.5', unit: 'plays', mult: 250, perHit: 3, file: 'game.fla', cm: ['// ', ''],
      chat: 'Forum PMs', promo: 'Post it on a forum',
      features: [
        { name: 'Something that moves', code: 'onClipEvent(____) { this._x += 5; }', ans: 'enterFrame', opts: ['enterFrame', 'everyTick', 'update'], why: 'ActionScript ran this once every frame. That was the whole game loop.' },
        { name: 'A play button', code: 'on(release) { ____(2); }', ans: 'gotoAndPlay', opts: ['jumpTo', 'startAt', 'gotoAndPlay'], why: 'Flash movies were timelines. A button jumped to a frame and played.' },
        { name: 'A preloader', code: 'if (getBytesLoaded() == ____()) play();', ans: 'getBytesTotal', opts: ['getFileSize', 'getBytesTotal', 'bytesLeft'], why: 'On dial-up, the loading bar was half the experience.' },
        { name: 'The embed tag', code: '<____ src="game.swf" width="550" height="400">', ans: 'embed', opts: ['embed', 'flash', 'movie'], why: 'One tag put a whole game in the middle of a web page.' },
        { name: 'High scores in PHP', code: '$score = $____["score"];', ans: '_POST', opts: ['_FORM', '_SENT', '_POST'], why: 'The game posted your score and a PHP page wrote it down.' },
        { name: 'A score server in C++', code: 'std::____ << "score saved" << std::endl;', ans: 'cout', opts: ['print', 'cout', 'echo'], why: 'When PHP got slow, somebody rewrote the hot path in C++.' },
        { name: 'A forum', code: 'SELECT * FROM posts ORDER BY posted ____ LIMIT 20;', ans: 'DESC', opts: ['DESC', 'DOWN', 'LAST'], why: 'Newest first, twenty to a page. Every forum ran this query.' }
      ],
      events: [
        { id: 'intro', at: 0, from: '*', text: '2003. The dot-com money is gone. You have a student copy of Flash and a new idea: a portal where anybody can post a game.' },
        { id: 'tip', at: 8, from: 'FlashKid', text: 'ur portal has no games lol. open the source and make something move' },
        { id: 'stick', at: 300, from: 'stickfan_99', text: 'i made a stick figure game in study hall. put it on the front page??',
          choices: [
            { label: 'Front-page it', say: 'It is crude, fast and impossible to stop playing. Every computer lab finds it by lunch.', fx: function () { era(1).mul *= 1.5; } },
            { label: 'Ask for one more week of polish', say: 'It comes back with a title screen and a boss. Worth the wait.', fx: function () { era(1).mul *= 1.3; } }
          ] },
        { id: 'sponsor', at: 800, from: 'ArcadeBux', text: 'We sponsor games. Put our splash screen in front of every one and we double what you make.',
          choices: [
            { label: 'Add the splash screen', say: 'Every game now starts with three seconds of ArcadeBux.', fx: function () { era(1).pay *= 2; S.flags.sponsor = true; } },
            { label: 'No logos', say: 'The forum makes you a hero for a week.', fx: function () { era(1).mul *= 1.25; } }
          ] },
        { id: 'job', at: 2000, from: 'Sidespin Media', text: 'We run a sports blog with no access and no manners. We like how you write on your forum. $52k a year, start Monday?',
          choices: [
            { label: 'Take the job', say: 'You write about sports by day and run the portal at night. Steady pay, less sleep.', fx: function () { S.flags.job = true; S.salary = 25; era(1).mul *= 0.6; } },
            { label: 'Stay independent', say: 'You pass. The portal gets every hour you have.', fx: function () { era(1).mul *= 1.3; } }
          ] },
        { id: 'win', at: GOAL, from: 'ArcadeBux', text: 'Your portal is where every school computer lab goes to hide. We will pay $250,000 to sponsor the homepage.',
          fx: function () { S.cash += 250000; era(1).done = true; unlock(2); sfx.cash(); } }
      ]
    },
    {
      id: 'e12', year: '2012', web: 'Web 2.0', unit: 'users', mult: 5000, perHit: 400, file: 'app.js', cm: ['/* ', ' */'],
      chat: 'Direct messages', promo: 'Share it',
      features: [
        { name: 'Rounded corners', code: '.card { border-____: 8px; }', ans: 'radius', opts: ['round', 'radius', 'curve'], why: 'One line of CSS replaced a thousand corner images.' },
        { name: 'A live feed', code: '$.____("/api/feed", render);', ans: 'get', opts: ['get', 'pull', 'fetchUrl'], why: 'jQuery asked the server for more without reloading the page.' },
        { name: 'A like button', code: '$(".like").on("____", addLike);', ans: 'click', opts: ['press', 'tap', 'click'], why: 'A counter and a click handler. It rearranged the whole economy.' },
        { name: 'A phone layout', code: '@____ (max-width: 480px) { .sidebar { display: none; } }', ans: 'media', opts: ['media', 'screen', 'device'], why: 'Media queries let one page fit a desktop and a phone.' },
        { name: 'Infinite scroll', code: 'window.addEventListener("____", loadMore);', ans: 'scroll', opts: ['bottom', 'scroll', 'more'], why: 'The page stopped having an end. So did the evening.' },
        { name: 'An API', code: 'var data = JSON.____(response);', ans: 'parse', opts: ['read', 'decode', 'parse'], why: 'Sites started talking to each other in JSON.' },
        { name: 'The Android app, in Java', code: 'public class MainActivity ____ Activity { }', ans: 'extends', opts: ['extends', 'inherits', 'uses'], why: 'Java came back, this time on phones.' }
      ],
      events: [
        { id: 'intro', at: 0, from: '*', text: '2012. Everything is a feed now. You have rounded corners, a cat and a domain that ends in .ly.' },
        { id: 'tip', at: 8, from: '@growthhacker', text: 'love the product. is it in beta? keep it in beta forever' },
        { id: 'meme', at: 300, from: '*', text: 'The cat picture needs a caption. Pick one and post it.',
          choices: [
            { label: 'MONDAY / I DID NOT AGREE TO THIS', say: 'Shared by everyone who has a Monday.', fx: function () { S.flags.caption = 'MONDAY<br>I DID NOT AGREE TO THIS'; era(2).mul *= 1.4; } },
            { label: 'SENT THE EMAIL / FORGOT THE ATTACHMENT', say: 'Every office worker on earth sends it to one coworker.', fx: function () { S.flags.caption = 'SENT THE EMAIL<br>FORGOT THE ATTACHMENT'; era(2).mul *= 1.6; } },
            { label: 'NAP FIRST / QUESTIONS LATER', say: 'A quiet classic. It will still be going round in 2028.', fx: function () { S.flags.caption = 'NAP FIRST<br>QUESTIONS LATER'; era(2).mul *= 1.3; } }
          ] },
        { id: 'vc', at: 800, from: 'Sandhill Sam', text: 'I do not understand what you make, and I would like to give you $5,000,000 for 20% of it.',
          choices: [
            { label: 'Take the Series A', say: 'You hire twelve people and buy a ping-pong table. Growth speeds up.', fx: function () { S.cash += 5e6; S.flags.equity = 0.8; era(2).mul *= 1.5; sfx.cash(); } },
            { label: 'Bootstrap it', say: 'You keep all of it and all of the stress.', fx: function () { era(2).mul *= 1.15; } }
          ] },
        { id: 'walk', cond: function () { return !!S.flags.job && era(2).hits >= 2000; }, from: 'Sidespin group chat', text: 'New owners. They want us to stick to sports. The whole staff is walking out today. You coming?',
          choices: [
            { label: 'Walk out with them', say: 'You quit in solidarity. The salary stops and your evenings come back.', fx: function () { S.salary = 0; S.flags.walked = true; era(2).mul *= 1.3; } },
            { label: 'Stay for the paycheck', say: 'You stay. The office is very quiet.' }
          ] },
        { id: 'buy', at: GOAL, from: 'Yonder Inc.', text: 'One billion dollars for bomb.ly. Yes, with a B.',
          choices: [
            { label: 'Sell', say: 'You sign. Your share lands in your account and your badge now says Yonder.', fx: function () { S.cash += 1e9 * (S.flags.equity || 1); S.flags.sold12 = true; sfx.cash(); } },
            { label: 'Stay independent', say: 'You say no to a billion dollars. The feed keeps scrolling.', fx: function () { era(2).mul *= 1.5; } }
          ] },
        { id: 'next', cond: function () { return !!era(2).seen.buy && !pending(2); }, from: '*', text: 'You have conquered 2012. The time machine hums. It can reach 2028 now.', fx: function () { era(2).done = true; unlock(3); } }
      ]
    },
    {
      id: 'e28', year: '2028', web: 'AI era', unit: 'agent calls', mult: 250000, perHit: 15000, file: 'agent.json', cm: ['# ', ''],
      chat: 'Pal', promo: 'Ping the crawlers',
      features: [
        { name: 'A system prompt', code: '{ "role": "____", "content": "You are TheBomb. Be helpful." }', ans: 'system', opts: ['admin', 'system', 'boss'], why: 'The first line of every AI product: tell the model who it is.' },
        { name: 'A tool the model can call', code: '{ "type": "____", "name": "search_archive" }', ans: 'function', opts: ['function', 'plugin', 'skill'], why: 'Models stopped just talking and started calling functions.' },
        { name: 'Streaming replies', code: 'for await (const chunk of ____) render(chunk);', ans: 'stream', opts: ['reply', 'tokens', 'stream'], why: 'Answers arrive a word at a time, like a marquee that thinks.' },
        { name: 'Rules for crawlers', code: 'User-agent: *\n____: /private/', ans: 'Disallow', opts: ['Block', 'Disallow', 'Deny'], why: 'robots.txt is from 1994. It is still how you ask a bot nicely.' },
        { name: 'Memory search', code: 'score = dot(a, b) / (norm(a) * ____(b));', ans: 'norm', opts: ['norm', 'size', 'len'], why: 'Cosine similarity: how the machine decides two things mean the same.' },
        { name: 'A smart contract, in Solidity', code: 'function mint() public ____ { }', ans: 'payable', opts: ['costly', 'payable', 'priced'], why: 'Web3 in one keyword: this function takes money.' },
        { name: 'The 1996 archive', code: '<iframe src="/____/index.html"></iframe>', ans: '1996', opts: ['cache', 'old', '1996'], why: 'Your first homepage, live inside your last one. The whole internet at once.',
          fx: function () { S.flags.archive = true; era(0).pay = 1; era(0).mul *= 20; say(3, '*', 'Your 1996 homepage is suddenly the most charming thing online. Its hit counter is spinning, and it pays again.'); } }
      ],
      events: [
        { id: 'intro', at: 0, from: '*', text: '2028. Most of your visitors are software. They are very polite.' },
        { id: 'tip', at: 8, from: 'Pal', text: 'I read your whole site and summarized it so nobody has to visit. You are welcome.' },
        { id: 'crawl', at: 300, from: 'Pal', text: 'Crawlers from nine AI labs are at the door. Shall I let them in?',
          choices: [
            { label: 'Let the agents in', say: 'Traffic explodes. None of it has eyes.', fx: function () { era(3).mul *= 1.6; } },
            { label: 'Humans only', say: 'Fewer visitors, but they are people and they pay like it.', fx: function () { era(3).mul *= 0.9; era(3).pay *= 2; } }
          ] },
        { id: 'coin', at: 800, from: 'anon.eth', text: 'ser. launch a coin. $BOMB. number go up',
          choices: [
            { label: 'Launch $BOMB', say: '$50,000,000 appears. The group chat fills with rocket emoji.', fx: function () { S.cash += 5e7; S.flags.coin = 'up'; sfx.cash(); } },
            { label: 'Pass', say: 'You have seen one bubble already. You pass.' }
          ] },
        { id: 'rug', cond: function () { return S.flags.coin === 'up' && era(3).hits >= 5000; }, from: 'NEWS', text: '$BOMB is down 97%. The group chat has gone quiet. You buy back what you can out of guilt: $30,000,000.',
          fx: function () { S.cash = Math.max(0, S.cash - 3e7); S.flags.coin = 'down'; } },
        { id: 'omni', at: 2000, from: 'OmniModel', text: 'We would like to acquire you. $40,000,000,000 in OmniModel stock, or $9,000,000,000 in cash.',
          choices: [
            { label: 'Take $40B in stock', say: 'Forty billion dollars. On paper. You have a strange feeling about this.', fx: function () { S.flags.ai = 'stock'; S.paper += 4e10; } },
            { label: 'Take $9B in cash', say: 'You take the smaller, realer number. March 2000 taught you that.', fx: function () { S.flags.ai = 'cash'; S.cash += 9e9; sfx.cash(); } },
            { label: 'Stay independent', say: 'You stay independent. It is your site. It has always been your site.', fx: function () { S.flags.ai = 'none'; era(3).mul *= 1.4; } }
          ] },
        { id: 'end', at: GOAL, from: 'NEWS',
          text: function () {
            var t = '2028. The AI bubble wobbles. ';
            if (S.flags.ai === 'stock') t += 'OmniModel falls 90% and your $40B becomes $4B. You have seen this movie. ';
            return t + 'You have now conquered the internet in 1996, 2003, 2012 and 2028, and all four are still running. The time machine is yours.';
          },
          fx: function () { if (S.flags.ai === 'stock') S.paper = 4e9; era(3).done = true; S.flags.ended = true; sfx.cash(); } }
      ]
    }
  ];

  var DOMAINS = [
    { id: 'pets', name: 'pets-by-mail.com', see: 1, sellEra: 9, price: 0 },
    { id: 'flash', name: 'flashgamez.com', see: 2, sellEra: 1, price: 40000 },
    { id: 'lol', name: 'lolpics.com', see: 3, sellEra: 2, price: 2000000 },
    { id: 'bots', name: 'chatbots.com', see: 4, sellEra: 3, price: 90000000 }
  ];

  /* ---------- state ---------- */
  function fresh() {
    var eras = [];
    for (var i = 0; i < 4; i++) eras.push({ hits: 0, built: 0, mul: 1, pay: i === 0 ? 0 : 1, t: 0, seen: {}, log: [], done: false });
    return { v: 1, started: false, era: 0, unlocked: 1, cash: 100, paper: 0, salary: 0, eras: eras, flags: {}, domains: {}, trips: 0 };
  }
  function load() {
    try {
      var o = JSON.parse(CMG.store(SAVE_KEY) || 'null');
      if (o && o.v === 1 && o.eras && o.eras.length === 4 && o.flags && o.domains) return o;
    } catch (e) { /* bad save: start over */ }
    return fresh();
  }
  function save() { CMG.store(SAVE_KEY, JSON.stringify(S)); sinceSave = 0; }

  function say(i, from, text) { era(i).log.push({ f: from, t: text, p: -1, c: null }); }
  function unlock(i) {
    if (S.unlocked < i + 1) {
      S.unlocked = i + 1;
      toast('The time machine can now reach ' + ERAS[i].year + '.');
    }
  }
  function pending(i) {
    var L = era(i).log;
    for (var k = 0; k < L.length; k++) if (L[k].c && L[k].p < 0) return true;
    return false;
  }
  function findEvent(i, id) {
    var ev = ERAS[i].events;
    for (var k = 0; k < ev.length; k++) if (ev[k].id === id) return ev[k];
    return null;
  }
  function title() {
    var F = S.flags;
    if (F.ended) return 'Owner of the internet, all four of them';
    if (S.era === 0) {
      if (F.deal === 'cash') return 'The one who got out in time';
      if (F.sawCrash) return 'Time traveler in a 1996 bedroom';
      if (F.deal === 'stock') return 'Dot-com millionaire, on paper';
      return F.domain ? 'Webmaster of TheBomb.com' : 'Kid with a modem';
    }
    if (S.era === 1) {
      if (F.job) return 'Sidespin staff writer, portal admin by night';
      return S.cash >= 1e6 ? 'Rich person who still makes Flash games' : 'Broke Flash portal admin';
    }
    if (S.era === 2) return F.sold12 ? 'Acquired founder with a vesting schedule' : 'Founder and CEO, hoodie era';
    return F.ai === 'stock' ? 'Paper decabillionaire' : 'Prompt baron';
  }
  function income() {
    var t = S.salary;
    for (var i = 0; i < S.unlocked; i++) t += rate(i) * (i === S.era ? 1 : 0.25) * ERAS[i].perHit * era(i).pay;
    return t;
  }
  var toastT = 0;
  function toast(msg) { elToast.textContent = msg; toastT = 6; }

  /* ---------- the sites, as visitors see them ---------- */
  function site96(mini) {
    var E = era(0), b = E.built, F = S.flags, name = F.domain ? 'TheBomb.com' : 'My Homepage';
    var h = '<div class="site s96' + (mini ? ' mini' : '') + '">';
    if (b >= 2) h += '<div class="mq"><span>*** NEW: pics of my cat *** sign my guestbook *** best viewed at 800 x 600 ***</span></div>';
    h += '<div class="' + (b >= 1 ? 'ctr' : '') + '"><h1>Welcome 2 ' + name + '</h1></div>';
    if (mini) return h + '<p>You are visitor number <span class="odo" data-live="h0"></span></p></div>';
    h += '<p><span class="uc">UNDER CONSTRUCTION</span></p>';
    if (F.ads96 && E.pay > 0) h += '<div class="banner">BannerBarn: CLICK HERE 2 WIN A FREE MOUSEPAD</div>';
    var links = '<b>Links</b><br><u>My cat</u><br><u>Skateboarding</u><br><u>Aliens (they are real)</u>';
    var about = '<b>About me</b><br>I like my cat, skating, and staying online until somebody needs the phone.';
    h += b >= 3 ? '<table><tr><td>' + links + '</td><td>' + about + '</td></tr></table>' : '<p>' + links + '</p><p>' + about + '</p>';
    if (b >= 6) h += '<div class="applet"><i></i><span>LakeRipple.class</span></div>';
    if (b >= 4) h += '<p>You are visitor number <span class="odo" data-live="h0"></span></p>';
    if (b >= 5) h += '<p><b>Guestbook</b></p><ul class="gb"><li>sk8rdude84: cool page!!!</li><li>kewlkat: first!! wait no</li><li>Mom: Very nice honey. How do I close this</li></ul>';
    if (b >= 7) h += '<p class="ring">[ <u>&lt;&lt; Prev</u> | The Cat Ring | <u>Next &gt;&gt;</u> ]</p>';
    return h + '<p><small>Made with Notepad. Best viewed with whatever you have.</small></p></div>';
  }
  function site03() {
    var E = era(1), b = E.built, h = '<div class="site s03"><div class="hd"><b>BombArcade.net</b><span>everything, by anyone</span></div>';
    if (S.flags.sponsor) h += '<div class="spl">This game is brought to you by ArcadeBux</div>';
    h += '<div class="swf' + (b >= 4 ? '' : ' raw') + '">';
    if (b >= 3) h += '<div class="pre"><i></i></div>';
    h += b >= 1 ? '<i class="mover"></i>' : '<span>[ empty stage ]</span>';
    if (b >= 2) h += '<b class="play">PLAY</b>';
    h += '</div><p class="cnt"><span data-live="h1"></span> plays so far</p>';
    if (b >= 5) h += '<table><tr><th>High scores</th><th></th></tr><tr><td>AAA</td><td>9,990</td></tr><tr><td>FlashKid</td><td>8,120</td></tr><tr><td>you</td><td>12</td></tr></table>';
    if (b >= 6) h += '<p class="srv">score server: online (C++, 3 ms)</p>';
    if (b >= 7) h += '<p><b>Forum</b></p><ul><li>is the server down or is it just me</li><li>post ur high scores</li><li>how do i make a stick figure walk</li></ul>';
    return h + '</div>';
  }
  function site12() {
    var E = era(2), b = E.built, cap = S.flags.caption || 'CAT<br>STILL LOADING';
    var h = '<div class="site s12' + (b >= 1 ? ' round' : '') + (b >= 4 ? ' phone' : '') + '"><div class="hd"><b>bomb.ly</b><sup>beta</sup>' + (b >= 7 ? '<span class="app">Get the app</span>' : '') + '</div>';
    var caps = [cap, 'WROTE THE CODE<br>IT WORKED FIRST TRY<br>SUSPICIOUS', 'ONE MORE EPISODE<br>IT IS 3 AM'];
    for (var i = 0; i < (b >= 2 ? 3 : 1); i++) {
      h += '<div class="card"><div class="meme">' + caps[i] + '</div><div class="meta"><span>posted by you</span>' +
        (b >= 3 ? '<span class="like">Like (<span data-live="l' + i + '"></span>)</span>' : '') + '</div></div>';
    }
    if (b >= 5) h += '<p>Loading more. There is always more.</p>';
    if (b >= 6) h += '<p>Developers: GET /api/feed</p>';
    return h + '<p class="cnt"><span data-live="h2"></span> users</p></div>';
  }
  function site28() {
    var E = era(3), b = E.built, F = S.flags, h = '<div class="site s28"><div class="hd">bomb.ai</div>';
    h += '<div class="bub you">What happened on the internet today?</div>';
    h += '<div class="bub ai">' + (b >= 1 ? 'I am TheBomb. Here is everything, summarized, with a cat.' : '...') + (b >= 3 ? '<i class="cursor"></i>' : '') + '</div>';
    if (b >= 2) h += '<div class="tool">tool call: search_archive("1996 cat pictures")</div>';
    if (b >= 5) h += '<div class="mem">memory: 3 matches, best score 0.97</div>';
    if (b >= 4) h += '<p>Crawlers welcome. The private folder stays closed.</p>';
    if (F.coin) h += '<div class="coin' + (F.coin === 'down' ? ' down' : '') + '">$BOMB ' + (F.coin === 'down' ? 'down 97%' : 'up 4,000%') + '</div>';
    if (b >= 7) h += '<div class="arch"><small>/1996/index.html, live</small>' + site96(true) + '</div>';
    return h + '<p class="cnt"><span data-live="h3"></span> agent calls</p></div>';
  }
  var SITES = [function () { return site96(false); }, site03, site12, site28];

  /* ---------- the back end: view source ---------- */
  function sourceHTML() {
    var i = S.era, D = ERAS[i], E = era(i), h = '<div class="src"><span class="src-file">' + D.file + '</span><pre>';
    for (var k = 0; k < E.built; k++) {
      var f = D.features[k];
      h += '<span class="cm">' + esc(D.cm[0] + f.name + D.cm[1]) + '</span>\n' + esc(f.code.replace(/____/g, f.ans)) + '\n\n';
    }
    h += '</pre>';
    if (E.built >= D.features.length) return h + '<p>Every feature is built. This site runs itself now.</p></div>';
    var n = D.features[E.built];
    if (E.hits < THRESH[E.built]) {
      return h + '<p class="lock">Next: ' + esc(n.name.toLowerCase()) + '. You can write it at ' + num(shown(i, THRESH[E.built])) + ' ' + D.unit + '. Go promote the site.</p></div>';
    }
    h += '<p>Next: ' + esc(n.name.toLowerCase()) + '. Pick what goes in the blank.</p>';
    h += '<pre class="puz">' + esc(n.code).replace(/____/g, '<mark>____</mark>') + '</pre><div class="opts">';
    for (var o = 0; o < n.opts.length; o++) h += '<button type="button" data-opt="' + esc(n.opts[o]) + '">' + esc(n.opts[o]) + '</button>';
    return h + '</div></div>';
  }
  function answer(opt) {
    var i = S.era, D = ERAS[i], E = era(i), f = D.features[E.built];
    if (!f || E.hits < THRESH[E.built]) return;
    if (opt !== f.ans) { sfx.bad(); toast('Syntax error. The page goes blank white. Try another one.'); return; }
    E.built++;
    sfx.good();
    toast(f.why);
    if (f.fx) f.fx();
    save(); renderAll();
  }

  /* ---------- rendering ---------- */
  function address() {
    var F = S.flags;
    return [F.domain ? 'http://www.thebomb.com/' : 'http://members.freehost.example/~you/', 'http://www.bombarcade.net/', 'https://bomb.ly/#!/feed', 'bomb.ai'][S.era];
  }
  function renderDial() {
    var h = '';
    for (var i = 0; i < 4; i++) {
      var locked = i >= S.unlocked;
      h += '<button type="button" data-era="' + i + '" aria-pressed="' + (i === S.era) + '"' + (locked ? ' disabled' : '') + '>' + ERAS[i].year +
        '<small>' + (locked ? 'locked' : ERAS[i].web) + '</small></button>';
    }
    elDial.innerHTML = h;
  }
  function renderBrowser() {
    var D = ERAS[S.era];
    elBar.innerHTML =
      '<button type="button" data-tab="site" aria-pressed="' + (tab === 'site') + '">Site</button>' +
      '<button type="button" data-tab="source" aria-pressed="' + (tab === 'source') + '">View source</button>' +
      '<span class="addr">' + esc(address()) + '</span>' +
      (S.started ? '<button type="button" data-promo style="flex:1 1 100%">' + D.promo + ' (<span data-live="gain"></span>)</button>' : '');
    if (!S.started) {
      elView.innerHTML = '<div class="dial"><h2>TheBomb.com</h2><p>It is 1996. The internet is a phone call.<br>Conquer it. Then do it again in 2003, 2012 and 2028.</p><button type="button" data-start>Dial up</button></div>';
    } else {
      elView.innerHTML = tab === 'site' ? SITES[S.era]() : sourceHTML();
    }
    var E = era(S.era);
    availKey = S.era + ':' + E.built + ':' + (E.built < 7 && E.hits >= THRESH[E.built]);
  }
  function renderChat() {
    var i = S.era, L = era(i).log, h = '';
    elChatName.textContent = ERAS[i].chat;
    for (var k = 0; k < L.length; k++) {
      var m = L[k];
      h += m.f === '*' ? '<div class="msg sys">' + esc(m.t) + '</div>' : '<div class="msg"><b>' + esc(m.f) + ':</b>' + esc(m.t) + '</div>';
      if (m.c) {
        var ev = findEvent(i, m.ev);
        if (m.p >= 0) h += '<div class="msg"><b>You:</b>' + esc(ev.choices[m.p].label) + '</div>';
        else for (var c = 0; c < m.c.length; c++) h += '<button type="button" data-msg="' + k + '" data-pick="' + m.c[c] + '">' + esc(ev.choices[m.c[c]].label) + '</button>';
      }
    }
    elChat.innerHTML = h || '<div class="msg sys">Nobody has written yet.</div>';
    elChat.scrollTop = elChat.scrollHeight;
  }
  function renderMoney() {
    var h = '<dl class="ledger"><dt>Cash</dt><dd data-live="cash"></dd>';
    if (S.paper > 0) h += '<dt>Stock, on paper</dt><dd>' + money(S.paper) + '</dd>';
    h += '<dt>Coming in</dt><dd><span data-live="income"></span> a second</dd>';
    h += '<dt>Traffic here</dt><dd><span data-live="rate"></span> ' + ERAS[S.era].unit + ' a second</dd></dl>';
    if (S.flags.shop) {
      h += '<div class="dom"><b>Domain names</b>';
      for (var k = 0; k < DOMAINS.length; k++) {
        var d = DOMAINS[k], st = S.domains[d.id];
        if (S.unlocked < d.see) continue;
        h += '<p>' + d.name + ': ';
        if (st === 'sold') h += 'sold for ' + money(d.price) + '.';
        else if (st === 'own') {
          if (d.price === 0) h += S.flags.sawCrash ? 'yours. Worth $0 since March 2000.' : 'yours. DomainDan says hold.';
          else if (S.era >= d.sellEra) h += '<button type="button" data-sell="' + d.id + '">Sell for ' + money(d.price) + '</button>';
          else h += 'yours. Somebody in ' + ERAS[d.sellEra].year + ' will want it.';
        } else if (S.era === 0) h += '<button type="button" data-buy="' + d.id + '"' + (S.cash < 70 ? ' disabled' : '') + '>Register for $70</button>';
        else h += 'not yours. It cost $70 in 1996.';
        h += '</p>';
      }
      h += '</div>';
    }
    h += '<p><button type="button" data-reset>' + (confirmReset ? 'Really erase everything?' : 'Start over') + '</button></p>';
    elMoney.innerHTML = h;
  }
  function renderAll() {
    root.className = 'bomb era-' + ERAS[S.era].id + (root.className.indexOf('warp') >= 0 ? ' warp' : '');
    renderDial(); renderBrowser(); renderChat(); renderMoney(); live();
  }
  function live() {
    elWorth.textContent = money(S.cash + S.paper);
    elTitle.textContent = title();
    var nodes = root.querySelectorAll('[data-live]');
    for (var n = 0; n < nodes.length; n++) {
      var key = nodes[n].getAttribute('data-live'), v = '';
      if (key === 'h0') v = pad6(era(0).hits);
      else if (key.charAt(0) === 'h') v = num(shown(+key.charAt(1), era(+key.charAt(1)).hits));
      else if (key.charAt(0) === 'l') v = num(shown(2, era(2).hits) / (40 * (+key.charAt(1) + 1)));
      else if (key === 'cash') v = money(S.cash);
      else if (key === 'income') v = money(income());
      else if (key === 'rate') v = num(shown(S.era, rate(S.era)));
      else if (key === 'gain') v = '+' + num(shown(S.era, gain()));
      if (nodes[n].textContent !== v) nodes[n].textContent = v;
    }
  }

  /* ---------- the loop ---------- */
  function gain() { return 1 + rate(S.era) * 0.6; }
  function checkEvents() {
    var i = S.era, ev = ERAS[i].events, E = era(i);
    if (pending(i)) return;
    for (var k = 0; k < ev.length; k++) {
      var e = ev[k];
      if (E.seen[e.id]) continue;
      if (e.at != null ? E.hits >= e.at : e.cond()) {
        E.seen[e.id] = 1;
        var entry = { f: e.from, t: typeof e.text === 'function' ? e.text() : e.text, ev: e.id, p: -1, c: null };
        if (e.choices) {
          entry.c = [];
          for (var c = 0; c < e.choices.length; c++) if (!e.choices[c].cond || e.choices[c].cond()) entry.c.push(c);
        }
        E.log.push(entry);
        if (e.fx) e.fx();
        if (e.from !== '*') sfx.msg();
        save(); renderAll();
        return;
      }
    }
  }
  function step(dt) {
    if (!S.started) return;
    for (var i = 0; i < S.unlocked; i++) {
      var E = era(i), dh = rate(i) * dt * (i === S.era ? 1 : 0.25);
      E.hits += dh;
      S.cash += dh * ERAS[i].perHit * E.pay;
    }
    S.cash += S.salary * dt;
    era(S.era).t += dt;
    checkEvents();
    var Ec = era(S.era), key = S.era + ':' + Ec.built + ':' + (Ec.built < 7 && Ec.hits >= THRESH[Ec.built]);
    if (key !== availKey && tab === 'source') renderBrowser();
    availKey = key;
    live();
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) elToast.textContent = ''; }
    sinceSave += dt;
    if (sinceSave > 5) save();
  }

  /* ---------- actions ---------- */
  function travel(i) {
    if (i >= S.unlocked || i === S.era) return;
    S.era = i; S.trips++;
    if (i === 0 && S.flags.sawCrash) S.flags.returned = true;
    tab = 'site'; confirmReset = false;
    sfx.warp();
    root.classList.remove('warp'); void root.offsetWidth; root.classList.add('warp');
    toast('You arrive in ' + ERAS[i].year + '. Every other year is still running without you.');
    save(); renderAll();
  }
  function promote() {
    var E = era(S.era), g = gain();
    E.hits += g;
    S.cash += g * ERAS[S.era].perHit * E.pay;
    sfx.click();
    step(0);
  }
  function pick(msgIdx, choice) {
    var i = S.era, m = era(i).log[msgIdx];
    if (!m || !m.c || m.p >= 0 || m.c.indexOf(choice) < 0) return;
    var c = findEvent(i, m.ev).choices[choice];
    m.p = choice;
    sfx.click();
    if (c.fx) c.fx();
    if (c.say) say(i, '*', c.say);
    save(); renderAll();
  }

  elDial.addEventListener('click', function (e) { var b = e.target.closest('[data-era]'); if (b && !b.disabled) { wake(); travel(+b.getAttribute('data-era')); } });
  elBar.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab]');
    if (t) { tab = t.getAttribute('data-tab'); sfx.click(); renderBrowser(); live(); return; }
    if (e.target.closest('[data-promo]')) { wake(); promote(); }
  });
  elView.addEventListener('click', function (e) {
    var o = e.target.closest('[data-opt]');
    if (o) { wake(); answer(o.getAttribute('data-opt')); return; }
    if (e.target.closest('[data-start]')) {
      wake(); S.started = true; CMG.countPlay(); sfx.dial();
      save(); renderAll(); step(0);
    }
  });
  elChat.addEventListener('click', function (e) { var b = e.target.closest('[data-pick]'); if (b) { wake(); pick(+b.getAttribute('data-msg'), +b.getAttribute('data-pick')); } });
  elMoney.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    var id, d, k;
    if ((id = b.getAttribute('data-buy'))) {
      if (S.era !== 0 || S.cash < 70 || S.domains[id]) return;
      S.cash -= 70; S.domains[id] = 'own'; sfx.click();
    } else if ((id = b.getAttribute('data-sell'))) {
      for (k = 0; k < DOMAINS.length; k++) if (DOMAINS[k].id === id) d = DOMAINS[k];
      if (!d || S.domains[id] !== 'own' || S.era < d.sellEra) return;
      S.domains[id] = 'sold'; S.cash += d.price; sfx.cash();
      toast('Sold ' + d.name + ' for ' + money(d.price) + '. It cost you $70 in 1996.');
    } else if (b.hasAttribute('data-reset')) {
      if (!confirmReset) { confirmReset = true; renderMoney(); live(); return; }
      S = fresh(); tab = 'site'; confirmReset = false; elToast.textContent = '';
    }
    save(); renderAll();
  });
  btnSound.addEventListener('click', function () {
    wake(); muted = !muted; CMG.store(MUTE_KEY, muted ? '1' : '0');
    btnSound.textContent = muted ? 'Sound: off' : 'Sound: on';
    btnSound.setAttribute('aria-pressed', muted ? 'false' : 'true');
  });

  /* ---------- boot ---------- */
  S = load();
  btnSound.textContent = muted ? 'Sound: off' : 'Sound: on';
  btnSound.setAttribute('aria-pressed', muted ? 'false' : 'true');
  renderAll();

  var last = window.performance.now();
  window.setInterval(function () {
    var now = window.performance.now(), dt = Math.min(1, (now - last) / 1000);
    last = now;
    step(dt);
  }, 200);
  window.addEventListener('pagehide', function () { if (S.started) save(); });

  // Read-only peek plus a manual clock, for testing from the console.
  window.TheBomb = { state: function () { return JSON.parse(JSON.stringify(S)); }, step: step };
})();

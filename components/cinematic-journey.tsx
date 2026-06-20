'use client';

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import Three.js components for performance optimization (Lighthouse 95+)
const PalkhiViewer = dynamic(
  () => import('./3d/palkhi-viewer').then((mod) => mod.PalkhiViewer),
  { ssr: false, loading: () => <div className="w-full h-full bg-saffron/5 animate-pulse rounded-2xl" /> }
);

interface Saint {
  id: string;
  nameMarathi: string;
  nameTranslit: string;
  slug: string;
  period: string | null;
  biography: string | null;
  region: string | null;
}

interface Category {
  slug: string;
  nameMarathi: string;
  icon: string;
  count: number;
}

interface CinematicJourneyProps {
  saints: Saint[];
  categories: Category[];
  totalCompositions: number;
}

export function CinematicJourney({ saints, categories, totalCompositions }: CinematicJourneyProps) {
  // Wari Journey Progress
  const journeySectionRef = React.useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = React.useState(0);
  const [distanceRemaining, setDistanceRemaining] = React.useState(250);
  const [currentStop, setCurrentStop] = React.useState('देहू प्रस्थान सोहळा 🚩');

  const STOPS = [
    { name: 'देहू प्रस्थान (Dehu Start)', dist: 250, desc: 'संत तुकाराम महाराजांच्या पालखीचे प्रस्थान' },
    { name: 'आळंदी प्रस्थान (Alandi Start)', dist: 238, desc: 'संत ज्ञानेश्वर माऊलींच्या पालखीचे प्रस्थान' },
    { name: 'पुणे विसावा (Pune)', dist: 215, desc: 'दोन्ही पालख्यांचा संगम आणि भव्य स्वागत सोहळा' },
    { name: 'जेजुरी गड (Jejuri)', dist: 165, desc: 'खंडोबा चरणी भंडारा उधळण सोहळा' },
    { name: 'वाखरी रिंगण (Wakhari Ringan)', dist: 15, desc: 'वारीतील शेवटचे आणि भव्य गोलाकार धावणारे रिंगण' },
    { name: 'पंढरपूर दर्शन (Pandharpur)', dist: 0, desc: 'पवित्र चंद्रभागेचे स्नान आणि विठू माऊलींचे चरण दर्शन!' }
  ];

  React.useEffect(() => {
    const handleScroll = () => {
      if (!journeySectionRef.current) return;

      const element = journeySectionRef.current;
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate scroll progress percentage through the section
      // Starts when top of section enters viewport, ends when bottom exits
      const totalHeight = rect.height - windowHeight;
      const scrolled = -rect.top;
      
      const progress = Math.max(0, Math.min(1, scrolled / totalHeight));
      setScrollProgress(progress);

      // Map progress to walking distance (250km to 0km)
      const currentDist = Math.max(0, Math.round(250 - progress * 250));
      setDistanceRemaining(currentDist);

      // Determine active stop
      let activeStop = STOPS[0];
      for (let i = 0; i < STOPS.length; i++) {
        if (currentDist <= STOPS[i].dist) {
          activeStop = STOPS[i];
        }
      }
      setCurrentStop(activeStop.name);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for scroll reveals
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
          }
        });
      },
      { threshold: 0.1 }
    );

    const reveals = document.querySelectorAll('.text-reveal');
    reveals.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-0">
      
      {/* SECTION 1: WELCOME TO MAHARASHTRA */}
      <section className="py-24 bg-gradient-to-b from-background to-cream dark:to-[#1c1c1c] overflow-hidden">
        <div className="container mx-auto px-4 max-w-4xl text-center space-y-8">
          <div className="text-reveal flex flex-col items-center">
            <span className="text-5xl mb-4" aria-hidden="true">🙏</span>
            <h2 className="text-3xl sm:text-4xl font-marathiHeading text-maroon dark:text-saffron font-bold">
              वारकरी संस्कृतीचे डिजिटल वैभव
            </h2>
          </div>
          
          <p className="text-reveal font-marathi text-lg sm:text-xl text-foreground/80 leading-relaxed max-w-2xl mx-auto delay-100">
            मजकुराच्या पलीकडे जाऊन भक्ती साहित्याचा ऐतिहासिक आणि सांस्कृतिक वारसा अनुभवा. हे केवळ लिरिक संकेतस्थळ नसून महाराष्ट्राच्या संतांचे जिवंत वाङ्मयीन संग्रहालय आहे.
          </p>

          <div className="text-reveal pt-4 flex justify-center gap-6 text-sm font-semibold delay-200">
            <div className="text-center bg-card p-4 rounded-xl border border-saffron/10 shadow-sm w-36">
              <p className="text-3xl text-saffron font-bold">{saints.length}</p>
              <p className="text-muted-foreground text-[11px] mt-1 uppercase font-sans">थोर वारकरी संत</p>
            </div>
            <div className="text-center bg-card p-4 rounded-xl border border-saffron/10 shadow-sm w-36">
              <p className="text-3xl text-saffron font-bold">{totalCompositions}+</p>
              <p className="text-muted-foreground text-[11px] mt-1 uppercase font-sans">भक्ती साहित्य</p>
            </div>
            <div className="text-center bg-card p-4 rounded-xl border border-saffron/10 shadow-sm w-36">
              <p className="text-3xl text-saffron font-bold">५+</p>
              <p className="text-muted-foreground text-[11px] mt-1 uppercase font-sans">३डी अनुभव</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: BIRTH OF BHAKTI (TIMELINE) */}
      <section className="py-24 bg-card border-y border-saffron/10" aria-label="भक्ती चळवळीचा इतिहास">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl font-marathiHeading text-maroon dark:text-saffron font-bold text-center mb-16">
            भक्ती चळवळीची ऐतिहासिक वाटचाल 🚩
          </h2>

          <div className="relative">
            {/* Center vertical line */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 timeline-line opacity-30" />

            <div className="space-y-16">
              {[
                {
                  century: '१३वे शतक (13th Century)',
                  title: 'ज्ञानेश्वरांचे आगमन - पाया रचला',
                  desc: 'संत ज्ञानेश्वर महाराजांनी अत्यंत सोप्या मराठीत ज्ञानेश्वरी (भावार्थ दीपिका) लिहून महाराष्ट्रातील भक्ती चळवळीचा पाया रचला.',
                  align: 'left'
                },
                {
                  century: '१४वे शतक (14th Century)',
                  title: 'नामदेव महाराजांची कीर्तन गंगा',
                  desc: 'संत नामदेव महाराजांनी भागवत धर्माचा प्रसार पंजाबपर्यंत नेला. त्यांच्या रचना शिखांच्या पवित्र ग्रंथ साहेब मध्येही समाविष्ट आहेत.',
                  align: 'right'
                },
                {
                  century: '१६वे शतक (16th Century)',
                  title: 'एकनाथ महाराजांचे लोकशिक्षण',
                  desc: 'संत एकनाथ महाराजांनी स्तोत्रे, भारुडे आणि गौळणींमधून सामान्यांच्या भाषेत अध्यात्म मांडत विठ्ठल भक्तीचा मार्ग रुंद केला.',
                  align: 'left'
                },
                {
                  century: '१७वे शतक (17th Century)',
                  title: 'तुकोबांची गाथा - कळस चढवला',
                  desc: 'संत तुकाराम महाराजांच्या अभंगांनी वारकरी संप्रदायाचा कळस गाठला. गाथेतील साधे आणि वास्तववादी सत्य आजही प्रत्येकाला मार्गदर्शन करते.',
                  align: 'right'
                }
              ].map((item, idx) => (
                <div key={idx} className={`relative flex flex-col md:flex-row items-center justify-between ${
                  item.align === 'left' ? 'md:flex-row-reverse' : ''
                }`}>
                  {/* Timeline dot */}
                  <div className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-saffron border-2 border-white dark:border-card timeline-dot z-10" />

                  {/* Left spacer for desktop */}
                  <div className="w-full md:w-5/12" />

                  {/* Content block */}
                  <div className="w-full md:w-5/12 text-reveal bg-background p-6 rounded-2xl border border-saffron/10 hover:border-saffron/30 transition-all duration-300 shadow-sm">
                    <span className="text-xs font-bold text-saffron font-sans">{item.century}</span>
                    <h3 className="text-lg font-marathiHeading text-maroon dark:text-saffron font-bold mt-1.5 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm font-marathi text-foreground/80 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: MEET THE SAINTS (3D TILT GRID) */}
      <section className="py-24 bg-cream dark:bg-[#121212]" aria-labelledby="meet-saints-title">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 id="meet-saints-title" className="text-3xl font-marathiHeading text-maroon dark:text-saffron font-bold text-center mb-4">
            थोर संतांचे चरित्र दालन
          </h2>
          <p className="text-center text-muted-foreground text-sm max-w-xl mx-auto mb-16">
            वारकरी संप्रदायाचे खांब असलेल्या महान संतांच्या जीवनाचा आणि साहित्याचा अभ्यास करा.
          </p>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {saints.map((saint) => (
              <Saint3DTiltCard key={saint.id} saint={saint} />
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: THE WARI JOURNEY (CINEMATIC SCROLL TRACKER) */}
      <section 
        ref={journeySectionRef} 
        className="relative bg-background border-t border-saffron/10 py-16"
        aria-label="वारीचा पायी प्रवास"
      >
        <div className="sticky top-20 z-20 container mx-auto px-4 max-w-6xl grid md:grid-cols-12 gap-8 items-center pointer-events-none">
          {/* Left panel: Journey stats */}
          <div className="md:col-span-6 space-y-6 pointer-events-auto bg-card/95 backdrop-blur-md p-6 rounded-2xl border border-saffron/15 shadow-xl">
            <span className="text-xs font-bold text-saffron font-sans uppercase tracking-wider">
              आषाढी वारी पायी प्रवास सोहळा
            </span>
            
            <h3 className="text-2xl font-marathiHeading text-maroon dark:text-saffron font-bold leading-tight">
              आता मुक्काम: <span className="text-saffron">{currentStop}</span>
            </h3>

            {/* Tracker Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                <span>देहू/आळंदी प्रस्थान</span>
                <span>पंढरपूर महाद्वार</span>
              </div>
              <div className="w-full h-2.5 bg-saffron/10 rounded-full overflow-hidden border border-saffron/10">
                <div 
                  className="h-full bg-gradient-to-r from-saffron to-gold transition-all duration-300"
                  style={{ width: `${scrollProgress * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>अंतर कापले: {Math.round(scrollProgress * 250)} किमी</span>
                <span className="font-bold text-saffron">उर्वरित अंतर: {distanceRemaining} किमी</span>
              </div>
            </div>

            <p className="text-xs font-marathi text-foreground/80 leading-relaxed">
              दरवर्षी आषाढ महिन्यात कोट्यवधी वारकरी विठू माऊलींच्या गजरात आळंदी-देहू येथून पंढरपूरकडे पायी कूच करतात. २ किलोमीटर लांब दिंड्या आणि रिंगण वारीचे मुख्य आकर्षण असते.
            </p>
          </div>

          {/* Right panel: 3D Palkhi viewport */}
          <div className="md:col-span-6 w-full h-[350px] relative">
            <div className="absolute inset-0 bg-saffron/5 blur-3xl -z-10 rounded-full" />
            <PalkhiViewer scrollProgress={scrollProgress} />
          </div>
        </div>

        {/* Scroll extension block to provide height to drive the scroll calculations */}
        <div className="h-[120vh]" />
      </section>

      {/* SECTION 5: EXPLORE CATEGORIES */}
      <section className="py-24 bg-card border-t border-saffron/10" aria-labelledby="browse-categories">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 id="browse-categories" className="text-3xl font-marathiHeading text-maroon dark:text-saffron font-bold text-center mb-16">
            साहित्यानुसार ब्राउझ करा
          </h2>
          
          <div className="grid gap-6 grid-cols-2 md:grid-cols-4">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="group bg-background rounded-2xl p-6 text-center border border-saffron/10 hover-card-premium cursor-pointer"
              >
                <span className="text-4xl mb-4 block" aria-hidden="true">
                  {cat.icon}
                </span>
                <h3 className="font-marathiHeading text-lg font-bold text-maroon dark:text-saffron group-hover:text-saffron transition-colors">
                  {cat.nameMarathi}
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 font-sans">
                  {cat.count}+ रचना संग्रह
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}

// 3D Tilt Card Client Component
function Saint3DTiltCard({ saint }: { saint: Saint }) {
  const cardRef = React.useRef<HTMLAnchorElement | null>(null);
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    
    // Calculate mouse position inside card relative to center (from -0.5 to 0.5)
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    // Set maximum rotations (degrees)
    const maxTilt = 15;
    setTilt({
      x: -y * maxTilt, // Y coordinate drives rotation around X-axis
      y: x * maxTilt   // X coordinate drives rotation around Y-axis
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <Link
      ref={cardRef}
      href={`/sant/${saint.slug}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${tilt.x !== 0 ? 1.03 : 1})`,
        transition: tilt.x === 0 ? 'transform 0.5s ease' : 'none'
      }}
      className="group block bg-background rounded-2xl p-6 text-center border border-saffron/10 hover:border-saffron/40 shadow-sm flex flex-col justify-between items-center min-h-[320px] select-none cursor-pointer"
    >
      <div className="space-y-4 flex flex-col items-center">
        {/* Avatars */}
        <div className="w-20 h-20 rounded-full bg-saffron/10 text-saffron group-hover:bg-saffron/20 border border-saffron/10 flex items-center justify-center text-4xl shadow-inner transition-colors">
          🙏
        </div>
        
        <div>
          <span className="text-[10px] font-bold text-saffron font-sans bg-saffron/10 px-2 py-0.5 rounded-full">
            {saint.period || 'अज्ञात काळ'}
          </span>
          <h3 className="font-marathiHeading text-lg font-bold text-maroon dark:text-saffron mt-2 leading-tight">
            {saint.nameMarathi}
          </h3>
          <p className="text-[11px] text-muted-foreground font-sans mt-0.5 uppercase tracking-wide">
            {saint.nameTranslit}
          </p>
        </div>

        {saint.biography && (
          <p className="text-xs text-foreground/80 font-marathi line-clamp-3 leading-relaxed">
            {saint.biography}
          </p>
        )}
      </div>

      <div className="text-xs font-semibold text-saffron group-hover:underline pt-4 flex items-center gap-1">
        <span>चरित्र व अभंग संग्रह पहा</span>
        <span>→</span>
      </div>
    </Link>
  );
}
export default CinematicJourney;

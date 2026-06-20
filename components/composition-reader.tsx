'use client';

import * as React from 'react';
import { 
  Share2, 
  Copy, 
  Printer, 
  Moon, 
  Sun, 
  Type, 
  Music, 
  ChevronUp, 
  ChevronDown, 
  Download, 
  Check, 
  Maximize2, 
  Minimize2, 
  X 
} from 'lucide-react';
import { BookmarkButton } from './bookmark-button';
import { BellLikeButton } from './bell-like-button';
import { FlowerPetals } from './flower-petals';

interface Saint {
  nameMarathi: string;
  nameTranslit: string;
  slug: string;
}

interface Deity {
  nameMarathi: string;
}

interface CompositionReaderProps {
  fullText: string;
  titleMarathi: string;
  titleTranslit: string;
  slug: string;
  saint: Saint | null;
  deity: Deity | null;
  embedUrl: string | null;
}

export function CompositionReader({
  fullText,
  titleMarathi,
  titleTranslit,
  slug,
  saint,
  deity,
  embedUrl,
}: CompositionReaderProps) {
  const [petalsActive, setPetalsActive] = React.useState(false);
  // Reading preferences state
  const [fontFamily, setFontFamily] = React.useState('font-marathi');
  const [fontSize, setFontSize] = React.useState(20); // in pixels
  const [lineHeight, setLineHeight] = React.useState(1.8);
  const [isDark, setIsDark] = React.useState(false);
  const [showPrefPanel, setShowPrefPanel] = React.useState(false);

  // Status indicators
  const [copied, setCopied] = React.useState(false);
  const [shared, setShared] = React.useState(false);

  // Audio player state
  const [audioExpanded, setAudioExpanded] = React.useState(false);
  const [audioVisible, setAudioVisible] = React.useState(true);

  // Quote Card Generator state
  const [showCardModal, setShowCardModal] = React.useState(false);
  const [selectedLines, setSelectedLines] = React.useState<string[]>([]);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Initialize theme from HTML class list
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'));
    }
  }, []);

  // Sync theme changes
  const toggleTheme = (dark: boolean) => {
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Share link
  const handleShare = async () => {
    const shareData = {
      title: titleMarathi,
      text: `${titleMarathi} - ${saint?.nameMarathi || 'अज्ञात संत'} यांचे भक्ती साहित्य`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch (err) {
      console.error('Failed to share:', err);
    }
  };

  // Split text into lines for quote selector
  const allLines = React.useMemo(() => {
    return fullText.split('\n').filter(line => line.trim().length > 0);
  }, [fullText]);

  // Handle line selection for quote card
  const toggleLineSelection = (line: string) => {
    if (selectedLines.includes(line)) {
      setSelectedLines(prev => prev.filter(l => l !== line));
    } else {
      // Limit to 6 lines to fit on card nicely
      if (selectedLines.length < 6) {
        setSelectedLines(prev => [...prev, line]);
      }
    }
  };

  // Open modal and initialize with first 4 lines
  const openCardGenerator = () => {
    setSelectedLines(allLines.slice(0, 4));
    setShowCardModal(true);
  };

  // Render Quote Card onto Canvas
  React.useEffect(() => {
    if (!showCardModal || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Saffron/Gold Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#FF7A1A'); // Saffron DEFAULT
    gradient.addColorStop(1, '#803908'); // Dark Saffron
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw Elegant Border Frame
    ctx.strokeStyle = 'rgba(255, 218, 114, 0.6)'; // Gold border
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    ctx.strokeStyle = 'rgba(255, 218, 114, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

    // 3. Draw Watermark/Icon (Diya/Om Outline)
    ctx.fillStyle = 'rgba(255, 218, 114, 0.08)';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 180, 0, Math.PI * 2);
    ctx.fill();

    // 4. Draw Header Text
    ctx.fillStyle = '#FFF8EC'; // Cream
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillText('।। डिजिटल पंढरपूर ।।', canvas.width / 2, 70);

    // 5. Draw Title
    ctx.fillStyle = '#FFEEDB';
    ctx.font = '22px Georgia, serif';
    ctx.fillText(`"${titleMarathi}"`, canvas.width / 2, 110);

    // Draw dividing line
    ctx.strokeStyle = 'rgba(255, 218, 114, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(150, 130);
    ctx.lineTo(canvas.width - 150, 130);
    ctx.stroke();

    // 6. Draw Selected Lines
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 26px sans-serif';
    const startY = 190;
    const lineSpacingValue = 42;

    selectedLines.forEach((line, index) => {
      ctx.fillText(line, canvas.width / 2, startY + (index * lineSpacingValue));
    });

    // 7. Draw Saint Signature
    if (saint) {
      // Decorative quote close
      ctx.fillStyle = 'rgba(255, 218, 114, 0.4)';
      ctx.font = '70px Georgia, serif';
      ctx.fillText('”', canvas.width / 2, startY + (selectedLines.length * lineSpacingValue) + 30);

      ctx.fillStyle = '#FFEEDB';
      ctx.font = 'italic 20px Georgia, serif';
      ctx.fillText(`- ${saint.nameMarathi}`, canvas.width / 2, startY + (selectedLines.length * lineSpacingValue) + 70);
    }
  }, [showCardModal, selectedLines, titleMarathi, saint]);

  // Download Quote Card
  const downloadCard = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `digital-pandharpur-${slug}-quote.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Action and Setting Controls Toolbar */}
      <div className="flex flex-wrap items-center gap-2 justify-between border border-saffron/10 bg-card rounded-xl p-3 shadow-sm">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Bookmark & Like Micro-interactions */}
          <BookmarkButton slug={slug} title={titleMarathi} />
          <BellLikeButton slug={slug} />

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-saffron/20 text-sm hover:bg-saffron/10 text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
            title="मित्रांना पाठवा"
          >
            {shared ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4 text-saffron" />}
            <span>{shared ? 'दुवा कॉपी केला!' : 'शेयर'}</span>
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-saffron/20 text-sm hover:bg-saffron/10 text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
            title="मजकूर कॉपी करा"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-saffron" />}
            <span>{copied ? 'कॉपी केले!' : 'कॉपी'}</span>
          </button>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-saffron/20 text-sm hover:bg-saffron/10 text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
            title="प्रिंट करा"
          >
            <Printer className="w-4 h-4 text-saffron" />
            <span>प्रिंट</span>
          </button>

          {/* Share Card Button */}
          <button
            onClick={openCardGenerator}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-saffron/20 bg-saffron/5 hover:bg-saffron/15 text-sm text-saffron font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
            title="व्हॉट्सॲप स्टेटस कार्ड बनवा"
          >
            <Download className="w-4 h-4" />
            <span>स्टेटस बनवा</span>
          </button>
        </div>

        {/* Display Adjustments */}
        <div className="flex items-center gap-2">
          {/* Typography Panel Toggle */}
          <button
            onClick={() => setShowPrefPanel(!showPrefPanel)}
            className={`p-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-saffron ${
              showPrefPanel ? 'bg-saffron text-white border-saffron' : 'border-saffron/20 hover:bg-saffron/10 text-foreground'
            }`}
            title="वाचन पर्याय"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Theme Toggles */}
          {isDark ? (
            <button
              onClick={() => toggleTheme(false)}
              className="p-2 rounded-lg border border-saffron/20 hover:bg-saffron/10 text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
              title="लाइट मोड"
            >
              <Sun className="w-4 h-4 text-saffron" />
            </button>
          ) : (
            <button
              onClick={() => toggleTheme(true)}
              className="p-2 rounded-lg border border-saffron/20 hover:bg-saffron/10 text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
              title="डार्क मोड"
            >
              <Moon className="w-4 h-4 text-saffron" />
            </button>
          )}
        </div>
      </div>

      {/* Typographic Preferences Panel */}
      {showPrefPanel && (
        <div className="border border-saffron/20 bg-cream dark:bg-card rounded-xl p-4 space-y-4 shadow-inner animate-fadeIn">
          <h3 className="font-marathiHeading text-md text-maroon dark:text-saffron font-bold">वाचन सेटिंग्ज (Preferences)</h3>
          
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            {/* Font Family Selection */}
            <div className="space-y-1.5">
              <label className="text-muted-foreground font-medium">अक्षर प्रकार (Font)</label>
              <div className="flex gap-1">
                {[
                  { id: 'font-marathi', name: 'Noto' },
                  { id: 'font-marathiHeading', name: 'Tiro' },
                  { id: 'font-sans', name: 'Inter' }
                ].map(font => (
                  <button
                    key={font.id}
                    onClick={() => setFontFamily(font.id)}
                    className={`flex-1 px-2 py-1.5 rounded border text-xs font-semibold transition-all ${
                      fontFamily === font.id
                        ? 'bg-saffron border-saffron text-white'
                        : 'bg-background border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size Adjuster */}
            <div className="space-y-1.5">
              <label className="text-muted-foreground font-medium">अक्षर आकार (Size: {fontSize}px)</label>
              <div className="flex gap-1">
                <button
                  onClick={() => setFontSize(Math.max(16, fontSize - 2))}
                  className="flex-1 px-2 py-1 bg-background border border-border text-foreground rounded hover:bg-muted font-bold"
                >
                  A-
                </button>
                <button
                  onClick={() => setFontSize(Math.min(36, fontSize + 2))}
                  className="flex-1 px-2 py-1 bg-background border border-border text-foreground rounded hover:bg-muted font-bold"
                >
                  A+
                </button>
              </div>
            </div>

            {/* Line Height Selector */}
            <div className="space-y-1.5">
              <label className="text-muted-foreground font-medium">ओळींमधील अंतर (Height)</label>
              <div className="flex gap-1">
                {[
                  { value: 1.5, label: 'अरुंद' },
                  { value: 1.8, label: 'मध्यम' },
                  { value: 2.2, label: 'रुंद' }
                ].map(spacing => (
                  <button
                    key={spacing.value}
                    onClick={() => setLineHeight(spacing.value)}
                    className={`flex-1 px-2 py-1 rounded border text-xs transition-all ${
                      lineHeight === spacing.value
                        ? 'bg-saffron border-saffron text-white'
                        : 'bg-background border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {spacing.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flower Petals Particle Canvas Overlay */}
      <FlowerPetals active={petalsActive} onComplete={() => setPetalsActive(false)} />

      {/* Main Marathi Text reading area */}
      <div className="reading-area">
        <div className="bg-card rounded-xl p-6 sm:p-10 border border-saffron/10 shadow-sm relative overflow-hidden">
          {/* Subtle floral/heritage background watermark */}
          <div className="absolute top-0 right-0 w-24 h-24 text-saffron/5 pointer-events-none transform translate-x-4 -translate-y-4">
            🌸
          </div>
          
          <div 
            style={{ 
              fontSize: `${fontSize}px`, 
              lineHeight: lineHeight,
              fontFamily: fontFamily === 'font-marathi' 
                ? 'var(--font-devanagari), Noto Sans Devanagari, sans-serif'
                : fontFamily === 'font-marathiHeading'
                  ? 'var(--font-devanagari-heading), Tiro Devanagari Marathi, serif'
                  : 'var(--font-inter), Inter, sans-serif'
            }} 
            className="reading-text text-foreground whitespace-pre-line leading-loose text-center md:text-left transition-all duration-200"
          >
            {fullText}
          </div>

          {/* Finished Reading Button */}
          <div className="mt-12 pt-6 border-t border-saffron/10 flex flex-col items-center gap-3">
            <button
              onClick={() => setPetalsActive(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-saffron to-gold hover:from-saffron/95 hover:to-gold/95 text-white font-semibold rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 saffron-glow text-sm font-marathi"
            >
              <span>वाचन पूर्ण केले 🌸</span>
            </button>
            <p className="text-[10px] text-muted-foreground">पुष्पवृष्टी अनुभवण्यासाठी वर क्लिक करा</p>
          </div>
        </div>
      </div>

      {/* WhatsApp Quote Card Generator Modal */}
      {showCardModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl border border-saffron/20 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-scaleUp">
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-saffron/10">
              <h2 className="font-marathiHeading text-xl font-bold text-maroon dark:text-saffron">
                व्हॉट्सॲप स्टेटस कोट कार्ड बनवा 🚩
              </h2>
              <button 
                onClick={() => setShowCardModal(false)}
                className="p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 grid md:grid-cols-2 gap-5">
              {/* Left Column: Select lines */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">
                    ओळी निवडा (जास्तीत जास्त ६ निवडा):
                  </p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto border border-border rounded-lg p-3 bg-muted/40">
                    {allLines.map((line, idx) => {
                      const isSelected = selectedLines.includes(line);
                      return (
                        <button
                          key={idx}
                          onClick={() => toggleLineSelection(line)}
                          className={`w-full text-left p-2 rounded text-sm transition-all border ${
                            isSelected
                              ? 'bg-saffron/15 border-saffron text-maroon dark:text-saffron font-bold'
                              : 'bg-card border-border text-foreground hover:bg-muted'
                          }`}
                        >
                          {line}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="bg-saffron/5 border border-saffron/20 rounded-lg p-3 text-xs text-saffron">
                  💡 टीप: ही चित्रे व्हॉट्सॲप, फेसबुक किंवा टेलिग्राम वर स्टेटस म्हणून शेअर करण्यासाठी योग्य आकाराची (५०० x ५०० पिक्सेल) आहेत.
                </div>
              </div>

              {/* Right Column: Preview Canvas */}
              <div className="flex flex-col items-center justify-center space-y-3">
                <p className="text-sm font-semibold text-muted-foreground">कार्ड प्रिव्ह्यू:</p>
                <div className="border border-saffron/20 rounded-lg overflow-hidden shadow-lg bg-card">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={500}
                    className="max-w-full w-[250px] h-[250px] sm:w-[300px] sm:h-[300px] aspect-square object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-saffron/10 flex justify-end gap-3 bg-muted/20 rounded-b-2xl">
              <button
                onClick={() => setShowCardModal(false)}
                className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted text-sm transition-colors"
              >
                रद्द करा
              </button>
              <button
                onClick={downloadCard}
                disabled={selectedLines.length === 0}
                className="flex items-center gap-2 px-5 py-2 bg-saffron hover:bg-saffron/90 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>डाउनलोड करा</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Floating Audio Player */}
      {embedUrl && audioVisible && (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm w-full bg-card border-2 border-saffron/30 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 transform scale-100">
          {/* Header strip */}
          <div className="bg-saffron/15 px-4 py-2 flex items-center justify-between text-maroon dark:text-saffron border-b border-saffron/10">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-saffron opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-saffron"></span>
              </span>
              <p className="text-xs font-bold font-marathiHeading truncate max-w-[180px]">
                {titleMarathi}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setAudioExpanded(!audioExpanded)}
                className="p-1 hover:bg-saffron/10 rounded transition-colors text-saffron"
                title={audioExpanded ? 'माहिती लपवा' : 'माहिती दाखवा'}
              >
                {audioExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setAudioVisible(false)}
                className="p-1 hover:bg-saffron/10 rounded transition-colors text-muted-foreground hover:text-red-500"
                title="प्लेयर बंद करा"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Expanded video player container */}
          <div 
            className={`transition-all duration-300 overflow-hidden ${
              audioExpanded ? 'h-[200px]' : 'h-0'
            }`}
          >
            <iframe
              src={embedUrl}
              title={`${titleMarathi} ऑडियो`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-none"
            />
          </div>

          {/* Minimized audio control strip */}
          {!audioExpanded && (
            <div className="px-4 py-3 flex items-center justify-between bg-card text-foreground">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-saffron/20 rounded-full flex items-center justify-center animate-diya-pulse text-saffron">
                  <Music className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">भक्ती संगीत चालू करा</p>
                  <button 
                    onClick={() => setAudioExpanded(true)}
                    className="text-[11px] text-saffron hover:underline font-bold text-left block"
                  >
                    प्लेयर उघडा
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

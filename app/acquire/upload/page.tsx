'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { 
  Upload, 
  FileImage, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Loader2, 
  UserCheck 
} from 'lucide-react';
import Link from 'next/link';

export default function ManuscriptUploadPage() {
  const { data: session, status } = useSession();
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    imageUrl: string;
    ocrText: string;
    queueId: string;
  } | null>(null);

  // File drag-and-drop states
  const [isDragActive, setIsDragActive] = React.useState(false);

  React.useEffect(() => {
    // Generate default title based on current timestamp
    if (!title) {
      const dateStr = new Date().toLocaleDateString('mr-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      setTitle(`हस्तलिखित संग्रह - ${dateStr}`);
    }
  }, [title]);

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        setError('कृपया केवळ प्रतिमा (Image files) अपलोड करा.');
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('title', title);

    try {
      setCurrentStep('१. प्रतिमा सर्व्हरवर अपलोड होत आहे...');
      // Sleep slightly to let the user see the progress steps visually
      await new Promise(r => setTimeout(r, 800));

      setCurrentStep('२. प्रतिमेचे शुद्धीकरण (Preprocessing & Binarization) सुरू आहे...');
      await new Promise(r => setTimeout(r, 1000));

      setCurrentStep('३. देवनागरी ओसीआर (Devanagari OCR Engine) द्वारे मजकूर काढला जात आहे...');
      
      const response = await fetch('/api/acquire/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'ओसीआर प्रक्रिया अयशस्वी झाली.');
      }

      setCurrentStep('४. काढलेला मजकूर पुनरावलोकन श्रेणी (3-Tier Moderation Queue) मध्ये समाविष्ट केला जात आहे...');
      await new Promise(r => setTimeout(r, 800));

      const data = await response.json();
      setResult({
        imageUrl: data.imageUrl,
        ocrText: data.ocrText,
        queueId: data.queueId,
      });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'फाइल प्रक्रिया करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setTitle('');
  };

  // Loading Session State
  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-saffron" />
      </div>
    );
  }

  // Unauthorized State (Show CTA to sign in)
  if (status === 'unauthenticated' || !session) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <div className="bg-card border-2 border-saffron/20 p-10 rounded-2xl shadow-xl space-y-6">
          <div className="w-20 h-20 bg-saffron/10 text-saffron rounded-full flex items-center justify-center mx-auto text-4xl border border-saffron/20">
            📿
          </div>
          <h1 className="font-marathiHeading text-2xl sm:text-3xl font-bold text-maroon dark:text-saffron">
            योगदान देण्यासाठी लॉग इन करा
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            डिजिटल पंढरपूर हा एक सामूहिक वारकरी प्रकल्प आहे. प्राचीन हस्तलिखिते अपलोड करण्यासाठी, त्यांचे वाचन/ओसीआर करण्यासाठी आणि भक्ती साहित्याचे जतन करण्यासाठी आपल्याला स्वयंसेवक खाते आवश्यक आहे.
          </p>

          <div className="pt-4">
            <Link
              href={`/auth/signin?callbackUrl=${encodeURIComponent('/acquire/upload')}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-saffron hover:bg-saffron/90 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <UserCheck className="w-5 h-5" />
              <span>लॉगिन करा आणि योगदान द्या</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="ब्रेडक्रंब">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-saffron">
              मुख्यपृष्ठ
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li className="text-foreground">हस्तलिखित योगदान</li>
        </ol>
      </nav>

      {/* Page Header */}
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl sm:text-4xl font-marathiHeading text-maroon dark:text-saffron font-bold">
          हस्तलिखित प्रतिमा अपलोड (OCR) ✍️
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          प्राचीन हस्तलिखिते, जुनी ग्रंथ पाने किंवा जुन्या ग्रंथांचे फोटो अपलोड करा. कृत्रिम बुद्धिमत्ता (AI OCR) द्वारे देवनागरी मजकूर स्वयंचलित काढला जाईल.
        </p>
      </header>

      {/* Main Container */}
      {!result ? (
        <form onSubmit={handleUploadSubmit} className="space-y-6">
          {/* Form fields */}
          <div className="bg-card border border-saffron/10 rounded-2xl p-6 space-y-6 shadow-sm">
            
            {/* Title field */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-semibold text-maroon dark:text-saffron">
                हस्तलिखिताचे नाव / शीर्षक (Title)
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="उदा. संत तुकाराम गाथा पृष्ठ १२"
                className="w-full px-4 py-2 border border-saffron/20 focus:border-saffron focus:ring-2 focus:ring-saffron/20 bg-background rounded-lg text-sm outline-none transition-all font-marathi"
              />
            </div>

            {/* Upload Area / Dropzone */}
            <div className="space-y-2">
              <span className="text-sm font-semibold text-maroon dark:text-saffron block">
                हस्तलिखित प्रतिमा निवडा (Manuscript Image)
              </span>

              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('image-input')?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragActive 
                    ? 'border-saffron bg-saffron/5' 
                    : 'border-saffron/20 hover:border-saffron/50 hover:bg-muted/30'
                }`}
              >
                <input
                  id="image-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                />

                {previewUrl ? (
                  <div className="space-y-4 max-w-xs mx-auto">
                    <img 
                      src={previewUrl} 
                      alt="हस्तलिखित प्रिव्ह्यू" 
                      className="max-h-[200px] mx-auto rounded border border-saffron/20 shadow-md object-contain"
                    />
                    <div className="flex items-center justify-center gap-1.5 text-xs text-saffron font-bold">
                      <FileImage className="w-4 h-4" />
                      <span className="truncate">{file?.name}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 py-4">
                    <Upload className="w-10 h-10 text-saffron mx-auto animate-bounce" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        प्रतिमा येथे ड्रॅग करा किंवा फाईल ब्राउझ करा
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG किंवा JPEG फाईल्स स्वीकृत (जास्तीत जास्त १०MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Trigger Button */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3 flex gap-2 items-center text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            {previewUrl && (
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="px-5 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted text-foreground transition-colors disabled:opacity-50"
              >
                साफ करा
              </button>
            )}

            <button
              type="submit"
              disabled={loading || !file}
              className="flex items-center gap-2 px-6 py-2.5 bg-saffron hover:bg-saffron/90 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>प्रक्रिया सुरू आहे...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>अपलोड करा आणि मजकूर काढा (Run OCR)</span>
                </>
              )}
            </button>
          </div>

          {/* Loading steps display */}
          {loading && currentStep && (
            <div className="bg-saffron/5 border border-saffron/20 rounded-xl p-5 space-y-3 animate-pulse">
              <div className="flex items-center gap-2 text-saffron font-bold text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>डिजिटल पंढरपूर एआय प्रक्रिया सुरू आहे:</span>
              </div>
              <p className="text-xs text-foreground/80 pl-6 font-marathi">
                {currentStep}
              </p>
            </div>
          )}
        </form>
      ) : (
        /* Result: side-by-side verification block */
        <div className="space-y-6">
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-xl p-4 flex gap-3 items-start text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
            <div className="space-y-1">
              <p className="font-bold">मजकूर यशस्वीरित्या काढण्यात आला आहे!</p>
              <p className="text-xs text-muted-foreground">
                हा ओसीआर केलेला मजकूर पुनरावलोकनासाठी (Moderation Queue: {result.queueId}) मध्ये समाविष्ट झाला आहे. स्वयंसेवक आणि विद्वानांद्वारे मंजुरीनंतर तो थेट प्रकाशित होईल.
              </p>
            </div>
          </div>

          {/* Side-by-side layout */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Original uploaded image */}
            <div className="bg-card border border-saffron/10 rounded-2xl p-5 space-y-3 flex flex-col">
              <h2 className="font-marathiHeading text-md font-bold text-maroon dark:text-saffron">
                १. मूळ हस्तलिखित प्रतिमा (Original Image)
              </h2>
              <div className="flex-1 border border-border bg-muted/20 rounded-lg p-2 flex items-center justify-center min-h-[300px]">
                <img
                  src={result.imageUrl}
                  alt="अपलोड केलेले हस्तलिखित"
                  className="max-h-[400px] max-w-full rounded object-contain shadow"
                />
              </div>
            </div>

            {/* Right: Extracted OCR Text */}
            <div className="bg-card border border-saffron/10 rounded-2xl p-5 space-y-3 flex flex-col">
              <h2 className="font-marathiHeading text-md font-bold text-maroon dark:text-saffron">
                २. एआय द्वारे काढलेला देवनागरी मजकूर (Extracted Text)
              </h2>
              <div className="flex-1 flex flex-col space-y-2">
                <textarea
                  readOnly
                  value={result.ocrText}
                  className="flex-1 w-full p-4 border border-saffron/20 bg-muted/10 rounded-lg text-sm outline-none font-marathi leading-relaxed min-h-[300px] resize-y"
                />
                <span className="text-[10px] text-muted-foreground block text-right">
                  * हा मजकूर वाचन क्यु मध्ये सेव्ह केलेला आहे.
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleReset}
              className="px-5 py-2 bg-saffron text-white text-sm font-semibold rounded-lg hover:bg-saffron/90 transition-colors shadow"
            >
              आणखी एक हस्तलिखित अपलोड करा
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-5 py-2 border border-border text-foreground hover:bg-muted text-sm font-semibold rounded-lg transition-colors"
            >
              <span>मुख्यपृष्ठ जा</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';

export function ConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [consent, setConsent] = useState({
    essential: true,
    analytics: false,
  });

  useEffect(() => {
    // Check if consent has already been given
    const storedConsent = localStorage.getItem('pandharpur-cookie-consent');
    if (!storedConsent) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const consentSettings = { essential: true, analytics: true };
    localStorage.setItem('pandharpur-cookie-consent', JSON.stringify(consentSettings));
    setIsVisible(false);
    // Dispatch custom event to notify analytics scripts
    window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: consentSettings }));
  };

  const handleRejectAll = () => {
    const consentSettings = { essential: true, analytics: false };
    localStorage.setItem('pandharpur-cookie-consent', JSON.stringify(consentSettings));
    setIsVisible(false);
    window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: consentSettings }));
  };

  const handleSavePreferences = () => {
    localStorage.setItem('pandharpur-cookie-consent', JSON.stringify(consent));
    setIsVisible(false);
    window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: consent }));
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[100] bg-background/95 border-2 border-saffron/30 backdrop-blur-md rounded-2xl p-6 shadow-2xl transition-all duration-500 transform translate-y-0"
      role="dialog"
      aria-labelledby="consent-title"
      aria-describedby="consent-description"
    >
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl" aria-hidden="true">🚩</span>
        <div>
          <h2 id="consent-title" className="font-marathiHeading text-lg text-maroon font-semibold leading-tight">
            गोपनीयता आणि कुकीज संमती
          </h2>
          <h3 className="text-xs text-muted-foreground font-medium">
            Privacy & Cookie Consent (DPDP Act 2023 Compliant)
          </h3>
        </div>
      </div>

      <div id="consent-description" className="space-y-3 mb-5">
        <p className="text-sm font-marathi text-foreground/90 leading-relaxed">
          आम्ही या व्यासपीठावर आपल्या अनुभवात सुधारणा करण्यासाठी आणि वापर आकडेवारीचे विश्लेषण करण्यासाठी कुकीजचा वापर करतो. तुमच्या गोपनीयतेचे रक्षण करणे ही आमची प्राथमिकता आहे.
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          We use cookies to improve your experience on our platform and analyze site traffic under DPDP rules. By accepting, you consent to our use of cookies.
        </p>
      </div>

      {showPreferences && (
        <div className="bg-cream/40 border border-saffron/10 rounded-xl p-4 mb-5 space-y-3">
          <h4 className="text-xs font-marathi text-maroon font-semibold uppercase tracking-wider">संमती पर्याय / Preferences:</h4>
          
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={consent.essential} 
              disabled 
              className="mt-1 h-4 w-4 rounded border-saffron text-saffron focus:ring-saffron accent-saffron"
            />
            <div>
              <span className="text-xs font-marathi font-bold text-foreground block">आवश्यक कुकीज (नेहमी चालू)</span>
              <span className="text-[10px] text-muted-foreground block">Essential Cookies (Required for basic site functionality)</span>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={consent.analytics} 
              onChange={(e) => setConsent({ ...consent, analytics: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-saffron text-saffron focus:ring-saffron accent-saffron cursor-pointer"
            />
            <div>
              <span className="text-xs font-marathi font-bold text-foreground block">विश्लेषण कुकीज (पर्यायी)</span>
              <span className="text-[10px] text-muted-foreground block">Analytics Cookies (Optional analytics tracking)</span>
            </div>
          </label>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 justify-end text-xs">
        {!showPreferences ? (
          <>
            <button
              onClick={() => setShowPreferences(true)}
              className="px-3 py-2 rounded-lg text-maroon hover:bg-saffron/10 font-marathi font-medium border border-transparent hover:border-saffron/20 transition-all focus:outline-none focus:ring-2 focus:ring-saffron"
            >
              पर्याय निवडा / Set Preferences
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleRejectAll}
                className="flex-1 px-4 py-2 rounded-lg border border-saffron/20 text-maroon hover:bg-saffron/5 font-marathi font-medium transition-all focus:outline-none focus:ring-2 focus:ring-saffron"
              >
                नाकारा / Reject
              </button>
              <button
                onClick={handleAcceptAll}
                className="flex-1 px-4 py-2 rounded-lg bg-saffron hover:bg-saffron-dark text-white font-marathi font-bold shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-saffron"
              >
                स्वीकारा / Accept
              </button>
            </div>
          </>
        ) : (
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setShowPreferences(false)}
              className="px-4 py-2 rounded-lg border border-saffron/20 text-maroon hover:bg-saffron/5 font-marathi font-medium transition-all focus:outline-none focus:ring-2 focus:ring-saffron"
            >
              मागे / Back
            </button>
            <button
              onClick={handleSavePreferences}
              className="flex-1 px-4 py-2 rounded-lg bg-saffron hover:bg-saffron-dark text-white font-marathi font-bold shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-saffron"
            >
              बदल जतन करा / Save Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

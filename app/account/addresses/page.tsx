'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Plus, Trash2, Home, Briefcase, Landmark, ShieldAlert, ArrowLeft, Check } from 'lucide-react';

interface Address {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  label: string | null;
  isDefault: boolean;
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setStateName] = useState('Maharashtra');
  const [postalCode, setPostalCode] = useState('');
  const [label, setLabel] = useState('Home');
  const [isDefault, setIsDefault] = useState(false);

  const fetchAddresses = () => {
    setLoading(true);
    fetch('/api/addresses')
      .then((r) => {
        if (!r.ok) throw new Error('पत्ते लोड करण्यात अडचण आली.');
        return r.json();
      })
      .then((data) => setAddresses(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);

    if (!fullName || !phone || !line1 || !city || !state || !postalCode) {
      setError('कृपया सर्व आवश्यक शेती भरा.');
      setSubmitLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone,
          line1,
          line2: line2 || undefined,
          city,
          state,
          postalCode,
          label,
          isDefault,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'पत्ता जतन करताना त्रुटी आली.');

      // Reset form and reload
      setFullName('');
      setPhone('');
      setLine1('');
      setLine2('');
      setCity('');
      setStateName('Maharashtra');
      setPostalCode('');
      setLabel('Home');
      setIsDefault(false);
      setShowAddForm(false);
      fetchAddresses();
    } catch (err: any) {
      setError(err.message || 'पत्ता जोडण्यात अडचण आली.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('तुम्हाला नक्की हा पत्ता हटवायचा आहे का?')) return;
    setError(null);

    try {
      const res = await fetch(`/api/addresses?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'पत्ता हटवताना त्रुटी आली.');

      fetchAddresses();
    } catch (err: any) {
      setError(err.message || 'पत्ता हटवण्यात अडचण आली.');
    }
  };

  const getLabelIcon = (lbl: string | null) => {
    switch (lbl?.toLowerCase()) {
      case 'home':
        return <Home className="w-4 h-4 text-saffron" />;
      case 'office':
        return <Briefcase className="w-4 h-4 text-saffron" />;
      case 'temple':
        return <Landmark className="w-4 h-4 text-saffron" />;
      default:
        return <MapPin className="w-4 h-4 text-saffron" />;
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Breadcrumb / Back button */}
        <div className="flex items-center justify-between">
          <Link
            href="/account"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-saffron transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> खात्यावर परत जा
          </Link>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setError(null);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-saffron text-white rounded-xl text-sm font-semibold hover:bg-saffron/90 transition-all shadow-md active:scale-95"
          >
            {showAddForm ? 'रद्द करा' : <><Plus className="w-4 h-4" /> नवीन पत्ता जोडा</>}
          </button>
        </div>

        <header className="mb-4">
          <h1 className="text-3xl font-marathiHeading font-bold text-maroon dark:text-saffron">
            माझे पत्ते 🚩
          </h1>
          <p className="text-muted-foreground text-sm">
            पुस्तके आणि ग्रंथ मागवण्यासाठी तुमचे डिलिव्हरी पत्ते व्यवस्थापित करा.
          </p>
        </header>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-center gap-3 text-red-700 dark:text-red-400 text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Add Address Form Card */}
        {showAddForm && (
          <form
            onSubmit={handleAddAddress}
            className="bg-card border-2 border-saffron/20 p-6 rounded-2xl shadow-xl space-y-4 animate-slide-up"
          >
            <h2 className="text-lg font-bold text-maroon dark:text-saffron border-b border-saffron/10 pb-2">
              नवीन पत्ता माहिती
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  पूर्ण नाव (अत्यावश्यक)
                </label>
                <input
                  type="text"
                  required
                  placeholder="उदा. ज्ञानेश्वर पाटील"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-background border border-saffron/20 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-saffron focus:border-transparent outline-none text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  मोबाईल नंबर (अत्यावश्यक)
                </label>
                <input
                  type="tel"
                  required
                  placeholder="उदा. ९८७६५४३२१०"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-background border border-saffron/20 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-saffron focus:border-transparent outline-none text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  पत्ता प्रकार (लेबल)
                </label>
                <select
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full bg-background border border-saffron/20 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-saffron focus:border-transparent outline-none text-foreground"
                >
                  <option value="Home">घर (Home)</option>
                  <option value="Office">कार्यालय (Office)</option>
                  <option value="Temple">मंदिर/मठ (Temple)</option>
                  <option value="Other">इतर (Other)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  पत्ता ओळ १ (अत्यावश्यक)
                </label>
                <input
                  type="text"
                  required
                  placeholder="उदा. ब्लॉक ३०२, विठ्ठल निवास"
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  className="w-full bg-background border border-saffron/20 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-saffron focus:border-transparent outline-none text-foreground"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  पत्ता ओळ २ (पर्यायी)
                </label>
                <input
                  type="text"
                  placeholder="उदा. देऊळ गल्ली, पंढरपूर"
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  className="w-full bg-background border border-saffron/20 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-saffron focus:border-transparent outline-none text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  शहर (City)
                </label>
                <input
                  type="text"
                  required
                  placeholder="उदा. सोलापूर"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-background border border-saffron/20 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-saffron focus:border-transparent outline-none text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  पिन कोड (Postal Code)
                </label>
                <input
                  type="text"
                  required
                  placeholder="उदा. ४१३३०४"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full bg-background border border-saffron/20 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-saffron focus:border-transparent outline-none text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  राज्य (State)
                </label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full bg-background border border-saffron/20 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-saffron focus:border-transparent outline-none text-foreground"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-saffron border-saffron/30 rounded focus:ring-saffron"
                />
                <label htmlFor="isDefault" className="text-xs font-semibold text-muted-foreground cursor-pointer">
                  याला मुख्य पत्ता बनवा
                </label>
              </div>
            </div>

            <div className="border-t border-saffron/10 pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2.5 border border-saffron/20 text-muted-foreground rounded-xl text-sm font-semibold hover:bg-saffron/5"
              >
                मागे
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="px-5 py-2.5 bg-saffron text-white rounded-xl text-sm font-semibold hover:bg-saffron/90 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {submitLoading ? 'जतन होत आहे...' : 'पत्ता जतन करा 💾'}
              </button>
            </div>
          </form>
        )}

        {/* Address List */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-saffron border-t-transparent rounded-full animate-spin" />
          </div>
        ) : addresses.length === 0 ? (
          <div className="bg-card border border-saffron/10 p-12 text-center rounded-2xl shadow-sm">
            <p className="text-muted-foreground text-base">अजून कोणताही डिलिव्हरी पत्ता जतन केलेला नाही.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 inline-flex items-center gap-1 px-4 py-2 bg-saffron/10 text-saffron border border-saffron/20 rounded-xl text-sm font-semibold hover:bg-saffron/20 transition-all"
            >
              <Plus className="w-4 h-4" /> नवीन पत्ता जोडा
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="bg-card border border-saffron/10 p-5 rounded-2xl shadow-sm hover:border-saffron/30 transition-all flex justify-between items-start"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-base text-foreground">{addr.fullName}</span>
                    <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-saffron/10 text-saffron uppercase border border-saffron/20">
                      {getLabelIcon(addr.label)}
                      {addr.label === 'Home' ? 'घर' : addr.label === 'Office' ? 'ऑफिस' : addr.label === 'Temple' ? 'मंदिर' : addr.label || 'इतर'}
                    </span>
                    {addr.isDefault && (
                      <span className="flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded bg-green-500/10 text-green-600 border border-green-500/20">
                        <Check className="w-3 h-3" /> मुख्य पत्ता
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-foreground/80 space-y-0.5 leading-relaxed">
                    <p>{addr.line1}</p>
                    {addr.line2 && <p>{addr.line2}</p>}
                    <p>
                      {addr.city}, {addr.state} — <span className="font-mono font-medium">{addr.postalCode}</span>
                    </p>
                    <p className="text-xs text-muted-foreground pt-1">संपर्क: {addr.phone}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteAddress(addr.id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors"
                  aria-label="पत्ता हटवा"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


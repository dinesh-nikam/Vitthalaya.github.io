'use client';

import { useState, useEffect } from 'react';

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

  useEffect(() => {
    fetch('/api/addresses')
      .then((r) => r.json())
      .then((data) => setAddresses(data))
      .catch(() => setAddresses([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-cream-50 py-8 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-saffron border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-cream-50 py-8">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        <h1 className="text-3xl font-bold text-maroon-800">माझे पत्ते</h1>

        {addresses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500">अजून कोणताही पत्ता नाही</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {addresses.map((addr) => (
              <div key={addr.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{addr.fullName}</p>
                    <p className="text-sm text-gray-600">{addr.line1}</p>
                    {addr.line2 && <p className="text-sm text-gray-600">{addr.line2}</p>}
                    <p className="text-sm text-gray-600">{addr.city}, {addr.state} — {addr.postalCode}</p>
                    <p className="text-sm text-gray-500">{addr.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {addr.isDefault && <span className="text-xs bg-saffron-100 text-saffron-700 px-2 py-1 rounded">मुख्य</span>}
                    {addr.label && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{addr.label}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

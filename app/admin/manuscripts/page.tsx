import * as React from 'react';
import { db } from '@/src/db/client';
import { FileText, CheckCircle2, AlertCircle, Clock, UploadCloud } from 'lucide-react';

export const revalidate = 0;

export default async function ManuscriptsAdminPage() {
  const uploads = await db.manuscriptUpload.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      volunteer: {
        select: {
          name: true,
          email: true,
        },
      },
      ocrJobs: {
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold font-marathiHeading text-foreground flex items-center gap-3">
            <FileText className="w-8 h-8 text-saffron" />
            <span>हस्तलिखित ओसीआर संपादन व पुनरावलोकन</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            अपलोड केलेल्या दुर्मिळ ग्रंथांचे व हस्तलिखितांचे OCR पाठ्य तपासा, संपादित करा आणि संग्रहात जोडा.
          </p>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-5 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-saffron/10 text-saffron rounded-lg">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">एकूण हस्तलिखिते</p>
            <p className="text-2xl font-bold text-foreground">{uploads.length}</p>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-green-500/10 text-green-600 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">OCR पूर्ण झालेले</p>
            <p className="text-2xl font-bold text-foreground">
              {uploads.filter((u) => u.status === 'ocr_completed').length}
            </p>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">प्रलंबित (Pending)</p>
            <p className="text-2xl font-bold text-foreground">
              {uploads.filter((u) => u.status === 'pending').length}
            </p>
          </div>
        </div>
      </div>

      {/* Uploads List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-md">हस्तलिखित सूची ({uploads.length})</h2>
        </div>

        {uploads.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground/60" />
            <p className="text-sm">सध्या कोणतेही नवीन हस्तलिखित अपलोड केलेले नाही.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {uploads.map((item) => (
              <div key={item.id} className="p-5 hover:bg-muted/20 transition-colors space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono px-2 py-1 bg-muted border border-border rounded text-muted-foreground">
                      ID: {item.id.slice(0, 8)}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      स्वयंसेवक: {item.volunteer?.name || item.volunteer?.email || 'अज्ञात'}
                    </span>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      item.status === 'ocr_completed'
                        ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    }`}
                  >
                    {item.status === 'ocr_completed' ? 'OCR संपादन पूर्ण' : 'प्रलंबित'}
                  </span>
                </div>

                {item.rawOcrText && (
                  <div className="bg-muted/40 p-3 rounded-lg border border-border text-xs text-foreground font-marathi whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {item.rawOcrText}
                  </div>
                )}

                <div className="text-[11px] text-muted-foreground flex items-center gap-4">
                  <span>दिनांक: {new Date(item.createdAt).toLocaleDateString('mr-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

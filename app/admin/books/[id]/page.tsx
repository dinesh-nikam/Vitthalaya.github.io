'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  ArrowLeft, BookOpen, Layers, Edit3, Trash2, 
  Save, CheckCircle, AlertCircle, Loader2, Globe, DollarSign 
} from 'lucide-react';

interface BookEdition {
  id: string;
  format: string;
  fileUrl: string | null;
  fileSizeBytes: number | null;
  price: string | null;
  printCost: string | null;
  pageCount: number | null;
}

interface BookComposition {
  id: string;
  sortOrder: number;
  sectionName: string | null;
  composition: {
    titleMarathi: string;
    titleTranslit: string;
    type: string;
  };
}

interface Book {
  id: string;
  titleMarathi: string;
  titleEnglish: string | null;
  slug: string;
  bookType: string;
  status: string;
  curationType: string;
  description: string | null;
  isPublic: boolean;
  basePrice: string | null;
  royaltyPercent: number | null;
  totalCompositions: number | null;
  totalPages: number | null;
  createdAt: string;
  editions: BookEdition[];
  compositions: BookComposition[];
}

export default function AdminBookDetailPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const bookId = params?.id as string;

  const [book, setBook] = React.useState<Book | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [updating, setUpdating] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Edit fields
  const [titleMarathi, setTitleMarathi] = React.useState('');
  const [titleEnglish, setTitleEnglish] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [isPublic, setIsPublic] = React.useState(false);
  const [basePrice, setBasePrice] = React.useState('');
  const [royaltyPercent, setRoyaltyPercent] = React.useState('');

  React.useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [sessionStatus, router]);

  const fetchBook = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/books/${bookId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch book details');
      }

      setBook(data.book);
      setTitleMarathi(data.book.titleMarathi || '');
      setTitleEnglish(data.book.titleEnglish || '');
      setDescription(data.book.description || '');
      setStatus(data.book.status || 'DRAFT');
      setIsPublic(data.book.isPublic || false);
      setBasePrice(data.book.basePrice ? String(data.book.basePrice) : '');
      setRoyaltyPercent(data.book.royaltyPercent ? String(data.book.royaltyPercent) : '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  React.useEffect(() => {
    if (sessionStatus === 'authenticated' && bookId) {
      const role = (session?.user as any)?.role;
      if (role !== 'ADMIN') {
        router.push('/');
      } else {
        fetchBook();
      }
    }
  }, [sessionStatus, session, bookId, router, fetchBook]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdating(true);
      setError(null);
      setSuccess(false);

      const res = await fetch(`/api/admin/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleMarathi,
          titleEnglish: titleEnglish || null,
          description: description || null,
          status,
          isPublic,
          basePrice: basePrice ? Number(basePrice) : null,
          royaltyPercent: royaltyPercent ? Number(royaltyPercent) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update book');
      }

      setSuccess(true);
      setBook(data.book);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('तुम्हाला हे पुस्तक कायमचे काढून टाकायचे आहे का?')) return;
    try {
      setDeleting(true);
      setError(null);

      const res = await fetch(`/api/admin/books/${bookId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete book');
      }

      router.push('/admin/books');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setDeleting(false);
    }
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-saffron" />
      </div>
    );
  }

  if (error && !book) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-850">त्रुटी आढळली</h2>
          <p className="text-gray-600 text-sm mt-1">{error}</p>
          <Link href="/admin/books" className="text-saffron hover:underline text-sm mt-4 inline-block">
            पुस्तके व्यवस्थापनावर परत जा
          </Link>
        </div>
      </div>
    );
  }

  if (!book) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-maroon-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/admin/books" className="text-sand-200 hover:text-white flex items-center gap-1 text-sm mb-3">
            <ArrowLeft className="w-4 h-4" /> पुस्तके वर जा
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-saffron" /> Book Publication Details
          </h1>
          <p className="text-sand-200 text-xs font-mono mt-1">Slug: {book.slug}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Metadata form */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-maroon-800 border-b pb-3 mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-saffron" /> पुस्तक तपशील संपादित करा
            </h2>

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-xs mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" /> पुस्तक यशस्वीरित्या अद्ययावत केले!
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4 text-sm text-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">शीर्षक (मराठी) *</label>
                  <input
                    type="text"
                    required
                    value={titleMarathi}
                    onChange={(e) => setTitleMarathi(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 focus:border-maroon-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">शीर्षक (इंग्रजी)</label>
                  <input
                    type="text"
                    value={titleEnglish}
                    onChange={(e) => setTitleEnglish(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 focus:border-maroon-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">वर्णन (Description)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2.5 focus:border-maroon-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">स्थिती (Status)</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 focus:border-maroon-600 focus:outline-none"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="GENERATING">GENERATING</option>
                    <option value="READY">READY</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-gray-400" /> मूळ किंमत (Base Price ₹)
                  </label>
                  <input
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="उदा. 299"
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 focus:border-maroon-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Royalty Percentage (%)</label>
                  <input
                    type="number"
                    value={royaltyPercent}
                    onChange={(e) => setRoyaltyPercent(e.target.value)}
                    placeholder="उदा. 10"
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 focus:border-maroon-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded border-gray-300 text-maroon-600 focus:ring-maroon-500 h-4 w-4"
                />
                <label htmlFor="isPublic" className="text-xs font-semibold text-gray-600 flex items-center gap-1 cursor-pointer">
                  <Globe className="w-3.5 h-3.5 text-gray-400" /> सार्वजनिकरीत्या उपलब्ध करा (Publish online to explore)
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={updating}
                  className="bg-maroon-800 hover:bg-maroon-950 text-white rounded-lg px-6 py-2.5 font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> अद्ययावत करत आहे...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> जतन करा (Save)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="border border-red-200 hover:bg-red-50 text-red-650 rounded-lg px-4 py-2.5 font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 ml-auto"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} पुस्तक हटवा
                </button>
              </div>
            </form>
          </div>

          {/* Editions List */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-maroon-800 border-b pb-3 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-saffron" /> पुस्तकाच्या आवृत्त्या (Editions)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b text-gray-500 font-medium">
                  <tr>
                    <th className="p-3">Format</th>
                    <th className="p-3">किंमत (Price)</th>
                    <th className="p-3">मुद्रण खर्च (Print Cost)</th>
                    <th className="p-3 text-center">पाने (Pages)</th>
                    <th className="p-3">फाइल (File)</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-700">
                  {book.editions.map((ed) => (
                    <tr key={ed.id} className="hover:bg-gray-50">
                      <td className="p-3 font-semibold text-xs text-gray-900">{ed.format}</td>
                      <td className="p-3">₹{ed.price ? Number(ed.price).toLocaleString('en-IN') : '—'}</td>
                      <td className="p-3">{ed.printCost ? `₹${Number(ed.printCost).toLocaleString('en-IN')}` : '—'}</td>
                      <td className="p-3 text-center">{ed.pageCount || '—'}</td>
                      <td className="p-3 max-w-[200px] truncate font-mono text-xs text-gray-400">
                        {ed.fileUrl ? (
                          <a href={ed.fileUrl} target="_blank" rel="noopener noreferrer" className="text-saffron hover:underline">
                            फाइल पहा
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                  {book.editions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-gray-400">Editions list is empty</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Info Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-maroon-800 mb-4">📖 समाविष्ट रचना (Compositions)</h2>
            <div className="space-y-3 font-marathi text-sm max-h-[400px] overflow-y-auto">
              {book.compositions.map((comp) => (
                <div key={comp.id} className="flex gap-3 items-start py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs font-mono text-gray-400 w-5 flex-shrink-0">#{comp.sortOrder}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{comp.composition.titleMarathi}</p>
                    <p className="text-xs text-gray-400 font-sans mt-0.5">{comp.composition.type} · {comp.sectionName || 'अनामिक'}</p>
                  </div>
                </div>
              ))}
              {book.compositions.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">No compositions included</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 text-xs text-gray-500 space-y-2 border">
            <p><strong>निर्मिती दिनांक:</strong> {new Date(book.createdAt).toLocaleString('mr-IN')}</p>
            <p><strong>Curation Type:</strong> {book.curationType}</p>
            <p><strong>Book Type:</strong> {book.bookType}</p>
            <p><strong>एकूण रचना:</strong> {book.totalCompositions || 0}</p>
            <p><strong>एकूण पाने:</strong> {book.totalPages || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

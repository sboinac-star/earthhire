"use client";

import { useState, useEffect, FormEvent } from "react";
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, orderBy, query, Timestamp, updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type OrderStatus = "pending" | "confirmed" | "completed" | "cancelled";

interface JCBOrder {
  id: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  duration: string;
  address: string;
  notes: string;
  status: OrderStatus;
  createdAt: Timestamp;
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const EMPTY_FORM = { name: "", phone: "", date: "", time: "", duration: "", address: "", notes: "" };

export default function Home() {
  const [orders, setOrders] = useState<JCBOrder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  async function fetchOrders() {
    setLoading(true);
    try {
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<JCBOrder, "id">) })));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchOrders(); }, []);

  function openNew() { setEditId(null); setForm(EMPTY_FORM); setShowForm(true); }

  function openEdit(order: JCBOrder) {
    setEditId(order.id);
    setForm({ name: order.name, phone: order.phone, date: order.date, time: order.time, duration: order.duration, address: order.address, notes: order.notes });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name || !form.date || !form.address) return;
    setSaving(true);
    try {
      if (editId) {
        await updateDoc(doc(db, "orders", editId), { ...form });
      } else {
        await addDoc(collection(db, "orders"), { ...form, status: "pending", createdAt: Timestamp.now() });
      }
      setShowForm(false); setForm(EMPTY_FORM); setEditId(null);
      await fetchOrders();
    } finally { setSaving(false); }
  }

  async function updateStatus(id: string, status: OrderStatus) {
    await updateDoc(doc(db, "orders", id), { status });
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  async function deleteOrder(id: string) {
    if (!confirm("Delete this order?")) return;
    await deleteDoc(doc(db, "orders", id));
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    completed: orders.filter((o) => o.status === "completed").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-yellow-400 px-4 py-4 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🏗️ EarthHire</h1>
            <p className="text-sm text-gray-700">JCB Booking Dashboard</p>
          </div>
          <button onClick={openNew} className="bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-700 transition-all">
            + New Order
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-5">
        <div className="flex gap-2 flex-wrap">
          {(["all", "pending", "confirmed", "completed", "cancelled"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all capitalize ${filter === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
              {s} ({counts[s]})
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-bold text-lg">{editId ? "Edit Order" : "New Booking"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">×</button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name <span className="text-red-500">*</span></label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Ramesh Kumar" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="98765 43210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input type="time" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="e.g. 4 hours, 1 day, 2 days" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site Address <span className="text-red-500">*</span></label>
                <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" rows={2} placeholder="Village, Taluk, District..." value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" rows={2} placeholder="Work type, special requirements..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg py-2.5 text-sm transition disabled:opacity-60">
                  {saving ? "Saving..." : editId ? "Update" : "Save Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-3">
        {loading ? (
          <div className="text-center py-20 text-gray-400"><p className="text-3xl mb-2">⏳</p><p>Loading orders...</p></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium text-gray-500">No orders found</p>
            <p className="text-sm mt-1">{filter === "all" ? 'Click "+ New Order" to log a booking' : `No ${filter} orders`}</p>
          </div>
        ) : (
          filtered.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-semibold text-gray-900">{order.name}</h3>
                    {order.phone && <a href={`tel:${order.phone}`} className="text-sm text-blue-600 hover:underline">📞 {order.phone}</a>}
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${STATUS_COLORS[order.status as OrderStatus]}`}>{order.status}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                    {order.date && <span>📅 {order.date}{order.time && ` · ${order.time}`}</span>}
                    {order.duration && <span>⏱ {order.duration}</span>}
                    {order.address && <span className="sm:col-span-2">📍 {order.address}</span>}
                    {order.notes && <span className="sm:col-span-2 text-gray-400 italic">💬 {order.notes}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0 items-end">
                  <select value={order.status} onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white cursor-pointer">
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(order)} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition font-medium">Edit</button>
                    <button onClick={() => deleteOrder(order.id)} className="text-xs border border-red-200 text-red-500 rounded-lg px-3 py-1.5 hover:bg-red-50 transition font-medium">Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
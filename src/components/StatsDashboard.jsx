import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

const LABELS = ['א', 'ב', 'ג', 'ד'];

const successColor = (rate) =>
  rate >= 70 ? '#43a047' : rate >= 40 ? '#f59e0b' : '#ef4444';

function MetricCard({ icon, label, value, sub, color }) {
  return (
    <div style={{
      flex: 1, minWidth: 110, background: 'white',
      border: '1.5px solid #e8f5e9', borderRadius: 16, padding: '14px 18px',
    }}>
      <div style={{ fontSize: '1.55rem', fontWeight: 900, color: color || '#43a047' }}>{value}</div>
      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1a4228', marginTop: 2 }}>{icon} {label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: '#888', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SuccessBar({ rate }) {
  return (
    <div style={{ background: '#f0f0f0', borderRadius: 99, height: 7, overflow: 'hidden', marginTop: 8 }}>
      <div style={{ width: `${rate}%`, height: '100%', background: successColor(rate), borderRadius: 99, transition: 'width 0.5s' }} />
    </div>
  );
}

export default function StatsDashboard() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState("all");

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);
    const [statsSnap, questionsSnap] = await Promise.all([
      getDocs(collection(db, "questionStats")),
      getDocs(collection(db, "curriculumQuestions")),
    ]);

    const questionMap = {};
    questionsSnap.docs.forEach(d => { questionMap[d.id] = d.data(); });

    const data = statsSnap.docs
      .map(d => {
        const s = d.data();
        const q = questionMap[d.id];
        if (!q) return null;
        const totalAttempts = s.totalAttempts || 0;
        const correctCount = s.correctCount || 0;
        if (totalAttempts === 0) return null;
        const successRate = Math.round((correctCount / totalAttempts) * 100);
        const wo = s.wrongByOption || {};
        const wrongCounts = [0, 1, 2, 3].map(i => wo[String(i)] || 0);
        const totalWrong = wrongCounts.reduce((a, b) => a + b, 0);
        const mostCommonWrongIdx = totalWrong > 0
          ? wrongCounts.reduce((mi, v, i, arr) => v > arr[mi] ? i : mi, 0)
          : null;
        return {
          id: d.id,
          text: q.text || '',
          options: q.options || [],
          correctIndex: q.correctIndex ?? -1,
          levelId: Number(s.levelId || q.levelId || 0),
          totalAttempts,
          correctCount,
          successRate,
          wrongCounts,
          mostCommonWrongIdx,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.successRate - b.successRate);

    setStats(data);
    setLoading(false);
  };

  const levels = [...new Set(stats.map(q => q.levelId))].filter(Boolean).sort((a, b) => a - b);
  const filtered = filterLevel === "all" ? stats : stats.filter(q => q.levelId === Number(filterLevel));

  const levelChartData = levels.map(lid => {
    const qs = stats.filter(q => q.levelId === lid);
    const avg = qs.length ? Math.round(qs.reduce((s, q) => s + q.successRate, 0) / qs.length) : 0;
    return { name: `${lid}`, avgSuccess: avg, count: qs.length };
  });

  const totalAttempts = stats.reduce((s, q) => s + q.totalAttempts, 0);
  const avgSuccess = stats.length
    ? Math.round(stats.reduce((s, q) => s + q.successRate, 0) / stats.length)
    : 0;
  const problematic = stats.filter(q => q.successRate < 50).length;

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
      <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
      <p style={{ margin: 0 }}>טוען נתונים...</p>
    </div>
  );

  if (stats.length === 0) return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <div style={{ fontSize: '3rem', marginBottom: 8 }}>📭</div>
      <h3 style={{ color: '#333', margin: '0 0 8px' }}>אין נתונים עדיין</h3>
      <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>נתונים יצטברו אוטומטית כשמשתמשים ישחקו</p>
    </div>
  );

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <MetricCard icon="📊" label="שאלות עם נתונים" value={stats.length} color="#43a047" />
        <MetricCard icon="🎯" label='סה"כ ניסיונות' value={totalAttempts.toLocaleString()} color="#1976d2" />
        <MetricCard icon="✅" label="הצלחה ממוצעת" value={`${avgSuccess}%`} color={successColor(avgSuccess)} />
        <MetricCard icon="⚠️" label="שאלות קשות" value={problematic} sub="הצלחה <50%" color="#ef4444" />
      </div>

      {/* Level filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {['all', ...levels].map(l => (
          <button key={l} onClick={() => setFilterLevel(String(l))} style={{
            padding: '5px 14px', borderRadius: 99, fontSize: '0.8rem', fontWeight: 700,
            border: '1.5px solid', cursor: 'pointer',
            borderColor: filterLevel === String(l) ? '#43a047' : '#e0e0e0',
            background: filterLevel === String(l) ? '#e8f5e9' : 'white',
            color: filterLevel === String(l) ? '#43a047' : '#666',
          }}>
            {l === 'all' ? 'כל הרמות' : `רמה ${l}`}
          </button>
        ))}
      </div>

      {/* Level difficulty bar chart */}
      {filterLevel === 'all' && levelChartData.length > 1 && (
        <div style={{ background: 'white', borderRadius: 14, padding: '16px 20px', marginBottom: 20, border: '1.5px solid #e8f5e9' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', color: '#1a4228' }}>📈 אחוז הצלחה ממוצע לפי רמה</h3>
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={levelChartData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="name" tickFormatter={v => `L${v}`} tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val) => [`${val}%`, 'הצלחה']}
                  labelFormatter={l => `רמה ${l}`}
                />
                <Bar dataKey="avgSuccess" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {levelChartData.map((e, i) => (
                    <Cell key={i} fill={successColor(e.avgSuccess)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Questions list */}
      <div style={{ background: 'white', borderRadius: 14, padding: '16px 20px', border: '1.5px solid #e8f5e9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#1a4228' }}>
            ⚠️ שאלות לפי קושי
            <span style={{ fontWeight: 400, color: '#888', fontSize: '0.78rem', marginRight: 6 }}>(מהקשה לקל)</span>
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#888' }}>{filtered.length} שאלות</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(q => (
            <div key={q.id} style={{
              borderRadius: 10, padding: '12px 14px',
              background: q.successRate < 50 ? '#fff5f5' : q.successRate < 70 ? '#fffbeb' : '#f0fdf4',
              border: `1.5px solid ${q.successRate < 50 ? '#fca5a5' : q.successRate < 70 ? '#fde68a' : '#bbf7d0'}`,
              borderRight: `4px solid ${successColor(q.successRate)}`,
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ flex: 1, fontSize: '0.85rem', color: '#333', lineHeight: 1.5 }}>
                  <span style={{ background: '#eeeeee', borderRadius: 4, padding: '1px 6px', fontSize: '0.7rem', color: '#666', marginLeft: 6 }}>
                    רמה {q.levelId}
                  </span>
                  {q.text.length > 90 ? q.text.slice(0, 90) + '…' : q.text}
                </div>
                <div style={{ flexShrink: 0, textAlign: 'center' }}>
                  <div style={{ fontWeight: 900, fontSize: '1.1rem', color: successColor(q.successRate) }}>
                    {q.successRate}%
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#888' }}>{q.totalAttempts} ניסיונות</div>
                </div>
              </div>

              <SuccessBar rate={q.successRate} />

              {q.mostCommonWrongIdx !== null && (
                <div style={{ marginTop: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {q.wrongCounts.map((count, i) => {
                    if (count === 0 || i === q.correctIndex) return null;
                    return (
                      <span key={i} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        padding: '2px 8px', borderRadius: 6, fontSize: '0.73rem',
                        background: i === q.mostCommonWrongIdx ? '#fee2e2' : '#f5f5f5',
                        border: `1px solid ${i === q.mostCommonWrongIdx ? '#fca5a5' : '#e0e0e0'}`,
                        color: i === q.mostCommonWrongIdx ? '#dc2626' : '#555',
                      }}>
                        <strong>{LABELS[i]}</strong> — {count}✗
                        {i === q.mostCommonWrongIdx && <span style={{ marginRight: 3 }}>⚠</span>}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import {
  Database, Calendar, Shield, Brain, MapPin, Bell, TrendingUp,
  Monitor, Server, Cpu, Cloud, BookOpen, GraduationCap,
  Building2, Users, Code2, ArrowLeft,
} from 'lucide-react';

const COLORS = {
  bg: '#0a0c0f', card: '#13161c', border: '#2a2f3a',
  text: '#fff', muted: '#8a92a3', accent: '#1a73e8',
};

const cardStyle = {
  background: COLORS.card,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 12,
  padding: 20,
};

const Section = ({ icon: Icon, title, children }) => (
  <div style={{ marginBottom: 32 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <Icon size={20} color={COLORS.accent} strokeWidth={2} />
      <h2 style={{ color: COLORS.text, fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
        {title}
      </h2>
    </div>
    {children}
  </div>
);

const Badge = ({ text }) => (
  <span style={{
    display: 'inline-block', padding: '4px 12px', background: 'rgba(26,115,232,0.12)',
    border: '1px solid rgba(26,115,232,0.3)', borderRadius: 999,
    color: COLORS.accent, fontSize: '0.78rem', fontWeight: 500,
    margin: '0 6px 6px 0',
  }}>{text}</span>
);

const FeatureCard = ({ icon: Icon, title, desc, num }) => (
  <div style={{ ...cardStyle, padding: 18 }}>
    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(26,115,232,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
      <Icon size={22} color={COLORS.accent} strokeWidth={2} />
    </div>
    <div style={{ color: COLORS.text, fontSize: '0.95rem', fontWeight: 700, marginBottom: 6 }}>
      {num}. {title}
    </div>
    <div style={{ color: COLORS.muted, fontSize: '0.82rem', lineHeight: 1.5 }}>
      {desc}
    </div>
  </div>
);

const TechCard = ({ icon: Icon, title, items }) => (
  <div style={cardStyle}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <Icon size={16} color={COLORS.accent} strokeWidth={2} />
      <span style={{ color: COLORS.accent, fontWeight: 600, fontSize: '0.92rem' }}>
        {title}
      </span>
    </div>
    <div>{items.map(it => <Badge key={it} text={it} />)}</div>
  </div>
);

const InfoRow = ({ icon: Icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(26,115,232,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={16} color={COLORS.accent} strokeWidth={2} />
    </div>
    <div>
      <div style={{ color: COLORS.accent, fontSize: '0.78rem', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ color: COLORS.text, fontSize: '0.88rem' }}>{value}</div>
    </div>
  </div>
);

export default function About() {
  return (
    <div style={{ minHeight: '100vh', height: '100vh', overflowY: 'auto',
      background: COLORS.bg, color: COLORS.text,
      fontFamily: 'Arial, sans-serif', padding: '40px 20px',
      boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Geri dön */}
        <a href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: COLORS.accent, textDecoration: 'none', fontSize: '0.85rem',
          marginBottom: 20,
        }}>
          <ArrowLeft size={14} strokeWidth={2} /> Ana sayfaya dön
        </a>

        {/* Hero */}
        <div style={{ ...cardStyle, padding: 32, marginBottom: 32 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, marginBottom: 6 }}>
            NYC Trafik Risk Analizi
          </h1>
          <div style={{ color: COLORS.accent, fontSize: '0.95rem', fontWeight: 600, marginBottom: 16 }}>
            Makine Öğrenmesi Destekli Karar Destek Sistemi
          </div>
          <p style={{ color: COLORS.muted, fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>
            New York City'deki trafik kaza verilerini kullanarak rota bazlı risk analizi yapan,
            vatandaş bildirimi alan, yöneticilere dashboard sunan tam yığın bir karar destek sistemi.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12, marginTop: 24 }}>
            <div style={{ background: 'rgba(26,115,232,0.08)', borderRadius: 8, padding: 14 }}>
              <Database size={16} color={COLORS.accent} style={{ marginBottom: 6 }} strokeWidth={2} />
              <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>368.254</div>
              <div style={{ color: COLORS.muted, fontSize: '0.75rem' }}>Kaza Kaydı</div>
            </div>
            <div style={{ background: 'rgba(26,115,232,0.08)', borderRadius: 8, padding: 14 }}>
              <Calendar size={16} color={COLORS.accent} style={{ marginBottom: 6 }} strokeWidth={2} />
              <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>01.01.2022 – 31.03.2026</div>
              <div style={{ color: COLORS.muted, fontSize: '0.75rem' }}>Veri Aralığı</div>
            </div>
            <div style={{ background: 'rgba(26,115,232,0.08)', borderRadius: 8, padding: 14 }}>
              <Shield size={16} color={COLORS.accent} style={{ marginBottom: 6 }} strokeWidth={2} />
              <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>Veri Odaklı</div>
              <div style={{ color: COLORS.muted, fontSize: '0.75rem' }}>Güvenli Yollar</div>
            </div>
          </div>
        </div>

        {/* Ana Özellikler */}
        <Section icon={Brain} title="Ana Özellikler">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <FeatureCard num="1" icon={Brain} title="ML Tabanlı Risk Skoru"
              desc="368.254 kaza verisi, PCA ağırlıklı Danger Score ile hesaplanan nesnel risk skoru. Random Forest modeli ile F1=0.755 performans." />
            <FeatureCard num="2" icon={MapPin} title="Rota Risk Analizi"
              desc="Anlık hava, trafik ve zamansal çarpanlar ile dinamik rota risk skorlaması yapılarak en güvenli rotalar önerilir." />
            <FeatureCard num="3" icon={Bell} title="Vatandaş Bildirim Sistemi"
              desc="VGI yaklaşımı ile kullanıcıların yolda karşılaştığı tehlike, kaza, yol çalışması gibi bildirimleri sisteme anlık olarak iletilir." />
            <FeatureCard num="4" icon={TrendingUp} title="90 Günlük Tahmin"
              desc="Prophet algoritması ile gerçek hava verisiyle desteklenmiş 90 günlük trafik kazası tahminleri üretilir." />
          </div>
        </Section>

        {/* Teknolojiler */}
        <Section icon={Code2} title="Teknolojiler">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <TechCard icon={Monitor} title="Frontend" items={['React', 'MapLibre', 'Recharts']} />
            <TechCard icon={Server} title="Backend" items={['Spring Boot', 'Spring Security', 'JWT']} />
            <TechCard icon={Cpu} title="ML" items={['FastAPI', 'scikit-learn', 'Prophet', 'pandas']} />
            <TechCard icon={Database} title="Veritabanı" items={['PostgreSQL']} />
            <TechCard icon={Cloud} title="API" items={['Open-Meteo', 'TomTom', 'OSRM', 'Nominatim']} />
          </div>
        </Section>

        {/* Veri kaynağı + ekip + akademik */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 32 }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Database size={18} color={COLORS.accent} strokeWidth={2} />
              <span style={{ fontWeight: 700, fontSize: '1.02rem' }}>Veri Kaynağı</span>
            </div>
            <div style={{ color: COLORS.accent, fontWeight: 600, marginBottom: 4 }}>NYC Open Data</div>
            <div style={{ color: COLORS.muted, fontSize: '0.82rem', marginBottom: 10 }}>
              (NYPD Motor Vehicle Collisions)
            </div>
            <div style={{ color: COLORS.muted, fontSize: '0.82rem', lineHeight: 1.6 }}>
              01.01.2022 - 31.03.2026 arası toplam 368.254 kayıt üzerinden analiz edilmiştir.
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Users size={18} color={COLORS.accent} strokeWidth={2} />
              <span style={{ fontWeight: 700, fontSize: '1.02rem' }}>Proje Ekibi</span>
            </div>
            <InfoRow icon={Users}         label="Geliştirici" value="Çağan Hatun (22YÖBİ1041)" />
            <InfoRow icon={GraduationCap} label="Danışman"    value="Dr. Öğr. Üyesi Gülsüm Çiğdem Çavdaroğlu" />
            <InfoRow icon={Building2}     label="Kurum"       value="Işık Üniversitesi - YBS Bölümü" />
            <InfoRow icon={Calendar}      label="Tarih"       value="Haziran 2026" />
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <BookOpen size={18} color={COLORS.accent} strokeWidth={2} />
              <span style={{ fontWeight: 700, fontSize: '1.02rem' }}>Akademik Temeller</span>
            </div>
            {[
              ['Hébert (2019)',       'PCA ağırlıklı Danger Score'],
              ['Goodchild (2007)',    'Volunteered Geographic Information'],
              ['Chawla vd. (2002)',   'SMOTE'],
              ['Santos vd. (2021)',   'Random Forest kaza tahmini'],
              ['Shimrat (1962)',      'Point-in-Polygon algoritması'],
            ].map(([ref, desc]) => (
              <div key={ref} style={{ marginBottom: 10, fontSize: '0.82rem' }}>
                <div style={{ color: COLORS.accent, fontWeight: 600 }}>{ref}</div>
                <div style={{ color: COLORS.muted }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Alt mesaj */}
        <div style={{ ...cardStyle, padding: 24, textAlign: 'center' }}>
          <Shield size={28} color={COLORS.accent} strokeWidth={2} style={{ marginBottom: 10 }} />
          <p style={{ color: COLORS.muted, fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
            Veri bilimi, coğrafi analiz ve makine öğrenmesini birleştirerek
            <br/>daha güvenli ve yaşanabilir şehirler için çalışıyoruz.
          </p>
        </div>

      </div>
    </div>
  );
}

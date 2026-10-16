import type { ReactNode } from 'react';
import { ConnectionBadge } from '../shell/connection-badge';
import { ThemeButton } from '../shell/theme-button';
import { Spacer, TopBar } from '../shell/top-bar';

/** Sơ đồ UML mẫu vẽ bằng SVG cho panel minh hoạ màn đăng nhập (màu theo token để hợp cả sáng/tối). */
function Illustration() {
  const box = { fill: 'var(--panel)', stroke: 'var(--accent)', strokeWidth: 1.5 };
  const txt = { fill: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-ui)' };
  const mut = { fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-ui)' };
  return (
    <svg viewBox="0 0 460 380" className="w-full max-w-[460px]" role="img" aria-label="Sơ đồ UML minh hoạ">
      <defs>
        <marker id="ill-open" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="10" markerHeight="10" orient="auto">
          <path d="M1 1 11 6 1 11" fill="none" stroke="var(--muted)" strokeWidth="1.4" />
        </marker>
      </defs>
      {/* actor */}
      <g stroke="var(--text)" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <circle cx="46" cy="70" r="11" />
        <path d="M46 81v28M28 92h36M46 109l-14 22M46 109l14 22" />
      </g>
      <text x="46" y="152" textAnchor="middle" {...txt}>
        Sinh viên
      </text>
      {/* use cases */}
      <ellipse cx="190" cy="62" rx="76" ry="26" {...box} />
      <text x="190" y="66" textAnchor="middle" {...txt}>
        Check-in xe
      </text>
      <ellipse cx="190" cy="148" rx="76" ry="26" {...box} />
      <text x="190" y="152" textAnchor="middle" {...txt}>
        Nạp ví
      </text>
      <path d="M62 88 L114 66 M62 104 L114 142" stroke="var(--text)" strokeWidth="1.3" />
      <ellipse cx="392" cy="62" rx="62" ry="24" {...box} />
      <text x="392" y="66" textAnchor="middle" {...txt}>
        Quét RFID
      </text>
      <path d="M266 62 H328" stroke="var(--muted)" strokeWidth="1.3" strokeDasharray="5 4" markerEnd="url(#ill-open)" />
      <text x="297" y="50" textAnchor="middle" {...mut}>
        «include»
      </text>
      {/* class diagram */}
      <g>
        <rect x="40" y="220" width="160" height="128" rx="4" {...box} />
        <path d="M40 246 H200 M40 304 H200" stroke="var(--accent)" strokeWidth="1.2" />
        <text x="120" y="238" textAnchor="middle" {...txt} fontWeight="600">
          PhienGuiXe
        </text>
        <text x="50" y="266" {...mut}>
          - id : UUID
        </text>
        <text x="50" y="282" {...mut}>
          - gioVao : DateTime
        </text>
        <text x="50" y="298" {...mut}>
          - phi : Decimal
        </text>
        <text x="50" y="324" {...mut}>
          + ketThuc() : void
        </text>
      </g>
      <g>
        <rect x="290" y="240" width="130" height="88" rx="4" {...box} />
        <path d="M290 266 H420" stroke="var(--accent)" strokeWidth="1.2" />
        <text x="355" y="258" textAnchor="middle" {...txt} fontWeight="600">
          Xe
        </text>
        <text x="300" y="286" {...mut}>
          - bienSo : String
        </text>
        <text x="300" y="302" {...mut}>
          - loai : LoaiXe
        </text>
      </g>
      <path d="M200 284 H290" stroke="var(--text)" strokeWidth="1.3" />
      <path d="M200 284 l10 -6 l10 6 l-10 6z" fill="var(--text)" />
      <text x="232" y="276" {...mut}>
        1
      </text>
      <text x="276" y="276" {...mut}>
        *
      </text>
    </svg>
  );
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <TopBar>
        <Spacer />
        <ConnectionBadge />
        <ThemeButton />
      </TopBar>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(420px,1fr)_1.1fr]">
        <main className="scroll grid place-items-center bg-panel px-6 py-10">
          <div className="w-full max-w-[380px]">{children}</div>
        </main>
        <aside
          className="hidden min-h-0 flex-col items-center justify-center gap-8 border-l border-line px-10 lg:flex"
          style={{ background: 'var(--accent-soft)' }}
        >
          <Illustration />
          <div className="max-w-[420px] text-center">
            <p className="text-[17px] font-semibold text-ink">Mô hình hoá cùng nhau, ngay trên máy của bạn</p>
            <p className="mt-2 text-muted" style={{ lineHeight: 1.6 }}>
              Use Case, đặc tả, Activity, Sequence, Class, ERD, kiến trúc và Gantt trong một project. Mọi thay đổi đồng
              bộ tức thì tới cả nhóm.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

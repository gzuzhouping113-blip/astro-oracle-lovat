import { ImageResponse } from 'next/og';
import { SITE_DESCRIPTION, SITE_DOMAIN, SITE_NAME, SITE_SUBTITLE } from '@/lib/site-config';

export const alt = `${SITE_NAME} app preview`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          color: '#F8F4E8',
          background:
            'radial-gradient(circle at 28% 18%, #5830B8 0, transparent 34%), radial-gradient(circle at 78% 22%, #0F8B8D 0, transparent 30%), linear-gradient(135deg, #090B1A 0%, #18132C 48%, #111C28 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            fontSize: 28,
            opacity: 0.82,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 999,
              background: '#F4C430',
            }}
          />
          {SITE_SUBTITLE}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>
            {SITE_NAME}
          </div>
          <div style={{ maxWidth: 820, fontSize: 34, lineHeight: 1.38 }}>
            {SITE_DESCRIPTION}
          </div>
        </div>

        <div style={{ fontSize: 26, opacity: 0.72 }}>
          {SITE_DOMAIN}
        </div>
      </div>
    ),
    size,
  );
}

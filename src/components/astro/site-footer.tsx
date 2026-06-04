import { ICP_BEIAN, POLICE_BEIAN, POLICE_BEIAN_URL, SITE_DOMAIN, SITE_NAME } from "@/lib/site-config";

export function SiteFooter({ withBottomNav = false }: { withBottomNav?: boolean }) {
  return (
    <footer className={`px-4 pt-2 text-center text-[10px] leading-relaxed text-white/25 ${withBottomNav ? "pb-24 lg:pb-6" : "pb-6"}`}>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span>
          © {new Date().getFullYear()} {SITE_NAME} · {SITE_DOMAIN}
        </span>
        {ICP_BEIAN ? (
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-white/45"
          >
            {ICP_BEIAN}
          </a>
        ) : null}
        {POLICE_BEIAN ? (
          <a
            href={POLICE_BEIAN_URL || "https://beian.mps.gov.cn/"}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-white/45"
          >
            {POLICE_BEIAN}
          </a>
        ) : null}
      </div>
    </footer>
  );
}

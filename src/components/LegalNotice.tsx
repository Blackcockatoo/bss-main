import { cn } from "@/lib/utils";
import { LEGAL_NOTICE_TEXT, getLegalNoticeYear } from "@/lib/legalNotice";

type LegalNoticeProps = {
  className?: string;
};

export function LegalNotice({ className }: LegalNoticeProps) {
  return (
    <p className={cn("text-xs text-slate-400/90", className)}>
      {`© ${getLegalNoticeYear()} Blue Snake Studios. ${LEGAL_NOTICE_TEXT}`}
    </p>
  );
}

export default LegalNotice;

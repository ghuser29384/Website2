import { MpgfConsole } from "@/components/mpgf/mpgf-console";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";

export default async function MpgfNewPoolPage() {
  const viewer = await getViewer();

  return (
    <MpgfPageFrame
      description="Draft a candidate pool proposal for review without creating live allocation or payout effects."
      title="Propose a moral public good."
      viewerPresent={Boolean(viewer)}
    >
      <section className="section section-white">
        <MpgfConsole initialTab="pools" />
      </section>
    </MpgfPageFrame>
  );
}

const CONFIRMATION_GRID = `
  #main-content > section:has(> footer) {
    grid-template-rows: 76px auto minmax(0, 1fr) auto;
  }

  @media (max-width: 840px) {
    #main-content > section:has(> footer) {
      grid-template-rows: 68px auto auto auto;
    }
  }
`;

export default function TradeAgreementLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{CONFIRMATION_GRID}</style>
      {children}
    </>
  );
}

interface CreateInterfaceFrameProps {
  src?: string;
}

export function CreateInterfaceFrame({ src = "/moral-trade-create/index.html" }: CreateInterfaceFrameProps) {
  return (
    <main id="main-content" style={{ minHeight: "100vh" }} tabIndex={-1}>
      <iframe
        allow="clipboard-write"
        aria-label="Moral Trade Create"
        data-create-interface-frame="true"
        src={src}
        style={{
          border: 0,
          display: "block",
          height: "100vh",
          minHeight: 720,
          width: "100%",
        }}
        title="Moral Trade Create"
      />
    </main>
  );
}

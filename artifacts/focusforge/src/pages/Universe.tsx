export default function Universe() {
  return (
    <div className="w-full h-screen">
      <iframe
        src="universe-embed/index.html"
        title="Embedded Universe Project"
        className="w-full h-full border-0"
        allow="fullscreen; accelerometer; gyroscope"
        sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock"
      />
    </div>
  );
}
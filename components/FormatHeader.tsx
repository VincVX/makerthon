export function FormatHeader() {
  return (
    <header className="space-y-4">
      <p className="text-xs uppercase tracking-[0.3em] text-zinc-600">
        makerthon prototype
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl lg:text-6xl font-[var(--font-display)]">
        Verpackungs-Template Generator
      </h1>
      <p className="max-w-xl text-base leading-7 text-zinc-700">
        Wähle einen Produkt-Typ, gib die wichtigsten Masse ein, und erhalte sofort
        eine technische Zeichnung der Druckflaeche. Fuer den Start ist ein
        Deckelbox-Typ hinterlegt.
      </p>
    </header>
  );
}

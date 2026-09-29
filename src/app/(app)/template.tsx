// A diferencia del layout, el template se vuelve a montar en cada navegación:
// ahí se aplica la transición de entrada de cada pantalla.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 animate-rise flex-col gap-6">{children}</div>;
}

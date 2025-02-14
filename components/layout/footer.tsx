export function Footer() {
  return (
    <footer className="sticky bottom-0 z-50 h-10 w-full border-t border-border/40 bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex flex-col items-center gap-4 md:items-start">
            <p className="text-sm text-muted-foreground">
              © 2025 OTB SPA - ALL RIGHTS RESERVED
            </p>
          </div>

          <div className="flex items-center gap-4"></div>
        </div>
      </div>
    </footer>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useGetRewriterStatus,
  getGetRewriterStatusQueryKey,
  useRewriteText,
  type RewriteResult,
  type RewriteInputProvider,
} from '@workspace/api-client-react';
import { Copy, Download, RotateCcw, Check, ArrowRight, BookOpen, ExternalLink, AlertTriangle } from 'lucide-react';

const STORE_KEY = 'kuczynski-rewriter:v1';
const MAX = 30000;

type Saved = { input: string; provider: string; result: RewriteResult | null };

function load(): Saved {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { input: typeof p.input === 'string' ? p.input : '', provider: typeof p.provider === 'string' ? p.provider : '', result: p.result ?? null };
    }
  } catch {
    /* storage unavailable */
  }
  return { input: '', provider: '', result: null };
}

function errorText(err: unknown): string {
  if (!err) return 'Unknown error.';
  const e = err as { data?: unknown; status?: number; message?: string };
  const d = e.data as { error?: unknown; message?: unknown } | string | undefined;
  if (d && typeof d === 'object' && typeof d.error === 'string') return d.error;
  if (d && typeof d === 'object' && typeof d.message === 'string') return d.message;
  if (typeof d === 'string' && d.trim()) return d;
  return (e.status ? `HTTP ${e.status}: ` : '') + (e.message || 'Request failed.');
}

function Flag({ label, on, testid }: { label: string; on: boolean; testid: string }) {
  return (
    <span data-testid={testid} className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
      <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-accent' : 'bg-destructive'}`} />
      <span className={on ? 'text-foreground/80' : 'text-destructive'}>{label} {on ? 'configured' : 'missing'}</span>
    </span>
  );
}

export default function Rewriter() {
  const initial = useMemo(load, []);
  const [input, setInput] = useState(initial.input);
  const [provider, setProvider] = useState(initial.provider);
  const [result, setResult] = useState<RewriteResult | null>(initial.result);
  const [copied, setCopied] = useState(false);
  const [openSource, setOpenSource] = useState<string | null>(null);
  const [storageWarn, setStorageWarn] = useState(false);
  const clearing = useRef(false);

  const status = useGetRewriterStatus({ query: { queryKey: getGetRewriterStatusQueryKey() } });
  const rewrite = useRewriteText();
  const providers = status.data?.providers ?? [];

  useEffect(() => {
    if (!provider && providers.length) setProvider(providers[0].id);
  }, [provider, providers]);

  useEffect(() => {
    if (clearing.current) return;
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ input, provider, result }));
      setStorageWarn(false);
    } catch {
      setStorageWarn(true);
    }
  }, [input, provider, result]);

  const clearAll = () => {
    clearing.current = true;
    try { sessionStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
    window.location.reload();
  };

  const canRun = input.trim().length > 0 && input.length <= MAX && !!provider && !rewrite.isPending;

  const run = () => {
    if (!canRun) return;
    rewrite.mutate(
      { data: { text: input, provider: provider as RewriteInputProvider } },
      { onSuccess: (r) => { setResult(r); setOpenSource(null); } },
    );
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked */ }
  };

  const download = () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([result.text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `kuczynski-rewrite-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const words = input.trim() ? input.trim().split(/\s+/).length : 0;

  return (
    <div className="min-h-[100dvh] w-full">
      <header className="border-b border-foreground/15">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10 py-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="rise">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">Source-bound rewriting</p>
            <h1 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight leading-none mt-2">
              Kuczynski <em className="font-light text-primary">Rewriter</em>
            </h1>
          </div>
          <div className="rise md:text-right max-w-md" style={{ animationDelay: '80ms' }} data-testid="status-panel">
            {status.isLoading ? (
              <div className="space-y-2"><div className="skel h-3 w-64 md:ml-auto" /><div className="skel h-3 w-48 md:ml-auto" /></div>
            ) : status.isError ? (
              <div className="text-sm text-destructive flex items-center gap-2 md:justify-end">
                <AlertTriangle className="h-4 w-4" /> Status unavailable: {errorText(status.error)}
                <button data-testid="button-retry-status" onClick={() => status.refetch()} className="underline underline-offset-4">Retry</button>
              </div>
            ) : status.data ? (
              <>
                <div className="flex flex-wrap gap-x-4 gap-y-1 md:justify-end">
                  <Flag testid="status-key" label="Key" on={status.data.keyConfigured} />
                  <Flag testid="status-corpus" label="Corpus" on={status.data.corpusConfigured} />
                  <Flag testid="status-ai" label="AI" on={status.data.aiConfigured} />
                </div>
                <p data-testid="text-status-message" className="text-sm text-muted-foreground mt-1.5 italic">{status.data.message}</p>
                <p className="font-mono text-[10px] text-muted-foreground/80 mt-1">Configured, not verified until a rewrite succeeds.</p>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 md:px-10 py-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
        {/* INPUT */}
        <section className="rise flex flex-col" style={{ animationDelay: '120ms' }}>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-serif text-xl"><span className="font-mono text-xs text-primary mr-2">I.</span>Target text</h2>
            <span data-testid="text-count" className={`font-mono text-[11px] ${input.length > MAX ? 'text-destructive' : 'text-muted-foreground'}`}>
              {words} words / {input.length.toLocaleString()} of {MAX.toLocaleString()} chars
            </span>
          </div>
          <textarea
            data-testid="input-text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run(); }}
            placeholder="Paste the passage to be transformed. It will be rewritten only through real passages retrieved from Dr. Kuczynski's corpus."
            className="min-h-[340px] lg:min-h-[460px] flex-1 w-full resize-y bg-card border border-card-border rounded-sm p-5 text-[17px] leading-relaxed placeholder:text-muted-foreground/70 placeholder:italic focus:outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10 transition-[border-color,box-shadow]"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 border border-input rounded-sm bg-card pl-3 pr-1 h-11 focus-within:border-primary/60">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Provider</span>
              <select
                data-testid="select-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                disabled={!providers.length}
                className="bg-transparent h-full pr-2 text-sm font-medium focus:outline-none cursor-pointer"
              >
                {!providers.length && <option value="">{status.isLoading ? 'Loading...' : 'None available'}</option>}
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.label} ({p.model})</option>
                ))}
              </select>
            </label>
            <button
              data-testid="button-rewrite"
              onClick={run}
              disabled={!canRun}
              className="group inline-flex items-center gap-2 h-11 px-6 rounded-sm bg-primary text-primary-foreground font-serif text-base font-medium hover:bg-primary/90 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {rewrite.isPending ? 'Working...' : 'Rewrite'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              data-testid="button-clear"
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 h-11 px-3 text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear
            </button>
            <span className="font-mono text-[10px] text-muted-foreground hidden md:inline ml-auto">Ctrl / Cmd + Enter</span>
          </div>
          {storageWarn && (
            <p data-testid="text-storage-warning" className="mt-3 text-xs text-muted-foreground italic">Session storage is unavailable; your work will not survive a reload.</p>
          )}
        </section>

        {/* OUTPUT */}
        <section className="rise flex flex-col" style={{ animationDelay: '200ms' }}>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-serif text-xl"><span className="font-mono text-xs text-primary mr-2">II.</span>Rewritten</h2>
            {result && !rewrite.isPending && (
              <div className="flex gap-1">
                <button data-testid="button-copy" onClick={copy} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono uppercase tracking-wider rounded-sm hover:bg-secondary transition-colors">
                  {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy'}
                </button>
                <button data-testid="button-download" onClick={download} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono uppercase tracking-wider rounded-sm hover:bg-secondary transition-colors">
                  <Download className="h-3.5 w-3.5" /> .txt
                </button>
              </div>
            )}
          </div>

          <div className="relative flex-1 min-h-[340px] lg:min-h-[460px] bg-card border border-card-border rounded-sm overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary/80" />
            {rewrite.isPending ? (
              <div className="p-6" data-testid="status-pending">
                <div className="h-px bg-primary/70 ink-line mb-5" />
                <p className="font-serif italic text-lg">Retrieving sources, then rewriting.</p>
                <p className="font-mono text-[11px] text-muted-foreground mt-1">This can take a while. No intermediate progress is reported by the server.</p>
                <div className="mt-6 space-y-3">
                  {[92, 85, 97, 70, 88, 60].map((w, i) => <div key={i} className="skel h-3" style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }} />)}
                </div>
              </div>
            ) : rewrite.isError ? (
              <div className="p-6" data-testid="status-error">
                <p className="font-mono text-[11px] uppercase tracking-wider text-destructive flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5" /> Rewrite failed</p>
                <p data-testid="text-error" className="mt-2 font-serif text-lg leading-snug">{errorText(rewrite.error)}</p>
                <button data-testid="button-retry" onClick={run} disabled={!canRun} className="mt-4 text-sm underline underline-offset-4 text-primary disabled:opacity-40">Try again</button>
                {result && <p className="mt-6 text-xs text-muted-foreground italic">The previous result is kept below and in your session.</p>}
              </div>
            ) : result ? (
              <div className="p-6 md:p-8 max-h-[70vh] overflow-auto">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-4" data-testid="text-result-meta">
                  {result.provider} / {result.model} / sources retrieved {new Date(result.retrievedAt).toLocaleString()}
                </p>
                <div data-testid="text-result" className="whitespace-pre-wrap text-[17px] leading-[1.75] rise">{result.text}</div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-10" data-testid="status-empty">
                <span className="font-serif text-7xl text-primary/20 leading-none">&para;</span>
                <p className="font-serif text-lg mt-3">Nothing rewritten yet.</p>
                <p className="text-sm text-muted-foreground max-w-xs mt-1">The result appears here, together with every corpus passage that grounded it.</p>
              </div>
            )}
          </div>
          {rewrite.isError && result && (
            <div className="mt-4 bg-card/60 border border-card-border rounded-sm p-5 max-h-60 overflow-auto whitespace-pre-wrap text-[15px] leading-relaxed opacity-80">{result.text}</div>
          )}
        </section>

        {/* SOURCES */}
        {result && (
          <section className="lg:col-span-2 rise" data-testid="section-sources">
            <div className="flex items-baseline gap-3 border-t border-foreground/15 pt-6 mb-4">
              <h2 className="font-serif text-xl"><span className="font-mono text-xs text-primary mr-2">III.</span>Source passages</h2>
              <span className="font-mono text-[11px] text-muted-foreground">{result.sources.length} retrieved from Dr. Kuczynski's corpus</span>
            </div>
            {result.sources.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">The server returned no source passages for this result.</p>
            ) : (
              <ol className="divide-y divide-foreground/10 border-y border-foreground/10">
                {result.sources.map((s, i) => {
                  const open = openSource === s.id;
                  return (
                    <li key={s.id} data-testid={`card-source-${s.id}`}>
                      <button
                        data-testid={`button-source-${s.id}`}
                        onClick={() => setOpenSource(open ? null : s.id)}
                        className="w-full flex items-baseline gap-4 py-3.5 text-left group"
                      >
                        <span className="font-mono text-xs text-primary w-6">{String(i + 1).padStart(2, '0')}</span>
                        <span className="font-serif text-base flex-1 group-hover:text-primary transition-colors">{s.title}</span>
                        <BookOpen className={`h-4 w-4 shrink-0 transition-transform ${open ? 'text-primary rotate-[-8deg]' : 'text-muted-foreground'}`} />
                      </button>
                      {open && (
                        <div className="pl-10 pr-2 pb-5 rise">
                          <blockquote className="border-l-2 border-accent pl-4 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/85">{s.text}</blockquote>
                          {s.url && (
                            <a data-testid={`link-source-${s.id}`} href={s.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] text-accent hover:underline">
                              Open source <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

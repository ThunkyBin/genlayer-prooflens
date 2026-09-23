"use client";

import { useState } from "react";
import { CheckCircle2, CircleAlert, ExternalLink, Search, ShieldCheck } from "lucide-react";
import ProofLens, { type ClaimCheck } from "@/lib/contracts/ProofLens";
import { connectMetaMask, getContractAddress } from "@/lib/genlayer/client";

const CONTRACT_ADDRESS = getContractAddress();

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function HomePage() {
  const [account, setAccount] = useState("");
  const [url, setUrl] = useState("https://www.genlayer.com/");
  const [claim, setClaim] = useState("GenLayer uses intelligent contracts.");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<ClaimCheck | null>(null);
  const [busy, setBusy] = useState(false);

  async function connect() {
    try {
      setStatus("Connecting wallet…");
      const address = await connectMetaMask();
      setAccount(address);
      setStatus("Wallet connected to GenLayer Studio.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Wallet connection failed.");
    }
  }

  async function verify() {
    if (!account) return connect();
    if (!CONTRACT_ADDRESS) {
      setStatus("Contract address is not configured yet.");
      return;
    }
    if (!url.trim() || !claim.trim()) {
      setStatus("Enter both a public URL and a claim.");
      return;
    }

    setBusy(true);
    setResult(null);
    const requestId = `proof-${Date.now()}`;
    try {
      setStatus("Waiting for wallet signature and validator consensus…");
      const contract = new ProofLens(CONTRACT_ADDRESS, account);
      await contract.verifyClaim(requestId, url.trim(), claim.trim());
      setStatus("Consensus reached. Loading the result…");
      setResult(await contract.getCheck(account, requestId));
      setStatus("Verification complete.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  const verdictColor = result?.verdict === "SUPPORTED"
    ? "text-emerald-300 border-emerald-400/30 bg-emerald-400/10"
    : result?.verdict === "CONTRADICTED"
      ? "text-rose-300 border-rose-400/30 bg-rose-400/10"
      : "text-amber-200 border-amber-300/30 bg-amber-300/10";

  return (
    <main className="min-h-screen px-5 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-16 flex items-center justify-between">
          <div className="flex items-center gap-3 text-lg font-bold">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/20 text-violet-300"><ShieldCheck size={22} /></span>
            ProofLens
          </div>
          <button className="btn-secondary" onClick={connect}>
            {account ? shortAddress(account) : "Connect wallet"}
          </button>
        </nav>

        <section className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-start">
          <div className="pt-4">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-sm text-violet-200">
              <span className="h-2 w-2 rounded-full bg-violet-300" />
              Built on GenLayer Intelligent Contracts
            </div>
            <h1 className="max-w-2xl text-5xl font-bold leading-[1.05] md:text-7xl">Verify a claim against the open web.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">
              Submit a public page and a short claim. GenLayer validators read the source,
              reason independently, and reach consensus on the evidence.
            </p>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              {["Fetch", "Reason", "Consensus"].map((step, index) => (
                <div key={step} className="brand-card p-4">
                  <div className="text-xs text-violet-300">0{index + 1}</div>
                  <div className="mt-2 font-semibold">{step}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="brand-card p-6 md:p-8">
            <label className="mb-2 block text-sm font-medium text-zinc-300">Public source URL</label>
            <input className="mb-5 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none transition focus:border-violet-400/60" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/article" />

            <label className="mb-2 block text-sm font-medium text-zinc-300">Claim to verify</label>
            <textarea className="min-h-32 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none transition focus:border-violet-400/60" value={claim} onChange={(event) => setClaim(event.target.value)} placeholder="The page states that…" />

            <button className="btn-primary mt-5 flex w-full items-center justify-center gap-2 py-3" disabled={busy} onClick={verify}>
              <Search size={18} />
              {busy ? "Validators are checking…" : "Verify with consensus"}
            </button>

            {status && <div className="mt-4 flex items-start gap-2 text-sm text-zinc-400"><CircleAlert className="mt-0.5 shrink-0" size={16} />{status}</div>}

            {result && (
              <div className={`mt-6 rounded-2xl border p-5 ${verdictColor}`}>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 font-bold"><CheckCircle2 size={18} />{result.verdict}</span>
                  <span className="text-sm font-semibold">{result.confidence}% confidence</span>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-200">{result.evidence || "No evidence returned."}</p>
              </div>
            )}
          </div>
        </section>

        <footer className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-zinc-500">
          <span>ProofLens · GenLayer Studionet</span>
          <a className="flex items-center gap-1 hover:text-violet-300" href="https://docs.genlayer.com" target="_blank" rel="noreferrer">GenLayer docs <ExternalLink size={14} /></a>
        </footer>
      </div>
    </main>
  );
}

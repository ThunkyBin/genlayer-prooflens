# ProofLens for GenLayer

ProofLens is a small GenLayer Intelligent Contract that checks a short claim against a public web page. GenLayer validators fetch the page, ask an LLM for a structured verdict, reach consensus through the equivalence principle, and store the result under the caller's address.

The included Next.js interface connects an injected EVM wallet, submits a claim to Studionet, waits for validator consensus, and displays the verdict, confidence, and evidence.

Each result contains:

- `SUPPORTED`, `CONTRADICTED`, or `UNCLEAR`
- a normalized confidence score from 0 to 100
- a short evidence passage
- the original URL and claim

## Why GenLayer

A traditional smart contract cannot read a normal website or interpret prose. ProofLens uses `gl.nondet.web.render` and `gl.nondet.exec_prompt`, then wraps the result in `gl.eq_principle.strict_eq` so validators agree before state changes.

## Contract API

```text
verify_claim(request_id: str, url: str, claim: str) -> None
get_my_checks() -> dict
get_check(owner_address: str, request_id: str) -> ClaimCheck
```

Example write:

```bash
genlayer write <CONTRACT_ADDRESS> verify_claim \
  --args "demo-1" "https://example.com" "Example Domain is intended for documentation"
```

Example read:

```bash
genlayer call <CONTRACT_ADDRESS> get_check \
  --args "<OWNER_ADDRESS>" "demo-1"
```

## Local validation

Python 3.12 is required.

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/genvm-lint check contracts/proof_lens.py
.venv/Scripts/pytest tests/direct/test_proof_lens.py -v
```

## Deploy

Install the GenLayer CLI, choose a hosted development network, and deploy:

```bash
npm install
npm install -g genlayer
genlayer network set studionet
genlayer deploy --contract contracts/proof_lens.py
```

Copy the deployed contract address into the web app configuration and run the interface:

```bash
copy frontend\.env.example frontend\.env.local
# Set NEXT_PUBLIC_CONTRACT_ADDRESS in frontend/.env.local
npm run dev
```

The production web build is created with `npm run build`.

For a persistent test deployment, use Bradbury after validating on Studionet:

```bash
genlayer network set testnet-bradbury
genlayer deploy --contract contracts/proof_lens.py
```

## Safety

ProofLens records an AI-assisted verdict, not an authoritative fact. Callers should inspect the evidence and source. The contract never requests wallet seed phrases or private keys.

## License

MIT

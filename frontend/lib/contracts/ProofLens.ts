import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { estimateWriteFeePreset, feePresetToTransactionFees } from "../genlayer/fees";

export type ClaimCheck = {
  request_id: string;
  url: string;
  claim: string;
  verdict: "SUPPORTED" | "CONTRADICTED" | "UNCLEAR";
  confidence: string;
  evidence: string;
};

function mapToObject(value: unknown): Record<string, unknown> {
  if (value instanceof Map) return Object.fromEntries(value.entries());
  return (value ?? {}) as Record<string, unknown>;
}

export default class ProofLens {
  private client: any;
  private contractAddress: `0x${string}`;

  constructor(contractAddress: string, account?: string) {
    this.contractAddress = contractAddress as `0x${string}`;
    this.client = createClient({
      chain: studionet,
      ...(account ? { account: account as `0x${string}` } : {}),
    });
  }

  async verifyClaim(requestId: string, url: string, claim: string) {
    const feePreset = await estimateWriteFeePreset(this.client, {
      address: this.contractAddress,
      functionName: "verify_claim",
      args: [requestId, url, claim],
    });
    const fees = feePresetToTransactionFees(feePreset);
    const hash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "verify_claim",
      args: [requestId, url, claim],
      value: 0n,
      ...(fees ? { fees } : {}),
    });

    return this.client.waitForTransactionReceipt({
      hash,
      status: "ACCEPTED",
      retries: 36,
      interval: 5000,
    });
  }

  async getCheck(owner: string, requestId: string): Promise<ClaimCheck> {
    const raw = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_check",
      args: [owner, requestId],
    });
    const result = mapToObject(raw);
    return {
      request_id: String(result.request_id ?? requestId),
      url: String(result.url ?? ""),
      claim: String(result.claim ?? ""),
      verdict: String(result.verdict ?? "UNCLEAR") as ClaimCheck["verdict"],
      confidence: String(result.confidence ?? "0"),
      evidence: String(result.evidence ?? ""),
    };
  }
}

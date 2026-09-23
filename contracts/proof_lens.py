# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from dataclasses import dataclass
from genlayer import *


@allow_storage
@dataclass
class ClaimCheck:
    request_id: str
    url: str
    claim: str
    verdict: str
    confidence: str
    evidence: str


class ProofLens(gl.Contract):
    """Verify a short claim against a public web page using GenLayer consensus."""

    checks: TreeMap[Address, TreeMap[str, ClaimCheck]]

    def __init__(self):
        pass

    def _analyze(self, url: str, claim: str) -> dict:
        def fetch_and_judge() -> str:
            page_text = gl.nondet.web.render(url, mode="text")
            prompt = f"""
You are a careful fact checker. Decide whether the web page supports the claim.

Claim: {claim}

Web page content:
{page_text}

Return JSON with exactly these fields:
{{
  "verdict": "SUPPORTED" | "CONTRADICTED" | "UNCLEAR",
  "confidence": integer from 0 to 100,
  "evidence": string with one short passage or explanation, at most 240 characters
}}

Use UNCLEAR when the page is unavailable, ambiguous, or lacks enough evidence.
Return only valid JSON without markdown or additional text.
            """
            result = gl.nondet.exec_prompt(prompt, response_format="json")
            return json.dumps(result, sort_keys=True)

        return json.loads(gl.eq_principle.strict_eq(fetch_and_judge))

    @gl.public.write
    def verify_claim(self, request_id: str, url: str, claim: str) -> None:
        if not request_id.strip():
            raise gl.vm.UserError("Request id is required")
        if not (url.startswith("https://") or url.startswith("http://")):
            raise gl.vm.UserError("URL must start with http:// or https://")
        if not claim.strip():
            raise gl.vm.UserError("Claim is required")

        sender = gl.message.sender_address
        sender_checks = self.checks.get_or_insert_default(sender)
        if request_id in sender_checks:
            raise gl.vm.UserError("Request id already exists")

        result = self._analyze(url, claim)
        verdict = str(result.get("verdict", "UNCLEAR")).upper()
        if verdict not in ("SUPPORTED", "CONTRADICTED", "UNCLEAR"):
            verdict = "UNCLEAR"

        confidence_value = int(result.get("confidence", 0))
        if confidence_value < 0:
            confidence_value = 0
        if confidence_value > 100:
            confidence_value = 100

        sender_checks[request_id] = ClaimCheck(
            request_id=request_id,
            url=url,
            claim=claim,
            verdict=verdict,
            confidence=str(confidence_value),
            evidence=str(result.get("evidence", ""))[:240],
        )

    @gl.public.view
    def get_my_checks(self) -> dict:
        sender = gl.message.sender_address
        if sender not in self.checks:
            return {}
        return {key: value for key, value in self.checks[sender].items()}

    @gl.public.view
    def get_check(self, owner_address: str, request_id: str) -> ClaimCheck:
        owner = Address(owner_address)
        if owner not in self.checks or request_id not in self.checks[owner]:
            raise gl.vm.UserError("Check not found")
        return self.checks[owner][request_id]

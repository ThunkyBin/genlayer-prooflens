"""Direct-mode tests for the ProofLens intelligent contract."""

import json

from tests.direct.conftest import to_hex


def _mock_verdict(vm, verdict="SUPPORTED", confidence=92, evidence="The page states the claim."):
    vm.mock_web(
        r".*example\.com.*",
        {"status": 200, "body": "Example page content supporting the submitted claim."},
    )
    vm.mock_llm(
        r".*careful fact checker.*",
        json.dumps(
            {
                "verdict": verdict,
                "confidence": confidence,
                "evidence": evidence,
            }
        ),
    )


def test_verify_and_read_claim(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/proof_lens.py")
    direct_vm.sender = direct_alice
    _mock_verdict(direct_vm)

    contract.verify_claim("check-1", "https://example.com/report", "The report is public")

    check = contract.get_check(to_hex(direct_alice), "check-1")
    assert check.verdict == "SUPPORTED"
    assert check.confidence == "92"
    assert check.evidence == "The page states the claim."


def test_duplicate_request_id_reverts(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/proof_lens.py")
    direct_vm.sender = direct_alice
    _mock_verdict(direct_vm)

    contract.verify_claim("same-id", "https://example.com/a", "A claim")
    with direct_vm.expect_revert("Request id already exists"):
        contract.verify_claim("same-id", "https://example.com/b", "Another claim")


def test_invalid_url_reverts(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/proof_lens.py")
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("URL must start with http:// or https://"):
        contract.verify_claim("check-2", "example.com", "A claim")


def test_output_is_normalized_and_clamped(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/proof_lens.py")
    direct_vm.sender = direct_alice
    _mock_verdict(direct_vm, verdict="maybe", confidence=500, evidence="x" * 300)

    contract.verify_claim("check-3", "https://example.com/data", "A claim")
    check = contract.get_check(to_hex(direct_alice), "check-3")

    assert check.verdict == "UNCLEAR"
    assert check.confidence == "100"
    assert len(check.evidence) == 240


def test_users_have_separate_history(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/proof_lens.py")
    _mock_verdict(direct_vm)

    direct_vm.sender = direct_alice
    contract.verify_claim("shared-id", "https://example.com/a", "Alice claim")

    direct_vm.sender = direct_bob
    contract.verify_claim("shared-id", "https://example.com/b", "Bob claim")

    assert contract.get_check(to_hex(direct_alice), "shared-id").claim == "Alice claim"
    assert contract.get_check(to_hex(direct_bob), "shared-id").claim == "Bob claim"


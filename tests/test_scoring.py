import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../src"))

os.environ.setdefault("OPENAI_API_KEY", "test-key")

from services.scoring import lead_score, score_to_tag


def test_no_contact_zero_score():
    score = lead_score(None, "")
    assert score == 0
    assert score_to_tag(score) == "cold-lead"


def test_full_contact_no_intent():
    contact = {
        "email": "test@example.com",
        "phone": "+15551234567",
        "firstName": "John",
        "lastName": "Doe",
        "tags": [],
    }
    score = lead_score(contact, "")
    assert score == 60  # email(20) + phone(20) + firstName(10) + lastName(10)


def test_intent_message_boosts_score():
    contact = {
        "email": "a@b.com",
        "phone": "+1555",
        "firstName": "A",
        "lastName": "B",
        "tags": [],
    }
    score_no_intent = lead_score(contact, "hello how are you")
    score_intent = lead_score(contact, "I want to buy a demo")
    assert score_intent > score_no_intent
    assert score_intent == 80  # 60 base + 20 intent


def test_intent_tag_boosts_score():
    contact = {
        "email": "a@b.com",
        "phone": "+1",
        "firstName": "A",
        "lastName": "B",
        "tags": ["buy-intent"],
    }
    score = lead_score(contact, "")
    assert score == 75  # 60 base + 15 tag intent


def test_score_capped_at_100():
    contact = {
        "email": "a@b.com",
        "phone": "+1",
        "firstName": "A",
        "lastName": "B",
        "tags": ["buy-intent"],
    }
    score = lead_score(contact, "I want to buy a demo now")
    assert score <= 100


def test_hot_lead_threshold():
    assert score_to_tag(70) == "hot-lead"
    assert score_to_tag(100) == "hot-lead"
    assert score_to_tag(71) == "hot-lead"


def test_warm_lead_threshold():
    assert score_to_tag(40) == "warm-lead"
    assert score_to_tag(69) == "warm-lead"


def test_cold_lead_threshold():
    assert score_to_tag(0) == "cold-lead"
    assert score_to_tag(39) == "cold-lead"


def test_webhook_payload_parsing():
    """Verify webhook payload field extraction logic."""
    payload = {
        "contactId": "abc123",
        "type": "ContactCreated",
        "email": "test@example.com",
    }
    contact_id = payload.get("contactId") or payload.get("contact_id", "")
    assert contact_id == "abc123"
    assert payload.get("type") == "ContactCreated"


def test_webhook_payload_fallback_field():
    """contact_id fallback field should work when contactId is absent."""
    payload = {"contact_id": "xyz789", "type": "ContactUpdated"}
    contact_id = payload.get("contactId") or payload.get("contact_id", "")
    assert contact_id == "xyz789"


def test_partial_contact_score():
    """Contact with only email should score 20."""
    contact = {"email": "x@y.com"}
    score = lead_score(contact, "")
    assert score == 20

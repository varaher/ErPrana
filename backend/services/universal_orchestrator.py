# services/universal_orchestrator.py
"""
Universal Brain Layer - Works for ALL 100+ rules automatically
No more complaint-specific routing or fallback loops
"""

from typing import Dict, List, Optional, Any, Tuple
from services.fact_extractor import extract_facts, merge_facts, summarize_facts
from services.enhanced_rule_engine import evaluate_rules_from_facts, LOADED_RULES, get_triage_badge, get_next_steps

# Urgency priority for sorting
URGENCY_PRIORITY = {
    "Emergency": 5,
    "High": 4,
    "Urgent": 3,
    "Moderate": 2,
    "Mild": 1
}

def format_triage(match_result) -> str:
    """Format triage result with color badge and advice"""
    level = match_result.urgency
    badge = get_triage_badge(level)
    advice = get_next_steps(level)
    confidence = int(match_result.score * 100)
    
    return (
        f"**Assessment Complete**\n\n"
        f"**Triage Level:** {badge}\n"
        f"**Reason:** {match_result.likely_condition}\n"
        f"**Confidence:** {confidence}%\n\n"
        f"{advice}"
    )

def detect_new_symptom(message: str, current_symptoms: List[str]) -> bool:
    """Detect if user is introducing a completely new symptom"""
    # Extract symptoms from new message
    new_facts = extract_facts(message)
    new_symptoms = set(new_facts.symptoms)
    old_symptoms = set(current_symptoms)
    
    # Check if there are NEW symptoms not in current list
    fresh_symptoms = new_symptoms - old_symptoms
    
    # Also check for explicit phrases like "now I have" or "also I have"
    transition_phrases = [
        "now i have", "now i'm having", "also i have", "also having",
        "another issue", "new symptom", "different problem"
    ]
    
    message_lower = message.lower()
    has_transition = any(phrase in message_lower for phrase in transition_phrases)
    
    return len(fresh_symptoms) > 0 and has_transition

def pick_relevant_question(session_facts: Dict[str, Any], asked_questions: set) -> Optional[Tuple[str, str]]:
    """
    Pick next relevant question based on what's missing
    Universal questions that work for ANY symptom
    Returns (question_id, question_text) or None
    """
    
    # Priority 1: Need at least one symptom
    if not session_facts.get("symptoms"):
        if "main_symptom" not in asked_questions:
            return ("main_symptom", "What symptom is troubling you most right now? (e.g., chest pain, fever, headache, dizziness, abdominal pain)")
    
    # Priority 2: Duration (critical for all complaints)
    if "duration_text" not in session_facts:
        if "duration" not in asked_questions:
            return ("duration", "How long have you been experiencing this? (minutes, hours, or days)")
    
    # Priority 3: Onset (important for emergency detection)
    if "onset" not in session_facts:
        if "onset" not in asked_questions:
            return ("onset", "Did it start suddenly or gradually?")
    
    # Priority 4: Severity (universal measure)
    if "severity" not in session_facts:
        if "severity" not in asked_questions:
            return ("severity", "On a scale of 1-10, how severe is it right now?")
    
    # Priority 5: Pattern (for recurring symptoms)
    if "pattern" not in session_facts:
        if "pattern" not in asked_questions:
            return ("pattern", "Is it constant or does it come and go?")
    
    # Priority 6: Radiation (for pain complaints)
    symptoms_str = " ".join(session_facts.get("symptoms", [])).lower()
    if "pain" in symptoms_str and not session_facts.get("radiation"):
        if "radiation" not in asked_questions:
            return ("radiation", "Does the pain spread to other areas (like your arm, jaw, back, or shoulder)?")
    
    # Priority 7: Temperature (for fever)
    if "fever" in symptoms_str and not session_facts.get("temperature_f"):
        if "temperature" not in asked_questions:
            return ("temperature", "What's the highest temperature you've recorded? (please include F or C)")
    
    # No more relevant questions
    return None

def orchestrate_message(
    user_id: str,
    message: str,
    session_state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Universal orchestrator - works for ALL symptoms automatically
    
    Flow:
    1. Extract facts from user message
    2. Merge into session
    3. Evaluate ALL 100 rules
    4. If rule fires → return triage
    5. If no rule fires → ask for missing info
    6. Never fall back to generic "I'm here to help"
    """
    
    # Check for session reset (new complaint after completion)
    if session_state.get("completed"):
        current_symptoms = session_state.get("facts", {}).get("symptoms", [])
        if detect_new_symptom(message, current_symptoms):
            # Reset session for new concern
            session_state.clear()
            session_state.update({
                "facts": {},
                "asked_questions": set(),
                "completed": False,
                "repeat_count": 0,
                "last_reply": None
            })
    
    # Step 1: Extract facts from current message
    new_facts = extract_facts(message)
    
    # Step 2: Merge into session facts
    current_facts = session_state.get("facts", {})
    updated_facts = merge_facts(current_facts, new_facts)
    session_state["facts"] = updated_facts
    
    print(f"🧠 Orchestrator - Extracted: {new_facts.to_dict()}")
    print(f"📊 Orchestrator - Total facts: {updated_facts}")
    
    # Step 3: Evaluate ALL 100 rules (on every turn)
    match = evaluate_rules_from_facts(updated_facts, LOADED_RULES)
    
    if match and match.score >= 0.5:  # Sufficient confidence
        # Rule fired! Return triage
        session_state["completed"] = True
        session_state["matched_rule"] = match.matched_rule_id
        
        print(f"✅ Rule matched: {match.matched_rule_id} - {match.likely_condition} ({match.urgency})")
        
        return {
            "type": "triage",
            "text": format_triage(match),
            "rule_id": match.matched_rule_id,
            "triage_level": get_triage_badge(match.urgency),
            "done": True,
            "facts": updated_facts
        }
    
    # Step 4: No rule fired yet → ask for missing universal info
    asked_questions = session_state.get("asked_questions", set())
    next_question = pick_relevant_question(updated_facts, asked_questions)
    
    if next_question:
        question_id, question_text = next_question
        asked_questions.add(question_id)
        session_state["asked_questions"] = asked_questions
        
        # Acknowledge what we captured
        acknowledgment = ""
        if not new_facts.is_empty():
            captured = [k for k in new_facts.to_dict().keys() if new_facts.to_dict()[k]]
            if captured:
                acknowledgment = f"Got it. I noted: {', '.join(captured)}.\n\n"
        
        reply_text = acknowledgment + question_text
        
        # Loop guard
        if reply_text == session_state.get("last_reply"):
            session_state["repeat_count"] = session_state.get("repeat_count", 0) + 1
        else:
            session_state["repeat_count"] = 0
        
        session_state["last_reply"] = reply_text
        
        # Recovery: if stuck, summarize and pivot
        if session_state.get("repeat_count", 0) >= 2:
            summary = summarize_facts(updated_facts)
            session_state["repeat_count"] = 0
            reply_text = f"{summary}\n\nDoes this summary look accurate? If yes, type **OK**. Otherwise, please clarify the main symptom."
        
        return {
            "type": "question",
            "text": reply_text,
            "done": False,
            "facts": updated_facts
        }
    
    # Step 5: No more questions, but no rule matched
    # Provide summary and suggest medical consultation
    summary = summarize_facts(updated_facts)
    
    return {
        "type": "summary",
        "text": f"{summary}\n\nBased on what you've shared, I recommend scheduling an appointment with your healthcare provider for proper evaluation. They can provide a thorough assessment.",
        "done": False,
        "facts": updated_facts
    }

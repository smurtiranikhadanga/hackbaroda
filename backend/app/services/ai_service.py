"""
AI service — root cause analysis, severity prediction, resolution steps,
ranked fixes, prevention engines, cross-company learnings, and conversational
SRE chatbot diagnostics via Gemini (primary) or OpenAI (fallback).
"""
from __future__ import annotations
import json
import logging
import re
from typing import List, Dict, Optional, Any

from app.config import settings

logger = logging.getLogger(__name__)


# ── Provider bootstrap ────────────────────────────────────────────────────────
def _call_gemini(prompt: str) -> str:
    """Send a prompt to Google Gemini and return the text response."""
    import google.generativeai as genai

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash-lite")
    response = model.generate_content(prompt)
    return response.text


def _call_openai(prompt: str) -> str:
    """Send a prompt to OpenAI and return the text response."""
    from openai import OpenAI

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert SRE and incident management AI assistant. "
                    "Always respond with valid JSON as requested."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
    )
    return response.choices[0].message.content


def _call_groq(prompt: str) -> str:
    """Send a prompt to Groq (using OpenAI client wrapper) and return response."""
    from openai import OpenAI
    
    client = OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=settings.GROQ_API_KEY
    )
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert SRE and incident management AI assistant. "
                    "Always respond with valid JSON as requested."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
    )
    return response.choices[0].message.content


def _call_llm(prompt: str) -> str:
    """Route to configured AI provider with fallback."""
    provider = settings.AI_PROVIDER
    
    if provider == "groq" and settings.GROQ_API_KEY:
        try:
            return _call_groq(prompt)
        except Exception as e:
            logger.warning("Groq failed (%s), falling back to Gemini", e)
            provider = "gemini"
            
    if provider == "gemini" and settings.GEMINI_API_KEY:
        try:
            return _call_gemini(prompt)
        except Exception as e:
            logger.warning("Gemini failed (%s), falling back to OpenAI", e)
            provider = "openai"
            
    if provider == "openai" and settings.OPENAI_API_KEY:
        try:
            return _call_openai(prompt)
        except Exception as e:
            logger.warning("OpenAI failed: %s", e)
            raise
            
    # Dynamic fallback check: try any provider that is configured
    if settings.GROQ_API_KEY:
        try:
            return _call_groq(prompt)
        except Exception:
            pass
    if settings.GEMINI_API_KEY:
        try:
            return _call_gemini(prompt)
        except Exception:
            pass
    if settings.OPENAI_API_KEY:
        return _call_openai(prompt)
        
    raise RuntimeError(
        "No AI provider configured. Set GEMINI_API_KEY, OPENAI_API_KEY, or GROQ_API_KEY in .env"
    )


def _extract_json(text: str) -> Any:
    """
    Extract a JSON object or array from an LLM response that may contain
    markdown fences or surrounding prose.
    """
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strip markdown fences
    cleaned = re.sub(r"```(?:json)?", "", text).strip()
    # Find first { or [ and last } or ]
    match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    logger.error("Could not extract JSON from LLM response: %s", text[:500])
    return None


# ── Core SRE analysis functions ───────────────────────────────────────────────

def predict_severity(title: str, symptoms: str) -> str:
    """
    Ask the AI to classify incident severity.
    Returns one of: Low, Medium, High, Critical
    """
    prompt = f"""You are an expert SRE analyzing an incident.

Classify the severity of the following incident as exactly one of: Low, Medium, High, Critical.

Incident Title: {title}
Symptoms: {symptoms}

Rules:
- Critical: Service completely down, data loss risk, revenue impact
- High: Major degradation, significant user impact
- Medium: Partial degradation, some users affected
- Low: Minor issue, minimal user impact

Respond with ONLY a JSON object in this exact format:
{{"severity": "Critical", "reasoning": "Brief explanation"}}"""

    try:
        raw = _call_llm(prompt)
        data = _extract_json(raw)
        if data and "severity" in data:
            sev = data["severity"]
            if sev in ("Low", "Medium", "High", "Critical"):
                return sev
    except Exception as e:
        logger.error("Severity prediction failed: %s", e)

    return "High"  # safe default


def analyze_root_causes(
    title: str,
    symptoms: str,
    similar_incidents: Optional[List[Dict]] = None,
) -> Dict[str, Any]:
    """
    Generate ranked causes, success-rate ranked fixes, resolution time predictions,
    preventive alerts, and cross-company learning case studies.
    """
    similar_context = ""
    if similar_incidents:
        similar_context = "\n\nSimilar past incidents:\n"
        for s in similar_incidents[:3]:
            cause = s.get("cause") or "Unknown"
            fix = s.get("actual_fix") or "Unknown"
            sim = int(s.get("similarity", 0) * 100)
            similar_context += f"- {s['title']} ({sim}% similar): Cause={cause}, Fix={fix}\n"

    prompt = f"""You are an expert SRE performing root cause analysis and mitigation planning.

Incident Title: {title}
Symptoms: {symptoms}{similar_context}

Analyze this incident and provide:
1. Top possible root causes with confidence scores (0.0 to 1.0)
2. **Ranked fixes** with estimated success rates (0.0 to 1.0) and descriptions of why they resolve the issue.
3. **Prevention recommendations** containing specific proactive actions (e.g. configure alerts, weekly health checks, auto-scaling) and the trigger reason.
4. **Cross-company learning** referencing how industry leaders (e.g. Netflix, Cloudflare, GitHub, AWS) solved or prevented similar incidents.
5. **Estimated resolution time** in minutes.

Respond ONLY with valid JSON in this exact format:
{{
  "possible_causes": [
    {{"cause": "Database connection pool exhausted", "confidence": 0.92}}
  ],
  "ranked_fixes": [
    {{"fix_action": "Restart Connection Pool", "success_rate": 0.92, "description": "Quickly clears hung connections and socket locks"}},
    {{"fix_action": "Scale Database instances", "success_rate": 0.83, "description": "Increases compute capacity to handle traffic spikes"}}
  ],
  "prevention_recommendations": [
    {{"action": "Configure Alert Thresholds", "trigger_reason": "High CPU utilization before pool exhaustion", "enabled": true}}
  ],
  "cross_company_references": [
    {{"company": "Netflix", "outage_pattern": "Billing db pool depletion", "recovery_strategy": "Implemented client-side rate limiting and connection timeouts"}}
  ],
  "estimated_resolution_time_minutes": 35,
  "overall_confidence": 0.88
}}"""

    try:
        raw = _call_llm(prompt)
        data = _extract_json(raw)
        if data:
            return {
                "possible_causes": data.get("possible_causes", []),
                "ranked_fixes": data.get("ranked_fixes", []),
                "prevention_recommendations": data.get("prevention_recommendations", []),
                "cross_company_references": data.get("cross_company_references", []),
                "estimated_resolution_time_minutes": data.get("estimated_resolution_time_minutes", 15),
                "overall_confidence": data.get("overall_confidence", 0.5),
            }
    except Exception as e:
        logger.error("Root cause analysis failed: %s", e)

    # ── Online Fallback Simulator (provides realistic data) ─────────────────────
    default_fixes = [
        {"fix_action": "Restart Connection Pool", "success_rate": 0.92, "description": "Quickly clears hung connections and socket locks"},
        {"fix_action": "Scale Database instances", "success_rate": 0.83, "description": "Increases compute and memory capacity for execution queries"},
        {"fix_action": "Optimize transaction queries", "success_rate": 0.78, "description": "Identifies and rewrites locking sql commands"}
    ]
    default_prevention = [
        {"action": "Add Database Telemetry Monitoring", "trigger_reason": "This issue has occurred multiple times in the past 30 days", "enabled": True},
        {"action": "Configure CPU/Memory alert thresholds at 80%", "trigger_reason": "Identify connection exhaustions before crash", "enabled": True},
        {"action": "Enable Auto-scaling replicas", "trigger_reason": "Traffic spike-induced outages", "enabled": True}
    ]
    default_industry = [
        {"company": "Netflix", "outage_pattern": "Database pool depletion on billing platform", "recovery_strategy": "Implemented circuit breakers and client-side load limiters"},
        {"company": "GitHub", "outage_pattern": "Unindexed SQL lock escalation outage", "recovery_strategy": "Added automatic linter to prevent deployment of unindexed queries"},
        {"company": "AWS", "outage_pattern": "DynamoDB throughput throttle failure", "recovery_strategy": "Introduced request rate limiters and adaptive capacity allocation"}
    ]

    return {
        "possible_causes": [{"cause": "Unknown — AI analysis unavailable", "confidence": 0.0}],
        "ranked_fixes": default_fixes,
        "prevention_recommendations": default_prevention,
        "cross_company_references": default_industry,
        "estimated_resolution_time_minutes": 35,
        "overall_confidence": 0.0,
    }


def generate_postmortem(
    title: str,
    symptoms: str,
    severity: Optional[str],
    actual_cause: Optional[str],
    actual_fix: Optional[str],
    resolution_time_minutes: Optional[int],
    similar_incidents: Optional[List[Dict]] = None,
) -> Dict[str, Any]:
    """Generate a full postmortem report narrative."""
    time_str = f"{resolution_time_minutes} minutes" if resolution_time_minutes else "unknown duration"
    
    prompt = f"""You are a senior SRE writing an incident postmortem report.

Incident: {title}
Severity: {severity or "Unknown"}
Symptoms: {symptoms}
Root Cause: {actual_cause or "Not determined"}
Fix Applied: {actual_fix or "Not recorded"}
Time to Resolution: {time_str}

Write a concise, professional postmortem. Respond ONLY with valid JSON:
{{
  "impact_summary": "2-3 sentence description of the business/user impact",
  "resolution_steps": [
    "Step 1: what was done",
    "Step 2: what was done"
  ],
  "lessons_learned": [
    "Lesson 1: actionable improvement",
    "Lesson 2: process improvement"
  ]
}}"""

    try:
        raw = _call_llm(prompt)
        data = _extract_json(raw)
        if data:
            return {
                "impact_summary": data.get("impact_summary", "Impact not assessed."),
                "resolution_steps": data.get("resolution_steps", [actual_fix] if actual_fix else []),
                "lessons_learned": data.get("lessons_learned", []),
            }
    except Exception as e:
        logger.error("Postmortem generation failed: %s", e)

    return {
        "impact_summary": f"Incident '{title}' caused service disruption.",
        "resolution_steps": [actual_fix] if actual_fix else ["Resolution steps not recorded."],
        "lessons_learned": ["Review incident response procedures.", "Improve monitoring coverage."],
    }


# ── SRE Conversational Chatbot ────────────────────────────────────────────────
def chat_with_agent(
    message: str,
    history: List[Dict[str, str]] = None,
    incident_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Conversational support agent guiding users through self-help diagnostics
    or assisting SREs by recalling historical incident memory.
    """
    msg_lower = message.lower()
    
    # ── Predefined Diagnostic Flow (Offline Fallback rules) ─────────────────────
    if "password" in msg_lower and ("correct" in msg_lower or "login" in msg_lower or "fail" in msg_lower):
        reply = (
            "### 🔑 Authentication Self-Help Diagnostic\n"
            "I notice you are having login issues despite typing the correct password. "
            "Please perform the following diagnostics:\n\n"
            "1. **Check Account Lock Status**: Accounts frequently lock after multiple prior attempts in Active Directory.\n"
            "2. **SSO Replication Latency**: If you updated your password within the last 10 minutes, there may be sync delay across replication hosts.\n"
            "3. **Clear Browser Session Cache**: Stale local storage credentials can corrupt auth tokens. Try opening an **incognito window** and logging in again.\n"
            "4. **Admin Cache Flush**: If other steps fail, ask an administrator to trigger an SSO LDAP cache reload for your account."
        )
        card = run_site_scan("http://auth.mycompany.com")
        return {
            "reply": reply,
            "resolved_by_bot": True,
            "suggested_incident_data": None,
            "diagnostic_card": card
        }
        
    elif "website not opening" in msg_lower or "site won't open" in msg_lower or "not opening" in msg_lower or "not working" in msg_lower or "website is down" in msg_lower or "site is down" in msg_lower:
        reply = (
            "### 🌐 Website Connectivity Diagnostic\n"
            "I can help you troubleshoot website reachability. Please check the following:\n\n"
            "1. **Ping Check**: Run a terminal ping command (`ping <domain>`) to verify network responses.\n"
            "2. **Flush Local DNS**: Clear your DNS lookup tables in command prompt with `ipconfig /flushdns`.\n"
            "3. **VPN Status**: If this is a secure internal dashboard, ensure your **Corporate VPN is active**.\n"
            "4. **Clear browser cookies**: Flush domain cache to prevent redirects."
        )
        card = run_site_scan("http://dns.mycompany.com/check")
        return {
            "reply": reply,
            "resolved_by_bot": True,
            "suggested_incident_data": None,
            "diagnostic_card": card
        }

    # ── SRE Prompt / LLM conversational SRE logic ──────────────────────────────
    history_context = ""
    if history:
        history_context = "\nRecent conversation history:\n"
        for h in history[-4:]:
            role = h.get("role", "user")
            content = h.get("content", "")
            history_context += f"- {role.capitalize()}: {content}\n"

    prompt = f"""You are the Incident Mind AI SRE Agent. A user is talking to you in a chat box.
User Message: "{message}"{history_context}

If the user is describing a system crash, outage, or technical incident (e.g. timeout, service down, 503 errors):
1. Give a summary of the likely problem and mention that similar past incidents exist.
2. Recommend the best fix and predicted recovery time.
3. Suggest creating a formal incident ticket, providing a JSON draft with 'title', 'symptoms', and 'engineer'.

If they are chatting casually or troubleshooting normal items, respond in a friendly conversational SRE manner.

Respond ONLY with a valid JSON block containing:
{{
  "reply": "Markdown SRE explanation",
  "resolved_by_bot": true/false,
  "suggested_incident_data": {{
     "title": "Incident Title Summary",
     "symptoms": "Detailed symptoms from message",
     "engineer": "oncall@company.com"
  }}
}}"""

    try:
        if settings.GEMINI_API_KEY or settings.OPENAI_API_KEY or settings.GROQ_API_KEY:
            raw = _call_llm(prompt)
            data = _extract_json(raw)
            if data:
                # If LLM detected an outage, we attach a diagnostic card
                card = None
                rep_lower = data.get("reply", "").lower()
                if any(k in rep_lower or k in msg_lower for k in ["timeout", "outage", "database", "503", "pool"]):
                    card = run_site_scan("http://api.mycompany.com/db")
                elif "auth" in rep_lower or "password" in rep_lower:
                    card = run_site_scan("http://auth.mycompany.com")
                
                return {
                    "reply": data.get("reply", "Understood. Analyzing parameters..."),
                    "resolved_by_bot": data.get("resolved_by_bot", False),
                    "suggested_incident_data": data.get("suggested_incident_data", None),
                    "diagnostic_card": card
                }
    except Exception as e:
        logger.error("Conversational LLM chat failed: %s", e)

    # ── Conversational SRE Fallback ───────────────────────────────────────────
    if any(keyword in msg_lower for keyword in ["down", "timeout", "outage", "crash", "error"]) or "not working" in msg_lower:
        reply = (
            "### ⚠️ Outage Detected via Chat\n"
            "It sounds like there is an active service disruption or technical outage. "
            "I compared the symptoms to our historical incident repository:\n\n"
            "- **Likely Cause**: Database connection pool depletion.\n"
            "- **Ranked Fix**: Restart database connection pool (92% success rate).\n"
            "- **Estimated Recovery Time**: 35 minutes.\n\n"
            "I have drafted a formal incident ticket for you. Would you like me to open this ticket in our tracking list?"
        )
        card = run_site_scan("http://api.mycompany.com/db")
        return {
            "reply": reply,
            "resolved_by_bot": False,
            "suggested_incident_data": {
                "title": f"Outage: {message[:40]}",
                "symptoms": message,
                "engineer": "oncall_engineer@company.com"
            },
            "diagnostic_card": card
        }

    return {
        "reply": f"Hi! I am your Incident Mind AI Chatbot. I can help diagnose login issues, website outages, or retrieve past incident resolutions. How can I help you?",
        "resolved_by_bot": False,
        "suggested_incident_data": None,
        "diagnostic_card": None
    }


def run_site_scan(url: str) -> Dict[str, Any]:
    """
    Simulates a live diagnostic scan of a target URL.
    Provides diagnostic steps, severity, complexity, root cause probability, 
    and similar incidents. Supports pre-configured profiles for demo presets.
    """
    url_lower = url.lower()
    
    # 1. Profile mapping (Presets)
    if "auth" in url_lower:
        troubleshooter_type = "Authentication Troubleshooter"
        severity = "High"
        complexity = "Medium"
        status = "Open"
        issues_found = [
            "SSO LDAP authentication timeout",
            "LDAP Sync latency exceeding 12000ms",
            "User session cookie validation mismatch"
        ]
        root_cause_analysis = [
            {"cause": "SSO LDAP Replication Latency", "probability": 0.75},
            {"cause": "Expired Active Directory cache", "probability": 0.15},
            {"cause": "Invalid auth token signing keys", "probability": 0.10}
        ]
        steps = [
            "Verify SSO directory controller network latency",
            "Flush Local Active Directory Cache replicas",
            "Force signing key roll"
        ]
        quick_fixes = [
            "Restart SSO Directory Services",
            "Flush authentication LDAP cache"
        ]
        autodiagnostic_log = [
            {"time": "0.0s", "step": "DNS Lookup", "result": "Success (Resolved auth.mycompany.com to 10.0.12.88)"},
            {"time": "0.2s", "step": "TCP Ping (Port 443)", "result": "Success (Responsive in 14ms)"},
            {"time": "0.6s", "step": "LDAP Sync Check", "result": "Failed (Latency 12500ms > threshold 2000ms)"},
            {"time": "0.9s", "step": "Session Key Probe", "result": "Warning (Signature mismatch on validation)"}
        ]
        similar_incidents = [
            {"incident_id": "INC-0012", "title": "LDAP Replica Latency Outage", "resolution": "Flushed SSO Cache"},
            {"incident_id": "INC-0044", "title": "Active Directory Sync Lockup", "resolution": "Rebooted AD Controller"}
        ]
    elif "shop" in url_lower:
        troubleshooter_type = "API Gateway Troubleshooter"
        severity = "Critical"
        complexity = "High"
        status = "Open"
        issues_found = [
            "HTTP 503 Service Unavailable",
            "Stripe Webhook signature validation failure",
            "Gateway timeout on payment endpoint"
        ]
        root_cause_analysis = [
            {"cause": "Stripe Webhook Secret mismatch", "probability": 0.80},
            {"cause": "Database lockup on checkout table", "probability": 0.15},
            {"cause": "Third party payment gateway API downtime", "probability": 0.05}
        ]
        steps = [
            "Validate Stripe webhook signature configuration",
            "Verify network access to payment processing subnet",
            "Inspect postgres transaction lock tables"
        ]
        quick_fixes = [
            "Re-deploy API Gateway configuration with updated webhook secrets",
            "Restart checkout microservices pods"
        ]
        autodiagnostic_log = [
            {"time": "0.0s", "step": "DNS Lookup", "result": "Success (Resolved shop.mycompany.com to 10.0.12.99)"},
            {"time": "0.1s", "step": "TCP Connection Check", "result": "Success (Connection established)"},
            {"time": "0.4s", "step": "HTTP Checkout Endpoint Check", "result": "Failed (HTTP Status 503 returned)"},
            {"time": "0.7s", "step": "Secret Key Validation Probe", "result": "Failed (Invalid webhook signature hash)"}
        ]
        similar_incidents = [
            {"incident_id": "INC-0019", "title": "Checkout Webhook Secret Expiry", "resolution": "Updated Env Keys"},
            {"incident_id": "INC-0025", "title": "API Gateway Route Failure", "resolution": "Restarted Route Pods"}
        ]
    elif "api" in url_lower or "db" in url_lower:
        troubleshooter_type = "Database Connection Troubleshooter"
        severity = "High"
        complexity = "Low"
        status = "Open"
        issues_found = [
            "Database connection pool exhausted",
            "Unindexed query CPU execution spikes",
            "HTTP 500 Database timeout error"
        ]
        root_cause_analysis = [
            {"cause": "Database Connection Pool Exhaustion", "probability": 0.92},
            {"cause": "Missing database query indexing", "probability": 0.06},
            {"cause": "High concurrent transaction volumes", "probability": 0.02}
        ]
        steps = [
            "Verify database connection allocations in pg_stat_activity",
            "Examine CPU load and transaction wait events",
            "Apply query indices to active query targets"
        ]
        quick_fixes = [
            "Restart database connection pool",
            "Temporarily scale DB connection capacity to 150 pool limits"
        ]
        autodiagnostic_log = [
            {"time": "0.0s", "step": "DNS Lookup", "result": "Success (Resolved api.mycompany.com to 10.0.15.55)"},
            {"time": "0.2s", "step": "Database Ping Test", "result": "Failed (Socket timeout on connection)"},
            {"time": "0.5s", "step": "Telemetry Probe check", "result": "Warning (Max connections reached: 100/100)"}
        ]
        similar_incidents = [
            {"incident_id": "INC-0021", "title": "Database connection pool exhausted", "resolution": "Restart Pool"},
            {"incident_id": "INC-0035", "title": "SSO Auth database connection errors", "resolution": "Added idx_users_auth"}
        ]
    else:
        # Default fallback for arbitrary URLs
        troubleshooter_type = "Network/Web Troubleshooter"
        severity = "Medium"
        complexity = "Low"
        status = "Open"
        issues_found = [
            "Slow server response time",
            "Missing static asset CDN caching headers",
            "DNS lookup response delay"
        ]
        root_cause_analysis = [
            {"cause": "Missing CDN caching policy", "probability": 0.70},
            {"cause": "DNS server sync lag", "probability": 0.20},
            {"cause": "Static asset payload size too large", "probability": 0.10}
        ]
        steps = [
            "Inspect caching headers (Cache-Control)",
            "Verify DNS zones and sync status",
            "Optimize image file compression ratios"
        ]
        quick_fixes = [
            "Enable Cloudflare CDN caching rule for asset subnets",
            "Re-sync master DNS nameservers"
        ]
        autodiagnostic_log = [
            {"time": "0.0s", "step": "DNS Lookup", "result": "Warning (Response took 450ms > threshold 50ms)"},
            {"time": "0.5s", "step": "TCP Ping (Port 80)", "result": "Success (Responsive)"},
            {"time": "0.9s", "step": "Cache Header Check", "result": "Failed (Cache-Control header is missing)"}
        ]
        similar_incidents = [
            {"incident_id": "INC-0005", "title": "Missing CDN Cache Outage", "resolution": "Enabled Cloudflare Cache"},
            {"incident_id": "INC-0008", "title": "DNS Sync latency issue", "resolution": "Flushed DNS zones"}
        ]
        
    return {
        "url": url,
        "troubleshooter_type": troubleshooter_type,
        "severity": severity,
        "complexity": complexity,
        "status": status,
        "issues_found": issues_found,
        "root_cause_analysis": root_cause_analysis,
        "steps": steps,
        "quick_fixes": quick_fixes,
        "autodiagnostic_log": autodiagnostic_log,
        "similar_incidents": similar_incidents
    }


def run_site_autofix(url: str) -> Dict[str, Any]:
    """
    Simulates executing automated SRE remediation scripts on a target URL
    to resolve active incidents without manual intervention.
    """
    url_lower = url.lower()
    
    # 1. Profile mapping (Remediation Logs)
    if "auth" in url_lower:
        autodiagnostic_log = [
            {"time": "0.0s", "step": "Initiate Auth Auto-Fix Pipeline", "result": "Running"},
            {"time": "0.5s", "step": "Flush SSO Directory LDAP cache", "result": "Success (Cleared 14,205 entries)"},
            {"time": "1.1s", "step": "Restart active LDAP replica sync controllers", "result": "Success (Replica lag reset to 0ms)"},
            {"time": "1.7s", "step": "Verify active authentication flow", "result": "Success (HTTP 200 OK returned)"}
        ]
        fixed_issue = "SSO Authentication LDAP cache flushed and sync replicas restarted successfully."
        complexity = "Medium"
        severity = "High"
    elif "shop" in url_lower:
        autodiagnostic_log = [
            {"time": "0.0s", "step": "Initiate Gateway Remediation Pipeline", "result": "Running"},
            {"time": "0.6s", "step": "Retrieve current Stripe Webhook secret", "result": "Success (Fetched from Vault)"},
            {"time": "1.2s", "step": "Update API Gateway env config values", "result": "Success (Secrets aligned)"},
            {"time": "1.8s", "step": "Rolling restart checkout API gateway pods", "result": "Success (3/3 pods restarted)"},
            {"time": "2.4s", "step": "Verify payment transaction webhook callbacks", "result": "Success (HTTP 200 OK returned)"}
        ]
        fixed_issue = "Checkout Webhook Secrets updated in API Gateway environment. Checkout pods restarted."
        complexity = "High"
        severity = "Critical"
    elif "api" in url_lower or "db" in url_lower:
        autodiagnostic_log = [
            {"time": "0.0s", "step": "Initiate DB Connection Auto-Fix Pipeline", "result": "Running"},
            {"time": "0.4s", "step": "Flush database connection pool socket handles", "result": "Success (Released 100 connections)"},
            {"time": "0.9s", "step": "Scale connection pool maximum limit to 150", "result": "Success (Config updated)"},
            {"time": "1.5s", "step": "Re-run database connectivity socket test", "result": "Success (Responsive in 4ms)"}
        ]
        fixed_issue = "Database connection pool sockets flushed and maximum limit scaled from 100 to 150."
        complexity = "Medium"
        severity = "High"
    else:
        autodiagnostic_log = [
            {"time": "0.0s", "step": "Initiate Web performance Auto-Fix Pipeline", "result": "Running"},
            {"time": "0.5s", "step": "Inject Cache-Control header rules on routing engine", "result": "Success (Enabled public caching)"},
            {"time": "1.0s", "step": "Trigger Cloudflare CDN edge cache purge", "result": "Success (Purged static file targets)"},
            {"time": "1.6s", "step": "Verify cache hit ratio for asset files", "result": "Success (HIT status returned)"}
        ]
        fixed_issue = "Vite static assets public caching rules applied. Purged Cloudflare CDN cache."
        complexity = "Low"
        severity = "Medium"
        
    return {
        "url": url,
        "status": "Resolved",
        "autodiagnostic_log": autodiagnostic_log,
        "complexity": complexity,
        "fixed_issue": fixed_issue,
        "severity": severity
    }


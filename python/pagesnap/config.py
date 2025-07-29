import json
import os
from pathlib import Path

DEFAULT_CONFIG = {
    "output": {
        "location": "./snapshots",
        "formats": ["png"],
        "storage": {
            "provider": "filesystem",
            "overwrite": True,
        },
    },
    "performance": {
        "maxConcurrency": 4,
    },
    "sanitization": {
        "blockerLists": [],
        "customRules": [],
    },
}

def load_config(config_path: str = 'pagesnap.config.json') -> dict:
    """Loads the user config and merges it with the default config."""
    resolved_path = Path(os.getcwd()) / config_path
    if resolved_path.exists():
        with open(resolved_path, 'r') as f:
            user_config = json.load(f)
        
        # A simple deep merge for one level of nesting
        config = DEFAULT_CONFIG.copy()
        for key, value in user_config.items():
            if isinstance(value, dict) and key in config:
                config[key].update(value)
            else:
                config[key] = value
        return config
    return DEFAULT_CONFIG


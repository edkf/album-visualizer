import os
import json
import shlex
import subprocess
from functools import lru_cache
from time import time

import requests
from flask import Flask, jsonify, send_from_directory, request, send_file

LASTFM_API_KEY = os.getenv("LASTFM_API_KEY", "")
LASTFM_ENDPOINT = "https://ws.audioscrobbler.com/2.0/"
POLL_PLAYERS = ["chromium", "chrome", "google-chrome", "brave", "vivaldi", "firefox", "spotify"]  # preference order

app = Flask(__name__, static_url_path="", static_folder="static")

def run(cmd: str) -> str:
    try:
        out = subprocess.check_output(shlex.split(cmd), stderr=subprocess.DEVNULL, timeout=1.5)
        return out.decode("utf-8").strip()
    except Exception:
        return ""

def list_players():
    out = run("playerctl -l")
    if not out:
        return []
    # keep only interesting players and preserve preference order
    players = out.splitlines()
    ordered = [p for name in POLL_PLAYERS for p in players if name in p.lower()]
    # add any other player at the end
    rest = [p for p in players if p not in ordered]
    return ordered + rest

def player_status(player: str) -> str:
    return run(f"playerctl -p {shlex.quote(player)} status")

def player_metadata(player: str) -> dict:
    # mpris:artUrl sometimes comes empty; we still capture it
    fmt = "{{title}}|{{artist}}|{{album}}|{{mpris:artUrl}}|{{mpris:length}}"
    raw = run(f"playerctl -p {shlex.quote(player)} metadata -f '{fmt}'")
    if not raw or "|" not in raw:
        return {}
    title, artist, album, art, length = (raw.split("|") + ["", "", "", "", ""])[:5]
    
    # Get current position
    position_raw = run(f"playerctl -p {shlex.quote(player)} position")
    position = 0
    try:
        position = float(position_raw) if position_raw else 0
    except ValueError:
        position = 0
    
    # Convert length from microseconds to seconds
    length_seconds = 0
    try:
        length_seconds = int(length) / 1000000 if length else 0
    except ValueError:
        length_seconds = 0
    
    return {
        "title": title.strip(),
        "artist": artist.strip(),
        "album": album.strip(),
        "artUrl": art.strip(),
        "player": player,
        "position": position,
        "length": length_seconds
    }

@lru_cache(maxsize=256)
def _lastfm_cover_cached(artist: str, track: str):
    # cache with manual TTL via key (artist|track|bucket)
    return _lastfm_cover(artist, track)

_last_cover_ttl = {}  # key -> expires_at

def lastfm_cover(artist: str, track: str) -> str | None:
    key = f"{artist.lower()}|{track.lower()}"
    now = time()
    exp = _last_cover_ttl.get(key, 0)
    if now > exp:
        # invalidate lru cache for this key by recreating function (simple way)
        _lastfm_cover_cached.cache_clear()
        _last_cover_ttl[key] = now + 60 * 60  # 1h
    return _lastfm_cover_cached(artist, track)

def _lastfm_cover(artist: str, track: str) -> str | None:
    if not LASTFM_API_KEY:
        return None
    try:
        params = {
            "method": "track.getInfo",
            "api_key": LASTFM_API_KEY,
            "artist": artist,
            "track": track,
            "format": "json",
            "autocorrect": 1
        }
        r = requests.get(LASTFM_ENDPOINT, params=params, timeout=3)
        data = r.json()
        # structure: track -> album -> image (list of {#text, size})
        images = None
        if "track" in data:
            if "album" in data["track"] and "image" in data["track"]["album"]:
                images = data["track"]["album"]["image"]
            elif "image" in data["track"]:
                images = data["track"]["image"]

        if images:
            # try largest first
            for size in ["extralarge", "mega", "large", "medium"]:
                for img in images:
                    if img.get("size") == size and img.get("#text"):
                        return img["#text"] or None
            # fallback: first with url
            for img in images:
                if img.get("#text"):
                    return img["#text"]
        return None
    except Exception:
        return None

def get_now_playing():
    players = list_players()
    for p in players:
        status = player_status(p).lower()
        if status == "playing":
            meta = player_metadata(p)
            if not meta:
                continue
            title = meta.get("title") or ""
            artist = meta.get("artist") or ""
            cover = meta.get("artUrl") or ""
            
            # if no cover from MPRIS, try Last.fm
            if (not cover) and title and artist:
                cover = lastfm_cover(artist, title) or ""
            # if local cover came but file doesn't exist, try Last.fm as fallback
            elif cover and cover.startswith('file://'):
                file_path = cover[7:]  # remove file:// prefix
                if not os.path.exists(file_path) and title and artist:
                    print(f"Local cover file not found, trying Last.fm: {file_path}")
                    cover = lastfm_cover(artist, title) or ""
            return {
                "status": "playing",
                "title": title,
                "artist": artist,
                "album": meta.get("album") or "",
                "cover": cover,
                "source": meta.get("player") or p,
                "position": meta.get("position", 0),
                "length": meta.get("length", 0)
            }
    # If no one is playing
    return {"status": "stopped"}

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/api/now")
def api_now():
    return jsonify(get_now_playing())

@app.route("/api/cover")
def api_cover():
    """Serve cover images from local file paths"""
    import urllib.parse
    cover_path = request.args.get('path', '')
    if not cover_path:
        return "No path provided", 400
    
    # Remove file:// prefix if present
    if cover_path.startswith('file://'):
        cover_path = cover_path[7:]
    
    if not os.path.exists(cover_path):
        print(f"Cover file not found: {cover_path}")
        return "File not found", 404
    
    try:
        # Try to detect the correct mimetype
        if cover_path.lower().endswith('.png'):
            mimetype = 'image/png'
        elif cover_path.lower().endswith('.gif'):
            mimetype = 'image/gif'
        else:
            mimetype = 'image/jpeg'
        
        return send_file(cover_path, mimetype=mimetype)
    except Exception as e:
        print(f"Error serving cover file {cover_path}: {str(e)}")
        return f"Error serving file: {str(e)}", 500

if __name__ == "__main__":
    # Flask dev server
    app.run(host="0.0.0.0", port=5000, debug=True)

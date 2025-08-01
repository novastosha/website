import json
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from googleapiclient.discovery import build


YT_DATA_API_KEY = None
SPOTIPY_CLIENT_ID = None
SPOTIPY_CLIENT_SECRET = None
SPOTIPY_REDIRECT_URI = 'https://sajed.dev/'

if not SPOTIPY_CLIENT_ID or not SPOTIPY_CLIENT_SECRET or not YT_DATA_API_KEY:
    with open('./secrets.json', 'r') as f:
        secrets = json.load(f)
        SPOTIPY_CLIENT_ID = secrets.get('id')
        SPOTIPY_CLIENT_SECRET = secrets.get('secret')
        YT_DATA_API_KEY = secrets.get('yt_api_key_2')

scope='playlist-read-private user-library-read user-top-read'
sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
    client_id=SPOTIPY_CLIENT_ID,
    client_secret=SPOTIPY_CLIENT_SECRET,
    redirect_uri=SPOTIPY_REDIRECT_URI,
    scope=scope
))

def fetch_all_liked_songs():
    results = []
    offset = 0
    while True:
        items = sp.current_user_saved_tracks(limit=50, offset=offset)
        if not items['items']:
            break
        results.extend(items['items'])
        offset += 50
    return results

def fetch_all_liked_songs_data():
    output = []
    liked_songs = fetch_all_liked_songs()

    for item in liked_songs:
        track = item['track']
        if not track:
            continue

        title = track['name']
        artist = track['artists'][0]['name']
        album = track['album']['name']
        spotify_url = track['external_urls']['spotify']

        song = {
            'title': title,
            'artist': artist,
            'album': album,
            'urls': [
                {
                    'type': 'spotify',
                    'url': spotify_url
                },
                {
                    'type': 'youtube',
                    'url': search_youtube_link(f"{title} {artist}", YT_DATA_API_KEY)
                }
            ]
        }

        output.append(song)

    return output

def fetch_music_data():
    output = []

    top_tracks = sp.current_user_top_tracks(time_range='long_term', limit=50)

    for track in top_tracks['items']:
        if not track:
            continue

        title = track['name']
        artist = track['artists'][0]['name']
        album = track['album']['name']
        spotify_url = track['external_urls']['spotify']

        song = {
            'title': title,
            'artist': artist,
            'album': album,
            'urls': [
                {
                    'type': 'spotify',
                    'url': spotify_url
                },
                {
                    'type': 'youtube',
                    'url': search_youtube_link(f"{title} {artist}", YT_DATA_API_KEY)
                }
            ]
        }

        output.append(song)

    return output

def search_youtube_link(query, api_key):
    try:
        youtube = build('youtube', 'v3', developerKey=api_key)
        search_response = youtube.search().list(
            q=query,
            part='snippet',
            maxResults=1,
            type='video'
        ).execute()

        items = search_response.get('items')
        if items:
            video_id = items[0]['id']['videoId']
            return f"https://www.youtube.com/watch?v={video_id}"
        return None
    except:
        print(f"Error searching YouTube for query: {query}")
        return None

def save_music_data(data, filename='../music.json'):
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print(f"Saved {len(data)} tracks to {filename}")

def refill_music_youtube_links(filename='../music.json'):
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for song in data:
        if not song['urls']:
            song['urls'] = []
        if not any(url['type'] == 'youtube' for url in song['urls']):
            youtube_url = search_youtube_link(f"{song['title']} {song['artist']}", YT_DATA_API_KEY)
            if youtube_url:
                song['urls'].append({
                    'type': 'youtube',
                    'url': youtube_url
                })
    
    save_music_data(data, filename)

def refill_image_covers(filename='../music.json'):
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for song in data:
        if 'image' not in song or not song['image']:
            print(f"Processing song: {song['title']} by {song['artist']}")
            track = sp.search(q=f"{song['title']} {song['artist']}", type='track', limit=1)
            if track['tracks']['items']:
                images = track['tracks']['items'][0]['album']['images']
                cover_url = images[1]['url'] if len(images) > 1 else images[0]['url']
                song['image'] = cover_url
            else:
                song['image'] = None

    save_music_data(data, filename)

def dump_last_updated(filename='../last_updated.json'):
    
    try:
        last_updated = sp.current_user_saved_tracks(limit=1)['items'][0]['added_at']
    except Exception as e:
        print(f"Error fetching last updated time: {e}")
        return None

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump({"last_updated": last_updated}, f, indent=4, ensure_ascii=False)

    return last_updated

if __name__ == '__main__':
    #music_data = fetch_music_data()
    #save_music_data(music_data)

    #save_music_data(fetch_all_liked_songs_data(), filename='../liked_songs.json')

    refill_image_covers()
    dump_last_updated()
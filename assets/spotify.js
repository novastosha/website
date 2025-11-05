// Fetch currently playing music entry by requesting: "https://api.sajed.dev/spotify"
function convertURItoSpotifyLink(uri) {
    return `https://open.spotify.com/track/${uri.split(':').pop()}`;
}

fetch("https://api.sajed.dev/spotify")
    .then(response => response.json())
    .then(data => {
        const musicPlaying = document.querySelector(".music-playing span");
        const playButton = document.querySelector(".music-playing .btn-play");
        const albumIcon = document.querySelector(".music-playing .album-icon");

        if (data["isPlaying"]) {
            document.querySelector(".music-playing").style.display = "flex";
            musicPlaying.textContent = `Now Playing: "${data["track"]["name"]}"\n by "${data["track"]["artist"]}"`;
            playButton.style.display = "inline-block";
            playButton.onclick = () => {
                window.open(convertURItoSpotifyLink(data["track"]["uri"]), "_blank");
            };
            albumIcon.src = data["track"]["albumImageUrl"];
        } else {
            musicPlaying.textContent = "Not playing anything currently.";
            playButton.style.display = "none";
            albumIcon.src = "https://placehold.co/120x120/101025/00FFC0?text=♪";
        }
    })
    .catch(error => {
        console.error("Error fetching currently playing music:", error);
    });

// Fetch and display music entries by requesting: "https://api.sajed.dev/spotify/recents?limit=20"

fetch("https://api.sajed.dev/spotify/recents?limit=20")
    .then(response => response.json())
    .then(data => {
        const musicWrapper = document.querySelector(".music-scroll .scroll-wrapper");
        musicWrapper.innerHTML = "";

        data["tracks"].forEach(track => {
            const trackItem = document.createElement("div");
            trackItem.className = "track-item";

            const albumImg = document.createElement("img");
            albumImg.src = track.albumImageUrl;
            albumImg.alt = "Album Art";
            albumImg.className = "album-icon";


            // Truncate name with ... if too long
            if (track.name.length > 15) {
                track.name = track.name.substring(0, 27) + "...";
            }


            const trackTitle = document.createElement("div");
            trackTitle.className = "track-title";
            trackTitle.textContent = track.name;

            const trackArtist = document.createElement("div");
            trackArtist.className = "track-artist";
            trackArtist.textContent = track.artist;

            trackItem.appendChild(albumImg);
            trackItem.appendChild(trackTitle);
            trackItem.appendChild(trackArtist);
            musicWrapper.appendChild(trackItem);
        });
    })
    .catch(error => {
        console.error("Error fetching music entries:", error);
    });

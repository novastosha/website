const badges = [
  { src: "/assets/88x31/github.gif", title: "GitHub", href: "https://github.com" },
  { src: "/assets/88x31/firefox.gif", title: "Get Firefox", href: "https://firefox.com" },
  { src: "/assets/88x31/visual_studio_code.gif", title: "Visual Studio Code", href: "https://code.visualstudio.com/" },
  { src: "/assets/88x31/tor.gif", title: "Tor", href: "https://www.torproject.org/" },
  { src: "/assets/88x31/best_viewed_with_eyes.gif", title: "Best viewed with eyes" },
  { src: "/assets/88x31/autism.gif", title: "Autism Awareness", href: "https://www.autismspeaks.org/" },
  { src: "/assets/88x31/88x31.gif", title: "88x31" },
];

const container = document.getElementById("badges");

badges.forEach(({ src, title, href }) => {
  const img = document.createElement("img");
  img.src = src;
  img.title = title;
  img.style.imageRendering = "pixelated";

  if (href) {
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.appendChild(img);
    container.appendChild(a);
  } else {
    container.appendChild(img);
  }
});

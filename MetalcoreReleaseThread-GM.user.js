// ==UserScript==
// @name         Metalcore Weekly Release Thread
// @namespace    http://tampermonkey.net/
// @version      0.57
// @description  Mark up the r/Metalcore Weekly Release Threads
// @author       nuentes
// @match        https://old.reddit.com/r/Metalcore/comments/*/weekly_release_thread*
// @match        https://www.reddit.com/r/Metalcore/comments/*/weekly_release_thread*
// @grant        GM_xmlhttpRequest
// @connect      script.google.com
// @connect      script.googleusercontent.com
// ==/UserScript==

(function () {
    'use strict';

    const GOOGLE_SHEET_API = 'https://script.google.com/macros/s/AKfycbz8ZhlauDT6Ot6tVoJtiAk7n8K5MCccnbR35edkkcyCpQ2nO1qzzc241y1CGWSGOEpvGQ/exec';
    const THREAD_ID = location.pathname.split('/')[4];

    const defaultConfig = {
        favoriteArtists: ["A Day To Remember", "Architects", "As I Lay Dying", "August Burns Red", "Beartooth", "Bring Me The Horizon", "Counterparts", "Currents", "Erra", "Ice Nine Kills", "Killswitch Engage", "Knocked Loose", "Northlane", "Parkway Drive", "Polaris", "Spiritbox", "The Devil Wears Prada", "Wage War"],
        highlightColor: "#a0e0bd",
        ffoColor: "#dd9897"
    };

    function postDate(){
        const url = window.location.href;
    	const match = url.match(/weekly_release_thread.*?_(\w+)_\d{1,2}th_(\d{4})/i);
        if (!match) return null;

    	const monthName = match[1];
    	const day = parseInt(url.match(/(\d{1,2})th/)[1]);
    	const year = parseInt(match[2]);

    	// Convert month name to number
    	const months = {
    		jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    	};

        var dayPad = String(day).padStart(2,'0')

    	const monthIndex = months[monthName.substr(0,3).toLowerCase()];
        return `${year}-${monthIndex}-${dayPad}`
    }

    const CONFIG = JSON.parse(localStorage.getItem('mcw-config') || JSON.stringify(defaultConfig));

    function extractArtistNames() {
        const mdBlocks = document.querySelectorAll('.md')[1];
        const artistMap = new Map();

        //for (const md of mdBlocks) {
            //const paragraphs = md.querySelectorAll('p');
            const paragraphs = mdBlocks.querySelectorAll('p');
            for (const p of paragraphs) {
                if (p.querySelector('strong')) continue;

                const text = p.textContent.trim();
                const match = text.match(/^(.*?)\s*-\s*(.*)$/);
                if (match) {
                    let artist = match[1].trim();
                    const album = match[2].trim();

                    // Handle " x " collaborations
                    if (artist.includes(' x ')) {
                        artist = artist.split(' x ')[0].trim();
                    }

                    if (artist && !artistMap.has(artist.toLowerCase())) {
                        artistMap.set(artist.toLowerCase(), {
                            artist,
                            album,
                            element: p
                        });
                    }
                }
            }
        //}

        return Array.from(artistMap.values());
    }

    async function fetchFFOData(artistObjects, announceDate) {
        const allResults = {};
        const stillMissing = [];

        for (const obj of artistObjects) {
            stillMissing.push(obj.artist.toLowerCase());
        }

        const url = `${GOOGLE_SHEET_API}?announce=${announceDate}`;
        try {
            const res = await fetch(url);
            const json = await res.json();

            for (const [artist, data] of Object.entries(json)) {
                allResults[artist.toLowerCase()] = data;
                //done.push(artist.toLowerCase())
                stillMissing.splice(stillMissing.indexOf(artist.toLowerCase()), 1)
            }

            // Query again without announce filter for still-missing entries
            if (stillMissing.length > 0) {
                const fallbackUrl = `${GOOGLE_SHEET_API}?artists=${encodeURIComponent(stillMissing.join('|'))}`;
                const fallbackRes = await fetch(fallbackUrl);
                const fallbackJson = await fallbackRes.json();
                for (const [artist, data] of Object.entries(fallbackJson)) {
                    allResults[artist.toLowerCase()] = data;
                }
            }

        } catch (err) {
            console.error("⚠️ Failed to fetch:", err);
        }

        return allResults;
    }


    function injectFFO(artistObjects, ffoData) {
        const normalizedFavorites = CONFIG.favoriteArtists.map(name => name.toLowerCase());

        for (const { artist, album, element } of artistObjects) {
            const match = ffoData[artist.toLowerCase()];
            if (!match) continue;

            element.textContent = '';

            const container = document.createElement('div');
            container.style.display = 'inline';

            // Handle collaborations
            const artists = artist.split(' x ');
            artists.forEach((name, idx) => {
                const artistName = name.trim();
                const link = document.createElement('a');
                link.href = `https://open.spotify.com/artist/${match.spotifyArtistId}`;
                link.target = '_blank';
                link.textContent = artistName;
                link.style.fontWeight = 'bold';
                container.appendChild(link);
                if (idx < artists.length - 1) {
                    container.appendChild(document.createTextNode(' x '));
                }
            });

            element.appendChild(container);
            element.appendChild(document.createTextNode(' - '));

            if (match.spotifyAlbumId) {
                const albumLink = document.createElement('a');
                albumLink.href = `https://open.spotify.com/album/${match.spotifyAlbumId}`;
                albumLink.target = '_blank';
                albumLink.textContent = album;
                element.appendChild(albumLink);
            } else {
                element.appendChild(document.createTextNode(album));
            }

            // FFO
            const ffoList = [match.similar1, match.similar2, match.similar3, match.similar4, match.similar5].filter(Boolean);

            if (ffoList.length > 0) {
                const ffoElement = document.createElement('div');
                ffoElement.style.marginLeft = '1.5em';
                ffoElement.style.fontSize = 'smaller';
                ffoElement.style.color = 'gray';

                ffoElement.textContent = '🎧 FFO: ';

                ffoList.forEach((ffoName, i) => {
                    const span = document.createElement('span');
                    span.textContent = ffoName;
                    span.style.position = 'relative';
                    span.style.marginRight = '0.5em';

                    const plus = document.createElement('span');
                    plus.textContent = ' [+fav]';
                    plus.style.cursor = 'pointer';
                    plus.style.display = 'none';
                    plus.style.color = 'gray';
                    plus.style.fontSize = 'smaller';

                    plus.addEventListener('click', () => {
                        if (!CONFIG.favoriteArtists.includes(ffoName)) {
                            CONFIG.favoriteArtists.push(ffoName);
                            localStorage.setItem('mcw-config', JSON.stringify(CONFIG));
                            element.style.backgroundColor = CONFIG.ffoColor;
                            plus.remove();
                        }
                    });

                    span.addEventListener('mouseenter', () => plus.style.display = 'inline');
                    span.addEventListener('mouseleave', () => plus.style.display = 'none');

                    span.appendChild(plus);
                    ffoElement.appendChild(span);
                    if (i < ffoList.length - 1) {
                        ffoElement.appendChild(document.createTextNode(', '));
                    }
                });

                element.appendChild(ffoElement);
            }

            const isFavorite = normalizedFavorites.includes(artist.toLowerCase());
            const ffoMatch = ffoList.some(name => normalizedFavorites.includes(name.toLowerCase()));

            if (isFavorite) {
                element.style.backgroundColor = CONFIG.highlightColor;
            } else if (ffoMatch) {
                element.style.backgroundColor = CONFIG.ffoColor;
            }
        }
    }

    function addConfigUI() {
        const mdElement = document.querySelector('div.expando > form > div:nth-child(2) > div:nth-child(1)');
        if (!mdElement) return;

        mdElement.style.position = 'relative';

        const configButton = document.createElement('button');
        configButton.textContent = '⚙️ Config';
        configButton.style.cssText = 'position:absolute; top:10px; right:10px; padding:5px 10px; background:#333; color:white; border:none; border-radius:5px; cursor:pointer;';

        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'Show Highlighted Only';
        toggleButton.style.cssText = 'position:absolute; top:10px; right:110px; padding:5px 10px; background:#555; color:white; border:none; border-radius:5px; cursor:pointer;';
        let showingOnlyHighlighted = false;

        toggleButton.addEventListener('click', () => {
            showingOnlyHighlighted = !showingOnlyHighlighted;
            toggleButton.textContent = showingOnlyHighlighted ? 'Show All' : 'Show Highlighted Only';

            const paragraphs = document.querySelectorAll('.md p');
            for (const p of paragraphs) {
                if (p.querySelector('strong')) {
                    p.style.display = 'block';
                    continue;
                }

                const bg = p.style.backgroundColor;
                if (showingOnlyHighlighted) {
                    p.style.display = (bg === CONFIG.highlightColor || bg === CONFIG.ffoColor) ? 'block' : 'none';
                } else {
                    p.style.display = 'block';
                }
            }
        });

        configButton.addEventListener('click', () => {
            const configModal = document.createElement('div');
            configModal.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); padding:20px; background:#fff; border:1px solid #ccc; border-radius:5px; box-shadow:0 2px 10px rgba(0,0,0,0.1); z-index:1000;';

            const title = document.createElement('h3');
            title.textContent = 'Config';

            const artistLabel = document.createElement('label');
            artistLabel.textContent = 'Favorite Artists:';
            const artistInput = document.createElement('textarea');
            artistInput.rows = 6;
            artistInput.style.width = '50%';
            artistInput.value = CONFIG.favoriteArtists.join('\n');

            const lineBreak = document.createElement('br')

            const color1Label = document.createElement('label');
            color1Label.textContent = 'Favorite:';
            const color1Input = document.createElement('input');
            color1Input.type = 'color';
            color1Input.value = CONFIG.highlightColor;

            const color2Label = document.createElement('label');
            color2Label.textContent = 'FFO:';
            const color2Input = document.createElement('input');
            color2Input.type = 'color';
            color2Input.value = CONFIG.ffoColor;

            const saveButton = document.createElement('button');
            saveButton.textContent = 'Save';
            saveButton.style.marginTop = '10px';

            const reloadButton = document.createElement('button');
            reloadButton.textContent = 'Save & Reload';
            reloadButton.style.marginLeft = '10px';

            saveButton.addEventListener('click', () => {
                CONFIG.favoriteArtists = artistInput.value.split('\n').map(s => s.trim()).filter(Boolean);
                CONFIG.highlightColor = color1Input.value;
                CONFIG.ffoColor = color2Input.value;
                localStorage.setItem('mcw-config', JSON.stringify(CONFIG));
                configModal.remove();
            });

            reloadButton.addEventListener('click', () => {
                saveButton.click();
                location.reload();
            });

            configModal.append(title, artistLabel, artistInput, lineBreak, color1Label, color1Input, color2Label, color2Input, saveButton, reloadButton);
            document.body.appendChild(configModal);
        });

        mdElement.append(configButton, toggleButton);
    }

    function styleHeaders() {
        const headers = document.querySelectorAll('.md p strong');
        for (const strong of headers) {
            const p = strong.closest('p');
            if (p) {
                p.style.backgroundColor = 'black';
                p.style.color = 'white';
                p.style.padding = '4px 6px';
                p.style.borderRadius = '4px';
                p.style.marginTop = '8px';
            }
        }
    }

    function waitForDOM() {
        const announceDate = postDate();
        //console.log(announceDate)

        if (!document.querySelector('.md p')) {
            setTimeout(waitForDOM, 500);
            return;
        }

        const artists = extractArtistNames();
        fetchFFOData(artists, announceDate).then(data => {
            injectFFO(artists, data);
            addConfigUI();
            styleHeaders();
        });
    }

    waitForDOM();
})();

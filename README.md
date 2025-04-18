All data is pulled from a google doc backend. The google doc automatically pulls the release threads as they are posted and caches all the data along with finding Spotify ArtistID's and AlbumID's, and grabbing recommended artists from LastFM

**This script itself just grabs the data and throws it at the Weekly Release Thread, including:**
- Adding spotify url for the artist (if found on Spotify)
- Adding spotify url for the album (if found on Spotify)
- Adding FFO for each artist
- Allows you to configure your own "favorite artists"
- If a release is from a Favorite, it will highlight the line
- If a release is from an artist that has a FFO that is one of your Favorites, it will highlight a 2nd color
- Filter of only releases related to your favorites

![image](https://github.com/user-attachments/assets/ddbaa391-0aeb-4757-b392-a3a3f3f92816)

**Known issues:**
- Only works on Old Reddit
- I've never tested manually installing it. I'm using it in TamperMonkey on Firefox
- I don't even want to think about how it looks on mobile

**Feature Wish list:**
- Fix for New Reddit
- Collaborations (i.e. Invent Animate x Silent Planet, or song features) aren't handled correctly
- better denote FFO's that are in your favorites list
- auto-alphabetize favorite artists
- sleeker config
- add a progress bar to the top of the page to show loading status. If the page is being sent to the backend for caching, tell the user to try again in 15 minutes

**Full Disclosure:**
- This script was almost entirely written by ChatGPT. I edited it a lot.
- I wrote the entire backend, ChatGPT just helped me with API connections.
